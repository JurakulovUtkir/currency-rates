import axios from 'axios';
import { Cheerio, load } from 'cheerio';

export interface ExchangeRate {
    currency: string;
    buyRate: string;
    sellRate: string;
}

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const toNumStr = (s: string) => {
    const cleaned = s.replace(/[^\d.,-]/g, '').replace(/\s+/g, '');
    if (cleaned.includes(',') && cleaned.includes('.'))
        return cleaned.replace(/,/g, '');
    if (cleaned.includes(',') && !cleaned.includes('.'))
        return cleaned.replace(',', '.');
    return cleaned;
};

const pickText = ($ctx: Cheerio<any>, selectors: string[]): string => {
    for (const sel of selectors) {
        const t = $ctx.find(sel).first().text().trim();
        if (t) return t;
    }
    return '';
};

export async function getNbuExchangeRates(): Promise<ExchangeRate[]> {
    const { data: html } = await axios.get(
        'https://nbu.uz/jismoniy-shaxslar-valyutalar-kursi',
        {
            headers: {
                'User-Agent': UA,
                'Accept-Language': 'uz,ru;q=0.9,en;q=0.8',
                Referer: 'https://nbu.uz/',
            },
            transitional: { forcedJSONParsing: false } as any,
        },
    );

    const $ = load(html);

    const rates: ExchangeRate[] = [];

    $('.swiper-wrapper .swiper-slide').each((_, el) => {
        const $slide = $(el);

        const rawCurr =
            pickText($slide, [
                '.navbar_22_top-currency-heading',
                '.navbar_22_top-currency .currency-title',
                'h3,h4,.title',
            ]) ||
            ($slide.attr('data-currency') ?? '');

        const m = rawCurr.toUpperCase().match(/[A-Z]{3}/);
        const currency = m ? m[0] : rawCurr.trim();

        const buyLabelBlock = $slide
            .find(
                '.navbar_22_top-currency-direction-wrapper:contains("Sotib olish"), .currency-direction:contains("Sotib olish")',
            )
            .first();
        const sellLabelBlock = $slide
            .find(
                '.navbar_22_top-currency-direction-wrapper:contains("Sotish"), .currency-direction:contains("Sotish")',
            )
            .first();

        const valueSelectors = [
            '.navbar_22_top-currency-value',
            '.navbar_22_top-currency-text',
            '.value',
            'strong',
            'b',
            'span',
        ];

        let buyText = pickText(buyLabelBlock, valueSelectors);
        let sellText = pickText(sellLabelBlock, valueSelectors);

        if (!buyText || !sellText) {
            const wrappers = $slide.find(
                '.navbar_22_top-currency-direction-wrapper',
            );
            if (!buyText && wrappers.eq(0).length)
                buyText = pickText(wrappers.eq(0), valueSelectors);
            if (!sellText && wrappers.eq(1).length)
                sellText = pickText(wrappers.eq(1), valueSelectors);
        }

        if (!buyText || !sellText) {
            const slideText = $slide.text();
            const nums = (slideText.match(/[\d\s.,-]+/g) || [])
                .map(toNumStr)
                .filter((x) => /\d/.test(x));
            if (!buyText && nums.length > 0) buyText = nums[0];
            if (!sellText && nums.length > 1) sellText = nums[1];
        }

        const buyRate = toNumStr(buyText);
        const sellRate = toNumStr(sellText);

        if (currency && (buyRate || sellRate)) {
            rates.push({ currency, buyRate, sellRate });
        }
    });

    const byCurr: Record<string, ExchangeRate> = {};
    for (const r of rates) {
        const k = r.currency;
        byCurr[k] = byCurr[k]
            ? {
                  currency: k,
                  buyRate: r.buyRate || byCurr[k].buyRate,
                  sellRate: r.sellRate || byCurr[k].sellRate,
              }
            : r;
    }

    return Object.values(byCurr);
}

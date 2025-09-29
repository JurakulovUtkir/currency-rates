import axios from 'axios';
import * as cheerio from 'cheerio';

export type Source = 'desktop' | 'mobile';

export interface ExchangeRate {
    currency: string; // 'USD', 'EUR', ...
    buyRate: string; // e.g. '12 295,00'
    sellRate: string; // e.g. '12 375,00'
    centralBankRate: string; // e.g. '12 355,14'
    source: Source; // 'desktop' | 'mobile'
}

/** Fetch once, parse both desktop table and mobile cards, return combined list. */
export async function getExchangeRatesFromAnorbank(): Promise<ExchangeRate[]> {
    const url = 'https://anorbank.uz/uz/about/exchange-rates/';

    const res = await axios.get(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
        },
    });

    const $ = cheerio.load(res.data);
    const out: ExchangeRate[] = [];

    /* -------------------- DESKTOP (table) -------------------- */
    const $table = $('#desktop_currencies_table');

    // USD summary is inside accordion header (.block-1/.block-2/.block-3)
    const $usdHead = $table.find('.accordion__head .block-container').first();
    if ($usdHead.length) {
        out.push({
            currency: 'USD',
            buyRate: norm($usdHead.find('.block-1').text()),
            sellRate: norm($usdHead.find('.block-2').text()),
            centralBankRate: norm($usdHead.find('.block-3').text()),
            source: 'desktop',
        });
    }

    // Other currencies are simple rows with 4 tds
    $table.find('tbody > tr').each((_, tr) => {
        const $tr = $(tr);
        if ($tr.find('.accordion').length) return; // skip the accordion row (we handled USD)
        const $tds = $tr.find('td');
        if ($tds.length !== 4) return;

        const label = norm($tds.eq(0).text()); // e.g. 'Evro, EUR'
        const currency = (label.match(/([A-Z]{3})\b/)?.[1] || '').trim();
        if (!currency) return;

        out.push({
            currency,
            buyRate: norm($tds.eq(1).text()),
            sellRate: norm($tds.eq(2).text()),
            centralBankRate: norm($tds.eq(3).text()),
            source: 'desktop',
        });
    });

    /* -------------------- MOBILE (cards) -------------------- */
    const $cards = $('#mobile_currencies_cards .currency--card');

    $cards.each((i, card) => {
        const $card = $(card);
        const alt = $card.find('.curr__flag img').attr('alt') || '';
        const currFromAlt = (alt.match(/^[A-Z]{3}$/)?.[0] || '').trim();

        // Fallback: try to read code from the name text (e.g., 'Evro, EUR')
        const nameText = norm($card.find('.curr__name').text());
        const currFromName = (nameText.match(/([A-Z]{3})\b/)?.[1] || '').trim();

        const currency = currFromAlt || currFromName || '';

        // Values block differs for first USD card vs others:
        // - USD card uses specific classes .buy/.sell/.base
        // - others just have three values blocks in order
        let buy = '';
        let sell = '';
        let cb = '';

        const $usdWrap = $card.find('#usddBlock');
        if ($usdWrap.length) {
            buy = norm($usdWrap.find('.currency__card__value.buy').text());
            sell = norm($usdWrap.find('.currency__card__value.sell').text());
            cb = norm($usdWrap.find('.currency__card__value.base').text());
        } else {
            const $vals = $card.find(
                '.currency--card__wrap .currency__card__value',
            );
            buy = norm($vals.eq(0).text());
            sell = norm($vals.eq(1).text());
            cb = norm($vals.eq(2).text());
        }

        if (!currency) return;

        out.push({
            currency,
            buyRate: buy,
            sellRate: sell,
            centralBankRate: cb,
            source: 'mobile',
        });
    });

    return out;
}

/* utils */
function norm(s: string): string {
    return s
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

import axios from 'axios';
import * as cheerio from 'cheerio';

export type Source = 'office';

export interface ExchangeRate {
    currency: string; // e.g. 'USD', 'EUR', ...
    buyRate: string; // e.g. '12 300'
    sellRate: string; // e.g. '12 400'
    centralBankRate: string; // '' (not provided by Octobank page)
    source: Source; // 'office'
}

export async function getOctobankRates(): Promise<ExchangeRate[]> {
    const url = 'https://octobank.uz/uz/interaktiv-xizmatlar/kurs-valyut';

    const res = await axios.get(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
        },
    });

    const $ = cheerio.load(res.data);
    const out: ExchangeRate[] = [];

    // Wrapper containing date + list of currency rows
    const $wrap = $('.widgets_01_currency-wrapper');

    // Each currency row looks like:
    // .widgets_01_currency-item-wrapper
    //   h6.widgets_01_currency-item-heading → code (USD/EUR/…)
    //   … two <p> blocks for buy, sell
    $wrap.find('.widgets_01_currency-item-wrapper').each((_, el) => {
        const $row = $(el);

        const code = norm(
            $row.find('h6.widgets_01_currency-item-heading').first().text(),
        );
        if (!code) return; // skip the empty row

        const $vals = $row.find(
            '.widgets_01_currency-item-course-wrapper .widgets_01_currency-item-paragraph',
        );
        const buy = norm($vals.eq(0).text());
        const sell = norm($vals.eq(1).text());

        // Skip rows that are clearly zero/placeholder
        if (isZeroLike(buy) && isZeroLike(sell)) return;

        out.push({
            currency: code,
            buyRate: buy,
            sellRate: sell,
            centralBankRate: '',
            source: 'office',
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

function isZeroLike(s: string): boolean {
    const t = norm(s).replace(/[ ,]/g, '');
    return t === '0' || t === '000' || t === '0.00' || t === '0,00';
}

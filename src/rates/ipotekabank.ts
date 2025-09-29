import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ExchangeRate {
    currency: string;
    buyRate: string;
    sellRate: string;
    centralBankRate: string;
}

export async function getExchangeRates(): Promise<ExchangeRate[]> {
    // Ipoteka Bank currency page
    const url = 'https://www.ipotekabank.uz/currency/';

    // Fetch HTML (simple headers, no extra agents)
    const response = await axios.get(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
        },
    });

    const $ = cheerio.load(response.data);

    // All three tables share the same classes; the first one is branch/office with CB rate.
    const $tables = $('table.table.table-hover.table-striped');
    const $branch = $tables.eq(0);

    const exchangeRates: ExchangeRate[] = [];

    // Iterate table rows (skip header rows with <th>)
    $branch.find('tr').each((i, el) => {
        if ($(el).find('th').length) return;

        const $tds = $(el).find('td');
        if ($tds.length < 4) return;

        // 1) currency code is in the first <td> inside <b>USD</b>, name in <span>…</span> (we only need the code)
        const currency = norm($tds.eq(0).find('b').first().text());
        if (!currency) return;

        // 2..4) buy / sell / CB cells (text contains nested spans/divs — text() is fine)
        const buyRate = norm($tds.eq(1).text());
        const sellRate = norm($tds.eq(2).text());
        const centralBankRate = norm($tds.eq(3).text());

        exchangeRates.push({ currency, buyRate, sellRate, centralBankRate });
    });

    return exchangeRates;
}

/** collapse spaces/&nbsp; and trim */
function norm(s: string): string {
    return s
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

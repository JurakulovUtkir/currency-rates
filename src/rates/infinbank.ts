// infinbank-office.ts
import { CheerioAPI, load } from 'cheerio';
import { fetch } from 'undici';

type Code = 'USD' | 'EUR' | 'GBP' | 'RUB' | 'JPY' | 'CHF';
type LCode = 'usd' | 'eur' | 'gbp' | 'rub' | 'jpy' | 'chf';

export interface OfficeCell {
    buy: number | null;
    sell: number | null;
}
export interface InfinbankOfficeMap {
    bank: 'INFINBANK';
    source: string;
    fetchedAt: string;
    office: Record<LCode, OfficeCell>;
}

const URL = 'https://www.infinbank.com/en/private/exchange-rates/';

const toInt = (t: string): number | null => {
    const s = t.replace(/\s+/g, '').replace(',', '.').trim();
    if (!s || s === '-' || s === '—') return null;
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : null;
};
const lc = (c: Code) => c.toLowerCase() as LCode;

export async function fetchInfinbankOfficeRates(): Promise<InfinbankOfficeMap> {
    const res = await fetch(URL, {
        headers: {
            'user-agent': 'Mozilla/5.0',
            accept: 'text/html,application/xhtml+xml',
        },
    });
    if (!res.ok)
        throw new Error(`InfinBank HTTP ${res.status} ${res.statusText}`);

    const html = await res.text();
    const $: CheerioAPI = load(html);

    // Header codes (USD, EUR, GBP, RUB, JPY, CHF)
    const headCodes = $('.rates-table thead th .rates-flag .text')
        .toArray()
        .map((el) => $(el).text().trim().toUpperCase() as Code);

    // Locate "Exchange office" (rowspan=2): first row Buy, next row Sell
    const rows = $('.rates-table tbody tr').toArray();
    const i = rows.findIndex((tr) => {
        const td0 = $(tr).find('td').first();
        return (
            td0.hasClass('rates-subtitle') &&
            /Exchange\s*office/i.test(td0.text())
        );
    });
    if (i < 0 || !rows[i + 1])
        throw new Error('Exchange office rows not found');

    // Because of rowspan: Buy row => skip 2 tds; Sell row => skip 1 td
    const buyVals = $(rows[i]).find('td').toArray().slice(2);
    const sellVals = $(rows[i + 1])
        .find('td')
        .toArray()
        .slice(1);
    const len = Math.min(headCodes.length, buyVals.length, sellVals.length);

    const office = {} as Record<LCode, OfficeCell>;
    for (let k = 0; k < len; k++) {
        const code = lc(headCodes[k]);
        office[code] = {
            buy: toInt($(buyVals[k]).text()),
            sell: toInt($(sellVals[k]).text()),
        };
    }

    return {
        bank: 'INFINBANK',
        source: URL,
        fetchedAt: new Date().toISOString(),
        office,
    };
}

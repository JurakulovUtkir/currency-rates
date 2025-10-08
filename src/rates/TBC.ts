// tbcbank.ts
import { CheerioAPI, load } from 'cheerio';
import { fetch } from 'undici';

type Code = 'USD' | 'EUR' | 'GBP' | 'RUB' | 'JPY' | 'CHF' | 'KZT';
type LCode = Lowercase<Code>;

export interface TbcCell {
    buy: number | null;
    sell: number | null;
}
export interface TbcResult {
    bank: 'TBCBANK';
    source: string;
    fetchedAt: string;
    office: Partial<Record<LCode, TbcCell>>;
}

const URL = 'https://tbcbank.uz/uz/currency/';

const toNum = (t: string): number | null => {
    const s = t.replace(/\s+/g, '').replace(',', '.').replace(' ', '').trim();
    if (!s || s === '-' || s === '—') return null;
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : null; // they display integers anyway
};

const detectCode = (raw: string): Code | null => {
    const t = raw.toUpperCase();
    if (/\bUSD\b|AQSH|DOLLAR/.test(t)) return 'USD';
    if (/\bEUR\b|EVRO|YEVRO/.test(t)) return 'EUR';
    if (/\bGBP\b|FUNT|STERLING/.test(t)) return 'GBP';
    if (/\bRUB\b|RUBL/.test(t)) return 'RUB';
    if (/\bJPY\b|IYENA|IENA|YENA/.test(t)) return 'JPY';
    if (/\bCHF\b|FRANK/.test(t)) return 'CHF';
    if (/\bKZT\b|TENGE/.test(t)) return 'KZT';
    return null;
};

/**
 * Scrapes https://tbcbank.uz/uz/currency/ and returns Buy/Sell for each currency.
 */
export async function fetchTbcBankRates(): Promise<TbcResult> {
    const res = await fetch(URL, {
        headers: {
            'user-agent': 'Mozilla/5.0',
            accept: 'text/html,application/xhtml+xml',
        },
    });
    if (!res.ok)
        throw new Error(`TBC Bank HTTP ${res.status} ${res.statusText}`);

    const html = await res.text();
    const $: CheerioAPI = load(html);

    // Find the main rates table (there's typically one on the page)
    const table = $('table').first();
    const headCells = table
        .find('thead tr')
        .first()
        .find('th')
        .toArray()
        .map((th) => $(th).text().trim());

    // Determine column indexes by header text (Uzbek labels)
    const colIdx = (needle: RegExp) =>
        headCells.findIndex((h) => needle.test(h.toLowerCase()));

    const currencyIdx = 0; // first column is currency name
    const buyIdx = colIdx(/sotib\s*olish|buy/);
    const sellIdx = colIdx(/sotish|sell/);

    if (buyIdx < 0 || sellIdx < 0) {
        throw new Error('Could not detect Buy/Sell columns on TBC page');
    }

    const office: Partial<Record<LCode, TbcCell>> = {};
    table.find('tbody tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (!tds.length) return;

        const curText = $(tds.get(currencyIdx)).text().trim();
        const code = detectCode(curText);
        if (!code) return;

        const buy = toNum($(tds.get(buyIdx)).text());
        const sell = toNum($(tds.get(sellIdx)).text());
        office[code.toLowerCase() as LCode] = { buy, sell };
    });

    return {
        bank: 'TBCBANK',
        source: URL,
        fetchedAt: new Date().toISOString(),
        office,
    };
}

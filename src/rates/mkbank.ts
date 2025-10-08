// mkbank-office.ts
import { CheerioAPI, load } from 'cheerio';

export interface OfficeRate {
    buy: number | null;
    sell: number | null;
    cbu: number | null;
}
export interface MkbankOfficeResult {
    bank: 'MKBANK';
    source: string;
    fetchedAt: string; // ISO
    officeDateText: string | null;
    officeDateISO: string | null;
    office: Record<string, OfficeRate>; // e.g. { usd: { buy, sell, cbu }, ... }
}

const URL = 'https://mkbank.uz/uz/private/gold-bars/';

const toNum = (s: string | null | undefined): number | null => {
    if (!s) return null;
    const cleaned = s
        .replace(/\s+/g, '')
        .replace(/[^0-9.,-]/g, '')
        .replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
};

const parseUzbekDateToISO = (raw: string | null): string | null => {
    if (!raw) return null;
    const m = raw.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
    if (!m) return null;
    const [_, dd, MM, yyyy, hhmmss] = m;
    return new Date(`${yyyy}-${MM}-${dd}T${hhmmss}`).toISOString();
};

const parseOffice = ($: CheerioAPI) => {
    const group = $('.currency__group[data-tabs-target="tab1"]').first();

    const office: Record<string, OfficeRate> = {};
    group
        .find('table.currency__table tr')
        .slice(1)
        .each((_, tr) => {
            const tds = $(tr).find('td');
            if (tds.length < 4) return;

            const code = $(tds[0]).text().trim().toUpperCase(); // USD, EUR, ...
            if (!code) return;

            const buy = toNum($(tds[1]).text());
            const sell = toNum($(tds[2]).text());
            const cbu = toNum($(tds[3]).text());

            office[code.toLowerCase()] = { buy, sell, cbu };
        });

    const officeDateText =
        group.find('.currency__date span').first().text().trim() || null;
    const officeDateISO = parseUzbekDateToISO(officeDateText);

    return { office, officeDateText, officeDateISO };
};

/** Fetch ONLY office (tab1) exchange rates from MK Bank page. */
export async function fetchMkbankOfficeRates(): Promise<MkbankOfficeResult> {
    const res = await fetch(URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MkbankRatesBot/1.0)',
            Accept: 'text/html,application/xhtml+xml',
        },
    });
    if (!res.ok) throw new Error(`MKBank HTTP ${res.status}`);

    const html = await res.text();
    const $ = load(html);

    const { office, officeDateText, officeDateISO } = parseOffice($);

    return {
        bank: 'MKBANK',
        source: URL,
        fetchedAt: new Date().toISOString(),
        officeDateText,
        officeDateISO,
        office,
    };
}

// mkbank-office.ts — target the RU currency page you provided
import { load } from 'cheerio';

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
    office: Record<string, OfficeRate>;
}

// NEW URL (RU): foreign-exchange-transactions
const URL = 'https://mkbank.uz/ru/private/foreign-exchange-transactions/';

const toNum = (s: string | null | undefined): number | null => {
    if (!s) return null;
    const cleaned = s
        .replace(/\s+/g, '')
        .replace(/[^0-9.,-]/g, '')
        .replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
};

const parseUzbekRuDateToISO = (raw: string | null): string | null => {
    // e.g. "Данные от 13.10.2025 09:00:00"
    if (!raw) return null;
    const m = raw.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
    if (!m) return null;
    const [, dd, MM, yyyy, hhmmss] = m;
    const d = new Date(`${yyyy}-${MM}-${dd}T${hhmmss}Z`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

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

    // Prefer the active Tab1 group; fallback to the first currency table on the page.
    const group = $('div.currency__group[data-tabs-target="tab1"]').first();
    const tableInGroup = group.length
        ? group.find('table.currency__table').first()
        : null;
    const table =
        tableInGroup && tableInGroup.length
            ? tableInGroup
            : $('table.currency__table').first();

    const office: Record<string, OfficeRate> = {};
    table
        .find('tr')
        .slice(1)
        .each((_, tr) => {
            const tds = $(tr).find('td');
            if (tds.length < 4) return;

            const code = $(tds[0]).text().trim().toUpperCase(); // USD/EUR/...
            if (!code) return;
            office[code.toLowerCase()] = {
                buy: toNum($(tds[1]).text()),
                sell: toNum($(tds[2]).text()),
                cbu: toNum($(tds[3]).text()),
            };
        });

    const officeDateText =
        group.find('.currency__date span').first().text().trim() ||
        $('.currency__date span').first().text().trim() ||
        null;
    const officeDateISO = parseUzbekRuDateToISO(officeDateText);

    return {
        bank: 'MKBANK',
        source: URL,
        fetchedAt: new Date().toISOString(),
        officeDateText,
        officeDateISO,
        office,
    };
}

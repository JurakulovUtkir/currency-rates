import axios from 'axios';
import * as cheerio from 'cheerio';

export type DavrSource = 'bank' | 'legal' | 'mobile';

export interface ExchangeRate {
    currency: string; // e.g. 'USD' (falls back to name if code not mapped)
    buyRate: string; // 'Xarid'
    sellRate: string; // 'Sotuv'
    centralBankRate: string; // 'MB'
    source: DavrSource; // 'bank' | 'legal' | 'mobile'
}

export async function getDavrbankRates(): Promise<ExchangeRate[]> {
    const url = 'https://davrbank.uz/uz/exchange-rate';

    const res = await axios.get(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
        },
    });

    const $ = cheerio.load(res.data);

    // All three sections use the same table classes; they appear in order:
    // 0: Bank ofislarida, 1: Yuridik shaxslar, 2: Mobil ilovada
    const $tables = $('table.min-w-full.table-auto.border-collapse.text-left');

    const out: ExchangeRate[] = [];
    if ($tables.length === 0) return out;

    // Helper to parse one table with a given source tag
    const parseTable = (tableIdx: number, source: DavrSource) => {
        const $t = $tables.eq(tableIdx);
        if ($t.length === 0) return;

        $t.find('tbody > tr').each((_, tr) => {
            const $tds = $(tr).find('td');
            if ($tds.length < 4) return;

            // td[0] contains the currency name (e.g., 'AQSH dollari', 'Yevro', ...)
            const name = norm($tds.eq(0).text());
            const code = mapNameToCode(name);
            const currency = code || name;

            // Column order on page: MB, Sotuv (sell), Xarid (buy)
            const centralBankRate = norm($tds.eq(1).text());
            const sellRate = norm($tds.eq(2).text());
            const buyRate = norm($tds.eq(3).text());

            if (!currency) return;

            out.push({ currency, buyRate, sellRate, centralBankRate, source });
        });
    };

    parseTable(0, 'bank');
    parseTable(1, 'legal');
    parseTable(2, 'mobile');

    return out;
}

/* ---------------- utils ---------------- */

function norm(s: string): string {
    // Replace non-breaking spaces and collapse whitespace
    return s
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Minimal mapper from Uzbek names to ISO codes (extend as needed)
function mapNameToCode(name: string): string {
    const n = name.toLowerCase();
    if (/\baqsh\b|\bus\b|dollari/.test(n)) return 'USD';
    if (/\byevro|\bevro\b/.test(n)) return 'EUR';
    if (/\bfunt\b|sterling/.test(n)) return 'GBP';
    if (/shveytsariya|franki/.test(n)) return 'CHF';
    if (/yapon|yenasi|iyena|iyenasi/.test(n)) return 'JPY';
    if (/rossiya|rubl/i.test(n)) return 'RUB';
    if (/qozog['‘’]iston|tengesi|tenge/i.test(n)) return 'KZT';
    if (/xitoy|yuan|cny/i.test(n)) return 'CNY';
    return '';
}

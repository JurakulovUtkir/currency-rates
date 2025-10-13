// src/rates/garantbank.ts
import { load } from 'cheerio';

type Pair = { buy: number | null; sell: number | null };
type Office = Record<
    'usd' | 'eur' | 'gbp' | 'rub' | 'chf' | 'jpy' | 'cny',
    Pair
>;

export async function fetchGarantbankOfficeRates() {
    const source = 'https://garantbank.uz/uz/exchange-rates';
    const res = await fetch(source, {
        headers: {
            'user-agent': 'Mozilla/5.0 (compatible; RatesBot/1.0)',
            'accept-language': 'uz,en;q=0.9,ru;q=0.8',
        },
    });
    if (!res.ok) throw new Error(`GARANTBANK: HTTP ${res.status}`);
    const html = await res.text();
    const $ = load(html);

    const currencies = [
        'USD',
        'EUR',
        'GBP',
        'RUB',
        'CHF',
        'JPY',
        'CNY',
    ] as const;
    const key = (c: (typeof currencies)[number]) =>
        c.toLowerCase() as keyof Office;
    const num = (s: string): number | null => {
        const t = s.replace(/\s+/g, '').replace(',', '.').trim();
        if (!t) return null;
        const n = Number(t);
        return Number.isFinite(n) ? n : null;
    };

    const office: Partial<Office> = {};
    // Skip header row and the subtitle row
    $('table.exchange-table tr')
        .slice(2)
        .each((_, tr) => {
            const $tr = $(tr);
            const code = $tr
                .find('.exchange-currency')
                .first()
                .text()
                .trim()
                .toUpperCase();
            if (!currencies.includes(code as any)) return;
            const tds = $tr.find('td');
            const buy = num(
                tds.eq(2).find('.exchange-purchase').first().text(),
            );
            const sell = num(tds.eq(2).find('.exchange-sale').first().text());
            office[key(code as any)] = { buy, sell };
        });

    // Ensure all currencies present
    const ensured = Object.fromEntries(
        currencies.map((c) => {
            const k = key(c);
            return [k, office[k] ?? { buy: null, sell: null }];
        }),
    ) as Office;

    return {
        bank: 'GARANTBANK',
        source,
        fetchedAt: new Date().toISOString(),
        office: ensured,
    } as const;
}

// src/rates/tbcbank.ts — robust to TBC’s mislabeled “Sotish/MB kursi” blocks
import { load } from 'cheerio';
import { fetch } from 'undici';

export type OfficeRates = Record<
    string,
    { buy: number | null; sell: number | null }
>;
export interface TbcBankResult {
    bank: 'TBCBANK';
    source: string;
    fetchedAt: string;
    office: OfficeRates;
}

const SOURCE = 'https://tbcbank.uz/uz/currency/';
const toNum = (raw: string): number | null => {
    const c = raw
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, '')
        .replace(',', '.')
        .replace(/[^\d.]/g, '');
    const n = c ? Number(c) : NaN;
    return Number.isFinite(n) ? n : null;
};
const isoFromHrefOrText = (href?: string, text = ''): string | null => {
    const fromHref = href
        ?.match(/\/currency\/([a-z]{3})\//i)?.[1]
        ?.toUpperCase();
    if (fromHref) return fromHref;
    const t = text.toUpperCase();
    if (/AQSH\s*DOLLARI|USD/.test(t)) return 'USD';
    if (/EVRO|ЕВРО|EUR/.test(t)) return 'EUR';
    if (/RUBL|RUB/.test(t)) return 'RUB';
    if (/FUNT|GBP/.test(t)) return 'GBP';
    if (/YEN|ИЕНА|JPY/.test(t)) return 'JPY';
    if (/FRANKI|CHF/.test(t)) return 'CHF';
    if (/YUAN|ЮАНЬ|CNY/.test(t)) return 'CNY';
    return null;
};

export async function fetchTbcBankOfficeRates(
    source = SOURCE,
): Promise<TbcBankResult> {
    const res = await fetch(source, {
        headers: { 'accept-language': 'uz,ru;q=0.9,en;q=0.8' },
    });
    if (!res.ok)
        throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const html = await res.text();
    const $ = load(html);

    const office: OfficeRates = {};
    $('.currency__list-body .body-item').each((_i, item) => {
        const $item = $(item);
        const $a = $item.find('.rates-title a').first();
        const iso = isoFromHrefOrText($a.attr('href'), $a.text().trim());
        if (!iso) return;

        // Collect numbers in visual order: [buy, x, y] where x/y are (sell, CBU) but labels may be swapped.
        const nums: number[] = [];
        $item.find('.rate').each((_k, r) => {
            const v = toNum($(r).text());
            if (v != null) nums.push(v);
        });
        if (nums.length < 3) return;

        const buy = nums[0];
        // Heuristic: SELL is the larger of the remaining two; CBU is the other (matches your screenshot: 12190 > 12 123,38).
        const rest = nums.slice(1, 3);
        const sell = Math.max(rest[0], rest[1]);

        office[iso.toLowerCase()] = { buy, sell };
    });

    if (!Object.keys(office).length)
        throw new Error('TBC: no currency rows matched.');
    return {
        bank: 'TBCBANK',
        source,
        fetchedAt: new Date().toISOString(),
        office,
    };
}

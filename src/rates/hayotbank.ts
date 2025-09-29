// hayotbank.ts
export interface HayotBankTitle {
    ru: string;
    uz: string;
    en: string;
    uzCyrillic: string;
    id: number;
}

export interface HayotBankCurrency {
    id: number;
    ord: number;
    code: number; // ISO-4217 numeric (e.g., 840 for USD)
    active: boolean;
    title: HayotBankTitle; // contains "(USD)" etc.
}

export interface HayotBankType {
    id: number;
    ord: number;
    active: boolean;
    title: HayotBankTitle;
    category: 'INDIVIDUAL' | string;
}

export interface HayotBankItem {
    id: number;
    ord: number;
    active: boolean;
    buy: string | null; // numeric-as-string
    sell: string | null; // numeric-as-string
    cbu: string | null; // numeric-as-string
    otcRateSell: string | null;
    otcRateBuy: string | null;
    actualDate: string; // ISO
    currency: HayotBankCurrency;
    type: HayotBankType;
    currencyId: number;
    typeId: number;
}

export interface HayotBankResponse {
    data: HayotBankItem[];
    code: number;
    message: string | null;
}

export interface NormalizedRate {
    id: number;
    currencyNumCode: number; // e.g., 840
    currencyAlphaCode?: string; // e.g., USD (best-effort, parsed from title)
    buy?: number;
    sell?: number;
    cbu?: number;
    bank: 'Hayotbank';
    actualDate: Date;
    raw: HayotBankItem; // keep original in case you need extra fields
}

const ENDPOINT =
    'https://api.hayotbank.uz/api/curr-exchange-rate/get-all?size=2000&search=currExchangeRate.active=true';

/**
 * Extracts the alpha code like "USD" from strings such as "US dollar (USD)".
 */
function extractAlphaCodeFromTitle(title?: string): string | undefined {
    if (!title) return undefined;
    const m = title.match(/\(([A-Z]{3})\)\s*$/);
    return m?.[1];
}

/**
 * Converts "15200.0" -> 15200 (number), safely.
 */
function toNumberSafe(val: string | null | undefined): number | undefined {
    if (val == null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
}

/**
 * Fetches Hayotbank exchange rates.
 * Works in Node 18+ / Bun / modern browsers where `fetch` is global.
 */
export async function fetchHayotBankRates(
    init?: RequestInit,
): Promise<{ raw: HayotBankItem[]; normalized: NormalizedRate[] }> {
    const res = await fetch(ENDPOINT, {
        method: 'GET',
        redirect: 'follow',
        ...init,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
            `Hayotbank API failed: ${res.status} ${res.statusText} ${
                text && `- ${text}`
            }`,
        );
    }

    const json = (await res.json()) as HayotBankResponse;

    if (!json || !Array.isArray(json.data)) {
        throw new Error('Unexpected Hayotbank API shape: missing data[]');
    }

    const normalized: NormalizedRate[] = json.data
        .filter((r) => r.active) // keep only active
        .map((r) => {
            const alpha =
                extractAlphaCodeFromTitle(r.currency?.title?.en) ??
                extractAlphaCodeFromTitle(r.currency?.title?.uz) ??
                extractAlphaCodeFromTitle(r.currency?.title?.ru);

            return {
                id: r.id,
                currencyNumCode: r.currency?.code,
                currencyAlphaCode: alpha,
                buy: toNumberSafe(r.buy),
                sell: toNumberSafe(r.sell),
                cbu: toNumberSafe(r.cbu),
                bank: 'Hayotbank',
                actualDate: new Date(r.actualDate),
                raw: r,
            };
        });

    return { raw: json.data, normalized };
}

// Example usage:
// (async () => {
//   const { normalized } = await fetchHayotBankRates();
//   console.log(normalized);
// })();

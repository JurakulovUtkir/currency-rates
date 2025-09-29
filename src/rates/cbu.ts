// cbu.ts
// Fetch CBU currency rates (https://cbu.uz/uz/arkhiv-kursov-valyut/json/)

export interface CbuRate {
    id: number;
    Code: string; // e.g. "840"
    Ccy: string; // e.g. "USD"
    CcyNm_RU: string;
    CcyNm_UZ: string;
    CcyNm_UZC: string;
    CcyNm_EN: string;
    Nominal: string; // e.g. "1"
    Rate: string; // e.g. "12171.03"
    Diff: string; // e.g. "-86.1"
    Date: string; // e.g. "24.09.2025"
}

export type FetchCbuRatesOpts = {
    /** PHPSESSID value; falls back to process.env.CBU_PHPSESSID if omitted */
    sessionId?: string;
    /** Optional AbortSignal for timeouts/cancellation */
    signal?: AbortSignal;
};

/**
 * Fetches daily currency rates from CBU.
 * Uses the provided PHPSESSID (or CBU_PHPSESSID env) as a Cookie if available.
 */
export async function fetchCbuRates(
    opts: FetchCbuRatesOpts = {},
): Promise<CbuRate[]> {
    const { sessionId, signal } = opts;

    const headers = new Headers();
    const phpsessid = sessionId ?? process.env.CBU_PHPSESSID;
    if (phpsessid) {
        headers.set('Cookie', `PHPSESSID=${phpsessid}`);
    }

    const url = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/';

    try {
        const resp = await fetch(url, {
            method: 'GET',
            headers,
            redirect: 'follow',
            signal,
        });

        if (!resp.ok) {
            const bodyText = await resp.text().catch(() => '');
            throw new Error(
                `❌ CBU GET xatosi: HTTP ${resp.status} ${resp.statusText}. ` +
                    `Javob: ${bodyText.slice(0, 500)}`,
            );
        }

        const data = (await resp.json()) as CbuRate[];
        return data;
    } catch (err) {
        // Log and rethrow to let the caller decide how to handle it
        console.error('❌ CBU GET xatosi:', err);
        throw err;
    }
}

/** Convenience helper: find a specific currency by its code (e.g., 'USD', 'EUR', 'RUB'). */
export function getRateByCcy(
    rates: CbuRate[],
    ccy: string,
): CbuRate | undefined {
    const needle = ccy.trim().toUpperCase();
    return rates.find((r) => r.Ccy.toUpperCase() === needle);
}

/** Optional: number-friendly parser for Rate/Diff/Nominal (since API returns strings). */
export function parseNumericFields(r: CbuRate): {
    rate: number;
    diff: number;
    nominal: number;
} {
    const toNum = (s: string) => Number(String(s).replace(',', '.'));
    return {
        rate: toNum(r.Rate),
        diff: toNum(r.Diff),
        nominal: toNum(r.Nominal),
    };
}

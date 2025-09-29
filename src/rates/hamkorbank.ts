// hamkorbank.ts
export interface HamkorItem {
    id: string;
    destination_code: string;
    currency_code: string; // ISO-4217 numeric as string (e.g., "840")
    currency_char: string; // Alpha (e.g., "USD")
    selling_rate: number; // in tiyin (×100)
    buying_rate: number; // in tiyin (×100)
    sb_course: number; // in tiyin (×100)
    difference: number;
    created_at: string; // ISO with +05:00
    begin_date: string; // ISO with +05:00
    begin_sum_i: number;
}

export interface HamkorResponse {
    status: 'Success' | string;
    error_code: number;
    error_note: string;
    data: HamkorItem[];
}

export interface HamkorNormalized {
    currencyNumCode: number; // 840
    currencyAlphaCode: string; // USD
    buy?: number; // 12100.00 -> 12100 (divide by 100)
    sell?: number;
    cbu?: number;
    bank: 'Hamkorbank';
    actualDate: Date; // created_at
    raw: HamkorItem;
}

const ENDPOINT = 'https://api-dbo.hamkorbank.uz/webflow/v1/exchanges';

/** Convert integer rate in tiyin (×100) to number (divide by 100), safely. */
const fromTiyin = (v?: number | null) =>
    typeof v === 'number' && Number.isFinite(v)
        ? Math.round((v / 100) * 100) / 100
        : undefined;

/**
 * Fetch Hamkorbank exchange rates (requires Cookie header).
 * Pass your Cookie via `cookie` or provide a full `init.headers`.
 */
export async function fetchHamkorbankRates(opts?: {
    cookie?: string;
    init?: RequestInit;
}): Promise<{ raw: HamkorItem[]; normalized: HamkorNormalized[] }> {
    const headers = new Headers(opts?.init?.headers || {});
    if (opts?.cookie) headers.set('Cookie', opts.cookie);

    const res = await fetch(ENDPOINT, {
        method: 'GET',
        headers,
        redirect: 'follow',
        ...opts?.init,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
            `Hamkorbank API failed: ${res.status} ${res.statusText} ${
                text && `- ${text}`
            }`,
        );
    }

    const json = (await res.json()) as HamkorResponse;
    if (!json || !Array.isArray(json.data))
        throw new Error('Unexpected Hamkorbank API shape');

    const normalized: HamkorNormalized[] = json.data.map((r) => ({
        currencyNumCode: Number(r.currency_code),
        currencyAlphaCode: r.currency_char,
        buy: fromTiyin(r.buying_rate),
        sell: fromTiyin(r.selling_rate),
        cbu: fromTiyin(r.sb_course),
        bank: 'Hamkorbank',
        actualDate: new Date(r.created_at || r.begin_date),
        raw: r,
    }));

    return { raw: json.data, normalized };
}

// Example:
// const { normalized } = await fetchHamkorbankRates({ cookie: "TS017ec7c4=..." });
// console.log(normalized.find(r => r.currencyAlphaCode === "USD"));

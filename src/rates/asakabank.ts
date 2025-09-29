// asakabank.client.ts
import axios from 'axios';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';

const URL = 'https://back.asakabank.uz/core/v1/currency-list/';

export type AsakaCurrencyType = 1 | 2;

export interface AsakaApiItem {
    id: number;
    name: string;
    short_name: string;
    rate_cb: string;
    purchase: string;
    different_purchase: string;
    sale: string;
    different_sale: string;
    code: string;
    currency_type: AsakaCurrencyType;
    currency_type_name: 'Individual' | 'Corporate';
    order: number;
    modified_date: string;
    created_date: string;
}
export interface AsakaApiResponse {
    links: { next: string | null; previous: string | null };
    count: number;
    page: number;
    page_size: number;
    results: AsakaApiItem[];
}
export type NormalizedAsaka = {
    id: number;
    name: string;
    alpha: string;
    code: string;
    type: 'Individual' | 'Corporate';
    typeId: AsakaCurrencyType;
    cbu: number | null;
    buy: number | null;
    sell: number | null;
    modifiedAt: string;
    createdAt: string;
};

const toNum = (s?: string | null) => {
    if (s == null) return null;
    const n = Number(String(s).replace(/\s+/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};
const fixAlpha = (a: string) =>
    a?.toUpperCase() === 'GRB' ? 'GBP' : a?.toUpperCase() ?? '';

export async function fetchAsakaRatesOnceAxios(): Promise<{
    raw: AsakaApiItem[];
    normalized: NormalizedAsaka[];
}> {
    const res = await axios.get<AsakaApiResponse>(URL, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'rates-bot/1.0 (+https://vaqt.uz)',
        },
        timeout: 12_000,
        validateStatus: (s) => s >= 200 && s < 400,
        httpAgent: new HttpAgent({ keepAlive: true }),
        httpsAgent: new HttpsAgent({ keepAlive: true }),
        responseType: 'json',
    });

    const raw = Array.isArray(res.data?.results) ? res.data.results : [];
    const normalized: NormalizedAsaka[] = raw.map((r) => ({
        id: r.id,
        name: r.name,
        alpha: fixAlpha(r.short_name),
        code: r.code,
        type: r.currency_type_name,
        typeId: r.currency_type,
        cbu: toNum(r.rate_cb),
        buy: toNum(r.purchase),
        sell: toNum(r.sale),
        modifiedAt: r.modified_date,
        createdAt: r.created_date,
    }));

    return { raw, normalized };
}

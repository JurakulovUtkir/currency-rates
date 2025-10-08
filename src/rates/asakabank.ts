// src/rates/asakabank.axios.ts
import axios from 'axios';
import * as https from 'node:https';

const sanitize = (v: string) => v.replace(/[^\u0020-\u007E]/g, '');

export interface AsakaAxiosOpts {
    cookie?: string;
    page?: number;
    pageSize?: number;
    baseUrl?: string;
    timeoutMs?: number;
    maxRedirects?: number;
}

export async function fetchAsakaCurrencyListAxios({
    cookie = 'cookiesession1=678A8C6B80159488256C708715C83290',
    page = 1,
    pageSize = 20,
    baseUrl = 'https://back.asakabank.uz/core/v1',
    timeoutMs = 12_000,
    maxRedirects = 5,
}: AsakaAxiosOpts = {}): Promise<unknown> {
    const agent = new https.Agent({ keepAlive: true });

    const client = axios.create({
        baseURL: baseUrl,
        timeout: timeoutMs,
        maxRedirects,
        decompress: true,
        httpAgent: agent,
        httpsAgent: agent,
        headers: {
            'User-Agent': 'PostmanRuntime/7.40.0',
            Accept: 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            Cookie: sanitize(cookie),
            Connection: 'close',
        },
        // don't auto-throw on non-2xx; we handle it below
        validateStatus: () => true,
        transitional: { forcedJSONParsing: false }, // keep raw text if server mislabels content-type
    });

    const url = `/currency-list/?page=${page}&page_size=${pageSize}`;
    const res = await client.get(url, { insecureHTTPParser: true as any });

    if (res.status < 200 || res.status >= 300) {
        const body =
            typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`);
    }
    return res.data;
}

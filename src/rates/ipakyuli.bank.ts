// ipakyuli.nuxt-rates.checkout.ts
import { fetch } from 'undici';

export interface Triple {
    buy: number | null;
    sell: number | null;
    cb: number | null;
}
export interface Result {
    source: string;
    fetchedAt: string;
    USD: Triple;
    EUR: Triple;
    RUB: Triple;
}

export async function fetchIpakyuliUsdEurRub(): Promise<Result> {
    const source = 'https://en.ipakyulibank.uz/physical/exchange-rates';
    const html = await (
        await fetch(source, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        })
    ).text();

    const m = html.match(
        /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
    );
    if (!m) throw new Error('IPAKYULI: __NUXT_DATA__ not found');
    const nuxt: any = JSON.parse(m[1]);
    if (!Array.isArray(nuxt))
        throw new Error('IPAKYULI: unexpected __NUXT_DATA__');

    // Resolve devalue-style chains (index -> value -> maybe index ...)
    const resolve = (v: any, hops = 8): any => {
        let out = v;
        for (let i = 0; i < hops; i++) {
            if (typeof out === 'number' && out in nuxt) out = nuxt[out];
            else break;
        }
        return out;
    };
    const toNum = (v: any): number | null =>
        typeof v === 'number' && Number.isFinite(v) ? v : null;
    const norm = (v: number | null) => (v == null ? null : Math.round(v) / 100);

    // Find the RATES TAB we want: name === "At the checkout" (preferred) else isActiveTab===true
    type Tab = { name?: any; isActiveTab?: any; rates?: any };
    const tabs: Tab[] = [];
    const walk = (x: any) => {
        if (!x) return;
        if (Array.isArray(x)) {
            for (const it of x) walk(it);
            return;
        }
        if (typeof x === 'object') {
            if ('name' in x && 'rates' in x) tabs.push(x as Tab);
            for (const k in x) walk((x as any)[k]);
        }
    };
    walk(nuxt);

    const pickTab = () => {
        // Prefer explicit "At the checkout"
        for (const t of tabs) {
            const name = String(resolve(t.name) ?? '');
            if (/^At the checkout$/i.test(name)) return t;
        }
        // Fallback: the one flagged active
        for (const t of tabs) {
            if (resolve(t.isActiveTab) === true) return t;
        }
        // Last fallback: first with rates
        return tabs.find((t) => resolve(t.rates)) ?? null;
    };

    const tab = pickTab();
    if (!tab) throw new Error('IPAKYULI: checkout tab not found');

    const ratesArr = resolve(tab.rates);
    if (!Array.isArray(ratesArr))
        throw new Error('IPAKYULI: rates array not found');

    // Build index by code_name from the chosen tab
    const byCode = new Map<string, Triple>();
    for (const ref of ratesArr) {
        const row = resolve(ref);
        if (!row || typeof row !== 'object') continue;
        const code = resolve(row.code_name);
        const rate = resolve(row.rate);
        if (typeof code !== 'string' || !rate || typeof rate !== 'object')
            continue;

        const buy = norm(toNum(resolve(rate.buy)));
        const sell = norm(toNum(resolve(rate.sell)));
        const cb = norm(toNum(resolve(rate.cb)));
        byCode.set(code, { buy, sell, cb });
    }

    const blank: Triple = { buy: null, sell: null, cb: null };
    return {
        source,
        fetchedAt: new Date().toISOString(),
        USD: byCode.get('USD') ?? blank,
        EUR: byCode.get('EUR') ?? blank,
        RUB: byCode.get('RUB') ?? blank,
    };
}

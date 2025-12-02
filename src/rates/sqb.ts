// sqb.exchange.ts
import * as puppeteer from 'puppeteer';

export type Money = number | null;
export interface Exchange {
    buy: Money;
    sell: Money;
    cb?: Money | null; // "MB kursi"
}
export interface SqbResult {
    bank: 'SQB';
    source: string;
    fetchedAt: string;
    office?: Partial<
        Record<'usd' | 'eur' | 'rub' | 'gbp' | 'chf' | 'jpy', Exchange>
    >;
    online?: Partial<
        Record<'usd' | 'eur' | 'rub' | 'gbp' | 'chf' | 'jpy', Exchange>
    >;
    atm?: Partial<
        Record<'usd' | 'eur' | 'rub' | 'gbp' | 'chf' | 'jpy', Exchange>
    >;
    corporate?: Partial<
        Record<'usd' | 'eur' | 'rub' | 'gbp' | 'chf' | 'jpy', Exchange>
    >;
}

/**
 * Scrapes SQB exchange rates from https://sqb.uz/uz/individuals/exchange-money/
 * Tabs parsed: Ayirboshlash shaxobchasi (office), Onlayn (online), ATM kursi (atm), Yuridik shaxslar uchun (corporate)
 */
export async function fetchSqbExchangeRates(): Promise<SqbResult> {
    const source = 'https://sqb.uz/uz/individuals/exchange-money/';
    const launched = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const browser = launched;
    try {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60_000);
        await page.setUserAgent(
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        );
        await page.goto(source, { waitUntil: 'networkidle2' });

        // Wait for the exchange widget to appear
        await page.waitForSelector('.exchangeRate [data-exchange="true"]', {
            timeout: 30_000,
        });

        const data = await page.evaluate(() => {
            const toKey = (
                cls: string,
            ): 'usd' | 'eur' | 'rub' | 'gbp' | 'chf' | 'jpy' | undefined => {
                const m = cls.trim().toLowerCase();
                if (m.includes('usd')) return 'usd';
                if (m.includes('eur')) return 'eur';
                if (m.includes('rub')) return 'rub';
                if (m.includes('gbp')) return 'gbp';
                if (m.includes('chf')) return 'chf';
                if (m.includes('jpy')) return 'jpy';
                return undefined;
            };
            const toNum = (s: string | null | undefined): number | null => {
                if (!s) return null;
                const cleaned = s
                    .replace(/\u00A0/g, ' ')
                    .replace(/\s+/g, '')
                    .replace(',', '.');
                const n = parseFloat(cleaned);
                return Number.isFinite(n) ? n : null;
            };

            // Tabs are implemented as a sequence of <input id="currency-N"> followed by a sibling div that contains a <table>
            const result: any = {
                office: {},
                online: {},
                atm: {},
                corporate: {},
            };

            // Build mapping from radio id -> bucket
            const idToBucket: Record<
                string,
                'office' | 'online' | 'atm' | 'corporate'
            > = {
                'currency-1': 'office',
                'currency-2': 'online',
                'currency-3': 'atm',
                'currency-4': 'corporate',
            };

            const inputs = Array.from(
                document.querySelectorAll<HTMLInputElement>(
                    'input[name="currency"]',
                ),
            );
            for (const input of inputs) {
                const bucket = idToBucket[input.id];
                if (!bucket) continue;

                // The next sibling with class containing "alc-tab-content-2" (latin 'alc' to avoid Cyrillic 'с' pitfalls)
                let panel: Element | null = input.nextElementSibling;
                while (
                    panel &&
                    !(
                        panel instanceof HTMLElement &&
                        panel.className.includes('alc-tab-content-2')
                    )
                ) {
                    panel = panel.nextElementSibling;
                }
                if (!panel) continue;

                const table = panel.querySelector('table.table');
                if (!table) continue;

                const rows = Array.from(table.querySelectorAll('tbody tr'));
                for (const tr of rows) {
                    const tds = tr.querySelectorAll('td');
                    if (tds.length < 4) continue;
                    const codeCell = tds[0];
                    const cbCell = tds[1];
                    const buyCell = tds[2];
                    const sellCell = tds[3];

                    const key = Array.from(codeCell.classList)
                        .map(String)
                        .map((s) => s.toLowerCase())
                        .find(Boolean);
                    const ckey = key ? toKey(key) : undefined;
                    if (!ckey) continue;

                    const cb = toNum(cbCell.textContent?.trim() || '');
                    // buy/sell text may contain <i> tag + spaces
                    const buyText = buyCell.textContent || '';
                    const sellText = sellCell.textContent || '';

                    const buy = toNum(buyText);
                    const sell = toNum(sellText);

                    if (!result[bucket]) result[bucket] = {};
                    result[bucket][ckey] = { buy, sell, cb };
                }
            }

            return result as {
                office?: Record<
                    string,
                    {
                        buy: number | null;
                        sell: number | null;
                        cb?: number | null;
                    }
                >;
                online?: Record<
                    string,
                    {
                        buy: number | null;
                        sell: number | null;
                        cb?: number | null;
                    }
                >;
                atm?: Record<
                    string,
                    {
                        buy: number | null;
                        sell: number | null;
                        cb?: number | null;
                    }
                >;
                corporate?: Record<
                    string,
                    {
                        buy: number | null;
                        sell: number | null;
                        cb?: number | null;
                    }
                >;
            };
        });

        const normalize = (m?: Record<string, Exchange>) =>
            m
                ? (Object.fromEntries(
                      Object.entries(m).map(([k, v]) => [
                          k as any,
                          {
                              buy: v?.buy ?? null,
                              sell: v?.sell ?? null,
                              cb: v?.cb ?? null,
                          },
                      ]),
                  ) as any)
                : undefined;

        const result: SqbResult = {
            bank: 'SQB',
            source,
            fetchedAt: new Date().toISOString(),
            office: normalize(data.office),
            online: normalize(data.online),
            atm: normalize(data.atm),
            corporate: normalize(data.corporate),
        };

        console.log('Currencies successfully fetched from SQB');

        return result;
    } finally {
        await browser.close();
    }
}

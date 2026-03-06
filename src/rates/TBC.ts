// src/rates/tbcbank.ts
import puppeteer, { Browser } from 'puppeteer';

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

const SOURCE = 'https://tbcbank.uz/currencies/';

const toNum = (raw?: string | null): number | null => {
    if (!raw) return null;
    const c = raw
        .replace(/\s+/g, '')
        .replace(',', '.')
        .replace(/[^\d.]/g, '');
    const n = c ? Number(c) : NaN;
    return Number.isFinite(n) ? n : null;
};

export async function fetchTbcBankOfficeRates(
    source = SOURCE,
): Promise<TbcBankResult> {
    let browser: Browser | null = null;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        );
        await page.setViewport({ width: 1366, height: 900 });
        await page.goto(source, {
            waitUntil: 'domcontentloaded',
            timeout: 60_000,
        });

        // Wait until at least one rate row is hydrated
        await page.waitForSelector(
            'tr[data-testid="currency-rate-table-block-rate"]',
            { timeout: 60_000 },
        );

        const office = await page.evaluate(() => {
            const out: Record<
                string,
                { buy: number | null; sell: number | null }
            > = {};

            const parseNum = (raw?: string | null): number | null => {
                if (!raw) return null;
                const c = raw
                    .replace(/\s+/g, '')
                    .replace(',', '.')
                    .replace(/[^\d.]/g, '');
                const n = c ? Number(c) : NaN;
                return Number.isFinite(n) ? n : null;
            };

            const rows = document.querySelectorAll<HTMLTableRowElement>(
                'tr[data-testid="currency-rate-table-block-rate"]',
            );

            rows.forEach((row) => {
                // Code: prefer <a> text, fallback to td text content
                const baseTd = row.querySelector(
                    'td[data-testid="currency-rate-table-block-rate-base"]',
                );
                const code = (
                    baseTd?.querySelector('a')?.textContent?.trim() ||
                    baseTd?.textContent?.trim() ||
                    ''
                )
                    .replace(/[^A-Z]/gi, '')
                    .toUpperCase();

                if (!code) return;

                const sellText = row
                    .querySelector(
                        'td[data-testid="currency-rate-table-block-rate-selling"] span',
                    )
                    ?.textContent?.trim();

                const buyText = row
                    .querySelector(
                        'td[data-testid="currency-rate-table-block-rate-buying"] span',
                    )
                    ?.textContent?.trim();

                out[code.toLowerCase()] = {
                    sell: parseNum(sellText),
                    buy: parseNum(buyText),
                };
            });

            return out;
        });

        if (!Object.keys(office).length)
            throw new Error('TBC: no currency rows matched.');

        return {
            bank: 'TBCBANK',
            source,
            fetchedAt: new Date().toISOString(),
            office,
        };
    } finally {
        await browser?.close().catch(() => {});
    }
}

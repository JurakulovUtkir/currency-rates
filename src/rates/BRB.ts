// src/rates/brb.puppeteer.ts
import puppeteer, { Browser } from 'puppeteer';

export type OfficeRate = { buy: number | null; sell: number | null };
export type Office = Record<string, OfficeRate>;

const toNum = (t?: string | null) => {
    if (!t) return null;
    const n = parseInt(t.replace(/\s+/g, '').trim(), 10);
    return Number.isFinite(n) ? n : null;
};

export async function fetchBrbOfficeRatesPptr(): Promise<{
    bank: 'BRB';
    source: string;
    fetchedAt: string;
    office: Office;
}> {
    const source = 'https://brb.uz/';
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

        // Wait until the table is hydrated
        await page.waitForSelector('#currency-table-body tr td.currency-name', {
            timeout: 60_000,
        });

        const office = await page.evaluate(() => {
            const out: Record<
                string,
                { buy: number | null; sell: number | null }
            > = {};

            const parseIntSafe = (t?: string | null) => {
                if (!t) return null;
                const n = parseInt(t.replace(/\s+/g, '').trim(), 10);
                return Number.isFinite(n) ? n : null;
            };

            const rows = document.querySelectorAll<HTMLTableRowElement>(
                '#currency-table-body tr',
            );

            rows.forEach((row) => {
                const tds = row.querySelectorAll('td');
                if (tds.length < 3) return;

                // Use img alt to get code — avoids "USD(BRB mobile)" text noise
                const code = tds[0]
                    ?.querySelector('img')
                    ?.getAttribute('alt')
                    ?.trim()
                    .toUpperCase();

                if (!code || code.includes('(')) return; // skip mobile rows
                if (out[code]) return; // first row wins

                out[code] = {
                    buy: parseIntSafe(tds[1]?.textContent),
                    sell: parseIntSafe(tds[2]?.textContent),
                };
            });

            return out;
        });

        return {
            bank: 'BRB',
            source,
            fetchedAt: new Date().toISOString(),
            office,
        };
    } finally {
        await browser?.close().catch(() => {});
    }
}

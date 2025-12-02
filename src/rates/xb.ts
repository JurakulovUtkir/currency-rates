// xbuz.puppeteer.ts
import puppeteer, { Browser } from 'puppeteer';

export type OfficeRate = { sell: number | null; buy: number | null };
export type Office = Record<string, OfficeRate>;

const toNum = (t?: string | null) => {
    if (!t) return null;
    const n = parseInt(t.replace(/\s+/g, '').trim(), 10);
    return Number.isFinite(n) ? n : null;
};

export async function fetchXbuzOfficeRatesPptr(): Promise<{
    bank: 'XB.UZ';
    source: string;
    fetchedAt: string;
    office: Office;
}> {
    const source = 'https://xb.uz/page/valyuta-ayirboshlash';
    let browser: Browser | null = null;

    try {
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium-browser',
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

        // Wait until numbers appear inside the widget (hydration complete)
        await page.waitForSelector('div.grid.grid-cols-12 p.font-roboto', {
            timeout: 60_000,
        });

        const office = await page.evaluate(() => {
            const out: Record<
                string,
                { sell: number | null; buy: number | null }
            > = {};

            // Each currency block: three 4-col cells => [0]=code, [1]=Selling, [2]=Purchase
            const rows = document.querySelectorAll<HTMLDivElement>(
                'div.grid.grid-cols-12.mb-6 > div.col-span-12.md\\:col-span-6.mb-6',
            );

            const parseIntSafe = (t?: string | null) => {
                if (!t) return null;
                const n = parseInt(t.replace(/\s+/g, '').trim(), 10);
                return Number.isFinite(n) ? n : null;
            };

            rows.forEach((row) => {
                const cells = row.querySelectorAll<HTMLDivElement>(
                    'div.col-span-4.flex.items-center',
                );
                if (cells.length < 3) return;

                const code =
                    cells[0]
                        ?.querySelector('h4 strong')
                        ?.textContent?.trim()
                        .toUpperCase() || '';
                if (!code) return;

                const sellText =
                    cells[1]?.querySelector('p')?.textContent || '';
                const buyText = cells[2]?.querySelector('p')?.textContent || '';

                out[code] = {
                    sell: parseIntSafe(sellText),
                    buy: parseIntSafe(buyText),
                };
            });

            return out;
        });

        return {
            bank: 'XB.UZ',
            source,
            fetchedAt: new Date().toISOString(),
            office,
        };
    } finally {
        await browser?.close().catch(() => {});
    }
}

import puppeteer from 'puppeteer';

export interface CentralBankRate {
    date: string; // "30.01.2026"
    currency: string; // "USD"
    rate: string; // "12 230,00"
    targetCurrency: string; // "UZS"
    changeDirection: 'up' | 'down';
    changeAmount: string; // "30,9"
}

export async function getCentralBankRate(): Promise<CentralBankRate | null> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();

        // Navigate and wait for content to load
        await page.goto('https://uzrvb.uz/oz/', {
            waitUntil: 'networkidle0',
            timeout: 30000,
        });

        // Wait for the price element to have content
        await page.waitForFunction(
            () => document.querySelector('#price')?.textContent?.trim() !== '',
            { timeout: 10000 },
        );

        // Extract data from the page
        const data = await page.evaluate(() => {
            const date =
                document.querySelector('#auctionDate')?.textContent?.trim() ||
                '';
            const rate =
                document.querySelector('#price')?.textContent?.trim() || '';

            // Get currency codes from colored spans
            const currencySpan = document.querySelector(
                'span[style*="#27ae60"]',
            );
            const targetCurrencySpan = document.querySelector(
                'span[style*="#eb4d4b"]',
            );

            const currency = currencySpan?.textContent?.trim() || 'USD';
            const targetCurrency =
                targetCurrencySpan?.textContent?.trim() || 'UZS';

            // Determine change direction
            const upElement = document.querySelector('#up') as HTMLElement;
            const downElement = document.querySelector('#down') as HTMLElement;

            const isUp = upElement?.style.display !== 'none';
            const changeDirection = isUp ? 'up' : 'down';

            // Get change amount
            const changeAmount = isUp
                ? document.querySelector('#change_up')?.textContent?.trim() ||
                  ''
                : document.querySelector('#change_down')?.textContent?.trim() ||
                  '';

            return {
                date,
                currency,
                rate,
                targetCurrency,
                changeDirection,
                changeAmount,
            };
        });

        // Validate data
        if (!data.date || !data.rate) {
            return null;
        }

        return data as CentralBankRate;
    } catch (error) {
        console.error('Error fetching central bank rate:', error);
        return null;
    } finally {
        await browser.close();
    }
}

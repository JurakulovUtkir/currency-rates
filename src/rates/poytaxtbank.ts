import axios from 'axios';
import * as cheerio from 'cheerio';

// Define an interface for the exchange rates data
export interface ExchangeRate {
    currency: string;
    buyRate: string;
    sellRate: string;
    centralBankRate: string;
}

// Exported function to fetch and extract exchange rates from the page
export async function getExchangeRates(): Promise<ExchangeRate[]> {
    try {
        // Fetch the HTML content from the page with headers
        const response = await axios.get(
            'https://poytaxtbank.uz/uz/services/exchange-rates/',
            {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            },
        );

        const html = response.data;

        // Load the HTML into cheerio
        const $ = cheerio.load(html);

        // Parse the exchange rate data
        const exchangeRates: ExchangeRate[] = [];

        // Select the first table (tab1)
        $(
            'div.exchange__main .exchange__group.active[data-tabs-target="tab1"] table.exchange__table tr',
        ).each((index, element) => {
            // Skip the header row
            if (index === 0) return;

            // Extract the currency, buy, sell, and central bank rates from the table rows
            const currency = $(element)
                .find('td:nth-child(1) span')
                .text()
                .trim();
            const buyRate = $(element)
                .find('td:nth-child(2) span')
                .text()
                .trim();
            const sellRate = $(element)
                .find('td:nth-child(3) span')
                .text()
                .trim();
            const centralBankRate = $(element)
                .find('td:nth-child(4) span')
                .text()
                .trim();

            // Push the extracted data to the result array
            exchangeRates.push({
                currency,
                buyRate,
                sellRate,
                centralBankRate,
            });
        });

        // Return the extracted exchange rates
        return exchangeRates;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        throw error;
    }
}

import axios from 'axios';
import * as cheerio from 'cheerio';

// Define an interface for the exchange rates data
export interface ExchangeRate {
    currency: string;
    buyRate: string;
    sellRate: string;
}

// Exported function to fetch and extract exchange rates from the KDB Bank page
export async function getKdbExchangeRates(): Promise<ExchangeRate[]> {
    try {
        // Fetch the HTML content from the KDB Bank exchange rates page
        const response = await axios.get(
            'https://kdb.uz/en/interactive-services/exchange-rates',
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

        // Extract exchange rates from the "kdb" tab table
        $('#kdb table.d-lg-none tbody tr').each((index, element) => {
            const currency = $(element).find('th').text().trim();
            const buySell = $(element).find('td').text().trim().split(' / ');

            // Handle missing RUB data (e.g., "n/a")
            const buyRate = buySell[0] !== 'n/a' ? buySell[0] : 'N/A';
            const sellRate = buySell[1] !== 'n/a' ? buySell[1] : 'N/A';

            // Add the extracted data to the exchangeRates array
            exchangeRates.push({
                currency,
                buyRate,
                sellRate,
            });
        });

        // Return the extracted exchange rates
        return exchangeRates;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        throw error;
    }
}

import axios from 'axios';
import * as cheerio from 'cheerio';

// Define an interface for the exchange rates data
export interface ExchangeRate {
    currency: string;
    mbRate: string;
    bankRate: string;
    mobileAppRate: string;
    atmRate: string;
}

// Exported function to fetch and extract exchange rates from the Garant Bank page
export async function getGarantBankExchangeRates(): Promise<ExchangeRate[]> {
    try {
        // Fetch the HTML content from the Garant Bank exchange rates page
        const response = await axios.get('https://garantbank.uz/uz', {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        const html = response.data;

        // Load the HTML into cheerio
        const $ = cheerio.load(html);

        // Parse the exchange rate data
        const exchangeRates: ExchangeRate[] = [];

        // Select the rows of the exchange rates table
        $('section.section .exchange-table tr').each((index, element) => {
            // Skip the header row
            if (index === 0) return;

            const currency = $(element)
                .find('td:nth-child(1) .exchange-currency')
                .text()
                .trim();
            const mbRate = $(element)
                .find('td:nth-child(2) .exchange-direction span')
                .text()
                .trim();
            const bankRate = $(element)
                .find('td:nth-child(3) .exchange-purchase')
                .text()
                .trim();
            const mobileAppRate = $(element)
                .find('td:nth-child(4) .exchange-purchase')
                .text()
                .trim();
            const atmRate = $(element)
                .find('td:nth-child(5) .exchange-purchase')
                .text()
                .trim();

            // Add the extracted data to the exchangeRates array
            exchangeRates.push({
                currency,
                mbRate,
                bankRate,
                mobileAppRate,
                atmRate,
            });
        });

        // Return the extracted exchange rates
        return exchangeRates;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        throw error;
    }
}

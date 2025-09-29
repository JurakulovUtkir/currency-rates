import axios from 'axios';
import * as cheerio from 'cheerio';

// Define an interface for the exchange rates data
export interface ExchangeRate {
    currency: string;
    buyRate: string;
    sellRate: string;
    mbRate: string;
}

// Function to fetch and extract exchange rates from Alokabank page
export async function getAlokabankExchangeRates(): Promise<ExchangeRate[]> {
    try {
        // Fetch the HTML content from the Alokabank exchange rates page
        const response = await axios.get('https://aloqabank.uz/uz/', {
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

        // Iterate through each row in the exchange table
        $(
            '.exchange__group.active[data-tabs-target="tab1"] .exchange__table tr',
        ).each((index, element) => {
            const currencyCode = $(element)
                .find('.currency-name__code')
                .text()
                .trim();
            const currencyName = $(element)
                .find('.currency-name__text')
                .text()
                .trim();

            // Skip the header row
            if (!currencyCode || !currencyName) return;

            const buyRate = $(element)
                .find('td:nth-child(2) .exchange-value span')
                .text()
                .trim();
            const sellRate = $(element)
                .find('td:nth-child(3) .exchange-value span')
                .text()
                .trim();
            const mbRate = $(element)
                .find('td:nth-child(4) .exchange-value span')
                .text()
                .trim();

            // Add the extracted data to the exchangeRates array
            exchangeRates.push({
                currency: `${currencyName} (${currencyCode})`,
                buyRate,
                sellRate,
                mbRate,
            });
        });

        // Return the extracted exchange rates
        return exchangeRates;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        throw error;
    }
}

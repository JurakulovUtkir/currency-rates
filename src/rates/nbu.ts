import axios from 'axios';
import * as cheerio from 'cheerio';

// Define an interface for the exchange rates data
export interface ExchangeRate {
    currency: string;
    buyRate: string;
    sellRate: string;
}

// Exported function to fetch and extract exchange rates from the NBU page
export async function getNbuExchangeRates(): Promise<ExchangeRate[]> {
    try {
        // Fetch the HTML content from the NBU exchange rates page
        const response = await axios.get(
            'https://nbu.uz/jismoniy-shaxslar-valyutalar-kursi',
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

        // Iterate through each currency item in the table
        $('.swiper-wrapper .swiper-slide').each((index, element) => {
            const currency = $(element)
                .find('.navbar_22_top-currency-heading')
                .text()
                .trim();
            const buyRate = $(element)
                .find(
                    '.navbar_22_top-currency-direction-wrapper:nth-child(1) .navbar_22_top-currency-text',
                )
                .text()
                .trim();
            const sellRate = $(element)
                .find(
                    '.navbar_22_top-currency-direction-wrapper:nth-child(2) .navbar_22_top-currency-text',
                )
                .text()
                .trim();

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

interface CurrencyItem {
    alpha3: string; // Currency code (e.g., 'USD', 'EUR', 'RUB')
    buy: string; // Buy rate as string
    rate: string; // Exchange rate as string
    sale: string; // Sale rate as string
    updated: string; // Last updated timestamp
}

// interface CurrencyContent {
//     items: CurrencyItem[]; // Array of currency items
// }

interface BlockContent {
    code: string; // e.g., 'exchange-type', 'office', 'currency-rates', etc.
    title?: string; // Title for tabs
    items?: CurrencyItem[]; // List of currency items (only for currency-related blocks)
}

interface Block {
    type: string; // Type of block (e.g., 'tabs', 'currency-rates', 'currency-calculator')
    content: BlockContent; // Block content
}

interface Section {
    blocks: Block[]; // List of blocks in the section
}

interface AgrobankExchangeRatesResponse {
    success: boolean;
    data: {
        code: string;
        sections: Section[];
    };
}

export async function getAgrobankExchangeRates(): Promise<CurrencyItem[]> {
    const myHeaders = new Headers();
    myHeaders.append(
        'Cookie',
        'PHPSESSID=UFNMeER7D9QL1L8M8THR0t5JHQUWu6Qx; cookiesession1=678B286A023DCC65D9E232C7FAE6A88A',
    );

    try {
        // Making the fetch request
        const response = await fetch(
            'https://agrobank.uz/api/v1/?action=pages&code=uz%2Fperson%2Fexchange_rates',
            { method: 'GET', headers: myHeaders, redirect: 'follow' },
        );

        // Checking if the response is ok
        if (!response.ok) {
            throw new Error(
                `Failed to fetch exchange rates, status: ${response.status}`,
            );
        }

        // Parsing the JSON response
        const result: AgrobankExchangeRatesResponse = await response.json();

        // Extracting the currency data
        const currencyItems = result.data.sections
            .flatMap((section) => section.blocks)
            .filter((block) => block.type === 'currency-rates')
            .map((block) => block.content.items)
            .flat();

        // Filtering for USD, EUR, and RUB
        const filteredRates = currencyItems.filter((item) =>
            ['USD', 'EUR', 'RUB'].includes(item.alpha3),
        );

        return filteredRates; // Return filtered rates
    } catch (error) {
        console.error('Error fetching data from Agrobank:', error);
    }
}

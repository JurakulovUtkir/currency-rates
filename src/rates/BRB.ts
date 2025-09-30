interface CurrencyData {
    code: string;
    icon: string;
    buy: number;
    sell: number;
    buy_change: number;
    sell_change: number;
}

interface CurrencyResponse {
    success: boolean;
    updated_at: string;
    data: CurrencyData[];
}

export async function getCurrencyRatesFromBrb(): Promise<CurrencyData[]> {
    const requestOptions: RequestInit = {
        method: 'GET',
        redirect: 'follow',
    };

    const url = 'https://brb.uz/api/currency/compare';

    try {
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.statusText}`);
        }

        const result: CurrencyResponse = await response.json();

        if (result.success) {
            return result.data;
        } else {
            throw new Error('Failed to fetch currency data successfully.');
        }
    } catch (error) {
        console.error('Error:', error);
        throw error; // Rethrow error for further handling
    }
}

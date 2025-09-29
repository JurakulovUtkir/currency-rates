interface CurrencyDetails {
    buy: number;
    sell: number;
}

interface CurrencyData {
    [key: string]: CurrencyDetails;
}

interface TengeBankResponse {
    date: string;
    personal: Array<{ date: string; currency: CurrencyData }>;
    legal: Array<{ date: string; currency: CurrencyData }>;
    atm: Array<{ date: string; currency: CurrencyData }>;
    tenge: Array<{ date: string; currency: CurrencyData }>;
    crossLegal: Array<{ date: string; currency: CurrencyData }>;
}

export async function fetchTengeBankRates(): Promise<TengeBankResponse> {
    const myHeaders = new Headers();
    myHeaders.append(
        'Cookie',
        '__ddg10_=1758789777; __ddg1_=LqocYEUCkADKbnDdtUNm; __ddg8_=Fwni8zn6z124TMKi; __ddg9_=213.230.78.70',
    );

    const requestOptions: RequestInit = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
    };

    const url = 'https://tengebank.uz/api/exchangerates/tables';

    try {
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch data from TengeBank: ${response.statusText}`,
            );
        }

        const result: TengeBankResponse = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching TengeBank rates:', error);
        throw error; // Rethrow the error for further handling
    }
}

// Example usage:
fetchTengeBankRates()
    .then((data) => {
        console.log('TengeBank Data:', data);
    })
    .catch((error) => {
        console.error('Error loading TengeBank rates:', error);
    });

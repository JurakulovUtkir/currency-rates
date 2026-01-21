export interface CallAuctionData {
    day: string;
    symbol: string;
    price: string;
    direction: boolean;
    change: string;
}

export interface CallAuctionResponse {
    status: string;
    message: string;
    data: CallAuctionData;
}

export interface ApiResult {
    success: boolean;
    response?: CallAuctionResponse;
    error?: string;
}

export async function getCallAuctionInfo(): Promise<ApiResult> {
    try {
        const requestOptions: RequestInit = {
            method: 'GET',
            redirect: 'follow',
        };

        const response = await fetch(
            'https://uzrvb.uz/GetCallAuctionInfo.php',
            requestOptions,
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: CallAuctionResponse = await response.json();

        return {
            success: true,
            response: result,
            error: undefined,
        };
    } catch (error) {
        return {
            success: false,
            response: undefined,
            error:
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred',
        };
    }
}

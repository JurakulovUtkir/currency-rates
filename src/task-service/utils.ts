import { CbuRate } from 'src/rates/cbu';

/**
 * Interface for official exchange rate with difference
 */
interface OfficialRate {
    rate: string;
    diff: string;
}

/**
 * Interface for market currency with buy/sell rates
 */
interface MarketCurrency {
    buy: number;
    sell: number;
}

/**
 * Interface for USD which has both market and official rates
 */
interface UsdCurrency extends MarketCurrency {
    official: string;
    diff: string;
}

/**
 * Interface for EUR which only has official rates
 */
interface EurCurrency {
    official: string;
    diff: string;
}

/**
 * Interface for all official rates
 */
interface OfficialRates {
    RUB: OfficialRate;
    KZT: OfficialRate;
    TRY: OfficialRate;
    CNY: OfficialRate;
}

/**
 * Main interface for currency data
 */
export interface CurrencyData {
    date: Date;
    usd: UsdCurrency;
    rub: MarketCurrency;
    eur: EurCurrency;
    officialRates: OfficialRates;
}

export interface RequiredCurrencies {
    USD: CbuRate;
    EUR: CbuRate;
    RUB: CbuRate;
    KZT: CbuRate;
    TRY: CbuRate;
    CNY: CbuRate;
}

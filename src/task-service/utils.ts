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

export const Translations = {
    uz: {
        caption_kurs: 'holatiga banklarda AQSh dollari kursi',
        caption_bank:
            "Izoh: Bankka borishdan avval bankning sayti orqali tekshiring. O'zgarish bo'lishi mumkin",
        caption_bank_websites: 'Banklar sayti',
        best_caption_kurs: 'holatiga ENG QULAY kurslar',
    },
    kril: {
        caption_kurs: 'ҳолатига банкларда АҚШ доллари курси',
        caption_bank:
            'Изоҳ: Банкка боришдан аввал банкнинг сайти орқали текширинг. Ўзгариш бўлиши мумкин',
        caption_bank_websites: 'Банклар сайти',
        best_caption_kurs: 'ҳолатига ЭНГ ҚУЛАЙ курслар',
    },
};

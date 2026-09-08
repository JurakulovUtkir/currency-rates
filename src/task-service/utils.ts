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

/** CBU rasmiy kursi rasmi uchun bitta valyuta qatori */
export interface CbuScreenRate {
    currency: string;
    rate: number;
    /** o'zgarish, doim musbat — ishora `direction` da */
    change: number;
    direction: 'up' | 'down' | 'same';
}

/** CBU dan olingan YANGI (kelgusi sanaga amal qiladigan) kurslar */
export interface CbuFreshRates {
    /** CBU bergan sana, 'DD.MM.YYYY' — shu kundan amal qiladi */
    effectiveDate: string;
    rates: CbuScreenRate[];
}

export const Translations = {
    uz: {
        caption_kurs: 'holatiga banklarda AQSh dollari kursi',
        caption_bank:
            "Izoh: Bankka borishdan avval bankning sayti orqali tekshiring. O'zgarish bo'lishi mumkin",
        caption_bank_websites: 'Banklar sayti',
        best_caption_kurs: 'holatiga ENG QULAY kurslar',
        screen_title: 'Dollarning rasmiy kursi',
        up: "ko'tarildi",
        down: 'tushdi',
        same: "o'zgarmadi",
        effective_from: 'dan amal qiladi',
    },
    kril: {
        caption_kurs: 'ҳолатига банкларда АҚШ доллари курси',
        caption_bank:
            'Изоҳ: Банкка боришдан аввал банкнинг сайти орқали текширинг. Ўзгариш бўлиши мумкин',
        caption_bank_websites: 'Банклар сайти',
        best_caption_kurs: 'ҳолатига ЭНГ ҚУЛАЙ курслар',
        screen_title: 'Долларнинг расмий курси',
        up: 'кўтарилди',
        down: 'тушди',
        same: 'ўзгармади',
        effective_from: 'дан амал қилади',
    },
};

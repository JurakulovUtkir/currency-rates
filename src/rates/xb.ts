// xb.ts — XALQ BANKI (xb.uz)
//
// Ilgari bu scraper puppeteer bilan sahifani ochib, hidratsiyadan keyin
// DOM'dan o'qirdi. Sayt Next.js'da qayta yozilgani uchun bu og'ir va
// ishonchsiz edi — prodda muntazam `net::ERR_TIMED_OUT` berardi.
//
// Sahifaning o'zi kurslarni quyidagi API'dan oladi, shuning uchun to'g'ridan
// to'g'ri o'shani so'raymiz: brauzer ham, hidratsiyani kutish ham kerak emas.

export type OfficeRate = { sell: number | null; buy: number | null };
export type Office = Record<string, OfficeRate>;

/** API javobining kalitlari — valyutaning raqamli (ISO 4217) kodlari */
const CODE_TO_CCY: Record<string, string> = {
    '840': 'USD',
    '978': 'EUR',
    '643': 'RUB',
    '398': 'KZT',
};

type DayRate = { selling?: string | null; buying?: string | null };
type ApiCurrency = { data?: Record<string, DayRate> };

const toNum = (t?: string | null): number | null => {
    if (t == null) return null;
    const n = Number(String(t).replace(/\s+/g, '').replace(',', '.').trim());
    // Kurs 0 yoki manfiy bo'lishi mumkin emas — bunday qiymat ma'lumot
    // yo'qligini bildiradi, bazaga 0 yozib qo'ymaymiz.
    return Number.isFinite(n) && n > 0 ? n : null;
};

/** 'DD-MM-YYYY' -> solishtirish uchun 'YYYYMMDD' */
const dateKey = (d: string): string | null => {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(d.trim());
    return m ? `${m[3]}${m[2]}${m[1]}` : null;
};

export async function fetchXbuzOfficeRates(): Promise<{
    bank: 'XB.UZ';
    source: string;
    fetchedAt: string;
    office: Office;
}> {
    const source =
        'https://xb.uz/api/v1/external/client/exchange-rate/last-thirty-day?_f=json&_l=uz&include=files&sort=sort';

    const res = await fetch(source, {
        headers: {
            accept: 'application/json',
            'user-agent': 'Mozilla/5.0 (compatible; RatesBot/1.0)',
        },
    });
    if (!res.ok) throw new Error(`XB.UZ: HTTP ${res.status}`);

    const json = (await res.json()) as Record<string, ApiCurrency>;

    const office: Office = {};

    for (const [code, ccy] of Object.entries(CODE_TO_CCY)) {
        const byDate = json?.[code]?.data;
        if (!byDate) continue;

        // API oxirgi 30 kunni qaytaradi; bizga eng so'nggi sana kerak.
        // Kalitlar tartibiga ishonmaymiz, sanani o'zi bo'yicha tanlaymiz.
        let latest: { key: string; rate: DayRate } | null = null;
        for (const [day, rate] of Object.entries(byDate)) {
            const k = dateKey(day);
            if (!k) continue;
            if (!latest || k > latest.key) latest = { key: k, rate };
        }
        if (!latest) continue;

        office[ccy] = {
            sell: toNum(latest.rate.selling),
            buy: toNum(latest.rate.buying),
        };
    }

    // Bo'sh natijani jimgina qaytarish eng yomon holat: loader uni saqlaydi,
    // log "muvaffaqiyat" deb yozadi, bank esa rasmdan bildirmay yo'qoladi.
    if (Object.keys(office).length === 0) {
        throw new Error(
            'XB.UZ: API dan birorta ham valyuta o\'qilmadi — javob tuzilishi o\'zgargan bo\'lishi mumkin',
        );
    }

    return {
        bank: 'XB.UZ',
        source,
        fetchedAt: new Date().toISOString(),
        office,
    };
}

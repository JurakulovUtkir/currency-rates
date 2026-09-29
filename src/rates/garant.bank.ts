// src/rates/garantbank.ts
import { load } from 'cheerio';

type Pair = { buy: number | null; sell: number | null };
type Office = Record<
    'usd' | 'eur' | 'gbp' | 'rub' | 'chf' | 'jpy' | 'cny',
    Pair
>;

export async function fetchGarantbankOfficeRates() {
    const source = 'https://garantbank.uz/uz/exchange-rates';
    const res = await fetch(source, {
        headers: {
            'user-agent': 'Mozilla/5.0 (compatible; RatesBot/1.0)',
            'accept-language': 'uz,en;q=0.9,ru;q=0.8',
        },
    });
    if (!res.ok) throw new Error(`GARANTBANK: HTTP ${res.status}`);
    const html = await res.text();
    const $ = load(html);

    const currencies = [
        'USD',
        'EUR',
        'GBP',
        'RUB',
        'CHF',
        'JPY',
        'CNY',
    ] as const;
    const key = (c: (typeof currencies)[number]) =>
        c.toLowerCase() as keyof Office;
    const num = (s: string | undefined): number | null => {
        const t = (s ?? '').replace(/\s+/g, '').replace(',', '.').trim();
        if (!t) return null;
        const n = Number(t);
        // Kurs 0 yoki manfiy bo'lishi mumkin emas — bazaga 0 yozib
        // qo'ymaymiz, bunday qiymat "ma'lumot yo'q" degani.
        return Number.isFinite(n) && n > 0 ? n : null;
    };

    const office: Partial<Office> = {};

    // Sayt markup'i 2026-09 da o'zgardi: avvalgi <table> + .exchange-currency
    // / .exchange-purchase / .exchange-sale klasslari butunlay yo'qoldi va
    // ularning o'rniga div'lar keldi. Eski selektorlar hech narsa topmasdi,
    // scraper esa xato bermay bo'sh natija qaytarardi.
    //
    // Yangi tuzilish:
    //   <div class="exchange-table-item" data-ccy="USD"
    //        data-buy="11755" data-sell="11855"> ...
    //     <div class="exchange-table-item-num">11 806.97</div>  <- MB kursi
    //     <div class="exchange-table-item-num">11 755</div>     <- xarid
    //     <div class="exchange-table-item-num">11 855</div>     <- sotish
    //   </div>
    //
    // MUHIM: sahifada uchta tab bor — "Kassada", "Ilovada", "Bankomatda" —
    // va ularning kurslari har xil. Hammasi bitta HTML ichida keladi, ya'ni
    // `.exchange-table-item` ni to'g'ridan-to'g'ri olsak uchala tab aralashib
    // ketadi. Bizga kassadagi (ofis) kurs kerak.
    const KASSA_TAB_LABEL = 'kassada';

    let $panel = $();
    $('button[role="tab"]').each((_, el) => {
        const $btn = $(el);
        if ($btn.text().trim().toLowerCase() !== KASSA_TAB_LABEL) return;
        const target = $btn.attr('aria-controls');
        if (target) $panel = $(`#${target}`);
    });

    // Zaxira variantlar: tanlangan tab, so'ng ochiq panel, so'ng birinchisi.
    if ($panel.length === 0) {
        const selected = $('button[role="tab"][aria-selected="true"]')
            .first()
            .attr('aria-controls');
        if (selected) $panel = $(`#${selected}`);
    }
    if ($panel.length === 0) $panel = $('.exchange-tab-item.open').first();
    if ($panel.length === 0) $panel = $('.exchange-table').first();

    $panel.find('.exchange-table-item').each((_, el) => {
        const $el = $(el);
        const code = ($el.attr('data-ccy') ?? '').trim().toUpperCase();
        if (!currencies.includes(code as any)) return;

        // data-* atributlari asosiy manba; yo'q bo'lsa ustunlardagi
        // raqamlarga qaytamiz (0 - MB kursi, 1 - xarid, 2 - sotish).
        const cols = $el
            .find('.exchange-table-item-num')
            .map((__, n) => $(n).text())
            .get();

        const buy = num($el.attr('data-buy')) ?? num(cols[1]);
        const sell = num($el.attr('data-sell')) ?? num(cols[2]);

        office[key(code as any)] = { buy, sell };
    });

    // Hech narsa topilmasa bu "bank kurs e'lon qilmadi" emas, balki markup
    // yana o'zgargani degani. Jim o'tkazib yuborilsa, bank rasmdan
    // bildirmay yo'qoladi — shuning uchun xato tashlaymiz.
    if (Object.keys(office).length === 0) {
        throw new Error(
            'GARANTBANK: sahifadan birorta ham valyuta o\'qilmadi — markup o\'zgargan bo\'lishi mumkin',
        );
    }

    // Ensure all currencies present
    const ensured = Object.fromEntries(
        currencies.map((c) => {
            const k = key(c);
            return [k, office[k] ?? { buy: null, sell: null }];
        }),
    ) as Office;

    return {
        bank: 'GARANTBANK',
        source,
        fetchedAt: new Date().toISOString(),
        office: ensured,
    } as const;
}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Buyruqlar

```bash
yarn start:dev              # watch rejimida ishga tushirish
yarn build                  # rimraf dist + nest build
yarn start:prod             # node dist/main
yarn lint                   # eslint --fix
yarn format                 # prettier
npx tsc -p tsconfig.build.json --noEmit   # tez typecheck (build'siz)
```

Testlar sozlangan (jest, `.spec.ts`), lekin haqiqiy test yozilmagan —
`questions/*.spec.ts` faqat skelet. Bitta testni ishga tushirish:
`npx jest src/path/to/file.spec.ts -t "test nomi"`.

Bitta scraper'ni yoki servis metodini alohida sinash uchun ts-node ishlating —
Nest'ni butunlay ko'tarish shart emas:

```bash
npx ts-node -r tsconfig-paths/register <script>.ts
```

`TaskServiceService` ni `new (TaskServiceService as any)(null, null)` bilan
yaratib, private metodlarni `svc: any` orqali chaqirsa bo'ladi — DB va bot
faqat post yuborishda kerak bo'ladi.

## Arxitektura

Bu **NestJS'da yozilgan Telegram bot** — HTTP API emas. `app.module.ts` da
`UsersModule`, `AuthModule`, `QuestionsModule` va h.k. **ataylab comment
qilingan**: ular "genix" shablonidan qolgan o'lik kod. Faqat `BotModule` va
`TaskServiceModule` tirik. HTTP port faqat Swagger (`/api`) uchun ochiladi.

Uchta qism bitta process ichida:

1. **`task-service/task-service.service.ts`** — loyihaning yuragi (~2400 qator).
   Barcha cronlar, 20 ta `loading_<bank>()` metodi, xabar formatlash.
2. **`bot/scenes/admin/`** — admin panel: parol → bank → valyuta → buy/sell
   qo'lda tahrirlash.
3. **`rates/`** — har bir bank uchun alohida scraper fayl.

### Ma'lumot oqimi

```
cron → loading_banks() → 19 ta scraper parallel (Promise.allSettled)
     → har biri (bank, currency) bo'yicha upsert: findOneBy → update yoki save
     → ratesRepository.find({ currency: USD })
     → canvas orqali PNG → bot.telegram.sendPhoto → fs.unlink
```

**`rates` jadvali — bitta bank+valyuta uchun bitta qator.** Tarix saqlanmaydi,
har safar ustiga yoziladi. `synchronize: true`, migration yo'q.

### Cronlar (barchasi `Asia/Tashkent`)

| Vaqt | Kunlar | Nima |
|---|---|---|
| 08:00 | har kuni | Matnli post (bozor + rasmiy kurs) |
| 09:20 | Du–Ju | Rasm + Best-5 rasm |
| 14:10 | Du–Ju | Rasm (Best-5 siz) |
| 16:10 | Du–Ju | CBU rasmiy kursi (kutuvchi — pastga qarang) |
| har soat | har kuni | `every_30_seconds()` — nomi yolg'on, aslida `EVERY_HOUR` |

Kanal ID'lari `task-service.service.ts` da hardcoded (`test_channel_id`,
`dollrkurs_uzb_channel_id`, `dollrkurs_channel_id`).

⚠️ **Soatlik cron — DB'ni yangilab turadigan yagona doimiy mexanizm.** 08:00
dagi matnli post `loading_banks()` ni chaqirmaydi, DB'dan o'qiydi. Soatlik
cronni o'chirsangiz, 08:00 posti eskirgan ma'lumot bilan ketadi.

## CBU rasmiy kursi — muhim qoidalar

Bu qism bir marta prodda xato ma'lumot chiqargan, shuning uchun alohida
diqqat talab qiladi.

**CBU kursni oldingi ish kuni tushdan keyin e'lon qiladi, u ertasi kundan
amal qiladi.** Juma kuni e'lon qilinadigan kurs — dushanbaniki;
shanba/yakshanbaga alohida kurs belgilanmaydi.

**Arxiv API kelajakdagi sana so'ralganda xato qaytarmaydi — oxirgi mavjud
kursni beradi.** Shuning uchun `Date` maydonini har doim tekshirish shart:

```
GET https://cbu.uz/uz/arkhiv-kursov-valyut/json/          → joriy kurs
GET https://cbu.uz/uz/arkhiv-kursov-valyut/json/all/<YYYY-MM-DD>/
GET https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/<YYYY-MM-DD>/
```

16:10 croni **darhol post qilmaydi**: `waitForNextCbuRates()` API'dagi `Date`
bugungidan keyingi sanaga o'zgarguncha har 5 daqiqada tekshirib kutadi
(5 soatgacha). Chiqmasa — umuman post qilmaydi. Eski kursni yangi deb
yuborgandan ko'ra hech narsa yubormagan yaxshi.

Kutish davomida `pm2 restart` qilinsa, o'sha kunlik post yo'qoladi.

`cbu.uz` bosh sahifasidagi widget'ni **scrape qilmang** — u ayni damda amal
qilayotgan kursni ko'rsatadi va aynan shu xatoga olib kelgan edi.

## Yangi bank qo'shish

1. `src/rates/<bank>.ts` — scraper yozing (axios+cheerio, undici yoki
   puppeteer — saytga qarab).
2. `src/rates/utils/enums.ts` — `Bank` enum'ga qo'shing. **Enum qiymati
   rasmda ko'rinadigan matn**, shuning uchun o'zbekcha nom yozing
   (masalan `XBUZ = 'XALQ BANKI'`).
3. `task-service.service.ts` — `loading_<bank>()` metodi (mavjudlaridan
   nusxa oling, upsert namunasi bir xil).
4. `loading_banks()` ichidagi ro'yxatga qo'shing — **aks holda metod yozilib
   ham hech qachon chaqirilmaydi** (hozir `loading_mkbank()` shu holatda).

⚠️ Bankni ro'yxatdan olib tashlash yetarli emas: uning eski qatori `rates`
jadvalida qolib, rasmga tushaverdi. Kodda hech qanday DELETE yo'q.

## Rasm generatorlari

Faol ikkitasi (`node-canvas`):
- `rates/utils/enhanced_currency_generator.ts` — asosiy rasm (barcha banklar)
- `rates/utils/best-5.ts` — eng qulay 5 kurs

`image-generator.ts` va `enhanced_image_generator.ts` — o'lik, import
qilinmaydi.

Temalar: `light` (default), `dark` (`@dollar_kurs_uzb`), `kommers`.

⚠️ `canvas` paketi `package.json` da **deklaratsiya qilinmagan** — faqat
`text-to-image` orqali tranzitiv keladi.

## Deploy

Prod **Docker emas, pm2**: `root@5.182.26.114:/var/davo/currency-rates`,
process nomi `@currency-bot`.

```bash
cd /var/davo/currency-rates && git pull && yarn build && pm2 restart @currency-bot
pm2 logs @currency-bot --lines 50 --nostream
```

Serverda `package.json`/`yarn.lock` da commit qilinmagan puppeteer versiya
farqi bor — `git pull` unga tegmaydi.

Repodagi `Dockerfile`/`docker-compose.yml` hozir ishlatilmaydi. Docker'ga
o'tilsa, runner bosqichiga `apk add chromium` qo'shish kerak — hozir yo'q,
puppeteer ishlamaydi.

## Uslub

- Foydalanuvchiga ko'rinadigan barcha matn **o'zbekcha** (lotin) yoki
  **kirilcha** bo'lishi kerak. Ikkalasi `task-service/utils.ts` dagi
  `Translations` ob'ektida: `uz` va `kril` kalitlari.
- Yangi caption matni qo'shsangiz, **ikkala tilga ham** qo'shing.
- Bot scene'laridagi ba'zi matnlar hali inglizcha — bu qarz, namuna emas.

## Bilib qo'yish kerak

- `uzrvb.uz/GetCallAuctionInfo.php` — **o'lik**, `07.10.2025` sanasida qotib
  qolgan. `send_pragnoz_call_auction()` shuning uchun o'chirilgan.
- `nbu.uz` vaqti-vaqti bilan `ECONNRESET` beradi. `Promise.allSettled` uni
  jim yutadi va eski NBU kursi rasmda qolaveradi.
- `every_minutes()` da `best5.filePath` **o'chirilmaydi** — `images/` papkasi
  asta-sekin to'ladi.
- `admin.menu.ts` da spinner `frames` ni `this.` siz ishlatadi; TypeScript uni
  DOM'ning `window.frames` deb qabul qiladi, Node'da esa `ReferenceError`
  bo'lib `try/catch` da jim yutiladi.
- `(bank, currency)` juftligida unique constraint yo'q — upsert qo'lda
  qilinadi, parallel yozuvda dublikat xavfi bor.
- Admin paroli `password.scene.ts` da hardcoded.

To'liqroq tahlil: `LOYIHA-HUJJATI.md`.

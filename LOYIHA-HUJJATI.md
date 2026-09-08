# Valyuta Kurslari — Loyiha hujjati

> Holat: 2026-09-08 · Branch: `main` · Oxirgi commit: `596d33c`

---

## 1. Loyiha nima qiladi

O'zbekiston banklaridagi valyuta kurslarini (USD / EUR / RUB) avtomatik
yig'adi, PostgreSQL'ga yozadi, ulardan rasm (canvas) generatsiya qiladi va
belgilangan vaqtlarda Telegram kanallarga post qiladi. Qo'shimcha ravishda
CBU (Markaziy bank) kursidan screenshot va O'zRVB (uzrvb.uz) prognozini
yuboradi.

Bitta NestJS process ichida uchta narsa yashaydi:

| Qism | Vazifasi |
|---|---|
| **Cron (TaskService)** | Scraping + rasm yasash + kanalga yuborish |
| **Telegram bot (Telegraf)** | Admin panel — kursni qo'lda tahrirlash |
| **HTTP (Nest)** | Faqat Swagger (`/api`), biznes endpointlari o'chirilgan |

---

## 2. Texnologiyalar

- **NestJS 11** + TypeScript 4.7 (`commonjs`, target ES2021)
- **TypeORM 0.3** + PostgreSQL 16 (`synchronize: true` — migration yo'q)
- **nestjs-telegraf 2.6** / Telegraf 4 (bot nomi: `bot`)
- **@nestjs/schedule** — barcha cronlar `Asia/Tashkent` timezone'da
- **Scraping:** `axios` + `cheerio`, `undici` fetch, native `fetch`, `puppeteer`
- **Rasm:** `canvas` (node-canvas) — 2D chizish
- **Docker** — multi-stage Alpine build

---

## 3. Papka tuzilishi

```
src/
├── main.ts                     # bootstrap, CORS, /v1 versioning, Swagger /api
├── app.module.ts               # TypeORM + Telegraf forRoot, BotModule, TaskServiceModule
│
├── task-service/               # ★ LOYIHANING YURAGI
│   ├── task-service.service.ts # 2405 qator: cronlar + 20 ta loading_* + xabar formatlash
│   └── utils.ts                # CurrencyData interfeyslari + Translations (uz / kril)
│
├── rates/                      # har bir bank uchun alohida scraper
│   ├── cbu.ts, nbu.ts, sqb.ts, tbc.ts, ...  (23 ta fayl)
│   └── utils/
│       ├── enums.ts                      # Currency, Bank enumlari
│       ├── enhanced_currency_generator.ts # ASOSIY rasm (barcha banklar)
│       ├── best-5.ts                      # "ENG QULAY 5 kurs" rasmi
│       ├── image-generator.ts             # ishlatilmaydi (eski)
│       └── enhanced_image_generator.ts    # ishlatilmaydi (eski)
│
├── bot/
│   ├── bot.module.ts
│   ├── scenes/app.update.ts              # /start → user saqlash → PASSWORD scene
│   ├── scenes/admin/password.scene.ts    # parol: "admin" (hardcoded)
│   └── scenes/admin/admin.menu.ts        # bank → valyuta → buy/sell tahrirlash
│
├── users/entities/rates.entity.ts        # ★ ishlatiladigan yagona entity (Rate)
├── users/entities/user.entity.ts         # bot foydalanuvchilari
│
└── auth/ users/ questions/ subjects/     # ⚠️ O'LIK KOD — "genix" shablonidan qolgan,
    question-types/ file-system/ channels/    app.module.ts da comment qilingan
```

---

## 4. Ma'lumotlar oqimi

```
Cron ishga tushadi
   ↓
loading_banks()                     ← Promise.allSettled, 19 ta bank parallel
   ↓  har bir loading_<bank>():
   ↓     scraper chaqiriladi → (bank, currency) bo'yicha DB'da qidiriladi
   ↓     bor bo'lsa UPDATE, yo'q bo'lsa INSERT   (upsert, DELETE yo'q!)
   ↓
ratesRepository.find({ currency: USD })
   ↓
generateRatesImageAllCurrencies()   → images/rates-all-<ts>.png
generateBestRatesImage()            → images/best-rates-<ts>.png
   ↓
bot.telegram.sendPhoto(chatId, caption HTML)
   ↓
fs.unlink(filePath)                 ← faqat asosiy rasm o'chiriladi
```

---

## 5. Cron jadvali

Barchasi `Asia/Tashkent`. Kanal ID'lari `task-service.service.ts:65-67` da hardcoded.

| Vaqt | Kunlar | Metod | Nima yuboriladi | Qayerga |
|---|---|---|---|---|
| **08:00** | har kuni | `every_day_at_8am` | Matn: bozor + rasmiy kurslar | kril → `dollar_kurs_uzb`, latin → `dollrkurs`, latin → test |
| **09:20** | Du–Ju | `every_day_at_9am_plus20` | Rasm (barcha banklar) + Best-5 rasm, caption "9:00" | `dollar_kurs_uzb` (dark), `dollrkurs` (light) |
| **14:10** | Du–Ju | `every_day_at_14_10` | Rasm (barcha banklar), caption "14:00", Best-5 YO'Q | `dollar_kurs_uzb` (dark), `dollrkurs` (light) |
| **16:10** | Du–Ju | `every_day_at_4pm_plus10` | CBU rasmiy kursi — **yangi kurs chiqishini kutadi** (7-bo'lim) | test, `dollar_kurs_uzb`, `dollrkurs` |
| **har soatda** | har kuni | `every_30_seconds` ⚠️ | Rasm + 2 ta matn (3 ta post) | **faqat test kanal** |

**Kanallar:**
- `test_channel_id = -1001311323927` → `@our_testing_channel_spprt`
- `dollrkurs_uzb_channel_id = -1002929234941` → `@dollar_kurs_uzb` (kiril)
- `dollrkurs_channel_id = -1001417795097` → `@dollrkurs` (lotin)

> Diqqat: `every_30_seconds` nomi yolg'on — u aslida `EVERY_HOUR`. Va bu
> **DB'ni yangilab turadigan yagona doimiy cron**. 08:00 dagi matnli post
> `loading_banks()` ni chaqirmaydi — u DB'dan o'qiydi, ya'ni soatlik cron
> o'chsa, 08:00 posti eski ma'lumot bilan ketadi.
>
> Shu cronda ilgari `send_pragnoz_call_auction()` ham bor edi — manba o'lik
> bo'lgani uchun o'chirildi (12-bo'lim, J bandi).

---

## 6. Banklar va scraping usullari

**Faol (19 ta, `loading_banks()` ichida):**

| Bank | Usul | Manba |
|---|---|---|
| MARKAZIY BANK | fetch JSON | `cbu.uz/uz/arkhiv-kursov-valyut/json/` |
| ALOQABANK | axios + cheerio | `aloqabank.uz/uz/` |
| ANORBANK | axios + cheerio | `anorbank.uz/uz/about/exchange-rates/` |
| DAVRBANK | axios + cheerio | `davrbank.uz/uz/exchange-rate` |
| GARANTBANK | cheerio | `garantbank.uz/uz/exchange-rates` |
| KDB BANK | axios + cheerio | `kdb.uz/en/interactive-services/exchange-rates` |
| MILLIY BANK (NBU) | axios + cheerio | `nbu.uz/jismoniy-shaxslar-valyutalar-kursi` |
| OCTOBANK | axios + cheerio | `octobank.uz/uz/interaktiv-xizmatlar/kurs-valyut` |
| POYTAXTBANK | axios + cheerio | `poytaxtbank.uz/uz/services/exchange-rates/` |
| AGROBANK | JSON API | `agrobank.uz/api/v1/?action=pages...` |
| ASAKABANK | axios (JSON) | `back.asakabank.uz/core/v1` |
| TENGEBANK | JSON API | `tengebank.uz/api/exchangerates/tables` |
| HAYOTBANK | JSON API | `api.hayotbank.uz/api/curr-exchange-rate/get-all` |
| HAMKORBANK | JSON API | `api-dbo.hamkorbank.uz/webflow/v1/exchanges` |
| INFINBANK | undici + cheerio | `infinbank.com/en/private/exchange-rates/` |
| IPAKYO'LI BANK | undici fetch | `en.ipakyulibank.uz/physical/exchange-rates` |
| **TBCBANK** | **puppeteer** | `tbcbank.uz/currencies/` |
| **XALQ BANKI** | **puppeteer** | `xb.uz/page/valyuta-ayirboshlash` |
| **SQB** | **puppeteer** | `sqb.uz/uz/individuals/exchange-money/` |

**Nofaol (kod bor, lekin chaqirilmaydi):**

| Bank | Holat |
|---|---|
| BRB | `loading_brb()` bor, `loading_banks()` da comment qilingan (`3ad3528`) |
| MKBANK | `loading_mkbank()` bor, **hech qayerdan chaqirilmaydi** |
| IPOTEKABANK | scraper (`ipotekabank.ts`) bor, `loading_*` metodi **umuman yo'q** |

**Boshqa manbalar:**
- `prognoz.ts` → `uzrvb.uz/GetCallAuctionInfo.php` (ertangi kurs prognozi)
- `pragnoz.ts` → puppeteer, `uzrvb.uz/oz/` (hozirda cron'dan chaqirilmaydi)

---

## 6a. CBU rasmiy kursi — e'lon qilish qoidalari

> Bu qism 2026-09-07 da prodda xato ma'lumot chiqargan, keyin tuzatilgan.
> Kurs bilan ishlashdan oldin o'qing.

**Asosiy qoida: CBU kursni oldingi ish kuni tushdan keyin e'lon qiladi, u
ertasi kundan amal qiladi.**

Arxiv API'dan olingan dalillar:

| So'ralgan sana | Qaytgan `Date` | USD | Diff |
|---|---|---|---|
| 03.09 (Pay) | 03.09.2026 | 11813.09 | −7.39 |
| 04.09 (Ju) | 04.09.2026 | 11795.00 | −18.09 |
| **05.09 (Sha)** | **04.09.2026** | 11795.00 | −18.09 |
| **06.09 (Yak)** | **04.09.2026** | 11795.00 | −18.09 |
| 07.09 (Du) | 07.09.2026 | 11785.30 | −9.70 |
| 08.09 (Se) | 08.09.2026 | 11789.33 | +4.03 |

Xulosalar:

1. **Dam olish kunlariga alohida kurs belgilanmaydi** — juma kursi
   shanba/yakshanbaga ham amal qiladi. Ya'ni **juma kuni e'lon qilinadigan
   kurs dushanbaniki**.
2. Bannerdagi "08.09.2026 **dan**" — "shu sanadan amal qiladi" degani.
3. ⚠️ **Kelajakdagi sana so'ralganda API xato bermaydi — oxirgi mavjud kursni
   qaytaradi.** Shuning uchun `Date` maydonini tekshirish **majburiy**.

### Endpointlar — farqi hal qiluvchi

| Endpoint | Nima qaytaradi |
|---|---|
| `json/` | **BUGUN amal qilayotgan** kurs. Faqat yarim tunda o'zgaradi. Ertangi kursni hech qachon ko'rsatmaydi. |
| `json/all/<YYYY-MM-DD>/` | O'sha kunga amal qiladigan kurs. **Yangi e'lon faqat shu yerda ko'rinadi.** |
| `json/USD/<YYYY-MM-DD>/` | Bitta valyuta uchun |

2026-09-08 da tekshirilgan: soat 18:05 da sayt banneri `09.09.2026` ni
(11813.21, +23.88) ko'rsatib turgan bir paytda `json/` hamon `08.09.2026`
qaytarardi, `json/all/2026-09-09/` esa yangi kursni bergan.

⚠️ Sanali endpoint ham kelajak sana yoki dam olish kuni so'ralganda xato
qaytarmaydi — oxirgi mavjud kursni beradi. `Date` ni tekshirish shart.

Juma kuni e'lon qilinadigan kurs dushanbaniki. Shanbani so'rasak API jumaning
kursini qaytaradi ("yangi emas"), shuning uchun kod keyingi **4 kunni**
ketma-ket sinab ko'radi — bayramlar ham shu tarzda o'tib ketiladi.

### 16:10 croni qanday ishlaydi

```
16:10 → waitForNextCbuRates()
          findNextPublishedCbuRates(): ertaga..+4 kun sanali endpointdan
          so'rab, Date bugungidan katta bo'lganini qidiradi
          topilmasa har 5 daqiqada qayta urinadi (5 soatgacha)
        ├─ chiqdi  → renderCbuImage() → 3 kanalga sendCbuImage()
        └─ chiqmadi → HECH NARSA post qilinmaydi
```

Caption'da kurs qaysi sanadan amal qilishi ko'rsatiladi:

```
🏛 Dollarning rasmiy kursi ko'tarildi
09.09.2026 dan amal qiladi

$ USD = 11789.33 (+4.03)  📈
```

Yo'nalish (`tushdi`/`ko'tarildi`) `Diff` ning ishorasidan olinadi.

> ❌ **`cbu.uz` bosh sahifasidagi widget'ni scrape qilmang.** U ayni damda
> amal qilayotgan kursni ko'rsatadi. 2026-09-07 da 16:10 da CBU hali
> 08.09 kursini chiqarmagan edi, widget 07.09 kursini (−9.70) ko'rsatdi va
> bot "kurs tushdi" deb post qildi — holbuki o'sha kuni kechqurun e'lon
> qilingan 08.09 kursi **+4.03 ga ko'tarilgan** edi.

> ⚠️ Kutish davomida `pm2 restart` qilinsa, o'sha kunlik post yo'qoladi.

---

## 7. Ma'lumotlar bazasi

`synchronize: true` — jadvallar entity'dan avtomatik yasaladi. **Migration yo'q.**

### `rates` (asosiy)
| Ustun | Tur | Izoh |
|---|---|---|
| `id` | uuid PK | |
| `currency` | varchar(3) | `usd` / `eur` / `rub` (kichik harf) |
| `bank` | varchar(128) | `Bank` enum qiymati, masalan `MARKAZIY BANK` |
| `sell`, `buy` | numeric, null | |
| `created_at`, `updated_at` | timestamptz | |

> ⚠️ `(bank, currency)` juftligida **unique constraint yo'q** — upsert qo'lda
> `findOneBy` + `update`/`save` orqali qilinadi. Parallel yozuvda dublikat
> paydo bo'lishi mumkin.

### `users`
Bot foydalanuvchilari: `chat_id`, `full_name`, `status`, `role`.
Boshqa entity'lar (`Channel`, `TelegramPost`) `forFeature` da ro'yxatdan
o'tgan, lekin ishlatilmaydi.

---

## 8. Rasm generatsiyasi

Ikkita faol generator, ikkalasi ham `node-canvas`:

**`enhanced_currency_generator.ts` → `generateRatesImageAllCurrencies()`**
- Kenglik 1000px, balandlik dinamik
- Valyuta bo'yicha guruhlaydi, CBU'ni alohida "chip" kartochkaga chiqaradi
- Qolgan banklar 2 ustunli grid (kartochka 440×96)
- Fayl: `images/rates-all-<timestamp>.png`

**`best-5.ts` → `generateBestRatesImage()`**
- CBU'ni chiqarib tashlaydi, eng yuqori `buy` va eng past `sell` bo'yicha
  TOP-5 bank
- Fayl: `images/best-rates-<timestamp>.png`

**Temalar:** `light` (default), `dark` (`@dollar_kurs_uzb` uchun), `kommers`.

`image-generator.ts` va `enhanced_image_generator.ts` — eski, hech qayerda
import qilinmaydi.

---

## 9. Telegram bot (admin panel)

```
/start
  → users jadvaliga yoziladi (yoki topiladi)
  → "Welcome <ism>"            ← ⚠️ inglizcha, o'zbekchalashtirilmagan
  → PASSWORD scene
       parol == "admin"        ← ⚠️ kodda hardcoded (password.scene.ts:7)
       → ADMIN_MENU scene
```

**ADMIN_MENU imkoniyatlari:**
1. Banklar ro'yxati (DB'dan `GROUP BY bank`)
2. Bank → valyutalar → hozirgi buy/sell ko'rish
3. `✏️ Edit Buy` / `✏️ Edit Sell` → yangi raqam yuborish → DB yangilanadi
4. `Hozirgi valyutalarni ko'rsatish` → `loading_banks()` + rasm yuborish
5. `📷 Rasm generatsiya qilish`

Bot xabarlari aralash: bir qismi o'zbekcha, bir qismi inglizcha
("Welcome to admin menu", "Please enter the admin password",
"Your code is wrong it seems you are not a admin").

---

## 10. Konfiguratsiya

`.env` (shablon: `.env.template`):

| O'zgaruvchi | Ishlatiladimi | Izoh |
|---|---|---|
| `PORT` | ✅ | hozir 3999 |
| `DB_HOST/PORT/USER/PASSWORD/NAME` | ✅ | |
| `BOT_TOKEN` | ✅ | |
| `CBU_PHPSESSID` | ○ | ixtiyoriy, `.env` da yo'q |
| `DEBUG_IPAKYULI` | ✅ | debug flag |
| `JWT_*`, `REDIS_*`, `CACHE_*` | ❌ | o'lik — auth moduli o'chirilgan |

---

## 11. Deploy

### Ishlab turgan prod (tekshirilgan: 2026-09-08)

**Docker EMAS — pm2.**

| | |
|---|---|
| Server | `5.182.26.114` (vps02364, Ubuntu 20.04) |
| Papka | `/var/davo/currency-rates` |
| Repo | `git@github.com:JurakulovUtkir/currency-rates.git` |
| pm2 nomi | `@currency-bot` (id 0), `fork_mode`, PID 2167 |
| Script | `dist/main.js` |
| Commit | `d69714e` (lokal bilan bir xil) |
| Uptime | 21 kun, restart 0 |
| Xotira | ~118 MB |

> ⚠️ Serverda commit qilinmagan o'zgarish bor: `M package.json`, `M yarn.lock`.
> Farq bitta qator — `puppeteer` `^24.24.0` → `^24.24.1`. Repoga tushmagan,
> keyingi `git pull` / `git checkout` da yo'qoladi.

**Puppeteer ishlayapti.** `~/.cache/puppeteer/` da `chrome` va
`chrome-headless-shell` bor, loglarda TBCBANK / SQB / XALQ BANKI muvaffaqiyatli
scrape bo'lyapti. Serverda tizim chromium'i o'rnatilmagan — puppeteer o'zining
yuklab olgan Chrome'idan foydalanadi.

### Docker fayllari (prodda ishlatilmaydi)

`Dockerfile` — 2 bosqichli Alpine build (node-canvas uchun `cairo/pango/...`
dev paketlari), `docker-compose.yml` — `rates` + `rates-postgres`.
Bular hozir ishlatilmayapti; ishlatmoqchi bo'lsangiz 12-bo'lim B bandiga
qarang.


## 12. Aniqlangan muammolar (muhimlik bo'yicha)

### ✅ Tuzatilgan (`596d33c`, 2026-09-08 da deploy qilingan)

| | Nima edi | Nima qilindi |
|---|---|---|
| CBU eski kursi | 16:10 da widget scrape qilinardi, CBU kechiksa eski kurs post bo'lardi | JSON API + `Date` tekshiruvi + yangi kurs chiqguncha kutish |
| Sana ko'rinmasdi | Caption'da kurs qaysi kundan amalda ekani yo'q edi | `09.09.2026 dan amal qiladi` qo'shildi |
| Mo'rt yo'nalish | `tushdi`/`ko'tarildi` CSS klassidan (`color_green`) olinardi | `Diff` ishorasidan olinadi, `o'zgarmadi` holati qo'shildi |
| 3× puppeteer | Har kanal uchun alohida brauzer ochilardi | Rasm bir marta yasaladi |
| O'lik prognoz | `uzrvb.uz` 07.10.2025 dagi ma'lumotni tarqatardi | Post o'chirildi (J bandi) |

### Ochiq muammolar


### 🔴 A. Eski (stale) kurslar hech qachon o'chirilmaydi
`loading_*` metodlari faqat UPDATE/INSERT qiladi. Agar:
- scraper xato bersa (`Promise.allSettled` — jim yutiladi), yoki
- bank `loading_banks()` dan olib tashlansa (BRB, MKBANK, TBC ilgari),

bu bankning **eski qiymati DB'da qoladi va rasmga tushaveradi** — go'yo
bugungi kursdek. `updated_at` ustuni bor, lekin generatorlar uni
tekshirmaydi. Natija: kanalga noto'g'ri kurs chiqishi mumkin.

**Prodda tasdiqlangan.** Server error-logida NBU uchun takrorlanuvchi
`ECONNRESET / socket hang up` (`nbu.uz/jismoniy-shaxslar-valyutalar-kursi`)
bor. Soatlik loglarni solishtirganda 11:00 da NBU yangilanmagan, 12:00 da
yangilangan. Ya'ni NBU yiqilgan soatlarda rasmda **eski NBU kursi** chiqadi va
buni hech kim sezmaydi.

**Yechim varianti:** rasm yasashdan oldin `updated_at > now() - interval 'N
soat'` bo'yicha filtr, yoki `loading_banks()` dan keyin eskirgan qatorlarni
o'chirish.

### 🟡 B. Docker image'da Chromium yo'q (prodga hozir ta'sir qilmaydi)
Runner bosqichida `ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` qo'yilgan,
lekin `apk add chromium` **qilinmagan**. Builder'dagi puppeteer yuklab olgan
Chrome esa `~/.cache/puppeteer` da qoladi va runner'ga ko'chirilmaydi
(qolaversa, glibc build Alpine/musl'da ishlamaydi).

Prod pm2'da ishlagani uchun hozir muammo yo'q — puppeteer normal ishlayapti.
Lekin **Docker'ga ko'chsangiz** TBCBANK, XALQ BANKI, SQB va 16:10 CBU
screenshot darhol yiqiladi.

**Yechim (Docker'ga o'tganda):** runner'ga `apk add --no-cache chromium nss
freetype harfbuzz ttf-freefont` qo'shish.

### 🟠 C. `best-rates-*.png` fayllari o'chirilmaydi
`every_minutes()` da faqat asosiy rasm `unlink` qilinadi
(`task-service.service.ts:256`), `best5.filePath` esa qolib ketadi.
Hozir lokalda 26 ta `best-rates-*.png` yig'ilib qolgan. Serverda disk
asta-sekin to'ladi.

### 🟠 D. `canvas` paketi `package.json` da yo'q
`best-5.ts`, `enhanced_currency_generator.ts` va boshqalar `canvas` dan
import qiladi, lekin u `dependencies` da yozilmagan — faqat `text-to-image`
ning tranzitiv bog'liqligi sifatida keladi (`yarn.lock`: `canvas@^3.1.0`).
Agar `text-to-image` olib tashlansa yoki versiyasi o'zgarsa, build sinadi.

Prodda ham `canvas` deklaratsiya qilinmagan — u yerda ham faqat tranzitiv
tarzda keladi. Ya'ni bu xatar hozir ham ochiq.

**Yechim:** `"canvas": "^3.1.0"` ni repodagi `dependencies` ga qo'shib commit
qilish (bir vaqtning o'zida serverdagi `puppeteer ^24.24.1` bump'ini ham
repoga kiritib, drift'ni yopish mumkin).

### 🟠 E. Har soatlik cron test kanalga 3 ta post tashlaydi
`every_30_seconds()` (aslida `EVERY_HOUR`) → rasm + 2 ta matn.
Ayni paytda bu **DB'ni yangilaydigan yagona muntazam cron**, shuning uchun
uni shunchaki o'chirib bo'lmaydi — avval alohida "faqat yangilash" croni
kerak.

### 🟡 F. `frames` o'zgaruvchisi `this.` siz ishlatilgan
`admin.menu.ts:363` — `frames[i++ % frames.length]`, lekin `frames` klass
maydoni. TypeScript uni DOM'ning `window.frames` deb qabul qiladi
(shuning uchun kompilyatsiya o'tadi), Node'da esa `ReferenceError`. Xato
`try/catch` ichida jim yutiladi → spinner animatsiya qilmaydi.

### 🟡 G. `(bank, currency)` da unique index yo'q
Upsert qo'lda `findOneBy` + `save` orqali. Bir vaqtda ikki `loading_banks()`
ishlasa (masalan 09:20 da ikki kanal uchun ketma-ket chaqiriladi + admin
tugmasi), dublikat qator paydo bo'lishi mumkin.

### 🟡 H. Admin paroli kodda ochiq: `"admin"`
`password.scene.ts:7`. `.env` ga chiqarish kerak.

### 🟡 I. 09:20 da `loading_banks()` ikki marta ishlaydi
Har bir kanal uchun alohida `every_minutes()` chaqiriladi, har biri o'z
scraping'ini qiladi — ~19 ta sayt 2 marta so'raladi.

### 🟡 J. `uzrvb.uz` prognoz endpointi o'lik
`https://uzrvb.uz/GetCallAuctionInfo.php` `07.10.2025` sanasidagi ma'lumotni
qaytarib qotib qolgan (`price: "12 040,00"`, bugungi kurs ~11789). Kod
`data.day` ni hech qachon tekshirmasdi.

Hozircha `every_30_seconds()` dan post o'chirilgan (`send_pragnoz_call_auction`
metodi kodda qoldi). Manba tiklansa yoki boshqa manba topilsa qayta yoqiladi —
lekin **`data.day` bugungi/ertangi sana ekani tekshirilgandan keyin**.

### ⚪ K. Tozalash kerak bo'lgan narsalar
- `auth/`, `users/` (controller/service), `questions/`, `subjects/`,
  `question-types/`, `file-system/`, `channels/` — o'lik modullar
- `image-generator.ts`, `enhanced_image_generator.ts` — ishlatilmaydi
- `debug_uzrvb.html` (71 KB) — repoda qolgan debug fayl
- `pragnoz.ts` va `prognoz.ts` — chalkash nomlar
- `package.json` da `"name": "genix"`
- `dist/` papkasi repoda commit qilingan holda turibdi

---

## 13. Tez ma'lumotnoma

```bash
# lokalda ishga tushirish
yarn install
yarn start:dev

# build
yarn build && yarn start:prod

# docker
docker compose up -d --build
docker compose logs -f rates
```

Muhim fayllar:
- Claude Code uchun qisqa yo'riqnoma: `CLAUDE.md`
- Cron va biznes-logika: `src/task-service/task-service.service.ts`
- CBU kutuvchisi: `waitForNextCbuRates()` / `renderCbuImage()` / `sendCbuImage()`
- Kanal ID'lari: `src/task-service/task-service.service.ts:65-67`
- Matn tarjimalari: `src/task-service/utils.ts:65`
- Bank ro'yxati: `src/rates/utils/enums.ts`
- Faol banklar: `src/task-service/task-service.service.ts:1050`

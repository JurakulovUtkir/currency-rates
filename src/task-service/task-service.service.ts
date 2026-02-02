import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { InjectBot } from 'nestjs-telegraf';
import * as path from 'path';
import { Context } from 'src/bot/context/context';
import { getAgrobankExchangeRates } from 'src/rates/agrobank';
import { getAlokabankExchangeRates } from 'src/rates/aloqabank';
import { getExchangeRatesFromAnorbank } from 'src/rates/anorbank';
import { fetchAsakaCurrencyListAxios } from 'src/rates/asakabank';
import { getCurrencyRatesFromBrb } from 'src/rates/BRB';
import { CbuRate, fetchCbuRates } from 'src/rates/cbu';
import { getDavrbankRates } from 'src/rates/davrbank';
import { fetchGarantbankOfficeRates } from 'src/rates/garant.bank';
import { fetchHamkorbankRates } from 'src/rates/hamkorbank';
import { fetchHayotBankRates } from 'src/rates/hayotbank';
import { fetchInfinbankOfficeRates } from 'src/rates/infinbank';
import { fetchIpakyuliUsdEurRub } from 'src/rates/ipakyuli.bank';
import { getKdbExchangeRates } from 'src/rates/kdb.bank';
import { fetchMkbankOfficeRates } from 'src/rates/mkbank';
import { getNbuExchangeRates } from 'src/rates/nbu';
import { getOctobankRates } from 'src/rates/octobank';
import { getExchangeRates } from 'src/rates/poytaxtbank';
import { CentralBankRate, getCentralBankRate } from 'src/rates/pragnoz';
import { getCallAuctionInfo } from 'src/rates/prognoz';
import { fetchSqbExchangeRates } from 'src/rates/sqb';
import { fetchTbcBankOfficeRates } from 'src/rates/TBC';
import { fetchTengeBankRates } from 'src/rates/tengebank';
import { generateBestRatesImage } from 'src/rates/utils/best-5';
import { generateRatesImageAllCurrencies } from 'src/rates/utils/enhanced_currency_generator';
import { Bank, Currency } from 'src/rates/utils/enums';
import { fetchXbuzOfficeRatesPptr } from 'src/rates/xb';
import { Rate } from 'src/users/entities/rates.entity';
import { Telegraf } from 'telegraf';
import { In, Not, Repository } from 'typeorm';
import { CurrencyData, RequiredCurrencies } from './utils';

dotenv.config();
// const execPromise = promisify(exec);

@Injectable()
export class TaskServiceService {
    constructor(
        @InjectBot('bot') private readonly bot: Telegraf<Context>,
        @InjectRepository(Rate)
        private readonly ratesRepository: Repository<Rate>,
    ) {}

    private logger = new Logger();

    private getBackupCommand(filePath: string): string {
        const host = process.env.DB_HOST || 'genix-postgres'; // Change 'db' to your PostgreSQL service name in Docker
        const user = process.env.DB_USER || 'genix';
        const db = process.env.DB_NAME || 'genix';

        return `PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -h ${host} -U ${user} -d ${db} -c > ${filePath}`;
    }

    private test_channel_id = -1001311323927;
    private dollrkurs_channel_id = -1002929234941;

    // @Cron(CronExpression.EVERY_DAY_AT_5AM)
    // async backup_db() {
    //     const dir = '/app/assets/files/backup';
    //     const file_name = `backup_genix_db_${
    //         new Date().toISOString().split('T')[0]
    //     }`;
    //     const sqlPath = `${dir}/${file_name}.sql`;
    //     const tarPath = `${dir}/${file_name}.tar.gz`;

    //     try {
    //         fs.mkdirSync(dir, { recursive: true });

    //         await execPromise(this.getBackupCommand(sqlPath), {
    //             env: { ...process.env }, // Ensure environment variables are available
    //         });

    //         // Create tar.gz archive
    //         await execPromise(`tar -czf ${tarPath} -C ${dir} ${file_name}.sql`);

    //         // Send the tar file
    //         await this.bot.telegram.sendDocument(1411561011, {
    //             source: tarPath,
    //             filename: `${file_name}.tar.gz`,
    //         });

    //         // Clean up files
    //         fs.unlinkSync(sqlPath);
    //         fs.unlinkSync(tarPath);
    //     } catch (error) {
    //         console.error('Backup process failed:', error);
    //         await this.bot.telegram.sendMessage(
    //             1411561011,
    //             `Database backup failed: ${error.message}`,
    //         );
    //     }
    // }

    // @Cron(CronExpression.EVERY_SECOND)
    // async every_second() {
    //     const date = new Date();
    //     // await this.bot.telegram.sendMessage(1411561011, 'Hello Utkir');
    //     console.log(date.toLocaleString());
    // }

    escapeHtml(s: string) {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    async every_minutes(chatId: number) {
        const fmt = (v: unknown) => {
            const n = Number(v);
            return Number.isFinite(n) ? n.toFixed(2) : '-';
        };

        try {
            // refresh data
            await this.loading_banks();

            const usdRates = await this.ratesRepository.find({
                where: { currency: Currency.USD },
                order: { bank: 'ASC' },
            });

            if (!usdRates?.length) {
                console.warn('[every_minutes] No USD data available yet.');
                return;
            }

            // map entity -> image generator input
            const imgRates = usdRates.map((r) => ({
                currency: String(r.currency).toLowerCase(),
                bank: String(r.bank ?? 'Unknown'),
                sell: fmt(r.sell),
                buy: fmt(r.buy),
            }));

            // generate image real ishlab turgani
            const { filePath } = await generateRatesImageAllCurrencies(
                imgRates,
                {
                    format: 'png',
                    outputDir: path.resolve(process.cwd(), 'images'),
                    // titleLine1: 'Актуальный обменный',
                    // titleLine2: 'курс в банках Узбекистана',
                },
            );

            // generate image for best 5 banks rates (testing stage)
            const best5 = await generateBestRatesImage(imgRates, {
                format: 'png',
                outputDir: path.resolve(process.cwd(), 'images'),
                // titleLine1: 'Актуальный обменный',
                // titleLine2: 'курс в банках Узбекистана',
            });

            // caption (HTML)
            const caption =
                '<b>9:00 holatiga banklarda AQSh dollari kursi</b>\n\n' +
                `<i>Izoh: Bankka borishdan avval bankning sayti orqali tekshiring. O'zgarish bo'lishi mumkin</i>` +
                `\n\n<a href="https://telegra.ph/Valyuta-Kurslari-10-15">Banklar sayti</a>` +
                `\n\n@dollrkurs`;

            // caption (HTML)
            const best_5_caption =
                '<b>9:00 holatiga ENG QULAY kurslar</b>\n\n' +
                `<i>Izoh: Bankka borishdan avval bankning sayti orqali tekshiring. O'zgarish bo'lishi mumkin</i>` +
                `\n\n<a href="https://telegra.ph/Valyuta-Kurslari-10-15">Banklar sayti</a>` +
                `\n\n@dollrkurs`;

            // send photo with caption
            await this.bot.telegram.sendPhoto(
                chatId,
                { source: fs.createReadStream(filePath) },
                { caption, parse_mode: 'HTML' },
            );

            // send photo with caption
            await this.bot.telegram.sendPhoto(
                chatId,
                { source: fs.createReadStream(best5.filePath) },
                { caption: best_5_caption, parse_mode: 'HTML' },
            );

            // best-effort cleanup
            fs.promises
                .unlink(filePath)
                .catch((e) =>
                    console.warn(
                        '[every_minutes] Could not delete image:',
                        e?.message ?? e,
                    ),
                );
        } catch (err) {
            console.error('every_minutes cron error:', err);
        }
    }

    /**
8:00 Кунлик, текст
9:10 Банклар
10:30 Прогноз эртанги кун
14:00 га бирор маълумот топиш керак
16:00 CBU курси
     */

    // every day at 8am cron
    @Cron('0 8 * * *', { timeZone: 'Asia/Tashkent' }) // 8:00 AM
    async every_day_at_8am() {
        await this.send_currency_rates_string1(this.dollrkurs_channel_id);
        await this.send_currency_rates_string1(this.test_channel_id);
    }

    @Cron('10 9 * * *', { timeZone: 'Asia/Tashkent' }) // 9:10 AM
    async every_day_at_9am_plus10() {
        await this.every_minutes(this.dollrkurs_channel_id);
        // await this.sending_currency_rates_string(this.dollrkurs_channel_id);
    }

    @Cron('11 11 * * *', { timeZone: 'Asia/Tashkent' }) // 11:11 AM Tashkent time
    async every_day_at_11_11_am() {
        await this.send_pragnoz_call_auction(this.dollrkurs_channel_id);
        await this.send_pragnoz_call_auction(this.test_channel_id);
    }

    @Cron('40 10 * * *', { timeZone: 'Asia/Tashkent' }) // 10:40 AM Tashkent time
    async every_day_at_10_40_am() {
        // await this.send_pragnoz_call_auction(this.dollrkurs_channel_id);
        await this.send_pragnoz_call_auction(this.test_channel_id);
    }

    @Cron('10 16 * * *', { timeZone: 'Asia/Tashkent' }) // 4:10 PM
    async every_day_at_4pm_plus10() {
        await this.every_minutes(this.dollrkurs_channel_id);
    }

    /**
     * Every hour real working cron
     */
    @Cron(CronExpression.EVERY_HOUR)
    async every_30_seconds() {
        await this.send_pragnoz_call_auction(this.test_channel_id);
        await this.every_minutes(this.test_channel_id);
        await this.send_currency_rates_string1(this.test_channel_id);
        await this.send_currency_rates_string2(this.test_channel_id);
    }

    /**
     * Runs every weekday (Monday-Friday) at 10:30 AM
     * Cron format: second minute hour day month dayOfWeek
     * 0 30 10 * * 1-5
     */
    @Cron('0 40 10 * * 1-5', {
        timeZone: 'Asia/Tashkent', // Optional: specify timezone
    })
    async sendDailyCentralBankRate() {
        const data = await getCentralBankRate();
        await this.sendCentralBankRateSimple(this.test_channel_id, data);
    }

    /**
     * Fetches and aggregates currency rates from CBU and market sources
     */
    async findCurrencyRates(): Promise<CurrencyData | null> {
        try {
            // Fetch CBU rates
            const cbuRates = await fetchCbuRates();
            // console.log('CBU Rates:', cbuRates);

            // Extract and validate required currencies
            const requiredCurrencies = this.extractRequiredCurrencies(cbuRates);
            if (!requiredCurrencies) {
                console.error('Missing required currency rates from CBU');
                return null;
            }

            const { USD, EUR, RUB, KZT, TRY, CNY } = requiredCurrencies;

            // Fetch market rates for USD and RUB
            const [usdMarketRates, rubMarketRates] = await Promise.all([
                this.fetchMarketRates(Currency.USD),
                this.fetchMarketRates(Currency.RUB),
            ]);

            // Build currency data response
            return {
                date: new Date(),
                usd: {
                    buy: this.findHighestBuyPrice(usdMarketRates),
                    sell: this.findLowestSellPrice(usdMarketRates),
                    official: USD.Rate,
                    diff: USD.Diff,
                },
                rub: {
                    buy: this.findHighestBuyPrice(rubMarketRates),
                    sell: this.findLowestSellPrice(rubMarketRates),
                },
                eur: {
                    official: EUR.Rate,
                    diff: EUR.Diff,
                },
                officialRates: {
                    RUB: { rate: RUB.Rate, diff: RUB.Diff },
                    KZT: { rate: KZT.Rate, diff: KZT.Diff },
                    TRY: { rate: TRY.Rate, diff: TRY.Diff },
                    CNY: { rate: CNY.Rate, diff: CNY.Diff },
                },
            };
        } catch (error) {
            console.error('Error fetching currency rates:', error);
            return null;
        }
    }

    /**
     * Extract and validate required currencies from CBU rates
     */
    private extractRequiredCurrencies(
        cbuRates: CbuRate[],
    ): RequiredCurrencies | null {
        const getCurrencyRate = (currency: string): CbuRate | undefined => {
            return cbuRates.find((rate) => rate.Ccy === currency);
        };

        const USD = getCurrencyRate('USD');
        const EUR = getCurrencyRate('EUR');
        const RUB = getCurrencyRate('RUB');
        const KZT = getCurrencyRate('KZT');
        const TRY = getCurrencyRate('TRY');
        const CNY = getCurrencyRate('CNY');

        // Validate all currencies are present
        if (!USD || !EUR || !RUB || !KZT || !TRY || !CNY) {
            return null;
        }

        return { USD, EUR, RUB, KZT, TRY, CNY };
    }

    /**
     * Fetch market rates for a specific currency (excluding CBU)
     */
    private async fetchMarketRates(currency: Currency): Promise<Rate[]> {
        return this.ratesRepository.find({
            where: {
                currency,
                bank: Not(Bank.CBU),
            },
        });
    }

    /**
     * Format date to string (customize as needed)
     */
    private formatDate(date: Date): string {
        // Example: "2026 йил 21 январь" or use your preferred format
        return date.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    async send_pragnoz_call_auction(chatId: number) {
        try {
            const result = await getCallAuctionInfo();

            if (!result.success || !result.response) {
                console.error(
                    'Failed to fetch call auction info:',
                    result.error,
                );
                console.error(
                    chatId,
                    "❌ Ma'lumotlarni yuklashda xatolik yuz berdi.",
                );
                return;
            }

            const { data } = result.response;

            const directionText = data.direction ? "ko'tarilishi" : 'tushishi';

            const changeSign = data.direction ? '+' : '-';

            const message = `
Ertaga dollar kursi ${directionText} kutilmoqda

${changeSign} ${data.change} so'm

Tahminiy kurs ${data.price} so'm

@dollrkurs
        `.trim();

            await this.bot.telegram.sendMessage(chatId, message);

            console.log(`Call auction prognoz sent to chat ${chatId}`);
        } catch (error) {
            console.error('Error sending call auction prognoz:', error);
            await this.bot.telegram.sendMessage(
                chatId,
                '❌ Xabar yuborishda xatolik yuz berdi.',
            );
        }
    }

    async sendCentralBankRateSimple(
        chatId: number | string,
        rate: CentralBankRate,
    ) {
        try {
            if (!rate) {
                console.error('Failed to fetch central bank rate');
                await this.bot.telegram.sendMessage(
                    chatId,
                    "❌ Ma'lumotlarni yuklashda xatolik yuz berdi.",
                );
                return;
            }

            const changeSign = rate.changeDirection === 'up' ? '▲' : '▼';

            const message = `
O'zRVB ochilish auksioni kursi: ${rate.date}

1 ${rate.currency} = ${rate.rate} ${rate.targetCurrency} (${changeSign}${rate.changeAmount})

@dollrkurs
            `.trim();

            await this.bot.telegram.sendMessage(chatId, message);

            console.log(`Central bank rate sent to chat ${chatId}`);
        } catch (error) {
            console.error('Error sending central bank rate:', error);
            await this.bot.telegram.sendMessage(
                chatId,
                '❌ Xabar yuborishda xatolik yuz berdi.',
            );
        }
    }

    async send_currency_rates_string1(chatId: number) {
        const currencyData = await this.findCurrencyRates();
        if (!currencyData) {
            console.error('Could not retrieve currency data.');
            return;
        }
        const message = this.buildCurrencyMessage(currencyData);
        await this.bot.telegram.sendMessage(chatId, message);
    }

    async send_currency_rates_string2(chatId: number) {
        const currencyData = await this.findCurrencyRates();
        if (!currencyData) {
            console.error('Could not retrieve currency data.');
            return;
        }
        const message = this.buildCurrencyMessageCyrillic(currencyData);
        await this.bot.telegram.sendMessage(chatId, message);
    }

    // /**
    //  * Every 30 seconds cron for testing stage
    //  */
    // @Cron(CronExpression.EVERY_MINUTE)
    // async every_minute_test() {
    //     await this.send_pragnoz_call_auction(this.test_channel_id);
    // }

    /**
     * Find the lowest sell price from an array of rates
     * Handles string to number conversion and filters out null/invalid values
     */
    private findLowestSellPrice(rates: Rate[]): number {
        const validPrices = rates
            .map((rate) => (rate.sell ? parseFloat(rate.sell) : null))
            .filter((price): price is number => price !== null && price > 0);

        return validPrices.length > 0 ? Math.min(...validPrices) : 0;
    }

    /**
     * Find the highest buy price from an array of rates
     * Handles string to number conversion and filters out null/invalid values
     */
    private findHighestBuyPrice(rates: Rate[]): number {
        const validPrices = rates
            .map((rate) => (rate.buy ? parseFloat(rate.buy) : null))
            .filter((price): price is number => price !== null && price > 0);

        return validPrices.length > 0 ? Math.max(...validPrices) : 0;
    }

    /**
     * Helper method to build the currency message
     */
    private buildCurrencyMessage(data: {
        date: Date;
        usd: { buy: number; sell: number; official: string; diff: string };
        rub: { buy: number; sell: number };
        eur: { official: string; diff: string };
        officialRates: {
            RUB: { rate: string; diff: string };
            KZT: { rate: string; diff: string };
            TRY: { rate: string; diff: string };
            CNY: { rate: string; diff: string };
        };
    }): string {
        const formattedDate = data.date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
        return `${formattedDate}
O‘zbekistonda valyuta kurslari

➖➖➖➖➖➖➖➖
Bozor kursi:
💲1 AQSh dollari
➖Sotib olish: ${data.usd.buy.toLocaleString('ru-RU')} so'm
➖Sotish: ${data.usd.sell.toLocaleString('ru-RU')} so'm

🤑1 Rossiya rubli
➖Sotib olish: ${data.rub.buy.toLocaleString('ru-RU')} so'm
➖Sotish: ${data.rub.sell.toLocaleString('ru-RU')} so'm

➖➖➖➖➖➖➖➖

🏛 Markaziy bankning rasmiy kursi:
🇺🇸1 USD = ${data.usd.official} so'm (${this.formatDiff(data.usd.diff)})
🇪🇺1 EUR = ${data.eur.official} so'm (${this.formatDiff(data.eur.diff)})
🇷🇺1 RUB = ${data.officialRates.RUB.rate} so'm (${this.formatDiff(
            data.officialRates.RUB.diff,
        )})
🇰🇿1 KZT = ${data.officialRates.KZT.rate} so'm (${this.formatDiff(
            data.officialRates.KZT.diff,
        )})
🇹🇷1 TRY = ${data.officialRates.TRY.rate} so'm (${this.formatDiff(
            data.officialRates.TRY.diff,
        )})
🇨🇳1 CNY = ${data.officialRates.CNY.rate} so'm (${this.formatDiff(
            data.officialRates.CNY.diff,
        )})

@dollrkurs`;
    }

    /**
     * Helper method to build the currency message in Cyrillic format
     */
    private buildCurrencyMessageCyrillic(data: CurrencyData): string {
        const formattedDate = this.formatUzbekDate(data.date);

        return `Ўзбекистонда валюта курслари (${formattedDate})

Бозордаги курслар:

🔹 АҚШ доллари (USD)
— Харид: ${this.formatAmount(data.usd.buy)} сўм
— Сотув: ${this.formatAmount(data.usd.sell)} сўм

🔹 Россия рубли (RUB)
— Харид: ${this.formatAmount(data.rub.buy)} сўм
— Сотув: ${this.formatAmount(data.rub.sell)} сўм

🏛 Марказий банк томонидан белгиланган расмий курслар:

🇺🇸 USD — ${data.usd.official} сўм (${this.formatDiff(data.usd.diff)})
🇪🇺 EUR — ${data.eur.official} сўм (${this.formatDiff(data.eur.diff)})
🇷🇺 RUB — ${data.officialRates.RUB.rate} сўм (${this.formatDiff(
            data.officialRates.RUB.diff,
        )})
🇰🇿 KZT — ${data.officialRates.KZT.rate} сўм (${this.formatDiff(
            data.officialRates.KZT.diff,
        )})
🇹🇷 TRY — ${data.officialRates.TRY.rate} сўм (${this.formatDiff(
            data.officialRates.TRY.diff,
        )})
🇨🇳 CNY — ${data.officialRates.CNY.rate} сўм (${this.formatDiff(
            data.officialRates.CNY.diff,
        )}).`;
    }

    /**
     * Format date to Uzbek format: "2026 йил 21 январь"
     */
    private formatUzbekDate(date: Date): string {
        const uzbekMonths = [
            'январь',
            'февраль',
            'март',
            'апрель',
            'май',
            'июнь',
            'июль',
            'август',
            'сентябрь',
            'октябрь',
            'ноябрь',
            'декабрь',
        ];

        const year = date.getFullYear();
        const day = date.getDate();
        const month = uzbekMonths[date.getMonth()];

        return `${year} йил ${day} ${month}`;
    }

    /**
     * Format difference with proper + or - sign
     */
    private formatDiff(diff: string): string {
        const numericDiff = parseFloat(diff.replace(',', '.'));

        if (numericDiff > 0) {
            return `+${diff}`;
        }

        return diff; // Already has minus sign or is zero
    }

    /**
     * Format amount with thousands separator
     */
    private formatAmount(amount: number): string {
        return amount.toLocaleString('ru-RU');
    }

    async loading_banks() {
        await this.loading_cbu();

        await this.loading_aloqabank();

        await this.loading_anorbank();

        await this.loading_davrbank();

        await this.loading_garantbank(); // bunda sell rate va buy rate ni aniq qilish kerak bo'lmasa hammasini bir xil qilib qo'yayabdi

        await this.loading_kdb();

        await this.loading_nbu(); // buy rate da muammo bor chiqmayapti

        await this.loading_octobank();

        await this.loading_poytaxtbank();

        await this.loading_agrobank();

        await this.loading_asakabank(); // bunda request qilganida muammo bo'ldi // manimcha header da origin qilib o'zini saytini berish kerak

        await this.loading_brb();

        await this.loading_tengebank();

        await this.loading_hayotbank();

        await this.loading_hamkorbank();

        await this.loading_infinbank();

        // await this.loading_mkbank();

        await this.loading_tbc();

        await this.loading_ipakyulibank();

        await this.loading_xb();

        await this.loading_sqb();
    }

    async loading_cbu() {
        try {
            const cbu_rates = await fetchCbuRates();
            const usd = cbu_rates.find((rate) => rate.Ccy == 'USD');
            const eur = cbu_rates.find((rate) => rate.Ccy == 'EUR');
            const rub = cbu_rates.find((rate) => rate.Ccy == 'RUB');

            // USD rate handling
            const usd_body = {
                currency: Currency.USD,
                bank: Bank.CBU,
                sell: usd.Rate,
                buy: usd.Rate,
            };

            const usd_data = await this.ratesRepository.findOneBy({
                currency: Currency.USD,
                bank: Bank.CBU,
            });

            if (usd_data) {
                // Update USD rate if already exists
                await this.ratesRepository.update(usd_data.id, usd_body);
            } else {
                // Insert new USD rate
                await this.ratesRepository.save(usd_body);
            }

            // EUR rate handling
            const eur_body = {
                currency: Currency.EUR,
                bank: Bank.CBU,
                sell: eur.Rate,
                buy: eur.Rate,
            };

            const eur_data = await this.ratesRepository.findOneBy({
                currency: Currency.EUR,
                bank: Bank.CBU,
            });

            if (eur_data) {
                // Update EUR rate if already exists
                await this.ratesRepository.update(eur_data.id, eur_body);
            } else {
                // Insert new EUR rate
                await this.ratesRepository.save(eur_body);
            }

            // RUB rate handling
            const rub_body = {
                currency: Currency.RUB,
                bank: Bank.CBU,
                sell: rub.Rate,
                buy: rub.Rate,
            };

            const rub_data = await this.ratesRepository.findOneBy({
                currency: Currency.RUB,
                bank: Bank.CBU,
            });

            if (rub_data) {
                // Update RUB rate if already exists
                await this.ratesRepository.update(rub_data.id, rub_body);
            } else {
                // Insert new RUB rate
                await this.ratesRepository.save(rub_body);
            }

            console.log('Currency rates updated successfully in CBU');
        } catch (error) {
            console.log(error);
        }
    }

    async loading_aloqabank() {
        try {
            const rates = await getAlokabankExchangeRates(); // Assuming this is defined

            // Process USD first
            const usd = rates.find(
                (rate) => rate.currency === 'AQSh dollari (USD*)',
            );
            if (usd) {
                const usdData = {
                    currency: Currency.USD, // Assuming your Currency enum contains 'USD'
                    bank: Bank.ALOQABANK, // Assuming ALOQABANK is a value in the Bank enum
                    sell: usd.sellRate.replace('*', ''),
                    buy: usd.buyRate.replace('*', ''),
                };

                const existingUsd = await this.ratesRepository.findOneBy({
                    currency: Currency.USD,
                    bank: Bank.ALOQABANK,
                });

                if (existingUsd) {
                    await this.ratesRepository.update(existingUsd.id, usdData);
                } else {
                    await this.ratesRepository.save(usdData);
                }
            }

            // Process EUR
            const eur = rates.find((rate) => rate.currency === 'Evro (EUR)');
            if (eur) {
                const eurData = {
                    currency: Currency.EUR,
                    bank: Bank.ALOQABANK,
                    sell: eur.sellRate.replace('*', ''),
                    buy: eur.buyRate.replace('*', ''),
                };

                const existingEur = await this.ratesRepository.findOneBy({
                    currency: Currency.EUR,
                    bank: Bank.ALOQABANK,
                });

                if (existingEur) {
                    await this.ratesRepository.update(existingEur.id, eurData);
                } else {
                    await this.ratesRepository.save(eurData);
                }
            }

            // Process RUB
            const rub = rates.find(
                (rate) => rate.currency === 'Rossiya rubli (RUB)',
            );
            if (rub) {
                const rubData = {
                    currency: Currency.RUB,
                    bank: Bank.ALOQABANK,
                    sell: rub.sellRate.replace('*', ''),
                    buy: rub.buyRate.replace('*', ''),
                };

                const existingRub = await this.ratesRepository.findOneBy({
                    currency: Currency.RUB,
                    bank: Bank.ALOQABANK,
                });

                if (existingRub) {
                    await this.ratesRepository.update(existingRub.id, rubData);
                } else {
                    await this.ratesRepository.save(rubData);
                }
            }

            console.log('Currency rates updated successfully in Aloqabank');
        } catch (error) {
            console.error('Error loading Aloqabank rates:', error);
        }
    }

    async loading_anorbank() {
        try {
            const data = await getExchangeRatesFromAnorbank(); // Assuming this function is defined

            // Filter only "desktop" source rates
            const desktopRates = data.filter(
                (rate) => rate.source === 'desktop',
            );

            // Get the first USD, EUR, and RUB
            const usd = desktopRates.find((rate) => rate.currency === 'USD');
            const eur = desktopRates.find((rate) => rate.currency === 'EUR');
            const rub = desktopRates.find((rate) => rate.currency === 'RUB');

            // Process USD rate (first one found)
            const usdBody = {
                currency: Currency.USD,
                bank: Bank.ANORBANK,
                sell: usd.sellRate.replace(/\s/g, '').replace(',', '.'),
                // Removing spaces and parsing
                buy: usd.buyRate.replace(/\s/g, '').replace(',', '.'),
                // Removing spaces and parsing
            };

            const existingUsd = await this.ratesRepository.findOneBy({
                currency: Currency.USD,
                bank: Bank.ANORBANK,
            });

            if (existingUsd) {
                await this.ratesRepository.update(existingUsd.id, usdBody);
            } else {
                await this.ratesRepository.save(usdBody);
            }

            // Process EUR rate
            const eurBody = {
                currency: Currency.EUR,
                bank: Bank.ANORBANK,
                sell: eur.sellRate.replace(/\s/g, '').replace(',', '.'),

                buy: eur.buyRate.replace(/\s/g, '').replace(',', '.'),
            };

            const existingEur = await this.ratesRepository.findOneBy({
                currency: Currency.EUR,
                bank: Bank.ANORBANK,
            });

            if (existingEur) {
                await this.ratesRepository.update(existingEur.id, eurBody);
            } else {
                await this.ratesRepository.save(eurBody);
            }

            // Process RUB rate
            const rubBody = {
                currency: Currency.RUB,
                bank: Bank.ANORBANK,
                sell: rub.sellRate.replace(/\s/g, '').replace(',', '.'),

                buy: rub.buyRate.replace(/\s/g, '').replace(',', '.'),
            };

            const existingRub = await this.ratesRepository.findOneBy({
                currency: Currency.RUB,
                bank: Bank.ANORBANK,
            });

            if (existingRub) {
                await this.ratesRepository.update(existingRub.id, rubBody);
            } else {
                await this.ratesRepository.save(rubBody);
            }

            console.log('Currency rates updated successfully in Anorbank');
        } catch (error) {
            console.error('Error loading Anorbank rates:', error);
        }
    }

    async loading_davrbank() {
        try {
            const data = await getDavrbankRates(); // Assuming this is defined

            // Filter to get "bank" source rates only
            const bankRates = data.filter((rate) => rate.source === 'bank');

            // Process USD
            const usd = bankRates.find((rate) => rate.currency === 'USD');
            if (usd) {
                const usdData = {
                    currency: Currency.USD, // Assuming your Currency enum contains 'USD'
                    bank: Bank.DAVRBANK, // Assuming DAVRBANK is a value in the Bank enum
                    sell: usd.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: usd.buyRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingUsd = await this.ratesRepository.findOneBy({
                    currency: Currency.USD,
                    bank: Bank.DAVRBANK,
                });

                if (existingUsd) {
                    await this.ratesRepository.update(existingUsd.id, usdData);
                } else {
                    await this.ratesRepository.save(usdData);
                }
            }

            // Process EUR
            const eur = bankRates.find((rate) => rate.currency === 'EUR');
            if (eur) {
                const eurData = {
                    currency: Currency.EUR,
                    bank: Bank.DAVRBANK,
                    sell: eur.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: eur.buyRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingEur = await this.ratesRepository.findOneBy({
                    currency: Currency.EUR,
                    bank: Bank.DAVRBANK,
                });

                if (existingEur) {
                    await this.ratesRepository.update(existingEur.id, eurData);
                } else {
                    await this.ratesRepository.save(eurData);
                }
            }

            // Process RUB
            const rub = bankRates.find((rate) => rate.currency === 'RUB');
            if (rub) {
                const rubData = {
                    currency: Currency.RUB,
                    bank: Bank.DAVRBANK,
                    sell: rub.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: rub.buyRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingRub = await this.ratesRepository.findOneBy({
                    currency: Currency.RUB,
                    bank: Bank.DAVRBANK,
                });

                if (existingRub) {
                    await this.ratesRepository.update(existingRub.id, rubData);
                } else {
                    await this.ratesRepository.save(rubData);
                }
            }

            console.log('Currency rates updated successfully in Davrbank');
        } catch (error) {
            console.error('Error loading Davrbank rates:', error);
        }
    }

    // In your service
    async loading_garantbank() {
        try {
            const { office, source } = await fetchGarantbankOfficeRates(); // { office: { usd:{buy,sell}, eur:{...}, rub:{...} } }

            const toStr = (v: number | null) => (v == null ? null : String(v));

            const rows = [
                { currency: Currency.USD, pair: office.usd },
                { currency: Currency.EUR, pair: office.eur },
                { currency: Currency.RUB, pair: office.rub },
            ] as const;

            for (const r of rows) {
                if (!r.pair) continue;

                const payload = {
                    currency: r.currency,
                    bank: Bank.GARANTBANK,
                    buy: toStr(r.pair.buy),
                    sell: toStr(r.pair.sell),
                };

                const existing = await this.ratesRepository.findOneBy({
                    currency: r.currency,
                    bank: Bank.GARANTBANK,
                });

                if (existing) {
                    await this.ratesRepository.update(existing.id, payload);
                } else {
                    await this.ratesRepository.save(payload);
                }
            }

            console.log(`[GARANTBANK] office rates saved from ${source}`);
        } catch (err) {
            console.error('Error loading Garantbank rates:', err);
        }
    }

    async loading_kdb() {
        try {
            const data = await getKdbExchangeRates(); // Assuming this function is defined

            // Process USD
            const usd = data.find((rate) => rate.currency === 'USD');
            if (usd) {
                const usdData = {
                    currency: Currency.USD, // Assuming your Currency enum contains 'USD'
                    bank: Bank.KDB, // Assuming KDB is a value in the Bank enum
                    sell: usd.sellRate !== 'N/A' ? usd.sellRate : null, // If sellRate is 'N/A', store as null
                    buy: usd.buyRate !== 'N/A' ? usd.buyRate : null, // If buyRate is 'N/A', store as null
                };

                const existingUsd = await this.ratesRepository.findOneBy({
                    currency: Currency.USD,
                    bank: Bank.KDB,
                });

                if (existingUsd) {
                    await this.ratesRepository.update(existingUsd.id, usdData);
                } else {
                    await this.ratesRepository.save(usdData);
                }
            }

            // Process EUR
            const eur = data.find((rate) => rate.currency === 'EUR');
            if (eur) {
                const eurData = {
                    currency: Currency.EUR,
                    bank: Bank.KDB,
                    sell: eur.sellRate !== 'N/A' ? eur.sellRate : null,
                    buy: eur.buyRate !== 'N/A' ? eur.buyRate : null,
                };

                const existingEur = await this.ratesRepository.findOneBy({
                    currency: Currency.EUR,
                    bank: Bank.KDB,
                });

                if (existingEur) {
                    await this.ratesRepository.update(existingEur.id, eurData);
                } else {
                    await this.ratesRepository.save(eurData);
                }
            }

            // Process RUB
            const rub = data.find((rate) => rate.currency === 'RUB');
            if (rub) {
                const rubData = {
                    currency: Currency.RUB,
                    bank: Bank.KDB,
                    sell: rub.sellRate !== 'N/A' ? rub.sellRate : null,
                    buy: rub.buyRate !== 'N/A' ? rub.buyRate : null,
                };

                const existingRub = await this.ratesRepository.findOneBy({
                    currency: Currency.RUB,
                    bank: Bank.KDB,
                });

                if (existingRub) {
                    await this.ratesRepository.update(existingRub.id, rubData);
                } else {
                    await this.ratesRepository.save(rubData);
                }
            }

            console.log('Currency rates updated successfully in KDB');
        } catch (error) {
            console.error('Error loading KDB rates:', error);
        }
    }

    async loading_nbu() {
        try {
            const raw = await getNbuExchangeRates();

            // Keep only what we need
            const WANT = new Set(['USD', 'EUR', 'RUB'] as const);
            const mapToEnum: Record<'USD' | 'EUR' | 'RUB', Currency> = {
                USD: Currency.USD,
                EUR: Currency.EUR,
                RUB: Currency.RUB,
            };

            const toNumStr = (s?: string | null) =>
                s ? s.replace(/\s+/g, '').replace(',', '.') : null;

            const filtered = raw.filter((r: any) => WANT.has(r.currency));

            // Load existing rows in one query
            const currencies = [Currency.USD, Currency.EUR, Currency.RUB];
            const existing = await this.ratesRepository.find({
                where: { bank: Bank.NBU, currency: In(currencies) },
            });
            const existingByCurrency = new Map(
                existing.map((r) => [r.currency, r]),
            );

            // Build payloads
            const payloads = filtered
                .map((r: any) => {
                    const cur = mapToEnum[r.currency as 'USD' | 'EUR' | 'RUB'];
                    const prev = existingByCurrency.get(cur);

                    const sell = toNumStr(r.sellRate);
                    const buy = toNumStr(r.buyRate) ?? prev?.buy ?? null;

                    // If no sell available, skip (nothing meaningful to update)
                    if (!sell) return null;

                    return {
                        id: prev?.id, // enables upsert via save()
                        currency: cur,
                        bank: Bank.NBU,
                        sell,
                        buy,
                    };
                })
                .filter(Boolean) as Array<{
                id?: string;
                currency: Currency;
                bank: Bank;
                sell: string;
                buy: string | null;
            }>;

            if (payloads.length) {
                await this.ratesRepository.save(payloads);
            }

            console.log('[NBU] Currency rates updated successfully.');
        } catch (err) {
            console.error('[NBU] Error loading rates:', err);
        }
    }

    async loading_octobank() {
        try {
            const data = await getOctobankRates(); // Assuming this function is defined

            // Filter to get the USD, EUR, and RUB currencies
            const filteredRates = data.filter((rate) =>
                ['USD', 'EUR', 'RUB'].includes(rate.currency),
            );

            // Process USD
            const usd = filteredRates.find((rate) => rate.currency === 'USD');
            if (usd) {
                const usdData = {
                    currency: Currency.USD, // Assuming your Currency enum contains 'USD'
                    bank: Bank.OCTOBANK, // Assuming OCTOBANK is a value in the Bank enum
                    sell: usd.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: usd.buyRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingUsd = await this.ratesRepository.findOneBy({
                    currency: Currency.USD,
                    bank: Bank.OCTOBANK,
                });

                if (existingUsd) {
                    await this.ratesRepository.update(existingUsd.id, usdData);
                } else {
                    await this.ratesRepository.save(usdData);
                }
            }

            // Process EUR
            const eur = filteredRates.find((rate) => rate.currency === 'EUR');
            if (eur) {
                const eurData = {
                    currency: Currency.EUR,
                    bank: Bank.OCTOBANK,
                    sell: eur.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: eur.buyRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingEur = await this.ratesRepository.findOneBy({
                    currency: Currency.EUR,
                    bank: Bank.OCTOBANK,
                });

                if (existingEur) {
                    await this.ratesRepository.update(existingEur.id, eurData);
                } else {
                    await this.ratesRepository.save(eurData);
                }
            }

            // Process RUB
            const rub = filteredRates.find((rate) => rate.currency === 'RUB');
            if (rub) {
                const rubData = {
                    currency: Currency.RUB,
                    bank: Bank.OCTOBANK,
                    sell: rub.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: rub.buyRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingRub = await this.ratesRepository.findOneBy({
                    currency: Currency.RUB,
                    bank: Bank.OCTOBANK,
                });

                if (existingRub) {
                    await this.ratesRepository.update(existingRub.id, rubData);
                } else {
                    await this.ratesRepository.save(rubData);
                }
            }

            console.log('Currency rates updated successfully in Octobank');
        } catch (error) {
            console.error('Error loading Octobank rates:', error);
        }
    }

    async loading_poytaxtbank() {
        try {
            const data = await getExchangeRates(); // Assuming this is defined

            // Filter to get the first occurrences of USD, EUR, and RUB
            const usd = data.find((rate) => rate.currency === 'USD');
            const eur = data.find((rate) => rate.currency === 'EUR');
            const rub = data.find((rate) => rate.currency === 'RUB');

            // Process USD
            if (usd) {
                const usdData = {
                    currency: Currency.USD, // Assuming your Currency enum contains 'USD'
                    bank: Bank.PAYTAXTBANK, // Assuming PAYTAXTBANK is a value in the Bank enum
                    sell: usd.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: usd.buyRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingUsd = await this.ratesRepository.findOneBy({
                    currency: Currency.USD,
                    bank: Bank.PAYTAXTBANK,
                });

                if (existingUsd) {
                    await this.ratesRepository.update(existingUsd.id, usdData);
                } else {
                    await this.ratesRepository.save(usdData);
                }
            }

            // Process EUR
            if (eur) {
                const eurData = {
                    currency: Currency.EUR,
                    bank: Bank.PAYTAXTBANK,
                    sell: eur.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: eur.buyRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingEur = await this.ratesRepository.findOneBy({
                    currency: Currency.EUR,
                    bank: Bank.PAYTAXTBANK,
                });

                if (existingEur) {
                    await this.ratesRepository.update(existingEur.id, eurData);
                } else {
                    await this.ratesRepository.save(eurData);
                }
            }

            // Process RUB
            if (rub) {
                const rubData = {
                    currency: Currency.RUB,
                    bank: Bank.PAYTAXTBANK,
                    sell: rub.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: rub.buyRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingRub = await this.ratesRepository.findOneBy({
                    currency: Currency.RUB,
                    bank: Bank.PAYTAXTBANK,
                });

                if (existingRub) {
                    await this.ratesRepository.update(existingRub.id, rubData);
                } else {
                    await this.ratesRepository.save(rubData);
                }
            }

            console.log('Currency rates updated successfully in Poytaxtbank');
        } catch (error) {
            console.error('Error loading Poytaxtbank rates:', error);
        }
    }

    async loading_agrobank() {
        try {
            const data = await getAgrobankExchangeRates(); // Fetch data from Agrobank

            // Filter to get first occurrences of USD, EUR, and RUB
            const usd = data.find((rate) => rate.alpha3 === 'USD');
            const eur = data.find((rate) => rate.alpha3 === 'EUR');
            const rub = data.find((rate) => rate.alpha3 === 'RUB');

            // Process USD
            if (usd) {
                const usdData = {
                    currency: Currency.USD, // Assuming Currency enum has USD
                    bank: Bank.AGROBANK, // Assuming AGROBANK is a value in the Bank enum
                    sell: usd.sale,
                    buy: usd.buy,
                };

                const existingUsd = await this.ratesRepository.findOneBy({
                    currency: Currency.USD,
                    bank: Bank.AGROBANK,
                });

                if (existingUsd) {
                    await this.ratesRepository.update(existingUsd.id, usdData);
                } else {
                    await this.ratesRepository.save(usdData);
                }
            }

            // Process EUR
            if (eur) {
                const eurData = {
                    currency: Currency.EUR,
                    bank: Bank.AGROBANK,
                    sell: eur.sale,
                    buy: eur.buy,
                };

                const existingEur = await this.ratesRepository.findOneBy({
                    currency: Currency.EUR,
                    bank: Bank.AGROBANK,
                });

                if (existingEur) {
                    await this.ratesRepository.update(existingEur.id, eurData);
                } else {
                    await this.ratesRepository.save(eurData);
                }
            }

            // Process RUB
            if (rub) {
                const rubData = {
                    currency: Currency.RUB,
                    bank: Bank.AGROBANK,
                    sell: rub.sale,
                    buy: rub.buy,
                };

                const existingRub = await this.ratesRepository.findOneBy({
                    currency: Currency.RUB,
                    bank: Bank.AGROBANK,
                });

                if (existingRub) {
                    await this.ratesRepository.update(existingRub.id, rubData);
                } else {
                    await this.ratesRepository.save(rubData);
                }
            }

            console.log('Currency rates updated successfully in Agrobank');
        } catch (error) {
            console.error('Error loading Agrobank rates:', error);
        }
    }

    // Inside your service (has this.ratesRepository, Bank, Currency)
    async loading_asakabank() {
        try {
            const res = await fetchAsakaCurrencyListAxios({
                cookie: process.env.ASAKABANK_COOKIE || '',
                page: 1,
                pageSize: 50,
            });

            // Ensure JSON shape: { results: [...] }
            const json =
                typeof res === 'string' ? JSON.parse(res) : (res as any);
            const rows: any[] = Array.isArray(json?.results)
                ? json.results
                : [];

            // Keep only "Individual" (currency_type === 1)
            const indiv = rows.filter(
                (r) =>
                    r?.currency_type === 1 ||
                    String(r?.currency_type_name).toLowerCase() ===
                        'individual',
            );

            const toNum = (v: unknown): number | null => {
                const n = Number(String(v).replace(',', '.'));
                return Number.isFinite(n) ? n : null;
            };

            // Normalize one row -> {currencyAlphaCode, buy, sell, cbu}
            const norm = (r: any) => ({
                currencyAlphaCode: String(r?.short_name ?? '').toUpperCase(), // e.g. USD, EUR, RUB
                buy: toNum(r?.purchase),
                sell: toNum(r?.sale),
                cbu: toNum(r?.rate_cb),
            });

            // Finder by alpha
            const pick = (alpha: string) =>
                indiv.map(norm).find((x) => x.currencyAlphaCode === alpha);

            const processCurrency = async (
                rate: ReturnType<typeof norm> | undefined,
                currency: string,
            ) => {
                if (!rate) return;
                const buyNum = rate.buy ?? rate.cbu;
                const sellNum = rate.sell ?? rate.cbu;
                if (buyNum == null && sellNum == null) return;

                const data = {
                    currency,
                    bank: Bank.ASAKABANK,
                    buy: buyNum != null ? String(buyNum) : null,
                    sell: sellNum != null ? String(sellNum) : null,
                } as const;

                const existing = await this.ratesRepository.findOneBy({
                    currency,
                    bank: Bank.ASAKABANK,
                });

                if (existing) {
                    await this.ratesRepository.update(existing.id, data);
                } else {
                    await this.ratesRepository.save(data);
                }
            };

            await processCurrency(pick('USD'), Currency.USD);
            await processCurrency(pick('EUR'), Currency.EUR);
            await processCurrency(pick('RUB'), Currency.RUB);

            console.log('Asakabank (Individual) rates saved: USD/EUR/RUB');
        } catch (error) {
            console.error('Error loading Asakabank rates:', error);
        }
    }

    async loading_brb() {
        try {
            // Fetch currency data from BRB
            const data = await getCurrencyRatesFromBrb();

            // Helper function to process currency data
            const processCurrency = async (
                currencyData: any,
                currency: string,
            ) => {
                if (currencyData) {
                    const data = {
                        currency,
                        bank: Bank.BRB,
                        buy: (currencyData.buy / 100).toString(), // Ensure the rate is a string
                        sell: (currencyData.sell / 100).toString(),
                    };

                    const existingCurrency =
                        await this.ratesRepository.findOneBy({
                            currency,
                            bank: Bank.BRB,
                        });

                    if (existingCurrency) {
                        await this.ratesRepository.update(
                            existingCurrency.id,
                            data,
                        );
                    } else {
                        await this.ratesRepository.save(data);
                    }
                }
            };

            // Process USD, EUR, and RUB currencies
            await processCurrency(
                data.find((rate) => rate.code === 'USD'),
                Currency.USD,
            );
            await processCurrency(
                data.find((rate) => rate.code === 'EUR'),
                Currency.EUR,
            );
            await processCurrency(
                data.find((rate) => rate.code === 'RUB'),
                Currency.RUB,
            );

            console.log('Currency rates updated successfully from BRB');
        } catch (error) {
            console.error('Error loading BRB rates:', error);
        }
    }

    async loading_tengebank() {
        try {
            const data = await fetchTengeBankRates();

            // Helper function to process currency data
            const processCurrency = async (
                currencyData: any,
                currency: string,
            ) => {
                if (currencyData) {
                    const data = {
                        currency,
                        bank: Bank.TENGEBANK, // Assuming TENGEBANK is a value in the Bank enum
                        buy: currencyData.buy.toString(), // Ensure the rate is a string
                        sell: currencyData.sell.toString(),
                    };

                    const existingCurrency =
                        await this.ratesRepository.findOneBy({
                            currency,
                            bank: Bank.TENGEBANK,
                        });

                    if (existingCurrency) {
                        await this.ratesRepository.update(
                            existingCurrency.id,
                            data,
                        );
                    } else {
                        await this.ratesRepository.save(data);
                    }
                }
            };

            // Process USD, EUR, and RUB currencies
            await processCurrency(data.tenge[0].currency.USD, Currency.USD);
            await processCurrency(data.tenge[0].currency.EUR, Currency.EUR);
            await processCurrency(data.tenge[0].currency.RUB, Currency.RUB);

            console.log('Currency rates updated successfully from TengeBank');
        } catch (error) {
            console.error('Error loading TengeBank rates:', error);
        }
    }

    // Uses the previously defined fetchHayotBankRates() helper
    // Assumes enums Bank and Currency exist and this.ratesRepository is a TypeORM repo

    async loading_hayotbank() {
        try {
            const { normalized } = await fetchHayotBankRates();

            // Quick finder by alpha code (USD, EUR, etc.)
            const pick = (alpha: string) =>
                normalized.find((r) => r.currencyAlphaCode === alpha);

            const processCurrency = async (
                rate: (typeof normalized)[number] | undefined,
                currency: string,
            ) => {
                if (!rate) return;

                // Prefer bank's buy/sell; fall back to CBU when missing
                const buyNum = rate.buy ?? rate.cbu;
                const sellNum = rate.sell ?? rate.cbu;
                if (buyNum == null && sellNum == null) return;

                const data = {
                    currency,
                    bank: Bank.HAYOTBANK,
                    buy: buyNum != null ? String(buyNum) : null,
                    sell: sellNum != null ? String(sellNum) : null,
                } as const;

                const existing = await this.ratesRepository.findOneBy({
                    currency,
                    bank: Bank.HAYOTBANK,
                });

                if (existing) {
                    await this.ratesRepository.update(existing.id, data);
                } else {
                    await this.ratesRepository.save(data);
                }
            };

            // Process popular currencies available from the API
            await processCurrency(pick('USD'), Currency.USD);
            await processCurrency(pick('EUR'), Currency.EUR);
            await processCurrency(pick('RUB'), Currency.RUB);

            // bular hozircha kerak emas kerak bo'lsa keyinchalik qo'shamiz bo'lmasa shart emas
            // await processCurrency(pick('GBP'), Currency.GBP);
            // await processCurrency(pick('CHF'), Currency.CHF);
            // await processCurrency(pick('JPY'), Currency.JPY);
            // await processCurrency(pick('KZT'), Currency.KZT);

            console.log('Currency rates updated successfully from Hayotbank');
        } catch (error) {
            console.error('Error loading Hayotbank rates:', error);
        }
    }

    // Assumes fetchHamkorbankRates(), Bank enum, Currency enum, and this.ratesRepository exist

    async loading_hamkorbank() {
        try {
            // Provide cookie via env or config if required by the API (recommended)
            const { normalized } = await fetchHamkorbankRates({
                cookie: process.env.HAMKORBANK_COOKIE || '',
            });

            // Finder by alpha code (USD, EUR, RUB, ...)
            const pick = (alpha: string) =>
                normalized.find((r) => r.currencyAlphaCode === alpha);

            const processCurrency = async (
                rate: (typeof normalized)[number] | undefined,
                currency: string,
            ) => {
                if (!rate) return;

                // Prefer bank buy/sell; fall back to CBU when missing
                const buyNum = rate.buy ?? rate.cbu;
                const sellNum = rate.sell ?? rate.cbu;
                if (buyNum == null && sellNum == null) return;

                const data = {
                    currency,
                    bank: Bank.HAMKORBANK,
                    buy: buyNum != null ? String(buyNum) : null,
                    sell: sellNum != null ? String(sellNum) : null,
                } as const;

                const existing = await this.ratesRepository.findOneBy({
                    currency,
                    bank: Bank.HAMKORBANK,
                });

                if (existing) {
                    await this.ratesRepository.update(existing.id, data);
                } else {
                    await this.ratesRepository.save(data);
                }
            };

            // Process required currencies
            await processCurrency(pick('USD'), Currency.USD);
            await processCurrency(pick('EUR'), Currency.EUR);
            await processCurrency(pick('RUB'), Currency.RUB);

            // Hozircha shart emas; keyin qo‘shish mumkin:
            // await processCurrency(pick("GBP"), Currency.GBP);
            // await processCurrency(pick("CHF"), Currency.CHF);
            // await processCurrency(pick("JPY"), Currency.JPY);
            // await processCurrency(pick("KZT"), Currency.KZT);

            console.log('Currency rates updated successfully from Hamkorbank');
        } catch (error) {
            console.error('Error loading Hamkorbank rates:', error);
        }
    }

    async loading_infinbank() {
        try {
            const { office } = await fetchInfinbankOfficeRates();

            const upsert = async (
                k: 'usd' | 'eur' | 'gbp' | 'rub' | 'jpy' | 'chf',
                currency: Currency,
            ) => {
                const row = office[k];
                if (!row) return;

                const data = {
                    currency,
                    bank: Bank.INFINBANK,
                    buy: row.buy != null ? String(row.buy) : null,
                    sell: row.sell != null ? String(row.sell) : null,
                } as const;

                const existing = await this.ratesRepository.findOneBy({
                    currency,
                    bank: Bank.INFINBANK,
                });

                if (existing) {
                    await this.ratesRepository.update(
                        { id: existing.id },
                        data,
                    );
                } else {
                    await this.ratesRepository.insert(data);
                }
            };

            await Promise.all([
                upsert('usd', Currency.USD),
                upsert('eur', Currency.EUR),
                // upsert('gbp', Currency.GBP),
                upsert('rub', Currency.RUB),
                // upsert('jpy', Currency.JPY),
                // upsert('chf', Currency.CHF),
            ]);

            this.logger?.log?.('INFINBANK updated');
        } catch (error) {
            this.logger.log(error);
        }
    }

    async loading_mkbank() {
        try {
            const { office, source, officeDateISO } =
                await fetchMkbankOfficeRates();

            const upsertOne = async (alpha: Currency) => {
                const key = alpha.toLowerCase() as keyof typeof office;
                const row = office[key];
                if (!row) return;

                // Prefer bank buy/sell; fallback to CBU if missing
                const buyNum = row.buy ?? row.cbu ?? null;
                const sellNum = row.sell ?? row.cbu ?? null;
                if (buyNum == null && sellNum == null) return;

                const existing = await this.ratesRepository.findOneBy({
                    currency: alpha,
                    bank: Bank.MKBANK,
                });

                const payload: Partial<Rate> = {
                    currency: alpha,
                    bank: Bank.MKBANK,
                    buy: buyNum != null ? String(buyNum) : null,
                    sell: sellNum != null ? String(sellNum) : null,
                };

                if (existing) {
                    await this.ratesRepository.update(existing.id, payload);
                } else {
                    await this.ratesRepository.save(
                        this.ratesRepository.create(payload),
                    );
                }
            };

            await Promise.all([
                upsertOne(Currency.USD),
                upsertOne(Currency.EUR),
                // upsertOne(Currency.GBP),
                // upsertOne(Currency.JPY),
                // upsertOne(Currency.CHF),
            ]);

            // Optional: quick debug log
            // this.logger?.log?.({
            //     bank: Bank.MKBANK,
            //     source,
            //     officeDateISO,
            //     office,
            // });
        } catch (err) {
            this.logger?.error?.('loading_mkbank failed', err);
        }
    }

    async loading_tbc() {
        try {
            const { office, source, fetchedAt } =
                await fetchTbcBankOfficeRates();

            // Helper to map "usd" -> Currency.USD etc.; if missing, keep ISO upper
            const mapCurrency = (k: string): string => {
                const iso = k.toUpperCase();
                return (Currency as any)[iso] ?? iso;
            };

            for (const [isoKey, { buy, sell }] of Object.entries(office)) {
                const currency = mapCurrency(isoKey);

                // Skip empty rows
                if (buy == null && sell == null) continue;

                const existing = await this.ratesRepository.findOneBy({
                    currency,
                    bank: Bank.TBCBANK,
                });

                if (existing) {
                    existing.buy =
                        buy != null ? String(buy) : existing.buy ?? null;
                    existing.sell =
                        sell != null ? String(sell) : existing.sell ?? null;
                    await this.ratesRepository.save(existing);
                } else {
                    const row = this.ratesRepository.create({
                        currency,
                        bank: Bank.TBCBANK,
                        buy: buy != null ? String(buy) : null,
                        sell: sell != null ? String(sell) : null,
                    } as Partial<Rate>);
                    await this.ratesRepository.save(row);
                }
            }

            // Optional log
            this.logger?.log?.(
                `[TBCBANK] saved ${
                    Object.keys(office).length
                } currencies from ${source} @ ${fetchedAt}`,
            );
        } catch (err) {
            this.logger?.error?.(`[TBCBANK] load failed`, err);
            throw err;
        }
    }

    async loading_ipakyulibank() {
        const { USD, EUR, RUB } = await fetchIpakyuliUsdEurRub();

        const saveOne = async (
            code: Currency,
            rec?: {
                buy?: number | null;
                sell?: number | null;
                cb?: number | null;
            },
        ) => {
            if (!rec) return;

            const buyNum = rec.buy ?? rec.cb;
            const sellNum = rec.sell ?? rec.cb;
            if (buyNum == null && sellNum == null) return;

            const data = {
                currency: code,
                bank: Bank.IPAKYULIBANK,
                buy: buyNum != null ? String(buyNum) : null,
                sell: sellNum != null ? String(sellNum) : null,
            } as const;

            const existing = await this.ratesRepository.findOneBy({
                currency: code,
                bank: Bank.IPAKYULIBANK,
            });

            if (existing) {
                existing.buy = data.buy;
                existing.sell = data.sell;
                await this.ratesRepository.save(existing);
            } else {
                await this.ratesRepository.save(data as unknown as Rate);
            }
        };

        await Promise.all([
            saveOne(Currency.USD, USD),
            saveOne(Currency.EUR, EUR),
            saveOne(Currency.RUB, RUB),
        ]);
    }

    async loading_xb() {
        try {
            const { office } = await fetchXbuzOfficeRatesPptr();
            // office = { USD:{sell,buy}, GBP:{sell,buy}, CHF:{sell,buy}, EUR:{sell,buy}, KZT:{sell,buy}, JPY:{sell,buy} }

            const saveOne = async (
                code: Currency,
                rec?: { buy?: number | null; sell?: number | null },
            ) => {
                if (!rec) return;

                const buyNum = rec.buy ?? null;
                const sellNum = rec.sell ?? null;
                if (buyNum == null && sellNum == null) return;

                const data = {
                    currency: code,
                    bank: Bank.XBUZ, // <-- change to your actual enum member name if different
                    buy: buyNum != null ? String(buyNum) : null,
                    sell: sellNum != null ? String(sellNum) : null,
                } as const;

                const existing = await this.ratesRepository.findOneBy({
                    currency: code,
                    bank: Bank.XBUZ,
                });

                if (existing) {
                    existing.buy = data.buy;
                    existing.sell = data.sell;
                    await this.ratesRepository.save(existing);
                } else {
                    await this.ratesRepository.save(data as unknown as Rate);
                }
            };

            await Promise.all([
                saveOne(Currency.USD, office.USD),
                saveOne(Currency.EUR, office.EUR),
                // saveOne(Currency.GBP as Currency, office.GBP),
                // saveOne(Currency.CHF as Currency, office.CHF),
                // saveOne(Currency.KZT as Currency, office.KZT),
                // saveOne(Currency.JPY as Currency, office.JPY),
                // If XB.UZ later exposes RUB:
                // saveOne(Currency.RUB, office.RUB),
            ]);

            console.log('Currencies successfully fetched from XB');
        } catch (err) {
            console.error('[XB.UZ] load failed:', err);
        }
    }

    // Save only "Ayirboshlash shaxobchasi" (office) rates
    async loading_sqb() {
        try {
            const { office } = await fetchSqbExchangeRates();
            if (!office) return;

            const map: Record<string, Currency> = {
                usd: Currency.USD,
                eur: Currency.EUR,
                rub: Currency.RUB,
                // gbp: Currency.GBP,
                // chf: Currency.CHF,
                // jpy: Currency.JPY,
            };

            for (const [k, rec] of Object.entries(office)) {
                const code = map[k.toLowerCase()];
                if (!code || !rec) continue;

                // prefer explicit buy/sell; fallback to CB if one side missing
                const buyNum = rec.buy ?? rec.cb ?? null;
                const sellNum = rec.sell ?? rec.cb ?? null;
                if (buyNum == null && sellNum == null) continue;

                const row = {
                    currency: code,
                    bank: Bank.SQB,
                    buy: buyNum != null ? String(buyNum) : null,
                    sell: sellNum != null ? String(sellNum) : null,
                } as const;

                const existing = await this.ratesRepository.findOneBy({
                    currency: code,
                    bank: Bank.SQB,
                });

                if (existing) {
                    existing.buy = row.buy;
                    existing.sell = row.sell;
                    await this.ratesRepository.save(existing);
                } else {
                    await this.ratesRepository.save(row);
                }
            }
        } catch (err) {
            console.error('[SQB] load failed:', err);
        }
    }
}

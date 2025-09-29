import { Injectable } from '@nestjs/common';
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
import { fetchAsakaRatesOnceAxios } from 'src/rates/asakabank';
import { getCurrencyRatesFromBrb } from 'src/rates/BRB';
import { fetchCbuRates } from 'src/rates/cbu';
import { getDavrbankRates } from 'src/rates/davrbank';
import { getGarantBankExchangeRates } from 'src/rates/garant.bank';
import { fetchHamkorbankRates } from 'src/rates/hamkorbank';
import { fetchHayotBankRates } from 'src/rates/hayotbank';
import { getKdbExchangeRates } from 'src/rates/kdb.bank';
import { getNbuExchangeRates } from 'src/rates/nbu';
import { getOctobankRates } from 'src/rates/octobank';
import { getExchangeRates } from 'src/rates/poytaxtbank';
import { fetchTengeBankRates } from 'src/rates/tengebank';
import { generateRatesImageAllCurrencies } from 'src/rates/utils/enhanced_currency_generator';
import { Bank, Currency } from 'src/rates/utils/enums';
import { Rate } from 'src/users/entities/rates.entity';
import { Telegraf } from 'telegraf';
import { Repository } from 'typeorm';

dotenv.config();
// const execPromise = promisify(exec);

@Injectable()
export class TaskServiceService {
    constructor(
        @InjectBot('bot') private readonly bot: Telegraf<Context>,
        @InjectRepository(Rate)
        private readonly ratesRepository: Repository<Rate>,
    ) {}

    private getBackupCommand(filePath: string): string {
        const host = process.env.DB_HOST || 'genix-postgres'; // Change 'db' to your PostgreSQL service name in Docker
        const user = process.env.DB_USER || 'genix';
        const db = process.env.DB_NAME || 'genix';

        return `PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -h ${host} -U ${user} -d ${db} -c > ${filePath}`;
    }

    private telegram_channel_id = -1001311323927;

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

    @Cron(CronExpression.EVERY_SECOND)
    async every_second() {
        const date = new Date();
        // await this.bot.telegram.sendMessage(1411561011, 'Hello Utkir');
        console.log(date.toLocaleString());
    }

    escapeHtml(s: string) {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    @Cron(CronExpression.EVERY_HOUR)
    async every_minutes() {
        const chatId = this.telegram_channel_id;

        const escapeHtml = (s: string) =>
            String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

        const fmt = (v: unknown) => {
            const n = Number(v);
            return Number.isFinite(n) ? n.toFixed(2) : '-';
        };

        try {
            await this.loading_banks();

            const usdRates = await this.ratesRepository.find({
                where: { currency: Currency.USD },
                order: { bank: 'ASC' },
            });

            // Build monospace table (for <pre>)
            const header = `Bank name                 | Sell / Buy`;
            const sep = `----------------------------------------`;
            const rows: string[] = [];

            for (const r of usdRates ?? []) {
                const bank = String(r.bank ?? 'Unknown');
                const sell = fmt(r.sell);
                const buy = fmt(r.buy);
                const bankCell =
                    bank.length > 24 ? bank.slice(0, 24) : bank.padEnd(24, ' ');
                rows.push(`${bankCell} |\t ${sell} / ${buy}`);
            }

            const tableText = usdRates?.length
                ? `${header}\n${sep}\n${rows.join('\n')}`
                : `No USD data available yet.`;

            // ======= 1) Send PHOTO generated from rates via canvas =======
            try {
                // map your entity to the image generator Rate type
                const imgRates: any[] = (usdRates ?? []).map((r) => ({
                    currency: String(r.currency).toLowerCase(),
                    bank: String(r.bank),
                    sell: r.sell ?? '-',
                    buy: r.buy ?? '-',
                }));

                const { filePath } = await generateRatesImageAllCurrencies(
                    imgRates,
                    {
                        format: 'png',
                        outputDir: path.resolve(process.cwd(), 'images'),
                        // optional title overrides:
                        // titleLine1: 'Актуальный обменный',
                        // titleLine2: 'курс в банках Узбекистана',
                    },
                );

                await this.bot.telegram.sendPhoto(chatId, {
                    source: fs.createReadStream(filePath),
                });

                // best-effort cleanup
                fs.promises.unlink(filePath).catch(() => {
                    console.log('smth');
                });
            } catch (photoErr) {
                console.error('Failed to generate/send photo:', photoErr);
            }

            // ======= 2) Send TEXT message (HTML + <pre>) =======
            const htmlPre = escapeHtml(tableText);
            const textMessage = `<b>💵 USD kurslari</b>\n<pre>${htmlPre}</pre>`;

            await this.bot.telegram.sendMessage(chatId, textMessage, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            });
        } catch (err) {
            console.error('every_minutes cron error:', err);
        }
    }

    async loading_banks() {
        // load cbu
        await this.loading_cbu();

        // loading aloqabank
        await this.loading_aloqabank();

        // loading anorbank
        await this.loading_anorbank();

        //loading davrbank
        await this.loading_davrbank();

        await this.loading_garantbank(); // bunda sell rate va buy rate ni aniq qilish kerak bo'lmasa hammasini bir xil qilib qo'yayabdi

        // await this.loading_ipakyolibank(); // ishlamadi bu ham, [] data keldi

        // await this.loading_ipotekabank();  // data kelmadi axiosda error deb chiqdi qayta ko'rish kerak ai bilan

        await this.loading_kdb();

        await this.loading_nbu(); // buy rate da muammo bor chiqmayapti

        await this.loading_octobank();

        await this.loading_poytaxtbank();

        await this.loading_agrobank();

        // await this.loading_asakabank(); // bunda request qilganida muammo bo'ldi // manimcha header da origin qilib o'zini saytini berish kerak

        await this.loading_brb();

        await this.loading_tengebank();

        await this.loading_hayotbank();

        await this.loading_hamkorbank();
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

    async loading_garantbank() {
        try {
            const data = await getGarantBankExchangeRates(); // Assuming this is defined

            // Process USD
            const usd = data.find((rate) => rate.currency === 'USD');
            if (usd) {
                const usdData = {
                    currency: Currency.USD, // Assuming your Currency enum contains 'USD'
                    bank: Bank.GARANTBANK, // Assuming GARANTBANK is a value in the Bank enum
                    sell: usd.bankRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: usd.mobileAppRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingUsd = await this.ratesRepository.findOneBy({
                    currency: Currency.USD,
                    bank: Bank.GARANTBANK,
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
                    bank: Bank.GARANTBANK,
                    sell: eur.bankRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: eur.mobileAppRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingEur = await this.ratesRepository.findOneBy({
                    currency: Currency.EUR,
                    bank: Bank.GARANTBANK,
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
                    bank: Bank.GARANTBANK,
                    sell: rub.bankRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: rub.mobileAppRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                };

                const existingRub = await this.ratesRepository.findOneBy({
                    currency: Currency.RUB,
                    bank: Bank.GARANTBANK,
                });

                if (existingRub) {
                    await this.ratesRepository.update(existingRub.id, rubData);
                } else {
                    await this.ratesRepository.save(rubData);
                }
            }

            console.log('Currency rates updated successfully in Garantbank');
        } catch (error) {
            console.error('Error loading Garantbank rates:', error);
        }
    }

    // async loading_ipakyolibank() {
    //     const data = await getIpakYuliExchangeRates();
    //     console.log(data);
    // }

    // async loading_ipotekabank() {
    //     const data = await getExchangeRates();
    //     console.log(data);
    // }

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
            const data = await getNbuExchangeRates(); // Assuming this function is defined

            // Filter to get the USD, EUR, and RUB currencies
            const filteredRates = data.filter((rate) =>
                ['USD', 'EUR', 'RUB'].includes(rate.currency),
            );

            // Process USD
            const usd = filteredRates.find((rate) => rate.currency === 'USD');
            if (usd) {
                const usdData = {
                    currency: Currency.USD, // Assuming your Currency enum contains 'USD'
                    bank: Bank.NBU, // Assuming NBU is a value in the Bank enum
                    sell: usd.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: usd.buyRate
                        ? usd.buyRate.replace(/\s/g, '').replace(',', '.')
                        : null, // Store as string
                };

                const existingUsd = await this.ratesRepository.findOneBy({
                    currency: Currency.USD,
                    bank: Bank.NBU,
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
                    bank: Bank.NBU,
                    sell: eur.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: eur.buyRate
                        ? eur.buyRate.replace(/\s/g, '').replace(',', '.')
                        : null, // Store as string
                };

                const existingEur = await this.ratesRepository.findOneBy({
                    currency: Currency.EUR,
                    bank: Bank.NBU,
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
                    bank: Bank.NBU,
                    sell: rub.sellRate.replace(/\s/g, '').replace(',', '.'), // Keep as string
                    buy: rub.buyRate
                        ? rub.buyRate.replace(/\s/g, '').replace(',', '.')
                        : null, // Store as string
                };

                const existingRub = await this.ratesRepository.findOneBy({
                    currency: Currency.RUB,
                    bank: Bank.NBU,
                });

                if (existingRub) {
                    await this.ratesRepository.update(existingRub.id, rubData);
                } else {
                    await this.ratesRepository.save(rubData);
                }
            }

            console.log('Currency rates updated successfully in NBU');
        } catch (error) {
            console.error('Error loading NBU rates:', error);
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

    async loading_asakabank() {
        const data = await fetchAsakaRatesOnceAxios();
        console.log(data);
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
                        bank: Bank.TENGBANK, // Assuming TENGBANK is a value in the Bank enum
                        buy: currencyData.buy.toString(), // Ensure the rate is a string
                        sell: currencyData.sell.toString(),
                    };

                    const existingCurrency =
                        await this.ratesRepository.findOneBy({
                            currency,
                            bank: Bank.TENGBANK,
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
}

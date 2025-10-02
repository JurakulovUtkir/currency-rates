// admin-menu.scene.ts
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { Action, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import * as path from 'path';
import { Context } from 'src/bot/context/context';
import { scenes } from 'src/bot/utils/scenes';
import { generateRatesImageAllCurrencies } from 'src/rates/utils/enhanced_currency_generator';
import { Currency } from 'src/rates/utils/enums';
import { Rate } from 'src/users/entities/rates.entity';
import { Markup } from 'telegraf';
import { Repository } from 'typeorm';

type EditField = 'buy' | 'sell';
type AdminSession = {
    bank?: string;
    currency?: string;
    awaitingField?: EditField | null; // which field we’re about to edit (after tapping Edit Buy/Sell)
};

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

function getAdminSession(ctx: Context): AdminSession {
    const sess: any = (ctx as any).session ?? ((ctx as any).session = {});
    if (!sess.admin) sess.admin = {};
    return sess.admin as AdminSession;
}

@Scene(scenes.ADMIN_MENU)
export class AdminMenuScene {
    constructor(
        @InjectRepository(Rate)
        private readonly ratesRepository: Repository<Rate>,
    ) {}

    // ========== STEP 1: list all banks ==========
    @SceneEnter()
    async start(@Ctx() ctx: Context) {
        const admin = getAdminSession(ctx);
        admin.bank = undefined;
        admin.currency = undefined;
        admin.awaitingField = null;

        await ctx.reply('Welcome to admin menu');
        await this.showBanks(ctx);
    }

    private async showBanks(ctx: Context) {
        const rows = await this.ratesRepository
            .createQueryBuilder('r')
            .select('r.bank', 'bank')
            .where('r.bank IS NOT NULL')
            .groupBy('r.bank')
            .orderBy('r.bank', 'ASC')
            .getRawMany<{ bank: string }>();

        const banks = rows.map((r) => r.bank).filter(Boolean);
        if (banks.length === 0) {
            await ctx.reply('Hali bank maʼlumotlari yo‘q.');
            return;
        }

        const buttons = banks.map((b) =>
            Markup.button.callback(b, `bank:${encodeURIComponent(b)}`),
        );
        await ctx.reply(
            'Bankni tanlang:',
            Markup.inlineKeyboard(chunk(buttons, 2)),
        );
    }

    // ========== STEP 2: pick a bank -> list its currencies ==========
    @Action(/^bank:/)
    async chooseBank(@Ctx() ctx: Context) {
        try {
            // delete message after action
            await ctx.deleteMessage();
            await ctx.answerCbQuery('Selecting bank');

            const data = (ctx.callbackQuery as any)?.data as string;
            const bank = decodeURIComponent(data.split(':')[1] ?? '');
            const admin = getAdminSession(ctx);
            admin.bank = bank;
            admin.currency = undefined;
            admin.awaitingField = null;

            // fetch distinct currencies for this bank
            const rows = await this.ratesRepository
                .createQueryBuilder('r')
                .select('r.currency', 'currency')
                .where('r.bank = :bank', { bank })
                .groupBy('r.currency')
                .orderBy('r.currency', 'ASC')
                .getRawMany<{ currency: string }>();

            const currencies = rows.map((r) => r.currency).filter(Boolean);
            if (currencies.length === 0) {
                await ctx.answerCbQuery();
                await ctx.reply(`"${bank}" uchun valyuta topilmadi.`);
                return;
            }

            const buttons = currencies.map((c) =>
                Markup.button.callback(
                    c,
                    `cur:${encodeURIComponent(bank)}:${encodeURIComponent(c)}`,
                ),
            );
            const back = Markup.button.callback(
                '⬅️ Banklarga qaytish',
                'back:banks',
            );
            await ctx.answerCbQuery();
            await ctx.reply(
                `Bank: ${bank}\nValyutani tanlang:`,
                Markup.inlineKeyboard([...chunk(buttons, 3), [back]]),
            );
        } catch {
            await ctx.answerCbQuery();
        }
    }

    // Back to banks
    @Action('back:banks')
    async backToBanks(@Ctx() ctx: Context) {
        const admin = getAdminSession(ctx);
        admin.bank = undefined;
        admin.currency = undefined;
        admin.awaitingField = null;
        await ctx.answerCbQuery();
        await this.showBanks(ctx);
    }

    // ========== STEP 3: pick a currency -> show current values, ask what to edit ==========
    @Action(/^cur:/)
    async chooseCurrency(@Ctx() ctx: Context) {
        try {
            // delete message after action
            await ctx.deleteMessage();
            await ctx.answerCbQuery('Selecting currency');

            const data = (ctx.callbackQuery as any)?.data as string;
            const [, bankEnc, curEnc] = data.split(':');
            const bank = decodeURIComponent(bankEnc ?? '');
            const currency = decodeURIComponent(curEnc ?? '');

            const admin = getAdminSession(ctx);
            admin.bank = bank;
            admin.currency = currency;
            admin.awaitingField = null;

            const rate = await this.ratesRepository.findOne({
                where: { bank, currency },
            });

            const buy = rate?.buy ?? null;
            const sell = rate?.sell ?? null;

            const msg =
                `Bank: ${bank}\n` +
                `Valyuta: ${currency}\n` +
                `Hozirgi qiymatlar:\n` +
                ` • Buy: ${buy ?? '-'}\n` +
                ` • Sell: ${sell ?? '-'}`;

            const kb = Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '✏️ Edit Buy',
                        `edit:buy:${encodeURIComponent(
                            bank,
                        )}:${encodeURIComponent(currency)}`,
                    ),
                    Markup.button.callback(
                        '✏️ Edit Sell',
                        `edit:sell:${encodeURIComponent(
                            bank,
                        )}:${encodeURIComponent(currency)}`,
                    ),
                ],
                [
                    Markup.button.callback(
                        '⬅️ Valyutalarga qaytish',
                        `bank:${encodeURIComponent(bank)}`,
                    ),
                ],
                [Markup.button.callback('⬅️ Banklarga qaytish', 'back:banks')],
            ]);

            await ctx.answerCbQuery();
            await ctx.reply(msg, kb);
        } catch {
            await ctx.answerCbQuery();
        }
    }

    // ========== STEP 4: choose which field to edit (buy/sell) ==========
    @Action(/^edit:(buy|sell):/)
    async beginEdit(@Ctx() ctx: Context) {
        try {
            // delete message after action
            await ctx.deleteMessage();
            await ctx.answerCbQuery('Editing buy|sell');

            const data = (ctx.callbackQuery as any)?.data as string;
            const [, field, bankEnc, curEnc] = data.split(':');
            const bank = decodeURIComponent(bankEnc ?? '');
            const currency = decodeURIComponent(curEnc ?? '');
            const editField = (field as EditField) ?? 'buy';

            const admin = getAdminSession(ctx);
            admin.bank = bank;
            admin.currency = currency;
            admin.awaitingField = editField;

            await ctx.answerCbQuery();
            await ctx.reply(
                `Bank: ${bank}\nValyuta: ${currency}\n` +
                    `Iltimos, yangi ${editField.toUpperCase()} qiymatini yuboring (faqat raqam, masalan: 12345.67).`,
            );
        } catch {
            await ctx.answerCbQuery();
        }
    }

    @Action('generate-photo')
    async generatePhoto(ctx: Context) {
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

                const chatId = ctx.chat.id;

                await ctx.telegram.sendPhoto(chatId, {
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

            // await this.bot.telegram.sendMessage(chatId, textMessage, {
            //     parse_mode: 'HTML',
            //     disable_web_page_preview: true,
            // });
        } catch (err) {
            console.error('every_minutes cron error:', err);
        }
    }

    // ========== STEP 5: receive the new value and update DB ==========
    @On('text')
    async onText(@Ctx() ctx: Context) {
        const admin = getAdminSession(ctx);
        if (!admin.awaitingField || !admin.bank || !admin.currency) {
            return; // not in edit mode; ignore or handle other chat logic here
        }

        const raw = String((ctx.message as any)?.text ?? '')
            .trim()
            .replace(',', '.');
        const num = Number(raw);
        if (!Number.isFinite(num)) {
            await ctx.reply(
                'Noto‘g‘ri qiymat. Iltimos, faqat raqam yuboring, masalan: 12345.67',
            );
            return;
        }

        const rate = await this.ratesRepository.findOne({
            where: { bank: admin.bank, currency: admin.currency },
        });

        if (!rate) {
            await ctx.reply('Xatolik: ushbu bank/valyuta topilmadi.');
            admin.awaitingField = null;
            return;
        }

        if (admin.awaitingField === 'buy') {
            rate.buy = String(num);
        } else {
            rate.sell = String(num);
        }
        await this.ratesRepository.save(rate);

        const doneField = admin.awaitingField.toUpperCase();
        admin.awaitingField = null;

        await ctx.reply(
            `✅ Yangilandi.\nBank: ${admin.bank}\nValyuta: ${admin.currency}\n` +
                `${doneField}: ${num}`,
            Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '✏️ Edit Buy',
                        `edit:buy:${encodeURIComponent(
                            admin.bank,
                        )}:${encodeURIComponent(admin.currency)}`,
                    ),
                    Markup.button.callback(
                        '✏️ Edit Sell',
                        `edit:sell:${encodeURIComponent(
                            admin.bank,
                        )}:${encodeURIComponent(admin.currency)}`,
                    ),
                ],
                [
                    Markup.button.callback(
                        '⬅️ Valyutalarga qaytish',
                        `bank:${encodeURIComponent(admin.bank)}`,
                    ),
                ],
                [Markup.button.callback('⬅️ Banklarga qaytish', 'back:banks')],
                [
                    Markup.button.callback(
                        '📷 Rasm generatsiya qilish',
                        'generate-photo',
                    ),
                ],
            ]),
        );
    }
}

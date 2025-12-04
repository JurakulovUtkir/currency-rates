// best-rates-image.ts
import type { CanvasRenderingContext2D as NodeCanvasRenderingContext2D } from 'canvas';
import { createCanvas } from 'canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

export interface Rate {
    id?: string;
    currency: string;
    bank: string;
    sell: string | number | null | undefined;
    buy: string | number | null | undefined;
    created_at?: string;
    updated_at?: string;
}

export interface BestRatesImageOptions {
    width?: number;
    title?: string;
    outputDir?: string;
    fileNamePrefix?: string;
    format?: 'png' | 'jpeg';
    jpegQuality?: number;
    theme?: 'light' | 'dark' | 'kommers';
    topCount?: number;
}

export interface GenerateImageResult {
    filePath: string;
    dataUrl: string;
}

type Ctx2D = NodeCanvasRenderingContext2D;

const THEMES = {
    light: {
        bg: ['#f1f5f9', '#e2e8f0'],
        panel: '#ffffff',
        border: '#e2e8f0',
        text: '#0f172a',
        textDim: '#64748b',
        primary: '#1e40af',
        secondary: '#3b82f6',
        success: '#059669',
        danger: '#dc2626',
        shadow: 'rgba(0,0,0,0.10)',
        chip: '#eef2ff',
        columnHeader: '#f8fafc',
    },
    kommers: {
        bg: ['#223078', '#2C3880'],
        panel: '#FFFFFF',
        border: '#E6EAF2',
        text: '#0F172A',
        textDim: '#64748B',
        primary: '#2C3880',
        secondary: '#3F5BD8',
        success: '#00B860',
        danger: '#EF4444',
        shadow: 'rgba(18,29,61,0.35)',
        chip: '#F4F6FF',
        columnHeader: '#F4F6FF',
    },
    dark: {
        bg: ['#0f172a', '#1e293b'],
        panel: 'rgba(30,41,59,0.9)',
        border: 'rgba(148,163,184,0.25)',
        text: '#e2e8f0',
        textDim: '#94a3b8',
        primary: '#6366f1',
        secondary: '#8b5cf6',
        success: '#10b981',
        danger: '#ef4444',
        shadow: 'rgba(0,0,0,0.45)',
        chip: 'rgba(99,102,241,0.12)',
        columnHeader: 'rgba(51,65,85,0.6)',
    },
} as const;

function num(v: unknown) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

const up = (s: string) => s.toUpperCase();
const isCbu = (b: string) => up(b) === 'MARKAZIY BANK';

export async function generateBestRatesImage(
    data: Rate[],
    opts: BestRatesImageOptions = {},
): Promise<GenerateImageResult> {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Rates array is required.');
    }

    const {
        width = 700,
        title = 'Eng yaxshi sotish va sotib olish kurslari',
        outputDir = path.resolve(process.cwd(), 'images'),
        fileNamePrefix = 'best-rates',
        format = 'png',
        jpegQuality = 0.95,
        theme = 'light',
        topCount = 5,
    } = opts;

    const colors = THEMES[theme];

    // Filter out CBU rates and only keep valid bank rates
    const bankRates = data.filter((r) => !isCbu(r.bank));

    // Get best buy rates (highest buy rates)
    const bestBuyRates = bankRates
        .map((r) => ({ ...r, buyNum: num(r.buy) }))
        .filter((r) => r.buyNum != null)
        .sort((a, b) => b.buyNum! - a.buyNum!)
        .slice(0, topCount);

    // Get best sell rates (lowest sell rates)
    const bestSellRates = bankRates
        .map((r) => ({ ...r, sellNum: num(r.sell) }))
        .filter((r) => r.sellNum != null)
        .sort((a, b) => a.sellNum! - b.sellNum!)
        .slice(0, topCount);

    const pagePad = 30;
    const containerPad = 30;
    const headerH = title ? 70 : 20;
    const columnHeaderH = 50;
    const cardH = 90;
    const cardGap = 14;
    const columnGap = 30;

    const maxRows = Math.max(bestBuyRates.length, bestSellRates.length);
    const columnW = (width - pagePad * 2 - containerPad * 2 - columnGap) / 2;

    const contentH = columnHeaderH + maxRows * cardH + (maxRows - 1) * cardGap;
    const innerHeight = headerH + contentH + 30;
    const height = innerHeight + containerPad * 2 + pagePad * 2;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d') as Ctx2D;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, colors.bg[0]);
    bg.addColorStop(1, colors.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Main container
    const cx = pagePad;
    const cy = pagePad;
    const cw = width - pagePad * 2;
    const ch = height - pagePad * 2;

    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.shadowColor = colors.shadow;
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, cx, cy, cw, ch, 18);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    roundRect(ctx, cx, cy, cw, ch, 18);
    ctx.stroke();

    let y = cy + containerPad;

    // Title and timestamp
    if (title) {
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 26px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(title, cx + containerPad, y);

        const ts = formatTimestamp(new Date());
        ctx.fillStyle = colors.textDim;
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(ts, cx + cw - containerPad, y + 6);
    }
    y += headerH;

    const leftColX = cx + containerPad;
    const rightColX = leftColX + columnW + columnGap;

    // Column headers
    // Buy column header
    ctx.fillStyle = colors.columnHeader;
    roundRect(ctx, leftColX, y, columnW, columnHeaderH, 12);
    ctx.fill();

    ctx.fillStyle = colors.success;
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        'ENG YUQORI SOTIB OLISH',
        leftColX + columnW / 2,
        y + columnHeaderH / 2,
    );

    // Sell column header
    ctx.fillStyle = colors.columnHeader;
    roundRect(ctx, rightColX, y, columnW, columnHeaderH, 12);
    ctx.fill();

    ctx.fillStyle = colors.danger;
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        'ENG PAST SOTISH',
        rightColX + columnW / 2,
        y + columnHeaderH / 2,
    );

    y += columnHeaderH + cardGap;

    // Draw cards
    for (let i = 0; i < maxRows; i++) {
        const cardY = y + i * (cardH + cardGap);

        // Buy rate card
        if (i < bestBuyRates.length) {
            const rate = bestBuyRates[i];
            drawRateCard(
                ctx,
                leftColX,
                cardY,
                columnW,
                cardH,
                rate,
                'buy',
                colors,
                theme,
            );
        }

        // Sell rate card
        if (i < bestSellRates.length) {
            const rate = bestSellRates[i];
            drawRateCard(
                ctx,
                rightColX,
                cardY,
                columnW,
                cardH,
                rate,
                'sell',
                colors,
                theme,
            );
        }
    }

    // Generate output
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const buf =
        format === 'jpeg'
            ? canvas.toBuffer('image/jpeg', { quality: jpegQuality })
            : canvas.toBuffer('image/png');

    const base64 = buf.toString('base64');
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const fileName = `${fileNamePrefix}-${Date.now()}.${ext}`;
    const filePath = path.join(outputDir, fileName);

    await mkdir(outputDir, { recursive: true });
    await writeFile(filePath, buf);

    return { filePath, dataUrl: `data:${mime};base64,${base64}` };
}

function drawRateCard(
    ctx: Ctx2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rate: any,
    type: 'buy' | 'sell',
    colors: any,
    theme: string,
) {
    // Card background
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.shadowColor = colors.shadow;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();

    // Bank name
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(rate.bank, x + 16, y + 14);

    // Currency badge
    ctx.fillStyle = colors.chip;
    const badgeW = 48;
    const badgeH = 22;
    const badgeX = x + w - badgeW - 16;
    const badgeY = y + 14;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();

    ctx.fillStyle = colors.text;
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rate.currency, badgeX + badgeW / 2, badgeY + badgeH / 2);

    // Rate value
    const rateValue = type === 'buy' ? rate.buyNum : rate.sellNum;
    ctx.fillStyle = type === 'buy' ? colors.success : colors.danger;
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(Math.round(rateValue).toLocaleString(), x + 16, y + h - 14);

    ctx.fillStyle = colors.textDim;
    ctx.font = '13px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`so'm`, x + w - 16, y + h - 14);
}

function roundRect(
    ctx: Ctx2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function formatTimestamp(d: Date) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

/*
// Usage example:
(async () => {
  const data = [
    { currency: 'USD', bank: 'Ipoteka Bank', buy: 12850, sell: 12900 },
    { currency: 'USD', bank: 'Agrobank', buy: 12840, sell: 12890 },
    // ... more rates
  ];

  const result = await generateBestRatesImage(data, {
    theme: 'kommers',
    width: 1000,
    topCount: 5
  });
  console.log(result.filePath);
})();
*/

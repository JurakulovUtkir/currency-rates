// multi-currency-image.ts
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

export interface RatesImageOptions {
    width?: number;
    title?: string;
    outputDir?: string;
    fileNamePrefix?: string;
    format?: 'png' | 'jpeg';
    jpegQuality?: number;
    theme?: 'light' | 'dark';
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
    },
} as const;

const PREFERRED_CCY_ORDER = ['USD', 'EUR', 'RUB'];

const up = (s: string) => s.toUpperCase();
const isCbu = (b: string) => up(b) === 'MARKAZIY BANK';

function groupByCurrency(data: Rate[]) {
    const g = new Map<string, { cbu?: Rate; banks: Rate[] }>();
    for (const r of data) {
        const ccy = up(r.currency ?? '');
        if (!ccy) continue;
        if (!g.has(ccy)) g.set(ccy, { banks: [] });
        const bucket = g.get(ccy)!;
        if (isCbu(r.bank)) bucket.cbu = r;
        else bucket.banks.push(r);
    }
    const ordered = Array.from(g.entries()).sort((a, b) => {
        const ia = PREFERRED_CCY_ORDER.indexOf(a[0]);
        const ib = PREFERRED_CCY_ORDER.indexOf(b[0]);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a[0].localeCompare(b[0]);
    });
    for (const [, v] of ordered)
        v.banks.sort((a, b) => a.bank.localeCompare(b.bank));
    return ordered;
}

function num(v: unknown) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

export async function generateRatesImageAllCurrencies(
    data: Rate[],
    opts: RatesImageOptions = {},
): Promise<GenerateImageResult> {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Rates array is required.');
    }

    const {
        width = 1000,
        title = 'Amaldagi kurslar (barcha valyutalar)',
        outputDir = path.resolve(process.cwd(), 'images'),
        fileNamePrefix = 'rates-all',
        format = 'png',
        jpegQuality = 0.95,
        theme = 'light',
    } = opts;

    const colors = THEMES[theme];
    const grouped = groupByCurrency(data);

    const pagePad = 30;
    const containerPad = 30;
    const headerH = title ? 70 : 20;
    const ccyHeaderH = 54;
    const cbuCardW = 250;
    const cbuCardH = 60;
    const gridGap = 18;
    const cardW = 440;
    const cardH = 96;
    const perRow = 2;

    let innerHeight = headerH;
    for (const [, bucket] of grouped) {
        const rows = Math.ceil(bucket.banks.length / perRow) || 1;
        const gridH = rows * cardH + (rows - 1) * gridGap;
        innerHeight += ccyHeaderH + 16 + gridH + 28;
    }
    const containerW = width - pagePad * 2;
    const height = innerHeight + containerPad * 2 + pagePad * 2;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d') as Ctx2D;

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, colors.bg[0]);
    bg.addColorStop(1, colors.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const cx = pagePad;
    const cy = pagePad;
    const cw = containerW;
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

    const gridX = cx + containerPad;

    for (const [ccy, bucket] of grouped) {
        const chipH = 34;
        const chipPadX = 14;

        const chipText = ccy;
        ctx.font = 'bold 16px Arial, sans-serif';
        const chipTextW = ctx.measureText(chipText).width;
        const chipW = chipTextW + chipPadX * 2;

        ctx.fillStyle = colors.chip;
        roundRect(ctx, gridX, y, chipW, chipH, 10);
        ctx.fill();

        ctx.fillStyle = colors.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(chipText, gridX + chipPadX, y + chipH / 2);

        if (bucket.cbu) {
            const cbuX = gridX + chipW + 16;
            const cbuY = y + (chipH - cbuCardH) / 2;

            ctx.save();
            ctx.fillStyle = gradient(
                ctx,
                cbuX,
                cbuY,
                cbuX + cbuCardW,
                cbuY + cbuCardH,
                [
                    [0, THEMES[theme].primary],
                    [1, THEMES[theme].secondary],
                ],
            );
            ctx.shadowColor = THEMES[theme].shadow;
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 4;
            roundRect(ctx, cbuX, cbuY, cbuCardW, cbuCardH, 12);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle =
                theme === 'dark'
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(0,0,0,0.05)';
            ctx.lineWidth = 1.5;
            roundRect(ctx, cbuX, cbuY, cbuCardW, cbuCardH, 12);
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 13px Arial, sans-serif';
            ctx.fillText(
                `Markaziy bank kursi ${ccy}`,
                cbuX + cbuCardW / 2,
                cbuY + 20,
            );

            const cbuBuy = num(bucket.cbu.buy);
            const cbuSell = num(bucket.cbu.sell);
            const cbuRate = cbuSell ?? cbuBuy ?? 0;
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 20px Arial, sans-serif';
            ctx.fillText(
                `${Math.round(cbuRate).toLocaleString()} so'm`,
                cbuX + cbuCardW / 2,
                cbuY + 42,
            );
        }

        y += ccyHeaderH;

        const banks = bucket.banks;
        const rows = Math.ceil((banks.length || 1) / 2);
        for (let i = 0; i < banks.length; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = gridX + col * (cardW + gridGap);
            const yy = y + row * (cardH + gridGap);

            ctx.save();
            ctx.fillStyle = THEMES[theme].panel;
            ctx.shadowColor = THEMES[theme].shadow;
            ctx.shadowBlur = 14;
            ctx.shadowOffsetY = 4;
            roundRect(ctx, x, yy, cardW, cardH, 14);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = THEMES[theme].border;
            ctx.lineWidth = 2;
            roundRect(ctx, x, yy, cardW, cardH, 14);
            ctx.stroke();

            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = THEMES[theme].text;
            ctx.font = 'bold 18px Arial, sans-serif';
            ctx.fillText(banks[i].bank, x + 20, yy + 18);

            const labelY = yy + 50;
            const col2 = x + 240;

            ctx.fillStyle = THEMES[theme].textDim;
            ctx.font = 'bold 12px Arial, sans-serif';
            ctx.fillText('SOTIB OLISH', x + 20, labelY);
            ctx.fillText('SOTISH', col2, labelY);

            const buy = num(banks[i].buy);
            const sell = num(banks[i].sell);

            ctx.font = 'bold 20px Arial, sans-serif';
            ctx.fillStyle = THEMES[theme].success;
            ctx.fillText(
                buy != null ? Math.round(buy).toLocaleString() : '-',
                x + 20,
                labelY + 22,
            );

            ctx.fillStyle = THEMES[theme].danger;
            ctx.fillText(
                sell != null ? Math.round(sell).toLocaleString() : '-',
                col2,
                labelY + 22,
            );

            ctx.textAlign = 'right';
            ctx.fillStyle = THEMES[theme].textDim;
            ctx.font = '14px Arial, sans-serif';
            ctx.fillText(`so'm`, x + cardW - 18, labelY + 22);
        }

        y += rows * cardH + (rows - 1) * gridGap + 28;
    }

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

/** Helpers (typed with node-canvas context) */
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

function gradient(
    ctx: Ctx2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stops: Array<[number, string]>,
) {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    for (const [p, c] of stops) g.addColorStop(p, c);
    return g;
}

function formatTimestamp(d: Date) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

/*
// Usage:
(async () => {
  const out = await generateRatesImageAllCurrencies(data, { theme: 'light', width: 1000 });
  console.log(out.filePath);
})();
*/

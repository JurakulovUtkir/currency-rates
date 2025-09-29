// image-generator.ts
import { createCanvas } from 'canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

export type Align = 'left' | 'center' | 'right';

export interface Rate {
    id?: string;
    currency: string; // e.g. "usd"
    bank: string; // e.g. "BRB" | "MARKAZIY BANK"
    sell: string | number;
    buy: string | number;
    created_at?: string;
    updated_at?: string;
}

export interface RatesImageOptions {
    // canvas + layout
    width?: number; // default 800
    height?: number; // default 600

    // header text (optional overrides)
    titleLine1?: string;
    titleLine2?: string;

    // output options
    outputDir?: string; // default: "<cwd>/images"
    fileNamePrefix?: string; // default: "rates-image"
    format?: 'png' | 'jpeg'; // default: "png"
    jpegQuality?: number; // 0..1 (only if format === "jpeg")
}

export interface GenerateImageResult {
    filePath: string; // absolute path on disk
    dataUrl: string; // data:image/...;base64,...
}

export async function generateRatesImage(
    data: Rate[],
    opts: RatesImageOptions = {},
): Promise<GenerateImageResult> {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Rates array is required.');
    }

    const {
        width = 800,
        height = 600,
        titleLine1 = 'Актуальный обменный',
        titleLine2 = 'курс в банках Узбекистана',
        outputDir = path.resolve(process.cwd(), 'images'),
        fileNamePrefix = 'rates-image',
        format = 'png',
        jpegQuality = 0.92,
    } = opts;

    // --- prep data ---
    const upper = (s: string) => s.toUpperCase();
    const cbu = data.find((d) => upper(d.bank) === 'MARKAZIY BANK');
    const cbuRate = cbu ? Number(cbu.sell) || Number(cbu.buy) || 0 : 0;

    const banks = data
        .filter((d) => upper(d.bank) !== 'MARKAZIY BANK')
        .sort((a, b) => a.bank.localeCompare(b.bank));

    // --- canvas ---
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // helpers
    const roundedRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
    ) => {
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
    };

    // background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1e3c72');
    grad.addColorStop(0.5, '#2a5298');
    grad.addColorStop(1, '#4facfe');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // glass container
    roundedRect(20, 20, width - 40, height - 40, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // header: dollar badge
    ctx.beginPath();
    ctx.arc(65, 65, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.fillStyle = '#1e3c72';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('$', 65, 73);

    // header: titles
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(titleLine1, 100, 60);
    ctx.fillText(titleLine2, 100, 82);

    // header: CBU pill
    const cbx = width - 220,
        cby = 40,
        cbw = 180,
        cbh = 60;
    roundedRect(cbx, cby, cbw, cbh, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('Курс ЦБ $1=', cbx + cbw / 2, cby + 20);

    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${cbuRate.toFixed(2)} сум`, cbx + cbw / 2, cby + 45);

    // timestamp
    const now = new Date();
    const ts = `${String(now.getDate()).padStart(2, '0')}-${String(
        now.getMonth() + 1,
    ).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(
        2,
        '0',
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    ctx.textAlign = 'left';
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(ts, 40, 130);

    // bank cards grid
    const startY = 160;
    const cardW = 360,
        cardH = 60,
        gap = 15,
        perRow = 2;

    banks.forEach((item, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const x = 40 + col * (cardW + gap);
        const y = startY + row * (cardH + gap);
        const buy = Number(item.buy);
        const sell = Number(item.sell);
        const highlight = buy > cbuRate * 0.995;

        // card
        roundedRect(x, y, cardW, cardH, 12);
        ctx.fillStyle = highlight
            ? 'rgba(255,215,0,0.20)'
            : 'rgba(255,255,255,0.15)';
        ctx.fill();
        ctx.strokeStyle = highlight
            ? 'rgba(255,215,0,0.30)'
            : 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // text
        ctx.textAlign = 'left';
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(item.bank, x + 15, y + 24);

        ctx.textAlign = 'right';
        ctx.font = '13px Arial';

        ctx.fillStyle = '#4ade80';
        ctx.fillText(`Покупка: ${Math.round(buy)}`, x + cardW - 15, y + 20);

        ctx.fillStyle = '#fb7185';
        ctx.fillText(`Продажа: ${Math.round(sell)}`, x + cardW - 15, y + 40);
    });

    // footer
    const fy = height - 100;
    roundedRect(40, fy, width - 80, 60, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('Банкоматларда янги доллар курси', width / 2, fy + 25);

    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('Новый курс доллара в банкоматах', width / 2, fy + 45);

    // output
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

    return {
        filePath,
        dataUrl: `data:${mime};base64,${base64}`,
    };
}

// --- Example usage ---
// (async () => {
//   const res = await generateRatesImage([
//     { currency: "usd", bank: "BRB", sell: "12280", buy: "12160" },
//     { currency: "usd", bank: "TENGBANK", sell: "12280", buy: "12160" },
//     { currency: "usd", bank: "MARKAZIY BANK", sell: "12219.08", buy: "12219.08" },
//   ], { format: "png" });
//   console.log("Saved at:", res.filePath);
//   // res.dataUrl -> data:image/png;base64,... (send to Telegram as Buffer if needed)
// })();

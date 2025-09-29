// enhanced-image-generator.ts
import { createCanvas } from 'canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

export type Align = 'left' | 'center' | 'right';

export interface Rate {
    id?: string;
    currency: string;
    bank: string;
    sell: string | number;
    buy: string | number;
    created_at?: string;
    updated_at?: string;
}

export interface RatesImageOptions {
    width?: number;
    height?: number;
    titleLine1?: string;
    titleLine2?: string;
    outputDir?: string;
    fileNamePrefix?: string;
    format?: 'png' | 'jpeg';
    jpegQuality?: number;
    theme?: 'professional' | 'modern' | 'classic';
    showLogo?: boolean;
}

export interface GenerateImageResult {
    filePath: string;
    dataUrl: string;
}

// Color themes
const themes = {
    professional: {
        background: ['#f8fafc', '#e2e8f0', '#cbd5e1'],
        primary: '#1e40af',
        secondary: '#3b82f6',
        accent: '#fbbf24',
        text: '#1f2937',
        textLight: '#6b7280',
        cardBg: '#ffffff',
        cardBorder: '#e5e7eb',
        success: '#10b981',
        danger: '#ef4444',
        highlight: '#fef3c7',
    },
    modern: {
        background: ['#0f172a', '#1e293b', '#334155'],
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#f59e0b',
        text: '#f8fafc',
        textLight: '#cbd5e1',
        cardBg: 'rgba(255,255,255,0.05)',
        cardBorder: 'rgba(255,255,255,0.1)',
        success: '#22c55e',
        danger: '#f87171',
        highlight: 'rgba(245,158,11,0.2)',
    },
    classic: {
        background: ['#1e3c72', '#2a5298', '#4facfe'],
        primary: '#1e3c72',
        secondary: '#2a5298',
        accent: '#ffd700',
        text: '#ffffff',
        textLight: 'rgba(255,255,255,0.9)',
        cardBg: 'rgba(255,255,255,0.15)',
        cardBorder: 'rgba(255,255,255,0.2)',
        success: '#4ade80',
        danger: '#fb7185',
        highlight: 'rgba(255,215,0,0.2)',
    },
};

export async function generateRatesImage(
    data: Rate[],
    opts: RatesImageOptions = {},
): Promise<GenerateImageResult> {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Rates array is required.');
    }

    const {
        width = 1000,
        height = 700,
        titleLine1 = 'Актуальный обменный',
        titleLine2 = 'курс в банках Узбекистана',
        outputDir = path.resolve(process.cwd(), 'images'),
        fileNamePrefix = 'rates-image',
        format = 'png',
        jpegQuality = 0.95,
        theme = 'professional',
        showLogo = true,
    } = opts;

    const colors = themes[theme];

    // Prep data
    const upper = (s: string) => s.toUpperCase();
    const cbu = data.find((d) => upper(d.bank) === 'MARKAZIY BANK');
    const cbuRate = cbu ? Number(cbu.sell) || Number(cbu.buy) || 0 : 0;

    const banks = data
        .filter((d) => upper(d.bank) !== 'MARKAZIY BANK')
        .sort((a, b) => a.bank.localeCompare(b.bank));

    // Canvas setup
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Helper functions
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

    const drawShadow = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        blur = 20,
    ) => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = blur;
        ctx.shadowOffsetY = 8;
        roundedRect(x, y, w, h, r);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fill();
        ctx.restore();
    };

    // Background
    if (theme === 'professional') {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, colors.background[0]);
        grad.addColorStop(0.5, colors.background[1]);
        grad.addColorStop(1, colors.background[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, colors.background[0]);
        grad.addColorStop(0.5, colors.background[1]);
        grad.addColorStop(1, colors.background[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    // Main container with shadow
    const containerPadding = 30;
    const containerX = containerPadding;
    const containerY = containerPadding;
    const containerW = width - containerPadding * 2;
    const containerH = height - containerPadding * 2;

    if (theme === 'professional') {
        drawShadow(containerX, containerY, containerW, containerH, 24);
    }

    roundedRect(containerX, containerY, containerW, containerH, 24);
    ctx.fillStyle = colors.cardBg;
    ctx.fill();

    if (theme !== 'modern') {
        ctx.strokeStyle = colors.cardBorder;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Header section
    const headerY = containerY + 40;
    const headerHeight = 100;

    // Currency badge with enhanced styling
    const badgeSize = 70;
    const badgeX = containerX + 50;
    const badgeY = headerY + 15;

    if (theme === 'professional') {
        // Badge shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = colors.accent;
        ctx.fill();
        ctx.restore();
    } else {
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
        const badgeGrad = ctx.createLinearGradient(
            badgeX - badgeSize / 2,
            badgeY - badgeSize / 2,
            badgeX + badgeSize / 2,
            badgeY + badgeSize / 2,
        );
        badgeGrad.addColorStop(0, colors.accent);
        badgeGrad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = badgeGrad;
        ctx.fill();
    }

    // Dollar sign
    ctx.fillStyle = theme === 'professional' ? '#1f2937' : colors.primary;
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', badgeX, badgeY);

    // Title section with better typography
    const titleX = badgeX + badgeSize + 30;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = colors.text;
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText(titleLine1, titleX, headerY + 20);

    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText(titleLine2, titleX, headerY + 55);

    // CBU rate card with enhanced styling
    const cbuCardW = 240;
    const cbuCardH = 80;
    const cbuCardX = containerX + containerW - cbuCardW - 50;
    const cbuCardY = headerY + 10;

    if (theme === 'professional') {
        drawShadow(cbuCardX, cbuCardY, cbuCardW, cbuCardH, 16, 10);
    }

    roundedRect(cbuCardX, cbuCardY, cbuCardW, cbuCardH, 16);

    if (theme === 'professional') {
        ctx.fillStyle = colors.primary;
    } else {
        const cbuGrad = ctx.createLinearGradient(
            cbuCardX,
            cbuCardY,
            cbuCardX + cbuCardW,
            cbuCardY + cbuCardH,
        );
        cbuGrad.addColorStop(0, colors.primary);
        cbuGrad.addColorStop(1, colors.secondary);
        ctx.fillStyle = cbuGrad;
    }
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = colors.textLight;
    ctx.fillText('Курс ЦБ $1=', cbuCardX + cbuCardW / 2, cbuCardY + 25);

    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = colors.accent;
    ctx.fillText(
        `${cbuRate.toLocaleString()} сум`,
        cbuCardX + cbuCardW / 2,
        cbuCardY + 50,
    );

    // Timestamp with better styling
    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, '0')}-${String(
        now.getMonth() + 1,
    ).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(
        2,
        '0',
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    const timestampY = headerY + headerHeight + 20;
    const timestampPadding = 12;
    const timestampW = 200;
    const timestampH = 32;

    roundedRect(containerX + 50, timestampY, timestampW, timestampH, 16);
    ctx.fillStyle =
        theme === 'professional' ? colors.cardBorder : 'rgba(255,255,255,0.1)';
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = colors.textLight;
    ctx.fillText(timestamp, containerX + 50 + timestampW / 2, timestampY + 20);

    // Bank cards grid with enhanced styling
    const startY = timestampY + 60;
    const cardW = 420;
    const cardH = 90;
    const gap = 20;
    const perRow = 2;
    const gridStartX = containerX + 50;

    banks.forEach((item, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const x = gridStartX + col * (cardW + gap);
        const y = startY + row * (cardH + gap);

        const buy = Number(item.buy);
        const sell = Number(item.sell);
        const highlight = buy > cbuRate * 0.995;

        // Card shadow
        if (theme === 'professional') {
            drawShadow(x, y, cardW, cardH, 16, 8);
        }

        // Card background
        roundedRect(x, y, cardW, cardH, 16);

        if (highlight) {
            ctx.fillStyle = colors.highlight;
        } else {
            ctx.fillStyle = colors.cardBg;
        }
        ctx.fill();

        // Card border
        ctx.strokeStyle = highlight ? colors.accent : colors.cardBorder;
        ctx.lineWidth = highlight ? 2 : 1;
        ctx.stroke();

        // Highlight indicator bar
        if (highlight) {
            roundedRect(x, y, cardW, 4, 2);
            ctx.fillStyle = colors.accent;
            ctx.fill();
        }

        // Bank name
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.fillStyle = colors.text;
        ctx.fillText(item.bank, x + 20, y + 20);

        // Rate labels and values with better layout
        const rateStartX = x + 20;
        const rateY = y + 50;
        const rateSpacing = 200;

        // Buy rate
        ctx.font = '12px Arial, sans-serif';
        ctx.fillStyle = colors.textLight;
        ctx.fillText('ПОКУПКА', rateStartX, rateY);

        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillStyle = colors.success;
        ctx.fillText(Math.round(buy).toLocaleString(), rateStartX, rateY + 20);

        // Sell rate
        ctx.font = '12px Arial, sans-serif';
        ctx.fillStyle = colors.textLight;
        ctx.fillText('ПРОДАЖА', rateStartX + rateSpacing, rateY);

        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillStyle = colors.danger;
        ctx.fillText(
            Math.round(sell).toLocaleString(),
            rateStartX + rateSpacing,
            rateY + 20,
        );
    });

    // Footer with enhanced styling
    const footerY = height - 140;
    const footerH = 80;
    const footerX = containerX + 50;
    const footerW = containerW - 100;

    if (theme === 'professional') {
        drawShadow(footerX, footerY, footerW, footerH, 16, 8);
    }

    roundedRect(footerX, footerY, footerW, footerH, 16);

    if (theme === 'professional') {
        ctx.fillStyle = colors.primary;
    } else {
        const footerGrad = ctx.createLinearGradient(
            footerX,
            footerY,
            footerX + footerW,
            footerY + footerH,
        );
        footerGrad.addColorStop(0, colors.primary);
        footerGrad.addColorStop(1, colors.secondary);
        ctx.fillStyle = footerGrad;
    }
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = colors.accent;
    ctx.fillText(
        'Банкоматларда янги доллар курси',
        footerX + footerW / 2,
        footerY + 30,
    );

    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = colors.textLight;
    ctx.fillText(
        'Новый курс доллара в банкоматах',
        footerX + footerW / 2,
        footerY + 55,
    );

    // Output generation
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

// Example usage with different themes
/*
(async () => {
    const sampleData = [
        { currency: "usd", bank: "ASIA ALLIANCE BANK", sell: "12280", buy: "12200" },
        { currency: "usd", bank: "ANOR BANK", sell: "12280", buy: "12160" },
        { currency: "usd", bank: "DAVR BANK", sell: "12290", buy: "12210" },
        { currency: "usd", bank: "HAMKOR BANK", sell: "12270", buy: "12150" },
        { currency: "usd", bank: "IPOTEKA BANK", sell: "12280", buy: "12180" },
        { currency: "usd", bank: "MARKAZIY BANK", sell: "12219.08", buy: "12219.08" },
    ];

    // Professional theme
    const professionalResult = await generateRatesImage(sampleData, {
        theme: 'professional',
        format: 'png',
        fileNamePrefix: 'rates-professional'
    });

    // Modern theme
    const modernResult = await generateRatesImage(sampleData, {
        theme: 'modern',
        format: 'png',
        fileNamePrefix: 'rates-modern'
    });

    // Classic theme (your original style enhanced)
    const classicResult = await generateRatesImage(sampleData, {
        theme: 'classic',
        format: 'png',
        fileNamePrefix: 'rates-classic'
    });

    console.log("Generated images:");
    console.log("Professional:", professionalResult.filePath);
    console.log("Modern:", modernResult.filePath);
    console.log("Classic:", classicResult.filePath);
})();
*/

import {SavedQuote} from '../types/library';
import {parseLinearGradient} from './colorUtils';

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function exportQuoteToPng(quote: SavedQuote): Promise<void> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const {cardConfig} = quote;

  // Background (solid or gradient)
  const parsedGrad = parseLinearGradient(cardConfig.bgGradient);
  if (parsedGrad) {
    const rad = ((parsedGrad.angle - 90) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.hypot(width, height) / 2;
    const dx = Math.cos(rad) * r;
    const dy = Math.sin(rad) * r;
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    grad.addColorStop(0, parsedGrad.stop1);
    grad.addColorStop(1, parsedGrad.stop2);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = cardConfig.bgColor || '#FAF5EC';
  }
  ctx.fillRect(0, 0, width, height);

  // Subtle paper texture
  if (cardConfig.texture === 'grain' || cardConfig.texture === 'aged') {
    ctx.fillStyle = 'rgba(110, 87, 68, 0.035)';
    for (let i = 0; i < 3600; i++) {
      const rx = (i * 197) % width;
      const ry = (i * 313) % height;
      ctx.fillRect(rx, ry, 2, 2);
    }
  } else if (cardConfig.texture === 'dots') {
    ctx.fillStyle = 'rgba(110, 87, 68, 0.14)';
    for (let x = 36; x < width; x += 36) {
      for (let y = 36; y < height; y += 36) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (cardConfig.texture === 'stars') {
    ctx.fillStyle = 'rgba(246, 224, 155, 0.55)';
    for (let i = 0; i < 90; i++) {
      const sx = (i * 227 + 40) % width;
      const sy = (i * 419 + 55) % height;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3) + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Frames
  if (cardConfig.frameStyle === 'hairline' || cardConfig.frameStyle === 'double') {
    ctx.strokeStyle = cardConfig.accentColor || '#8C5E4D';
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 2;
    ctx.strokeRect(56, 56, width - 112, height - 112);
    if (cardConfig.frameStyle === 'double') {
      ctx.lineWidth = 1;
      ctx.strokeRect(72, 72, width - 144, height - 144);
    }
    ctx.globalAlpha = 1;
  } else if (cardConfig.frameStyle === 'corners') {
    ctx.strokeStyle = cardConfig.accentColor || '#8C5E4D';
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    const m = 68;
    const len = 64;
    const corners = [
      [m, m, 1, 1],
      [width - m, m, -1, 1],
      [m, height - m, 1, -1],
      [width - m, height - m, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * len, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Decorative quotation mark
  if (cardConfig.showDecor) {
    ctx.fillStyle = cardConfig.accentColor || '#8C5E4D';
    ctx.globalAlpha = 0.26;
    ctx.font = 'italic 160px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('«', 104, 240);
    ctx.globalAlpha = 1;
  }

  // Quote body text
  const fontBase = cardConfig.fontFamily || '"Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = cardConfig.textColor || '#2E251D';
  let fontSize = quote.text.length > 260 ? 38 : quote.text.length > 140 ? 44 : 52;
  ctx.font = `500 ${fontSize}px ${fontBase}`;
  const maxW = width - 220;
  let lines = wrapLines(ctx, `«${quote.text}»`, maxW);
  if (lines.length > 12) {
    fontSize = 34;
    ctx.font = `500 ${fontSize}px ${fontBase}`;
    lines = wrapLines(ctx, `«${quote.text}»`, maxW).slice(0, 14);
  }

  const lineHeight = fontSize * 1.48;
  const blockHeight = lines.length * lineHeight;
  let startY = Math.max(290, (height - blockHeight) / 2 - 40);

  for (const line of lines) {
    ctx.fillText(line, 110, startY);
    startY += lineHeight;
  }

  // Divider line
  const footerY = height - 250;
  ctx.strokeStyle = cardConfig.accentColor || '#8C5E4D';
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(110, footerY);
  ctx.lineTo(250, footerY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Book title & Author
  ctx.fillStyle = cardConfig.textColor || '#2E251D';
  ctx.font = '600 32px "Manrope", sans-serif';
  ctx.fillText(quote.bookTitle, 110, footerY + 56, maxW);

  ctx.fillStyle = cardConfig.accentColor || '#8C5E4D';
  ctx.font = '500 24px "Manrope", sans-serif';
  ctx.fillText(`${quote.bookAuthor} · стр. ${quote.pageNumber}`, 110, footerY + 98, maxW);

  if (quote.note) {
    ctx.fillStyle = cardConfig.textColor || '#2E251D';
    ctx.globalAlpha = 0.72;
    ctx.font = 'italic 26px "Caveat", cursive';
    ctx.fillText(quote.note.slice(0, 90), 110, footerY + 148, maxW);
    ctx.globalAlpha = 1;
  }

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quote-${quote.bookTitle.slice(0, 24).replace(/\s+/g, '_')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

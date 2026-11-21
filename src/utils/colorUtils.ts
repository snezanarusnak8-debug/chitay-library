export interface RGBA {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
  a: number; // 0..1
}

export interface HSL {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

export interface HSV {
  h: number; // 0..360
  s: number; // 0..100
  v: number; // 0..100
}

export function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

export function parseColorString(input: string): RGBA {
  const raw = (input || '').trim();
  if (!raw) return {r: 200, g: 162, b: 200, a: 1};

  // #RGB or #RGBA or #RRGGBB or #RRGGBBAA
  if (raw.startsWith('#')) {
    const hex = raw.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      if ([r, g, b, a].every((n) => !Number.isNaN(n))) {
        return {r, g, b, a: Number(a.toFixed(2))};
      }
    } else if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if ([r, g, b, a].every((n) => !Number.isNaN(n))) {
        return {r, g, b, a: Number(a.toFixed(2))};
      }
    }
  }

  // rgb(...) or rgba(...)
  const rgbMatch = raw.match(
    /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
  );
  if (rgbMatch) {
    const r = clamp(Math.round(Number(rgbMatch[1])), 0, 255);
    const g = clamp(Math.round(Number(rgbMatch[2])), 0, 255);
    const b = clamp(Math.round(Number(rgbMatch[3])), 0, 255);
    let a = 1;
    if (rgbMatch[4] !== undefined) {
      a = rgbMatch[4].endsWith('%')
        ? clamp(parseFloat(rgbMatch[4]) / 100, 0, 1)
        : clamp(parseFloat(rgbMatch[4]), 0, 1);
    }
    return {r, g, b, a: Number(a.toFixed(2))};
  }

  // hsl(...) or hsla(...)
  const hslMatch = raw.match(
    /^hsla?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
  );
  if (hslMatch) {
    const h = ((Number(hslMatch[1]) % 360) + 360) % 360;
    const s = clamp(Number(hslMatch[2]), 0, 100);
    const l = clamp(Number(hslMatch[3]), 0, 100);
    let a = 1;
    if (hslMatch[4] !== undefined) {
      a = hslMatch[4].endsWith('%')
        ? clamp(parseFloat(hslMatch[4]) / 100, 0, 1)
        : clamp(parseFloat(hslMatch[4]), 0, 1);
    }
    const {r, g, b} = hslToRgb(h, s, l);
    return {r, g, b, a: Number(a.toFixed(2))};
  }

  return {r: 200, g: 162, b: 200, a: 1};
}

export function normalizeHexInput(hex: string): string | null {
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean
      .split('')
      .map((c) => c + c)
      .join('')
      .toUpperCase()}`;
  }
  return null;
}

export function rgbaToHex(rgba: RGBA, includeAlpha = false): string {
  const to2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0').toUpperCase();
  const base = `#${to2(rgba.r)}${to2(rgba.g)}${to2(rgba.b)}`;
  if (!includeAlpha || rgba.a >= 0.995) return base;
  return `${base}${to2(Math.round(clamp(rgba.a, 0, 1) * 255))}`;
}

export function rgbaToCss(rgba: RGBA): string {
  const r = clamp(Math.round(rgba.r), 0, 255);
  const g = clamp(Math.round(rgba.g), 0, 255);
  const b = clamp(Math.round(rgba.b), 0, 255);
  const a = clamp(Number(rgba.a.toFixed(2)), 0, 1);
  if (a >= 0.995) return rgbaToHex({r, g, b, a: 1});
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h: number, s: number, l: number): {r: number; g: number; b: number} {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hn < 60) {
    rp = c;
    gp = x;
  } else if (hn < 120) {
    rp = x;
    gp = c;
  } else if (hn < 180) {
    gp = c;
    bp = x;
  } else if (hn < 240) {
    gp = x;
    bp = c;
  } else if (hn < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return {
    h: Math.round(h),
    s: Math.round(s),
    v: Math.round(v),
  };
}

export function hsvToRgb(h: number, s: number, v: number): {r: number; g: number; b: number} {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = vn - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hn < 60) {
    rp = c;
    gp = x;
  } else if (hn < 120) {
    rp = x;
    gp = c;
  } else if (hn < 180) {
    gp = c;
    bp = x;
  } else if (hn < 240) {
    gp = x;
    bp = c;
  } else if (hn < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

export function getColorLuminance(color: string): number {
  const {r, g, b} = parseColorString(color);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function getReadableTextColor(bgColor: string): string {
  const {r, g, b, a} = parseColorString(bgColor);
  if (a < 0.45) return '#2C241E';
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.58 ? '#231D18' : '#F8F5F0';
}

export function buildLinearGradient(angle: number, stop1: string, stop2: string): string {
  return `linear-gradient(${Math.round(clamp(angle, 0, 360))}deg, ${stop1} 0%, ${stop2} 100%)`;
}

export function parseLinearGradient(
  css?: string
): {angle: number; stop1: string; stop2: string} | null {
  if (!css || !css.includes('linear-gradient')) return null;
  const inner = css.match(/linear-gradient\((.+)\)/i)?.[1];
  if (!inner) return null;
  const parts = inner.split(/,(?![^(]*\))/).map((p) => p.trim());
  if (parts.length < 3) return null;
  const angle = parseInt(parts[0], 10);
  const stop1 = parts[1].replace(/\s+\d+%$/, '').trim();
  const stop2 = parts[2].replace(/\s+\d+%$/, '').trim();
  return {
    angle: Number.isFinite(angle) ? angle : 135,
    stop1,
    stop2,
  };
}

export async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export const CHECKERBOARD_BG =
  'repeating-conic-gradient(rgba(120,110,100,0.16) 0% 25%, transparent 0% 50%) 0 0 / 12px 12px';

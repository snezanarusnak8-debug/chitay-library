import {CustomFont} from '../types/library';

const loadedFonts = new Set<string>();

export function getFontCssName(font: CustomFont): string {
  return `VellumCustom_${font.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

export async function registerCustomFont(font: CustomFont): Promise<string> {
  const familyName = getFontCssName(font);
  if (loadedFonts.has(familyName)) {
    return `'${familyName}', serif`;
  }
  try {
    const face = new FontFace(familyName, `url(${font.dataUrl})`);
    const loaded = await face.load();
    document.fonts.add(loaded);
    loadedFonts.add(familyName);
    return `'${familyName}', serif`;
  } catch (err) {
    console.warn('Не удалось загрузить пользовательский шрифт:', font.name, err);
    return "'Lora', Georgia, serif";
  }
}

export async function registerAllCustomFonts(fonts: CustomFont[]): Promise<void> {
  await Promise.all(fonts.map((f) => registerCustomFont(f)));
}

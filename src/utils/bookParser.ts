import DOMPurify from 'dompurify';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {Book, BookChapter, BookContent, BookFormat, BookPage, TocItem} from '../types/library';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedBookResult {
  book: Book;
  content: BookContent;
}

export interface ParseProgressOptions {
  onProgress?: (percent: number, stage: string) => void;
  signal?: AbortSignal;
}

export class ImportAbortedError extends Error {
  constructor() {
    super('Импорт отменён пользователем');
    this.name = 'ImportAbortedError';
  }
}

const SUPPORTED_BOOK_REGEX = /\.(epub|pdf|fb2|mobi|azw|azw3|txt|doc|docx|rtf|html?|cbz|cbr|zip)$/i;

export function isSupportedBookFileName(fileName: string): boolean {
  return SUPPORTED_BOOK_REGEX.test(fileName.trim());
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new ImportAbortedError();
  }
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const CHARS_PER_PAGE = 1850;

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanFileNameTitle(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COVER_THEMES = [
  {bg1: '#EDE2D0', bg2: '#D8C5AA', accent: '#7D4E38', text: '#2E2219'},
  {bg1: '#E5D3D6', bg2: '#CFAEB4', accent: '#763B48', text: '#321E23'},
  {bg1: '#DCE4D6', bg2: '#BBC9B3', accent: '#3F5D46', text: '#1E2C21'},
  {bg1: '#D8E0EA', bg2: '#B5C5D6', accent: '#344F6D', text: '#1A2633'},
  {bg1: '#E4DCF0', bg2: '#C7BBE0', accent: '#54437A', text: '#251D38'},
  {bg1: '#27221E', bg2: '#1A1613', accent: '#C6A36B', text: '#F4ECE1'},
];

export function generateBookCoverDataUrl(title: string, author: string, format: BookFormat): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  const palette = COVER_THEMES[hash % COVER_THEMES.length];

  try {
    const w = 480;
    const h = 680;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, palette.bg1);
      grad.addColorStop(1, palette.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle paper border
      ctx.strokeStyle = palette.accent;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, w - 48, h - 48);
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1;
      ctx.strokeRect(32, 32, w - 64, h - 64);

      // Decorative motif at top
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.arc(w / 2, 108, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, 108, 4, 0, Math.PI * 2);
      ctx.fill();

      // Format label
      ctx.globalAlpha = 0.75;
      ctx.font = '600 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = palette.accent;
      ctx.fillText(format, w / 2, 68);

      // Title wrapping
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.text;
      ctx.font = '600 38px Georgia, "Times New Roman", serif';
      const words = (title || 'Без названия').split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > w - 108 && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      const visibleLines = lines.slice(0, 6);
      const lineHeight = 48;
      const startY = Math.max(195, h / 2 - (visibleLines.length * lineHeight) / 2);
      visibleLines.forEach((ln, idx) => {
        ctx.fillText(ln, w / 2, startY + idx * lineHeight);
      });

      // Divider
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = palette.accent;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 48, h - 135);
      ctx.lineTo(w / 2 + 48, h - 135);
      ctx.stroke();

      // Author
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = palette.text;
      ctx.font = '500 21px Georgia, "Times New Roman", serif';
      const safeAuthor = (author || 'Неизвестный автор').slice(0, 36);
      ctx.fillText(safeAuthor, w / 2, h - 94);

      return canvas.toDataURL('image/jpeg', 0.86);
    }
  } catch {
    // Fallback to clean SVG data URL
  }

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="680" viewBox="0 0 480 680"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${palette.bg1}"/><stop offset="100%" stop-color="${palette.bg2}"/></linearGradient></defs><rect width="480" height="680" fill="url(#g)"/><rect x="24" y="24" width="432" height="632" fill="none" stroke="${palette.accent}" stroke-opacity="0.35" stroke-width="2"/><text x="240" y="72" text-anchor="middle" fill="${palette.accent}" font-family="sans-serif" font-size="16" font-weight="600">${esc(format)}</text><text x="240" y="320" text-anchor="middle" fill="${palette.text}" font-family="Georgia,serif" font-size="30" font-weight="600">${esc((title || 'Книга').slice(0, 26))}</text><text x="240" y="590" text-anchor="middle" fill="${palette.text}" fill-opacity="0.8" font-family="Georgia,serif" font-size="20">${esc((author || 'Автор').slice(0, 30))}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function decodeTextSmart(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Check UTF-8 BOM or UTF-16 BOM
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes);
  }
  const utf8 = new TextDecoder('utf-8', {fatal: false}).decode(bytes);
  // Heuristic: if many replacement characters appear, fallback to windows-1251 (Cyrillic)
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  if (replacementCount > 6) {
    try {
      return new TextDecoder('windows-1251').decode(bytes);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

function htmlToParagraphs(rawHtml: string): string[] {
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'li', 'br', 'section', 'article'],
    ALLOWED_ATTR: [],
  });
  const doc = new DOMParser().parseFromString(cleanHtml, 'text/html');
  const blocks = doc.body.querySelectorAll('p, h1, h2, h3, h4, blockquote, li');
  const paras: string[] = [];
  if (blocks.length > 0) {
    blocks.forEach((el) => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) paras.push(text);
    });
  }
  if (paras.length === 0) {
    const rawText = (doc.body.textContent || '').trim();
    return rawText
      .split(/\n{2,}/)
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }
  return paras;
}

function paginateChapters(chapters: BookChapter[]): {pages: BookPage[]; toc: TocItem[]; chapters: BookChapter[]} {
  const pages: BookPage[] = [];
  const toc: TocItem[] = [];
  const updatedChapters: BookChapter[] = [];

  for (const ch of chapters) {
    const startPageIndex = pages.length;
    toc.push({
      id: ch.id,
      title: ch.title,
      pageIndex: startPageIndex,
      level: 1,
    });

    let currentParas: string[] = [];
    let currentCharCount = 0;

    for (const para of ch.paragraphs) {
      if (para.length > CHARS_PER_PAGE * 1.15) {
        // Split very long paragraph into sentences cleanly
        if (currentParas.length > 0) {
          pages.push({
            index: pages.length,
            chapterId: ch.id,
            chapterTitle: ch.title,
            paragraphs: currentParas,
          });
          currentParas = [];
          currentCharCount = 0;
        }
        const sentences = para.match(/[^.!?]+[.!?]+(\s|$)/g) || [para];
        let chunk = '';
        for (const s of sentences) {
          if (chunk.length + s.length > CHARS_PER_PAGE && chunk.length > 0) {
            pages.push({
              index: pages.length,
              chapterId: ch.id,
              chapterTitle: ch.title,
              paragraphs: [chunk.trim()],
            });
            chunk = s;
          } else {
            chunk += s;
          }
        }
        if (chunk.trim()) {
          currentParas.push(chunk.trim());
          currentCharCount += chunk.length;
        }
        continue;
      }

      if (currentCharCount + para.length > CHARS_PER_PAGE && currentParas.length > 0) {
        pages.push({
          index: pages.length,
          chapterId: ch.id,
          chapterTitle: ch.title,
          paragraphs: currentParas,
        });
        currentParas = [para];
        currentCharCount = para.length;
      } else {
        currentParas.push(para);
        currentCharCount += para.length;
      }
    }

    if (currentParas.length > 0) {
      pages.push({
        index: pages.length,
        chapterId: ch.id,
        chapterTitle: ch.title,
        paragraphs: currentParas,
      });
    } else if (pages.length === startPageIndex) {
      pages.push({
        index: pages.length,
        chapterId: ch.id,
        chapterTitle: ch.title,
        paragraphs: ['...'],
      });
    }

    updatedChapters.push({...ch, startPageIndex});
  }

  if (pages.length === 0) {
    pages.push({
      index: 0,
      chapterId: 'ch_1',
      chapterTitle: 'Текст книги',
      paragraphs: ['Содержимое книги пустое или не содержит распознаваемого текста. Оригинальный файл сохранён в библиотеке.'],
    });
  }

  return {pages, toc, chapters: updatedChapters};
}

function splitPlainTextToChapters(text: string, fallbackTitle: string): BookChapter[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const chapterRegex = /^(глава|часть|раздел|chapter|part|book|пролог|эпилог|[IVXLCDM]+\.)\b.{0,80}$/i;

  const chapters: BookChapter[] = [];
  let currentTitle = fallbackTitle || 'Начало';
  let currentParas: string[] = [];
  let buffer = '';

  const flushBuffer = () => {
    const clean = buffer.replace(/\s+/g, ' ').trim();
    if (clean) currentParas.push(clean);
    buffer = '';
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushBuffer();
      continue;
    }
    if (chapterRegex.test(line) && (currentParas.length > 2 || chapters.length > 0)) {
      flushBuffer();
      if (currentParas.length > 0) {
        chapters.push({
          id: `ch_${chapters.length + 1}`,
          title: currentTitle,
          paragraphs: currentParas,
          startPageIndex: 0,
        });
      }
      currentTitle = line;
      currentParas = [];
    } else {
      buffer += (buffer ? ' ' : '') + line;
      if (buffer.length > 420 && /[.!?»"]$/.test(line)) {
        flushBuffer();
      }
    }
  }
  flushBuffer();
  if (currentParas.length > 0) {
    chapters.push({
      id: `ch_${chapters.length + 1}`,
      title: currentTitle,
      paragraphs: currentParas,
      startPageIndex: 0,
    });
  }
  if (chapters.length === 0) {
    chapters.push({
      id: 'ch_1',
      title: fallbackTitle || 'Страница 1',
      paragraphs: [normalized.trim() || 'Пустой файл'],
      startPageIndex: 0,
    });
  }
  return chapters;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function parseEpub(buffer: ArrayBuffer, fileName: string): Promise<{
  title: string;
  author: string;
  description: string;
  coverDataUrl?: string;
  chapters: BookChapter[];
}> {
  const zip = await JSZip.loadAsync(buffer);
  const containerFile = zip.file('META-INF/container.xml');
  let opfPath = '';
  if (containerFile) {
    const containerXml = await containerFile.async('string');
    const cDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
    opfPath = cDoc.querySelector('rootfile')?.getAttribute('full-path') || '';
  }
  if (!opfPath) {
    const opfEntry = Object.keys(zip.files).find((k) => k.endsWith('.opf'));
    opfPath = opfEntry || '';
  }

  let title = cleanFileNameTitle(fileName);
  let author = 'Неизвестный автор';
  let description = '';
  let coverDataUrl: string | undefined;
  const chapters: BookChapter[] = [];

  if (opfPath && zip.file(opfPath)) {
    const opfBase = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
    const opfStr = await zip.file(opfPath)!.async('string');
    const opfDoc = new DOMParser().parseFromString(opfStr, 'application/xml');

    const titleEl = opfDoc.querySelector('metadata title, dc\\:title, *|title');
    if (titleEl?.textContent?.trim()) title = titleEl.textContent.trim();

    const creatorEl = opfDoc.querySelector('metadata creator, dc\\:creator, *|creator');
    if (creatorEl?.textContent?.trim()) author = creatorEl.textContent.trim();

    const descEl = opfDoc.querySelector('metadata description, dc\\:description, *|description');
    if (descEl?.textContent?.trim()) description = descEl.textContent.trim();

    const manifestItems = new Map<string, {href: string; mediaType: string; properties: string}>();
    opfDoc.querySelectorAll('manifest > item').forEach((item) => {
      const id = item.getAttribute('id') || '';
      const href = item.getAttribute('href') || '';
      const mediaType = item.getAttribute('media-type') || '';
      const properties = item.getAttribute('properties') || '';
      if (id && href) manifestItems.set(id, {href, mediaType, properties});
    });

    // Find cover image
    let coverHref = '';
    const coverMeta = opfDoc.querySelector('meta[name="cover"]')?.getAttribute('content');
    if (coverMeta && manifestItems.has(coverMeta)) {
      coverHref = manifestItems.get(coverMeta)!.href;
    }
    if (!coverHref) {
      for (const [, val] of manifestItems) {
        if (val.properties.includes('cover-image') || /cover\.(jpe?g|png|webp)/i.test(val.href)) {
          coverHref = val.href;
          break;
        }
      }
    }
    if (coverHref) {
      const decodedHref = decodeURIComponent(coverHref);
      const coverZipFile = zip.file(opfBase + decodedHref) || zip.file(decodedHref);
      if (coverZipFile) {
        const coverBlob = await coverZipFile.async('blob');
        coverDataUrl = await blobToDataUrl(coverBlob);
      }
    }

    // Spine items
    const spineIds: string[] = [];
    opfDoc.querySelectorAll('spine > itemref').forEach((ref) => {
      const idref = ref.getAttribute('idref');
      if (idref) spineIds.push(idref);
    });

    let chIdx = 1;
    for (const idref of spineIds) {
      const item = manifestItems.get(idref);
      if (!item) continue;
      const decodedHref = decodeURIComponent(item.href);
      const entry = zip.file(opfBase + decodedHref) || zip.file(decodedHref);
      if (!entry) continue;
      const htmlStr = await entry.async('string');
      const paras = htmlToParagraphs(htmlStr);
      if (paras.length === 0) continue;
      const doc = new DOMParser().parseFromString(DOMPurify.sanitize(htmlStr), 'text/html');
      const heading = doc.querySelector('h1, h2, h3, title')?.textContent?.trim();
      chapters.push({
        id: `ch_${chIdx}`,
        title: heading && heading.length < 90 ? heading : `Глава ${chIdx}`,
        paragraphs: paras,
        startPageIndex: 0,
      });
      chIdx += 1;
    }
  }

  if (chapters.length === 0) {
    const htmlEntries = Object.keys(zip.files).filter((k) => /\.(x?html?|xml)$/i.test(k) && !k.includes('META-INF'));
    let idx = 1;
    for (const key of htmlEntries.slice(0, 80)) {
      const str = await zip.file(key)!.async('string');
      const paras = htmlToParagraphs(str);
      if (paras.length > 0) {
        chapters.push({
          id: `ch_${idx}`,
          title: `Раздел ${idx}`,
          paragraphs: paras,
          startPageIndex: 0,
        });
        idx += 1;
      }
    }
  }

  return {title, author, description, coverDataUrl, chapters};
}

async function parsePdf(
  buffer: ArrayBuffer,
  fileName: string,
  options?: ParseProgressOptions
): Promise<{
  title: string;
  author: string;
  coverDataUrl?: string;
  pages: BookPage[];
  chapters: BookChapter[];
  toc: TocItem[];
}> {
  throwIfAborted(options?.signal);
  const loadingTask = pdfjsLib.getDocument({data: new Uint8Array(buffer)});
  const pdf = await loadingTask.promise;

  let title = cleanFileNameTitle(fileName);
  let author = 'Неизвестный автор';

  try {
    const meta = await pdf.getMetadata();
    const info = meta.info as Record<string, unknown> | undefined;
    if (info?.Title && typeof info.Title === 'string' && info.Title.trim()) title = info.Title.trim();
    if (info?.Author && typeof info.Author === 'string' && info.Author.trim()) author = info.Author.trim();
  } catch {
    // ignore metadata read errors
  }

  let coverDataUrl: string | undefined;
  const pages: BookPage[] = [];
  const total = pdf.numPages;

  for (let p = 1; p <= total; p++) {
    throwIfAborted(options?.signal);
    if (p % 5 === 1 || p === total) {
      const pct = 25 + Math.round((p / Math.max(1, total)) * 55);
      options?.onProgress?.(pct, `Обработка PDF (${p} из ${total} стр.)…`);
      await yieldToMain();
    }
    const page = await pdf.getPage(p);
    // Render page 1 as cover thumbnail
    if (p === 1) {
      try {
        const viewport = page.getViewport({scale: 0.7});
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(120, Math.floor(viewport.width));
        canvas.height = Math.max(160, Math.floor(viewport.height));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({canvasContext: ctx, viewport, canvas}).promise;
          coverDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        }
      } catch {
        // ignore cover render failure
      }
    }

    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    let imageDataUrl: string | undefined;
    // If scanned PDF with almost no text, render page image fallback (up to 40 pages to keep memory light)
    if (strings.length < 25 && p <= 40) {
      try {
        const viewport = page.getViewport({scale: 1.25});
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({canvasContext: ctx, viewport, canvas}).promise;
          imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch {
        // ignore
      }
    }

    const paragraphs = strings
      ? strings
          .split(/(?<=[.!?])\s+(?=[А-ЯA-Z«"])/)
          .reduce<string[]>((acc, sentence) => {
            if (acc.length === 0 || acc[acc.length - 1].length > 360) {
              acc.push(sentence);
            } else {
              acc[acc.length - 1] += ' ' + sentence;
            }
            return acc;
          }, [])
      : ['[Изображение страницы PDF]'];

    pages.push({
      index: p - 1,
      chapterId: `pdf_p_${Math.ceil(p / 10)}`,
      chapterTitle: `Страница ${p}`,
      paragraphs,
      imageDataUrl,
    });
  }

  const toc: TocItem[] = [];
  const chapters: BookChapter[] = [];
  for (let i = 0; i < pages.length; i += 10) {
    const chId = `pdf_p_${Math.floor(i / 10) + 1}`;
    const label = `Страницы ${i + 1}–${Math.min(i + 10, pages.length)}`;
    toc.push({id: chId, title: label, pageIndex: i, level: 1});
    chapters.push({
      id: chId,
      title: label,
      paragraphs: pages.slice(i, i + 10).flatMap((p) => p.paragraphs),
      startPageIndex: i,
    });
  }

  return {title, author, coverDataUrl, pages, chapters, toc};
}

function parseFb2Xml(xmlString: string, fileName: string): {
  title: string;
  author: string;
  description: string;
  coverDataUrl?: string;
  chapters: BookChapter[];
} {
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
  const title =
    doc.querySelector('title-info > book-title')?.textContent?.trim() || cleanFileNameTitle(fileName);
  const firstName = doc.querySelector('title-info > author > first-name')?.textContent?.trim() || '';
  const lastName = doc.querySelector('title-info > author > last-name')?.textContent?.trim() || '';
  const author = [firstName, lastName].filter(Boolean).join(' ') || 'Неизвестный автор';
  const description = doc.querySelector('title-info > annotation')?.textContent?.trim() || '';

  let coverDataUrl: string | undefined;
  const coverRef = doc.querySelector('title-info > coverpage > image')?.getAttribute('l:href') ||
    doc.querySelector('title-info > coverpage > image')?.getAttribute('xlink:href') || '';
  if (coverRef) {
    const cleanRef = coverRef.replace(/^#/, '');
    const binaryEl = Array.from(doc.querySelectorAll('binary')).find((b) => b.getAttribute('id') === cleanRef);
    if (binaryEl?.textContent) {
      const mime = binaryEl.getAttribute('content-type') || 'image/jpeg';
      coverDataUrl = `data:${mime};base64,${binaryEl.textContent.replace(/\s+/g, '')}`;
    }
  }

  const chapters: BookChapter[] = [];
  const body = doc.querySelector('body');
  const sections = body ? Array.from(body.children).filter((el) => el.tagName === 'section') : [];
  const targets = sections.length > 0 ? sections : body ? [body] : [];

  targets.forEach((sec, idx) => {
    const heading = sec.querySelector(':scope > title')?.textContent?.replace(/\s+/g, ' ').trim();
    const pElements = sec.querySelectorAll('p, subtitle, v');
    const paras: string[] = [];
    pElements.forEach((p) => {
      const t = (p.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) paras.push(t);
    });
    if (paras.length > 0) {
      chapters.push({
        id: `ch_${idx + 1}`,
        title: heading || `Глава ${idx + 1}`,
        paragraphs: paras,
        startPageIndex: 0,
      });
    }
  });

  if (chapters.length === 0) {
    const fallback = (doc.body?.textContent || xmlString).replace(/<[^>]+>/g, ' ').trim();
    return {title, author, description, coverDataUrl, chapters: splitPlainTextToChapters(fallback, title)};
  }

  return {title, author, description, coverDataUrl, chapters};
}

function parseRtf(rtfText: string): string {
  // Clean RTF control groups & decode hex Cyrillic/Latin escapes
  let out = rtfText
    .replace(/\{\\\*\\[^}]+\}/g, '')
    .replace(/\\par\b/g, '\n\n')
    .replace(/\\line\b/g, '\n')
    .replace(/\\tab\b/g, '  ')
    .replace(/\\u(-?\d+)\??/g, (_, code) => {
      const n = parseInt(code, 10);
      return String.fromCharCode(n < 0 ? n + 65536 : n);
    })
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
      const b = parseInt(hex, 16);
      try {
        return new TextDecoder('windows-1251').decode(new Uint8Array([b]));
      } catch {
        return String.fromCharCode(b);
      }
    })
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
    .replace(/[{}]/g, '');
  return out.trim();
}

function decompressPalmDoc(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const byte = data[i++];
    if (byte === 0) {
      out.push(0);
    } else if (byte >= 1 && byte <= 8) {
      for (let j = 0; j < byte && i < data.length; j++) {
        out.push(data[i++]);
      }
    } else if (byte >= 0x09 && byte <= 0x7f) {
      out.push(byte);
    } else if (byte >= 0x80 && byte <= 0xbf) {
      if (i >= data.length) break;
      const next = data[i++];
      const combined = (byte << 8) | next;
      const dist = (combined >> 3) & 0x7ff;
      const len = (combined & 0x07) + 3;
      const start = out.length - dist;
      for (let j = 0; j < len; j++) {
        out.push(start + j >= 0 && start + j < out.length ? out[start + j] : 32);
      }
    } else {
      out.push(32);
      out.push(byte ^ 0x80);
    }
  }
  return new Uint8Array(out);
}

function parseMobiOrAzw(buffer: ArrayBuffer, fileName: string): {
  title: string;
  author: string;
  chapters: BookChapter[];
} {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let title = cleanFileNameTitle(fileName);
  let author = 'Неизвестный автор';

  if (bytes.length > 80) {
    // PalmDB header: numRecords at offset 76 (uint16)
    const numRecords = view.getUint16(76, false);
    const recordOffsets: number[] = [];
    for (let r = 0; r < numRecords && 78 + r * 8 + 4 <= bytes.length; r++) {
      recordOffsets.push(view.getUint32(78 + r * 8, false));
    }

    if (recordOffsets.length > 1) {
      const rec0Start = recordOffsets[0];
      const rec0End = recordOffsets[1];
      if (rec0End <= bytes.length && rec0Start + 16 < rec0End) {
        const compression = view.getUint16(rec0Start, false);
        const textRecordCount = view.getUint16(rec0Start + 8, false);
        const encoding = view.getUint32(rec0Start + 28, false);

        // Try reading title from MOBI header
        if (rec0Start + 92 < rec0End) {
          const fullNameOffset = view.getUint32(rec0Start + 84, false);
          const fullNameLen = view.getUint32(rec0Start + 88, false);
          if (fullNameOffset > 0 && fullNameLen > 0 && rec0Start + fullNameOffset + fullNameLen <= rec0End) {
            const rawTitle = bytes.slice(rec0Start + fullNameOffset, rec0Start + fullNameOffset + fullNameLen);
            const t = new TextDecoder('utf-8', {fatal: false}).decode(rawTitle).trim();
            if (t) title = t;
          }
        }

        const chunks: Uint8Array[] = [];
        const maxRec = Math.min(recordOffsets.length - 1, textRecordCount);
        for (let r = 1; r <= maxRec; r++) {
          const start = recordOffsets[r];
          const end = r + 1 < recordOffsets.length ? recordOffsets[r + 1] : bytes.length;
          if (start >= end || end > bytes.length) continue;
          const slice = bytes.slice(start, end);
          if (compression === 2) {
            chunks.push(decompressPalmDoc(slice));
          } else if (compression === 1) {
            chunks.push(slice);
          }
        }

        if (chunks.length > 0) {
          const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
          const merged = new Uint8Array(totalLen);
          let pos = 0;
          for (const c of chunks) {
            merged.set(c, pos);
            pos += c.length;
          }
          const decoderName = encoding === 1252 ? 'windows-1252' : 'utf-8';
          const decoded = new TextDecoder(decoderName, {fatal: false}).decode(merged);
          const paras = htmlToParagraphs(decoded);
          if (paras.length > 0) {
            const textJoined = paras.join('\n\n');
            return {title, author, chapters: splitPlainTextToChapters(textJoined, title)};
          }
        }
      }
    }
  }

  // Fallback for HuffCDIC / encrypted / legacy binary: extract readable text spans cleanly
  const decodedFallback = decodeTextSmart(buffer);
  const readable = decodedFallback
    .replace(/<[^>]+>/g, '\n')
    .replace(/[^\p{L}\p{N}\p{P}\s]/gu, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim();

  if (readable.length > 120) {
    return {title, author, chapters: splitPlainTextToChapters(readable, title)};
  }

  return {
    title,
    author,
    chapters: [
      {
        id: 'ch_1',
        title,
        paragraphs: [
          'Файл сохранён в вашей библиотеке в оригинальном формате. Данный файл использует сжатие HuffCDIC или DRM-защиту, поэтому для чтения рекомендуется версия без DRM (EPUB / FB2 / TXT / PDF).',
        ],
        startPageIndex: 0,
      },
    ],
  };
}

export async function parseBookFile(
  file: File,
  options?: ParseProgressOptions
): Promise<ParsedBookResult[]> {
  throwIfAborted(options?.signal);
  const lower = file.name.toLowerCase().trim();
  if (!isSupportedBookFileName(lower)) {
    const ext = lower.includes('.') ? `.${lower.split('.').pop()}` : 'без расширения';
    throw new Error(
      `Формат ${ext} не поддерживается. Доступны: EPUB, PDF, FB2, MOBI, AZW/AZW3, TXT, DOC/DOCX, RTF, HTML, CBR/CBZ, ZIP.`
    );
  }
  if (file.size === 0) {
    throw new Error(`Файл «${file.name}» пуст (0 байт)`);
  }

  options?.onProgress?.(10, 'Чтение файла с устройства…');
  await yieldToMain();
  const buffer = await file.arrayBuffer();
  throwIfAborted(options?.signal);
  options?.onProgress?.(22, 'Определение формата книги…');

  // Handle ZIP wrapper (could contain fb2, epub, txt, pdf, or comic images)
  if (lower.endsWith('.zip') && !lower.endsWith('.fb2.zip')) {
    const zip = await JSZip.loadAsync(buffer);
    throwIfAborted(options?.signal);
    const entries = Object.keys(zip.files).filter((k) => !zip.files[k].dir && !k.startsWith('__MACOSX'));
    const bookFiles = entries.filter((k) =>
      /\.(epub|pdf|fb2|txt|docx|doc|rtf|html?|mobi|azw3?|cbz)$/i.test(k)
    );
    if (bookFiles.length > 0) {
      const results: ParsedBookResult[] = [];
      for (let i = 0; i < bookFiles.length; i++) {
        throwIfAborted(options?.signal);
        const entryName = bookFiles[i];
        options?.onProgress?.(
          25 + Math.round(((i + 0.5) / bookFiles.length) * 60),
          `Распаковка книги из архива (${i + 1}/${bookFiles.length})…`
        );
        const blob = await zip.file(entryName)!.async('blob');
        const innerFile = new File([blob], entryName.split('/').pop() || entryName, {type: blob.type});
        const parsed = await parseBookFile(innerFile, {signal: options?.signal});
        results.push(...parsed);
      }
      return results;
    }
    // Check if ZIP contains comic images -> treat as CBZ
    const imgEntries = entries.filter((k) => /\.(jpe?g|png|webp|gif)$/i.test(k));
    if (imgEntries.length > 0) {
      return [await parseComicArchive(buffer, file.name, 'ZIP', options)];
    }
    throw new Error('В ZIP-архиве не найдено книг или изображений в поддерживаемых форматах.');
  }

  if (lower.endsWith('.cbz')) {
    return [await parseComicArchive(buffer, file.name, 'CBZ', options)];
  }

  if (lower.endsWith('.cbr')) {
    const cbrId = makeId('book');
    const cbrTitle = cleanFileNameTitle(file.name);
    const cbrCover = generateBookCoverDataUrl(cbrTitle, 'Комикс (CBR)', 'CBR');
    options?.onProgress?.(92, 'Сохранение выпуска CBR…');
    const cbrResult: ParsedBookResult = {
      book: {
        id: cbrId,
        title: cbrTitle,
        author: 'Комикс (CBR)',
        format: 'CBR',
        coverDataUrl: cbrCover,
        genre: 'Комикс',
        tags: ['Комикс'],
        status: 'planned',
        collections: [],
        rating: 0,
        totalPages: 1,
        currentPage: 0,
        scrollProgress: 0,
        addedAt: Date.now(),
        readingSeconds: 0,
        toc: [{id: 'ch_1', title: 'Выпуск', pageIndex: 0, level: 1}],
      },
      content: {
        bookId: cbrId,
        originalFileName: file.name,
        mimeType: file.type || 'application/x-cbr',
        originalFileData: buffer,
        chapters: [
          {
            id: 'ch_1',
            title: cbrTitle,
            paragraphs: [
              'Архив CBR (RAR) сохранён в оригинале. Для мгновенного постраничного просмотра изображений в браузере перепакуйте архив в CBZ или ZIP.',
            ],
            startPageIndex: 0,
          },
        ],
        pages: [
          {
            index: 0,
            chapterId: 'ch_1',
            chapterTitle: cbrTitle,
            paragraphs: [
              'Архив CBR (RAR) сохранён в оригинале. Для мгновенного постраничного просмотра изображений в браузере перепакуйте архив в CBZ или ZIP.',
            ],
          },
        ],
      },
    };
    return [cbrResult];
  }

  const bookId = makeId('book');
  let title = cleanFileNameTitle(file.name);
  let author = 'Неизвестный автор';
  let description = '';
  let coverDataUrl: string | undefined;
  let format: BookFormat = 'TXT';
  let chapters: BookChapter[] = [];
  let pages: BookPage[] = [];
  let toc: TocItem[] = [];

  options?.onProgress?.(35, 'Извлечение метаданных и текста…');
  await yieldToMain();
  throwIfAborted(options?.signal);

  if (lower.endsWith('.epub')) {
    format = 'EPUB';
    const res = await parseEpub(buffer, file.name);
    throwIfAborted(options?.signal);
    options?.onProgress?.(70, 'Формирование страниц и оглавления…');
    title = res.title;
    author = res.author;
    description = res.description;
    coverDataUrl = res.coverDataUrl;
    const paginated = paginateChapters(res.chapters);
    chapters = paginated.chapters;
    pages = paginated.pages;
    toc = paginated.toc;
  } else if (lower.endsWith('.pdf')) {
    format = 'PDF';
    const res = await parsePdf(buffer, file.name, options);
    throwIfAborted(options?.signal);
    title = res.title;
    author = res.author;
    coverDataUrl = res.coverDataUrl;
    pages = res.pages;
    chapters = res.chapters;
    toc = res.toc;
  } else if (lower.endsWith('.fb2') || lower.endsWith('.fb2.zip')) {
    format = 'FB2';
    let xmlStr = '';
    if (lower.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(buffer);
      const fb2Entry = Object.keys(zip.files).find((k) => k.toLowerCase().endsWith('.fb2'));
      if (fb2Entry) {
        const innerBuf = await zip.file(fb2Entry)!.async('arraybuffer');
        xmlStr = decodeTextSmart(innerBuf);
      }
    } else {
      xmlStr = decodeTextSmart(buffer);
    }
    throwIfAborted(options?.signal);
    options?.onProgress?.(65, 'Разбор глав и обложки FB2…');
    const res = parseFb2Xml(xmlStr, file.name);
    title = res.title;
    author = res.author;
    description = res.description;
    coverDataUrl = res.coverDataUrl;
    const paginated = paginateChapters(res.chapters);
    chapters = paginated.chapters;
    pages = paginated.pages;
    toc = paginated.toc;
  } else if (lower.endsWith('.docx')) {
    format = 'DOCX';
    options?.onProgress?.(55, 'Преобразование документа DOCX…');
    const result = await mammoth.convertToHtml({arrayBuffer: buffer});
    throwIfAborted(options?.signal);
    const paras = htmlToParagraphs(result.value);
    const paginated = paginateChapters(splitPlainTextToChapters(paras.join('\n\n'), title));
    chapters = paginated.chapters;
    pages = paginated.pages;
    toc = paginated.toc;
  } else if (lower.endsWith('.doc')) {
    format = 'DOC';
    const decoded = decodeTextSmart(buffer);
    const clean = decoded.replace(/[^\p{L}\p{N}\p{P}\s]/gu, ' ').replace(/\s{3,}/g, '\n\n').trim();
    const paginated = paginateChapters(splitPlainTextToChapters(clean || 'Бинарный файл DOC сохранён.', title));
    chapters = paginated.chapters;
    pages = paginated.pages;
    toc = paginated.toc;
  } else if (lower.endsWith('.rtf')) {
    format = 'RTF';
    const raw = decodeTextSmart(buffer);
    const plain = parseRtf(raw);
    const paginated = paginateChapters(splitPlainTextToChapters(plain, title));
    chapters = paginated.chapters;
    pages = paginated.pages;
    toc = paginated.toc;
  } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    format = 'HTML';
    const raw = decodeTextSmart(buffer);
    const doc = new DOMParser().parseFromString(DOMPurify.sanitize(raw), 'text/html');
    const metaTitle = doc.querySelector('title')?.textContent?.trim();
    const metaAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content')?.trim();
    if (metaTitle) title = metaTitle;
    if (metaAuthor) author = metaAuthor;
    const paras = htmlToParagraphs(raw);
    const paginated = paginateChapters(splitPlainTextToChapters(paras.join('\n\n'), title));
    chapters = paginated.chapters;
    pages = paginated.pages;
    toc = paginated.toc;
  } else if (lower.endsWith('.mobi') || lower.endsWith('.azw') || lower.endsWith('.azw3')) {
    format = lower.endsWith('.mobi') ? 'MOBI' : 'AZW3';
    options?.onProgress?.(60, `Декодирование ${format}…`);
    const res = parseMobiOrAzw(buffer, file.name);
    title = res.title;
    author = res.author;
    const paginated = paginateChapters(res.chapters);
    chapters = paginated.chapters;
    pages = paginated.pages;
    toc = paginated.toc;
  } else {
    format = 'TXT';
    options?.onProgress?.(60, 'Разбиение текста на страницы…');
    const raw = decodeTextSmart(buffer);
    const paginated = paginateChapters(splitPlainTextToChapters(raw, title));
    chapters = paginated.chapters;
    pages = paginated.pages;
    toc = paginated.toc;
  }

  throwIfAborted(options?.signal);
  if (!coverDataUrl) {
    options?.onProgress?.(85, 'Создание обложки книги…');
    await yieldToMain();
    coverDataUrl = generateBookCoverDataUrl(title, author, format);
  }
  options?.onProgress?.(94, 'Сохранение в библиотеку…');

  return [
    {
      book: {
        id: bookId,
        title,
        author,
        format,
        coverDataUrl,
        genre: 'Литература',
        tags: [format],
        status: 'planned',
        collections: [],
        rating: 0,
        totalPages: Math.max(1, pages.length),
        currentPage: 0,
        scrollProgress: 0,
        addedAt: Date.now(),
        readingSeconds: 0,
        description,
        toc,
      },
      content: {
        bookId,
        originalFileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        originalFileData: buffer,
        chapters,
        pages,
      },
    },
  ];
}

async function parseComicArchive(
  buffer: ArrayBuffer,
  fileName: string,
  format: BookFormat,
  options?: ParseProgressOptions
): Promise<ParsedBookResult> {
  throwIfAborted(options?.signal);
  const zip = await JSZip.loadAsync(buffer);
  const imgKeys = Object.keys(zip.files)
    .filter((k) => !zip.files[k].dir && /\.(jpe?g|png|webp|gif)$/i.test(k) && !k.startsWith('__MACOSX'))
    .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));

  const pages: BookPage[] = [];
  let coverDataUrl: string | undefined;

  for (let i = 0; i < imgKeys.length; i++) {
    throwIfAborted(options?.signal);
    if (i % 4 === 0 || i === imgKeys.length - 1) {
      const pct = 25 + Math.round(((i + 1) / Math.max(1, imgKeys.length)) * 65);
      options?.onProgress?.(pct, `Загрузка страниц комикса (${i + 1}/${imgKeys.length})…`);
      await yieldToMain();
    }
    const blob = await zip.file(imgKeys[i])!.async('blob');
    const dataUrl = await blobToDataUrl(blob);
    if (i === 0) coverDataUrl = dataUrl;
    pages.push({
      index: i,
      chapterId: 'comic_1',
      chapterTitle: `Страница ${i + 1}`,
      paragraphs: [],
      imageDataUrl: dataUrl,
    });
  }

  const bookId = makeId('book');
  const title = cleanFileNameTitle(fileName);
  if (!coverDataUrl) {
    coverDataUrl = generateBookCoverDataUrl(title, 'Графическая новелла', format);
  }
  return {
    book: {
      id: bookId,
      title,
      author: 'Графическая новелла',
      format,
      coverDataUrl,
      genre: 'Комикс',
      tags: ['Комикс', format],
      status: 'planned',
      collections: [],
      rating: 0,
      totalPages: Math.max(1, pages.length),
      currentPage: 0,
      scrollProgress: 0,
      addedAt: Date.now(),
      readingSeconds: 0,
      toc: [{id: 'comic_1', title: 'Все страницы', pageIndex: 0, level: 1}],
    },
    content: {
      bookId,
      originalFileName: fileName,
      mimeType: 'application/zip',
      originalFileData: buffer,
      chapters: [{id: 'comic_1', title: title, paragraphs: [], startPageIndex: 0}],
      pages:
        pages.length > 0
          ? pages
          : [{index: 0, chapterId: 'comic_1', chapterTitle: title, paragraphs: ['Изображения в архиве не найдены.']}],
      isComic: true,
    },
  };
}

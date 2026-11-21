import {
  Annotation,
  Book,
  BookJournal,
  QuizAttempt,
  SavedQuote,
  ScrapbookItem,
  SmartBookmark,
  TimelineDisplayEvent,
  TimelineEventOverride,
  TimelineLogEntry,
} from '../types/library';

export interface BuildTimelineInput {
  book: Book;
  annotations: Annotation[];
  quotes: SavedQuote[];
  smartBookmarks: SmartBookmark[];
  journal?: BookJournal;
  scrapbookItems: ScrapbookItem[];
  quizAttempts: QuizAttempt[];
  timelineLogs: TimelineLogEntry[];
  overrides: TimelineEventOverride[];
}

export function buildBookTimelineEvents(input: BuildTimelineInput): TimelineDisplayEvent[] {
  const {
    book,
    annotations,
    quotes,
    smartBookmarks,
    journal,
    scrapbookItems,
    quizAttempts,
    timelineLogs,
    overrides,
  } = input;

  const overrideMap = new Map(
    overrides.filter((o) => o.bookId === book.id).map((o) => [o.id, o])
  );

  const raw: TimelineDisplayEvent[] = [];

  // 1. Added / Started event
  const startTs = journal?.startDate
    ? new Date(journal.startDate).getTime() || book.addedAt
    : book.addedAt;
  raw.push({
    id: `tl_added_${book.id}`,
    sourceId: book.id,
    bookId: book.id,
    type: 'started',
    title: 'Книга появилась в библиотеке',
    details: `${book.title} · ${book.author} (${book.format}, ${book.totalPages} стр.)`,
    timestamp: startTs,
    pageIndex: 0,
  });

  // 2. Auto-logged reading activity (chapters, milestones, reading days, rereads, emotion/theory changes)
  for (const log of timelineLogs.filter((l) => l.bookId === book.id)) {
    raw.push({
      id: log.id,
      sourceId: log.id,
      bookId: book.id,
      type: log.type,
      title: log.title,
      details: log.details,
      timestamp: log.timestamp,
      pageIndex: log.pageIndex,
      chapterId: log.chapterId,
      chapterTitle: log.chapterTitle,
    });
  }

  // 3. Annotations
  for (const ann of annotations.filter((a) => a.bookId === book.id)) {
    raw.push({
      id: `tl_ann_${ann.id}`,
      sourceId: ann.id,
      bookId: book.id,
      type: 'annotation',
      title: ann.noteText ? 'Заметка на полях' : 'Выделение фрагмента',
      details: ann.noteText
        ? `${ann.noteText} — «${ann.quoteText.slice(0, 120)}${ann.quoteText.length > 120 ? '…' : ''}»`
        : `«${ann.quoteText.slice(0, 140)}${ann.quoteText.length > 140 ? '…' : ''}»`,
      timestamp: ann.createdAt,
      pageIndex: ann.pageIndex,
      chapterId: ann.chapterId,
      annotationId: ann.id,
    });
  }

  // 4. Quotes
  for (const qt of quotes.filter((q) => q.bookId === book.id)) {
    raw.push({
      id: `tl_quote_${qt.id}`,
      sourceId: qt.id,
      bookId: book.id,
      type: 'quote',
      title: 'Сохранена цитата',
      details: `«${qt.text.slice(0, 150)}${qt.text.length > 150 ? '…' : ''}»${qt.note ? ` (${qt.note})` : ''}`,
      timestamp: qt.createdAt,
      pageIndex: qt.pageIndex,
      quoteId: qt.id,
    });
  }

  // 5. Smart Bookmarks
  for (const bm of smartBookmarks.filter((b) => b.bookId === book.id)) {
    raw.push({
      id: `tl_bm_${bm.id}`,
      sourceId: bm.id,
      bookId: book.id,
      type: 'bookmark',
      title: `Умная закладка: ${bm.title}`,
      details: bm.note || `${bm.chapterTitle || `Страница ${bm.pageIndex + 1}`}`,
      timestamp: bm.createdAt,
      pageIndex: bm.pageIndex,
      chapterId: bm.chapterId,
      chapterTitle: bm.chapterTitle,
      bookmarkId: bm.id,
    });
  }

  // 6. Scrapbook pages (grouped by pageIndex)
  const sbByPage = new Map<number, ScrapbookItem[]>();
  for (const item of scrapbookItems.filter((s) => s.bookId === book.id)) {
    const arr = sbByPage.get(item.pageIndex) || [];
    arr.push(item);
    sbByPage.set(item.pageIndex, arr);
  }
  sbByPage.forEach((items, pIdx) => {
    const earliest = Math.min(...items.map((i) => i.createdAt));
    raw.push({
      id: `tl_sb_${book.id}_p${pIdx}`,
      sourceId: `${book.id}_${pIdx}`,
      bookId: book.id,
      type: 'scrapbook',
      title: `Оформлена Scrapbook-страница (${pIdx + 1})`,
      details: `Элементов оформления на странице: ${items.length}`,
      timestamp: earliest,
      pageIndex: pIdx,
    });
  });

  // 7. Quiz Attempts
  for (const qz of quizAttempts.filter((q) => q.bookId === book.id)) {
    raw.push({
      id: `tl_quiz_${qz.id}`,
      sourceId: qz.id,
      bookId: book.id,
      type: 'quiz',
      title: `Тест «Что я помню?» — ${qz.scorePercent}%`,
      details: `Верных ответов: ${qz.correctCount} из ${qz.totalQuestions} (${
        qz.difficulty === 'easy' ? 'лёгкий' : qz.difficulty === 'medium' ? 'средний' : 'сложный'
      } уровень)`,
      timestamp: qz.date,
      quizAttemptId: qz.id,
    });
  }

  // 8. Journal Theories & Emotions (if not already logged as separate log entry)
  if (journal) {
    if (journal.theories.trim() && !raw.some((e) => e.type === 'theory')) {
      raw.push({
        id: `tl_theory_${book.id}`,
        sourceId: book.id,
        bookId: book.id,
        type: 'theory',
        title: 'Записана теория в дневнике',
        details: journal.theories.trim().slice(0, 180),
        timestamp: journal.updatedAt,
      });
    }
    if (journal.emotions.length > 0 && !raw.some((e) => e.type === 'emotion')) {
      raw.push({
        id: `tl_emotion_${book.id}`,
        sourceId: book.id,
        bookId: book.id,
        type: 'emotion',
        title: 'Эмоции от чтения',
        details: journal.emotions.join(' · '),
        timestamp: journal.updatedAt,
      });
    }
  }

  // 9. Finished milestone if status is finished and no finished log yet
  if (book.status === 'finished' && !raw.some((e) => e.type === 'finished')) {
    const finishTs = journal?.finishDate
      ? new Date(journal.finishDate).getTime() || book.lastReadAt || Date.now()
      : book.lastReadAt || Date.now();
    raw.push({
      id: `tl_finished_${book.id}`,
      sourceId: book.id,
      bookId: book.id,
      type: 'finished',
      title: 'Книга прочитана до конца',
      details: `${book.totalPages} стр.${book.rating > 0 ? ` · Оценка: ${book.rating}/5` : ''}`,
      timestamp: finishTs,
      pageIndex: Math.max(0, book.totalPages - 1),
    });
  }

  // Apply user overrides (edit / hide / delete)
  const merged: TimelineDisplayEvent[] = [];
  for (const ev of raw) {
    const ov = overrideMap.get(ev.id);
    if (ov?.deleted) continue;
    merged.push({
      ...ev,
      title: ov?.customTitle ?? ev.title,
      details: ov?.customDetails ?? ev.details,
      timestamp: ov?.customTimestamp ?? ev.timestamp,
      hidden: ov?.hidden ?? false,
      isEdited: Boolean(ov?.customTitle || ov?.customDetails || ov?.customTimestamp),
    });
  }

  return merged.sort((a, b) => a.timestamp - b.timestamp);
}

export async function exportTimelineMemoryCardPng(options: {
  book: Book;
  events: TimelineDisplayEvent[];
  favoriteQuote?: SavedQuote;
  emotions: string[];
  bgColor: string;
  textColor: string;
  accentColor: string;
}): Promise<Blob> {
  const {book, events, favoriteQuote, emotions, bgColor, textColor, accentColor} = options;
  const w = 1080;
  const h = 1440;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle decorative border
  ctx.strokeStyle = accentColor;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, w - 96, h - 96);
  ctx.globalAlpha = 0.14;
  ctx.lineWidth = 1;
  ctx.strokeRect(62, 62, w - 124, h - 124);
  ctx.globalAlpha = 1;

  // Header kicker
  ctx.fillStyle = accentColor;
  ctx.font = '600 22px sans-serif';
  ctx.fillText('СТРАНИЦА ВОСПОМИНАНИЙ О КНИГЕ · chitay', 96, 126);

  // Title & Author
  ctx.fillStyle = textColor;
  ctx.font = '600 54px Georgia, "Times New Roman", serif';
  ctx.fillText(book.title.slice(0, 34), 96, 200);
  ctx.globalAlpha = 0.78;
  ctx.font = '400 28px Georgia, "Times New Roman", serif';
  ctx.fillText(`${book.author} · ${book.totalPages} стр.`, 96, 250);
  ctx.globalAlpha = 1;

  // Emotions line
  if (emotions.length > 0) {
    ctx.fillStyle = accentColor;
    ctx.font = '500 22px sans-serif';
    ctx.fillText(`Настроение чтения: ${emotions.slice(0, 6).join(' · ')}`, 96, 305);
  }

  // Divider
  ctx.strokeStyle = accentColor;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.moveTo(96, 336);
  ctx.lineTo(w - 96, 336);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Timeline Events (up to 7 visible milestones)
  const visibleEvents = events.filter((e) => !e.hidden).slice(0, 7);
  let y = 400;
  for (const ev of visibleEvents) {
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(112, y - 8, 7, 0, Math.PI * 2);
    ctx.fill();

    const dateStr = new Date(ev.timestamp).toLocaleDateString('ru-RU');
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = textColor;
    ctx.font = '500 18px sans-serif';
    ctx.fillText(dateStr, 140, y - 2);
    ctx.globalAlpha = 1;

    ctx.font = '600 26px Georgia, "Times New Roman", serif';
    ctx.fillText(ev.title.slice(0, 52), 270, y);

    ctx.globalAlpha = 0.78;
    ctx.font = '400 20px sans-serif';
    ctx.fillText(ev.details.slice(0, 72) + (ev.details.length > 72 ? '…' : ''), 270, y + 32);
    ctx.globalAlpha = 1;

    y += 96;
  }

  // Favorite Quote Box at bottom
  if (favoriteQuote) {
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = accentColor;
    ctx.fillRect(96, 1110, w - 192, 200);
    ctx.globalAlpha = 1;

    ctx.fillStyle = accentColor;
    ctx.font = '600 20px sans-serif';
    ctx.fillText('Любимая цитата', 128, 1154);

    ctx.fillStyle = textColor;
    ctx.font = 'italic 26px Georgia, "Times New Roman", serif';
    const qText = `«${favoriteQuote.text.slice(0, 150)}${favoriteQuote.text.length > 150 ? '…' : ''}»`;
    const words = qText.split(' ');
    let ln = '';
    let qy = 1200;
    for (const word of words) {
      const test = ln ? `${ln} ${word}` : word;
      if (ctx.measureText(test).width > w - 260 && ln) {
        ctx.fillText(ln, 128, qy);
        ln = word;
        qy += 34;
        if (qy > 1285) break;
      } else {
        ln = test;
      }
    }
    if (ln && qy <= 1285) ctx.fillText(ln, 128, qy);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Не удалось экспортировать страницу воспоминаний'));
    }, 'image/png');
  });
}

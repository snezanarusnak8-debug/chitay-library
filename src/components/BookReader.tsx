import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowLeft,
  Bookmark,
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Highlighter,
  Layers,
  ListTree,
  Maximize2,
  Minimize2,
  NotebookPen,
  Palette,
  Paperclip,
  Plus,
  Quote,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import {DEFAULT_BOOKMARK_CATEGORIES} from '../constants/bookmarks';
import {
  BUILT_IN_FONTS,
  BUILT_IN_PAGE_THEMES,
  DEFAULT_QUOTE_CARD_CONFIG,
  HIGHLIGHT_PALETTE,
  SCRAPBOOK_TEMPLATES,
} from '../constants/themes';
import {useLibrary} from '../context/LibraryContext';
import {
  Annotation,
  AnnotationStyleType,
  BookContent,
  PageFlipSpeed,
  PageTheme,
  PageTurnMode,
  ScrapbookItem,
  ScrapbookNoteItem,
  ScrapbookPhotoItem,
  SmartBookmark,
} from '../types/library';
import {getFontCssName} from '../utils/fontLoader';
import {ColorSwatchButton} from './ColorSwatchButton';
import {ScrapbookInspector} from './ScrapbookInspector';
import {DrawingBrushConfig, ScrapbookOverlay} from './ScrapbookOverlay';
import {renderBookmarkIcon, SmartBookmarkModal} from './SmartBookmarkModal';
import {getTextureClass, ThemeBuilderModal} from './ThemeBuilderModal';

interface BookReaderProps {
  bookId: string;
  initialPageIndex?: number;
  highlightAnnotationId?: string;
  onClose: () => void;
}

interface PendingSelection {
  text: string;
  paragraphIndex: number;
  rectTop: number;
  rectLeft: number;
}

export const BookReader: React.FC<BookReaderProps> = ({
  bookId,
  initialPageIndex,
  highlightAnnotationId,
  onClose,
}) => {
  const {
    books,
    annotations,
    scrapbookItems,
    smartBookmarks,
    allBookmarkCategories,
    allPageThemes,
    customFonts,
    annotationCategories,
    userColors,
    recentColors,
    settings,
    updateBook,
    getBookContent,
    saveAnnotation,
    deleteAnnotation,
    saveQuote,
    saveSmartBookmark,
    deleteSmartBookmark,
    saveScrapbookItem,
    saveScrapbookItemsBulk,
    deleteScrapbookItem,
    updateSettings,
    recordRecentColor,
    logReading,
    openBookJournal,
    openBookQuiz,
    openBookTimeline,
    showToast,
  } = useLibrary();

  const book = books.find((b) => b.id === bookId);
  const [content, setContent] = useState<BookContent | null>(null);
  const [pageIndex, setPageIndex] = useState<number>(initialPageIndex ?? book?.currentPage ?? 0);
  const [flipDir, setFlipDir] = useState<'next' | 'prev' | null>(null);

  // Panels & Modes
  const [leftDrawer, setLeftDrawer] = useState<'none' | 'toc' | 'bookmarks' | 'search'>('none');
  const [rightDrawer, setRightDrawer] = useState<'none' | 'notes' | 'typography' | 'scrapbook'>('none');
  const [scrapbookActive, setScrapbookActive] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobileChromeVisible, setMobileChromeVisible] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [rightWidth, setRightWidth] = useState(340);

  // Smart Bookmarks UI
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<SmartBookmark | null>(null);
  const [quickBmBanner, setQuickBmBanner] = useState<SmartBookmark | null>(null);
  const [bmSearch, setBmSearch] = useState('');
  const [bmTypeFilter, setBmTypeFilter] = useState('all');
  const [bmSort, setBmSort] = useState<'page' | 'date' | 'type'>('page');

  // In-book search
  const [bookSearch, setBookSearch] = useState('');

  // Selection & Annotation creation
  const [pendingSel, setPendingSel] = useState<PendingSelection | null>(null);
  const [selColor, setSelColor] = useState(HIGHLIGHT_PALETTE[0].value);
  const [selStyle, setSelStyle] = useState<AnnotationStyleType>('highlight');
  const [selCategory, setSelCategory] = useState(annotationCategories[0]?.id || 'thought');
  const [selNote, setSelNote] = useState('');
  const [selTags, setSelTags] = useState('');
  const [selSticker, setSelSticker] = useState('');
  const [selStamp, setSelStamp] = useState('');
  const [selHandwriting, setSelHandwriting] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Annotation | null>(null);
  const [pulsingAnnId, setPulsingAnnId] = useState<string | null>(highlightAnnotationId || null);

  // Scrapbook state + Undo/Redo history
  const [selectedSbIds, setSelectedSbIds] = useState<string[]>([]);
  const [lockAllMobile, setLockAllMobile] = useState(false);
  const [drawingConfig, setDrawingConfig] = useState<DrawingBrushConfig>({
    active: false,
    tool: 'pen',
    color: '#6E5744',
    width: 4,
    opacity: 0.9,
  });
  const [undoStack, setUndoStack] = useState<ScrapbookItem[][]>([]);
  const [redoStack, setRedoStack] = useState<ScrapbookItem[][]>([]);

  const pageContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{x: number; y: number} | null>(null);
  const clipPhotoInputRef = useRef<HTMLInputElement>(null);

  // Load book content from IndexedDB
  useEffect(() => {
    let active = true;
    getBookContent(bookId).then((res) => {
      if (active && res) setContent(res);
    });
    return () => {
      active = false;
    };
  }, [bookId, getBookContent]);

  useEffect(() => {
    if (initialPageIndex !== undefined) {
      setPageIndex(initialPageIndex);
    }
  }, [initialPageIndex]);

  useEffect(() => {
    if (highlightAnnotationId) {
      setPulsingAnnId(highlightAnnotationId);
      const t = setTimeout(() => setPulsingAnnId(null), 2600);
      return () => clearTimeout(t);
    }
  }, [highlightAnnotationId]);

  // Reading time tracker (every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      if (book) {
        logReading(book.id, 0, 0.5);
        updateBook({
          ...book,
          readingSeconds: (book.readingSeconds || 0) + 30,
          lastReadAt: Date.now(),
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [book, logReading, updateBook]);

  // Resolved settings & theme
  const readerCfg = useMemo(
    () => ({
      ...settings.reader,
      ...(book?.readerSettingsOverride || {}),
    }),
    [settings.reader, book?.readerSettingsOverride]
  );

  const activeThemeId = book?.pageThemeId || readerCfg.defaultPageThemeId || 'classic_paper';
  const activeTheme: PageTheme = useMemo(
    () => allPageThemes.find((t) => t.id === activeThemeId) || BUILT_IN_PAGE_THEMES[0],
    [allPageThemes, activeThemeId]
  );

  const totalPages = content?.pages.length || book?.totalPages || 1;
  const currentPage = content?.pages[Math.min(pageIndex, totalPages - 1)];

  const pageAnnotations = useMemo(
    () => annotations.filter((a) => a.bookId === bookId && a.pageIndex === pageIndex),
    [annotations, bookId, pageIndex]
  );

  const bookAnnotations = useMemo(
    () => annotations.filter((a) => a.bookId === bookId),
    [annotations, bookId]
  );

  const currentPageScrapbook = useMemo(
    () => scrapbookItems.filter((s) => s.bookId === bookId && s.pageIndex === pageIndex),
    [scrapbookItems, bookId, pageIndex]
  );

  const goToPage = useCallback(
    (nextIdx: number) => {
      const clamped = Math.max(0, Math.min(totalPages - 1, nextIdx));
      if (clamped === pageIndex) return;
      setFlipDir(clamped > pageIndex ? 'next' : 'prev');
      setPageIndex(clamped);
      setPendingSel(null);
      setSelectedSbIds([]);
      setUndoStack([]);
      setRedoStack([]);
      if (book) {
        const pct = Math.round(((clamped + 1) / Math.max(1, totalPages)) * 100);
        updateBook({
          ...book,
          currentPage: clamped,
          scrollProgress: pct,
          lastReadAt: Date.now(),
          status:
            clamped === totalPages - 1 && totalPages > 1 && book.status === 'reading'
              ? 'finished'
              : book.status === 'planned'
              ? 'reading'
              : book.status,
        });
        logReading(book.id, 1, 0);
      }
      setTimeout(() => setFlipDir(null), 500);
    },
    [book, logReading, pageIndex, totalPages, updateBook]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 'ArrowRight' && readerCfg.pageTurnMode !== 'vertical_scroll') {
        goToPage(pageIndex + 1);
      } else if (e.key === 'ArrowLeft' && readerCfg.pageTurnMode !== 'vertical_scroll') {
        goToPage(pageIndex - 1);
      } else if (e.key === 'Escape') {
        if (pendingSel) setPendingSel(null);
        else if (fullscreen) setFullscreen(false);
      } else if (e.key === 'f' || e.key === 'F') {
        setFullscreen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, goToPage, pageIndex, pendingSel, readerCfg.pageTurnMode]);

  const bookSmartBookmarks = useMemo(
    () => smartBookmarks.filter((bm) => bm.bookId === bookId),
    [smartBookmarks, bookId]
  );

  const pageSmartBookmarks = useMemo(
    () => bookSmartBookmarks.filter((bm) => bm.pageIndex === pageIndex),
    [bookSmartBookmarks, pageIndex]
  );

  const filteredBookSmartBookmarks = useMemo(() => {
    let list = [...bookSmartBookmarks];
    if (bmTypeFilter !== 'all') list = list.filter((b) => b.type === bmTypeFilter);
    if (bmSearch.trim()) {
      const q = bmSearch.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.note.toLowerCase().includes(q) ||
          (b.characterName || '').toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      if (bmSort === 'date') return b.createdAt - a.createdAt;
      if (bmSort === 'type') return a.type.localeCompare(b.type);
      return a.pageIndex - b.pageIndex;
    });
    return list;
  }, [bookSmartBookmarks, bmTypeFilter, bmSearch, bmSort]);

  const toggleBookmark = async () => {
    if (!book) return;
    const existingOnPage = pageSmartBookmarks[0];
    if (existingOnPage) {
      setEditingBookmark(existingOnPage);
      setShowBookmarkModal(true);
      return;
    }
    const defCat = DEFAULT_BOOKMARK_CATEGORIES[0];
    const now = Date.now();
    const bm: SmartBookmark = {
      id: `sbm_${now}_${Math.random().toString(36).slice(2, 6)}`,
      bookId: book.id,
      pageIndex,
      chapterId: currentPage?.chapterId,
      chapterTitle: currentPage?.chapterTitle,
      title: `Закладка · стр. ${pageIndex + 1}`,
      type: defCat.id,
      color: defCat.color,
      icon: defCat.icon,
      note: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveSmartBookmark(bm);
    const current = book.bookmarks || [];
    if (!current.includes(pageIndex)) {
      await updateBook({...book, bookmarks: [...current, pageIndex].sort((a, b) => a - b)});
    }
    setQuickBmBanner(bm);
    showToast(`Страница ${pageIndex + 1} добавлена в закладки`);
  };

  useEffect(() => {
    if (!quickBmBanner) return;
    const t = setTimeout(() => setQuickBmBanner(null), 6000);
    return () => clearTimeout(t);
  }, [quickBmBanner]);

  const handleBookmarkToScrapbook = async (bm: SmartBookmark) => {
    const now = Date.now();
    const onPage = scrapbookItems.filter(
      (s) => s.bookId === bm.bookId && s.pageIndex === bm.pageIndex
    );
    const noteCard: ScrapbookNoteItem = {
      id: `sb_bm_note_${now}`,
      bookId: bm.bookId,
      pageIndex: bm.pageIndex,
      type: 'note',
      text: `${bm.stickerEmoji ? `${bm.stickerEmoji} ` : ''}${bm.title}${bm.note ? `\n${bm.note}` : ''}`,
      noteVariant: 'vintage_card',
      bgColor: '#FAF5EC',
      textColor: '#2F251E',
      fontFamily: "'Lora', serif",
      fontSize: 14,
      padding: 12,
      borderStyle: 'dashed',
      x: 60,
      y: 14,
      width: 34,
      height: 20,
      rotation: 1.5,
      zIndex: onPage.length + 3,
      opacity: 0.96,
      locked: false,
      hidden: false,
      createdAt: now,
      updatedAt: now,
    };
    await saveScrapbookItemsBulk([noteCard]);
    showToast('Закладка оформлена на Scrapbook-слое страницы');
  };

  const isBookmarked = Boolean(book?.bookmarks?.includes(pageIndex) || pageSmartBookmarks.length > 0);

  // Scrapbook Undo/Redo helpers
  const pushUndoSnapshot = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-19), currentPageScrapbook]);
    setRedoStack([]);
  }, [currentPageScrapbook]);

  const handleUpdateSbItem = useCallback(
    async (item: ScrapbookItem, pushHist = false) => {
      if (pushHist) pushUndoSnapshot();
      await saveScrapbookItem(item);
    },
    [pushUndoSnapshot, saveScrapbookItem]
  );

  const handleAddSbItems = useCallback(
    async (itemsToAdd: ScrapbookItem[]) => {
      pushUndoSnapshot();
      await saveScrapbookItemsBulk(itemsToAdd);
    },
    [pushUndoSnapshot, saveScrapbookItemsBulk]
  );

  const handleDeleteSbItem = useCallback(
    async (id: string) => {
      pushUndoSnapshot();
      await deleteScrapbookItem(id);
      setSelectedSbIds((prev) => prev.filter((sid) => sid !== id));
    },
    [deleteScrapbookItem, pushUndoSnapshot]
  );

  const handleDuplicateSbItem = useCallback(
    async (item: ScrapbookItem) => {
      pushUndoSnapshot();
      const copy: ScrapbookItem = {
        ...item,
        id: `sb_copy_${Date.now()}`,
        x: Math.min(86, item.x + 4),
        y: Math.min(86, item.y + 4),
        zIndex: item.zIndex + 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveScrapbookItem(copy);
      setSelectedSbIds([copy.id]);
    },
    [pushUndoSnapshot, saveScrapbookItem]
  );

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const prevSnapshot = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, currentPageScrapbook]);

    // Sync IndexedDB with prevSnapshot for this page
    const prevMap = new Map(prevSnapshot.map((i) => [i.id, i]));
    for (const cur of currentPageScrapbook) {
      if (!prevMap.has(cur.id)) await deleteScrapbookItem(cur.id);
    }
    if (prevSnapshot.length > 0) await saveScrapbookItemsBulk(prevSnapshot);
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, currentPageScrapbook]);

    const nextMap = new Map(nextSnapshot.map((i) => [i.id, i]));
    for (const cur of currentPageScrapbook) {
      if (!nextMap.has(cur.id)) await deleteScrapbookItem(cur.id);
    }
    if (nextSnapshot.length > 0) await saveScrapbookItemsBulk(nextSnapshot);
  };

  const handleApplyScrapbookTemplate = async (templateId: string) => {
    const tpl = SCRAPBOOK_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl || !book) return;
    pushUndoSnapshot();
    await updateBook({...book, pageThemeId: tpl.pageThemeId});
    const now = Date.now();
    const newItems: ScrapbookItem[] = tpl.items.map((def, idx) => {
      if (def.type === 'washi') {
        return {
          id: `sb_tpl_${now}_${idx}`,
          bookId,
          pageIndex,
          type: 'washi',
          pattern: def.pattern || 'cream',
          x: def.x,
          y: def.y,
          width: def.width,
          height: def.height,
          rotation: def.rotation,
          zIndex: 4 + idx,
          opacity: 0.9,
          locked: false,
          hidden: false,
          createdAt: now,
          updatedAt: now,
        };
      }
      if (def.type === 'note') {
        return {
          id: `sb_tpl_${now}_${idx}`,
          bookId,
          pageIndex,
          type: 'note',
          text: def.text || 'Заметка',
          noteVariant: def.noteVariant || 'sticky',
          bgColor: def.bgColor || '#FAF0CA',
          textColor: def.textColor || '#3C2F22',
          fontFamily:
            def.noteVariant === 'handwritten' ? "'Caveat', cursive" : "'Lora', serif",
          fontSize: 16,
          padding: 12,
          borderStyle: 'dashed',
          x: def.x,
          y: def.y,
          width: def.width,
          height: def.height,
          rotation: def.rotation,
          zIndex: 3 + idx,
          opacity: 0.96,
          locked: false,
          hidden: false,
          createdAt: now,
          updatedAt: now,
        };
      }
      return {
        id: `sb_tpl_${now}_${idx}`,
        bookId,
        pageIndex,
        type: 'sticker',
        stickerId: def.stickerId || 'dried_fern',
        label: def.label || 'Стикер',
        emoji: def.emoji || '🌿',
        x: def.x,
        y: def.y,
        width: def.width,
        height: def.height,
        rotation: def.rotation,
        zIndex: 5 + idx,
        opacity: 1,
        locked: false,
        hidden: false,
        createdAt: now,
        updatedAt: now,
      };
    });
    await saveScrapbookItemsBulk(newItems);
    showToast(`Шаблон «${tpl.name}» применён`);
  };

  // Text selection detector
  const handleTextMouseUp = (paragraphIndex: number) => {
    if (scrapbookActive && drawingConfig.active) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim() || '';
    if (text.length < 2) return;
    try {
      const range = sel!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPendingSel({
        text,
        paragraphIndex,
        rectTop: Math.max(70, rect.top - 10),
        rectLeft: Math.max(16, Math.min(window.innerWidth - 340, rect.left)),
      });
      setSelNote('');
      setSelTags('');
      setSelSticker('');
      setSelStamp('');
    } catch {
      // ignore invalid range
    }
  };

  const handleSaveSelectionAnnotation = async () => {
    if (!pendingSel || !currentPage) return;
    const ann: Annotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bookId,
      pageIndex,
      chapterId: currentPage.chapterId,
      paragraphIndex: pendingSel.paragraphIndex,
      quoteText: pendingSel.text,
      color: selColor,
      styleType: selStyle,
      categoryId: selCategory,
      noteText: selNote.trim(),
      tags: selTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      stickerEmoji: selSticker || undefined,
      stampText: selStamp || undefined,
      handwriting: selHandwriting,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveAnnotation(ann);
    recordRecentColor(selColor);
    setPendingSel(null);
    window.getSelection()?.removeAllRanges();
    showToast('Аннотация сохранена');
  };

  const handleSaveSelectionAsQuote = async () => {
    if (!pendingSel || !book) return;
    await saveQuote({
      id: `quote_${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      text: pendingSel.text,
      pageNumber: pageIndex + 1,
      pageIndex,
      categoryId: selCategory,
      color: selColor,
      note: selNote.trim(),
      cardConfig: {
        ...DEFAULT_QUOTE_CARD_CONFIG,
        bgColor: activeTheme.bgColor,
        textColor: activeTheme.textColor,
        accentColor: activeTheme.headingColor,
      },
      createdAt: Date.now(),
    });
    setPendingSel(null);
    window.getSelection()?.removeAllRanges();
    showToast('Цитата сохранена в «Мои цитаты»');
  };

  const handleAttachPhotoToSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(file);
    });
    const photo: ScrapbookPhotoItem = {
      id: `sb_clip_${Date.now()}`,
      bookId,
      pageIndex,
      type: 'photo',
      src,
      x: 58,
      y: 18,
      width: 34,
      height: 26,
      rotation: 2.5,
      zIndex: currentPageScrapbook.length + 3,
      opacity: 1,
      locked: false,
      hidden: false,
      clipFrame: 'clipped',
      paperclipStyle: 'gold',
      paperclipPosition: 'top_center',
      caption: pendingSel?.text.slice(0, 36) || '',
      flipX: false,
      borderRadius: 6,
      shadow: true,
      cropShape: 'rect',
      brightness: 100,
      contrast: 100,
      sepia: 0,
      blur: 0,
      linkedSnippet: pendingSel?.text,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveScrapbookItem(photo);
    setPendingSel(null);
    setScrapbookActive(true);
    setRightDrawer('scrapbook');
    showToast('Изображение прикреплено скрепкой к фрагменту');
  };

  // Render paragraph with non-destructive annotation layer
  const renderAnnotatedParagraph = (para: string, pIdx: number, pPageIndex: number) => {
    const anns = annotations.filter(
      (a) => a.bookId === bookId && a.pageIndex === pPageIndex && a.paragraphIndex === pIdx
    );
    if (anns.length === 0) return para;

    // Locate non-overlapping spans inside the paragraph
    interface SpanMark {
      start: number;
      end: number;
      ann: Annotation;
    }
    const marks: SpanMark[] = [];
    for (const ann of anns) {
      const idx = para.indexOf(ann.quoteText);
      if (idx !== -1) {
        marks.push({start: idx, end: idx + ann.quoteText.length, ann});
      }
    }
    marks.sort((a, b) => a.start - b.start);

    const nodes: React.ReactNode[] = [];
    let cursor = 0;

    marks.forEach((m, i) => {
      if (m.start < cursor) return;
      if (m.start > cursor) nodes.push(para.slice(cursor, m.start));
      const {ann} = m;
      const isPulsing = pulsingAnnId === ann.id;
      const styleClass =
        ann.styleType === 'underline'
          ? 'ann-underline'
          : ann.styleType === 'double_underline'
          ? 'ann-double-underline'
          : ann.styleType === 'wavy'
          ? 'ann-wavy'
          : ann.styleType === 'box'
          ? 'ann-box'
          : 'ann-highlight';

      const inlineStyle: React.CSSProperties =
        ann.styleType === 'highlight'
          ? {backgroundColor: ann.color}
          : ann.styleType === 'box'
          ? {borderColor: ann.color, backgroundColor: 'transparent'}
          : {textDecorationColor: ann.color};

      nodes.push(
        <span
          key={`${ann.id}_${i}`}
          onClick={(e) => {
            e.stopPropagation();
            setEditingAnn(ann);
            setRightDrawer('notes');
          }}
          style={inlineStyle}
          className={`cursor-pointer transition-all ${styleClass} ${
            isPulsing ? 'ring-2 ring-[var(--site-accent)] animate-pulse' : ''
          }`}
          title={ann.noteText || 'Открыть аннотацию'}
        >
          {para.slice(m.start, m.end)}
          {ann.stickerEmoji && <span className="ml-1 text-sm select-none">{ann.stickerEmoji}</span>}
        </span>
      );
      cursor = m.end;
    });

    if (cursor < para.length) nodes.push(para.slice(cursor));

    const marginNotes = anns.filter((a) => a.noteText || a.stampText);

    return (
      <>
        {nodes}
        {marginNotes.length > 0 && (
          <span className="inline-flex flex-wrap items-center gap-1.5 ml-2 align-middle">
            {marginNotes.map((mn) => {
              const cat = annotationCategories.find((c) => c.id === mn.categoryId);
              return (
                <button
                  key={mn.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAnn(mn);
                    setRightDrawer('notes');
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] opacity-85 hover:opacity-100 ${
                    mn.handwriting ? 'font-hand text-sm' : ''
                  }`}
                  style={{
                    borderColor: activeTheme.borderColor,
                    backgroundColor: mn.color,
                    color: activeTheme.textColor,
                  }}
                >
                  <span>{cat?.emoji || '📝'}</span>
                  {mn.stampText && <span className="font-semibold tracking-wider">{mn.stampText}</span>}
                  {mn.noteText && <span className="max-w-[140px] truncate">{mn.noteText}</span>}
                </button>
              );
            })}
          </span>
        )}
      </>
    );
  };

  // Search matches inside book
  const searchMatches = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    if (!q || !content) return [];
    const results: {pageIndex: number; chapterTitle: string; snippet: string}[] = [];
    for (const p of content.pages) {
      for (const para of p.paragraphs) {
        const idx = para.toLowerCase().indexOf(q);
        if (idx !== -1) {
          results.push({
            pageIndex: p.index,
            chapterTitle: p.chapterTitle,
            snippet: para.slice(Math.max(0, idx - 30), Math.min(para.length, idx + q.length + 60)),
          });
          break;
        }
      }
      if (results.length >= 40) break;
    }
    return results;
  }, [bookSearch, content]);

  // Animation duration & class
  const animOff = settings.animationLevel === 'off';
  const flipDuration =
    readerCfg.flipSpeed === 'fast' ? '180ms' : readerCfg.flipSpeed === 'slow' ? '620ms' : '380ms';

  const getPageAnimStyle = (): React.CSSProperties => {
    if (animOff || !flipDir || readerCfg.pageTurnMode === 'instant' || readerCfg.pageTurnMode === 'vertical_scroll') {
      return {};
    }
    if (readerCfg.pageTurnMode === 'realistic_curl') {
      return {
        animation: `${flipDir === 'next' ? 'pageCurlNext' : 'pageCurlPrev'} ${flipDuration} cubic-bezier(0.16, 1, 0.3, 1)`,
        transformOrigin: flipDir === 'next' ? 'left center' : 'right center',
      };
    }
    if (readerCfg.pageTurnMode === 'paper_bend') {
      return {
        animation: `${flipDir === 'next' ? 'pageBendNext' : 'pageBendPrev'} ${flipDuration} cubic-bezier(0.16, 1, 0.3, 1)`,
      };
    }
    return {
      transition: `opacity ${flipDuration} ease`,
    };
  };

  const renderPageCanvas = (pageObj: typeof currentPage, idx: number, showScrapbook: boolean) => {
    if (!pageObj) return null;
    return (
      <div
        ref={idx === pageIndex ? pageContainerRef : undefined}
        style={{
          ...getPageAnimStyle(),
          maxWidth: `${readerCfg.textWidth + readerCfg.pagePadding * 2}px`,
          backgroundColor: activeTheme.bgColor,
          backgroundImage: activeTheme.customBgImage
            ? `url(${activeTheme.customBgImage})`
            : activeTheme.bgGradient,
          backgroundSize: activeTheme.customBgImage ? 'cover' : undefined,
          color: activeTheme.textColor,
          borderColor: activeTheme.borderColor,
          borderWidth: activeTheme.borderStyle === 'double' ? '3px' : activeTheme.borderStyle === 'none' ? '0px' : '1px',
          borderStyle: activeTheme.borderStyle === 'double' ? 'double' : 'solid',
          borderRadius: `${activeTheme.cornerRadius}px`,
          padding: `clamp(20px, 4vw, ${readerCfg.pagePadding}px)`,
          boxShadow:
            activeTheme.shadowDepth === 'deep'
              ? '0 24px 54px -12px rgba(0,0,0,0.28)'
              : activeTheme.shadowDepth === 'soft'
              ? '0 14px 36px -12px rgba(0,0,0,0.12)'
              : 'none',
        }}
        className={`relative w-full mx-auto min-h-[68vh] flex flex-col justify-between transition-colors ${getTextureClass(
          activeTheme.texture
        )}`}
      >
        {/* Decorative Theme Corner Motif */}
        {activeTheme.decorMotif !== 'none' && (
          <div
            className="pointer-events-none select-none flex items-center justify-between text-xs opacity-45 mb-3"
            style={{color: activeTheme.pageNumberColor}}
          >
            <span>
              {activeTheme.decorMotif === 'botanical' && '🌿'}
              {activeTheme.decorMotif === 'floral' && '🌸'}
              {activeTheme.decorMotif === 'stars' && '✨'}
              {activeTheme.decorMotif === 'vintage_stamp' && 'EX LIBRIS'}
              {activeTheme.decorMotif === 'gothic' && '⚜'}
            </span>
            <span className="truncate max-w-[65%]">{pageObj.chapterTitle}</span>
          </div>
        )}

        {/* Decorative Tape Corners if theme border is 'tape' */}
        {activeTheme.borderStyle === 'tape' && (
          <>
            <span className="pointer-events-none absolute -top-2 left-6 w-14 h-4 bg-[#E9DEC8]/85 rotate-[-4deg] shadow-xs" />
            <span className="pointer-events-none absolute -top-2 right-6 w-14 h-4 bg-[#E9DEC8]/85 rotate-[4deg] shadow-xs" />
          </>
        )}

        {/* Smart Bookmark Margin Ribbons */}
        {bookSmartBookmarks.filter((bm) => bm.pageIndex === idx).length > 0 && (
          <div className="absolute -top-1 right-6 z-20 flex items-start gap-1.5">
            {bookSmartBookmarks
              .filter((bm) => bm.pageIndex === idx)
              .slice(0, 4)
              .map((bm) => (
                <button
                  key={bm.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingBookmark(bm);
                    setShowBookmarkModal(true);
                  }}
                  title={`${bm.title}${bm.note ? `: ${bm.note}` : ''}`}
                  className="px-2 pt-2 pb-2.5 rounded-b-lg shadow-md text-white flex flex-col items-center gap-0.5 transition-transform hover:translate-y-0.5"
                  style={{backgroundColor: bm.color}}
                >
                  {renderBookmarkIcon(bm.icon, 'w-3.5 h-3.5')}
                  {bm.stickerEmoji && <span className="text-[10px] leading-none">{bm.stickerEmoji}</span>}
                </button>
              ))}
          </div>
        )}

        {/* Book Content */}
        <div
          className="relative z-0 flex-1"
          style={{
            fontFamily: activeTheme.fontFamilyOverride || readerCfg.fontFamily,
            fontSize: `${readerCfg.fontSize}px`,
            lineHeight: readerCfg.lineHeight,
            letterSpacing: `${readerCfg.letterSpacing}em`,
            textAlign: readerCfg.textAlign,
          }}
        >
          {(idx === 0 || pageObj.chapterTitle !== content?.pages[idx - 1]?.chapterTitle) && (
            <h2
              className="text-2xl sm:text-3xl font-semibold mb-6 leading-snug"
              style={{
                fontFamily: activeTheme.headingFontOverride || readerCfg.headingFontFamily,
                color: activeTheme.headingColor,
              }}
            >
              {pageObj.chapterTitle}
            </h2>
          )}

          {pageObj.imageDataUrl && (
            <div className="mb-5 flex justify-center">
              <img
                src={pageObj.imageDataUrl}
                alt={`Страница ${idx + 1}`}
                className="max-h-[65vh] rounded-lg object-contain shadow-sm"
              />
            </div>
          )}

          <div className="space-y-4">
            {pageObj.paragraphs.map((para, pIdx) => (
              <p
                key={pIdx}
                onMouseUp={() => handleTextMouseUp(pIdx)}
                onTouchEnd={() => setTimeout(() => handleTextMouseUp(pIdx), 80)}
                className="leading-[inherit] selection:bg-amber-200/60 selection:text-inherit"
              >
                {renderAnnotatedParagraph(para, pIdx, idx)}
              </p>
            ))}
          </div>
        </div>

        {/* Footer Page Number */}
        <div
          className="mt-8 pt-4 border-t flex items-center justify-between text-xs opacity-75 select-none"
          style={{borderColor: activeTheme.borderColor, color: activeTheme.pageNumberColor}}
        >
          <span className="truncate max-w-[60%]">{book?.title}</span>
          <span className="font-mono-num">
            {idx + 1} / {totalPages}
          </span>
        </div>

        {/* Interactive Scrapbook Layer */}
        {showScrapbook && (
          <ScrapbookOverlay
            items={scrapbookItems.filter((s) => s.bookId === bookId && s.pageIndex === idx)}
            scrapbookActive={scrapbookActive}
            lockAllMobile={lockAllMobile}
            selectedIds={selectedSbIds}
            onSelectIds={setSelectedSbIds}
            onUpdateItem={handleUpdateSbItem}
            onDeleteItem={handleDeleteSbItem}
            onDuplicateItem={handleDuplicateSbItem}
            drawingConfig={drawingConfig}
            bookId={bookId}
            pageIndex={idx}
            animateItems={!animOff}
          />
        )}
      </div>
    );
  };

  if (!book) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--site-bg)]">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border">
          Вернуться в библиотеку
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--site-bg)',
        color: 'var(--site-text)',
      }}
    >
      {/* Hidden input for quick clip-photo-to-selection */}
      <input
        ref={clipPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAttachPhotoToSelection}
      />

      {/* Top Reader Bar (Auto-hideable on mobile fullscreen tap) */}
      {!fullscreen && (
        <header
          className={`shrink-0 h-14 px-3 sm:px-5 border-b flex items-center justify-between gap-2 transition-transform duration-200 z-30 ${
            mobileChromeVisible ? 'translate-y-0' : '-translate-y-full md:translate-y-0'
          }`}
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-black/5 shrink-0"
              title="В библиотеку"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-semibold truncate">
                {book.title}
              </h1>
              <p className="text-[11px] truncate hidden sm:block" style={{color: 'var(--site-text-muted)'}}>
                {book.author} · стр. {pageIndex + 1} из {totalPages}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => setLeftDrawer(leftDrawer === 'toc' ? 'none' : 'toc')}
              className={`min-h-[38px] min-w-[38px] px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-medium ${
                leftDrawer === 'toc' ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5'
              }`}
              title="Оглавление"
            >
              <ListTree className="w-4 h-4" />
              <span className="hidden lg:inline">Оглавление</span>
            </button>

            <button
              onClick={() => setLeftDrawer(leftDrawer === 'search' ? 'none' : 'search')}
              className={`min-h-[38px] min-w-[38px] px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-medium ${
                leftDrawer === 'search' ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5'
              }`}
              title="Поиск по тексту"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={toggleBookmark}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl hover:bg-black/5"
              title={isBookmarked ? 'Настроить умную закладку' : 'Поставить закладку в 1 клик'}
            >
              <Bookmark
                className="w-4 h-4"
                fill={isBookmarked ? 'var(--site-accent)' : 'none'}
                stroke={isBookmarked ? 'var(--site-accent)' : 'currentColor'}
              />
            </button>

            <button
              onClick={() => setRightDrawer(rightDrawer === 'notes' ? 'none' : 'notes')}
              className={`min-h-[38px] min-w-[38px] px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-medium ${
                rightDrawer === 'notes' ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5'
              }`}
              title="Аннотации и заметки"
            >
              <Highlighter className="w-4 h-4" />
              <span className="hidden lg:inline">Заметки ({bookAnnotations.length})</span>
            </button>

            <button
              onClick={() => setRightDrawer(rightDrawer === 'typography' ? 'none' : 'typography')}
              className={`min-h-[38px] min-w-[38px] px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-medium ${
                rightDrawer === 'typography' ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5'
              }`}
              title="Шрифт и темы"
            >
              <Type className="w-4 h-4" />
              <span className="hidden xl:inline">Вид</span>
            </button>

            <button
              onClick={() => {
                const next = !scrapbookActive;
                setScrapbookActive(next);
                setRightDrawer(next ? 'scrapbook' : 'none');
                if (!next) setDrawingConfig((d) => ({...d, active: false}));
              }}
              className="min-h-[38px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-medium border transition-colors whitespace-nowrap"
              style={{
                borderColor: scrapbookActive ? 'var(--site-accent)' : 'var(--site-border)',
                backgroundColor: scrapbookActive ? 'var(--site-accent)' : 'transparent',
                color: scrapbookActive ? 'var(--site-accent-contrast)' : 'var(--site-text)',
              }}
              title="Режим Scrapbook"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scrapbook</span>
            </button>

            <button
              onClick={() => {
                onClose();
                openBookJournal(book.id);
              }}
              className="hidden sm:flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl hover:bg-black/5"
              title="Дневник книги"
            >
              <NotebookPen className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onClose();
                openBookQuiz(book.id);
              }}
              className="hidden sm:flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl hover:bg-black/5"
              title="Тест «Что я помню?»"
            >
              <Brain className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onClose();
                openBookTimeline(book.id);
              }}
              className="hidden sm:flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl hover:bg-black/5"
              title="Таймлайн книги"
            >
              <Clock className="w-4 h-4" />
            </button>

            <button
              onClick={() => setFullscreen(true)}
              className="hidden sm:flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl hover:bg-black/5"
              title="Полноэкранный режим (F)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* One-tap quick customize strip for newly added Smart Bookmark */}
      {quickBmBanner && !fullscreen && (
        <div
          className="shrink-0 px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs"
          style={{backgroundColor: 'var(--site-surface-alt)', borderColor: 'var(--site-border)'}}
        >
          <span className="font-medium">
            Закладка добавлена на стр. {quickBmBanner.pageIndex + 1}. Хотите указать тип, цвет или комментарий?
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingBookmark(quickBmBanner);
                setShowBookmarkModal(true);
                setQuickBmBanner(null);
              }}
              className="px-3 py-1 rounded-lg font-medium whitespace-nowrap"
              style={{
                backgroundColor: 'var(--site-accent)',
                color: 'var(--site-accent-contrast)',
              }}
            >
              Настроить закладку
            </button>
            <button onClick={() => setQuickBmBanner(null)} className="p-1 opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {fullscreen && (
        <button
          onClick={() => setFullscreen(false)}
          className="fixed top-4 right-4 z-50 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full border shadow-md backdrop-blur-xs"
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
          }}
          title="Выйти из полноэкранного режима"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      )}

      {/* Main 3-Zone Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Drawer (TOC / Bookmarks / Search) */}
        {leftDrawer !== 'none' && !fullscreen && (
          <aside
            className="absolute md:static inset-y-0 left-0 z-30 w-72 sm:w-80 border-r flex flex-col p-4 overflow-y-auto shadow-xl md:shadow-none"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 text-xs">
                <button
                  onClick={() => setLeftDrawer('toc')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium ${
                    leftDrawer === 'toc' ? 'bg-black/10 dark:bg-white/10' : 'opacity-65'
                  }`}
                >
                  Главы
                </button>
                <button
                  onClick={() => setLeftDrawer('bookmarks')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium ${
                    leftDrawer === 'bookmarks' ? 'bg-black/10 dark:bg-white/10' : 'opacity-65'
                  }`}
                >
                  Закладки ({bookSmartBookmarks.length})
                </button>
                <button
                  onClick={() => setLeftDrawer('search')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium ${
                    leftDrawer === 'search' ? 'bg-black/10 dark:bg-white/10' : 'opacity-65'
                  }`}
                >
                  Поиск
                </button>
              </div>
              <button onClick={() => setLeftDrawer('none')} className="p-1.5 rounded-lg hover:bg-black/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {leftDrawer === 'toc' && (
              <div className="space-y-1">
                {book.toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      goToPage(item.pageIndex);
                      if (window.innerWidth < 768) setLeftDrawer('none');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
                      currentPage?.chapterId === item.id ? 'font-semibold' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={
                      currentPage?.chapterId === item.id
                        ? {backgroundColor: 'var(--site-surface-alt)'}
                        : undefined
                    }
                  >
                    <span className="truncate">{item.title}</span>
                    <span className="font-mono-num opacity-60 shrink-0">{item.pageIndex + 1}</span>
                  </button>
                ))}
              </div>
            )}

            {leftDrawer === 'bookmarks' && (
              <div className="space-y-3 text-xs">
                <button
                  onClick={() => {
                    setEditingBookmark(null);
                    setShowBookmarkModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: 'var(--site-accent)',
                    color: 'var(--site-accent-contrast)',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" /> Создать умную закладку
                </button>

                <input
                  value={bmSearch}
                  onChange={(e) => setBmSearch(e.target.value)}
                  placeholder="Поиск по закладкам..."
                  className="w-full rounded-xl border px-3 py-1.5 text-xs outline-none"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                />

                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={bmTypeFilter}
                    onChange={(e) => setBmTypeFilter(e.target.value)}
                    className="rounded-lg border px-2 py-1 text-[11px]"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  >
                    <option value="all">Все типы</option>
                    {allBookmarkCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bmSort}
                    onChange={(e) => setBmSort(e.target.value as 'page' | 'date' | 'type')}
                    className="rounded-lg border px-2 py-1 text-[11px]"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  >
                    <option value="page">По страницам</option>
                    <option value="date">По дате</option>
                    <option value="type">По категории</option>
                  </select>
                </div>

                {filteredBookSmartBookmarks.length === 0 ? (
                  <p className="text-xs opacity-60 py-6 text-center">Умных закладок пока нет</p>
                ) : (
                  <div className="space-y-2">
                    {filteredBookSmartBookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        className="rounded-xl border p-2.5 space-y-1.5"
                        style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => {
                              goToPage(bm.pageIndex);
                              if (window.innerWidth < 768) setLeftDrawer('none');
                            }}
                            className="flex items-center gap-2 text-left min-w-0 flex-1"
                          >
                            <span style={{color: bm.color}} className="shrink-0">
                              {renderBookmarkIcon(bm.icon, 'w-3.5 h-3.5')}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold truncate hover:underline">
                                {bm.stickerEmoji ? `${bm.stickerEmoji} ` : ''}
                                {bm.title}
                              </p>
                              <p className="text-[10px] opacity-65 truncate">
                                стр. {bm.pageIndex + 1}
                                {bm.chapterTitle ? ` · ${bm.chapterTitle}` : ''}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => handleBookmarkToScrapbook(bm)}
                              className="p-1 rounded hover:bg-black/5"
                              title="Добавить в Scrapbook"
                            >
                              <Sparkles className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingBookmark(bm);
                                setShowBookmarkModal(true);
                              }}
                              className="p-1 rounded hover:bg-black/5"
                              title="Редактировать / перенести"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={async () => {
                                await deleteSmartBookmark(bm.id);
                                showToast('Закладка удалена');
                              }}
                              className="p-1 rounded text-rose-600 hover:bg-rose-500/10"
                              title="Удалить"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {bm.note && <p className="text-[11px] opacity-80 line-clamp-2">{bm.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {leftDrawer === 'search' && (
              <div className="space-y-3">
                <input
                  autoFocus
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="Найти слово в книге..."
                  className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                />
                <div className="space-y-1.5">
                  {searchMatches.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(m.pageIndex)}
                      className="w-full text-left p-2.5 rounded-xl border text-xs hover:bg-black/5"
                      style={{borderColor: 'var(--site-border)'}}
                    >
                      <div className="flex justify-between font-medium mb-1">
                        <span className="truncate">{m.chapterTitle}</span>
                        <span className="font-mono-num opacity-60">стр. {m.pageIndex + 1}</span>
                      </div>
                      <p className="opacity-75 line-clamp-2">…{m.snippet}…</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Central Reading Canvas */}
        <main
          onClick={() => {
            if (window.innerWidth < 768 && !scrapbookActive) {
              setMobileChromeVisible((v) => !v);
            }
          }}
          onTouchStart={(e) => {
            if (scrapbookActive && drawingConfig.active) return;
            touchStartRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            };
          }}
          onTouchEnd={(e) => {
            if (!touchStartRef.current || readerCfg.pageTurnMode === 'vertical_scroll') return;
            if (scrapbookActive && !lockAllMobile) return;
            const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
            const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
            touchStartRef.current = null;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
              if (dx < 0) goToPage(pageIndex + 1);
              else goToPage(pageIndex - 1);
            }
          }}
          className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-10 py-6 sm:py-8 reader-perspective relative"
        >
          {!content ? (
            <div className="h-full flex items-center justify-center text-sm opacity-60">
              Открываем книгу...
            </div>
          ) : readerCfg.pageTurnMode === 'vertical_scroll' ? (
            <div className="space-y-8 pb-20">
              {content.pages.map((p, idx) => (
                <div key={p.index}>{renderPageCanvas(p, idx, true)}</div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 min-h-full pb-14 md:pb-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPage(pageIndex - 1);
                }}
                disabled={pageIndex === 0}
                className="hidden md:flex w-11 h-11 rounded-full border items-center justify-center shrink-0 hover:bg-black/5 disabled:opacity-25 transition-all"
                style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-surface)'}}
                aria-label="Предыдущая страница"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 max-w-4xl">
                {renderPageCanvas(currentPage, pageIndex, true)}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPage(pageIndex + 1);
                }}
                disabled={pageIndex >= totalPages - 1}
                className="hidden md:flex w-11 h-11 rounded-full border items-center justify-center shrink-0 hover:bg-black/5 disabled:opacity-25 transition-all"
                style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-surface)'}}
                aria-label="Следующая страница"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </main>

        {/* Right Drawer (Desktop permanent/resizable, Tablet/Mobile slide-over or bottom sheet) */}
        {rightDrawer !== 'none' && !fullscreen && (
          <aside
            style={{
              width: window.innerWidth >= 1024 ? `${rightWidth}px` : undefined,
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
            }}
            className="fixed md:static inset-x-0 bottom-0 md:inset-y-0 md:right-0 z-30 max-h-[72vh] md:max-h-none md:w-80 lg:w-auto rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l flex flex-col p-4 overflow-y-auto shadow-2xl md:shadow-none"
          >
            {/* Mobile drag pill indicator */}
            <div className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/20 mx-auto mb-3 md:hidden" />

            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setRightDrawer('notes')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium ${
                    rightDrawer === 'notes' ? 'bg-black/10 dark:bg-white/10' : 'opacity-65'
                  }`}
                >
                  Заметки
                </button>
                <button
                  onClick={() => setRightDrawer('typography')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium ${
                    rightDrawer === 'typography' ? 'bg-black/10 dark:bg-white/10' : 'opacity-65'
                  }`}
                >
                  Оформление
                </button>
                <button
                  onClick={() => {
                    setScrapbookActive(true);
                    setRightDrawer('scrapbook');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-medium ${
                    rightDrawer === 'scrapbook' ? 'bg-black/10 dark:bg-white/10' : 'opacity-65'
                  }`}
                >
                  Scrapbook
                </button>
              </div>
              <div className="flex items-center gap-1">
                {window.innerWidth >= 1024 && (
                  <button
                    onClick={() => setRightWidth((w) => (w === 340 ? 430 : 340))}
                    className="p-1.5 rounded-lg hover:bg-black/5 text-xs opacity-60"
                    title="Изменить ширину панели"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setRightDrawer('none')}
                  className="p-1.5 rounded-lg hover:bg-black/5"
                  aria-label="Закрыть панель"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {rightDrawer === 'notes' && (
              <div className="space-y-3 text-xs">
                {editingAnn && (
                  <div
                    className="rounded-xl border p-3 space-y-2"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-accent)'}}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Редактировать заметку</span>
                      <button onClick={() => setEditingAnn(null)}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="italic opacity-75 line-clamp-2">«{editingAnn.quoteText}»</p>
                    <textarea
                      rows={3}
                      value={editingAnn.noteText}
                      onChange={(e) => setEditingAnn({...editingAnn, noteText: e.target.value})}
                      className="w-full rounded-lg border p-2 outline-none"
                      style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(userColors.length > 0
                        ? [...userColors].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).slice(0, 7).map((c) => ({
                            id: c.id,
                            name: `${c.name} (${c.hex})`,
                            value: c.cssValue,
                          }))
                        : HIGHLIGHT_PALETTE
                      ).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setEditingAnn({...editingAnn, color: c.value})}
                          className={`w-5 h-5 rounded-full border ${
                            editingAnn.color === c.value ? 'ring-2 ring-[var(--site-accent)]' : ''
                          }`}
                          style={{backgroundColor: c.value, borderColor: 'rgba(0,0,0,0.16)'}}
                          title={c.name}
                        />
                      ))}
                      <ColorSwatchButton
                        compact
                        value={editingAnn.color}
                        onChange={(c) => {
                          setEditingAnn({...editingAnn, color: c});
                          recordRecentColor(c);
                        }}
                        label="Цвет выделения"
                        title="Любой цвет из «Мои цвета» или палитры"
                      />
                    </div>
                    <select
                      value={editingAnn.categoryId}
                      onChange={(e) => setEditingAnn({...editingAnn, categoryId: e.target.value})}
                      className="w-full rounded-lg border px-2 py-1.5 text-xs"
                      style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
                    >
                      {annotationCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji} {cat.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-between pt-1">
                      <button
                        onClick={async () => {
                          await deleteAnnotation(editingAnn.id);
                          setEditingAnn(null);
                          showToast('Аннотация удалена');
                        }}
                        className="text-rose-600 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Удалить
                      </button>
                      <button
                        onClick={async () => {
                          await saveAnnotation({...editingAnn, updatedAt: Date.now()});
                          recordRecentColor(editingAnn.color);
                          setEditingAnn(null);
                          showToast('Заметка обновлена');
                        }}
                        className="px-3 py-1.5 rounded-lg font-medium"
                        style={{
                          backgroundColor: 'var(--site-accent)',
                          color: 'var(--site-accent-contrast)',
                        }}
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                )}

                {bookAnnotations.length === 0 ? (
                  <div className="py-10 text-center space-y-2 opacity-65">
                    <StickyNote className="w-7 h-7 mx-auto opacity-60" />
                    <p>Выделите любой фрагмент текста на странице, чтобы создать аннотацию или заметку</p>
                  </div>
                ) : (
                  bookAnnotations.map((ann) => {
                    const cat = annotationCategories.find((c) => c.id === ann.categoryId);
                    return (
                      <div
                        key={ann.id}
                        onClick={() => {
                          goToPage(ann.pageIndex);
                          setPulsingAnnId(ann.id);
                          setEditingAnn(ann);
                        }}
                        className="rounded-xl border p-3 cursor-pointer hover:bg-black/[0.02] space-y-1.5"
                        style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-bg)'}}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">
                            {cat?.emoji} {cat?.label || 'Заметка'}
                          </span>
                          <span className="font-mono-num opacity-60">стр. {ann.pageIndex + 1}</span>
                        </div>
                        <p
                          className="p-1.5 rounded text-[11px] line-clamp-2"
                          style={{backgroundColor: ann.color}}
                        >
                          «{ann.quoteText}»
                        </p>
                        {ann.noteText && (
                          <p className={ann.handwriting ? 'font-hand text-base' : 'opacity-85'}>
                            {ann.noteText}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {rightDrawer === 'typography' && (
              <div className="space-y-4 text-xs">
                {/* Quick Page Themes Switcher */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Тема страницы ({activeTheme.name})</span>
                    <button
                      onClick={() => setShowThemeModal(true)}
                      className="inline-flex items-center gap-1 underline font-medium"
                      style={{color: 'var(--site-accent)'}}
                    >
                      <Palette className="w-3.5 h-3.5" /> Конструктор
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {allPageThemes.slice(0, 12).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => updateBook({...book, pageThemeId: t.id})}
                        className={`h-9 rounded-lg border text-[10px] font-medium px-1 truncate ${
                          t.id === activeTheme.id ? 'ring-2 ring-[var(--site-accent)]' : ''
                        }`}
                        style={{
                          backgroundColor: t.bgColor,
                          color: t.textColor,
                          borderColor: t.borderColor || 'rgba(0,0,0,0.15)',
                        }}
                        title={t.name}
                      >
                        {t.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowThemeModal(true)}
                    className="w-full mt-2 py-2 rounded-xl border font-medium hover:bg-black/5"
                    style={{borderColor: 'var(--site-border)'}}
                  >
                    Все {allPageThemes.length} тем и редактор...
                  </button>
                </div>

                {/* Page Turn Mode & Speed */}
                <div className="space-y-2 pt-3 border-t" style={{borderColor: 'var(--site-border)'}}>
                  <label className="block">
                    <span className="font-semibold block mb-1">Режим перелистывания</span>
                    <select
                      value={readerCfg.pageTurnMode}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          reader: {...prev.reader, pageTurnMode: e.target.value as PageTurnMode},
                        }))
                      }
                      className="w-full rounded-xl border px-3 py-2"
                      style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                    >
                      <option value="realistic_curl">Реалистичная страница (3D)</option>
                      <option value="paper_bend">Изгиб бумаги</option>
                      <option value="smooth_fade">Плавный переход</option>
                      <option value="instant">Без анимации</option>
                      <option value="vertical_scroll">Непрерывная прокрутка</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="opacity-75 block mb-1">Скорость перелистывания</span>
                    <select
                      value={readerCfg.flipSpeed}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          reader: {...prev.reader, flipSpeed: e.target.value as PageFlipSpeed},
                        }))
                      }
                      className="w-full rounded-xl border px-3 py-2"
                      style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                    >
                      <option value="fast">Быстро</option>
                      <option value="comfort">Комфортно</option>
                      <option value="slow">Медленно и плавно</option>
                    </select>
                  </label>
                </div>

                {/* Fonts */}
                <div className="space-y-2 pt-3 border-t" style={{borderColor: 'var(--site-border)'}}>
                  <label className="block">
                    <span className="font-semibold block mb-1">Основной шрифт</span>
                    <select
                      value={readerCfg.fontFamily}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          reader: {...prev.reader, fontFamily: e.target.value},
                        }))
                      }
                      className="w-full rounded-xl border px-3 py-2"
                      style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                    >
                      {BUILT_IN_FONTS.map((f) => (
                        <option key={f.id} value={f.cssFamily}>
                          {f.name}
                        </option>
                      ))}
                      {customFonts.map((cf) => (
                        <option key={cf.id} value={`'${getFontCssName(cf)}', serif`}>
                          ★ {cf.name} ({cf.format.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="opacity-75 block mb-1">Шрифт заголовков</span>
                    <select
                      value={readerCfg.headingFontFamily}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          reader: {...prev.reader, headingFontFamily: e.target.value},
                        }))
                      }
                      className="w-full rounded-xl border px-3 py-2"
                      style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                    >
                      {BUILT_IN_FONTS.map((f) => (
                        <option key={f.id} value={f.cssFamily}>
                          {f.name}
                        </option>
                      ))}
                      {customFonts.map((cf) => (
                        <option key={cf.id} value={`'${getFontCssName(cf)}', serif`}>
                          ★ {cf.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Sliders */}
                <div className="space-y-2.5 pt-3 border-t" style={{borderColor: 'var(--site-border)'}}>
                  <label className="block">
                    <div className="flex justify-between">
                      <span>Размер шрифта</span>
                      <span className="font-mono-num">{readerCfg.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={13}
                      max={28}
                      value={readerCfg.fontSize}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          reader: {...prev.reader, fontSize: Number(e.target.value)},
                        }))
                      }
                      className="w-full accent-[var(--site-accent)]"
                    />
                  </label>
                  <label className="block">
                    <div className="flex justify-between">
                      <span>Межстрочный интервал</span>
                      <span className="font-mono-num">{readerCfg.lineHeight}</span>
                    </div>
                    <input
                      type="range"
                      min={1.3}
                      max={2.2}
                      step={0.05}
                      value={readerCfg.lineHeight}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          reader: {...prev.reader, lineHeight: Number(e.target.value)},
                        }))
                      }
                      className="w-full accent-[var(--site-accent)]"
                    />
                  </label>
                  <label className="block">
                    <div className="flex justify-between">
                      <span>Ширина текста</span>
                      <span className="font-mono-num">{readerCfg.textWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={460}
                      max={920}
                      step={20}
                      value={readerCfg.textWidth}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          reader: {...prev.reader, textWidth: Number(e.target.value)},
                        }))
                      }
                      className="w-full accent-[var(--site-accent)]"
                    />
                  </label>
                  <label className="block">
                    <div className="flex justify-between">
                      <span>Отступы страницы</span>
                      <span className="font-mono-num">{readerCfg.pagePadding}px</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={72}
                      step={4}
                      value={readerCfg.pagePadding}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          reader: {...prev.reader, pagePadding: Number(e.target.value)},
                        }))
                      }
                      className="w-full accent-[var(--site-accent)]"
                    />
                  </label>
                </div>
              </div>
            )}

            {rightDrawer === 'scrapbook' && (
              <ScrapbookInspector
                bookId={bookId}
                pageIndex={pageIndex}
                pageItems={currentPageScrapbook}
                selectedIds={selectedSbIds}
                onSelectIds={setSelectedSbIds}
                onAddItems={handleAddSbItems}
                onUpdateItem={handleUpdateSbItem}
                onDeleteItem={handleDeleteSbItem}
                onApplyTemplate={handleApplyScrapbookTemplate}
                drawingConfig={drawingConfig}
                setDrawingConfig={setDrawingConfig}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                onUndo={handleUndo}
                onRedo={handleRedo}
                lockAllMobile={lockAllMobile}
                setLockAllMobile={setLockAllMobile}
              />
            )}
          </aside>
        )}
      </div>

      {/* Bottom Progress Bar (Desktop/Tablet) & Compact Thumb Bar (Mobile) */}
      {!fullscreen && (
        <footer
          className={`shrink-0 border-t px-3 sm:px-5 py-2 transition-transform duration-200 z-30 ${
            mobileChromeVisible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
          }`}
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
          }}
        >
          {/* Page Slider */}
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <button
              onClick={() => goToPage(pageIndex - 1)}
              disabled={pageIndex === 0}
              className="md:hidden min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={0}
              max={Math.max(0, totalPages - 1)}
              value={pageIndex}
              onChange={(e) => goToPage(Number(e.target.value))}
              className="flex-1 accent-[var(--site-accent)]"
            />
            <span className="text-xs font-mono-num shrink-0" style={{color: 'var(--site-text-muted)'}}>
              {pageIndex + 1} / {totalPages}
            </span>

            <button
              onClick={() => goToPage(pageIndex + 1)}
              disabled={pageIndex >= totalPages - 1}
              className="md:hidden min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}

      {/* Floating Aesthetic Selection Menu (Annotations, Notes, Quotes, Paperclip Photo) */}
      {pendingSel && (
        <div
          className="fixed z-50 w-[min(94vw,360px)] rounded-2xl border p-3.5 shadow-2xl"
          style={{
            top: window.innerWidth < 640 ? 'auto' : `${Math.min(window.innerHeight - 360, pendingSel.rectTop)}px`,
            bottom: window.innerWidth < 640 ? '12px' : 'auto',
            left: window.innerWidth < 640 ? '50%' : `${pendingSel.rectLeft}px`,
            transform: window.innerWidth < 640 ? 'translateX(-50%)' : undefined,
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
            color: 'var(--site-text)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold truncate max-w-[240px]">
              Выделено: «{pendingSel.text}»
            </span>
            <button onClick={() => setPendingSel(null)} className="p-1 rounded-lg hover:bg-black/5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Colors */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            {(() => {
              const seen = new Set<string>();
              const quick: {id: string; name: string; value: string}[] = [];
              const pushUnique = (id: string, name: string, value: string) => {
                const k = value.toLowerCase();
                if (seen.has(k) || quick.length >= 8) return;
                seen.add(k);
                quick.push({id, name, value});
              };
              for (const rc of recentColors) pushUnique(`rec_${rc}`, `Недавний · ${rc}`, rc);
              for (const uc of [...userColors].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))) {
                pushUnique(uc.id, `${uc.name} · ${uc.hex}`, uc.cssValue);
              }
              for (const hc of HIGHLIGHT_PALETTE) pushUnique(hc.id, hc.name, hc.value);
              return quick.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelColor(col.value)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    selColor === col.value ? 'scale-110 ring-2 ring-[var(--site-accent)]' : ''
                  }`}
                  style={{backgroundColor: col.value, borderColor: 'rgba(0,0,0,0.14)'}}
                  title={col.name}
                />
              ));
            })()}
            <ColorSwatchButton
              compact
              value={selColor}
              onChange={(c) => {
                setSelColor(c);
                recordRecentColor(c);
              }}
              label="Свой цвет"
              title="Выбрать любой цвет или сохранить в «Мои цвета»"
            />
          </div>

          {/* Style Types */}
          <div className="grid grid-cols-5 gap-1 text-[10px] mb-2.5">
            {(
              [
                ['highlight', 'Маркер'],
                ['underline', 'Линия'],
                ['double_underline', 'Двойная'],
                ['wavy', 'Волна'],
                ['box', 'Рамка'],
              ] as const
            ).map(([id, lbl]) => (
              <button
                key={id}
                onClick={() => setSelStyle(id)}
                className={`py-1.5 rounded-lg border font-medium ${
                  selStyle === id ? 'ring-1 ring-[var(--site-accent)]' : 'opacity-75'
                }`}
                style={{borderColor: 'var(--site-border)'}}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select
              value={selCategory}
              onChange={(e) => setSelCategory(e.target.value)}
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            >
              {annotationCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
            <select
              value={selStamp}
              onChange={(e) => setSelStamp(e.target.value)}
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            >
              <option value="">Без штампа</option>
              <option value="ВАЖНО">Штамп: ВАЖНО</option>
              <option value="ЦИТАТА">Штамп: ЦИТАТА</option>
              <option value="ЗАПОМНИТЬ">Штамп: ЗАПОМНИТЬ</option>
              <option value="СЕКРЕТ">Штамп: СЕКРЕТ</option>
            </select>
          </div>

          <textarea
            rows={2}
            value={selNote}
            onChange={(e) => setSelNote(e.target.value)}
            placeholder="Добавить заметку на поля..."
            className="w-full rounded-xl border p-2 text-xs outline-none mb-2"
            style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
          />

          <div className="flex items-center justify-between gap-2 mb-2.5 text-[11px]">
            <input
              value={selTags}
              onChange={(e) => setSelTags(e.target.value)}
              placeholder="Теги..."
              className="flex-1 rounded-lg border px-2 py-1 outline-none"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            />
            <select
              value={selSticker}
              onChange={(e) => setSelSticker(e.target.value)}
              className="rounded-lg border px-1.5 py-1"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            >
              <option value="">Стикер</option>
              <option value="🌿">🌿</option>
              <option value="✨">✨</option>
              <option value="🥀">🥀</option>
              <option value="🌙">🌙</option>
              <option value="📌">📌</option>
              <option value="❤️">❤️</option>
            </select>
            <label className="inline-flex items-center gap-1 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={selHandwriting}
                onChange={(e) => setSelHandwriting(e.target.checked)}
              />
              От руки
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1">
              <button
                onClick={handleSaveSelectionAsQuote}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-black/5"
                style={{borderColor: 'var(--site-border)'}}
              >
                <Quote className="w-3.5 h-3.5" /> В цитаты
              </button>
              <button
                onClick={() => clipPhotoInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-black/5"
                style={{borderColor: 'var(--site-border)'}}
                title="Прикрепить картинку скрепкой"
              >
                <Paperclip className="w-3.5 h-3.5" /> Фото
              </button>
            </div>
            <button
              onClick={handleSaveSelectionAnnotation}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: 'var(--site-accent)',
                color: 'var(--site-accent-contrast)',
              }}
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {showThemeModal && (
        <ThemeBuilderModal
          currentThemeId={activeTheme.id}
          onApplyToBook={(tid) => updateBook({...book, pageThemeId: tid})}
          onApplyGlobal={(tid) =>
            updateSettings((prev) => ({
              ...prev,
              reader: {...prev.reader, defaultPageThemeId: tid},
            }))
          }
          onClose={() => setShowThemeModal(false)}
        />
      )}

      {showBookmarkModal && (
        <SmartBookmarkModal
          book={book}
          pageIndex={editingBookmark ? editingBookmark.pageIndex : pageIndex}
          chapterId={currentPage?.chapterId}
          chapterTitle={currentPage?.chapterTitle}
          existing={editingBookmark}
          onClose={() => {
            setShowBookmarkModal(false);
            setEditingBookmark(null);
          }}
        />
      )}
    </div>
  );
};

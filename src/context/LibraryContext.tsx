import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
  ACHIEVEMENTS_CATALOG,
  AchievementProgressItem,
  evaluateAchievementsState,
} from '../constants/achievements';
import {DEFAULT_BOOKMARK_CATEGORIES} from '../constants/bookmarks';
import {DEFAULT_USER_COLORS, DEFAULT_USER_PALETTES} from '../constants/colors';
import {
  BUILT_IN_PAGE_THEMES,
  DEFAULT_APP_SETTINGS,
  SITE_THEMES,
} from '../constants/themes';
import {ensureInitialSeedData} from '../db/seedData';
import {
  getCurrentSessionAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
} from '../db/auth';
import {
  dbStorage,
  hasPendingWrites,
  onSaveStatusChange,
  SaveStatus,
  setActiveStorageAccount,
} from '../db/storage';
import {
  AchievementDefinition,
  Annotation,
  AnnotationCategory,
  AppSettings,
  Book,
  BookContent,
  BookJournal,
  BookmarkCategoryDef,
  CustomFont,
  NavSection,
  PageTheme,
  QuizAttempt,
  ReadingSession,
  SavedQuote,
  ScrapbookAsset,
  ScrapbookItem,
  SmartBookmark,
  TimelineEventOverride,
  TimelineLogEntry,
  UnlockedAchievement,
  UserAccount,
  UserCollection,
  UserColorItem,
  UserColorPalette,
} from '../types/library';
import {parseColorString, rgbaToHex} from '../utils/colorUtils';
import {registerAllCustomFonts, registerCustomFont} from '../utils/fontLoader';
import {parseBookFile, ParseProgressOptions} from '../utils/bookParser';

interface ReaderTarget {
  bookId: string;
  pageIndex?: number;
  highlightAnnotationId?: string;
}

interface LibraryContextValue {
  authReady: boolean;
  account: UserAccount | null;
  login: (nickname: string, password: string) => Promise<void>;
  register: (nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  ready: boolean;
  saveStatus: SaveStatus;
  navSection: NavSection;
  setNavSection: (sec: NavSection) => void;
  activeCollectionId: string | null;
  setActiveCollectionId: (id: string | null) => void;

  books: Book[];
  annotations: Annotation[];
  quotes: SavedQuote[];
  journals: BookJournal[];
  scrapbookItems: ScrapbookItem[];
  scrapbookAssets: ScrapbookAsset[];
  customThemes: PageTheme[];
  allPageThemes: PageTheme[];
  customFonts: CustomFont[];
  collections: UserCollection[];
  annotationCategories: AnnotationCategory[];
  readingSessions: ReadingSession[];
  smartBookmarks: SmartBookmark[];
  allBookmarkCategories: BookmarkCategoryDef[];
  quizAttempts: QuizAttempt[];
  unlockedAchievements: UnlockedAchievement[];
  achievementProgressMap: Record<string, AchievementProgressItem>;
  newlyUnlockedAchievement: AchievementDefinition | null;
  dismissAchievementBanner: () => void;
  timelineLogs: TimelineLogEntry[];
  timelineOverrides: TimelineEventOverride[];
  userColors: UserColorItem[];
  userColorPalettes: UserColorPalette[];
  recentColors: string[];
  settings: AppSettings;

  readerTarget: ReaderTarget | null;
  openBookInReader: (bookId: string, pageIndex?: number, highlightAnnotationId?: string) => void;
  closeReader: () => void;

  journalBookId: string | null;
  openBookJournal: (bookId: string) => void;
  quizBookId: string | null;
  openBookQuiz: (bookId: string) => void;
  timelineBookId: string | null;
  openBookTimeline: (bookId: string) => void;

  reloadAll: () => Promise<void>;
  importSingleFile: (file: File, options?: ParseProgressOptions) => Promise<Book[]>;
  importBooks: (files: FileList | File[]) => Promise<Book[]>;
  updateBook: (book: Book) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  replaceBookFile: (bookId: string, file: File) => Promise<void>;
  getBookContent: (bookId: string) => Promise<BookContent | undefined>;

  saveAnnotation: (ann: Annotation) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;

  saveQuote: (quote: SavedQuote) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;

  saveSmartBookmark: (bm: SmartBookmark) => Promise<void>;
  deleteSmartBookmark: (id: string) => Promise<void>;
  addCustomBookmarkCategory: (cat: BookmarkCategoryDef) => Promise<void>;
  deleteCustomBookmarkCategory: (id: string) => Promise<void>;

  saveQuizAttempt: (attempt: QuizAttempt) => Promise<void>;
  deleteQuizAttempt: (id: string) => Promise<void>;

  logTimelineEvent: (entry: TimelineLogEntry) => Promise<void>;
  saveTimelineOverride: (override: TimelineEventOverride) => Promise<void>;

  saveJournal: (journal: BookJournal) => Promise<void>;

  saveScrapbookItem: (item: ScrapbookItem) => Promise<void>;
  saveScrapbookItemsBulk: (items: ScrapbookItem[]) => Promise<void>;
  deleteScrapbookItem: (id: string) => Promise<void>;

  saveScrapbookAsset: (asset: ScrapbookAsset) => Promise<void>;
  deleteScrapbookAsset: (id: string) => Promise<void>;

  saveCustomTheme: (theme: PageTheme) => Promise<void>;
  deleteCustomTheme: (id: string) => Promise<void>;

  addCustomFont: (file: File, name?: string) => Promise<CustomFont>;
  deleteCustomFont: (id: string) => Promise<void>;

  saveCollection: (col: UserCollection) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  saveAnnotationCategory: (cat: AnnotationCategory) => Promise<void>;
  deleteAnnotationCategory: (id: string) => Promise<void>;

  saveUserColor: (color: UserColorItem) => Promise<void>;
  deleteUserColor: (id: string) => Promise<void>;
  togglePinUserColor: (id: string) => Promise<void>;
  saveUserPalette: (palette: UserColorPalette) => Promise<void>;
  deleteUserPalette: (id: string) => Promise<void>;
  recordRecentColor: (cssColor: string) => void;

  logReading: (bookId: string, pagesDelta: number, minutesDelta: number) => Promise<void>;
  updateSettings: (updater: (prev: AppSettings) => AppSettings) => Promise<void>;

  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export const LibraryProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [authReady, setAuthReady] = useState(false);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [navSection, setNavSection] = useState<NavSection>('home');
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [journals, setJournals] = useState<BookJournal[]>([]);
  const [scrapbookItems, setScrapbookItems] = useState<ScrapbookItem[]>([]);
  const [scrapbookAssets, setScrapbookAssets] = useState<ScrapbookAsset[]>([]);
  const [customThemes, setCustomThemes] = useState<PageTheme[]>([]);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [annotationCategories, setAnnotationCategories] = useState<AnnotationCategory[]>([]);
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [smartBookmarks, setSmartBookmarks] = useState<SmartBookmark[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [newlyUnlockedAchievement, setNewlyUnlockedAchievement] =
    useState<AchievementDefinition | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<TimelineLogEntry[]>([]);
  const [timelineOverrides, setTimelineOverrides] = useState<TimelineEventOverride[]>([]);
  const [userColors, setUserColors] = useState<UserColorItem[]>([]);
  const [userColorPalettes, setUserColorPalettes] = useState<UserColorPalette[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const [readerTarget, setReaderTarget] = useState<ReaderTarget | null>(null);
  const [journalBookId, setJournalBookId] = useState<string | null>(null);
  const [quizBookId, setQuizBookId] = useState<string | null>(null);
  const [timelineBookId, setTimelineBookId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const unlockedIdsRef = useRef<Set<string>>(new Set());
  const initialEvalDoneRef = useRef<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const dismissAchievementBanner = useCallback(() => {
    setNewlyUnlockedAchievement(null);
  }, []);

  useEffect(() => {
    if (!newlyUnlockedAchievement) return;
    const t = setTimeout(() => setNewlyUnlockedAchievement(null), 5000);
    return () => clearTimeout(t);
  }, [newlyUnlockedAchievement]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const clearInMemoryLibrary = useCallback(() => {
    setBooks([]);
    setAnnotations([]);
    setQuotes([]);
    setJournals([]);
    setScrapbookItems([]);
    setScrapbookAssets([]);
    setCustomThemes([]);
    setCustomFonts([]);
    setCollections([]);
    setAnnotationCategories([]);
    setReadingSessions([]);
    setSmartBookmarks([]);
    setQuizAttempts([]);
    setUnlockedAchievements([]);
    setNewlyUnlockedAchievement(null);
    setTimelineLogs([]);
    setTimelineOverrides([]);
    setUserColors([]);
    setUserColorPalettes([]);
    unlockedIdsRef.current = new Set();
    initialEvalDoneRef.current = false;
    setSettings(DEFAULT_APP_SETTINGS);
    setReaderTarget(null);
    setJournalBookId(null);
    setQuizBookId(null);
    setTimelineBookId(null);
    setActiveCollectionId(null);
    setNavSection('home');
    setReady(false);
  }, []);

  const reloadAll = useCallback(async () => {
    setReady(false);
    initialEvalDoneRef.current = false;
    await ensureInitialSeedData();
    const [
      loadedBooks,
      loadedAnns,
      loadedQuotes,
      loadedJournals,
      loadedSbItems,
      loadedSbAssets,
      loadedThemes,
      loadedFonts,
      loadedCols,
      loadedCats,
      loadedSessions,
      loadedBookmarks,
      loadedQuizzes,
      loadedAchievements,
      loadedTimelineLogs,
      loadedTimelineOverrides,
      loadedUserColors,
      loadedUserPalettes,
      loadedSettings,
    ] = await Promise.all([
      dbStorage.getAllBooks(),
      dbStorage.getAllAnnotations(),
      dbStorage.getAllQuotes(),
      dbStorage.getAllJournals(),
      dbStorage.getAllScrapbookItems(),
      dbStorage.getAllScrapbookAssets(),
      dbStorage.getAllCustomThemes(),
      dbStorage.getAllCustomFonts(),
      dbStorage.getAllCollections(),
      dbStorage.getAllAnnotationCategories(),
      dbStorage.getAllReadingSessions(),
      dbStorage.getAllSmartBookmarks(),
      dbStorage.getAllQuizAttempts(),
      dbStorage.getAllUnlockedAchievements(),
      dbStorage.getAllTimelineLogs(),
      dbStorage.getAllTimelineOverrides(),
      dbStorage.getAllUserColors(),
      dbStorage.getAllUserColorPalettes(),
      dbStorage.getSettings(),
    ]);

    // Seed starter palettes & colors once per account if missing
    let finalPalettes = loadedUserPalettes;
    if (finalPalettes.length === 0) {
      for (const p of DEFAULT_USER_PALETTES) {
        await dbStorage.saveUserColorPalette(p);
      }
      finalPalettes = [...DEFAULT_USER_PALETTES];
    }

    let finalColors = loadedUserColors;
    const colorsSeededMeta = await dbStorage.getMeta('user_colors_seeded_v1');
    if (!colorsSeededMeta && finalColors.length === 0) {
      const starter = [...DEFAULT_USER_COLORS];
      // Migrate any legacy customHighlightColors from settings
      for (let idx = 0; idx < (loadedSettings.customHighlightColors || []).length; idx++) {
        const legacy = loadedSettings.customHighlightColors[idx];
        const rgba = parseColorString(legacy.value);
        starter.push({
          id: `uc_legacy_${idx}_${Date.now()}`,
          name: legacy.name || `Цвет ${idx + 1}`,
          hex: rgbaToHex(rgba),
          alpha: rgba.a,
          cssValue: legacy.value,
          paletteId: 'pal_custom',
          pinned: false,
          createdAt: Date.now() + idx,
          updatedAt: Date.now() + idx,
        });
      }
      for (const c of starter) {
        await dbStorage.saveUserColor(c);
      }
      await dbStorage.setMeta('user_colors_seeded_v1', true);
      finalColors = starter;
    }

    await registerAllCustomFonts(loadedFonts);

    setBooks(loadedBooks.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt)));
    setAnnotations(loadedAnns.sort((a, b) => b.createdAt - a.createdAt));
    setQuotes(loadedQuotes.sort((a, b) => b.createdAt - a.createdAt));
    setJournals(loadedJournals);
    setScrapbookItems(loadedSbItems);
    setScrapbookAssets(loadedSbAssets.sort((a, b) => b.createdAt - a.createdAt));
    setCustomThemes(loadedThemes);
    setCustomFonts(loadedFonts);
    setCollections(loadedCols);
    setAnnotationCategories(loadedCats);
    setReadingSessions(loadedSessions.sort((a, b) => a.date.localeCompare(b.date)));
    setSmartBookmarks(loadedBookmarks.sort((a, b) => b.createdAt - a.createdAt));
    setQuizAttempts(loadedQuizzes.sort((a, b) => b.date - a.date));
    setUnlockedAchievements(loadedAchievements);
    unlockedIdsRef.current = new Set(loadedAchievements.map((a) => a.id));
    setTimelineLogs(loadedTimelineLogs.sort((a, b) => a.timestamp - b.timestamp));
    setTimelineOverrides(loadedTimelineOverrides);
    setUserColorPalettes(finalPalettes.sort((a, b) => a.createdAt - b.createdAt));
    setUserColors(finalColors.sort((a, b) => b.createdAt - a.createdAt));
    setSettings(loadedSettings);
    setReady(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessionAccount = await getCurrentSessionAccount();
        if (!mounted) return;
        if (sessionAccount) {
          setActiveStorageAccount(sessionAccount.id);
          setAccount(sessionAccount);
          await reloadAll();
        }
      } finally {
        if (mounted) setAuthReady(true);
      }
    })();

    const unsub = onSaveStatusChange(setSaveStatus);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingWrites()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      mounted = false;
      unsub();
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [reloadAll]);

  const login = useCallback(
    async (nickname: string, password: string) => {
      const acc = await loginAccount(nickname, password);
      clearInMemoryLibrary();
      setActiveStorageAccount(acc.id);
      setAccount(acc);
      await reloadAll();
      showToast(`С возвращением, ${acc.nickname}!`);
    },
    [clearInMemoryLibrary, reloadAll, showToast]
  );

  const register = useCallback(
    async (nickname: string, password: string) => {
      const acc = await registerAccount(nickname, password);
      clearInMemoryLibrary();
      setActiveStorageAccount(acc.id);
      setAccount(acc);
      await reloadAll();
      showToast(`Добро пожаловать в chitay, ${acc.nickname}!`);
    },
    [clearInMemoryLibrary, reloadAll, showToast]
  );

  const logout = useCallback(async () => {
    await logoutAccount();
    setActiveStorageAccount(null);
    setAccount(null);
    clearInMemoryLibrary();
  }, [clearInMemoryLibrary]);

  // Apply Site Theme CSS Variables & Dark class
  useEffect(() => {
    const theme = SITE_THEMES.find((t) => t.id === settings.siteTheme) || SITE_THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--site-bg', theme.vars.bg);
    root.style.setProperty('--site-surface', theme.vars.surface);
    root.style.setProperty('--site-surface-alt', theme.vars.surfaceAlt);
    root.style.setProperty('--site-border', theme.vars.border);
    root.style.setProperty('--site-text', theme.vars.text);
    root.style.setProperty('--site-text-muted', theme.vars.textMuted);
    root.style.setProperty('--site-accent', theme.vars.accent);
    root.style.setProperty('--site-accent-contrast', theme.vars.accentContrast);
    root.style.setProperty('--site-shadow', theme.vars.shadow);
    if (theme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.siteTheme]);

  const allPageThemes = useMemo(
    () => [...BUILT_IN_PAGE_THEMES, ...customThemes],
    [customThemes]
  );

  const openBookInReader = useCallback(
    (bookId: string, pageIndex?: number, highlightAnnotationId?: string) => {
      setReaderTarget({bookId, pageIndex, highlightAnnotationId});
      setSettings((prev) => {
        const next: AppSettings = {
          ...prev,
          lastOpenedBookId: bookId,
          lastOpenedPage: pageIndex ?? prev.lastOpenedPage ?? 0,
        };
        dbStorage.saveSettings(next);
        return next;
      });
    },
    []
  );

  const closeReader = useCallback(() => {
    setReaderTarget(null);
  }, []);

  const allBookmarkCategories = useMemo(
    () => [...DEFAULT_BOOKMARK_CATEGORIES, ...(settings.customBookmarkCategories || [])],
    [settings.customBookmarkCategories]
  );

  const achievementProgressMap = useMemo(() => {
    return evaluateAchievementsState({
      books,
      annotations,
      quotes,
      smartBookmarks,
      journals,
      scrapbookItems,
      collections,
      customThemes,
      customFonts,
      readingSessions,
      quizAttempts,
    });
  }, [
    books,
    annotations,
    quotes,
    smartBookmarks,
    journals,
    scrapbookItems,
    collections,
    customThemes,
    customFonts,
    readingSessions,
    quizAttempts,
  ]);

  // Evaluate newly unlocked achievements automatically
  useEffect(() => {
    if (!ready || !account) return;
    const newlyUnlocked: UnlockedAchievement[] = [];
    const now = Date.now();
    for (const def of ACHIEVEMENTS_CATALOG) {
      const prog = achievementProgressMap[def.id];
      if (prog?.unlocked && !unlockedIdsRef.current.has(def.id)) {
        unlockedIdsRef.current.add(def.id);
        newlyUnlocked.push({id: def.id, unlockedAt: now, seen: !initialEvalDoneRef.current});
      }
    }
    if (newlyUnlocked.length > 0) {
      dbStorage.saveUnlockedAchievements(newlyUnlocked).catch(() => {});
      setUnlockedAchievements((prev) => [...prev, ...newlyUnlocked]);
      if (initialEvalDoneRef.current) {
        const firstDef = ACHIEVEMENTS_CATALOG.find((d) => d.id === newlyUnlocked[0].id);
        if (firstDef) {
          setNewlyUnlockedAchievement(firstDef);
        }
      }
    }
    initialEvalDoneRef.current = true;
  }, [ready, account, achievementProgressMap]);

  const openBookJournal = useCallback((bookId: string) => {
    setJournalBookId(bookId);
    setNavSection('journal');
  }, []);

  const openBookQuiz = useCallback((bookId: string) => {
    setQuizBookId(bookId);
    setNavSection('quiz');
  }, []);

  const openBookTimeline = useCallback((bookId: string) => {
    setTimelineBookId(bookId);
    setNavSection('timeline');
  }, []);

  const logTimelineEvent = useCallback(async (entry: TimelineLogEntry) => {
    setTimelineLogs((prev) => {
      if (prev.some((l) => l.id === entry.id)) return prev;
      dbStorage.saveTimelineLog(entry).catch(() => {});
      return [...prev, entry].sort((a, b) => a.timestamp - b.timestamp);
    });
  }, []);

  const saveTimelineOverride = useCallback(async (override: TimelineEventOverride) => {
    await dbStorage.saveTimelineOverride(override);
    setTimelineOverrides((prev) => {
      const exists = prev.some((o) => o.id === override.id);
      return exists ? prev.map((o) => (o.id === override.id ? override : o)) : [...prev, override];
    });
  }, []);

  const importSingleFile = useCallback(
    async (file: File, options?: ParseProgressOptions): Promise<Book[]> => {
      const results = await parseBookFile(file, options);
      const imported: Book[] = [];
      for (const {book, content} of results) {
        if (options?.signal?.aborted) break;
        await dbStorage.saveBook(book);
        await dbStorage.saveBookContent(content);
        imported.push(book);
      }
      if (imported.length > 0) {
        setBooks((prev) => [...imported, ...prev]);
        options?.onProgress?.(100, 'Готово');
      }
      return imported;
    },
    []
  );

  const importBooks = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      const imported: Book[] = [];
      for (const file of list) {
        const added = await importSingleFile(file);
        imported.push(...added);
      }
      if (imported.length > 0) {
        showToast(
          imported.length === 1
            ? `Книга «${imported[0].title}» добавлена в библиотеку`
            : `Добавлено книг: ${imported.length}`
        );
      }
      return imported;
    },
    [importSingleFile, showToast]
  );

  const updateBook = useCallback(
    async (book: Book) => {
      const prevBook = books.find((b) => b.id === book.id);
      const nextMaxPage = Math.max(
        book.currentPage,
        book.maxPageReached || 0,
        prevBook?.maxPageReached || 0
      );
      const normalizedBook: Book = {
        ...book,
        maxPageReached: nextMaxPage,
      };
      await dbStorage.saveBook(normalizedBook);
      setBooks((prev) => prev.map((b) => (b.id === normalizedBook.id ? normalizedBook : b)));

      // Auto-log timeline milestones
      const todayKey = new Date().toISOString().slice(0, 10);
      if (prevBook && normalizedBook.currentPage !== prevBook.currentPage) {
        // Log reading day
        logTimelineEvent({
          id: `tl_day_${normalizedBook.id}_${todayKey}`,
          bookId: normalizedBook.id,
          type: 'reading_day',
          title: 'День чтения',
          details: `Дошли до страницы ${normalizedBook.currentPage + 1} (${normalizedBook.scrollProgress}%)`,
          pageIndex: normalizedBook.currentPage,
          timestamp: Date.now(),
        });

        // Log chapter arrival
        const chapter = [...(normalizedBook.toc || [])]
          .reverse()
          .find((t) => normalizedBook.currentPage >= t.pageIndex);
        if (chapter) {
          logTimelineEvent({
            id: `tl_chap_${normalizedBook.id}_${chapter.id}`,
            bookId: normalizedBook.id,
            type: 'chapter',
            title: `Прочитана глава: ${chapter.title}`,
            details: `Страница ${chapter.pageIndex + 1}`,
            pageIndex: chapter.pageIndex,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            timestamp: Date.now(),
          });
        }

        // Log progress milestones (25%, 50%, 75%)
        for (const milestone of [25, 50, 75]) {
          if (normalizedBook.scrollProgress >= milestone) {
            logTimelineEvent({
              id: `tl_prog_${normalizedBook.id}_${milestone}`,
              bookId: normalizedBook.id,
              type: 'progress',
              title: `Пройдено ${milestone}% книги`,
              details: `${normalizedBook.currentPage + 1} из ${normalizedBook.totalPages} страниц`,
              pageIndex: normalizedBook.currentPage,
              timestamp: Date.now(),
            });
          }
        }
      }

      if (prevBook && prevBook.status !== 'finished' && normalizedBook.status === 'finished') {
        logTimelineEvent({
          id: `tl_fin_${normalizedBook.id}_${todayKey}`,
          bookId: normalizedBook.id,
          type: 'finished',
          title: 'Книга завершена',
          details: `Прочитаны все ${normalizedBook.totalPages} страниц`,
          pageIndex: Math.max(0, normalizedBook.totalPages - 1),
          timestamp: Date.now(),
        });
      }

      if (
        prevBook &&
        prevBook.status === 'finished' &&
        normalizedBook.currentPage < Math.max(2, Math.floor(normalizedBook.totalPages * 0.15)) &&
        normalizedBook.status === 'reading'
      ) {
        logTimelineEvent({
          id: `tl_reread_${normalizedBook.id}_${todayKey}`,
          bookId: normalizedBook.id,
          type: 'reread',
          title: 'Начато повторное чтение',
          details: 'Возвращение к любимой истории с первой страницы',
          pageIndex: normalizedBook.currentPage,
          timestamp: Date.now(),
        });
      }

      setSettings((prev) => {
        if (prev.lastOpenedBookId !== normalizedBook.id && readerTarget?.bookId !== normalizedBook.id) {
          return prev;
        }
        if (prev.lastOpenedBookId === normalizedBook.id && prev.lastOpenedPage === normalizedBook.currentPage) {
          return prev;
        }
        const next: AppSettings = {
          ...prev,
          lastOpenedBookId: normalizedBook.id,
          lastOpenedPage: normalizedBook.currentPage,
        };
        dbStorage.saveSettings(next);
        return next;
      });
    },
    [books, logTimelineEvent, readerTarget?.bookId]
  );

  const deleteBook = useCallback(async (bookId: string) => {
    await dbStorage.deleteBook(bookId);
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    setAnnotations((prev) => prev.filter((a) => a.bookId !== bookId));
    setQuotes((prev) => prev.filter((q) => q.bookId !== bookId));
    setScrapbookItems((prev) => prev.filter((s) => s.bookId !== bookId));
    setJournals((prev) => prev.filter((j) => j.bookId !== bookId));
    setSmartBookmarks((prev) => prev.filter((bm) => bm.bookId !== bookId));
    setQuizAttempts((prev) => prev.filter((qz) => qz.bookId !== bookId));
    setTimelineLogs((prev) => prev.filter((tl) => tl.bookId !== bookId));
    setTimelineOverrides((prev) => prev.filter((ov) => ov.bookId !== bookId));
    showToast('Книга удалена из библиотеки');
  }, [showToast]);

  const replaceBookFile = useCallback(async (bookId: string, file: File) => {
    const results = await parseBookFile(file);
    if (results.length === 0) return;
    const parsed = results[0];
    const existing = books.find((b) => b.id === bookId);
    if (!existing) return;
    const updatedBook: Book = {
      ...existing,
      format: parsed.book.format,
      totalPages: parsed.book.totalPages,
      toc: parsed.book.toc,
      currentPage: Math.min(existing.currentPage, Math.max(0, parsed.book.totalPages - 1)),
    };
    const updatedContent: BookContent = {
      ...parsed.content,
      bookId,
    };
    await dbStorage.saveBook(updatedBook);
    await dbStorage.saveBookContent(updatedContent);
    setBooks((prev) => prev.map((b) => (b.id === bookId ? updatedBook : b)));
    showToast('Файл книги обновлён');
  }, [books, showToast]);

  const getBookContent = useCallback((bookId: string) => {
    return dbStorage.getBookContent(bookId);
  }, []);

  const saveAnnotation = useCallback(async (ann: Annotation) => {
    await dbStorage.saveAnnotation(ann);
    setAnnotations((prev) => {
      const exists = prev.some((a) => a.id === ann.id);
      return exists ? prev.map((a) => (a.id === ann.id ? ann : a)) : [ann, ...prev];
    });
  }, []);

  const deleteAnnotation = useCallback(async (id: string) => {
    await dbStorage.deleteAnnotation(id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const saveQuote = useCallback(async (quote: SavedQuote) => {
    await dbStorage.saveQuote(quote);
    setQuotes((prev) => {
      const exists = prev.some((q) => q.id === quote.id);
      return exists ? prev.map((q) => (q.id === quote.id ? quote : q)) : [quote, ...prev];
    });
  }, []);

  const deleteQuote = useCallback(async (id: string) => {
    await dbStorage.deleteQuote(id);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const saveSmartBookmark = useCallback(async (bm: SmartBookmark) => {
    await dbStorage.saveSmartBookmark(bm);
    setSmartBookmarks((prev) => {
      const exists = prev.some((b) => b.id === bm.id);
      return exists ? prev.map((b) => (b.id === bm.id ? bm : b)) : [bm, ...prev];
    });
  }, []);

  const deleteSmartBookmark = useCallback(async (id: string) => {
    await dbStorage.deleteSmartBookmark(id);
    setSmartBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addCustomBookmarkCategory = useCallback(async (cat: BookmarkCategoryDef) => {
    setSettings((prev) => {
      const next: AppSettings = {
        ...prev,
        customBookmarkCategories: [...(prev.customBookmarkCategories || []), {...cat, isCustom: true}],
      };
      dbStorage.saveSettings(next);
      return next;
    });
  }, []);

  const deleteCustomBookmarkCategory = useCallback(async (id: string) => {
    setSettings((prev) => {
      const next: AppSettings = {
        ...prev,
        customBookmarkCategories: (prev.customBookmarkCategories || []).filter((c) => c.id !== id),
      };
      dbStorage.saveSettings(next);
      return next;
    });
  }, []);

  const saveQuizAttempt = useCallback(async (attempt: QuizAttempt) => {
    await dbStorage.saveQuizAttempt(attempt);
    setQuizAttempts((prev) => {
      const exists = prev.some((q) => q.id === attempt.id);
      return exists ? prev.map((q) => (q.id === attempt.id ? attempt : q)) : [attempt, ...prev];
    });
  }, []);

  const deleteQuizAttempt = useCallback(async (id: string) => {
    await dbStorage.deleteQuizAttempt(id);
    setQuizAttempts((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const saveJournal = useCallback(
    async (journal: BookJournal) => {
      const prevJ = journals.find((j) => j.bookId === journal.bookId);
      await dbStorage.saveJournal(journal);
      setJournals((prev) => {
        const exists = prev.some((j) => j.id === journal.id);
        return exists ? prev.map((j) => (j.id === journal.id ? journal : j)) : [journal, ...prev];
      });
      if (journal.theories.trim() && journal.theories.trim() !== prevJ?.theories?.trim()) {
        logTimelineEvent({
          id: `tl_th_${journal.bookId}_${new Date().toISOString().slice(0, 10)}`,
          bookId: journal.bookId,
          type: 'theory',
          title: 'Записана теория о сюжете',
          details: journal.theories.trim().slice(0, 160),
          timestamp: Date.now(),
        });
      }
      if (
        journal.emotions.length > 0 &&
        journal.emotions.join('|') !== (prevJ?.emotions || []).join('|')
      ) {
        logTimelineEvent({
          id: `tl_emo_${journal.bookId}_${Date.now()}`,
          bookId: journal.bookId,
          type: 'emotion',
          title: 'Обновлены эмоции чтения',
          details: journal.emotions.join(' · '),
          timestamp: Date.now(),
        });
      }
    },
    [journals, logTimelineEvent]
  );

  const saveScrapbookItem = useCallback(async (item: ScrapbookItem) => {
    await dbStorage.saveScrapbookItem(item);
    setScrapbookItems((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      return exists ? prev.map((s) => (s.id === item.id ? item : s)) : [...prev, item];
    });
  }, []);

  const saveScrapbookItemsBulk = useCallback(async (items: ScrapbookItem[]) => {
    await dbStorage.saveScrapbookItemsBulk(items);
    setScrapbookItems((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      for (const it of items) map.set(it.id, it);
      return Array.from(map.values());
    });
  }, []);

  const deleteScrapbookItem = useCallback(async (id: string) => {
    await dbStorage.deleteScrapbookItem(id);
    setScrapbookItems((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const saveScrapbookAsset = useCallback(async (asset: ScrapbookAsset) => {
    await dbStorage.saveScrapbookAsset(asset);
    setScrapbookAssets((prev) => {
      const exists = prev.some((a) => a.id === asset.id);
      return exists ? prev.map((a) => (a.id === asset.id ? asset : a)) : [asset, ...prev];
    });
  }, []);

  const deleteScrapbookAsset = useCallback(async (id: string) => {
    await dbStorage.deleteScrapbookAsset(id);
    setScrapbookAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const saveCustomTheme = useCallback(async (theme: PageTheme) => {
    await dbStorage.saveCustomTheme(theme);
    setCustomThemes((prev) => {
      const exists = prev.some((t) => t.id === theme.id);
      return exists ? prev.map((t) => (t.id === theme.id ? theme : t)) : [...prev, theme];
    });
  }, []);

  const deleteCustomTheme = useCallback(async (id: string) => {
    await dbStorage.deleteCustomTheme(id);
    setCustomThemes((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addCustomFont = useCallback(async (file: File, customName?: string) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'ttf';
    const format = (['ttf', 'otf', 'woff', 'woff2'].includes(ext) ? ext : 'ttf') as CustomFont['format'];
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    const font: CustomFont = {
      id: `font_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: customName?.trim() || file.name.replace(/\.[^.]+$/, ''),
      format,
      dataUrl,
      createdAt: Date.now(),
    };
    await registerCustomFont(font);
    await dbStorage.saveCustomFont(font);
    setCustomFonts((prev) => [font, ...prev]);
    showToast(`Шрифт «${font.name}» добавлен`);
    return font;
  }, [showToast]);

  const deleteCustomFont = useCallback(async (id: string) => {
    await dbStorage.deleteCustomFont(id);
    setCustomFonts((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const saveCollection = useCallback(async (col: UserCollection) => {
    await dbStorage.saveCollection(col);
    setCollections((prev) => {
      const exists = prev.some((c) => c.id === col.id);
      return exists ? prev.map((c) => (c.id === col.id ? col : c)) : [...prev, col];
    });
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    await dbStorage.deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const saveAnnotationCategory = useCallback(async (cat: AnnotationCategory) => {
    await dbStorage.saveAnnotationCategory(cat);
    setAnnotationCategories((prev) => {
      const exists = prev.some((c) => c.id === cat.id);
      return exists ? prev.map((c) => (c.id === cat.id ? cat : c)) : [...prev, cat];
    });
  }, []);

  const deleteAnnotationCategory = useCallback(async (id: string) => {
    await dbStorage.deleteAnnotationCategory(id);
    setAnnotationCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const saveUserColor = useCallback(async (color: UserColorItem) => {
    await dbStorage.saveUserColor(color);
    setUserColors((prev) => {
      const exists = prev.some((c) => c.id === color.id);
      return exists ? prev.map((c) => (c.id === color.id ? color : c)) : [color, ...prev];
    });
  }, []);

  const deleteUserColor = useCallback(async (id: string) => {
    await dbStorage.deleteUserColor(id);
    setUserColors((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const togglePinUserColor = useCallback(async (id: string) => {
    const target = userColors.find((c) => c.id === id);
    if (!target) return;
    const updated: UserColorItem = {...target, pinned: !target.pinned, updatedAt: Date.now()};
    await dbStorage.saveUserColor(updated);
    setUserColors((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, [userColors]);

  const saveUserPalette = useCallback(async (palette: UserColorPalette) => {
    await dbStorage.saveUserColorPalette(palette);
    setUserColorPalettes((prev) => {
      const exists = prev.some((p) => p.id === palette.id);
      return exists ? prev.map((p) => (p.id === palette.id ? palette : p)) : [...prev, palette];
    });
  }, []);

  const deleteUserPalette = useCallback(async (id: string) => {
    await dbStorage.deleteUserColorPalette(id);
    setUserColorPalettes((prev) => prev.filter((p) => p.id !== id));
    // Reassign orphaned colors to 'pal_custom'
    const affected = userColors.filter((c) => c.paletteId === id);
    for (const c of affected) {
      await dbStorage.saveUserColor({...c, paletteId: 'pal_custom', updatedAt: Date.now()});
    }
    if (affected.length > 0) {
      setUserColors((prev) =>
        prev.map((c) => (c.paletteId === id ? {...c, paletteId: 'pal_custom'} : c))
      );
    }
  }, [userColors]);

  const recordRecentColor = useCallback((cssColor: string) => {
    const clean = (cssColor || '').trim();
    if (!clean) return;
    setSettings((prev) => {
      const current = prev.recentColors || [];
      if (current[0] === clean) return prev;
      const nextList = [clean, ...current.filter((c) => c !== clean)].slice(0, 14);
      const next: AppSettings = {...prev, recentColors: nextList};
      dbStorage.saveSettings(next);
      return next;
    });
  }, []);

  const recentColors = useMemo(() => settings.recentColors || [], [settings.recentColors]);

  const logReading = useCallback(async (bookId: string, pagesDelta: number, minutesDelta: number) => {
    await dbStorage.logReadingActivity(bookId, pagesDelta, minutesDelta);
    const updated = await dbStorage.getAllReadingSessions();
    setReadingSessions(updated.sort((a, b) => a.date.localeCompare(b.date)));
  }, []);

  const updateSettings = useCallback(async (updater: (prev: AppSettings) => AppSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      dbStorage.saveSettings(next);
      return next;
    });
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        authReady,
        account,
        login,
        register,
        logout,
        ready,
        saveStatus,
        navSection,
        setNavSection,
        activeCollectionId,
        setActiveCollectionId,
        books,
        annotations,
        quotes,
        journals,
        scrapbookItems,
        scrapbookAssets,
        customThemes,
        allPageThemes,
        customFonts,
        collections,
        annotationCategories,
        readingSessions,
        smartBookmarks,
        allBookmarkCategories,
        quizAttempts,
        unlockedAchievements,
        achievementProgressMap,
        newlyUnlockedAchievement,
        dismissAchievementBanner,
        timelineLogs,
        timelineOverrides,
        userColors,
        userColorPalettes,
        recentColors,
        settings,
        readerTarget,
        openBookInReader,
        closeReader,
        journalBookId,
        openBookJournal,
        quizBookId,
        openBookQuiz,
        timelineBookId,
        openBookTimeline,
        reloadAll,
        importSingleFile,
        importBooks,
        updateBook,
        deleteBook,
        replaceBookFile,
        getBookContent,
        saveAnnotation,
        deleteAnnotation,
        saveQuote,
        deleteQuote,
        saveSmartBookmark,
        deleteSmartBookmark,
        addCustomBookmarkCategory,
        deleteCustomBookmarkCategory,
        saveQuizAttempt,
        deleteQuizAttempt,
        logTimelineEvent,
        saveTimelineOverride,
        saveJournal,
        saveScrapbookItem,
        saveScrapbookItemsBulk,
        deleteScrapbookItem,
        saveScrapbookAsset,
        deleteScrapbookAsset,
        saveCustomTheme,
        deleteCustomTheme,
        addCustomFont,
        deleteCustomFont,
        saveCollection,
        deleteCollection,
        saveAnnotationCategory,
        deleteAnnotationCategory,
        saveUserColor,
        deleteUserColor,
        togglePinUserColor,
        saveUserPalette,
        deleteUserPalette,
        recordRecentColor,
        logReading,
        updateSettings,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}

import {openDB, DBSchema, IDBPDatabase} from 'idb';
import JSZip from 'jszip';
import {
  Annotation,
  AnnotationCategory,
  AppSettings,
  Book,
  BookContent,
  BookJournal,
  CustomFont,
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
  UserCollection,
  UserColorItem,
  UserColorPalette,
} from '../types/library';
import {DEFAULT_ANNOTATION_CATEGORIES, DEFAULT_APP_SETTINGS} from '../constants/themes';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface VellumDB extends DBSchema {
  books: {key: string; value: Book};
  bookContents: {key: string; value: BookContent};
  annotations: {key: string; value: Annotation; indexes: {'by-book': string}};
  quotes: {key: string; value: SavedQuote; indexes: {'by-book': string}};
  journals: {key: string; value: BookJournal};
  scrapbookItems: {key: string; value: ScrapbookItem; indexes: {'by-book': string}};
  scrapbookAssets: {key: string; value: ScrapbookAsset};
  customThemes: {key: string; value: PageTheme};
  customFonts: {key: string; value: CustomFont};
  collections: {key: string; value: UserCollection};
  annotationCategories: {key: string; value: AnnotationCategory};
  readingSessions: {key: string; value: ReadingSession};
  smartBookmarks: {key: string; value: SmartBookmark; indexes: {'by-book': string}};
  quizAttempts: {key: string; value: QuizAttempt; indexes: {'by-book': string}};
  achievements: {key: string; value: UnlockedAchievement};
  timelineLogs: {key: string; value: TimelineLogEntry; indexes: {'by-book': string}};
  timelineOverrides: {key: string; value: TimelineEventOverride; indexes: {'by-book': string}};
  userColors: {key: string; value: UserColorItem};
  userColorPalettes: {key: string; value: UserColorPalette};
  settings: {key: string; value: AppSettings};
  meta: {key: string; value: {key: string; value: boolean | string | number}};
}

const DB_VERSION = 3;

let activeAccountId: string | null = null;
let dbPromise: Promise<IDBPDatabase<VellumDB>> | null = null;
const saveListeners = new Set<(status: SaveStatus) => void>();
let currentSaveStatus: SaveStatus = 'idle';
let pendingWrites = 0;

export function setActiveStorageAccount(accountId: string | null) {
  if (activeAccountId === accountId) return;
  if (dbPromise) {
    const prev = dbPromise;
    prev
      .then((db) => db.close())
      .catch(() => {});
  }
  activeAccountId = accountId;
  dbPromise = null;
  pendingWrites = 0;
  setSaveStatus('idle');
}

export function getActiveStorageAccountId(): string | null {
  return activeAccountId;
}

export function onSaveStatusChange(listener: (status: SaveStatus) => void): () => void {
  saveListeners.add(listener);
  listener(currentSaveStatus);
  return () => saveListeners.delete(listener);
}

function setSaveStatus(status: SaveStatus) {
  currentSaveStatus = status;
  saveListeners.forEach((fn) => fn(status));
}

async function trackWrite<T>(op: () => Promise<T>): Promise<T> {
  pendingWrites += 1;
  setSaveStatus('saving');
  try {
    const result = await op();
    pendingWrites = Math.max(0, pendingWrites - 1);
    if (pendingWrites === 0) {
      setSaveStatus('saved');
    }
    return result;
  } catch (err) {
    pendingWrites = Math.max(0, pendingWrites - 1);
    setSaveStatus('error');
    console.error('Storage write failed:', err);
    throw err;
  }
}

export function hasPendingWrites(): boolean {
  return pendingWrites > 0;
}

export async function getDB(): Promise<IDBPDatabase<VellumDB>> {
  if (!activeAccountId) {
    throw new Error('Требуется вход в аккаунт для доступа к библиотеке');
  }
  if (!dbPromise) {
    const dbName = `vellum_user_${activeAccountId}_db`;
    dbPromise = openDB<VellumDB>(dbName, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('bookContents')) {
          db.createObjectStore('bookContents', {keyPath: 'bookId'});
        }
        if (!db.objectStoreNames.contains('annotations')) {
          const store = db.createObjectStore('annotations', {keyPath: 'id'});
          store.createIndex('by-book', 'bookId');
        }
        if (!db.objectStoreNames.contains('quotes')) {
          const store = db.createObjectStore('quotes', {keyPath: 'id'});
          store.createIndex('by-book', 'bookId');
        }
        if (!db.objectStoreNames.contains('journals')) {
          db.createObjectStore('journals', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('scrapbookItems')) {
          const store = db.createObjectStore('scrapbookItems', {keyPath: 'id'});
          store.createIndex('by-book', 'bookId');
        }
        if (!db.objectStoreNames.contains('scrapbookAssets')) {
          db.createObjectStore('scrapbookAssets', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('customThemes')) {
          db.createObjectStore('customThemes', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('customFonts')) {
          db.createObjectStore('customFonts', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('annotationCategories')) {
          db.createObjectStore('annotationCategories', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('readingSessions')) {
          db.createObjectStore('readingSessions', {keyPath: 'date'});
        }
        if (!db.objectStoreNames.contains('smartBookmarks')) {
          const store = db.createObjectStore('smartBookmarks', {keyPath: 'id'});
          store.createIndex('by-book', 'bookId');
        }
        if (!db.objectStoreNames.contains('quizAttempts')) {
          const store = db.createObjectStore('quizAttempts', {keyPath: 'id'});
          store.createIndex('by-book', 'bookId');
        }
        if (!db.objectStoreNames.contains('achievements')) {
          db.createObjectStore('achievements', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('timelineLogs')) {
          const store = db.createObjectStore('timelineLogs', {keyPath: 'id'});
          store.createIndex('by-book', 'bookId');
        }
        if (!db.objectStoreNames.contains('timelineOverrides')) {
          const store = db.createObjectStore('timelineOverrides', {keyPath: 'id'});
          store.createIndex('by-book', 'bookId');
        }
        if (!db.objectStoreNames.contains('userColors')) {
          db.createObjectStore('userColors', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('userColorPalettes')) {
          db.createObjectStore('userColorPalettes', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', {keyPath: 'key'});
        }
      },
    });
  }
  return dbPromise;
}

export const dbStorage = {
  async getMeta(key: string) {
    const db = await getDB();
    return (await db.get('meta', key))?.value;
  },
  async setMeta(key: string, value: boolean | string | number) {
    const db = await getDB();
    return trackWrite(() => db.put('meta', {key, value}));
  },

  async getAllBooks(): Promise<Book[]> {
    const db = await getDB();
    return db.getAll('books');
  },
  async getBook(id: string): Promise<Book | undefined> {
    const db = await getDB();
    return db.get('books', id);
  },
  async saveBook(book: Book) {
    const db = await getDB();
    return trackWrite(() => db.put('books', book));
  },
  async deleteBook(id: string) {
    const db = await getDB();
    return trackWrite(async () => {
      await db.delete('books', id);
      await db.delete('bookContents', id);
      await db.delete('journals', id);
      const anns = await db.getAllFromIndex('annotations', 'by-book', id);
      for (const a of anns) await db.delete('annotations', a.id);
      const qs = await db.getAllFromIndex('quotes', 'by-book', id);
      for (const q of qs) await db.delete('quotes', q.id);
      const sbs = await db.getAllFromIndex('scrapbookItems', 'by-book', id);
      for (const s of sbs) await db.delete('scrapbookItems', s.id);
      const bms = await db.getAllFromIndex('smartBookmarks', 'by-book', id);
      for (const bm of bms) await db.delete('smartBookmarks', bm.id);
      const qzs = await db.getAllFromIndex('quizAttempts', 'by-book', id);
      for (const qz of qzs) await db.delete('quizAttempts', qz.id);
      const tls = await db.getAllFromIndex('timelineLogs', 'by-book', id);
      for (const tl of tls) await db.delete('timelineLogs', tl.id);
      const tlo = await db.getAllFromIndex('timelineOverrides', 'by-book', id);
      for (const ov of tlo) await db.delete('timelineOverrides', ov.id);
    });
  },

  async getBookContent(bookId: string): Promise<BookContent | undefined> {
    const db = await getDB();
    return db.get('bookContents', bookId);
  },
  async saveBookContent(content: BookContent) {
    const db = await getDB();
    return trackWrite(() => db.put('bookContents', content));
  },

  async getAllAnnotations(): Promise<Annotation[]> {
    const db = await getDB();
    return db.getAll('annotations');
  },
  async saveAnnotation(ann: Annotation) {
    const db = await getDB();
    return trackWrite(() => db.put('annotations', ann));
  },
  async deleteAnnotation(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('annotations', id));
  },

  async getAllQuotes(): Promise<SavedQuote[]> {
    const db = await getDB();
    return db.getAll('quotes');
  },
  async saveQuote(quote: SavedQuote) {
    const db = await getDB();
    return trackWrite(() => db.put('quotes', quote));
  },
  async deleteQuote(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('quotes', id));
  },

  async getAllJournals(): Promise<BookJournal[]> {
    const db = await getDB();
    return db.getAll('journals');
  },
  async saveJournal(journal: BookJournal) {
    const db = await getDB();
    return trackWrite(() => db.put('journals', journal));
  },

  async getAllScrapbookItems(): Promise<ScrapbookItem[]> {
    const db = await getDB();
    return db.getAll('scrapbookItems');
  },
  async saveScrapbookItem(item: ScrapbookItem) {
    const db = await getDB();
    return trackWrite(() => db.put('scrapbookItems', item));
  },
  async saveScrapbookItemsBulk(items: ScrapbookItem[]) {
    const db = await getDB();
    return trackWrite(async () => {
      const tx = db.transaction('scrapbookItems', 'readwrite');
      for (const item of items) {
        await tx.store.put(item);
      }
      await tx.done;
    });
  },
  async deleteScrapbookItem(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('scrapbookItems', id));
  },

  async getAllScrapbookAssets(): Promise<ScrapbookAsset[]> {
    const db = await getDB();
    return db.getAll('scrapbookAssets');
  },
  async saveScrapbookAsset(asset: ScrapbookAsset) {
    const db = await getDB();
    return trackWrite(() => db.put('scrapbookAssets', asset));
  },
  async deleteScrapbookAsset(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('scrapbookAssets', id));
  },

  async getAllCustomThemes(): Promise<PageTheme[]> {
    const db = await getDB();
    return db.getAll('customThemes');
  },
  async saveCustomTheme(theme: PageTheme) {
    const db = await getDB();
    return trackWrite(() => db.put('customThemes', theme));
  },
  async deleteCustomTheme(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('customThemes', id));
  },

  async getAllCustomFonts(): Promise<CustomFont[]> {
    const db = await getDB();
    return db.getAll('customFonts');
  },
  async saveCustomFont(font: CustomFont) {
    const db = await getDB();
    return trackWrite(() => db.put('customFonts', font));
  },
  async deleteCustomFont(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('customFonts', id));
  },

  async getAllCollections(): Promise<UserCollection[]> {
    const db = await getDB();
    return db.getAll('collections');
  },
  async saveCollection(col: UserCollection) {
    const db = await getDB();
    return trackWrite(() => db.put('collections', col));
  },
  async deleteCollection(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('collections', id));
  },

  async getAllAnnotationCategories(): Promise<AnnotationCategory[]> {
    const db = await getDB();
    const cats = await db.getAll('annotationCategories');
    if (cats.length === 0) {
      for (const c of DEFAULT_ANNOTATION_CATEGORIES) {
        await db.put('annotationCategories', c);
      }
      return DEFAULT_ANNOTATION_CATEGORIES;
    }
    return cats;
  },
  async saveAnnotationCategory(cat: AnnotationCategory) {
    const db = await getDB();
    return trackWrite(() => db.put('annotationCategories', cat));
  },
  async deleteAnnotationCategory(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('annotationCategories', id));
  },

  async getAllReadingSessions(): Promise<ReadingSession[]> {
    const db = await getDB();
    return db.getAll('readingSessions');
  },
  async logReadingActivity(bookId: string, pagesDelta: number, minutesDelta: number) {
    const db = await getDB();
    const today = new Date().toISOString().slice(0, 10);
    return trackWrite(async () => {
      const existing = (await db.get('readingSessions', today)) || {
        date: today,
        pagesRead: 0,
        minutesRead: 0,
        bookIds: [],
      };
      const bookIds = existing.bookIds.includes(bookId)
        ? existing.bookIds
        : [...existing.bookIds, bookId];
      await db.put('readingSessions', {
        date: today,
        pagesRead: Math.max(0, existing.pagesRead + pagesDelta),
        minutesRead: Math.max(0, existing.minutesRead + minutesDelta),
        bookIds,
      });
    });
  },

  async getAllSmartBookmarks(): Promise<SmartBookmark[]> {
    const db = await getDB();
    return db.getAll('smartBookmarks');
  },
  async saveSmartBookmark(bm: SmartBookmark) {
    const db = await getDB();
    return trackWrite(() => db.put('smartBookmarks', bm));
  },
  async deleteSmartBookmark(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('smartBookmarks', id));
  },

  async getAllQuizAttempts(): Promise<QuizAttempt[]> {
    const db = await getDB();
    return db.getAll('quizAttempts');
  },
  async saveQuizAttempt(attempt: QuizAttempt) {
    const db = await getDB();
    return trackWrite(() => db.put('quizAttempts', attempt));
  },
  async deleteQuizAttempt(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('quizAttempts', id));
  },

  async getAllUnlockedAchievements(): Promise<UnlockedAchievement[]> {
    const db = await getDB();
    return db.getAll('achievements');
  },
  async saveUnlockedAchievements(items: UnlockedAchievement[]) {
    const db = await getDB();
    return trackWrite(async () => {
      const tx = db.transaction('achievements', 'readwrite');
      for (const it of items) await tx.store.put(it);
      await tx.done;
    });
  },

  async getAllTimelineLogs(): Promise<TimelineLogEntry[]> {
    const db = await getDB();
    return db.getAll('timelineLogs');
  },
  async saveTimelineLog(entry: TimelineLogEntry) {
    const db = await getDB();
    return trackWrite(() => db.put('timelineLogs', entry));
  },
  async deleteTimelineLog(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('timelineLogs', id));
  },

  async getAllTimelineOverrides(): Promise<TimelineEventOverride[]> {
    const db = await getDB();
    return db.getAll('timelineOverrides');
  },
  async saveTimelineOverride(ov: TimelineEventOverride) {
    const db = await getDB();
    return trackWrite(() => db.put('timelineOverrides', ov));
  },

  async getAllUserColors(): Promise<UserColorItem[]> {
    const db = await getDB();
    return db.getAll('userColors');
  },
  async saveUserColor(color: UserColorItem) {
    const db = await getDB();
    return trackWrite(() => db.put('userColors', color));
  },
  async deleteUserColor(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('userColors', id));
  },

  async getAllUserColorPalettes(): Promise<UserColorPalette[]> {
    const db = await getDB();
    return db.getAll('userColorPalettes');
  },
  async saveUserColorPalette(pal: UserColorPalette) {
    const db = await getDB();
    return trackWrite(() => db.put('userColorPalettes', pal));
  },
  async deleteUserColorPalette(id: string) {
    const db = await getDB();
    return trackWrite(() => db.delete('userColorPalettes', id));
  },

  async getSettings(): Promise<AppSettings> {
    const db = await getDB();
    const saved = await db.get('settings', 'app_settings');
    if (!saved) {
      await db.put('settings', DEFAULT_APP_SETTINGS);
      return DEFAULT_APP_SETTINGS;
    }
    return {
      ...DEFAULT_APP_SETTINGS,
      ...saved,
      reader: {...DEFAULT_APP_SETTINGS.reader, ...(saved.reader || {})},
    };
  },
  async saveSettings(settings: AppSettings) {
    const db = await getDB();
    return trackWrite(() => db.put('settings', settings));
  },
};

export async function exportFullLibraryZip(): Promise<Blob> {
  const db = await getDB();
  const zip = new JSZip();

  const [
    books,
    bookContents,
    annotations,
    quotes,
    journals,
    scrapbookItems,
    scrapbookAssets,
    customThemes,
    customFonts,
    collections,
    annotationCategories,
    readingSessions,
    smartBookmarks,
    quizAttempts,
    achievements,
    timelineLogs,
    timelineOverrides,
    userColors,
    userColorPalettes,
    settings,
  ] = await Promise.all([
    db.getAll('books'),
    db.getAll('bookContents'),
    db.getAll('annotations'),
    db.getAll('quotes'),
    db.getAll('journals'),
    db.getAll('scrapbookItems'),
    db.getAll('scrapbookAssets'),
    db.getAll('customThemes'),
    db.getAll('customFonts'),
    db.getAll('collections'),
    db.getAll('annotationCategories'),
    db.getAll('readingSessions'),
    db.getAll('smartBookmarks'),
    db.getAll('quizAttempts'),
    db.getAll('achievements'),
    db.getAll('timelineLogs'),
    db.getAll('timelineOverrides'),
    db.getAll('userColors'),
    db.getAll('userColorPalettes'),
    db.get('settings', 'app_settings'),
  ]);

  const parsedContents = bookContents.map((c) => {
    const {originalFileData, ...rest} = c;
    if (originalFileData) {
      zip.file(`files/${c.bookId}_${c.originalFileName}`, originalFileData);
    }
    return {
      ...rest,
      hasBinaryFile: !!originalFileData,
    };
  });

  const manifest = {
    version: 3,
    exportedAt: new Date().toISOString(),
    books,
    bookContents: parsedContents,
    annotations,
    quotes,
    journals,
    scrapbookItems,
    scrapbookAssets,
    customThemes,
    customFonts,
    collections,
    annotationCategories,
    readingSessions,
    smartBookmarks,
    quizAttempts,
    achievements,
    timelineLogs,
    timelineOverrides,
    userColors,
    userColorPalettes,
    settings,
  };

  zip.file('library_backup.json', JSON.stringify(manifest));
  return zip.generateAsync({type: 'blob', compression: 'DEFLATE'});
}

export async function importFullLibraryZip(file: File): Promise<{booksCount: number}> {
  const zip = await JSZip.loadAsync(file);
  const jsonFile = zip.file('library_backup.json');
  if (!jsonFile) {
    throw new Error('Файл резервной копии повреждён или не содержит library_backup.json');
  }
  const raw = await jsonFile.async('string');
  const data = JSON.parse(raw);
  const db = await getDB();

  await trackWrite(async () => {
    for (const b of data.books || []) await db.put('books', b);
    for (const c of data.bookContents || []) {
      let originalFileData: ArrayBuffer | undefined;
      if (c.hasBinaryFile) {
        const bin = zip.file(`files/${c.bookId}_${c.originalFileName}`);
        if (bin) {
          originalFileData = await bin.async('arraybuffer');
        }
      }
      const {hasBinaryFile: _, ...clean} = c;
      await db.put('bookContents', {...clean, originalFileData});
    }
    for (const a of data.annotations || []) await db.put('annotations', a);
    for (const q of data.quotes || []) await db.put('quotes', q);
    for (const j of data.journals || []) await db.put('journals', j);
    for (const s of data.scrapbookItems || []) await db.put('scrapbookItems', s);
    for (const sa of data.scrapbookAssets || []) await db.put('scrapbookAssets', sa);
    for (const t of data.customThemes || []) await db.put('customThemes', t);
    for (const f of data.customFonts || []) await db.put('customFonts', f);
    for (const col of data.collections || []) await db.put('collections', col);
    for (const cat of data.annotationCategories || []) await db.put('annotationCategories', cat);
    for (const rs of data.readingSessions || []) await db.put('readingSessions', rs);
    for (const bm of data.smartBookmarks || []) await db.put('smartBookmarks', bm);
    for (const qz of data.quizAttempts || []) await db.put('quizAttempts', qz);
    for (const ach of data.achievements || []) await db.put('achievements', ach);
    for (const tl of data.timelineLogs || []) await db.put('timelineLogs', tl);
    for (const ov of data.timelineOverrides || []) await db.put('timelineOverrides', ov);
    for (const uc of data.userColors || []) await db.put('userColors', uc);
    for (const ucp of data.userColorPalettes || []) await db.put('userColorPalettes', ucp);
    if (data.settings) await db.put('settings', data.settings);
  });

  return {booksCount: (data.books || []).length};
}

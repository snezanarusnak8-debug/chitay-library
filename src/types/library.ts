export type BookFormat =
  | 'EPUB'
  | 'PDF'
  | 'FB2'
  | 'MOBI'
  | 'AZW3'
  | 'TXT'
  | 'DOCX'
  | 'DOC'
  | 'RTF'
  | 'HTML'
  | 'CBZ'
  | 'CBR'
  | 'ZIP';

export type ReadingStatus =
  | 'reading'
  | 'planned'
  | 'finished'
  | 'paused'
  | 'favorite'
  | 'dropped';

export interface TocItem {
  id: string;
  title: string;
  pageIndex: number;
  level: number;
}

export interface BookChapter {
  id: string;
  title: string;
  paragraphs: string[];
  startPageIndex: number;
}

export interface BookPage {
  index: number;
  chapterId: string;
  chapterTitle: string;
  paragraphs: string[];
  imageDataUrl?: string; // Used for comic pages or rendered PDF pages
}

export interface Book {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  coverDataUrl?: string;
  genre: string;
  tags: string[];
  status: ReadingStatus;
  collections: string[];
  rating: number; // 0 to 5
  totalPages: number;
  currentPage: number; // 0-indexed
  maxPageReached?: number; // highest 0-indexed page reached (for spoiler-free quiz)
  scrollProgress: number; // 0 to 100
  addedAt: number;
  lastReadAt?: number;
  readingSeconds: number;
  rereadCount?: number;
  description?: string;
  toc: TocItem[];
  bookmarks?: number[];
  pageThemeId?: string;
  readerSettingsOverride?: Partial<ReaderSettings>;
  isSample?: boolean;
}

export interface BookContent {
  bookId: string;
  originalFileName: string;
  mimeType: string;
  originalFileData?: ArrayBuffer;
  chapters: BookChapter[];
  pages: BookPage[];
  isComic?: boolean;
}

export type AnnotationStyleType =
  | 'highlight'
  | 'underline'
  | 'double_underline'
  | 'wavy'
  | 'box';

export interface AnnotationCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
  isCustom?: boolean;
}

export interface Annotation {
  id: string;
  bookId: string;
  pageIndex: number;
  chapterId: string;
  paragraphIndex: number;
  quoteText: string;
  color: string;
  styleType: AnnotationStyleType;
  categoryId: string;
  noteText: string;
  tags: string[];
  stickerEmoji?: string;
  marginIcon?: string;
  stampText?: string;
  handwriting?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type QuoteCardStyleId =
  | 'minimal'
  | 'literary_journal'
  | 'vintage_postcard'
  | 'dark_academia'
  | 'botanical'
  | 'celestial';

export interface QuoteCardConfig {
  styleId: QuoteCardStyleId;
  bgColor: string;
  bgGradient?: string;
  textColor: string;
  accentColor: string;
  texture: 'none' | 'grain' | 'aged' | 'linen' | 'dots' | 'stars';
  frameStyle: 'none' | 'hairline' | 'double' | 'corners';
  fontFamily: string;
  showDecor: boolean;
}

export interface SavedQuote {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  text: string;
  pageNumber: number; // 1-indexed display
  pageIndex: number;
  categoryId: string;
  color: string;
  note: string;
  cardConfig: QuoteCardConfig;
  createdAt: number;
}

export interface BookJournal {
  id: string; // matches bookId
  bookId: string;
  impressions: string;
  review: string;
  favoriteCharacters: string;
  dislikedCharacters: string;
  favoriteMoments: string;
  theories: string;
  predictions: string;
  emotions: string[];
  rating: number;
  startDate: string;
  finishDate: string;
  freeNotes: string;
  chapterEntries: Record<string, string>;
  updatedAt: number;
}

export type PaperclipStyle =
  | 'none'
  | 'classic_metal'
  | 'gold'
  | 'silver'
  | 'pastel_pink'
  | 'sage'
  | 'vintage_brass'
  | 'star_clip';

export type PhotoClipFrame =
  | 'none'
  | 'polaroid'
  | 'vintage'
  | 'white_frame'
  | 'torn'
  | 'taped'
  | 'clipped'
  | 'corners'
  | 'paper_back';

export type WashiPattern =
  | 'clear'
  | 'cream'
  | 'pink'
  | 'vintage'
  | 'floral'
  | 'plaid'
  | 'striped'
  | 'stars'
  | 'moon'
  | 'lace'
  | 'kraft'
  | 'torn';

export type NoteVariant =
  | 'sticky'
  | 'paper'
  | 'handwritten'
  | 'vintage_card'
  | 'mini_letter'
  | 'torn_paper'
  | 'quote_card'
  | 'newsprint';

export interface DrawingStroke {
  tool: 'pencil' | 'pen' | 'marker' | 'highlighter' | 'brush';
  color: string;
  width: number;
  opacity: number;
  points: {x: number; y: number}[];
}

export interface ScrapbookItemBase {
  id: string;
  bookId: string;
  pageIndex: number;
  type: 'photo' | 'sticker' | 'note' | 'washi' | 'paper' | 'drawing';
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  width: number; // percentage 5..95
  height: number; // percentage 4..95
  rotation: number; // degrees
  zIndex: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  groupId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScrapbookPhotoItem extends ScrapbookItemBase {
  type: 'photo';
  src: string;
  clipFrame: PhotoClipFrame;
  paperclipStyle: PaperclipStyle;
  paperclipPosition: 'top_left' | 'top_center' | 'top_right';
  caption: string;
  flipX: boolean;
  borderRadius: number;
  shadow: boolean;
  cropShape: 'rect' | 'square' | 'portrait' | 'circle';
  brightness: number;
  contrast: number;
  sepia: number;
  blur: number;
  linkedSnippet?: string;
}

export interface ScrapbookNoteItem extends ScrapbookItemBase {
  type: 'note' | 'paper';
  text: string;
  noteVariant: NoteVariant;
  bgColor: string;
  bgGradient?: string;
  bgOpacity?: number;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  padding: number;
  borderStyle: 'none' | 'solid' | 'dashed';
}

export interface ScrapbookStickerItem extends ScrapbookItemBase {
  type: 'sticker';
  stickerId: string;
  label: string;
  customImageSrc?: string;
  emoji?: string;
  tintColor?: string;
}

export interface ScrapbookWashiItem extends ScrapbookItemBase {
  type: 'washi';
  pattern: WashiPattern;
}

export interface ScrapbookDrawingItem extends ScrapbookItemBase {
  type: 'drawing';
  strokes: DrawingStroke[];
}

export type ScrapbookItem =
  | ScrapbookPhotoItem
  | ScrapbookNoteItem
  | ScrapbookStickerItem
  | ScrapbookWashiItem
  | ScrapbookDrawingItem;

export interface ScrapbookAsset {
  id: string;
  name: string;
  category: 'photo' | 'sticker' | 'paper' | 'template';
  src?: string;
  emoji?: string;
  favorite: boolean;
  createdAt: number;
}

export interface PageTheme {
  id: string;
  name: string;
  isBuiltIn?: boolean;
  bgColor: string;
  bgGradient?: string;
  customBgImage?: string;
  texture: 'none' | 'grain' | 'aged' | 'linen' | 'dots' | 'grid' | 'coffee' | 'stars' | 'newsprint';
  textureOpacity: number;
  textColor: string;
  headingColor: string;
  pageNumberColor: string;
  highlightTint: string;
  borderStyle: 'none' | 'hairline' | 'double' | 'ornate' | 'tape';
  borderColor: string;
  cornerRadius: number;
  shadowDepth: 'none' | 'soft' | 'deep';
  decorMotif: 'none' | 'botanical' | 'stars' | 'floral' | 'gothic' | 'vintage_stamp';
  isDark: boolean;
  fontFamilyOverride?: string;
  headingFontOverride?: string;
}

export type SiteThemeId =
  | 'cozy_library'
  | 'vintage_paper'
  | 'dark_academia'
  | 'soft_pink'
  | 'minimalist'
  | 'midnight_reader'
  | 'botanical_journal';

export type ShelfStyleId = 'oak' | 'minimal' | 'vintage' | 'gallery';
export type AnimationLevel = 'full' | 'simplified' | 'minimal' | 'off';
export type PageTurnMode = 'realistic_curl' | 'smooth_fade' | 'paper_bend' | 'instant' | 'vertical_scroll';
export type PageFlipSpeed = 'fast' | 'comfort' | 'slow';
export type LibraryViewMode = 'grid' | 'list' | 'shelves';
export type LibrarySortBy = 'lastRead' | 'addedAt' | 'title' | 'author' | 'rating' | 'status';

export interface ReaderSettings {
  fontFamily: string;
  headingFontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textWidth: number;
  pagePadding: number;
  textAlign: 'left' | 'justify';
  pageTurnMode: PageTurnMode;
  flipSpeed: PageFlipSpeed;
  defaultPageThemeId: string;
}

export interface CustomFont {
  id: string;
  name: string;
  format: 'ttf' | 'otf' | 'woff' | 'woff2';
  dataUrl: string;
  weight?: string;
  createdAt: number;
}

export interface UserCollection {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: number;
}

export interface ReadingSession {
  date: string; // YYYY-MM-DD
  pagesRead: number;
  minutesRead: number;
  bookIds: string[];
}

export interface BookmarkCategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

export interface SmartBookmark {
  id: string;
  bookId: string;
  pageIndex: number;
  chapterId?: string;
  chapterTitle?: string;
  title: string;
  type: string;
  color: string;
  icon: string;
  note: string;
  characterName?: string;
  tags: string[];
  stickerEmoji?: string;
  imageDataUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export type QuizQuestionType =
  | 'single_choice'
  | 'multi_choice'
  | 'true_false'
  | 'text_input'
  | 'sequence'
  | 'character_guess'
  | 'detail_event';

export interface QuizQuestion {
  id: string;
  signature: string;
  type: QuizQuestionType;
  prompt: string;
  chapterId: string;
  chapterTitle: string;
  pageIndex: number;
  options?: string[];
  correctSingleIndex?: number;
  correctMultiIndices?: number[];
  acceptableAnswers?: string[];
  sequenceItems?: string[];
  correctSequenceOrder?: string[];
  hintText?: string;
  explanation: string;
  sourceQuote?: string;
}

export interface QuizAnswerRecord {
  questionId: string;
  userAnswerDisplay: string;
  isCorrect: boolean;
}

export interface QuizAttempt {
  id: string;
  bookId: string;
  bookTitle: string;
  date: number;
  difficulty: QuizDifficulty;
  spoilerFree: boolean;
  chapterIds: string[];
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  questions: QuizQuestion[];
  answers: Record<string, QuizAnswerRecord>;
  wrongQuestionIds: string[];
  usedSignatures: string[];
}

export type AchievementCategory = 'library' | 'reading' | 'notes' | 'scrapbook' | 'quiz' | 'secret';
export type AchievementRarity = 'common' | 'rare' | 'legendary';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  hiddenDescription?: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  hidden?: boolean;
  icon: string;
  targetProgress: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
  seen?: boolean;
}

export type TimelineEventType =
  | 'started'
  | 'reading_day'
  | 'chapter'
  | 'progress'
  | 'quote'
  | 'annotation'
  | 'bookmark'
  | 'theory'
  | 'emotion'
  | 'quiz'
  | 'scrapbook'
  | 'finished'
  | 'reread';

export interface TimelineLogEntry {
  id: string;
  bookId: string;
  type: TimelineEventType;
  title: string;
  details: string;
  pageIndex?: number;
  chapterId?: string;
  chapterTitle?: string;
  timestamp: number;
}

export interface TimelineEventOverride {
  id: string;
  bookId: string;
  customTitle?: string;
  customDetails?: string;
  customTimestamp?: number;
  hidden?: boolean;
  deleted?: boolean;
}

export interface TimelineDisplayEvent {
  id: string;
  sourceId: string;
  bookId: string;
  type: TimelineEventType;
  title: string;
  details: string;
  timestamp: number;
  pageIndex?: number;
  chapterId?: string;
  chapterTitle?: string;
  annotationId?: string;
  quoteId?: string;
  bookmarkId?: string;
  quizAttemptId?: string;
  hidden?: boolean;
  isEdited?: boolean;
}

export interface UserColorPalette {
  id: string;
  name: string;
  description?: string;
  isBuiltIn?: boolean;
  createdAt: number;
}

export interface UserColorItem {
  id: string;
  name: string;
  hex: string; // #RRGGBB
  alpha: number; // 0..1
  cssValue: string; // #RRGGBB or rgba(...)
  gradientCss?: string; // optional linear-gradient(...)
  paletteId: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  id: 'app_settings';
  siteTheme: SiteThemeId;
  shelfStyle: ShelfStyleId;
  animationLevel: AnimationLevel;
  libraryViewMode: LibraryViewMode;
  librarySortBy: LibrarySortBy;
  customHighlightColors: {name: string; value: string}[];
  recentColors?: string[];
  customBookmarkCategories?: BookmarkCategoryDef[];
  reader: ReaderSettings;
  lastOpenedBookId?: string;
  lastOpenedPage?: number;
}

export interface UserAccount {
  id: string;
  nickname: string;
  nicknameKey: string;
  passwordHash: string;
  passwordSalt: string;
  iterations: number;
  createdAt: number;
  lastLoginAt: number;
}

export interface ActiveSession {
  id: 'current';
  accountId: string;
  nickname: string;
  createdAt: number;
}

export type NavSection =
  | 'home'
  | 'library'
  | 'reading'
  | 'planned'
  | 'finished'
  | 'collections'
  | 'annotations'
  | 'quotes'
  | 'bookmarks'
  | 'journal'
  | 'quiz'
  | 'timeline'
  | 'achievements'
  | 'colors'
  | 'fonts'
  | 'stats'
  | 'settings';



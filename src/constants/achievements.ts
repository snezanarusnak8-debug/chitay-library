import {
  AchievementDefinition,
  Annotation,
  Book,
  BookJournal,
  CustomFont,
  PageTheme,
  QuizAttempt,
  ReadingSession,
  SavedQuote,
  ScrapbookItem,
  SmartBookmark,
  UserCollection,
} from '../types/library';

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  {
    id: 'first_book_added',
    title: 'Первый том на полке',
    description: 'Добавьте вашу первую книгу в личную библиотеку.',
    category: 'library',
    rarity: 'common',
    icon: 'book_plus',
    targetProgress: 1,
  },
  {
    id: 'first_book_started',
    title: 'Открытая страница',
    description: 'Начните чтение книги и перелистните хотя бы несколько страниц.',
    category: 'reading',
    rarity: 'common',
    icon: 'book_open',
    targetProgress: 1,
  },
  {
    id: 'first_finished_book',
    title: 'Последняя точка',
    description: 'Прочитайте первую книгу до самого конца.',
    category: 'reading',
    rarity: 'common',
    icon: 'book_check',
    targetProgress: 1,
  },
  {
    id: 'first_quote',
    title: 'Слова, к которым хочется вернуться',
    description: 'Сохраните первую цитату из книги.',
    category: 'notes',
    rarity: 'common',
    icon: 'quote',
    targetProgress: 1,
  },
  {
    id: 'first_annotation',
    title: 'Карандаш на полях',
    description: 'Создайте первую заметку или выделение текста.',
    category: 'notes',
    rarity: 'common',
    icon: 'highlighter',
    targetProgress: 1,
  },
  {
    id: 'first_bookmark',
    title: 'Шёлковая ленточка',
    description: 'Сохраните первую умную закладку в книге.',
    category: 'notes',
    rarity: 'common',
    icon: 'bookmark',
    targetProgress: 1,
  },
  {
    id: 'first_scrapbook',
    title: 'Мастерская воспоминаний',
    description: 'Оформите первую страницу книги в режиме Scrapbook.',
    category: 'scrapbook',
    rarity: 'common',
    icon: 'sparkles',
    targetProgress: 1,
  },
  {
    id: 'multi_books_3',
    title: 'Уютная стопка',
    description: 'Откройте для себя или прочитайте 3 разные книги.',
    category: 'reading',
    rarity: 'common',
    icon: 'layers',
    targetProgress: 3,
  },
  {
    id: 'library_collector_7',
    title: 'Домашний читальный зал',
    description: 'Соберите в библиотеке 7 или более книг.',
    category: 'library',
    rarity: 'rare',
    icon: 'library',
    targetProgress: 7,
  },
  {
    id: 'collections_creator',
    title: 'Архивариус полок',
    description: 'Создайте собственную тематическую коллекцию книг.',
    category: 'library',
    rarity: 'common',
    icon: 'folder',
    targetProgress: 1,
  },
  {
    id: 'quotes_5',
    title: 'Гербарий цитат',
    description: 'Соберите коллекцию из 5 любимых цитат.',
    category: 'notes',
    rarity: 'common',
    icon: 'quote',
    targetProgress: 5,
  },
  {
    id: 'quotes_15',
    title: 'Сокровищница строк',
    description: 'Сохраните 15 или более вдохновляющих цитат.',
    category: 'notes',
    rarity: 'rare',
    icon: 'feather',
    targetProgress: 15,
  },
  {
    id: 'journal_keeper',
    title: 'Хроники читателя',
    description: 'Заполните впечатления, отзыв или заметки в книжном дневнике.',
    category: 'notes',
    rarity: 'common',
    icon: 'notebook',
    targetProgress: 1,
  },
  {
    id: 'character_researcher',
    title: 'Портретист героев',
    description: 'Запишите наблюдения о персонажах в дневнике или создайте закладку типа «Персонаж».',
    category: 'notes',
    rarity: 'rare',
    icon: 'users',
    targetProgress: 1,
  },
  {
    id: 'theory_architect',
    title: 'Детектив сюжета',
    description: 'Зафиксируйте свою теорию или догадку в дневнике, аннотации или закладке.',
    category: 'notes',
    rarity: 'rare',
    icon: 'compass',
    targetProgress: 1,
  },
  {
    id: 'first_quiz',
    title: 'Память сердца',
    description: 'Пройдите первый интерактивный тест «Что я помню?» по книге.',
    category: 'quiz',
    rarity: 'common',
    icon: 'brain',
    targetProgress: 1,
  },
  {
    id: 'quiz_master_3',
    title: 'Внимательный взгляд',
    description: 'Пройдите 3 теста «Что я помню?» с результатом от 70%.',
    category: 'quiz',
    rarity: 'rare',
    icon: 'award',
    targetProgress: 3,
  },
  {
    id: 'chapters_10',
    title: 'Дальняя дорога',
    description: 'Преодолейте рубеж в 10 прочитанных глав или 80 страниц в библиотеке.',
    category: 'reading',
    rarity: 'rare',
    icon: 'map',
    targetProgress: 10,
  },
  {
    id: 'return_after_pause',
    title: 'Тёплое возвращение',
    description: 'Вернитесь к чтению спустя несколько дней паузы или перечитайте книгу.',
    category: 'reading',
    rarity: 'rare',
    icon: 'rotate',
    targetProgress: 1,
  },
  {
    id: 'library_all_tools',
    title: 'Хранитель ремёсел',
    description: 'Попробуйте 5 разных инструментов: аннотации, цитаты, умные закладки, дневник, Scrapbook и тест.',
    category: 'library',
    rarity: 'legendary',
    icon: 'crown',
    targetProgress: 5,
  },
  {
    id: 'scrapbook_artist_10',
    title: 'Искусство на полях',
    description: 'Разместите 10 или более декоративных элементов в Scrapbook.',
    category: 'scrapbook',
    rarity: 'rare',
    icon: 'palette',
    targetProgress: 10,
  },
  // Hidden / Secret & Unusual achievements
  {
    id: 'secret_night_reader',
    title: 'Под светом ночной лампы',
    description: 'Вы читали книгу поздним вечером или ночью, когда мир вокруг стих.',
    hiddenDescription: 'Скрытое достижение · Откроется в особенный час чтения',
    category: 'secret',
    rarity: 'rare',
    hidden: true,
    icon: 'moon',
    targetProgress: 1,
  },
  {
    id: 'secret_theme_alchemist',
    title: 'Алхимик бумаги',
    description: 'Создайте собственную тему страницы или загрузите свой шрифт для чтения.',
    hiddenDescription: 'Скрытое достижение · Проявите творчество в оформлении страниц',
    category: 'secret',
    rarity: 'rare',
    hidden: true,
    icon: 'wand',
    targetProgress: 1,
  },
  {
    id: 'secret_perfect_memory',
    title: 'Безупречная память',
    description: 'Ответьте на 100% вопросов в тесте «Что я помню?» (минимум 5 вопросов).',
    hiddenDescription: 'Скрытое достижение · Связано с идеальным прохождением теста по книге',
    category: 'secret',
    rarity: 'legendary',
    hidden: true,
    icon: 'gem',
    targetProgress: 1,
  },
];

export interface AchievementEvalInput {
  books: Book[];
  annotations: Annotation[];
  quotes: SavedQuote[];
  smartBookmarks: SmartBookmark[];
  journals: BookJournal[];
  scrapbookItems: ScrapbookItem[];
  collections: UserCollection[];
  customThemes: PageTheme[];
  customFonts: CustomFont[];
  readingSessions: ReadingSession[];
  quizAttempts: QuizAttempt[];
}

export interface AchievementProgressItem {
  unlocked: boolean;
  current: number;
  target: number;
}

export function evaluateAchievementsState(
  input: AchievementEvalInput
): Record<string, AchievementProgressItem> {
  const {
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
  } = input;

  const finishedBooksCount = books.filter((b) => b.status === 'finished').length;
  const startedBooksCount = books.filter(
    (b) => (b.maxPageReached || b.currentPage) > 0 || b.status === 'finished' || b.readingSeconds > 20
  ).length;

  // Estimate chapters/pages reached across books
  let chaptersReached = 0;
  let totalPagesReached = 0;
  for (const b of books) {
    const maxP = Math.max(b.currentPage, b.maxPageReached || 0);
    totalPagesReached += b.status === 'finished' ? b.totalPages : maxP;
    if (b.toc?.length) {
      chaptersReached += b.toc.filter((t) => t.pageIndex <= maxP).length;
    } else {
      chaptersReached += Math.floor(maxP / 4);
    }
  }
  const chapterOrPageProgress = Math.max(chaptersReached, Math.floor(totalPagesReached / 8));

  const hasJournalContent = journals.some(
    (j) =>
      j.impressions.trim().length > 0 ||
      j.review.trim().length > 0 ||
      j.freeNotes.trim().length > 0 ||
      Object.values(j.chapterEntries || {}).some((v) => v.trim().length > 0)
  );

  const hasCharacterWork =
    journals.some(
      (j) => j.favoriteCharacters.trim().length > 0 || j.dislikedCharacters.trim().length > 0
    ) ||
    smartBookmarks.some((bm) => bm.type === 'character' || Boolean(bm.characterName?.trim()));

  const hasTheoryWork =
    journals.some((j) => j.theories.trim().length > 0 || j.predictions.trim().length > 0) ||
    smartBookmarks.some((bm) => bm.type === 'theory') ||
    annotations.some((a) => a.categoryId === 'theory' || a.categoryId === 'foreshadow');

  const quizGoodCount = quizAttempts.filter((q) => q.scorePercent >= 70).length;
  const hasPerfectQuiz = quizAttempts.some((q) => q.totalQuestions >= 5 && q.scorePercent === 100);

  // Check return after pause (>= 3 days gap between sessions or rereadCount > 0)
  const sortedDates = readingSessions
    .filter((s) => s.pagesRead > 0 || s.minutesRead > 0)
    .map((s) => new Date(s.date).getTime())
    .sort((a, b) => a - b);
  let hasGapReturn = books.some((b) => (b.rereadCount || 0) > 0);
  for (let i = 1; i < sortedDates.length; i++) {
    if (sortedDates[i] - sortedDates[i - 1] >= 3 * 86400000) {
      hasGapReturn = true;
      break;
    }
  }
  if (!hasGapReturn) {
    const now = Date.now();
    hasGapReturn = books.some(
      (b) => b.lastReadAt && now - b.addedAt >= 3 * 86400000 && b.lastReadAt - b.addedAt >= 3 * 86400000
    );
  }

  // Tool diversity count
  const toolsUsed = [
    annotations.length > 0,
    quotes.length > 0,
    smartBookmarks.length > 0,
    hasJournalContent,
    scrapbookItems.length > 0,
    quizAttempts.length > 0,
  ].filter(Boolean).length;

  // Late night reader check (current reading activity between 22:00 and 05:00 or existing night reading)
  const hour = new Date().getHours();
  const isNightTimeNow = (hour >= 22 || hour < 5) && startedBooksCount > 0;
  const hasNightActivity =
    isNightTimeNow ||
    books.some((b) => {
      if (!b.lastReadAt) return false;
      const h = new Date(b.lastReadAt).getHours();
      return (b.currentPage > 0 || (b.maxPageReached || 0) > 0) && (h >= 22 || h < 5);
    });

  const make = (current: number, target: number): AchievementProgressItem => ({
    unlocked: current >= target,
    current: Math.min(current, target),
    target,
  });

  return {
    first_book_added: make(books.length, 1),
    first_book_started: make(startedBooksCount, 1),
    first_finished_book: make(finishedBooksCount, 1),
    first_quote: make(quotes.length, 1),
    first_annotation: make(annotations.length, 1),
    first_bookmark: make(smartBookmarks.length, 1),
    first_scrapbook: make(scrapbookItems.length, 1),
    multi_books_3: make(startedBooksCount, 3),
    library_collector_7: make(books.length, 7),
    collections_creator: make(collections.length, 1),
    quotes_5: make(quotes.length, 5),
    quotes_15: make(quotes.length, 15),
    journal_keeper: make(hasJournalContent ? 1 : 0, 1),
    character_researcher: make(hasCharacterWork ? 1 : 0, 1),
    theory_architect: make(hasTheoryWork ? 1 : 0, 1),
    first_quiz: make(quizAttempts.length, 1),
    quiz_master_3: make(quizGoodCount, 3),
    chapters_10: make(chapterOrPageProgress, 10),
    return_after_pause: make(hasGapReturn ? 1 : 0, 1),
    library_all_tools: make(toolsUsed, 5),
    scrapbook_artist_10: make(scrapbookItems.length, 10),
    secret_night_reader: make(hasNightActivity ? 1 : 0, 1),
    secret_theme_alchemist: make(customThemes.length + customFonts.length > 0 ? 1 : 0, 1),
    secret_perfect_memory: make(hasPerfectQuiz ? 1 : 0, 1),
  };
}

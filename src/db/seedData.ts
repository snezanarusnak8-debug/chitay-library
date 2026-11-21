import {DEFAULT_QUOTE_CARD_CONFIG} from '../constants/themes';
import {
  Annotation,
  Book,
  BookChapter,
  BookContent,
  BookJournal,
  BookPage,
  ReadingSession,
  SavedQuote,
  ScrapbookItem,
  TocItem,
  UserCollection,
} from '../types/library';
import {dbStorage} from './storage';

function buildPagesFromChapters(chapters: BookChapter[]): {pages: BookPage[]; toc: TocItem[]; chapters: BookChapter[]} {
  const pages: BookPage[] = [];
  const toc: TocItem[] = [];
  const outChapters: BookChapter[] = [];

  for (const ch of chapters) {
    const startPageIndex = pages.length;
    toc.push({id: ch.id, title: ch.title, pageIndex: startPageIndex, level: 1});
    // Put 3 paragraphs per page for comfortable cozy reading
    for (let i = 0; i < ch.paragraphs.length; i += 3) {
      pages.push({
        index: pages.length,
        chapterId: ch.id,
        chapterTitle: ch.title,
        paragraphs: ch.paragraphs.slice(i, i + 3),
      });
    }
    outChapters.push({...ch, startPageIndex});
  }
  return {pages, toc, chapters: outChapters};
}

export async function ensureInitialSeedData(): Promise<void> {
  const alreadySeeded = await dbStorage.getMeta('vellum_seeded_v1');
  if (alreadySeeded) return;

  const existingBooks = await dbStorage.getAllBooks();
  if (existingBooks.length > 0) {
    await dbStorage.setMeta('vellum_seeded_v1', true);
    return;
  }

  // Original literary sample books (100% original prose)
  const book1Chapters: BookChapter[] = [
    {
      id: 'b1_ch1',
      title: 'Глава I. Стеклянная оранжерея',
      startPageIndex: 0,
      paragraphs: [
        'В конце октября воздух в старой оранжерее пахнет дождём, мокрым известняком и тонкой горчинкой розмарина. Каждое утро хранитель отпирал чугунную решётку ровно в семь, когда туман ещё лежал на широких листьях папоротника и не торопился подниматься к стеклянным сводам.',
        'Над длинным дубовым столом висела лампа с зелёным абажуром, освещавшая толстую тетрадь в переплёте из серого льна. В ней записывались не только даты полива и названия редких растений, но и случайные наблюдения о людях, заходивших сюда переждать ненастье.',
        'Иногда кажется, что тишина — это не отсутствие звука, а особое пространство, в котором слышно, как разворачивается новый лист и как перо мягко касается зернистой бумаги. Именно ради таких минут стоило беречь каждый утренний час.',
        'На третьей полке стояли глиняные горшки с лавандой, привезённой с южного склона. Их серовато-лиловые стебли сохраняли сухой аромат даже глубокой зимой, когда за высокими окнами лежал чистый декабрьский снег.',
        'Читатель этих записей заметил бы, что между строк о ботанике пряталась целая история ожидания. Каждый засушенный лепесток, приклеенный тонкой полоской бумажного скотча к полям, служил закладкой для памяти.',
        'Вечером оранжерея затихала по-особенному: стекло слегка потрескивало от прохлады, и в его тёмных гранях отражался тёплый свет единственной свечи.',
      ],
    },
    {
      id: 'b1_ch2',
      title: 'Глава II. Гербарий забытых писем',
      startPageIndex: 0,
      paragraphs: [
        'В ящике рабочего стола хранилась пачка нераспечатанных конвертов без марок, перевязанная тонкой шёлковой лентой цвета пыльной розы. Бумага их успела приобрести оттенок старого молока.',
        'Никто не знал точно, кто оставил их среди семян дикого мака и календулы. Хранитель перебирал конверты только в пасмурные дни, когда сад за окном превращался в акварельный эскиз.',
        'Мы часто ищем большие события в книгах и в жизни, но подлинная перемена почти всегда происходит незаметно — в короткой фразе на полях, в паузе перед ответом или в решении открыть окно навстречу ветру.',
      ],
    },
  ];

  const b1 = buildPagesFromChapters(book1Chapters);

  const book2Chapters: BookChapter[] = [
    {
      id: 'b2_ch1',
      title: 'Часть I. Башня у северного пролива',
      startPageIndex: 0,
      paragraphs: [
        'Маяк стоял на узком базальтовом мысу, где волны Балтийского моря в ноябре звучали низко и мерно, словно перелистывание тяжёлых фолиантов в пустом читальном зале.',
        'Смотритель любил собирать книги, оставленные путешественниками и капитанами торговых судов. На форзацах этих томов часто оставались пометки карандашом: координаты проливов, короткие рецепты пряного чая и строки стихов.',
        'Когда ветер усиливался настолько, что гасил фонари на пристани, в верхней комнате маяка становилось особенно уютно. Медный чайник напевал свою тихую песню, а луч прожектора уходил далеко в тёмную воду.',
        'Ночь не скрывает мир, а лишь оставляет в нём самое важное — контуры берега, дыхание воды и ясную мысль, записанную на белом листе.',
      ],
    },
    {
      id: 'b2_ch2',
      title: 'Часть II. Карты звёздного неба',
      startPageIndex: 0,
      paragraphs: [
        'В декабре небо над проливом открывалось редко, но в ясные часы созвездия отражались в чёрном стекле так чётко, будто кто-то рассыпал золотую пыль по тёмно-синему сукну.',
        'Смотритель сверял старинные астрономические атласы с движением ночных огней и вклеивал вырезки из морских газет в свой дневник наблюдений.',
      ],
    },
  ];

  const b2 = buildPagesFromChapters(book2Chapters);

  const book3Chapters: BookChapter[] = [
    {
      id: 'b3_ch1',
      title: 'Письмо первое. Букинистическая лавка',
      startPageIndex: 0,
      paragraphs: [
        'На углу Тихой улицы, за вывеской с выцветшим изображением раскрытой книги, помещалась лавка, где время текло по собственным законам. Полки тянулись до самого потолка, и к верхним рядам приставляли лёгкую дубовую лестницу.',
        'Владелица лавки верила, что у каждой книги есть читатель, который однажды найдёт именно её — даже если на это уйдут годы. Она никогда не выбрасывала старые открытки и записки, найденные между страницами.',
        'Самые дорогие сердцу книги — те, на полях которых остаётся след вашего голоса: подчёркнутая строчка, тихий вопрос карандашом или сохранённая на память цитата.',
      ],
    },
  ];

  const b3 = buildPagesFromChapters(book3Chapters);

  const now = Date.now();
  const day = 86400000;

  const col1: UserCollection = {
    id: 'col_botanical',
    name: 'Вечернее чтение',
    color: '#6E8568',
    description: 'Спокойные книги для чтения перед сном',
    createdAt: now - 5 * day,
  };
  const col2: UserCollection = {
    id: 'col_aesthetic',
    name: 'Для вдохновения и цитат',
    color: '#B4727D',
    description: 'Издания с красивым языком и атмосферой',
    createdAt: now - 3 * day,
  };

  await dbStorage.saveCollection(col1);
  await dbStorage.saveCollection(col2);

  const books: Book[] = [
    {
      id: 'sample_book_1',
      title: 'Тетрадь хранителя оранжереи',
      author: 'Алина Вересова',
      format: 'EPUB',
      coverDataUrl: '/src/assets/images/cover_classic_botanical_1795238066377.jpg',
      genre: 'Атмосферная проза',
      tags: ['Ботаника', 'Дневник', 'Осень'],
      status: 'reading',
      collections: ['col_botanical', 'col_aesthetic'],
      rating: 5,
      totalPages: b1.pages.length,
      currentPage: 0,
      scrollProgress: 33,
      addedAt: now - 6 * day,
      lastReadAt: now - 3600 * 1000,
      readingSeconds: 2640,
      description: 'Тихая повесть о старом ботаническом саде, забытых письмах и искусстве замечать красоту в повседневных деталях.',
      toc: b1.toc,
      pageThemeId: 'botanical',
      isSample: true,
    },
    {
      id: 'sample_book_2',
      title: 'Письма с маяка Севера',
      author: 'Михаил Орлов',
      format: 'FB2',
      coverDataUrl: '/src/assets/images/cover_nocturne_celestial_1795238066984.jpg',
      genre: 'Эпистолярный роман',
      tags: ['Море', 'Звёзды', 'Ночь'],
      status: 'favorite',
      collections: ['col_botanical'],
      rating: 5,
      totalPages: b2.pages.length,
      currentPage: 1,
      scrollProgress: 50,
      addedAt: now - 10 * day,
      lastReadAt: now - 2 * day,
      readingSeconds: 5100,
      description: 'Хроника одинокого смотрителя северного маяка, коллекционирующего звёздные карты и пометки на полях старых книг.',
      toc: b2.toc,
      pageThemeId: 'celestial',
      isSample: true,
    },
    {
      id: 'sample_book_3',
      title: 'Архив тихих комнат',
      author: 'Елена Соколова',
      format: 'TXT',
      coverDataUrl: '/src/assets/images/cover_rose_epistolary_1795238066861.jpg',
      genre: 'Эссеистика',
      tags: ['Книги', 'Письма', 'Винтаж'],
      status: 'finished',
      collections: ['col_aesthetic'],
      rating: 4,
      totalPages: b3.pages.length,
      currentPage: 0,
      scrollProgress: 100,
      addedAt: now - 14 * day,
      lastReadAt: now - 5 * day,
      readingSeconds: 3200,
      description: 'Зарисовки о старинной букинистической лавке и сокровищах, которые люди оставляют между страниц.',
      toc: b3.toc,
      pageThemeId: 'rose_diary',
      isSample: true,
    },
  ];

  const contents: BookContent[] = [
    {
      bookId: 'sample_book_1',
      originalFileName: 'tetrad_hranitelya.epub',
      mimeType: 'application/epub+zip',
      chapters: b1.chapters,
      pages: b1.pages,
    },
    {
      bookId: 'sample_book_2',
      originalFileName: 'pisma_s_mayaka.fb2',
      mimeType: 'application/xml',
      chapters: b2.chapters,
      pages: b2.pages,
    },
    {
      bookId: 'sample_book_3',
      originalFileName: 'arhiv_tihih_komnat.txt',
      mimeType: 'text/plain',
      chapters: b3.chapters,
      pages: b3.pages,
    },
  ];

  for (const book of books) await dbStorage.saveBook(book);
  for (const content of contents) await dbStorage.saveBookContent(content);

  // Sample annotations
  const ann1: Annotation = {
    id: 'ann_sample_1',
    bookId: 'sample_book_1',
    pageIndex: 0,
    chapterId: 'b1_ch1',
    paragraphIndex: 2,
    quoteText: 'тишина — это не отсутствие звука, а особое пространство, в котором слышно, как разворачивается новый лист',
    color: 'rgba(195, 234, 214, 0.72)',
    styleType: 'highlight',
    categoryId: 'beautiful',
    noteText: 'Очень точное описание утреннего спокойствия. Хочется сохранить в цитатник.',
    tags: ['Тишина', 'Атмосфера'],
    stickerEmoji: '🌿',
    stampText: 'ИЗБРАННОЕ',
    handwriting: true,
    createdAt: now - 2 * day,
    updatedAt: now - 2 * day,
  };
  const ann2: Annotation = {
    id: 'ann_sample_2',
    bookId: 'sample_book_2',
    pageIndex: 1,
    chapterId: 'b2_ch2',
    paragraphIndex: 0,
    quoteText: 'созвездия отражались в чёрном стекле так чётко, будто кто-то рассыпал золотую пыль по тёмно-синему сукну',
    color: 'rgba(218, 204, 240, 0.72)',
    styleType: 'wavy',
    categoryId: 'favorite',
    noteText: 'Визуально очень сильная метафора ночного неба.',
    tags: ['Образ', 'Небо'],
    stickerEmoji: '✨',
    createdAt: now - 3 * day,
    updatedAt: now - 3 * day,
  };
  await dbStorage.saveAnnotation(ann1);
  await dbStorage.saveAnnotation(ann2);

  // Sample quotes
  const q1: SavedQuote = {
    id: 'quote_sample_1',
    bookId: 'sample_book_1',
    bookTitle: 'Тетрадь хранителя оранжереи',
    bookAuthor: 'Алина Вересова',
    text: 'Иногда кажется, что тишина — это не отсутствие звука, а особое пространство, в котором слышно, как разворачивается новый лист и как перо мягко касается зернистой бумаги.',
    pageNumber: 1,
    pageIndex: 0,
    categoryId: 'beautiful',
    color: '#C3EAD6',
    note: 'Любимая мысль из первой главы.',
    cardConfig: {...DEFAULT_QUOTE_CARD_CONFIG, bgColor: '#F2F5EE', textColor: '#243125', accentColor: '#597458'},
    createdAt: now - 2 * day,
  };
  const q2: SavedQuote = {
    id: 'quote_sample_2',
    bookId: 'sample_book_3',
    bookTitle: 'Архив тихих комнат',
    bookAuthor: 'Елена Соколова',
    text: 'Самые дорогие сердцу книги — те, на полях которых остаётся след вашего голоса: подчёркнутая строчка, тихий вопрос карандашом или сохранённая на память цитата.',
    pageNumber: 1,
    pageIndex: 0,
    categoryId: 'quote',
    color: '#F8CDD6',
    note: 'О смысле книжного дневника',
    cardConfig: {...DEFAULT_QUOTE_CARD_CONFIG, bgColor: '#FBF1F2', textColor: '#3E2B2E', accentColor: '#B4727D'},
    createdAt: now - 4 * day,
  };
  await dbStorage.saveQuote(q1);
  await dbStorage.saveQuote(q2);

  // Sample journal
  const journal1: BookJournal = {
    id: 'sample_book_1',
    bookId: 'sample_book_1',
    impressions: 'Невероятно спокойная и тактильная книга. Читается как прогулка по тёплому зимнему саду.',
    review: 'Идеальное чтение для позднего вечера с чашкой травяного чая. Автор уделяет огромное внимание деталям света, запахам бумаги и шелесту листьев.',
    favoriteCharacters: 'Хранитель оранжереи',
    dislikedCharacters: '—',
    favoriteMoments: 'Сцена с конвертами, перевязанными шёлковой лентой.',
    theories: 'Возможно, письма адресованы самому хранителю из прошлого.',
    predictions: 'В финале станет ясно, кто оставил семена дикого мака.',
    emotions: ['Уют', 'Вдохновение', 'Лёгкая грусть'],
    rating: 5,
    startDate: new Date(now - 6 * day).toISOString().slice(0, 10),
    finishDate: '',
    freeNotes: 'Подходит под ботаническую тему страницы и пастельно-мятные выделения.',
    chapterEntries: {
      b1_ch1: 'Удивительно точно передан запах старой бумаги и влажного известняка.',
    },
    updatedAt: now - day,
  };
  await dbStorage.saveJournal(journal1);

  // Sample Scrapbook items on Page 1 of Book 1
  const sb1: ScrapbookItem = {
    id: 'sb_sample_washi',
    bookId: 'sample_book_1',
    pageIndex: 0,
    type: 'washi',
    x: 68,
    y: 4,
    width: 24,
    height: 4,
    rotation: 4,
    zIndex: 4,
    opacity: 0.92,
    locked: false,
    hidden: false,
    pattern: 'plaid',
    createdAt: now - day,
    updatedAt: now - day,
  };
  const sb2: ScrapbookItem = {
    id: 'sb_sample_note',
    bookId: 'sample_book_1',
    pageIndex: 0,
    type: 'note',
    x: 64,
    y: 7,
    width: 31,
    height: 15,
    rotation: 1.5,
    zIndex: 3,
    opacity: 0.96,
    locked: false,
    hidden: false,
    text: 'Утренняя оранжерея пахнет розмарином и старой бумагой 🌿',
    noteVariant: 'handwritten',
    bgColor: '#F5EFE2',
    textColor: '#2B362C',
    fontFamily: "'Caveat', cursive",
    fontSize: 18,
    padding: 12,
    borderStyle: 'dashed',
    createdAt: now - day,
    updatedAt: now - day,
  };
  const sb3: ScrapbookItem = {
    id: 'sb_sample_sticker',
    bookId: 'sample_book_1',
    pageIndex: 0,
    type: 'sticker',
    x: 86,
    y: 80,
    width: 9,
    height: 9,
    rotation: -10,
    zIndex: 5,
    opacity: 1,
    locked: false,
    hidden: false,
    stickerId: 'dried_fern',
    label: 'Лист папоротника',
    emoji: '🌿',
    createdAt: now - day,
    updatedAt: now - day,
  };
  await dbStorage.saveScrapbookItemsBulk([sb1, sb2, sb3]);

  // Seed last 7 days reading sessions for meaningful statistics
  const sessions: ReadingSession[] = [6, 5, 4, 3, 2, 1, 0].map((offset, idx) => ({
    date: new Date(now - offset * day).toISOString().slice(0, 10),
    pagesRead: [8, 12, 6, 15, 10, 14, 7][idx],
    minutesRead: [18, 25, 14, 32, 22, 28, 16][idx],
    bookIds: offset > 2 ? ['sample_book_2', 'sample_book_3'] : ['sample_book_1'],
  }));
  const db = await dbStorage.getAllReadingSessions();
  if (db.length === 0) {
    for (const s of sessions) {
      const database = await (await import('./storage')).getDB();
      await database.put('readingSessions', s);
    }
  }

  await dbStorage.setMeta('vellum_seeded_v1', true);
}

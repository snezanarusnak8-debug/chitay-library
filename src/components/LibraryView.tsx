import React, {useMemo, useState} from 'react';
import {
  ArrowUpDown,
  BookOpen,
  BookPlus,
  Brain,
  Clock,
  Edit3,
  FolderPlus,
  LayoutGrid,
  Library,
  List,
  NotebookPen,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {Book, LibrarySortBy, LibraryViewMode, ReadingStatus} from '../types/library';
import {AddBookButton} from './AddBookButton';
import {BookMetadataModal} from './BookMetadataModal';
import {ColorSwatchButton} from './ColorSwatchButton';

interface LibraryViewProps {
  mode: 'home' | 'library' | 'reading' | 'planned' | 'finished' | 'collections';
  onOpenUpload: (files?: File[]) => void;
}

const STATUS_LABELS: Record<ReadingStatus, string> = {
  reading: 'Читаю сейчас',
  planned: 'В планах',
  finished: 'Прочитано',
  paused: 'Отложено',
  favorite: 'Любимые',
  dropped: 'Брошено',
};

const COVER_PALETTES = [
  'from-[#EAE2D3] to-[#D8CBB6] text-[#3B2E24]',
  'from-[#E8D8DA] to-[#D4B8BD] text-[#3B262B]',
  'from-[#DEE5DA] to-[#C4D1BE] text-[#263326]',
  'from-[#DCE3EC] to-[#BDCAD9] text-[#202B38]',
  'from-[#E5DDF0] to-[#CEC0E2] text-[#2C243D]',
];

export const LibraryView: React.FC<LibraryViewProps> = ({mode, onOpenUpload}) => {
  const {
    books,
    collections,
    annotations,
    quotes,
    settings,
    activeCollectionId,
    setActiveCollectionId,
    updateSettings,
    openBookInReader,
    openBookJournal,
    openBookQuiz,
    openBookTimeline,
    saveCollection,
    deleteCollection,
    showToast,
  } = useLibrary();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [dragHover, setDragHover] = useState(false);

  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState('#8C5E4D');
  const [showNewColForm, setShowNewColForm] = useState(false);

  const allGenres = useMemo(
    () => Array.from(new Set(books.map((b) => b.genre).filter(Boolean))),
    [books]
  );
  const allTags = useMemo(
    () => Array.from(new Set(books.flatMap((b) => b.tags).filter(Boolean))),
    [books]
  );

  const continueBook = useMemo(() => {
    if (settings.lastOpenedBookId) {
      const last = books.find((b) => b.id === settings.lastOpenedBookId);
      if (last) return last;
    }
    const reading = books.filter((b) => b.status === 'reading');
    if (reading.length > 0) {
      return [...reading].sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt))[0];
    }
    return books[0] || null;
  }, [books, settings.lastOpenedBookId]);

  const filteredBooks = useMemo(() => {
    let list = [...books];

    if (mode === 'reading') list = list.filter((b) => b.status === 'reading');
    else if (mode === 'planned') list = list.filter((b) => b.status === 'planned');
    else if (mode === 'finished') list = list.filter((b) => b.status === 'finished');
    else if (mode === 'collections' && activeCollectionId) {
      list = list.filter((b) => b.collections?.includes(activeCollectionId));
    }

    if (statusFilter !== 'all') {
      list = list.filter((b) => b.status === statusFilter);
    }
    if (genreFilter !== 'all') {
      list = list.filter((b) => b.genre === genreFilter);
    }
    if (tagFilter !== 'all') {
      list = list.filter((b) => b.tags.includes(tagFilter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.genre.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const sortBy = settings.librarySortBy;
    list.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title, 'ru');
      if (sortBy === 'author') return a.author.localeCompare(b.author, 'ru');
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      if (sortBy === 'addedAt') return b.addedAt - a.addedAt;
      return (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt);
    });

    return list;
  }, [books, mode, activeCollectionId, statusFilter, genreFilter, tagFilter, search, settings.librarySortBy]);

  const setViewMode = (view: LibraryViewMode) => {
    updateSettings((prev) => ({...prev, libraryViewMode: view}));
  };

  const setSortBy = (sort: LibrarySortBy) => {
    updateSettings((prev) => ({...prev, librarySortBy: sort}));
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    await saveCollection({
      id: `col_${Date.now()}`,
      name: newColName.trim(),
      color: newColColor,
      createdAt: Date.now(),
    });
    setNewColName('');
    setShowNewColForm(false);
    showToast('Коллекция создана');
  };

  const handleDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragHover(false);
    if (e.dataTransfer.files.length > 0) {
      onOpenUpload(Array.from(e.dataTransfer.files));
    }
  };

  const pageTitle =
    mode === 'home'
      ? 'Читальный зал'
      : mode === 'reading'
      ? 'Читаю сейчас'
      : mode === 'planned'
      ? 'Хочу прочитать'
      : mode === 'finished'
      ? 'Прочитано'
      : mode === 'collections'
      ? 'Коллекции и полки'
      : 'Моя библиотека';

  const shelfBgClass =
    settings.shelfStyle === 'oak'
      ? 'border-b-[10px] border-[#8B684B] shadow-[0_8px_14px_-8px_rgba(62,40,22,0.35)]'
      : settings.shelfStyle === 'vintage'
      ? 'border-b-[10px] border-[#5D4837] shadow-[0_10px_18px_-8px_rgba(34,22,12,0.45)]'
      : settings.shelfStyle === 'gallery'
      ? 'border-b-[4px] border-black/10 dark:border-white/15 pb-5'
      : 'border-b border-black/15 dark:border-white/15 pb-4';

  const renderBookCover = (book: Book, idx: number) => {
    const palette = COVER_PALETTES[idx % COVER_PALETTES.length];
    return book.coverDataUrl ? (
      <img
        src={book.coverDataUrl}
        alt={book.title}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    ) : (
      <div
        className={`w-full h-full bg-gradient-to-br ${palette} p-4 flex flex-col justify-between`}
      >
        <span className="text-[11px] opacity-70">{book.format}</span>
        <div>
          <p className="font-display text-lg font-semibold leading-snug line-clamp-3">
            {book.title}
          </p>
          <p className="text-xs opacity-75 mt-1 truncate">{book.author}</p>
        </div>
      </div>
    );
  };

  return (
    <div
      className="space-y-8"
      onDragOver={(e) => {
        e.preventDefault();
        setDragHover(true);
      }}
      onDragLeave={() => setDragHover(false)}
      onDrop={handleDropFiles}
    >
      {dragHover && (
        <div
          className="fixed inset-4 z-40 rounded-3xl border-2 border-dashed flex items-center justify-center backdrop-blur-xs pointer-events-none"
          style={{
            borderColor: 'var(--site-accent)',
            backgroundColor: 'rgba(247, 243, 236, 0.85)',
          }}
        >
          <div className="text-center space-y-2 p-6">
            <BookPlus className="w-10 h-10 mx-auto" style={{color: 'var(--site-accent)'}} />
            <p className="font-display text-2xl font-semibold text-[#2C241E]">
              Отпустите файлы, чтобы добавить книги в библиотеку
            </p>
          </div>
        </div>
      )}

      {/* Editorial Hero on Home */}
      {mode === 'home' && (
        <section
          className="rounded-3xl border overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
            boxShadow: 'var(--site-shadow)',
          }}
        >
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-wide" style={{color: 'var(--site-text-muted)'}}>
                Личная цифровая библиотека · Книжный дневник
              </p>
              <h1
                className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight"
                style={{textWrap: 'balance'}}
              >
                Тихое пространство для чтения, заметок на полях и книжного скрапбукинга
              </h1>
              <p className="text-sm sm:text-base max-w-xl leading-relaxed" style={{color: 'var(--site-text-muted)'}}>
                Загружайте книги в любых форматах, оформляйте страницы как настоящий читательский дневник, сохраняйте цитаты и возвращайтесь к важным мыслям.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {continueBook && (
                <button
                  onClick={() => openBookInReader(continueBook.id, continueBook.currentPage)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-transform active:scale-[0.98] whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: 'var(--site-accent)',
                    color: 'var(--site-accent-contrast)',
                  }}
                >
                  <BookOpen className="w-4 h-4" />
                  Продолжить: {continueBook.title.slice(0, 26)}
                  {continueBook.title.length > 26 ? '…' : ''}
                </button>
              )}
              <AddBookButton
                variant="outline"
                onPickFiles={(files) => onOpenUpload(files)}
                onOpenDropModal={() => onOpenUpload()}
              />
            </div>

            <div
              className="pt-4 border-t grid grid-cols-3 gap-4 text-xs"
              style={{borderColor: 'var(--site-border)'}}
            >
              <div>
                <p className="font-mono-num text-lg font-semibold">{books.length}</p>
                <p style={{color: 'var(--site-text-muted)'}}>Книг на полках</p>
              </div>
              <div>
                <p className="font-mono-num text-lg font-semibold">{annotations.length}</p>
                <p style={{color: 'var(--site-text-muted)'}}>Аннотаций и заметок</p>
              </div>
              <div>
                <p className="font-mono-num text-lg font-semibold">{quotes.length}</p>
                <p style={{color: 'var(--site-text-muted)'}}>Сохранённых цитат</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full">
            <img
              src="/src/assets/images/library_hero_desk_1795238067194.jpg"
              alt="Читальный стол библиотеки"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
          </div>
        </section>
      )}

      {/* Collections Header Bar */}
      {mode === 'collections' && (
        <section
          className="rounded-2xl border p-5 space-y-4"
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold">Мои коллекции и полки</h2>
              <p className="text-xs mt-0.5" style={{color: 'var(--site-text-muted)'}}>
                Объединяйте книги в тематические подборки по настроению, сезону или жанру
              </p>
            </div>
            <button
              onClick={() => setShowNewColForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0"
              style={{
                backgroundColor: 'var(--site-accent)',
                color: 'var(--site-accent-contrast)',
              }}
            >
              <FolderPlus className="w-4 h-4" />
              Новая полка
            </button>
          </div>

          {showNewColForm && (
            <form onSubmit={handleCreateCollection} className="flex flex-wrap items-center gap-2 pt-2">
              <input
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Название коллекции..."
                className="flex-1 min-w-[200px] rounded-xl border px-3.5 py-2 text-sm outline-none"
                style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
              />
              <ColorSwatchButton
                compact
                value={newColColor}
                onChange={(c) => setNewColColor(c)}
                label="Цвет полки"
                title="Выбрать цвет полки"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{
                  backgroundColor: 'var(--site-accent)',
                  color: 'var(--site-accent-contrast)',
                }}
              >
                Создать
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCollectionId(null)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                !activeCollectionId ? 'shadow-xs' : 'opacity-75 hover:opacity-100'
              }`}
              style={{
                borderColor: !activeCollectionId ? 'var(--site-accent)' : 'var(--site-border)',
                backgroundColor: !activeCollectionId ? 'var(--site-surface-alt)' : 'var(--site-bg)',
              }}
            >
              Все книги ({books.length})
            </button>
            {collections.map((c) => {
              const count = books.filter((b) => b.collections?.includes(c.id)).length;
              const active = activeCollectionId === c.id;
              return (
                <div key={c.id} className="inline-flex items-center rounded-xl border overflow-hidden" style={{borderColor: active ? c.color : 'var(--site-border)'}}>
                  <button
                    onClick={() => setActiveCollectionId(c.id)}
                    className="px-3.5 py-2 text-xs font-medium flex items-center gap-2 whitespace-nowrap"
                    style={{
                      backgroundColor: active ? 'var(--site-surface-alt)' : 'var(--site-bg)',
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: c.color}} />
                    {c.name} ({count})
                  </button>
                  <button
                    onClick={() => {
                      if (activeCollectionId === c.id) setActiveCollectionId(null);
                      deleteCollection(c.id);
                    }}
                    className="px-2 py-2 hover:bg-rose-500/10 text-rose-600"
                    title="Удалить коллекцию"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Toolbar: Title, Filters, View Mode, Sort */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold">{pageTitle}</h2>
            <p className="text-xs mt-0.5" style={{color: 'var(--site-text-muted)'}}>
              Найдено книг: <span className="font-mono-num">{filteredBooks.length}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div
              className="flex items-center p-1 rounded-xl border"
              style={{
                backgroundColor: 'var(--site-surface)',
                borderColor: 'var(--site-border)',
              }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  settings.libraryViewMode === 'grid' ? 'bg-black/10 dark:bg-white/10' : 'opacity-60 hover:opacity-100'
                }`}
                title="Сетка обложек"
                aria-label="Сетка обложек"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('shelves')}
                className={`p-2 rounded-lg transition-colors ${
                  settings.libraryViewMode === 'shelves' ? 'bg-black/10 dark:bg-white/10' : 'opacity-60 hover:opacity-100'
                }`}
                title="Полки с книгами"
                aria-label="Полки с книгами"
              >
                <Library className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  settings.libraryViewMode === 'list' ? 'bg-black/10 dark:bg-white/10' : 'opacity-60 hover:opacity-100'
                }`}
                title="Компактный список"
                aria-label="Компактный список"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort selector */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs"
              style={{
                backgroundColor: 'var(--site-surface)',
                borderColor: 'var(--site-border)',
              }}
            >
              <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
              <select
                value={settings.librarySortBy}
                onChange={(e) => setSortBy(e.target.value as LibrarySortBy)}
                className="bg-transparent outline-none font-medium"
              >
                <option value="lastRead">По последнему чтению</option>
                <option value="addedAt">По дате добавления</option>
                <option value="title">По названию</option>
                <option value="author">По автору</option>
                <option value="rating">По рейтингу</option>
                <option value="status">По статусу</option>
              </select>
            </div>

            <AddBookButton
              variant="primary"
              onPickFiles={(files) => onOpenUpload(files)}
              onOpenDropModal={() => onOpenUpload()}
            />
          </div>
        </div>

        {/* Search & Filter strip */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="flex items-center gap-2 flex-1 min-w-[210px] rounded-xl border px-3.5 py-2"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
            }}
          >
            <Search className="w-4 h-4 opacity-55 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Фильтр по названию, автору, жанру или тегу..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          {(mode === 'home' || mode === 'library' || mode === 'collections') && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border px-3 py-2 text-xs font-medium outline-none"
              style={{
                backgroundColor: 'var(--site-surface)',
                borderColor: 'var(--site-border)',
              }}
            >
              <option value="all">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
          )}

          {allGenres.length > 0 && (
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="rounded-xl border px-3 py-2 text-xs font-medium outline-none"
              style={{
                backgroundColor: 'var(--site-surface)',
                borderColor: 'var(--site-border)',
              }}
            >
              <option value="all">Все жанры</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}

          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-xl border px-3 py-2 text-xs font-medium outline-none"
              style={{
                backgroundColor: 'var(--site-surface)',
                borderColor: 'var(--site-border)',
              }}
            >
              <option value="all">Все теги</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* Books Display */}
      {filteredBooks.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center space-y-3"
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
          }}
        >
          <p className="font-display text-2xl font-semibold">Здесь пока пусто</p>
          <p className="text-sm" style={{color: 'var(--site-text-muted)'}}>
            Перетащите файлы книг прямо на страницу или загрузите книгу с устройства
          </p>
          <div className="pt-2">
            <AddBookButton
              variant="primary"
              onPickFiles={(files) => onOpenUpload(files)}
              onOpenDropModal={() => onOpenUpload()}
            />
          </div>
        </div>
      ) : settings.libraryViewMode === 'list' ? (
        <div
          className="rounded-2xl border divide-y overflow-hidden"
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
          }}
        >
          {filteredBooks.map((book, idx) => {
            const pct = Math.round(((book.currentPage + 1) / Math.max(1, book.totalPages)) * 100);
            return (
              <div
                key={book.id}
                className="flex items-center justify-between gap-4 p-3.5 sm:px-5 hover:bg-black/[0.025] dark:hover:bg-white/[0.025] transition-colors"
                style={{borderColor: 'var(--site-border)'}}
              >
                <div
                  onClick={() => openBookInReader(book.id, book.currentPage)}
                  className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer group"
                >
                  <div className="w-11 h-16 rounded-lg overflow-hidden shrink-0 border" style={{borderColor: 'var(--site-border)'}}>
                    {renderBookCover(book, idx)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold truncate group-hover:underline">
                      {book.title}
                    </h3>
                    <p className="text-xs truncate" style={{color: 'var(--site-text-muted)'}}>
                      {book.author} · {book.genre} · {STATUS_LABELS[book.status]} · {book.format}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-4 text-xs shrink-0">
                  <span className="font-mono-num" style={{color: 'var(--site-text-muted)'}}>
                    {book.currentPage + 1}/{book.totalPages} стр. ({pct}%)
                  </span>
                  {book.rating > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono-num">
                      <Star className="w-3.5 h-3.5" fill="var(--site-accent)" stroke="var(--site-accent)" />
                      {book.rating}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openBookQuiz(book.id)}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                    title="Тест «Что я помню?»"
                  >
                    <Brain className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openBookTimeline(book.id)}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                    title="Таймлайн книги"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openBookJournal(book.id)}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                    title="Книжный дневник"
                  >
                    <NotebookPen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingBook(book)}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                    title="Редактировать"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openBookInReader(book.id, book.currentPage)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium ml-1 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--site-accent)',
                      color: 'var(--site-accent-contrast)',
                    }}
                  >
                    Читать
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : settings.libraryViewMode === 'shelves' ? (
        <div className="space-y-8">
          {Array.from({length: Math.ceil(filteredBooks.length / 4)}).map((_, shelfIdx) => {
            const row = filteredBooks.slice(shelfIdx * 4, shelfIdx * 4 + 4);
            return (
              <div key={shelfIdx} className={`px-2 sm:px-4 pb-3 ${shelfBgClass}`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-7 items-end">
                  {row.map((book, i) => (
                    <div key={book.id} className="group flex flex-col">
                      <div
                        onClick={() => openBookInReader(book.id, book.currentPage)}
                        className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer shadow-lg transition-transform duration-300 group-hover:-translate-y-1.5 relative border"
                        style={{borderColor: 'var(--site-border)'}}
                      >
                        {renderBookCover(book, shelfIdx * 4 + i)}
                      </div>
                      <div className="mt-2.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3
                            onClick={() => openBookInReader(book.id, book.currentPage)}
                            className="font-display text-base font-semibold leading-tight truncate cursor-pointer hover:underline"
                          >
                            {book.title}
                          </h3>
                          <p className="text-[11px] truncate mt-0.5" style={{color: 'var(--site-text-muted)'}}>
                            {book.author}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingBook(book)}
                          className="p-1 rounded-md opacity-60 hover:opacity-100 shrink-0"
                          title="Сведения"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {filteredBooks.map((book, idx) => {
            const pct = Math.min(100, Math.round(((book.currentPage + 1) / Math.max(1, book.totalPages)) * 100));
            return (
              <article
                key={book.id}
                className="group flex flex-col rounded-2xl border p-3 transition-all hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--site-surface)',
                  borderColor: 'var(--site-border)',
                  boxShadow: 'var(--site-shadow)',
                }}
              >
                <div
                  onClick={() => openBookInReader(book.id, book.currentPage)}
                  className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer relative border"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  {renderBookCover(book, idx)}
                </div>

                <div className="mt-3 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    <h3
                      onClick={() => openBookInReader(book.id, book.currentPage)}
                      className="font-display text-lg font-semibold leading-snug line-clamp-2 cursor-pointer hover:underline"
                    >
                      {book.title}
                    </h3>
                    <p className="text-xs mt-1 truncate" style={{color: 'var(--site-text-muted)'}}>
                      {book.author}
                    </p>
                    <p className="text-[11px] mt-1 truncate" style={{color: 'var(--site-text-muted)'}}>
                      {STATUS_LABELS[book.status]} · {book.format}
                      {book.rating > 0 ? ` · ★ ${book.rating}` : ''}
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{backgroundColor: 'var(--site-surface-alt)'}}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{width: `${pct}%`, backgroundColor: 'var(--site-accent)'}}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="font-mono-num" style={{color: 'var(--site-text-muted)'}}>
                        {pct}%
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => openBookQuiz(book.id)}
                          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                          title="Тест «Что я помню?»"
                        >
                          <Brain className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openBookTimeline(book.id)}
                          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                          title="Таймлайн книги"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openBookJournal(book.id)}
                          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                          title="Дневник книги"
                        >
                          <NotebookPen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingBook(book)}
                          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                          title="Настройки книги"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editingBook && (
        <BookMetadataModal book={editingBook} onClose={() => setEditingBook(null)} />
      )}
    </div>
  );
};

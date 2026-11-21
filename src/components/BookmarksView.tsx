import React, {useMemo, useState} from 'react';
import {
  ArrowUpDown,
  Bookmark,
  BookOpen,
  Edit3,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {ScrapbookNoteItem, ScrapbookPhotoItem, SmartBookmark} from '../types/library';
import {renderBookmarkIcon, SmartBookmarkModal} from './SmartBookmarkModal';

type BookmarkSortBy = 'date_desc' | 'date_asc' | 'page' | 'category';

export const BookmarksView: React.FC = () => {
  const {
    books,
    smartBookmarks,
    allBookmarkCategories,
    scrapbookItems,
    deleteSmartBookmark,
    saveScrapbookItemsBulk,
    openBookInReader,
    showToast,
  } = useLibrary();

  const [search, setSearch] = useState('');
  const [bookFilter, setBookFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [characterFilter, setCharacterFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState<BookmarkSortBy>('date_desc');

  const [editingBm, setEditingBm] = useState<SmartBookmark | null>(null);
  const [creatingForBookId, setCreatingForBookId] = useState<string | null>(null);

  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const categoryMap = useMemo(
    () => new Map(allBookmarkCategories.map((c) => [c.id, c])),
    [allBookmarkCategories]
  );

  const allColors = useMemo(
    () => Array.from(new Set(smartBookmarks.map((b) => b.color).filter(Boolean))),
    [smartBookmarks]
  );
  const allCharacters = useMemo(
    () =>
      Array.from(
        new Set(smartBookmarks.map((b) => b.characterName?.trim()).filter(Boolean) as string[])
      ),
    [smartBookmarks]
  );
  const allTags = useMemo(
    () => Array.from(new Set(smartBookmarks.flatMap((b) => b.tags || []).filter(Boolean))),
    [smartBookmarks]
  );

  const filtered = useMemo(() => {
    let list = [...smartBookmarks];
    if (bookFilter !== 'all') list = list.filter((b) => b.bookId === bookFilter);
    if (typeFilter !== 'all') list = list.filter((b) => b.type === typeFilter);
    if (colorFilter !== 'all') list = list.filter((b) => b.color === colorFilter);
    if (characterFilter !== 'all')
      list = list.filter((b) => b.characterName?.trim() === characterFilter);
    if (tagFilter !== 'all') list = list.filter((b) => b.tags?.includes(tagFilter));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((b) => {
        const bk = bookMap.get(b.bookId);
        return (
          b.title.toLowerCase().includes(q) ||
          b.note.toLowerCase().includes(q) ||
          (b.characterName || '').toLowerCase().includes(q) ||
          (b.chapterTitle || '').toLowerCase().includes(q) ||
          (bk?.title || '').toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'date_asc') return a.createdAt - b.createdAt;
      if (sortBy === 'page') return a.pageIndex - b.pageIndex;
      if (sortBy === 'category') return a.type.localeCompare(b.type);
      return b.createdAt - a.createdAt;
    });
    return list;
  }, [
    smartBookmarks,
    bookFilter,
    typeFilter,
    colorFilter,
    characterFilter,
    tagFilter,
    search,
    sortBy,
    bookMap,
  ]);

  const handleAddToScrapbook = async (bm: SmartBookmark) => {
    const now = Date.now();
    const onPage = scrapbookItems.filter(
      (s) => s.bookId === bm.bookId && s.pageIndex === bm.pageIndex
    );
    const baseZ = onPage.length + 3;
    const textLines = [
      `${bm.stickerEmoji ? `${bm.stickerEmoji} ` : ''}${bm.title}`,
      bm.characterName ? `Персонаж: ${bm.characterName}` : '',
      bm.note,
    ]
      .filter(Boolean)
      .join('\n');

    const newItems: (ScrapbookNoteItem | ScrapbookPhotoItem)[] = [
      {
        id: `sb_bm_note_${now}`,
        bookId: bm.bookId,
        pageIndex: bm.pageIndex,
        type: 'note',
        text: textLines,
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
        zIndex: baseZ,
        opacity: 0.96,
        locked: false,
        hidden: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
    if (bm.imageDataUrl) {
      newItems.push({
        id: `sb_bm_photo_${now}`,
        bookId: bm.bookId,
        pageIndex: bm.pageIndex,
        type: 'photo',
        src: bm.imageDataUrl,
        x: 56,
        y: 36,
        width: 30,
        height: 24,
        rotation: -2,
        zIndex: baseZ + 1,
        opacity: 1,
        locked: false,
        hidden: false,
        clipFrame: 'polaroid',
        paperclipStyle: 'gold',
        paperclipPosition: 'top_center',
        caption: bm.title,
        flipX: false,
        borderRadius: 4,
        shadow: true,
        cropShape: 'rect',
        brightness: 100,
        contrast: 100,
        sepia: 0,
        blur: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    await saveScrapbookItemsBulk(newItems);
    showToast(`Добавлено в Scrapbook книги на стр. ${bm.pageIndex + 1}`);
  };

  const activeModalBook = editingBm
    ? bookMap.get(editingBm.bookId)
    : creatingForBookId
    ? bookMap.get(creatingForBookId)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Умные закладки</h1>
          <p className="text-xs mt-1" style={{color: 'var(--site-text-muted)'}}>
            Собирайте важные моменты, характеры героев, теории и эмоции по всем книгам библиотеки
          </p>
        </div>

        {books.length > 0 && (
          <button
            onClick={() => setCreatingForBookId(bookFilter !== 'all' ? bookFilter : books[0].id)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--site-accent)',
              color: 'var(--site-accent-contrast)',
            }}
          >
            <Plus className="w-4 h-4" /> Новая закладка
          </button>
        )}
      </div>

      {/* Category quick filter buttons */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTypeFilter('all')}
          className="px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          style={{
            borderColor: typeFilter === 'all' ? 'var(--site-accent)' : 'var(--site-border)',
            backgroundColor: typeFilter === 'all' ? 'var(--site-surface-alt)' : 'var(--site-surface)',
          }}
        >
          Все ({smartBookmarks.length})
        </button>
        {allBookmarkCategories.map((cat) => {
          const cnt = smartBookmarks.filter((b) => b.type === cat.id).length;
          if (cnt === 0 && typeFilter !== cat.id) return null;
          const active = typeFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setTypeFilter(active ? 'all' : cat.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              style={{
                borderColor: active ? cat.color : 'var(--site-border)',
                backgroundColor: active ? 'var(--site-surface-alt)' : 'var(--site-surface)',
              }}
            >
              <span style={{color: cat.color}}>{renderBookmarkIcon(cat.icon, 'w-3.5 h-3.5')}</span>
              {cat.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div
          className="flex items-center gap-2 flex-1 min-w-[220px] rounded-xl border px-3.5 py-2"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <Search className="w-4 h-4 opacity-55 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, заметке, герою, главе или тегу..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <select
          value={bookFilter}
          onChange={(e) => setBookFilter(e.target.value)}
          className="rounded-xl border px-3 py-2 text-xs font-medium max-w-[200px]"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <option value="all">Все книги</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>

        {allCharacters.length > 0 && (
          <select
            value={characterFilter}
            onChange={(e) => setCharacterFilter(e.target.value)}
            className="rounded-xl border px-3 py-2 text-xs font-medium"
            style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
          >
            <option value="all">Все персонажи</option>
            {allCharacters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-xl border px-3 py-2 text-xs font-medium"
            style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
          >
            <option value="all">Все теги</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        )}

        {allColors.length > 1 && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl border" style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}>
            <button
              onClick={() => setColorFilter('all')}
              className={`text-[11px] px-1.5 rounded ${colorFilter === 'all' ? 'font-semibold' : 'opacity-60'}`}
            >
              Все цвета
            </button>
            {allColors.map((col) => (
              <button
                key={col}
                onClick={() => setColorFilter(colorFilter === col ? 'all' : col)}
                className={`w-4 h-4 rounded-full border ${
                  colorFilter === col ? 'ring-2 ring-[var(--site-accent)]' : ''
                }`}
                style={{backgroundColor: col}}
                title={col}
              />
            ))}
          </div>
        )}

        <div
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as BookmarkSortBy)}
            className="bg-transparent outline-none font-medium"
          >
            <option value="date_desc">Сначала новые</option>
            <option value="date_asc">Сначала старые</option>
            <option value="page">По номеру страницы</option>
            <option value="category">По категории</option>
          </select>
        </div>
      </div>

      {/* Bookmarks Grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center space-y-2.5"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <Bookmark className="w-8 h-8 mx-auto opacity-45" />
          <p className="font-display text-2xl font-semibold">Закладки не найдены</p>
          <p className="text-xs max-w-md mx-auto" style={{color: 'var(--site-text-muted)'}}>
            Ставьте умные закладки прямо во время чтения или создайте первую здесь — с цветом, типом, комментарием и именем героя.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((bm) => {
            const book = bookMap.get(bm.bookId);
            const cat = categoryMap.get(bm.type);
            return (
              <article
                key={bm.id}
                className="rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all"
                style={{
                  backgroundColor: 'var(--site-surface)',
                  borderColor: 'var(--site-border)',
                  boxShadow: 'var(--site-shadow)',
                }}
              >
                <div className="space-y-3">
                  {/* Top metadata line */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: 'var(--site-bg)',
                          borderColor: bm.color,
                          color: bm.color,
                        }}
                      >
                        {renderBookmarkIcon(bm.icon, 'w-4 h-4')}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-semibold leading-snug truncate">
                          {bm.stickerEmoji ? `${bm.stickerEmoji} ` : ''}
                          {bm.title}
                        </h3>
                        <p className="text-[11px] truncate" style={{color: 'var(--site-text-muted)'}}>
                          {cat?.label || 'Закладка'} · стр. {bm.pageIndex + 1}
                          {bm.chapterTitle ? ` · ${bm.chapterTitle}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Book & Date */}
                  <p className="text-xs font-medium truncate" style={{color: 'var(--site-text-muted)'}}>
                    {book?.title || 'Книга'} · {new Date(bm.createdAt).toLocaleDateString('ru-RU')}
                  </p>

                  {bm.note && (
                    <p className="text-sm leading-relaxed whitespace-pre-line">{bm.note}</p>
                  )}

                  {bm.imageDataUrl && (
                    <img
                      src={bm.imageDataUrl}
                      alt={bm.title}
                      className="w-full max-h-40 object-cover rounded-xl border"
                      style={{borderColor: 'var(--site-border)'}}
                    />
                  )}

                  {(bm.characterName || (bm.tags && bm.tags.length > 0)) && (
                    <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
                      {bm.characterName ? `Персонаж: ${bm.characterName}` : ''}
                      {bm.characterName && bm.tags?.length ? ' · ' : ''}
                      {bm.tags?.length ? bm.tags.map((t) => `#${t}`).join(' ') : ''}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div
                  className="pt-3 border-t flex flex-wrap items-center justify-between gap-2"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  <button
                    onClick={() => openBookInReader(bm.bookId, bm.pageIndex)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: 'var(--site-accent)',
                      color: 'var(--site-accent-contrast)',
                    }}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> К странице
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAddToScrapbook(bm)}
                      className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                      title="Добавить в Scrapbook"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingBm(bm)}
                      className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                      title="Редактировать"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        await deleteSmartBookmark(bm.id);
                        showToast('Закладка удалена');
                      }}
                      className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-600"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {activeModalBook && (editingBm || creatingForBookId) && (
        <SmartBookmarkModal
          book={activeModalBook}
          pageIndex={editingBm ? editingBm.pageIndex : activeModalBook.currentPage || 0}
          existing={editingBm}
          onClose={() => {
            setEditingBm(null);
            setCreatingForBookId(null);
          }}
        />
      )}
    </div>
  );
};

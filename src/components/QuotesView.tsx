import React, {useMemo, useState} from 'react';
import {
  ArrowUpRight,
  Download,
  MessageSquareQuote,
  Palette,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {DEFAULT_QUOTE_CARD_CONFIG} from '../constants/themes';
import {useLibrary} from '../context/LibraryContext';
import {QuoteCardConfig, QuoteCardStyleId, SavedQuote} from '../types/library';
import {exportQuoteToPng} from '../utils/quoteExporter';
import {ColorSwatchButton} from './ColorSwatchButton';
import {getTextureClass} from './ThemeBuilderModal';

const QUOTE_PRESETS: {id: QuoteCardStyleId; name: string; cfg: Partial<QuoteCardConfig>}[] = [
  {
    id: 'minimal',
    name: 'Минималистичный',
    cfg: {
      bgColor: '#FFFFFF',
      textColor: '#1E1F22',
      accentColor: '#6E6E76',
      texture: 'none',
      frameStyle: 'hairline',
      fontFamily: "'Manrope', sans-serif",
      showDecor: false,
    },
  },
  {
    id: 'literary_journal',
    name: 'Литературный дневник',
    cfg: {
      bgColor: '#FAF5EC',
      textColor: '#2E251D',
      accentColor: '#8C5E4D',
      texture: 'grain',
      frameStyle: 'double',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      showDecor: true,
    },
  },
  {
    id: 'vintage_postcard',
    name: 'Винтажная открытка',
    cfg: {
      bgColor: '#EFE3CC',
      textColor: '#3A2B1D',
      accentColor: '#7D5C3E',
      texture: 'aged',
      frameStyle: 'corners',
      fontFamily: "'Lora', Georgia, serif",
      showDecor: true,
    },
  },
  {
    id: 'dark_academia',
    name: 'Тёмная академия',
    cfg: {
      bgColor: '#1E1A17',
      textColor: '#EAE0D0',
      accentColor: '#C5A06D',
      texture: 'linen',
      frameStyle: 'double',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      showDecor: true,
    },
  },
  {
    id: 'botanical',
    name: 'Ботанический',
    cfg: {
      bgColor: '#F1F5EC',
      textColor: '#243125',
      accentColor: '#5B7558',
      texture: 'dots',
      frameStyle: 'hairline',
      fontFamily: "'Lora', Georgia, serif",
      showDecor: true,
    },
  },
  {
    id: 'celestial',
    name: 'Ночное небо',
    cfg: {
      bgColor: '#13192B',
      textColor: '#E8ECF7',
      accentColor: '#DFC47B',
      texture: 'stars',
      frameStyle: 'corners',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      showDecor: true,
    },
  },
];

export const QuotesView: React.FC = () => {
  const {
    books,
    quotes,
    annotationCategories,
    saveQuote,
    deleteQuote,
    openBookInReader,
    showToast,
  } = useLibrary();

  const [search, setSearch] = useState('');
  const [bookFilter, setBookFilter] = useState('all');
  const [editingQuote, setEditingQuote] = useState<SavedQuote | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const [newText, setNewText] = useState('');
  const [newBookId, setNewBookId] = useState(books[0]?.id || '');
  const [newNote, setNewNote] = useState('');

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (bookFilter !== 'all' && q.bookId !== bookFilter) return false;
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        return (
          q.text.toLowerCase().includes(s) ||
          q.bookTitle.toLowerCase().includes(s) ||
          q.bookAuthor.toLowerCase().includes(s) ||
          q.note.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [quotes, bookFilter, search]);

  const handleAddManualQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const b = books.find((bk) => bk.id === newBookId);
    await saveQuote({
      id: `quote_${Date.now()}`,
      bookId: b?.id || '',
      bookTitle: b?.title || 'Личная запись',
      bookAuthor: b?.author || 'Читательский дневник',
      text: newText.trim(),
      pageNumber: (b?.currentPage || 0) + 1,
      pageIndex: b?.currentPage || 0,
      categoryId: 'quote',
      color: '#F3DF9E',
      note: newNote.trim(),
      cardConfig: DEFAULT_QUOTE_CARD_CONFIG,
      createdAt: Date.now(),
    });
    setNewText('');
    setNewNote('');
    setShowNewModal(false);
    showToast('Цитата сохранена');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Мои цитаты</h1>
          <p className="text-xs mt-1" style={{color: 'var(--site-text-muted)'}}>
            Оформляйте цитаты в эстетичные карточки и экспортируйте в PNG для галереи и публикаций
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap"
          style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
        >
          <Plus className="w-4 h-4" />
          Добавить цитату
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div
          className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl border px-3.5 py-2"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <Search className="w-4 h-4 opacity-55" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по цитатам, книгам и авторам..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={bookFilter}
          onChange={(e) => setBookFilter(e.target.value)}
          className="rounded-xl border px-3 py-2 text-xs font-medium"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <option value="all">Все книги</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center space-y-2"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <MessageSquareQuote className="w-8 h-8 mx-auto opacity-45" />
          <p className="font-display text-2xl font-semibold">Цитат пока нет</p>
          <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
            Выделите текст в читалке и нажмите «В цитаты» или создайте карточку вручную
          </p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-5 space-y-5">
          {filtered.map((q) => {
            const cat = annotationCategories.find((c) => c.id === q.categoryId);
            const cfg = q.cardConfig || DEFAULT_QUOTE_CARD_CONFIG;
            return (
              <article key={q.id} className="break-inside-avoid space-y-2">
                <div
                  className={`rounded-2xl p-6 sm:p-7 relative overflow-hidden transition-transform hover:-translate-y-0.5 ${getTextureClass(
                    cfg.texture
                  )}`}
                  style={{
                    background: cfg.bgGradient || cfg.bgColor,
                    color: cfg.textColor,
                    border:
                      cfg.frameStyle === 'double'
                        ? `3px double ${cfg.accentColor}44`
                        : cfg.frameStyle === 'hairline'
                        ? `1px solid ${cfg.accentColor}35`
                        : '1px solid rgba(0,0,0,0.08)',
                    boxShadow: 'var(--site-shadow)',
                  }}
                >
                  {cfg.frameStyle === 'corners' && (
                    <>
                      <span
                        className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 opacity-45"
                        style={{borderColor: cfg.accentColor}}
                      />
                      <span
                        className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 opacity-45"
                        style={{borderColor: cfg.accentColor}}
                      />
                      <span
                        className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 opacity-45"
                        style={{borderColor: cfg.accentColor}}
                      />
                      <span
                        className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 opacity-45"
                        style={{borderColor: cfg.accentColor}}
                      />
                    </>
                  )}

                  {cfg.showDecor && (
                    <span
                      className="font-display text-5xl leading-none opacity-25 block -mb-3 select-none"
                      style={{color: cfg.accentColor}}
                    >
                      «
                    </span>
                  )}

                  <blockquote
                    className="text-lg sm:text-xl leading-relaxed font-medium"
                    style={{fontFamily: cfg.fontFamily}}
                  >
                    {q.text}
                  </blockquote>

                  <div
                    className="mt-5 pt-4 border-t flex items-end justify-between gap-3"
                    style={{borderColor: `${cfg.accentColor}30`}}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{q.bookTitle}</p>
                      <p className="text-[11px] opacity-75 truncate">
                        {q.bookAuthor} · стр. {q.pageNumber}
                        {cat ? ` · ${cat.emoji}` : ''}
                      </p>
                      {q.note && <p className="font-hand text-base mt-1 opacity-80">{q.note}</p>}
                    </div>
                  </div>
                </div>

                {/* Card actions bar */}
                <div className="flex items-center justify-between px-1 text-xs">
                  <span style={{color: 'var(--site-text-muted)'}}>
                    {new Date(q.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                  <div className="flex items-center gap-1">
                    {q.bookId && (
                      <button
                        onClick={() => openBookInReader(q.bookId, q.pageIndex)}
                        className="p-1.5 rounded-lg hover:bg-black/5"
                        title="Открыть в книге"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingQuote(q)}
                      className="p-1.5 rounded-lg hover:bg-black/5"
                      title="Оформить карточку"
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        await exportQuoteToPng(q);
                        showToast('Карточка экспортирована в PNG');
                      }}
                      className="p-1.5 rounded-lg hover:bg-black/5"
                      title="Скачать PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuote(q.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10"
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

      {/* Quote Card Style Designer Modal */}
      {editingQuote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-6"
          onClick={() => setEditingQuote(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-5"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
              color: 'var(--site-text)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Оформление карточки цитаты</h2>
              <button onClick={() => setEditingQuote(null)} className="p-2 rounded-lg hover:bg-black/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Preview */}
              <div
                className={`rounded-2xl p-6 flex flex-col justify-between min-h-[260px] relative ${getTextureClass(
                  editingQuote.cardConfig.texture
                )}`}
                style={{
                  background: editingQuote.cardConfig.bgGradient || editingQuote.cardConfig.bgColor,
                  color: editingQuote.cardConfig.textColor,
                  border:
                    editingQuote.cardConfig.frameStyle === 'double'
                      ? `3px double ${editingQuote.cardConfig.accentColor}50`
                      : `1px solid ${editingQuote.cardConfig.accentColor}35`,
                }}
              >
                <p
                  className="text-xl leading-relaxed"
                  style={{fontFamily: editingQuote.cardConfig.fontFamily}}
                >
                  «{editingQuote.text}»
                </p>
                <div className="pt-4 border-t mt-4" style={{borderColor: `${editingQuote.cardConfig.accentColor}30`}}>
                  <p className="text-xs font-semibold">{editingQuote.bookTitle}</p>
                  <p className="text-[11px] opacity-75">{editingQuote.bookAuthor}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold block mb-1.5">Стиль карточки</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {QUOTE_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() =>
                          setEditingQuote({
                            ...editingQuote,
                            cardConfig: {
                              ...editingQuote.cardConfig,
                              bgGradient: undefined,
                              ...p.cfg,
                              styleId: p.id,
                            },
                          })
                        }
                        className="p-2 rounded-xl border text-left hover:bg-black/5 font-medium"
                        style={{borderColor: 'var(--site-border)'}}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="block opacity-75">Фон</span>
                    <ColorSwatchButton
                      className="w-full justify-start"
                      enableGradient={true}
                      value={editingQuote.cardConfig.bgColor}
                      gradientValue={editingQuote.cardConfig.bgGradient}
                      onChange={(c, g) =>
                        setEditingQuote({
                          ...editingQuote,
                          cardConfig: {
                            ...editingQuote.cardConfig,
                            bgColor: c,
                            bgGradient: g,
                          },
                        })
                      }
                      label="Фон"
                      title="Выбрать цвет или градиент фона"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block opacity-75">Текст</span>
                    <ColorSwatchButton
                      className="w-full justify-start"
                      value={editingQuote.cardConfig.textColor}
                      onChange={(c) =>
                        setEditingQuote({
                          ...editingQuote,
                          cardConfig: {...editingQuote.cardConfig, textColor: c},
                        })
                      }
                      label="Текст"
                      title="Выбрать цвет текста"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block opacity-75">Акцент</span>
                    <ColorSwatchButton
                      className="w-full justify-start"
                      value={editingQuote.cardConfig.accentColor}
                      onChange={(c) =>
                        setEditingQuote({
                          ...editingQuote,
                          cardConfig: {...editingQuote.cardConfig, accentColor: c},
                        })
                      }
                      label="Акцент"
                      title="Выбрать акцентный цвет"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editingQuote.cardConfig.texture}
                    onChange={(e) =>
                      setEditingQuote({
                        ...editingQuote,
                        cardConfig: {
                          ...editingQuote.cardConfig,
                          texture: e.target.value as QuoteCardConfig['texture'],
                        },
                      })
                    }
                    className="rounded-xl border px-2.5 py-2"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  >
                    <option value="none">Без текстуры</option>
                    <option value="grain">Зернистая бумага</option>
                    <option value="aged">Пергамент</option>
                    <option value="linen">Лён</option>
                    <option value="dots">Точки</option>
                    <option value="stars">Звёзды</option>
                  </select>
                  <select
                    value={editingQuote.cardConfig.frameStyle}
                    onChange={(e) =>
                      setEditingQuote({
                        ...editingQuote,
                        cardConfig: {
                          ...editingQuote.cardConfig,
                          frameStyle: e.target.value as QuoteCardConfig['frameStyle'],
                        },
                      })
                    }
                    className="rounded-xl border px-2.5 py-2"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  >
                    <option value="none">Без рамки</option>
                    <option value="hairline">Тонкая рамка</option>
                    <option value="double">Двойная книжная</option>
                    <option value="corners">Декор по углам</option>
                  </select>
                </div>

                <input
                  value={editingQuote.note}
                  onChange={(e) => setEditingQuote({...editingQuote, note: e.target.value})}
                  placeholder="Личная заметка к цитате..."
                  className="w-full rounded-xl border px-3 py-2"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 pt-3 border-t" style={{borderColor: 'var(--site-border)'}}>
              <button
                onClick={async () => {
                  await exportQuoteToPng(editingQuote);
                  showToast('Изображение PNG сохранено');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-medium"
                style={{borderColor: 'var(--site-border)'}}
              >
                <Download className="w-4 h-4" />
                Экспортировать PNG
              </button>
              <button
                onClick={async () => {
                  await saveQuote(editingQuote);
                  setEditingQuote(null);
                  showToast('Оформление цитаты сохранено');
                }}
                className="px-5 py-2 rounded-xl text-xs font-medium"
                style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
              >
                Сохранить карточку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Quote Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowNewModal(false)}
        >
          <form
            onSubmit={handleAddManualQuote}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border p-5 space-y-3 shadow-2xl"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
              color: 'var(--site-text)',
            }}
          >
            <h2 className="font-display text-2xl font-semibold">Новая цитата</h2>
            <select
              value={newBookId}
              onChange={(e) => setNewBookId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-xs"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
              <option value="">Без привязки к книге</option>
            </select>
            <textarea
              rows={4}
              required
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Текст цитаты..."
              className="w-full rounded-xl border p-3 text-sm outline-none"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            />
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Собственная заметка..."
              className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl border text-xs"
                style={{borderColor: 'var(--site-border)'}}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-medium"
                style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

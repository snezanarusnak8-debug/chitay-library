import React, {useMemo, useState} from 'react';
import {ArrowUpRight, Highlighter, Search, Trash2} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {ColorSwatchButton} from './ColorSwatchButton';

export const AnnotationsView: React.FC = () => {
  const {
    books,
    annotations,
    annotationCategories,
    openBookInReader,
    saveAnnotation,
    deleteAnnotation,
    recordRecentColor,
    showToast,
  } = useLibrary();

  const [bookFilter, setBookFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return annotations.filter((a) => {
      if (bookFilter !== 'all' && a.bookId !== bookFilter) return false;
      if (catFilter !== 'all' && a.categoryId !== catFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const match =
          a.quoteText.toLowerCase().includes(q) ||
          a.noteText.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [annotations, bookFilter, catFilter, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Мои аннотации и заметки</h1>
        <p className="text-xs mt-1" style={{color: 'var(--site-text-muted)'}}>
          Нажмите на любую карточку, чтобы мгновенно вернуться к отмеченному фрагменту в книге
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div
          className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl border px-3.5 py-2"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <Search className="w-4 h-4 opacity-55" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по выделенному тексту, заметкам и тегам..."
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

        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-xl border px-3 py-2 text-xs font-medium"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <option value="all">Все категории</option>
          {annotationCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center space-y-2"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <Highlighter className="w-8 h-8 mx-auto opacity-45" />
          <p className="font-display text-2xl font-semibold">Аннотации не найдены</p>
          <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
            Откройте любую книгу и выделите понравившийся фрагмент текста
          </p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-4 space-y-4">
          {filtered.map((ann) => {
            const book = books.find((b) => b.id === ann.bookId);
            const cat = annotationCategories.find((c) => c.id === ann.categoryId);
            return (
              <article
                key={ann.id}
                className="break-inside-avoid rounded-2xl border p-4 space-y-3 transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--site-surface)',
                  borderColor: 'var(--site-border)',
                  boxShadow: 'var(--site-shadow)',
                }}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">
                    {cat?.emoji} {cat?.label || 'Заметка'}
                    {ann.stampText ? ` · ${ann.stampText}` : ''}
                  </span>
                  <span className="font-mono-num opacity-65">
                    стр. {ann.pageIndex + 1}
                  </span>
                </div>

                <div
                  onClick={() => openBookInReader(ann.bookId, ann.pageIndex, ann.id)}
                  className="rounded-xl p-3 cursor-pointer text-sm leading-relaxed font-serif-book"
                  style={{backgroundColor: ann.color}}
                >
                  «{ann.quoteText}» {ann.stickerEmoji}
                </div>

                {ann.noteText && (
                  <p className={ann.handwriting ? 'font-hand text-lg leading-snug' : 'text-xs leading-relaxed'}>
                    {ann.noteText}
                  </p>
                )}

                {ann.tags.length > 0 && (
                  <p className="text-[11px]" style={{color: 'var(--site-text-muted)'}}>
                    {ann.tags.map((t) => `#${t}`).join(' · ')}
                  </p>
                )}

                <div
                  className="pt-2.5 border-t flex items-center justify-between gap-2 text-xs"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  <span className="truncate font-medium opacity-80">
                    {book?.title || 'Книга'} · {new Date(ann.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ColorSwatchButton
                      compact
                      value={ann.color}
                      onChange={async (c) => {
                        await saveAnnotation({...ann, color: c, updatedAt: Date.now()});
                        recordRecentColor(c);
                      }}
                      label="Цвет выделения"
                      title="Изменить цвет выделения"
                    />
                    <button
                      onClick={() => openBookInReader(ann.bookId, ann.pageIndex, ann.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium hover:bg-black/5"
                      style={{borderColor: 'var(--site-border)'}}
                    >
                      К месту
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        await deleteAnnotation(ann.id);
                        showToast('Аннотация удалена');
                      }}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

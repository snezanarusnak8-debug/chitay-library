import React, {useEffect, useState} from 'react';
import {BookOpen, Highlighter, MessageSquareQuote, Search, StickyNote, X} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {dbStorage} from '../db/storage';

interface GlobalSearchModalProps {
  onClose: () => void;
}

interface SearchHit {
  id: string;
  type: 'book' | 'quote' | 'annotation' | 'text';
  title: string;
  subtitle: string;
  snippet: string;
  bookId: string;
  pageIndex?: number;
  annotationId?: string;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({onClose}) => {
  const {books, quotes, annotations, openBookInReader, setNavSection} = useLibrary();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searchingText, setSearchingText] = useState(false);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setHits([]);
      return;
    }

    const immediate: SearchHit[] = [];

    for (const b of books) {
      if (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.genre.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        immediate.push({
          id: `b_${b.id}`,
          type: 'book',
          title: b.title,
          subtitle: `${b.author} · ${b.format}`,
          snippet: b.description || `${b.totalPages} страниц`,
          bookId: b.id,
          pageIndex: b.currentPage,
        });
      }
    }

    for (const qt of quotes) {
      if (
        qt.text.toLowerCase().includes(q) ||
        qt.note.toLowerCase().includes(q) ||
        qt.bookTitle.toLowerCase().includes(q)
      ) {
        immediate.push({
          id: `q_${qt.id}`,
          type: 'quote',
          title: qt.bookTitle,
          subtitle: `Цитата · стр. ${qt.pageNumber}`,
          snippet: qt.text,
          bookId: qt.bookId,
          pageIndex: qt.pageIndex,
        });
      }
    }

    for (const ann of annotations) {
      if (
        ann.quoteText.toLowerCase().includes(q) ||
        ann.noteText.toLowerCase().includes(q) ||
        ann.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        const b = books.find((bk) => bk.id === ann.bookId);
        immediate.push({
          id: `a_${ann.id}`,
          type: 'annotation',
          title: b?.title || 'Книга',
          subtitle: `Аннотация / Заметка · стр. ${ann.pageIndex + 1}`,
          snippet: ann.noteText ? `${ann.noteText} — «${ann.quoteText}»` : ann.quoteText,
          bookId: ann.bookId,
          pageIndex: ann.pageIndex,
          annotationId: ann.id,
        });
      }
    }

    setHits(immediate);

    if (q.length < 3) return;
    let cancelled = false;
    setSearchingText(true);
    (async () => {
      const textHits: SearchHit[] = [];
      for (const b of books) {
        const content = await dbStorage.getBookContent(b.id);
        if (!content || cancelled) continue;
        let matchesForBook = 0;
        for (const p of content.pages) {
          for (const para of p.paragraphs) {
            const idx = para.toLowerCase().indexOf(q);
            if (idx !== -1) {
              const start = Math.max(0, idx - 45);
              const end = Math.min(para.length, idx + q.length + 75);
              textHits.push({
                id: `t_${b.id}_${p.index}_${matchesForBook}`,
                type: 'text',
                title: b.title,
                subtitle: `Текст книги · ${p.chapterTitle} · стр. ${p.index + 1}`,
                snippet: (start > 0 ? '…' : '') + para.slice(start, end) + (end < para.length ? '…' : ''),
                bookId: b.id,
                pageIndex: p.index,
              });
              matchesForBook += 1;
              break;
            }
          }
          if (matchesForBook >= 3) break;
        }
      }
      if (!cancelled) {
        setHits([...immediate, ...textHits]);
        setSearchingText(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query, books, quotes, annotations]);

  const handleSelect = (hit: SearchHit) => {
    onClose();
    if (hit.type === 'quote') {
      openBookInReader(hit.bookId, hit.pageIndex);
    } else if (hit.type === 'annotation') {
      openBookInReader(hit.bookId, hit.pageIndex, hit.annotationId);
    } else {
      openBookInReader(hit.bookId, hit.pageIndex);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-xs pt-12 sm:pt-20 p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--site-surface)',
          borderColor: 'var(--site-border)',
          color: 'var(--site-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b"
          style={{borderColor: 'var(--site-border)'}}
        >
          <Search className="w-5 h-5 shrink-0 opacity-60" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по книгам, авторам, тексту, цитатам, заметкам..."
            className="w-full bg-transparent text-sm outline-none"
          />
          <button
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-black/5"
            aria-label="Закрыть поиск"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3">
          {!query.trim() ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-medium">Быстрый поиск по всей библиотеке</p>
              <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
                Введите название книги, имя автора, слово из текста, цитату или тег заметки
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-3">
                <button
                  onClick={() => {
                    onClose();
                    setNavSection('annotations');
                  }}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  Все аннотации
                </button>
                <button
                  onClick={() => {
                    onClose();
                    setNavSection('quotes');
                  }}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  Все цитаты
                </button>
              </div>
            </div>
          ) : hits.length === 0 && !searchingText ? (
            <div className="py-10 text-center text-sm opacity-70">
              По запросу «{query}» ничего не найдено
            </div>
          ) : (
            <div className="space-y-1.5">
              {hits.map((hit) => (
                <button
                  key={hit.id}
                  onClick={() => handleSelect(hit)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{backgroundColor: 'var(--site-surface-alt)'}}
                  >
                    {hit.type === 'book' && <BookOpen className="w-4 h-4" />}
                    {hit.type === 'quote' && <MessageSquareQuote className="w-4 h-4" />}
                    {hit.type === 'annotation' && <Highlighter className="w-4 h-4" />}
                    {hit.type === 'text' && <StickyNote className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{hit.title}</span>
                      <span className="text-[11px] shrink-0" style={{color: 'var(--site-text-muted)'}}>
                        {hit.subtitle}
                      </span>
                    </div>
                    <p className="text-xs mt-1 line-clamp-2" style={{color: 'var(--site-text-muted)'}}>
                      {hit.snippet}
                    </p>
                  </div>
                </button>
              ))}
              {searchingText && (
                <p className="text-xs text-center py-2 opacity-60">Поиск внутри текста книг...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

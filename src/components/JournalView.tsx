import React, {useEffect, useMemo, useState} from 'react';
import {BookOpen, NotebookPen, Star} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {BookJournal} from '../types/library';

const EMOTION_TAGS = [
  'Уют',
  'Вдохновение',
  'Тревога',
  'Восторг',
  'Меланхолия',
  'Загадка',
  'Тепло',
  'Ностальгия',
  'Катарсис',
];

export const JournalView: React.FC = () => {
  const {
    books,
    journals,
    quotes,
    annotations,
    journalBookId,
    saveJournal,
    updateBook,
    openBookInReader,
  } = useLibrary();

  const [selectedBookId, setSelectedBookId] = useState<string>(
    journalBookId || books[0]?.id || ''
  );

  useEffect(() => {
    if (journalBookId) setSelectedBookId(journalBookId);
    else if (!selectedBookId && books[0]) setSelectedBookId(books[0].id);
  }, [journalBookId, books, selectedBookId]);

  const activeBook = books.find((b) => b.id === selectedBookId);

  const emptyJournal: BookJournal = useMemo(
    () => ({
      id: selectedBookId,
      bookId: selectedBookId,
      impressions: '',
      review: '',
      favoriteCharacters: '',
      dislikedCharacters: '',
      favoriteMoments: '',
      theories: '',
      predictions: '',
      emotions: [],
      rating: activeBook?.rating || 0,
      startDate: '',
      finishDate: '',
      freeNotes: '',
      chapterEntries: {},
      updatedAt: Date.now(),
    }),
    [selectedBookId, activeBook?.rating]
  );

  const existing = journals.find((j) => j.bookId === selectedBookId);
  const [draft, setDraft] = useState<BookJournal>(existing || emptyJournal);

  useEffect(() => {
    setDraft(existing || emptyJournal);
  }, [existing, emptyJournal]);

  const updateField = <K extends keyof BookJournal>(key: K, val: BookJournal[K]) => {
    const next: BookJournal = {...draft, [key]: val, updatedAt: Date.now()};
    setDraft(next);
    if (selectedBookId) {
      saveJournal(next);
      if (key === 'rating' && activeBook) {
        updateBook({...activeBook, rating: val as number});
      }
    }
  };

  const toggleEmotion = (emo: string) => {
    const list = draft.emotions.includes(emo)
      ? draft.emotions.filter((e) => e !== emo)
      : [...draft.emotions, emo];
    updateField('emotions', list);
  };

  const bookQuotes = quotes.filter((q) => q.bookId === selectedBookId);
  const bookAnns = annotations.filter((a) => a.bookId === selectedBookId);

  if (books.length === 0) {
    return (
      <div
        className="rounded-2xl border p-12 text-center space-y-2"
        style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
      >
        <NotebookPen className="w-8 h-8 mx-auto opacity-45" />
        <p className="font-display text-2xl font-semibold">Дневник чтения</p>
        <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
          Добавьте книгу в библиотеку, чтобы вести по ней читательский дневник
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Книжный дневник</h1>
          <p className="text-xs mt-1" style={{color: 'var(--site-text-muted)'}}>
            Все записи сохраняются автоматически в фоновом режиме
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            className="rounded-xl border px-3.5 py-2 text-sm font-medium max-w-[260px]"
            style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
          {activeBook && (
            <button
              onClick={() => openBookInReader(activeBook.id, activeBook.currentPage)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: 'var(--site-accent)',
                color: 'var(--site-accent-contrast)',
              }}
            >
              <BookOpen className="w-4 h-4" />
              Открыть книгу
            </button>
          )}
        </div>
      </div>

      {activeBook && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Summary, Rating, Dates, Emotions */}
          <div className="lg:col-span-4 space-y-5">
            <div
              className="rounded-2xl border p-5 space-y-4"
              style={{
                backgroundColor: 'var(--site-surface)',
                borderColor: 'var(--site-border)',
                boxShadow: 'var(--site-shadow)',
              }}
            >
              <div className="flex gap-4">
                <div
                  className="w-20 h-28 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center"
                  style={{backgroundColor: 'var(--site-surface-alt)', borderColor: 'var(--site-border)'}}
                >
                  {activeBook.coverDataUrl ? (
                    <img
                      src={activeBook.coverDataUrl}
                      alt={activeBook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-center px-1">{activeBook.title}</span>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="font-display text-xl font-semibold leading-tight">
                    {activeBook.title}
                  </h2>
                  <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
                    {activeBook.author}
                  </p>
                  <div className="flex items-center gap-0.5 pt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => updateField('rating', n === draft.rating ? 0 : n)}
                        className="p-1"
                      >
                        <Star
                          className="w-4 h-4"
                          fill={n <= draft.rating ? 'var(--site-accent)' : 'none'}
                          stroke={n <= draft.rating ? 'var(--site-accent)' : 'currentColor'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <label>
                  <span className="opacity-70 block mb-1">Начало чтения</span>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                    className="w-full rounded-xl border px-2.5 py-2"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  />
                </label>
                <label>
                  <span className="opacity-70 block mb-1">Завершение</span>
                  <input
                    type="date"
                    value={draft.finishDate}
                    onChange={(e) => updateField('finishDate', e.target.value)}
                    className="w-full rounded-xl border px-2.5 py-2"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  />
                </label>
              </div>

              <div>
                <span className="text-xs font-medium opacity-75 block mb-2">
                  Эмоции во время чтения
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {EMOTION_TAGS.map((emo) => {
                    const active = draft.emotions.includes(emo);
                    return (
                      <button
                        key={emo}
                        onClick={() => toggleEmotion(emo)}
                        className="px-2.5 py-1 rounded-lg border text-xs transition-colors"
                        style={{
                          borderColor: active ? 'var(--site-accent)' : 'var(--site-border)',
                          backgroundColor: active ? 'var(--site-accent)' : 'var(--site-bg)',
                          color: active ? 'var(--site-accent-contrast)' : 'var(--site-text)',
                        }}
                      >
                        {emo}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Saved Quotes & Annotations summary */}
            <div
              className="rounded-2xl border p-5 space-y-3"
              style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
            >
              <h3 className="font-display text-lg font-semibold">
                Цитаты ({bookQuotes.length}) и аннотации ({bookAnns.length})
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                {bookQuotes.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => openBookInReader(activeBook.id, q.pageIndex)}
                    className="p-2.5 rounded-xl border cursor-pointer hover:bg-black/5"
                    style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-bg)'}}
                  >
                    <p className="italic line-clamp-2">«{q.text}»</p>
                    <span className="text-[10px] opacity-60">Цитата · стр. {q.pageNumber}</span>
                  </div>
                ))}
                {bookAnns.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => openBookInReader(activeBook.id, a.pageIndex, a.id)}
                    className="p-2.5 rounded-xl border cursor-pointer hover:bg-black/5"
                    style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-bg)'}}
                  >
                    <p className="line-clamp-2">{a.noteText || a.quoteText}</p>
                    <span className="text-[10px] opacity-60">Аннотация · стр. {a.pageIndex + 1}</span>
                  </div>
                ))}
                {bookQuotes.length === 0 && bookAnns.length === 0 && (
                  <p className="opacity-60">Пока нет сохранённых цитат и аннотаций по этой книге</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Journal Entries & Chapter Diary */}
          <div className="lg:col-span-8 space-y-5">
            <div
              className="rounded-2xl border p-5 sm:p-6 space-y-4"
              style={{
                backgroundColor: 'var(--site-surface)',
                borderColor: 'var(--site-border)',
                boxShadow: 'var(--site-shadow)',
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-medium opacity-75 block mb-1">Общие впечатления</span>
                  <textarea
                    rows={3}
                    value={draft.impressions}
                    onChange={(e) => updateField('impressions', e.target.value)}
                    placeholder="Какие первые ощущения от книги?"
                    className="w-full rounded-xl border p-3 text-sm outline-none"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium opacity-75 block mb-1">Итоговый отзыв</span>
                  <textarea
                    rows={3}
                    value={draft.review}
                    onChange={(e) => updateField('review', e.target.value)}
                    placeholder="Развёрнутый отзыв о прочитанном..."
                    className="w-full rounded-xl border p-3 text-sm outline-none"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium opacity-75 block mb-1">Любимые персонажи</span>
                  <textarea
                    rows={2}
                    value={draft.favoriteCharacters}
                    onChange={(e) => updateField('favoriteCharacters', e.target.value)}
                    className="w-full rounded-xl border p-3 text-sm outline-none"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium opacity-75 block mb-1">Нелюбимые персонажи</span>
                  <textarea
                    rows={2}
                    value={draft.dislikedCharacters}
                    onChange={(e) => updateField('dislikedCharacters', e.target.value)}
                    className="w-full rounded-xl border p-3 text-sm outline-none"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium opacity-75 block mb-1">Теории и догадки</span>
                  <textarea
                    rows={2}
                    value={draft.theories}
                    onChange={(e) => updateField('theories', e.target.value)}
                    className="w-full rounded-xl border p-3 text-sm outline-none"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium opacity-75 block mb-1">Предположения о финале</span>
                  <textarea
                    rows={2}
                    value={draft.predictions}
                    onChange={(e) => updateField('predictions', e.target.value)}
                    className="w-full rounded-xl border p-3 text-sm outline-none"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium opacity-75 block mb-1">Любимые моменты</span>
                <textarea
                  rows={2}
                  value={draft.favoriteMoments}
                  onChange={(e) => updateField('favoriteMoments', e.target.value)}
                  className="w-full rounded-xl border p-3 text-sm outline-none"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium opacity-75 block mb-1">Свободное поле для заметок</span>
                <textarea
                  rows={4}
                  value={draft.freeNotes}
                  onChange={(e) => updateField('freeNotes', e.target.value)}
                  placeholder="Любые мысли, списки, ссылки и детали..."
                  className="w-full rounded-xl border p-3 text-sm outline-none font-hand text-lg"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                />
              </label>
            </div>

            {/* Chapter-by-Chapter Diary */}
            <div
              className="rounded-2xl border p-5 sm:p-6 space-y-4"
              style={{
                backgroundColor: 'var(--site-surface)',
                borderColor: 'var(--site-border)',
              }}
            >
              <h3 className="font-display text-2xl font-semibold">Дневник по главам</h3>
              {activeBook.toc.length === 0 ? (
                <p className="text-xs opacity-65">У этой книги нет оглавления по главам</p>
              ) : (
                <div className="space-y-3">
                  {activeBook.toc.map((ch) => (
                    <div
                      key={ch.id}
                      className="rounded-xl border p-3.5 space-y-2"
                      style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{ch.title}</span>
                        <button
                          onClick={() => openBookInReader(activeBook.id, ch.pageIndex)}
                          className="text-xs underline opacity-70 hover:opacity-100"
                        >
                          стр. {ch.pageIndex + 1}
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={draft.chapterEntries[ch.id] || ''}
                        onChange={(e) =>
                          updateField('chapterEntries', {
                            ...draft.chapterEntries,
                            [ch.id]: e.target.value,
                          })
                        }
                        placeholder={`Заметки к разделу «${ch.title}»...`}
                        className="w-full rounded-lg border p-2.5 text-xs outline-none"
                        style={{
                          backgroundColor: 'var(--site-surface)',
                          borderColor: 'var(--site-border)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

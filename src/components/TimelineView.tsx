import React, {useEffect, useMemo, useState} from 'react';
import {
  Bookmark,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Compass,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Flag,
  Heart,
  Highlighter,
  Image as ImageIcon,
  LayoutList,
  MessageSquareQuote,
  NotebookPen,
  Palette,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {TimelineDisplayEvent, TimelineEventType} from '../types/library';
import {buildBookTimelineEvents, exportTimelineMemoryCardPng} from '../utils/timelineBuilder';
import {ColorSwatchButton} from './ColorSwatchButton';

type TimelineStyleTheme = 'parchment' | 'journal' | 'botanical' | 'night' | 'custom';
type TimelineFontStyle = 'serif' | 'sans' | 'hand';

const TIMELINE_STYLES: Record<
  Exclude<TimelineStyleTheme, 'custom'>,
  {name: string; bg: string; surface: string; text: string; accent: string; border: string}
> = {
  parchment: {
    name: 'Пергамент',
    bg: '#F7F1E5',
    surface: '#FFFDF8',
    text: '#2F251E',
    accent: '#8C5E4D',
    border: '#E4D8C4',
  },
  journal: {
    name: 'Журнал',
    bg: '#F4F2EE',
    surface: '#FFFFFF',
    text: '#222120',
    accent: '#5D6F8A',
    border: '#DFDCD5',
  },
  botanical: {
    name: 'Ботаника',
    bg: '#EFF4EE',
    surface: '#FAFDF9',
    text: '#243125',
    accent: '#5A7358',
    border: '#D3E0D1',
  },
  night: {
    name: 'Ночная лампа',
    bg: '#1A1816',
    surface: '#24211E',
    text: '#EAE3D7',
    accent: '#D2A679',
    border: '#38322C',
  },
};

const renderEventIcon = (type: TimelineEventType, className = 'w-4 h-4') => {
  switch (type) {
    case 'started':
      return <Flag className={className} />;
    case 'reading_day':
      return <Calendar className={className} />;
    case 'chapter':
      return <BookOpen className={className} />;
    case 'progress':
      return <Compass className={className} />;
    case 'quote':
      return <MessageSquareQuote className={className} />;
    case 'annotation':
      return <Highlighter className={className} />;
    case 'bookmark':
      return <Bookmark className={className} />;
    case 'theory':
      return <NotebookPen className={className} />;
    case 'emotion':
      return <Heart className={className} />;
    case 'quiz':
      return <Brain className={className} />;
    case 'scrapbook':
      return <Sparkles className={className} />;
    case 'finished':
      return <CheckCircle2 className={className} />;
    case 'reread':
      return <RefreshCw className={className} />;
    default:
      return <Calendar className={className} />;
  }
};

type TimelineFilterGroup =
  | 'all'
  | 'reading'
  | 'notes'
  | 'quotes'
  | 'emotions'
  | 'bookmarks'
  | 'quiz'
  | 'scrapbook';

const FILTER_GROUPS: {id: TimelineFilterGroup; label: string}[] = [
  {id: 'all', label: 'Все события'},
  {id: 'reading', label: 'Чтение и главы'},
  {id: 'notes', label: 'Заметки и теории'},
  {id: 'quotes', label: 'Цитаты'},
  {id: 'bookmarks', label: 'Закладки'},
  {id: 'emotions', label: 'Эмоции'},
  {id: 'quiz', label: 'Тесты'},
  {id: 'scrapbook', label: 'Scrapbook'},
];

export const TimelineView: React.FC = () => {
  const {
    books,
    annotations,
    quotes,
    smartBookmarks,
    journals,
    scrapbookItems,
    quizAttempts,
    timelineLogs,
    timelineOverrides,
    timelineBookId,
    saveTimelineOverride,
    openBookInReader,
    openBookJournal,
    openBookQuiz,
    showToast,
  } = useLibrary();

  const [selectedBookId, setSelectedBookId] = useState<string>(
    timelineBookId || books[0]?.id || ''
  );
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [filterGroup, setFilterGroup] = useState<TimelineFilterGroup>('all');
  const [showHidden, setShowHidden] = useState(false);

  // Visual style customization
  const [styleTheme, setStyleTheme] = useState<TimelineStyleTheme>('parchment');
  const [customStyle, setCustomStyle] = useState({
    name: 'Свои цвета',
    bg: '#F7F1E5',
    surface: '#FFFDF8',
    text: '#2F251E',
    accent: '#8C5E4D',
    border: '#E4D8C4',
  });
  const [fontStyle, setFontStyle] = useState<TimelineFontStyle>('serif');
  const [showDecor, setShowDecor] = useState(true);

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingEvent, setEditingEvent] = useState<TimelineDisplayEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editDate, setEditDate] = useState('');

  const [showMemoryPage, setShowMemoryPage] = useState(false);

  useEffect(() => {
    if (timelineBookId && books.some((b) => b.id === timelineBookId)) {
      setSelectedBookId(timelineBookId);
    } else if (!selectedBookId && books[0]) {
      setSelectedBookId(books[0].id);
    }
  }, [timelineBookId, books, selectedBookId]);

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedBookId) || null,
    [books, selectedBookId]
  );

  const selectedJournal = useMemo(
    () => journals.find((j) => j.bookId === selectedBookId),
    [journals, selectedBookId]
  );

  const bookQuotes = useMemo(
    () => quotes.filter((q) => q.bookId === selectedBookId),
    [quotes, selectedBookId]
  );

  const allEvents = useMemo(() => {
    if (!selectedBook) return [];
    return buildBookTimelineEvents({
      book: selectedBook,
      annotations,
      quotes,
      smartBookmarks,
      journal: selectedJournal,
      scrapbookItems,
      quizAttempts,
      timelineLogs,
      overrides: timelineOverrides,
    });
  }, [
    selectedBook,
    annotations,
    quotes,
    smartBookmarks,
    selectedJournal,
    scrapbookItems,
    quizAttempts,
    timelineLogs,
    timelineOverrides,
  ]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (!showHidden && ev.hidden) return false;
      if (filterGroup === 'all') return true;
      if (filterGroup === 'reading') {
        return ['started', 'reading_day', 'chapter', 'progress', 'finished', 'reread'].includes(
          ev.type
        );
      }
      if (filterGroup === 'notes') return ev.type === 'annotation' || ev.type === 'theory';
      if (filterGroup === 'quotes') return ev.type === 'quote';
      if (filterGroup === 'bookmarks') return ev.type === 'bookmark';
      if (filterGroup === 'emotions') return ev.type === 'emotion';
      if (filterGroup === 'quiz') return ev.type === 'quiz';
      if (filterGroup === 'scrapbook') return ev.type === 'scrapbook';
      return true;
    });
  }, [allEvents, showHidden, filterGroup]);

  const openEditModal = (ev: TimelineDisplayEvent) => {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditDetails(ev.details);
    setEditDate(new Date(ev.timestamp).toISOString().slice(0, 10));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !selectedBook) return;
    const prevOv = timelineOverrides.find((o) => o.id === editingEvent.id);
    const parsedTs = editDate ? new Date(editDate).getTime() : editingEvent.timestamp;
    await saveTimelineOverride({
      ...prevOv,
      id: editingEvent.id,
      bookId: selectedBook.id,
      customTitle: editTitle.trim() || editingEvent.title,
      customDetails: editDetails.trim(),
      customTimestamp: Number.isFinite(parsedTs) ? parsedTs : editingEvent.timestamp,
    });
    setEditingEvent(null);
    showToast('Событие таймлайна обновлено');
  };

  const handleToggleHide = async (ev: TimelineDisplayEvent) => {
    if (!selectedBook) return;
    const prevOv = timelineOverrides.find((o) => o.id === ev.id);
    await saveTimelineOverride({
      ...prevOv,
      id: ev.id,
      bookId: selectedBook.id,
      hidden: !ev.hidden,
    });
    showToast(ev.hidden ? 'Событие снова видно' : 'Событие скрыто из таймлайна');
  };

  const handleDeleteEvent = async (ev: TimelineDisplayEvent) => {
    if (!selectedBook) return;
    const prevOv = timelineOverrides.find((o) => o.id === ev.id);
    await saveTimelineOverride({
      ...prevOv,
      id: ev.id,
      bookId: selectedBook.id,
      deleted: true,
    });
    showToast('Событие удалено с таймлайна');
  };

  const themeStyle = styleTheme === 'custom' ? customStyle : TIMELINE_STYLES[styleTheme];

  const handleDownloadMemoryCard = async () => {
    if (!selectedBook) return;
    const st = themeStyle;
    try {
      const blob = await exportTimelineMemoryCardPng({
        book: selectedBook,
        events: allEvents,
        favoriteQuote: bookQuotes[0],
        emotions: selectedJournal?.emotions || [],
        bgColor: st.bg,
        textColor: st.text,
        accentColor: st.accent,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedBook.title.slice(0, 32)}_memories.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Страница воспоминаний сохранена в PNG');
    } catch {
      showToast('Не удалось сформировать изображение');
    }
  };
  const fontClass =
    fontStyle === 'serif'
      ? 'font-display'
      : fontStyle === 'hand'
      ? 'font-hand'
      : 'font-sans';

  const openDeepLink = (ev: TimelineDisplayEvent) => {
    if (!selectedBook) return;
    if (ev.quizAttemptId) {
      openBookQuiz(selectedBook.id);
      return;
    }
    if (ev.type === 'theory' || ev.type === 'emotion') {
      openBookJournal(selectedBook.id);
      return;
    }
    openBookInReader(selectedBook.id, ev.pageIndex ?? 0, ev.annotationId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Таймлайн книги</h1>
          <p className="text-xs mt-1" style={{color: 'var(--site-text-muted)'}}>
            Живая история вашего путешествия по книге: даты, главы, цитаты, эмоции и воспоминания
          </p>
        </div>

        {selectedBook && (
          <button
            onClick={() => setShowMemoryPage(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--site-accent)',
              color: 'var(--site-accent-contrast)',
            }}
          >
            <ImageIcon className="w-4 h-4" /> Страница воспоминаний о книге
          </button>
        )}
      </div>

      {/* Book Picker + Layout + Style Customizer */}
      <section
        className="rounded-2xl border p-4 sm:p-5 space-y-4"
        style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            className="flex-1 min-w-[220px] max-w-md rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none"
            style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} — {b.author}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div
              className="flex items-center p-1 rounded-xl border"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            >
              <button
                onClick={() => setLayoutMode('vertical')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
                  layoutMode === 'vertical' ? 'bg-black/10 dark:bg-white/10' : 'opacity-65'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5 inline mr-1" /> Вертикально
              </button>
              <button
                onClick={() => setLayoutMode('horizontal')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
                  layoutMode === 'horizontal' ? 'bg-black/10 dark:bg-white/10' : 'opacity-65'
                }`}
              >
                Горизонтально
              </button>
            </div>

            <button
              onClick={() => setShowHidden((v) => !v)}
              className="px-3 py-2 rounded-xl border font-medium whitespace-nowrap"
              style={{
                borderColor: showHidden ? 'var(--site-accent)' : 'var(--site-border)',
                backgroundColor: showHidden ? 'var(--site-surface-alt)' : 'var(--site-bg)',
              }}
            >
              {showHidden ? 'Скрытые видны' : 'Показать скрытые'}
            </button>
          </div>
        </div>

        {/* Style Customizer & Event Filters */}
        <div
          className="pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
          style={{borderColor: 'var(--site-border)'}}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 opacity-70">
              <Palette className="w-3.5 h-3.5" /> Стиль ленты:
            </span>
            {(Object.keys(TIMELINE_STYLES) as Exclude<TimelineStyleTheme, 'custom'>[]).map((key) => {
              const st = TIMELINE_STYLES[key];
              const active = styleTheme === key;
              return (
                <button
                  key={key}
                  onClick={() => setStyleTheme(key)}
                  className="px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: st.bg,
                    color: st.text,
                    borderColor: active ? st.accent : st.border,
                    boxShadow: active ? `0 0 0 1px ${st.accent}` : undefined,
                  }}
                >
                  {st.name}
                </button>
              );
            })}
            <button
              onClick={() => setStyleTheme('custom')}
              className="px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: customStyle.bg,
                color: customStyle.text,
                borderColor: styleTheme === 'custom' ? customStyle.accent : 'var(--site-border)',
                boxShadow: styleTheme === 'custom' ? `0 0 0 1px ${customStyle.accent}` : undefined,
              }}
            >
              Свои цвета
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={fontStyle}
              onChange={(e) => setFontStyle(e.target.value as TimelineFontStyle)}
              className="rounded-lg border px-2.5 py-1 text-xs"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            >
              <option value="serif">Шрифт: Книжный</option>
              <option value="sans">Шрифт: Современный</option>
              <option value="hand">Шрифт: Рукописный</option>
            </select>
            <button
              onClick={() => setShowDecor((v) => !v)}
              className="px-2.5 py-1 rounded-lg border text-xs"
              style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-bg)'}}
            >
              {showDecor ? 'Декор: вкл' : 'Декор: выкл'}
            </button>
          </div>
        </div>

        {styleTheme === 'custom' && (
          <div
            className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs"
            style={{borderColor: 'var(--site-border)'}}
          >
            <ColorSwatchButton
              value={customStyle.bg}
              onChange={(c) => setCustomStyle((s) => ({...s, bg: c}))}
              label="Фон"
              title="Цвет фона таймлайна"
            />
            <ColorSwatchButton
              value={customStyle.surface}
              onChange={(c) => setCustomStyle((s) => ({...s, surface: c}))}
              label="Карточки"
              title="Цвет карточек событий"
            />
            <ColorSwatchButton
              value={customStyle.text}
              onChange={(c) => setCustomStyle((s) => ({...s, text: c}))}
              label="Текст"
              title="Цвет текста таймлайна"
            />
            <ColorSwatchButton
              value={customStyle.accent}
              onChange={(c) => setCustomStyle((s) => ({...s, accent: c, border: c}))}
              label="Акцент"
              title="Акцентный цвет линии и маркеров"
            />
          </div>
        )}

        {/* Event Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_GROUPS.map((grp) => {
            const active = filterGroup === grp.id;
            return (
              <button
                key={grp.id}
                onClick={() => setFilterGroup(grp.id)}
                className="px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                style={{
                  borderColor: active ? 'var(--site-accent)' : 'var(--site-border)',
                  backgroundColor: active ? 'var(--site-accent)' : 'var(--site-bg)',
                  color: active ? 'var(--site-accent-contrast)' : 'var(--site-text)',
                }}
              >
                {grp.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Timeline Canvas */}
      {!selectedBook ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <p className="font-display text-2xl font-semibold">Выберите или добавьте книгу</p>
        </div>
      ) : (
        <section
          className="rounded-3xl border p-5 sm:p-8 transition-colors"
          style={{
            backgroundColor: themeStyle.bg,
            borderColor: themeStyle.border,
            color: themeStyle.text,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              {showDecor && (
                <p className="text-[11px] uppercase tracking-widest opacity-60 mb-1">
                  ✦ Литературная хроника ✦
                </p>
              )}
              <h2 className={`${fontClass} text-2xl sm:text-3xl font-semibold`}>
                {selectedBook.title}
              </h2>
              <p className="text-xs opacity-75">
                {selectedBook.author} · Событий на линии: {filteredEvents.length}
              </p>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <p className="text-sm opacity-70 py-10 text-center">
              По выбранному фильтру пока нет событий. Читайте книгу, добавляйте заметки, цитаты и закладки — они появятся здесь автоматически.
            </p>
          ) : layoutMode === 'vertical' ? (
            <div className="relative pl-6 sm:pl-8 space-y-4">
              <div
                className="absolute left-2.5 sm:left-3.5 top-2 bottom-2 w-px"
                style={{backgroundColor: themeStyle.accent, opacity: 0.35}}
              />
              {filteredEvents.map((ev) => {
                const expanded = Boolean(expandedIds[ev.id]);
                return (
                  <div key={ev.id} className={`relative ${ev.hidden ? 'opacity-50' : ''}`}>
                    <div
                      className="absolute -left-6 sm:-left-8 top-4 w-5 h-5 rounded-full border flex items-center justify-center"
                      style={{
                        backgroundColor: themeStyle.surface,
                        borderColor: themeStyle.accent,
                        color: themeStyle.accent,
                      }}
                    >
                      {renderEventIcon(ev.type, 'w-3 h-3')}
                    </div>

                    <div
                      className="rounded-2xl border p-4 space-y-2"
                      style={{
                        backgroundColor: themeStyle.surface,
                        borderColor: themeStyle.border,
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div
                          onClick={() =>
                            setExpandedIds((prev) => ({...prev, [ev.id]: !prev[ev.id]}))
                          }
                          className="cursor-pointer min-w-0 flex-1"
                        >
                          <p className="text-[11px] font-mono-num opacity-65">
                            {new Date(ev.timestamp).toLocaleDateString('ru-RU')}
                            {ev.pageIndex !== undefined ? ` · стр. ${ev.pageIndex + 1}` : ''}
                            {ev.isEdited ? ' · изменено' : ''}
                            {ev.hidden ? ' · скрыто' : ''}
                          </p>
                          <h3 className={`${fontClass} text-lg font-semibold leading-snug mt-0.5`}>
                            {ev.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openDeepLink(ev)}
                            className="px-2.5 py-1 rounded-lg border text-[11px] font-medium whitespace-nowrap"
                            style={{borderColor: themeStyle.border, color: themeStyle.accent}}
                          >
                            Открыть
                          </button>
                          <button
                            onClick={() => openEditModal(ev)}
                            className="p-1.5 rounded-lg hover:bg-black/5"
                            title="Редактировать"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleHide(ev)}
                            className="p-1.5 rounded-lg hover:bg-black/5"
                            title={ev.hidden ? 'Показать' : 'Скрыть'}
                          >
                            {ev.hidden ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600"
                            title="Удалить событие"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p
                        className={`text-xs sm:text-sm leading-relaxed opacity-85 ${
                          expanded ? '' : 'line-clamp-2'
                        }`}
                      >
                        {ev.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Horizontal Scrollable Timeline */
            <div className="overflow-x-auto pb-3">
              <div className="flex items-stretch gap-4 min-w-max relative pt-6">
                <div
                  className="absolute left-0 right-0 top-3 h-px"
                  style={{backgroundColor: themeStyle.accent, opacity: 0.35}}
                />
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`w-72 shrink-0 relative pt-4 ${ev.hidden ? 'opacity-50' : ''}`}
                  >
                    <div
                      className="absolute left-5 -top-[19px] w-6 h-6 rounded-full border flex items-center justify-center"
                      style={{
                        backgroundColor: themeStyle.surface,
                        borderColor: themeStyle.accent,
                        color: themeStyle.accent,
                      }}
                    >
                      {renderEventIcon(ev.type, 'w-3 h-3')}
                    </div>

                    <div
                      className="h-full rounded-2xl border p-4 flex flex-col justify-between gap-3"
                      style={{
                        backgroundColor: themeStyle.surface,
                        borderColor: themeStyle.border,
                      }}
                    >
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-mono-num opacity-65">
                          {new Date(ev.timestamp).toLocaleDateString('ru-RU')}
                          {ev.pageIndex !== undefined ? ` · стр. ${ev.pageIndex + 1}` : ''}
                        </p>
                        <h3 className={`${fontClass} text-lg font-semibold leading-snug`}>
                          {ev.title}
                        </h3>
                        <p className="text-xs leading-relaxed opacity-85 line-clamp-4">
                          {ev.details}
                        </p>
                      </div>

                      <div
                        className="pt-2 border-t flex items-center justify-between gap-1"
                        style={{borderColor: themeStyle.border}}
                      >
                        <button
                          onClick={() => openDeepLink(ev)}
                          className="text-xs font-medium underline"
                          style={{color: themeStyle.accent}}
                        >
                          Открыть
                        </button>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => openEditModal(ev)}
                            className="p-1 rounded hover:bg-black/5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleHide(ev)}
                            className="p-1 rounded hover:bg-black/5"
                          >
                            {ev.hidden ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Edit Timeline Event Modal */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingEvent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border p-5 sm:p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
              color: 'var(--site-text)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold">Редактировать событие</h3>
              <button onClick={() => setEditingEvent(null)} className="p-1.5 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-medium">Заголовок</span>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                />
              </label>
              <label className="block space-y-1">
                <span className="font-medium">Дата</span>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                />
              </label>
              <label className="block space-y-1">
                <span className="font-medium">Описание или личный комментарий</span>
                <textarea
                  rows={3}
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  className="w-full rounded-xl border p-3 text-sm outline-none"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-medium"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--site-accent)',
                    color: 'var(--site-accent-contrast)',
                  }}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Memories Page Modal ("Страница воспоминаний о книге") */}
      {showMemoryPage && selectedBook && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowMemoryPage(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-5"
            style={{
              backgroundColor: themeStyle.bg,
              borderColor: themeStyle.border,
              color: themeStyle.text,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest opacity-65">
                  Страница воспоминаний о книге
                </p>
                <h2 className={`${fontClass} text-3xl font-semibold mt-1`}>
                  {selectedBook.title}
                </h2>
                <p className="text-sm opacity-75">
                  {selectedBook.author} · {selectedBook.totalPages} стр.
                </p>
              </div>
              <button onClick={() => setShowMemoryPage(false)} className="p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedJournal?.emotions && selectedJournal.emotions.length > 0 && (
              <p className="text-xs font-medium" style={{color: themeStyle.accent}}>
                Настроение чтения: {selectedJournal.emotions.join(' · ')}
              </p>
            )}

            <div
              className="rounded-2xl border p-4 space-y-3"
              style={{backgroundColor: themeStyle.surface, borderColor: themeStyle.border}}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Ключевые вехи пути ({allEvents.filter((e) => !e.hidden).length})
              </h3>
              <div className="space-y-2.5">
                {allEvents
                  .filter((e) => !e.hidden)
                  .slice(0, 8)
                  .map((ev) => (
                    <div key={ev.id} className="flex items-start gap-3 text-xs">
                      <span className="font-mono-num opacity-65 shrink-0 w-20">
                        {new Date(ev.timestamp).toLocaleDateString('ru-RU')}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold">{ev.title}</p>
                        <p className="opacity-75 line-clamp-1">{ev.details}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {bookQuotes[0] && (
              <blockquote
                className="rounded-2xl border p-4 italic text-sm"
                style={{backgroundColor: themeStyle.surface, borderColor: themeStyle.border}}
              >
                «{bookQuotes[0].text}»
              </blockquote>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMemoryPage(false)}
                className="px-4 py-2 rounded-xl border text-xs font-medium"
                style={{borderColor: themeStyle.border}}
              >
                Закрыть
              </button>
              <button
                onClick={handleDownloadMemoryCard}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium"
                style={{
                  backgroundColor: themeStyle.accent,
                  color: '#FFFFFF',
                }}
              >
                <Download className="w-4 h-4" /> Скачать страницу в PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

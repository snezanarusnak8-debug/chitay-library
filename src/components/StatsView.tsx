import React, {useMemo} from 'react';
import {ArrowRight, Award, BookCheck, Clock, Flame, Highlighter, Library, MessageSquareQuote} from 'lucide-react';
import {ACHIEVEMENTS_CATALOG} from '../constants/achievements';
import {useLibrary} from '../context/LibraryContext';

export const StatsView: React.FC = () => {
  const {
    books,
    annotations,
    quotes,
    readingSessions,
    achievementProgressMap,
    setNavSection,
  } = useLibrary();

  const stats = useMemo(() => {
    const finishedCount = books.filter((b) => b.status === 'finished').length;
    const totalPagesRead = books.reduce((sum, b) => sum + (b.currentPage + (b.status === 'finished' ? 1 : 0)), 0);
    const totalSeconds = books.reduce((sum, b) => sum + (b.readingSeconds || 0), 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);

    // Calculate streak
    const sessionDates = new Set(readingSessions.filter((s) => s.pagesRead > 0 || s.minutesRead > 0).map((s) => s.date));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
      if (sessionDates.has(d)) streak += 1;
      else if (i > 0) break;
    }

    // Genres & Authors
    const genreMap = new Map<string, number>();
    const authorMap = new Map<string, number>();
    for (const b of books) {
      genreMap.set(b.genre || 'Литература', (genreMap.get(b.genre || 'Литература') || 0) + 1);
      authorMap.set(b.author || 'Неизвестный', (authorMap.get(b.author || 'Неизвестный') || 0) + 1);
    }

    const topGenres = Array.from(genreMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topAuthors = Array.from(authorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const last14Days = Array.from({length: 14}).map((_, idx) => {
      const d = new Date(Date.now() - (13 - idx) * 86400000).toISOString().slice(0, 10);
      const found = readingSessions.find((s) => s.date === d);
      return {
        date: d,
        label: d.slice(8, 10) + '.' + d.slice(5, 7),
        pages: found?.pagesRead || 0,
        minutes: Math.round(found?.minutesRead || 0),
      };
    });

    return {
      finishedCount,
      totalPagesRead,
      totalHours,
      streak,
      topGenres,
      topAuthors,
      last14Days,
    };
  }, [books, readingSessions]);

  const maxPages = Math.max(5, ...stats.last14Days.map((d) => d.pages));

  const unlockedAchievementsCount = useMemo(
    () => ACHIEVEMENTS_CATALOG.filter((a) => achievementProgressMap[a.id]?.unlocked).length,
    [achievementProgressMap]
  );

  const previewAchievements = useMemo(
    () =>
      ACHIEVEMENTS_CATALOG.filter((a) => !a.hidden || achievementProgressMap[a.id]?.unlocked)
        .sort(
          (a, b) =>
            Number(Boolean(achievementProgressMap[b.id]?.unlocked)) -
            Number(Boolean(achievementProgressMap[a.id]?.unlocked))
        )
        .slice(0, 6),
    [achievementProgressMap]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Статистика чтения</h1>
        <p className="text-xs mt-1" style={{color: 'var(--site-text-muted)'}}>
          Ваша читательская активность, прогресс и литературные привычки
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          {icon: BookCheck, label: 'Прочитано книг', val: stats.finishedCount},
          {icon: Library, label: 'В библиотеке', val: books.length},
          {icon: Clock, label: 'Часов чтения', val: stats.totalHours},
          {icon: Flame, label: 'Серия (дней)', val: stats.streak},
          {icon: Highlighter, label: 'Аннотаций', val: annotations.length},
          {icon: MessageSquareQuote, label: 'Цитат', val: quotes.length},
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border p-4 space-y-2"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
              boxShadow: 'var(--site-shadow)',
            }}
          >
            <item.icon className="w-4 h-4 opacity-70" style={{color: 'var(--site-accent)'}} />
            <p className="font-mono-num text-2xl font-semibold">{item.val}</p>
            <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Activity Chart & Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div
          className="lg:col-span-7 rounded-2xl border p-5 sm:p-6 space-y-4"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Активность за 14 дней (страницы)</h2>
            <span className="font-mono-num text-xs" style={{color: 'var(--site-text-muted)'}}>
              Всего пролистано: {stats.totalPagesRead} стр.
            </span>
          </div>

          <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-4">
            {stats.last14Days.map((d) => {
              const pct = Math.max(6, Math.round((d.pages / maxPages) * 100));
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="font-mono-num text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.pages}
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: d.pages > 0 ? 'var(--site-accent)' : 'var(--site-surface-alt)',
                      opacity: d.pages > 0 ? 0.9 : 0.6,
                    }}
                    title={`${d.label}: ${d.pages} стр., ${d.minutes} мин.`}
                  />
                  <span className="font-mono-num text-[9px] opacity-60 hidden sm:block">
                    {d.label.slice(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
          >
            <h2 className="font-display text-xl font-semibold">Самые читаемые жанры</h2>
            <div className="space-y-2 text-xs">
              {stats.topGenres.map(([g, count]) => (
                <div key={g} className="flex items-center justify-between">
                  <span className="truncate">{g}</span>
                  <span className="font-mono-num opacity-70">{count} кн.</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
          >
            <h2 className="font-display text-xl font-semibold">Любимые авторы</h2>
            <div className="space-y-2 text-xs">
              {stats.topAuthors.map(([a, count]) => (
                <div key={a} className="flex items-center justify-between">
                  <span className="truncate">{a}</span>
                  <span className="font-mono-num opacity-70">{count} кн.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Summary */}
      <div
        className="rounded-2xl border p-5 sm:p-6 space-y-4"
        style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">Читательские достижения</h2>
            <p className="text-xs mt-0.5" style={{color: 'var(--site-text-muted)'}}>
              Открыто {unlockedAchievementsCount} из {ACHIEVEMENTS_CATALOG.length} личных достижений
            </p>
          </div>
          <button
            onClick={() => setNavSection('achievements')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
            style={{borderColor: 'var(--site-border)'}}
          >
            Все достижения <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {previewAchievements.map((ach) => {
            const prog = achievementProgressMap[ach.id];
            const unlocked = Boolean(prog?.unlocked);
            return (
              <div
                key={ach.id}
                className={`rounded-xl border p-4 flex items-start gap-3 ${
                  unlocked ? '' : 'opacity-60'
                }`}
                style={{
                  backgroundColor: 'var(--site-bg)',
                  borderColor: unlocked ? 'var(--site-accent)' : 'var(--site-border)',
                }}
              >
                <Award
                  className="w-5 h-5 shrink-0 mt-0.5"
                  style={{color: unlocked ? 'var(--site-accent)' : 'currentColor'}}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{ach.title}</p>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{color: 'var(--site-text-muted)'}}>
                    {ach.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

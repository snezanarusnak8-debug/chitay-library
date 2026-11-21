import React, {useMemo, useState} from 'react';
import {
  Award,
  BookCheck,
  Bookmark,
  BookOpen,
  BookPlus,
  Brain,
  Compass,
  Crown,
  Feather,
  FolderHeart,
  Gem,
  Highlighter,
  Layers,
  Library,
  Lock,
  Map as MapIcon,
  Moon,
  NotebookPen,
  Palette,
  Quote,
  RotateCcw,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import {ACHIEVEMENTS_CATALOG} from '../constants/achievements';
import {useLibrary} from '../context/LibraryContext';
import {AchievementCategory, AchievementRarity} from '../types/library';

const renderAchievementIcon = (icon: string, className = 'w-5 h-5') => {
  switch (icon) {
    case 'book_plus':
      return <BookPlus className={className} />;
    case 'book_open':
      return <BookOpen className={className} />;
    case 'book_check':
      return <BookCheck className={className} />;
    case 'quote':
      return <Quote className={className} />;
    case 'highlighter':
      return <Highlighter className={className} />;
    case 'bookmark':
      return <Bookmark className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'library':
      return <Library className={className} />;
    case 'folder':
      return <FolderHeart className={className} />;
    case 'feather':
      return <Feather className={className} />;
    case 'notebook':
      return <NotebookPen className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'brain':
      return <Brain className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'map':
      return <MapIcon className={className} />;
    case 'rotate':
      return <RotateCcw className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'palette':
      return <Palette className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'wand':
      return <Wand2 className={className} />;
    case 'gem':
      return <Gem className={className} />;
    default:
      return <Award className={className} />;
  }
};

const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Обычное',
  rare: 'Редкое',
  legendary: 'Легендарное',
};

const CATEGORY_LABELS: {id: 'all' | AchievementCategory; label: string}[] = [
  {id: 'all', label: 'Все'},
  {id: 'reading', label: 'Чтение'},
  {id: 'library', label: 'Библиотека'},
  {id: 'notes', label: 'Заметки и цитаты'},
  {id: 'scrapbook', label: 'Scrapbook'},
  {id: 'quiz', label: 'Память и тесты'},
  {id: 'secret', label: 'Скрытые'},
];

export const AchievementsView: React.FC = () => {
  const {unlockedAchievements, achievementProgressMap} = useLibrary();

  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked' | 'secret'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AchievementCategory>('all');

  const unlockedMap = useMemo(
    () => new Map(unlockedAchievements.map((u) => [u.id, u])),
    [unlockedAchievements]
  );

  const unlockedCount = useMemo(
    () => ACHIEVEMENTS_CATALOG.filter((a) => achievementProgressMap[a.id]?.unlocked).length,
    [achievementProgressMap]
  );

  const overallPct = Math.round((unlockedCount / Math.max(1, ACHIEVEMENTS_CATALOG.length)) * 100);

  const visibleList = useMemo(() => {
    return ACHIEVEMENTS_CATALOG.filter((def) => {
      const prog = achievementProgressMap[def.id];
      const unlocked = Boolean(prog?.unlocked);
      if (statusFilter === 'unlocked' && !unlocked) return false;
      if (statusFilter === 'locked' && unlocked) return false;
      if (statusFilter === 'secret' && !def.hidden && def.rarity !== 'legendary') return false;
      if (categoryFilter !== 'all' && def.category !== categoryFilter) return false;
      return true;
    }).sort((a, b) => {
      const ua = achievementProgressMap[a.id]?.unlocked ? 1 : 0;
      const ub = achievementProgressMap[b.id]?.unlocked ? 1 : 0;
      return ub - ua;
    });
  }, [achievementProgressMap, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header Summary Card */}
      <section
        className="rounded-3xl border p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{
          backgroundColor: 'var(--site-surface)',
          borderColor: 'var(--site-border)',
          boxShadow: 'var(--site-shadow)',
        }}
      >
        <div className="space-y-2 max-w-xl">
          <p className="text-xs font-medium tracking-wide" style={{color: 'var(--site-text-muted)'}}>
            Личная коллекция читателя · Без рейтингов и спешки
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold">
            Достижения библиотеки
          </h1>
          <p className="text-xs sm:text-sm leading-relaxed" style={{color: 'var(--site-text-muted)'}}>
            Тёплая хроника ваших читательских открытий: первые книги, любимые цитаты, уютные заметки на полях и внимательное чтение.
          </p>
        </div>

        <div
          className="rounded-2xl border p-4 sm:p-5 min-w-[230px] space-y-2.5"
          style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium" style={{color: 'var(--site-text-muted)'}}>
              Открыто достижений
            </span>
            <Award className="w-5 h-5" style={{color: 'var(--site-accent)'}} />
          </div>
          <p className="font-mono-num text-3xl font-semibold">
            {unlockedCount} <span className="text-base font-normal opacity-60">/ {ACHIEVEMENTS_CATALOG.length}</span>
          </p>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{backgroundColor: 'var(--site-surface-alt)'}}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{width: `${overallPct}%`, backgroundColor: 'var(--site-accent)'}}
            />
          </div>
          <p className="text-[11px] font-mono-num" style={{color: 'var(--site-text-muted)'}}>
            {overallPct}% пути пройдено
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', 'Все'],
              ['unlocked', `Открытые (${unlockedCount})`],
              ['locked', `В процессе (${ACHIEVEMENTS_CATALOG.length - unlockedCount})`],
              ['secret', 'Скрытые и редкие'],
            ] as const
          ).map(([id, label]) => {
            const active = statusFilter === id;
            return (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className="px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                style={{
                  borderColor: active ? 'var(--site-accent)' : 'var(--site-border)',
                  backgroundColor: active ? 'var(--site-accent)' : 'var(--site-surface)',
                  color: active ? 'var(--site-accent-contrast)' : 'var(--site-text)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_LABELS.map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className="px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                style={{
                  borderColor: active ? 'var(--site-accent)' : 'var(--site-border)',
                  backgroundColor: active ? 'var(--site-surface-alt)' : 'var(--site-surface)',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleList.map((def) => {
          const prog = achievementProgressMap[def.id] || {
            unlocked: false,
            current: 0,
            target: def.targetProgress,
          };
          const unlocked = prog.unlocked;
          const meta = unlockedMap.get(def.id);
          const pct = Math.min(100, Math.round((prog.current / Math.max(1, prog.target)) * 100));
          const isHiddenLocked = def.hidden && !unlocked;

          return (
            <article
              key={def.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all ${
                unlocked ? '' : 'opacity-80'
              }`}
              style={{
                backgroundColor: 'var(--site-surface)',
                borderColor: unlocked ? 'var(--site-accent)' : 'var(--site-border)',
                boxShadow: unlocked ? 'var(--site-shadow)' : undefined,
              }}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: unlocked ? 'var(--site-surface-alt)' : 'var(--site-bg)',
                    borderColor: unlocked ? 'var(--site-accent)' : 'var(--site-border)',
                    color: unlocked ? 'var(--site-accent)' : 'var(--site-text-muted)',
                  }}
                >
                  {isHiddenLocked ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    renderAchievementIcon(def.icon, 'w-5 h-5')
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-medium" style={{color: 'var(--site-text-muted)'}}>
                    {RARITY_LABELS[def.rarity]}
                    {def.hidden ? ' · Скрытое' : ''}
                    {unlocked ? ' · Получено' : ''}
                  </p>
                  <h2 className="font-display text-xl font-semibold leading-snug">
                    {isHiddenLocked ? 'Тайное достижение' : def.title}
                  </h2>
                  <p className="text-xs leading-relaxed" style={{color: 'var(--site-text-muted)'}}>
                    {isHiddenLocked ? def.hiddenDescription || 'Откроется само в процессе чтения.' : def.description}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t" style={{borderColor: 'var(--site-border)'}}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono-num" style={{color: 'var(--site-text-muted)'}}>
                    Прогресс: {prog.current} / {prog.target}
                  </span>
                  {unlocked && meta ? (
                    <span className="font-mono-num" style={{color: 'var(--site-accent)'}}>
                      {new Date(meta.unlockedAt).toLocaleDateString('ru-RU')}
                    </span>
                  ) : (
                    <span className="font-mono-num" style={{color: 'var(--site-text-muted)'}}>
                      {pct}%
                    </span>
                  )}
                </div>
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{backgroundColor: 'var(--site-surface-alt)'}}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: unlocked ? 'var(--site-accent)' : 'var(--site-text-muted)',
                      opacity: unlocked ? 1 : 0.45,
                    }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

import React, {useCallback, useEffect, useState} from 'react';
import {
  Award,
  BarChart3,
  BookCheck,
  BookMarked,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderHeart,
  Highlighter,
  Home,
  Library,
  Loader2,
  LogOut,
  Menu,
  MessageSquareQuote,
  NotebookPen,
  Palette,
  Search,
  Settings,
  Type,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import {AchievementsView} from './components/AchievementsView';
import {AddBookButton} from './components/AddBookButton';
import {AnnotationsView} from './components/AnnotationsView';
import {AuthView} from './components/AuthView';
import {BookmarksView} from './components/BookmarksView';
import {BookReader} from './components/BookReader';
import {BookUploadModal} from './components/BookUploadModal';
import {BrandLogo} from './components/BrandLogo';
import {ColorsView} from './components/ColorsView';
import {FontsView} from './components/FontsView';
import {GlobalSearchModal} from './components/GlobalSearchModal';
import {JournalView} from './components/JournalView';
import {LibraryView} from './components/LibraryView';
import {QuizView} from './components/QuizView';
import {QuotesView} from './components/QuotesView';
import {SettingsView} from './components/SettingsView';
import {StatsView} from './components/StatsView';
import {TimelineView} from './components/TimelineView';
import {LibraryProvider, useLibrary} from './context/LibraryContext';
import {useOnlineStatus} from './hooks/usePWA';
import {NavSection} from './types/library';

const NAV_ITEMS: {id: NavSection; label: string; icon: React.FC<{className?: string}>}[] = [
  {id: 'home', label: 'Главная', icon: Home},
  {id: 'library', label: 'Моя библиотека', icon: Library},
  {id: 'reading', label: 'Сейчас читаю', icon: BookOpen},
  {id: 'planned', label: 'Хочу прочитать', icon: Bookmark},
  {id: 'finished', label: 'Прочитано', icon: BookCheck},
  {id: 'collections', label: 'Коллекции', icon: FolderHeart},
  {id: 'bookmarks', label: 'Умные закладки', icon: BookmarkCheck},
  {id: 'annotations', label: 'Мои аннотации', icon: Highlighter},
  {id: 'quotes', label: 'Мои цитаты', icon: MessageSquareQuote},
  {id: 'journal', label: 'Книжный дневник', icon: NotebookPen},
  {id: 'quiz', label: 'Что я помню?', icon: Brain},
  {id: 'timeline', label: 'Таймлайн книги', icon: Clock},
  {id: 'achievements', label: 'Достижения', icon: Award},
  {id: 'colors', label: 'Мои цвета', icon: Palette},
  {id: 'fonts', label: 'Мои шрифты', icon: Type},
  {id: 'stats', label: 'Статистика', icon: BarChart3},
  {id: 'settings', label: 'Настройки', icon: Settings},
];

const Shell: React.FC = () => {
  const {
    authReady,
    account,
    logout,
    ready,
    saveStatus,
    navSection,
    setNavSection,
    readerTarget,
    closeReader,
    settings,
    newlyUnlockedAchievement,
    dismissAchievementBanner,
    toastMessage,
  } = useLibrary();

  const isOnline = useOnlineStatus();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [initialUploadFiles, setInitialUploadFiles] = useState<File[] | undefined>(undefined);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  const openUploadWithFiles = useCallback((files?: File[]) => {
    setInitialUploadFiles(files && files.length > 0 ? files : undefined);
    setShowUploadModal(true);
  }, []);

  const closeUploadModal = useCallback(() => {
    setShowUploadModal(false);
    setInitialUploadFiles(undefined);
  }, []);

  // Global search keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    if (!account) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowGlobalSearch((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [account]);

  if (!authReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{backgroundColor: 'var(--site-bg)', color: 'var(--site-text)'}}
      >
        <div className="text-center space-y-3">
          <BookMarked className="w-8 h-8 mx-auto opacity-70" />
          <p className="font-display text-2xl font-semibold tracking-tight">chitay…</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <>
        <AuthView />
        {toastMessage && (
          <div
            className="fixed bottom-5 right-4 z-50 rounded-xl border px-4 py-2.5 text-xs font-medium shadow-xl"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-accent)',
              color: 'var(--site-text)',
            }}
          >
            {toastMessage}
          </div>
        )}
      </>
    );
  }

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{backgroundColor: 'var(--site-bg)', color: 'var(--site-text)'}}
      >
        <div className="text-center space-y-3">
          <BookMarked className="w-8 h-8 mx-auto opacity-70" />
          <p className="font-display text-2xl font-semibold">
            Открываем библиотеку {account.nickname}…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{backgroundColor: 'var(--site-bg)', color: 'var(--site-text)'}}
    >
      {/* Desktop & Tablet Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r sticky top-0 h-screen transition-all duration-200 z-20 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
        style={{
          backgroundColor: 'var(--site-surface)',
          borderColor: 'var(--site-border)',
        }}
      >
        <div
          className="h-16 px-4 flex items-center justify-between border-b"
          style={{borderColor: 'var(--site-border)'}}
        >
          <BrandLogo
            compact={sidebarCollapsed}
            size="md"
            onClick={() => setNavSection('home')}
          />
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
            title={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Search & Add CTA */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            title="Быстрый поиск (Ctrl+K)"
          >
            <Search className="w-4 h-4 shrink-0 opacity-65" />
            {!sidebarCollapsed && <span className="truncate opacity-75">Поиск (Ctrl+K)</span>}
          </button>

          <AddBookButton
            variant="sidebar"
            collapsed={sidebarCollapsed}
            onPickFiles={(files) => openUploadWithFiles(files)}
            onOpenDropModal={() => openUploadWithFiles()}
          />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = navSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNavSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  active ? 'shadow-xs' : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={
                  active
                    ? {backgroundColor: 'var(--site-surface-alt)', color: 'var(--site-text)'}
                    : undefined
                }
                title={item.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Account Info, Auto-save Status & Logout */}
        <div
          className="px-3 py-3 border-t space-y-2"
          style={{borderColor: 'var(--site-border)'}}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-1 text-[11px]" style={{color: 'var(--site-text-muted)'}}>
              <span className="inline-flex items-center gap-1.5 font-medium truncate" style={{color: 'var(--site-text)'}}>
                <User className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">{account.nickname}</span>
              </span>
              <span className="inline-flex items-center gap-1 shrink-0">
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Сохранение…</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <span className="text-rose-600">Ошибка</span>
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Сохранено</span>
                  </>
                )}
              </span>
            </div>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{borderColor: 'var(--site-border)'}}
            title="Выйти из аккаунта"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!sidebarCollapsed && <span className="whitespace-nowrap">Выйти из аккаунта</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Compact Top Bar */}
      <header
        className="md:hidden sticky top-0 z-30 h-14 px-4 border-b flex items-center justify-between backdrop-blur-md"
        style={{
          backgroundColor: 'var(--site-surface)',
          borderColor: 'var(--site-border)',
        }}
      >
        <BrandLogo size="sm" onClick={() => setNavSection('home')} />

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl"
            aria-label="Поиск"
          >
            <Search className="w-5 h-5" />
          </button>
          <AddBookButton
            variant="mobile-icon"
            onPickFiles={(files) => openUploadWithFiles(files)}
            onOpenDropModal={() => openUploadWithFiles()}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 pb-20 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          {(navSection === 'home' ||
            navSection === 'library' ||
            navSection === 'reading' ||
            navSection === 'planned' ||
            navSection === 'finished' ||
            navSection === 'collections') && (
            <LibraryView
              mode={navSection}
              onOpenUpload={(files) => openUploadWithFiles(files)}
            />
          )}
          {navSection === 'bookmarks' && <BookmarksView />}
          {navSection === 'annotations' && <AnnotationsView />}
          {navSection === 'quotes' && <QuotesView />}
          {navSection === 'journal' && <JournalView />}
          {navSection === 'quiz' && <QuizView />}
          {navSection === 'timeline' && <TimelineView />}
          {navSection === 'achievements' && <AchievementsView />}
          {navSection === 'colors' && <ColorsView />}
          {navSection === 'fonts' && <FontsView />}
          {navSection === 'stats' && <StatsView />}
          {navSection === 'settings' && <SettingsView />}
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md grid grid-cols-5 h-14 pb-safe"
        style={{
          backgroundColor: 'var(--site-surface)',
          borderColor: 'var(--site-border)',
        }}
      >
        {(
          [
            ['home', 'Главная', Home],
            ['library', 'Полки', Library],
            ['annotations', 'Заметки', Highlighter],
            ['quotes', 'Цитаты', MessageSquareQuote],
          ] as const
        ).map(([id, label, Icon]) => {
          const active = navSection === id;
          return (
            <button
              key={id}
              onClick={() => setNavSection(id)}
              className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium"
              style={{color: active ? 'var(--site-accent)' : 'var(--site-text-muted)'}}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium"
          style={{color: 'var(--site-text-muted)'}}
        >
          <Menu className="w-5 h-5" />
          <span>Разделы</span>
        </button>
      </nav>

      {/* Mobile More Sections Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-3xl border-t p-5 pb-8 space-y-4 max-h-[82vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
            }}
          >
            <div className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/20 mx-auto" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold">Разделы библиотеки</h2>
                <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{color: 'var(--site-text-muted)'}}>
                  <User className="w-3.5 h-3.5" />
                  {account.nickname}
                </p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = navSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setNavSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium text-left"
                    style={{
                      borderColor: active ? 'var(--site-accent)' : 'var(--site-border)',
                      backgroundColor: active ? 'var(--site-surface-alt)' : 'var(--site-bg)',
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-medium"
              style={{borderColor: 'var(--site-border)'}}
            >
              <LogOut className="w-4 h-4" />
              Выйти из аккаунта
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Book Reader Overlay */}
      {readerTarget && (
        <BookReader
          bookId={readerTarget.bookId}
          initialPageIndex={readerTarget.pageIndex}
          highlightAnnotationId={readerTarget.highlightAnnotationId}
          onClose={closeReader}
        />
      )}

      {/* Modals */}
      {showUploadModal && (
        <BookUploadModal
          initialFiles={initialUploadFiles}
          onClose={closeUploadModal}
        />
      )}
      {showGlobalSearch && <GlobalSearchModal onClose={() => setShowGlobalSearch(false)} />}

      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-700 text-white px-3.5 py-2 text-xs font-medium shadow-lg">
          <WifiOff className="w-4 h-4" />
          Офлайн-режим — библиотека работает локально
        </div>
      )}

      {/* Achievement Unlocked Gentle Banner */}
      {newlyUnlockedAchievement && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm rounded-2xl border p-4 shadow-2xl flex items-start gap-3 ${
            settings.animationLevel !== 'off' ? 'transition-all duration-300' : ''
          }`}
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-accent)',
            color: 'var(--site-text)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--site-surface-alt)',
              color: 'var(--site-accent)',
            }}
          >
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium" style={{color: 'var(--site-accent)'}}>
              Новое достижение
            </p>
            <p className="font-display text-lg font-semibold leading-snug">
              {newlyUnlockedAchievement.title}
            </p>
            <p className="text-xs mt-0.5 line-clamp-2" style={{color: 'var(--site-text-muted)'}}>
              {newlyUnlockedAchievement.description}
            </p>
            <button
              onClick={() => {
                setNavSection('achievements');
                dismissAchievementBanner();
              }}
              className="text-xs font-medium underline mt-1.5"
              style={{color: 'var(--site-accent)'}}
            >
              Открыть коллекцию
            </button>
          </div>
          <button
            onClick={dismissAchievementBanner}
            className="p-1 rounded-lg opacity-65 hover:opacity-100"
            aria-label="Скрыть уведомление"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-16 md:bottom-5 right-4 z-50 rounded-xl border px-4 py-2.5 text-xs font-medium shadow-xl"
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-accent)',
            color: 'var(--site-text)',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <LibraryProvider>
      <Shell />
    </LibraryProvider>
  );
}

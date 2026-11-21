import React, {useRef, useState} from 'react';
import {Download, LogOut, MonitorSmartphone, Palette, Plus, ShieldCheck, Trash2, Upload, User} from 'lucide-react';
import {SITE_THEMES} from '../constants/themes';
import {useLibrary} from '../context/LibraryContext';
import {exportFullLibraryZip, importFullLibraryZip} from '../db/storage';
import {usePWAInstall} from '../hooks/usePWA';
import {AnimationLevel, ShelfStyleId, SiteThemeId} from '../types/library';
import {parseColorString, rgbaToCss, rgbaToHex} from '../utils/colorUtils';
import {ColorSwatchButton} from './ColorSwatchButton';
import {ThemeBuilderModal} from './ThemeBuilderModal';

export const SettingsView: React.FC = () => {
  const {
    account,
    logout,
    books,
    settings,
    annotationCategories,
    userColors,
    setNavSection,
    updateSettings,
    saveAnnotationCategory,
    deleteAnnotationCategory,
    saveUserColor,
    reloadAll,
    showToast,
  } = useLibrary();

  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const [catLabel, setCatLabel] = useState('');
  const [catEmoji, setCatEmoji] = useState('🌸');
  const [catColor, setCatColor] = useState('#E8C5CC');
  const [customHlColor, setCustomHlColor] = useState('#F8D8B4');

  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleExportZip = async () => {
    try {
      const blob = await exportFullLibraryZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chitay-library-${new Date().toISOString().slice(0, 10)}.chitay.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Полная резервная копия библиотеки скачана');
    } catch {
      showToast('Не удалось сформировать резервную копию');
    }
  };

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const {booksCount} = await importFullLibraryZip(file);
      await reloadAll();
      showToast(`Восстановлено из резервной копии (книг: ${booksCount})`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка импорта резервной копии');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catLabel.trim()) return;
    await saveAnnotationCategory({
      id: `cat_${Date.now()}`,
      label: catLabel.trim(),
      emoji: catEmoji || '📌',
      color: catColor,
      isCustom: true,
    });
    setCatLabel('');
    showToast('Категория аннотации добавлена');
  };

  const handleAddHighlightColor = async () => {
    const rgba = parseColorString(customHlColor);
    const hex = rgbaToHex(rgba);
    const now = Date.now();
    await saveUserColor({
      id: `ucol_${now}_${Math.random().toString(36).slice(2, 6)}`,
      name: `Мой оттенок (${hex})`,
      hex,
      alpha: rgba.a,
      cssValue: rgbaToCss(rgba),
      paletteId: 'pal_custom',
      createdAt: now,
      updatedAt: now,
    });
    showToast('Цвет сохранён в раздел «Мои цвета»');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-semibold">Персонализация и данные</h1>
        <p className="text-xs mt-1" style={{color: 'var(--site-text-muted)'}}>
          Аккаунт, темы интерфейса, оформление полок, анимации, палитры аннотаций и перенос данных между устройствами
        </p>
      </div>

      {/* Account & Session Card */}
      {account && (
        <section
          className="rounded-2xl border p-5 sm:p-6 space-y-4"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'var(--site-surface-alt)',
                  color: 'var(--site-accent)',
                }}
              >
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold leading-tight">
                  {account.nickname}
                </h2>
                <p className="text-xs mt-0.5" style={{color: 'var(--site-text-muted)'}}>
                  Личная библиотека · Книг на полках: {books.length} · Создан{' '}
                  {new Date(account.createdAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{borderColor: 'var(--site-border)'}}
            >
              <LogOut className="w-4 h-4" />
              Выйти из аккаунта
            </button>
          </div>

          <div
            className="rounded-xl border p-3.5 flex items-start gap-2.5 text-xs leading-relaxed"
            style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)', color: 'var(--site-text-muted)'}}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
            <p>
              Данные этого аккаунта полностью изолированы от других пользователей на этом устройстве. При выходе из аккаунта все книги, обложки, заметки, прогресс и оформление сохраняются — достаточно снова войти по вашему никнейму и паролю. Поскольку библиотека работает локально в браузере без удалённого сервера, обязательно сохраняйте резервную копию `.chitay.zip` перед очисткой данных браузера или при смене устройства.
            </p>
          </div>
        </section>
      )}

      {/* Site Themes */}
      <section
        className="rounded-2xl border p-5 sm:p-6 space-y-4"
        style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
      >
        <h2 className="font-display text-2xl font-semibold">Тема оформления сайта</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SITE_THEMES.map((t) => {
            const active = settings.siteTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => updateSettings((prev) => ({...prev, siteTheme: t.id as SiteThemeId}))}
                className={`text-left rounded-2xl border p-4 transition-all ${
                  active ? 'ring-2 ring-[var(--site-accent)]' : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: t.vars.bg,
                  color: t.vars.text,
                  borderColor: t.vars.border,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-lg font-semibold">{t.name}</span>
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{backgroundColor: t.vars.accent}}
                  />
                </div>
                <p className="text-xs opacity-75">{t.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Shelf Style & Animation Level */}
      <section
        className="rounded-2xl border p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
        style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
      >
        <div className="space-y-3">
          <h3 className="font-display text-xl font-semibold">Оформление книжных полок</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(
              [
                ['oak', 'Тёплый дуб'],
                ['vintage', 'Винтажный шкаф'],
                ['minimal', 'Минимализм'],
                ['gallery', 'Воздушная витрина'],
              ] as [ShelfStyleId, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => updateSettings((prev) => ({...prev, shelfStyle: id}))}
                className={`p-3 rounded-xl border font-medium text-left ${
                  settings.shelfStyle === id ? 'ring-2 ring-[var(--site-accent)]' : ''
                }`}
                style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-bg)'}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-xl font-semibold">Интенсивность анимаций</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(
              [
                ['full', 'Полные анимации'],
                ['simplified', 'Упрощённые'],
                ['minimal', 'Минимальные'],
                ['off', 'Отключить анимации'],
              ] as [AnimationLevel, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => updateSettings((prev) => ({...prev, animationLevel: id}))}
                className={`p-3 rounded-xl border font-medium text-left ${
                  settings.animationLevel === id ? 'ring-2 ring-[var(--site-accent)]' : ''
                }`}
                style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-bg)'}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Page Theme Constructor Shortcut + Highlight Palette + Annotation Categories */}
      <section
        className="rounded-2xl border p-5 sm:p-6 space-y-5"
        style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-semibold">Темы страниц и палитры аннотаций</h3>
            <p className="text-xs opacity-75">
              Создавайте собственные темы страниц книг, категории и оттенки маркера
            </p>
          </div>
          <button
            onClick={() => setShowThemeModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
            style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
          >
            <Palette className="w-4 h-4" />
            Открыть конструктор тем
          </button>
        </div>

        {/* Custom Color System Shortcut */}
        <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3" style={{borderColor: 'var(--site-border)'}}>
          <div>
            <p className="text-xs font-semibold">Пользовательская палитра («Мои цвета»)</p>
            <p className="text-[11px]" style={{color: 'var(--site-text-muted)'}}>
              Сохранённых цветов: <span className="font-mono-num">{userColors.length}</span> · Доступны в выделениях, заметках, закладках и цитатах
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ColorSwatchButton
              compact
              value={customHlColor}
              onChange={(c) => setCustomHlColor(c)}
              label="Быстрый цвет"
              title="Выбрать произвольный оттенок"
            />
            <button
              onClick={handleAddHighlightColor}
              className="px-3 py-2 rounded-xl border text-xs font-medium whitespace-nowrap hover:bg-black/5 dark:hover:bg-white/5"
              style={{borderColor: 'var(--site-border)'}}
            >
              Сохранить в палитру
            </button>
            <button
              onClick={() => setNavSection('colors')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
              style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
            >
              <Palette className="w-3.5 h-3.5" />
              Открыть «Мои цвета»
            </button>
          </div>
        </div>

        {/* Custom Annotation Categories */}
        <div className="pt-3 border-t space-y-3" style={{borderColor: 'var(--site-border)'}}>
          <p className="text-xs font-semibold">Категории аннотаций</p>
          <form onSubmit={handleAddCategory} className="flex flex-wrap items-center gap-2">
            <input
              value={catEmoji}
              onChange={(e) => setCatEmoji(e.target.value)}
              className="w-14 rounded-xl border px-2 py-2 text-center text-sm"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
              maxLength={4}
            />
            <input
              value={catLabel}
              onChange={(e) => setCatLabel(e.target.value)}
              placeholder="Новая категория (напр. Мотивация)"
              className="flex-1 min-w-[180px] rounded-xl border px-3 py-2 text-xs outline-none"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            />
            <ColorSwatchButton
              compact
              value={catColor}
              onChange={(c) => setCatColor(c)}
              label="Цвет категории"
              title="Выбрать цвет категории"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-medium"
              style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
            >
              <Plus className="w-3.5 h-3.5" /> Добавить
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {annotationCategories.map((c) => (
              <div
                key={c.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs"
                style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-bg)'}}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
                {c.isCustom && (
                  <button
                    onClick={() => deleteAnnotationCategory(c.id)}
                    className="ml-1 text-rose-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Backup, Restore & Offline App Install */}
      <section
        className="rounded-2xl border p-5 sm:p-6 space-y-4"
        style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
      >
        <h2 className="font-display text-2xl font-semibold">
          Резервное копирование, перенос и офлайн-приложение
        </h2>
        <p className="text-xs leading-relaxed" style={{color: 'var(--site-text-muted)'}}>
          Вся библиотека, загруженные файлы книг, шрифты, аннотации, цитаты, дневники и скрапбук-оформление автоматически сохраняются в локальной базе браузера (IndexedDB) и доступны офлайн. Вы можете скачать единый архив `.chitay.zip` для переноса на другое устройство.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportZip}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium"
            style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
          >
            <Download className="w-4 h-4" />
            Экспортировать всю библиотеку (.zip)
          </button>

          <input
            ref={backupInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleImportZip}
          />
          <button
            onClick={() => backupInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium"
            style={{borderColor: 'var(--site-border)'}}
          >
            <Upload className="w-4 h-4" />
            Восстановить из архива
          </button>

          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium"
              style={{borderColor: 'var(--site-accent)'}}
            >
              <MonitorSmartphone className="w-4 h-4" />
              Установить как приложение (PWA)
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium"
              style={{borderColor: 'var(--site-border)'}}
            >
              <MonitorSmartphone className="w-4 h-4" />
              Установить на iPhone / iPad
            </button>
          )}
        </div>
      </section>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border p-6 space-y-3"
            style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
          >
            <h3 className="font-display text-xl font-semibold">Установка на iPhone / iPad</h3>
            <p className="text-xs leading-relaxed">
              1. Нажмите кнопку <strong>Поделиться</strong> на нижней панели Safari.<br />
              2. Выберите пункт <strong>На экран «Домой»</strong>.<br />
              3. Библиотека будет работать как отдельное офлайн-приложение.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 rounded-xl text-xs font-medium"
              style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {showThemeModal && (
        <ThemeBuilderModal
          currentThemeId={settings.reader.defaultPageThemeId}
          onApplyToBook={(tid) =>
            updateSettings((prev) => ({
              ...prev,
              reader: {...prev.reader, defaultPageThemeId: tid},
            }))
          }
          onApplyGlobal={(tid) =>
            updateSettings((prev) => ({
              ...prev,
              reader: {...prev.reader, defaultPageThemeId: tid},
            }))
          }
          onClose={() => setShowThemeModal(false)}
        />
      )}
    </div>
  );
};

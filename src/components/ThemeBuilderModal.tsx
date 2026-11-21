import React, {useRef, useState} from 'react';
import {Check, Copy, ImagePlus, Palette, Plus, Trash2, X} from 'lucide-react';
import {BUILT_IN_PAGE_THEMES} from '../constants/themes';
import {useLibrary} from '../context/LibraryContext';
import {PageTheme} from '../types/library';
import {ColorSwatchButton} from './ColorSwatchButton';

interface ThemeBuilderModalProps {
  currentThemeId: string;
  onApplyToBook: (themeId: string) => void;
  onApplyGlobal: (themeId: string) => void;
  onClose: () => void;
}

export function getTextureClass(texture: PageTheme['texture']): string {
  switch (texture) {
    case 'grain':
      return 'texture-grain';
    case 'aged':
      return 'texture-aged';
    case 'linen':
      return 'texture-linen';
    case 'dots':
      return 'texture-dots';
    case 'grid':
      return 'texture-grid';
    case 'coffee':
      return 'texture-coffee';
    case 'stars':
      return 'texture-stars';
    case 'newsprint':
      return 'texture-newsprint';
    default:
      return '';
  }
}

export const ThemeBuilderModal: React.FC<ThemeBuilderModalProps> = ({
  currentThemeId,
  onApplyToBook,
  onApplyGlobal,
  onClose,
}) => {
  const {allPageThemes, saveCustomTheme, deleteCustomTheme, showToast} = useLibrary();
  const [tab, setTab] = useState<'gallery' | 'editor'>('gallery');

  const activeTheme =
    allPageThemes.find((t) => t.id === currentThemeId) || BUILT_IN_PAGE_THEMES[0];

  const [draft, setDraft] = useState<PageTheme>(() => ({
    ...activeTheme,
    id: activeTheme.isBuiltIn ? `custom_theme_${Date.now()}` : activeTheme.id,
    name: activeTheme.isBuiltIn ? `${activeTheme.name} (Копия)` : activeTheme.name,
    isBuiltIn: false,
  }));

  const bgImgInputRef = useRef<HTMLInputElement>(null);

  const startDuplicate = (theme: PageTheme) => {
    setDraft({
      ...theme,
      id: `custom_theme_${Date.now()}`,
      name: `${theme.name} — Своя`,
      isBuiltIn: false,
    });
    setTab('editor');
  };

  const startEditCustom = (theme: PageTheme) => {
    setDraft({...theme});
    setTab('editor');
  };

  const handleBgImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({...prev, customBgImage: String(reader.result)}));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTheme = async () => {
    const clean: PageTheme = {
      ...draft,
      id: draft.id || `custom_theme_${Date.now()}`,
      name: draft.name.trim() || 'Моя тема',
      isBuiltIn: false,
    };
    await saveCustomTheme(clean);
    onApplyToBook(clean.id);
    showToast(`Тема «${clean.name}» сохранена и применена`);
    setTab('gallery');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--site-surface)',
          borderColor: 'var(--site-border)',
          color: 'var(--site-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b"
          style={{borderColor: 'var(--site-border)'}}
        >
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5" style={{color: 'var(--site-accent)'}} />
            <h2 className="font-display text-xl sm:text-2xl font-semibold">
              Оформление страниц и конструктор тем
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center p-1 rounded-xl border"
              style={{
                backgroundColor: 'var(--site-bg)',
                borderColor: 'var(--site-border)',
              }}
            >
              <button
                onClick={() => setTab('gallery')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'gallery' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={
                  tab === 'gallery'
                    ? {backgroundColor: 'var(--site-surface)', color: 'var(--site-text)'}
                    : undefined
                }
              >
                Коллекция тем ({allPageThemes.length})
              </button>
              <button
                onClick={() => setTab('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'editor' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={
                  tab === 'editor'
                    ? {backgroundColor: 'var(--site-surface)', color: 'var(--site-text)'}
                    : undefined
                }
              >
                Конструктор темы
              </button>
            </div>
            <button
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-black/5"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'gallery' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
                  Переключайте тему мгновенно без сброса страницы. Нажмите «Копия», чтобы доработать любую тему под себя.
                </p>
                <button
                  onClick={() => startDuplicate(activeTheme)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: 'var(--site-accent)',
                    color: 'var(--site-accent-contrast)',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Создать свою тему
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {allPageThemes.map((theme) => {
                  const isSelected = theme.id === currentThemeId;
                  return (
                    <div
                      key={theme.id}
                      className={`rounded-2xl border p-3.5 transition-all flex flex-col justify-between gap-3 ${
                        isSelected ? 'ring-2' : ''
                      }`}
                      style={{
                        borderColor: isSelected ? 'var(--site-accent)' : 'var(--site-border)',
                        backgroundColor: 'var(--site-bg)',
                        boxShadow: isSelected ? '0 0 0 1px var(--site-accent)' : undefined,
                      }}
                    >
                      <div
                        onClick={() => onApplyToBook(theme.id)}
                        className={`cursor-pointer rounded-xl p-4 relative overflow-hidden border ${getTextureClass(
                          theme.texture
                        )}`}
                        style={{
                          backgroundColor: theme.bgColor,
                          backgroundImage: theme.customBgImage
                            ? `url(${theme.customBgImage})`
                            : theme.bgGradient,
                          backgroundSize: theme.customBgImage ? 'cover' : undefined,
                          color: theme.textColor,
                          borderColor: theme.borderColor,
                          borderRadius: `${Math.min(16, theme.cornerRadius)}px`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="font-display text-base font-semibold"
                            style={{color: theme.headingColor}}
                          >
                            {theme.name}
                          </span>
                          {isSelected && (
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: 'var(--site-accent)',
                                color: 'var(--site-accent-contrast)',
                              }}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed opacity-85 line-clamp-2">
                          Шелест страниц, мягкий свет настольной лампы и тишина вечерней библиотеки.
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onApplyToBook(theme.id)}
                            className="px-2.5 py-1.5 rounded-lg font-medium border hover:opacity-80 whitespace-nowrap"
                            style={{borderColor: 'var(--site-border)'}}
                          >
                            К книге
                          </button>
                          <button
                            onClick={() => {
                              onApplyGlobal(theme.id);
                              showToast(`Тема «${theme.name}» выбрана по умолчанию`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg font-medium border hover:opacity-80 whitespace-nowrap"
                            style={{borderColor: 'var(--site-border)'}}
                          >
                            Для всех
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {theme.isBuiltIn ? (
                            <button
                              onClick={() => startDuplicate(theme)}
                              className="p-1.5 rounded-lg hover:bg-black/5"
                              title="Дублировать и настроить"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditCustom(theme)}
                                className="px-2 py-1 rounded-lg hover:bg-black/5 font-medium"
                              >
                                Ред.
                              </button>
                              <button
                                onClick={() => deleteCustomTheme(theme.id)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10"
                                title="Удалить тему"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-75">Название темы</label>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({...draft, name: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--site-bg)',
                      borderColor: 'var(--site-border)',
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] mb-1 opacity-75">Фон</span>
                    <ColorSwatchButton
                      className="w-full justify-start"
                      enableGradient={true}
                      value={draft.bgColor}
                      gradientValue={draft.bgGradient}
                      onChange={(c, g) => setDraft({...draft, bgColor: c, bgGradient: g})}
                      label="Фон"
                      title="Цвет или градиент фона страницы"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] mb-1 opacity-75">Текст</span>
                    <ColorSwatchButton
                      className="w-full justify-start"
                      value={draft.textColor}
                      onChange={(c) => setDraft({...draft, textColor: c})}
                      label="Текст"
                      title="Цвет основного текста"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] mb-1 opacity-75">Заголовки</span>
                    <ColorSwatchButton
                      className="w-full justify-start"
                      value={draft.headingColor}
                      onChange={(c) => setDraft({...draft, headingColor: c})}
                      label="Заголовки"
                      title="Цвет заголовков"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] mb-1 opacity-75">Выделение</span>
                    <ColorSwatchButton
                      className="w-full justify-start"
                      value={draft.highlightTint}
                      onChange={(c) => setDraft({...draft, highlightTint: c})}
                      label="Выделение"
                      title="Акцентный цвет выделения"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">Текстура бумаги</label>
                    <select
                      value={draft.texture}
                      onChange={(e) =>
                        setDraft({...draft, texture: e.target.value as PageTheme['texture']})
                      }
                      className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
                      style={{
                        backgroundColor: 'var(--site-bg)',
                        borderColor: 'var(--site-border)',
                      }}
                    >
                      <option value="none">Без текстуры</option>
                      <option value="grain">Зернистая бумага</option>
                      <option value="aged">Состаренный пергамент</option>
                      <option value="linen">Тканый лён</option>
                      <option value="dots">Точечная сетка</option>
                      <option value="grid">Клетка дневника</option>
                      <option value="coffee">Кофейные пятна</option>
                      <option value="stars">Звёздное небо</option>
                      <option value="newsprint">Газетная полоса</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">Рамка страницы</label>
                    <select
                      value={draft.borderStyle}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          borderStyle: e.target.value as PageTheme['borderStyle'],
                        })
                      }
                      className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
                      style={{
                        backgroundColor: 'var(--site-bg)',
                        borderColor: 'var(--site-border)',
                      }}
                    >
                      <option value="none">Без рамки</option>
                      <option value="hairline">Тонкая линия</option>
                      <option value="double">Двойная книжная</option>
                      <option value="ornate">Изящные уголки</option>
                      <option value="tape">Скрапбук-скотч</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">
                      Декор на полях
                    </label>
                    <select
                      value={draft.decorMotif}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          decorMotif: e.target.value as PageTheme['decorMotif'],
                        })
                      }
                      className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
                      style={{
                        backgroundColor: 'var(--site-bg)',
                        borderColor: 'var(--site-border)',
                      }}
                    >
                      <option value="none">Без декора</option>
                      <option value="botanical">Растительные элементы</option>
                      <option value="floral">Цветочные мотивы</option>
                      <option value="stars">Звёзды и луна</option>
                      <option value="vintage_stamp">Винтажный штамп</option>
                      <option value="gothic">Готические арки</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">
                      Скругление углов ({draft.cornerRadius}px)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={28}
                      value={draft.cornerRadius}
                      onChange={(e) => setDraft({...draft, cornerRadius: Number(e.target.value)})}
                      className="w-full mt-2 accent-[var(--site-accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 opacity-75">
                    Собственное фоновое изображение
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={bgImgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBgImage}
                    />
                    <button
                      type="button"
                      onClick={() => bgImgInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium"
                      style={{borderColor: 'var(--site-border)'}}
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      Загрузить фон
                    </button>
                    {draft.customBgImage && (
                      <button
                        type="button"
                        onClick={() => setDraft({...draft, customBgImage: undefined})}
                        className="px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-500/10"
                      >
                        Убрать фон
                      </button>
                    )}
                    <label className="ml-auto inline-flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.isDark}
                        onChange={(e) => setDraft({...draft, isDark: e.target.checked})}
                      />
                      Тёмная тема
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={handleSaveTheme}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium"
                    style={{
                      backgroundColor: 'var(--site-accent)',
                      color: 'var(--site-accent-contrast)',
                    }}
                  >
                    Сохранить и применить
                  </button>
                </div>
              </div>

              {/* Live Preview */}
              <div className="flex flex-col">
                <span className="text-xs font-medium mb-2 opacity-75">
                  Предпросмотр в реальном времени
                </span>
                <div
                  className={`flex-1 min-h-[300px] p-7 relative overflow-hidden border transition-all ${getTextureClass(
                    draft.texture
                  )}`}
                  style={{
                    backgroundColor: draft.bgColor,
                    backgroundImage: draft.customBgImage
                      ? `url(${draft.customBgImage})`
                      : draft.bgGradient,
                    backgroundSize: draft.customBgImage ? 'cover' : undefined,
                    color: draft.textColor,
                    borderColor: draft.borderColor || 'rgba(110,87,68,0.2)',
                    borderWidth: draft.borderStyle === 'double' ? '3px' : '1px',
                    borderStyle: draft.borderStyle === 'double' ? 'double' : 'solid',
                    borderRadius: `${draft.cornerRadius}px`,
                    boxShadow:
                      draft.shadowDepth === 'deep'
                        ? '0 20px 40px rgba(0,0,0,0.2)'
                        : draft.shadowDepth === 'soft'
                        ? '0 10px 26px rgba(0,0,0,0.09)'
                        : 'none',
                  }}
                >
                  {draft.decorMotif !== 'none' && (
                    <div className="absolute top-3 right-4 text-sm opacity-45 select-none">
                      {draft.decorMotif === 'botanical' && '🌿'}
                      {draft.decorMotif === 'floral' && '🌸'}
                      {draft.decorMotif === 'stars' && '✨ 🌙'}
                      {draft.decorMotif === 'vintage_stamp' && 'EX LIBRIS'}
                      {draft.decorMotif === 'gothic' && '⚜'}
                    </div>
                  )}
                  <h3
                    className="font-display text-2xl font-semibold mb-3"
                    style={{color: draft.headingColor}}
                  >
                    Глава первая
                  </h3>
                  <p className="font-serif-book text-sm leading-relaxed mb-3">
                    Бумага мягко хранит тепло утреннего света.{' '}
                    <mark
                      className="px-1 rounded"
                      style={{backgroundColor: draft.highlightTint, color: draft.textColor}}
                    >
                      Каждая подчёркнутая строка остаётся в памяти
                    </mark>{' '}
                    как маленький след читателя на полях истории.
                  </p>
                  <p className="font-serif-book text-sm leading-relaxed opacity-85">
                    Страницы сменяют друг друга плавно, оставляя пространство для мыслей, заметок и тихого созерцания.
                  </p>
                  <div
                    className="mt-8 pt-3 border-t text-xs flex justify-between opacity-70"
                    style={{
                      borderColor: draft.borderColor || 'rgba(110,87,68,0.15)',
                      color: draft.pageNumberColor,
                    }}
                  >
                    <span>{draft.name}</span>
                    <span className="font-mono-num">14 / 128</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

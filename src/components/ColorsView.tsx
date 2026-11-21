import React, {useMemo, useState} from 'react';
import {
  Check,
  Copy,
  Edit3,
  FolderPlus,
  Palette,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {UserColorItem} from '../types/library';
import {
  CHECKERBOARD_BG,
  copyTextSafe,
  getColorLuminance,
  parseColorString,
  rgbaToCss,
  rgbaToHex,
  rgbToHsl,
} from '../utils/colorUtils';
import {UnifiedColorPicker} from './UnifiedColorPicker';

type ColorSortMode = 'pinned' | 'newest' | 'name' | 'hue' | 'luminance';

export const ColorsView: React.FC = () => {
  const {
    userColors,
    userColorPalettes,
    recentColors,
    saveUserColor,
    deleteUserColor,
    togglePinUserColor,
    saveUserPalette,
    deleteUserPalette,
    recordRecentColor,
    showToast,
  } = useLibrary();

  const [activePalette, setActivePalette] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<ColorSortMode>('pinned');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Palette creation modal/inline
  const [showPaletteForm, setShowPaletteForm] = useState(false);
  const [newPaletteName, setNewPaletteName] = useState('');
  const [newPaletteDesc, setNewPaletteDesc] = useState('');

  // Color studio editor modal (Create / Edit)
  const [editingColor, setEditingColor] = useState<UserColorItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftCss, setDraftCss] = useState('#C8A2C8');
  const [draftGradient, setDraftGradient] = useState<string | undefined>(undefined);
  const [draftPaletteId, setDraftPaletteId] = useState('pal_custom');
  const [draftPinned, setDraftPinned] = useState(false);

  const openCreateStudio = (presetCss?: string) => {
    const startCss = presetCss || '#C8A2C8';
    setEditingColor(null);
    setIsCreating(true);
    setDraftName('');
    setDraftCss(startCss);
    setDraftGradient(undefined);
    setDraftPaletteId(
      activePalette !== 'all' && activePalette !== 'pinned' ? activePalette : 'pal_custom'
    );
    setDraftPinned(false);
  };

  const openEditStudio = (item: UserColorItem) => {
    setEditingColor(item);
    setIsCreating(true);
    setDraftName(item.name);
    setDraftCss(item.cssValue);
    setDraftGradient(item.gradientCss);
    setDraftPaletteId(item.paletteId);
    setDraftPinned(Boolean(item.pinned));
  };

  const handleSaveColorStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    const rgba = parseColorString(draftCss);
    const hex = rgbaToHex(rgba);
    const cssValue = rgbaToCss(rgba);
    const now = Date.now();
    const record: UserColorItem = {
      id: editingColor?.id || `uc_${now}_${Math.random().toString(36).slice(2, 6)}`,
      name: draftName.trim() || `Оттенок ${hex}`,
      hex,
      alpha: rgba.a,
      cssValue,
      gradientCss: draftGradient,
      paletteId: draftPaletteId || 'pal_custom',
      pinned: draftPinned,
      createdAt: editingColor?.createdAt || now,
      updatedAt: now,
    };
    await saveUserColor(record);
    recordRecentColor(cssValue);
    setIsCreating(false);
    setEditingColor(null);
    showToast(editingColor ? `Цвет «${record.name}» обновлён` : `Цвет «${record.name}» добавлен`);
  };

  const handleCreatePalette = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaletteName.trim()) return;
    const id = `pal_${Date.now()}`;
    await saveUserPalette({
      id,
      name: newPaletteName.trim(),
      description: newPaletteDesc.trim() || undefined,
      isBuiltIn: false,
      createdAt: Date.now(),
    });
    setNewPaletteName('');
    setNewPaletteDesc('');
    setShowPaletteForm(false);
    setActivePalette(id);
    showToast('Палитра создана');
  };

  const handleCopyColor = async (id: string, value: string) => {
    const ok = await copyTextSafe(value);
    if (ok) {
      setCopiedId(id);
      showToast(`Скопировано: ${value}`);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const filteredColors = useMemo(() => {
    let list = [...userColors];
    if (activePalette === 'pinned') {
      list = list.filter((c) => c.pinned);
    } else if (activePalette !== 'all') {
      list = list.filter((c) => c.paletteId === activePalette);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.hex.toLowerCase().includes(q) ||
          c.cssValue.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'pinned') {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return b.createdAt - a.createdAt;
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ru');
      if (sortBy === 'hue') {
        const ra = parseColorString(a.hex);
        const rb = parseColorString(b.hex);
        return rgbToHsl(ra.r, ra.g, ra.b).h - rgbToHsl(rb.r, rb.g, rb.b).h;
      }
      if (sortBy === 'luminance') {
        return getColorLuminance(b.hex) - getColorLuminance(a.hex);
      }
      return b.createdAt - a.createdAt;
    });
    return list;
  }, [userColors, activePalette, search, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Мои цвета</h1>
          <p className="text-xs mt-1" style={{color: 'var(--site-text-muted)'}}>
            Единая авторская палитра для выделений текста, заметок, закладок, цитат, скрапбука и тем чтения
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPaletteForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 hover:bg-black/5 dark:hover:bg-white/5"
            style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-surface)'}}
          >
            <FolderPlus className="w-4 h-4" />
            Новая палитра
          </button>
          <button
            onClick={() => openCreateStudio()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0"
            style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
          >
            <Plus className="w-4 h-4" />
            Создать цвет
          </button>
        </div>
      </div>

      {/* New Palette Inline Form */}
      {showPaletteForm && (
        <form
          onSubmit={handleCreatePalette}
          className="rounded-2xl border p-4 flex flex-wrap items-center gap-2.5"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <input
            value={newPaletteName}
            onChange={(e) => setNewPaletteName(e.target.value)}
            placeholder="Название палитры (напр. Autumn Ink)"
            className="flex-1 min-w-[180px] rounded-xl border px-3 py-2 text-xs outline-none"
            style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            required
          />
          <input
            value={newPaletteDesc}
            onChange={(e) => setNewPaletteDesc(e.target.value)}
            placeholder="Короткое описание (необязательно)"
            className="flex-1 min-w-[200px] rounded-xl border px-3 py-2 text-xs outline-none"
            style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
          />
          <button
            type="button"
            onClick={() => setShowPaletteForm(false)}
            className="px-3 py-2 rounded-xl border text-xs"
            style={{borderColor: 'var(--site-border)'}}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-medium"
            style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
          >
            Создать палитру
          </button>
        </form>
      )}

      {/* Recently Used Strip */}
      {recentColors.length > 0 && (
        <section
          className="rounded-2xl border p-4 space-y-2.5"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Недавно использованные цвета</span>
            <span className="text-[11px]" style={{color: 'var(--site-text-muted)'}}>
              Нажмите, чтобы скопировать, или «+» чтобы сохранить с названием
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {recentColors.map((rc, idx) => {
              const rgba = parseColorString(rc);
              const hex = rgbaToHex(rgba);
              return (
                <div
                  key={`${rc}_${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border pl-1.5 pr-2 py-1 text-[11px]"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                >
                  <button
                    type="button"
                    onClick={() => handleCopyColor(`recent_${idx}`, rc)}
                    className="inline-flex items-center gap-1.5"
                    title={`Скопировать ${rc}`}
                  >
                    <span
                      className="w-4 h-4 rounded-md border"
                      style={{background: rc, borderColor: 'rgba(0,0,0,0.18)'}}
                    />
                    <span className="font-mono-num">{hex}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openCreateStudio(rc)}
                    className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
                    title="Сохранить в палитру с именем"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Palette Filter Tabs + Search & Sort */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActivePalette('all')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              activePalette === 'all' ? 'shadow-xs' : 'opacity-75 hover:opacity-100'
            }`}
            style={{
              borderColor: activePalette === 'all' ? 'var(--site-accent)' : 'var(--site-border)',
              backgroundColor:
                activePalette === 'all' ? 'var(--site-accent)' : 'var(--site-surface)',
              color:
                activePalette === 'all' ? 'var(--site-accent-contrast)' : 'var(--site-text)',
            }}
          >
            Все ({userColors.length})
          </button>

          <button
            onClick={() => setActivePalette('pinned')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              activePalette === 'pinned' ? 'shadow-xs' : 'opacity-75 hover:opacity-100'
            }`}
            style={{
              borderColor: activePalette === 'pinned' ? 'var(--site-accent)' : 'var(--site-border)',
              backgroundColor:
                activePalette === 'pinned' ? 'var(--site-accent)' : 'var(--site-surface)',
              color:
                activePalette === 'pinned' ? 'var(--site-accent-contrast)' : 'var(--site-text)',
            }}
          >
            <Star className="w-3.5 h-3.5" />
            Избранные ({userColors.filter((c) => c.pinned).length})
          </button>

          {userColorPalettes.map((pal) => {
            const count = userColors.filter((c) => c.paletteId === pal.id).length;
            const active = activePalette === pal.id;
            return (
              <div
                key={pal.id}
                className="inline-flex items-center rounded-xl border overflow-hidden"
                style={{
                  borderColor: active ? 'var(--site-accent)' : 'var(--site-border)',
                  backgroundColor: active ? 'var(--site-accent)' : 'var(--site-surface)',
                  color: active ? 'var(--site-accent-contrast)' : 'var(--site-text)',
                }}
              >
                <button
                  onClick={() => setActivePalette(pal.id)}
                  className="px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                  title={pal.description || pal.name}
                >
                  {pal.name} ({count})
                </button>
                {!pal.isBuiltIn && (
                  <button
                    onClick={async () => {
                      await deleteUserPalette(pal.id);
                      if (activePalette === pal.id) setActivePalette('all');
                      showToast(`Палитра «${pal.name}» удалена`);
                    }}
                    className="pr-2 py-1.5 opacity-70 hover:opacity-100"
                    title="Удалить палитру"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
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
              placeholder="Поиск по названию цвета или HEX (например #C8A2C8)..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ColorSortMode)}
            className="rounded-xl border px-3 py-2 text-xs font-medium outline-none"
            style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
          >
            <option value="pinned">Сначала избранные</option>
            <option value="newest">Сначала новые</option>
            <option value="name">По названию</option>
            <option value="hue">По оттенку (спектр)</option>
            <option value="luminance">По яркости</option>
          </select>
        </div>
      </section>

      {/* Colors Grid */}
      {filteredColors.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center space-y-3"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <Palette className="w-8 h-8 mx-auto opacity-45" />
          <p className="font-display text-2xl font-semibold">В этой подборке пока нет цветов</p>
          <p className="text-xs" style={{color: 'var(--site-text-muted)'}}>
            Создайте любой оттенок, пастель, неон или градиент через Color Picker и дайте ему своё имя
          </p>
          <button
            onClick={() => openCreateStudio()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium"
            style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
          >
            <Plus className="w-4 h-4" /> Создать первый цвет
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredColors.map((item) => {
            const pal = userColorPalettes.find((p) => p.id === item.paletteId);
            const isCopied = copiedId === item.id;
            const copyTarget = item.gradientCss || (item.alpha < 0.995 ? item.cssValue : item.hex);
            return (
              <article
                key={item.id}
                className="rounded-2xl border overflow-hidden flex flex-col transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--site-surface)',
                  borderColor: 'var(--site-border)',
                  boxShadow: 'var(--site-shadow)',
                }}
              >
                {/* Swatch Header */}
                <div
                  className="h-24 relative border-b"
                  style={{borderColor: 'var(--site-border)', background: CHECKERBOARD_BG}}
                >
                  <div
                    className="absolute inset-0"
                    style={{background: item.gradientCss || item.cssValue}}
                  />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <button
                      onClick={() => togglePinUserColor(item.id)}
                      className="w-7 h-7 rounded-lg backdrop-blur-xs bg-white/85 dark:bg-black/60 text-stone-800 dark:text-stone-100 flex items-center justify-center shadow-xs hover:scale-105 transition-transform"
                      title={item.pinned ? 'Убрать из избранных' : 'Закрепить в избранных'}
                    >
                      <Pin
                        className={`w-3.5 h-3.5 ${item.pinned ? 'text-amber-600 fill-amber-500' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold leading-snug truncate">
                      {item.name}
                    </h3>
                    <div
                      className="mt-1 flex items-center justify-between gap-2 text-[11px]"
                      style={{color: 'var(--site-text-muted)'}}
                    >
                      <span className="font-mono-num">
                        {item.hex}
                        {item.alpha < 0.995 ? ` · ${Math.round(item.alpha * 100)}%` : ''}
                        {item.gradientCss ? ' · градиент' : ''}
                      </span>
                      <span className="truncate">{pal?.name || 'Custom'}</span>
                    </div>
                  </div>

                  <div
                    className="pt-2.5 border-t flex items-center justify-between gap-1 text-xs"
                    style={{borderColor: 'var(--site-border)'}}
                  >
                    <button
                      onClick={() => handleCopyColor(item.id, copyTarget)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
                      style={{borderColor: 'var(--site-border)'}}
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {isCopied ? 'Скопировано' : 'HEX'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditStudio(item)}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                        title="Изменить цвет"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          await deleteUserColor(item.id);
                          showToast(`Цвет «${item.name}» удалён`);
                        }}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10"
                        title="Удалить цвет"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Color Creation / Editing Studio Modal */}
      {isCreating && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsCreating(false)}
        >
          <form
            onSubmit={handleSaveColorStudio}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border p-5 sm:p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
              color: 'var(--site-text)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold">
                {editingColor ? 'Редактировать цвет' : 'Новый авторский цвет'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-medium">Название цвета</span>
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Например: Пыльная лаванда или Лунный чернильник"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                />
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block space-y-1">
                  <span className="font-medium">Палитра</span>
                  <select
                    value={draftPaletteId}
                    onChange={(e) => setDraftPaletteId(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
                    style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                  >
                    {userColorPalettes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftPinned}
                    onChange={(e) => setDraftPinned(e.target.checked)}
                    className="accent-[var(--site-accent)]"
                  />
                  <span>В избранных (★)</span>
                </label>
              </div>

              <UnifiedColorPicker
                value={draftCss}
                gradientValue={draftGradient}
                enableAlpha={true}
                enableGradient={true}
                showSavedStrip={false}
                showSaveToLibrary={false}
                onChange={(c, g) => {
                  setDraftCss(c);
                  setDraftGradient(g);
                }}
              />
            </div>

            <div
              className="flex justify-end gap-2 pt-3 border-t"
              style={{borderColor: 'var(--site-border)'}}
            >
              <button
                type="button"
                onClick={() => setIsCreating(false)}
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
                {editingColor ? 'Сохранить изменения' : 'Сохранить цвет'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

import React, {useRef, useState} from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Eye,
  EyeOff,
  FlipHorizontal2,
  ImagePlus,
  Layers,
  Lock,
  Paperclip,
  PenTool,
  Redo2,
  Sparkles,
  Sticker,
  StickyNote,
  Trash2,
  Undo2,
  Unlock,
} from 'lucide-react';
import {
  BUILT_IN_STICKERS,
  SCRAPBOOK_TEMPLATES,
  WASHI_TAPE_STYLES,
} from '../constants/themes';
import {useLibrary} from '../context/LibraryContext';
import {
  NoteVariant,
  PaperclipStyle,
  PhotoClipFrame,
  ScrapbookItem,
  ScrapbookNoteItem,
  ScrapbookPhotoItem,
  WashiPattern,
} from '../types/library';
import {DrawingBrushConfig} from './ScrapbookOverlay';
import {ColorSwatchButton} from './ColorSwatchButton';

interface ScrapbookInspectorProps {
  bookId: string;
  pageIndex: number;
  pageItems: ScrapbookItem[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onAddItems: (items: ScrapbookItem[]) => void;
  onUpdateItem: (item: ScrapbookItem, pushHistory?: boolean) => void;
  onDeleteItem: (id: string) => void;
  onApplyTemplate: (templateId: string) => void;
  drawingConfig: DrawingBrushConfig;
  setDrawingConfig: React.Dispatch<React.SetStateAction<DrawingBrushConfig>>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  lockAllMobile: boolean;
  setLockAllMobile: (v: boolean) => void;
}

export const ScrapbookInspector: React.FC<ScrapbookInspectorProps> = ({
  bookId,
  pageIndex,
  pageItems,
  selectedIds,
  onSelectIds,
  onAddItems,
  onUpdateItem,
  onDeleteItem,
  onApplyTemplate,
  drawingConfig,
  setDrawingConfig,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  lockAllMobile,
  setLockAllMobile,
}) => {
  const {scrapbookAssets, saveScrapbookAsset, deleteScrapbookAsset, showToast} = useLibrary();
  const [tab, setTab] = useState<'elements' | 'draw' | 'templates' | 'layers' | 'assets'>('elements');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const stickerUploadRef = useRef<HTMLInputElement>(null);

  const selectedItem =
    selectedIds.length === 1 ? pageItems.find((i) => i.id === selectedIds[0]) : undefined;

  const maxZ = pageItems.reduce((m, i) => Math.max(m, i.zIndex), 1);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newItems: ScrapbookPhotoItem[] = [];
    for (let idx = 0; idx < files.length; idx++) {
      const f = files[idx];
      const src = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      newItems.push({
        id: `sb_photo_${Date.now()}_${idx}`,
        bookId,
        pageIndex,
        type: 'photo',
        src,
        x: 14 + idx * 8,
        y: 16 + idx * 6,
        width: 34,
        height: 28,
        rotation: idx % 2 === 0 ? -3 : 3,
        zIndex: maxZ + idx + 1,
        opacity: 1,
        locked: false,
        hidden: false,
        clipFrame: 'clipped',
        paperclipStyle: 'gold',
        paperclipPosition: 'top_center',
        caption: '',
        flipX: false,
        borderRadius: 6,
        shadow: true,
        cropShape: 'rect',
        brightness: 100,
        contrast: 100,
        sepia: 0,
        blur: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    onAddItems(newItems);
    onSelectIds([newItems[0].id]);
    showToast('Фотография прикреплена скрепкой к странице');
  };

  const handleCustomStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(file);
    });
    await saveScrapbookAsset({
      id: `asset_${Date.now()}`,
      name: file.name.replace(/\.[^.]+$/, ''),
      category: 'sticker',
      src,
      favorite: false,
      createdAt: Date.now(),
    });
    onAddItems([
      {
        id: `sb_st_${Date.now()}`,
        bookId,
        pageIndex,
        type: 'sticker',
        stickerId: 'custom',
        label: file.name,
        customImageSrc: src,
        x: 35,
        y: 30,
        width: 18,
        height: 18,
        rotation: 0,
        zIndex: maxZ + 1,
        opacity: 1,
        locked: false,
        hidden: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    showToast('Стикер добавлен на страницу и в ваши материалы');
  };

  const addNote = (variant: NoteVariant, bgColor: string, textColor: string, fontFamily: string) => {
    const item: ScrapbookNoteItem = {
      id: `sb_note_${Date.now()}`,
      bookId,
      pageIndex,
      type: variant === 'torn_paper' ? 'paper' : 'note',
      x: 22,
      y: 24,
      width: 36,
      height: 18,
      rotation: -1.5,
      zIndex: maxZ + 1,
      opacity: 0.96,
      locked: false,
      hidden: false,
      text: 'Дважды нажмите, чтобы написать заметку...',
      noteVariant: variant,
      bgColor,
      textColor,
      fontFamily,
      fontSize: 16,
      padding: 12,
      borderStyle: variant === 'paper' ? 'dashed' : 'none',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onAddItems([item]);
    onSelectIds([item.id]);
  };

  const addWashi = (pattern: WashiPattern) => {
    onAddItems([
      {
        id: `sb_washi_${Date.now()}`,
        bookId,
        pageIndex,
        type: 'washi',
        pattern,
        x: 30,
        y: 12,
        width: 26,
        height: 4.2,
        rotation: -4,
        zIndex: maxZ + 1,
        opacity: 0.9,
        locked: false,
        hidden: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
  };

  const addBuiltInSticker = (emoji: string, label: string, stickerId: string) => {
    onAddItems([
      {
        id: `sb_st_${Date.now()}`,
        bookId,
        pageIndex,
        type: 'sticker',
        stickerId,
        label,
        emoji,
        x: 42,
        y: 35,
        width: 11,
        height: 11,
        rotation: 0,
        zIndex: maxZ + 1,
        opacity: 1,
        locked: false,
        hidden: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
  };

  const saveSelectedToAssets = async () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'photo') {
      await saveScrapbookAsset({
        id: `asset_${Date.now()}`,
        name: selectedItem.caption || 'Сохранённое фото',
        category: 'photo',
        src: selectedItem.src,
        favorite: true,
        createdAt: Date.now(),
      });
      showToast('Фото сохранено в коллекцию Scrapbook Assets');
    } else if (selectedItem.type === 'sticker') {
      await saveScrapbookAsset({
        id: `asset_${Date.now()}`,
        name: selectedItem.label,
        category: 'sticker',
        src: selectedItem.customImageSrc,
        emoji: selectedItem.emoji,
        favorite: true,
        createdAt: Date.now(),
      });
      showToast('Стикер сохранён в коллекцию материалов');
    }
  };

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Top Action Bar: Undo/Redo & Lock */}
      <div
        className="flex items-center justify-between gap-2 pb-3 mb-3 border-b"
        style={{borderColor: 'var(--site-border)'}}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border disabled:opacity-35"
            style={{borderColor: 'var(--site-border)'}}
            title="Отменить (Undo)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border disabled:opacity-35"
            style={{borderColor: 'var(--site-border)'}}
            title="Повторить (Redo)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setLockAllMobile(!lockAllMobile)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap"
          style={{
            borderColor: lockAllMobile ? 'var(--site-accent)' : 'var(--site-border)',
            backgroundColor: lockAllMobile ? 'var(--site-accent)' : 'transparent',
            color: lockAllMobile ? 'var(--site-accent-contrast)' : 'var(--site-text)',
          }}
        >
          {lockAllMobile ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          {lockAllMobile ? 'Заблокировано' : 'Редактирование'}
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(
          [
            ['elements', 'Декор'],
            ['draw', 'Рисование'],
            ['templates', 'Шаблоны'],
            ['layers', `Слои (${pageItems.length})`],
            ['assets', 'Материалы'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              if (id !== 'draw' && drawingConfig.active) {
                setDrawingConfig((d) => ({...d, active: false}));
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              tab === id ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={
              tab === id
                ? {backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}
                : {backgroundColor: 'var(--site-bg)'}
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Selected Item Properties Panel */}
      {selectedItem && tab !== 'draw' && (
        <div
          className="mb-4 rounded-xl border p-3 space-y-2.5"
          style={{
            backgroundColor: 'var(--site-bg)',
            borderColor: 'var(--site-accent)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">Настройка элемента</span>
            <div className="flex items-center gap-1">
              {(selectedItem.type === 'photo' || selectedItem.type === 'sticker') && (
                <button
                  onClick={saveSelectedToAssets}
                  className="p-1.5 rounded-md hover:bg-black/5"
                  title="Сохранить в мои материалы"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onDeleteItem(selectedItem.id)}
                className="p-1.5 rounded-md text-rose-600 hover:bg-rose-500/10"
                title="Удалить элемент"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="opacity-70">Поворот: {selectedItem.rotation}°</span>
              <input
                type="range"
                min={-45}
                max={45}
                value={selectedItem.rotation}
                onChange={(e) =>
                  onUpdateItem({...selectedItem, rotation: Number(e.target.value), updatedAt: Date.now()})
                }
                className="w-full accent-[var(--site-accent)]"
              />
            </label>
            <label className="block">
              <span className="opacity-70">Прозрачность: {Math.round(selectedItem.opacity * 100)}%</span>
              <input
                type="range"
                min={0.15}
                max={1}
                step={0.05}
                value={selectedItem.opacity}
                onChange={(e) =>
                  onUpdateItem({...selectedItem, opacity: Number(e.target.value), updatedAt: Date.now()})
                }
                className="w-full accent-[var(--site-accent)]"
              />
            </label>
          </div>

          {selectedItem.type === 'photo' && (
            <div className="space-y-2 pt-1 border-t" style={{borderColor: 'var(--site-border)'}}>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedItem.paperclipStyle}
                  onChange={(e) =>
                    onUpdateItem({
                      ...selectedItem,
                      paperclipStyle: e.target.value as PaperclipStyle,
                      updatedAt: Date.now(),
                    })
                  }
                  className="rounded-lg border px-2 py-1.5"
                  style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
                >
                  <option value="none">Без скрепки</option>
                  <option value="classic_metal">Металл. скрепка</option>
                  <option value="gold">Золотая скрепка</option>
                  <option value="silver">Серебряная скрепка</option>
                  <option value="pastel_pink">Розовая скрепка</option>
                  <option value="sage">Мятно-зелёная</option>
                  <option value="vintage_brass">Винтажная латунь</option>
                  <option value="star_clip">Со звёздочкой</option>
                </select>
                <select
                  value={selectedItem.clipFrame}
                  onChange={(e) =>
                    onUpdateItem({
                      ...selectedItem,
                      clipFrame: e.target.value as PhotoClipFrame,
                      updatedAt: Date.now(),
                    })
                  }
                  className="rounded-lg border px-2 py-1.5"
                  style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
                >
                  <option value="clipped">Со скрепкой</option>
                  <option value="polaroid">Polaroid</option>
                  <option value="vintage">Винтажное фото</option>
                  <option value="white_frame">Белая рамка</option>
                  <option value="torn">Рваный край</option>
                  <option value="taped">На скотче</option>
                  <option value="corners">Уголки альбома</option>
                  <option value="paper_back">На бумаге</option>
                  <option value="none">Без рамки</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedItem.paperclipPosition}
                  onChange={(e) =>
                    onUpdateItem({
                      ...selectedItem,
                      paperclipPosition: e.target.value as ScrapbookPhotoItem['paperclipPosition'],
                      updatedAt: Date.now(),
                    })
                  }
                  className="flex-1 rounded-lg border px-2 py-1.5"
                  style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
                >
                  <option value="top_left">Скрепка слева</option>
                  <option value="top_center">Скрепка по центру</option>
                  <option value="top_right">Скрепка справа</option>
                </select>
                <button
                  onClick={() =>
                    onUpdateItem({...selectedItem, flipX: !selectedItem.flipX, updatedAt: Date.now()})
                  }
                  className="p-1.5 rounded-lg border"
                  style={{borderColor: 'var(--site-border)'}}
                  title="Отразить горизонтально"
                >
                  <FlipHorizontal2 className="w-4 h-4" />
                </button>
              </div>
              <input
                value={selectedItem.caption}
                onChange={(e) =>
                  onUpdateItem({...selectedItem, caption: e.target.value, updatedAt: Date.now()})
                }
                placeholder="Подпись под фото..."
                className="w-full rounded-lg border px-2.5 py-1.5"
                style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
              />
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <label>
                  Яркость
                  <input
                    type="range"
                    min={60}
                    max={140}
                    value={selectedItem.brightness}
                    onChange={(e) =>
                      onUpdateItem({...selectedItem, brightness: Number(e.target.value)})
                    }
                    className="w-full"
                  />
                </label>
                <label>
                  Контраст
                  <input
                    type="range"
                    min={60}
                    max={150}
                    value={selectedItem.contrast}
                    onChange={(e) =>
                      onUpdateItem({...selectedItem, contrast: Number(e.target.value)})
                    }
                    className="w-full"
                  />
                </label>
                <label>
                  Сепия
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selectedItem.sepia}
                    onChange={(e) =>
                      onUpdateItem({...selectedItem, sepia: Number(e.target.value)})
                    }
                    className="w-full"
                  />
                </label>
              </div>
            </div>
          )}

          {selectedItem.type === 'sticker' && (
            <div className="space-y-2 pt-1 border-t" style={{borderColor: 'var(--site-border)'}}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] opacity-80">Оттенок / свечение стикера</span>
                <div className="flex items-center gap-1.5">
                  <ColorSwatchButton
                    compact
                    value={selectedItem.tintColor || '#8C5E4D'}
                    onChange={(c) =>
                      onUpdateItem({...selectedItem, tintColor: c, updatedAt: Date.now()}, true)
                    }
                    label="Оттенок стикера"
                    title="Выбрать оттенок для стикера"
                  />
                  {selectedItem.tintColor && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateItem(
                          {...selectedItem, tintColor: undefined, updatedAt: Date.now()},
                          true
                        )
                      }
                      className="px-2 py-1 rounded-lg border text-[11px] hover:bg-black/5"
                      style={{borderColor: 'var(--site-border)'}}
                    >
                      Сброс
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {(selectedItem.type === 'note' || selectedItem.type === 'paper') && (
            <div className="space-y-2 pt-1 border-t" style={{borderColor: 'var(--site-border)'}}>
              <textarea
                rows={2}
                value={selectedItem.text}
                onChange={(e) =>
                  onUpdateItem({...selectedItem, text: e.target.value, updatedAt: Date.now()})
                }
                className="w-full rounded-lg border px-2.5 py-1.5"
                style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
              />
              <div className="flex flex-wrap items-center gap-2">
                <ColorSwatchButton
                  compact
                  enableGradient={true}
                  value={selectedItem.bgColor}
                  gradientValue={selectedItem.bgGradient}
                  onChange={(c, g) =>
                    onUpdateItem(
                      {...selectedItem, bgColor: c, bgGradient: g, updatedAt: Date.now()},
                      true
                    )
                  }
                  label="Фон заметки"
                  title="Фон заметки (сплошной, полупрозрачный или градиент)"
                />
                <ColorSwatchButton
                  compact
                  value={selectedItem.textColor}
                  onChange={(c) =>
                    onUpdateItem({...selectedItem, textColor: c, updatedAt: Date.now()}, true)
                  }
                  label="Цвет текста"
                  title="Цвет текста заметки"
                />
                <input
                  type="range"
                  min={12}
                  max={26}
                  value={selectedItem.fontSize}
                  onChange={(e) =>
                    onUpdateItem({...selectedItem, fontSize: Number(e.target.value)})
                  }
                  className="flex-1 min-w-[70px] accent-[var(--site-accent)]"
                  title="Размер шрифта"
                />
              </div>
              <label className="block text-[11px]">
                <div className="flex justify-between opacity-75">
                  <span>Прозрачность фона</span>
                  <span className="font-mono-num">
                    {Math.round((selectedItem.bgOpacity ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.15}
                  max={1}
                  step={0.05}
                  value={selectedItem.bgOpacity ?? 1}
                  onChange={(e) =>
                    onUpdateItem({
                      ...selectedItem,
                      bgOpacity: Number(e.target.value),
                      updatedAt: Date.now(),
                    })
                  }
                  className="w-full accent-[var(--site-accent)]"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {tab === 'elements' && (
          <>
            {/* Attach Photo with Paperclip */}
            <div>
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                onClick={() => photoInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--site-accent)',
                  color: 'var(--site-accent-contrast)',
                }}
              >
                <Paperclip className="w-4 h-4" />
                Прикрепить картинку скрепкой
              </button>
            </div>

            {/* Notes & Torn Paper */}
            <div className="space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5 opacity-80">
                <StickyNote className="w-3.5 h-3.5" />
                Текстовые записки и бумага
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => addNote('sticky', '#FAF0CA', '#3C2F22', "'Manrope', sans-serif")}
                  className="p-2 rounded-lg border text-left hover:bg-black/5"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  Sticky Note
                </button>
                <button
                  onClick={() => addNote('handwritten', '#FDF8EE', '#2F261E', "'Caveat', cursive")}
                  className="p-2 rounded-lg border text-left hover:bg-black/5"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  Рукописная
                </button>
                <button
                  onClick={() => addNote('torn_paper', '#EFE4CE', '#3A2B1D', "'Lora', serif")}
                  className="p-2 rounded-lg border text-left hover:bg-black/5"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  Рваная бумага
                </button>
                <button
                  onClick={() => addNote('vintage_card', '#E6DAC4', '#2D2218', "'Cormorant Garamond', serif")}
                  className="p-2 rounded-lg border text-left hover:bg-black/5"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  Винтажная карта
                </button>
              </div>
            </div>

            {/* Washi Tape */}
            <div className="space-y-1.5">
              <p className="font-semibold opacity-80">Washi Tape / Декоративный скотч</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(WASHI_TAPE_STYLES) as WashiPattern[]).map((pat) => (
                  <button
                    key={pat}
                    onClick={() => addWashi(pat)}
                    className="rounded-lg border p-1.5 text-center hover:scale-[1.02] transition-transform"
                    style={{borderColor: 'var(--site-border)'}}
                  >
                    <div
                      className="h-3.5 w-full rounded-xs mb-1"
                      style={{background: WASHI_TAPE_STYLES[pat].background}}
                    />
                    <span className="text-[10px] block truncate">{WASHI_TAPE_STYLES[pat].label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stickers */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-semibold flex items-center gap-1.5 opacity-80">
                  <Sticker className="w-3.5 h-3.5" />
                  Стикеры и вырезки
                </p>
                <input
                  ref={stickerUploadRef}
                  type="file"
                  accept="image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleCustomStickerUpload}
                />
                <button
                  onClick={() => stickerUploadRef.current?.click()}
                  className="text-[11px] underline opacity-80 hover:opacity-100"
                >
                  + Свой PNG
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {BUILT_IN_STICKERS.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => addBuiltInSticker(st.emoji || '🌿', st.label, st.id)}
                    className="h-10 rounded-lg border flex items-center justify-center text-xl hover:bg-black/5"
                    style={{borderColor: 'var(--site-border)'}}
                    title={st.label}
                  >
                    {st.emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'draw' && (
          <div className="space-y-3">
            <button
              onClick={() => setDrawingConfig((d) => ({...d, active: !d.active}))}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium"
              style={{
                backgroundColor: drawingConfig.active ? 'var(--site-accent)' : 'var(--site-bg)',
                color: drawingConfig.active ? 'var(--site-accent-contrast)' : 'var(--site-text)',
                border: '1px solid var(--site-border)',
              }}
            >
              <PenTool className="w-4 h-4" />
              {drawingConfig.active ? 'Рисование включено (нажмите для выхода)' : 'Включить рисование на странице'}
            </button>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['pencil', 'Карандаш'],
                  ['pen', 'Ручка'],
                  ['marker', 'Маркер'],
                  ['highlighter', 'Хайлайтер'],
                  ['brush', 'Кисть'],
                  ['eraser', 'Ластик'],
                ] as const
              ).map(([toolId, lbl]) => (
                <button
                  key={toolId}
                  onClick={() => setDrawingConfig((d) => ({...d, active: true, tool: toolId}))}
                  className={`py-2 px-2 rounded-lg border font-medium ${
                    drawingConfig.tool === toolId ? 'ring-1 ring-[var(--site-accent)]' : ''
                  }`}
                  style={{
                    borderColor: 'var(--site-border)',
                    backgroundColor:
                      drawingConfig.tool === toolId ? 'var(--site-surface-alt)' : 'var(--site-bg)',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Цвет линии</span>
                <ColorSwatchButton
                  value={drawingConfig.color}
                  onChange={(c) => setDrawingConfig((d) => ({...d, color: c}))}
                  label="Цвет линии"
                  title="Выбрать цвет кисти из «Мои цвета»"
                />
              </div>
              <label className="block">
                <span>Толщина: {drawingConfig.width}px</span>
                <input
                  type="range"
                  min={1}
                  max={18}
                  value={drawingConfig.width}
                  onChange={(e) => setDrawingConfig((d) => ({...d, width: Number(e.target.value)}))}
                  className="w-full accent-[var(--site-accent)]"
                />
              </label>
              <label className="block">
                <span>Прозрачность: {Math.round(drawingConfig.opacity * 100)}%</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={drawingConfig.opacity}
                  onChange={(e) => setDrawingConfig((d) => ({...d, opacity: Number(e.target.value)}))}
                  className="w-full accent-[var(--site-accent)]"
                />
              </label>
            </div>
          </div>
        )}

        {tab === 'templates' && (
          <div className="space-y-2">
            <p className="text-[11px] opacity-75">
              Применение шаблона в один клик добавит стиль страницы и набор декора (всё можно менять вручную).
            </p>
            <div className="space-y-2">
              {SCRAPBOOK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => onApplyTemplate(tpl.id)}
                  className="w-full text-left rounded-xl border p-3 hover:bg-black/5 transition-colors"
                  style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-bg)'}}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" style={{color: 'var(--site-accent)'}} />
                      {tpl.name}
                    </span>
                    <span className="text-[10px] opacity-60">Применить</span>
                  </div>
                  <p className="text-[11px] opacity-70 mt-1">{tpl.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'layers' && (
          <div className="space-y-1.5">
            {pageItems.length === 0 ? (
              <p className="py-8 text-center opacity-60">На этой странице пока нет слоёв декора</p>
            ) : (
              [...pageItems]
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((it) => {
                  const selected = selectedIds.includes(it.id);
                  const title =
                    it.type === 'photo'
                      ? it.caption || 'Фотография'
                      : it.type === 'note' || it.type === 'paper'
                      ? it.text.slice(0, 22) || 'Записка'
                      : it.type === 'washi'
                      ? `Скотч: ${WASHI_TAPE_STYLES[it.pattern]?.label}`
                      : it.type === 'drawing'
                      ? `Рисунок (${it.strokes.length})`
                      : it.type === 'sticker'
                      ? it.label
                      : 'Элемент';

                  return (
                    <div
                      key={it.id}
                      onClick={() => onSelectIds([it.id])}
                      className={`flex items-center justify-between gap-2 p-2 rounded-xl border cursor-pointer ${
                        selected ? 'ring-1 ring-[var(--site-accent)]' : ''
                      }`}
                      style={{
                        borderColor: 'var(--site-border)',
                        backgroundColor: selected ? 'var(--site-surface-alt)' : 'var(--site-bg)',
                      }}
                    >
                      <span className="truncate flex items-center gap-1.5 font-medium">
                        <Layers className="w-3.5 h-3.5 opacity-60 shrink-0" />
                        {title}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onUpdateItem({...it, zIndex: it.zIndex + 1}, true)}
                          className="p-1 rounded hover:bg-black/5"
                          title="Выше"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onUpdateItem({...it, zIndex: Math.max(1, it.zIndex - 1)}, true)}
                          className="p-1 rounded hover:bg-black/5"
                          title="Ниже"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onUpdateItem({...it, hidden: !it.hidden}, true)}
                          className="p-1 rounded hover:bg-black/5"
                          title={it.hidden ? 'Показать' : 'Скрыть'}
                        >
                          {it.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onUpdateItem({...it, locked: !it.locked}, true)}
                          className="p-1 rounded hover:bg-black/5"
                          title={it.locked ? 'Разблокировать' : 'Закрепить'}
                        >
                          {it.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onDeleteItem(it.id)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-500/10"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {tab === 'assets' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold opacity-80">Сохранённые материалы</span>
              <button
                onClick={() => stickerUploadRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px]"
                style={{borderColor: 'var(--site-border)'}}
              >
                <ImagePlus className="w-3 h-3" />
                Загрузить
              </button>
            </div>
            {scrapbookAssets.length === 0 ? (
              <p className="py-6 text-center opacity-60">
                Сохраняйте фото и стикеры кнопкой закладки, чтобы переиспользовать их в других книгах
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {scrapbookAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-xl border p-1.5 flex flex-col gap-1"
                    style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-bg)'}}
                  >
                    <div
                      onClick={() => {
                        if (asset.category === 'photo' && asset.src) {
                          onAddItems([
                            {
                              id: `sb_photo_${Date.now()}`,
                              bookId,
                              pageIndex,
                              type: 'photo',
                              src: asset.src,
                              x: 20,
                              y: 20,
                              width: 32,
                              height: 24,
                              rotation: -2,
                              zIndex: maxZ + 1,
                              opacity: 1,
                              locked: false,
                              hidden: false,
                              clipFrame: 'clipped',
                              paperclipStyle: 'gold',
                              paperclipPosition: 'top_center',
                              caption: asset.name,
                              flipX: false,
                              borderRadius: 6,
                              shadow: true,
                              cropShape: 'rect',
                              brightness: 100,
                              contrast: 100,
                              sepia: 0,
                              blur: 0,
                              createdAt: Date.now(),
                              updatedAt: Date.now(),
                            },
                          ]);
                        } else {
                          onAddItems([
                            {
                              id: `sb_st_${Date.now()}`,
                              bookId,
                              pageIndex,
                              type: 'sticker',
                              stickerId: asset.id,
                              label: asset.name,
                              customImageSrc: asset.src,
                              emoji: asset.emoji,
                              x: 35,
                              y: 35,
                              width: 14,
                              height: 14,
                              rotation: 0,
                              zIndex: maxZ + 1,
                              opacity: 1,
                              locked: false,
                              hidden: false,
                              createdAt: Date.now(),
                              updatedAt: Date.now(),
                            },
                          ]);
                        }
                      }}
                      className="aspect-square rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80"
                    >
                      {asset.src ? (
                        <img src={asset.src} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">{asset.emoji || '✨'}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] truncate">{asset.name}</span>
                      <button
                        onClick={() => deleteScrapbookAsset(asset.id)}
                        className="text-rose-600 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

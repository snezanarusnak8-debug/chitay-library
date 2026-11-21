import React, {useMemo, useState} from 'react';
import {
  Bookmark,
  Compass,
  Heart,
  HelpCircle,
  KeyRound,
  Leaf,
  Moon,
  Plus,
  Quote,
  Repeat,
  Sparkles,
  Star,
  Upload,
  User,
  X,
} from 'lucide-react';
import {BOOKMARK_COLOR_PALETTE, BOOKMARK_ICON_OPTIONS} from '../constants/bookmarks';
import {useLibrary} from '../context/LibraryContext';
import {Book, ScrapbookNoteItem, ScrapbookPhotoItem, SmartBookmark} from '../types/library';
import {ColorSwatchButton} from './ColorSwatchButton';

export const renderBookmarkIcon = (iconId: string, className = 'w-4 h-4') => {
  switch (iconId) {
    case 'star':
      return <Star className={className} />;
    case 'quote':
      return <Quote className={className} />;
    case 'user':
      return <User className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'help':
      return <HelpCircle className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'repeat':
      return <Repeat className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'leaf':
      return <Leaf className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'key':
      return <KeyRound className={className} />;
    default:
      return <Bookmark className={className} />;
  }
};

const BOOKMARK_STICKERS = ['🔖', '✨', '🌿', '🥀', '🌙', '🗝️', '❤️', '📌', '🦉', '☕'];

interface SmartBookmarkModalProps {
  book: Book;
  pageIndex: number;
  chapterId?: string;
  chapterTitle?: string;
  existing?: SmartBookmark | null;
  onClose: () => void;
  onSaved?: (bm: SmartBookmark) => void;
}

export const SmartBookmarkModal: React.FC<SmartBookmarkModalProps> = ({
  book,
  pageIndex,
  chapterId,
  chapterTitle,
  existing,
  onClose,
  onSaved,
}) => {
  const {
    allBookmarkCategories,
    userColors,
    saveSmartBookmark,
    addCustomBookmarkCategory,
    saveScrapbookItemsBulk,
    scrapbookItems,
    recordRecentColor,
    showToast,
  } = useLibrary();

  const initialCat =
    allBookmarkCategories.find((c) => c.id === (existing?.type || 'regular')) ||
    allBookmarkCategories[0];

  const [title, setTitle] = useState(
    existing?.title || `Закладка · стр. ${(existing?.pageIndex ?? pageIndex) + 1}`
  );
  const [targetPage, setTargetPage] = useState<number>(existing?.pageIndex ?? pageIndex);
  const [type, setType] = useState<string>(existing?.type || initialCat.id);
  const [color, setColor] = useState<string>(existing?.color || initialCat.color);
  const [icon, setIcon] = useState<string>(existing?.icon || initialCat.icon);
  const [note, setNote] = useState<string>(existing?.note || '');
  const [characterName, setCharacterName] = useState<string>(existing?.characterName || '');
  const [tagsRaw, setTagsRaw] = useState<string>((existing?.tags || []).join(', '));
  const [stickerEmoji, setStickerEmoji] = useState<string>(existing?.stickerEmoji || '');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(existing?.imageDataUrl);
  const [alsoScrapbook, setAlsoScrapbook] = useState(false);

  // Custom category inline form
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(BOOKMARK_COLOR_PALETTE[0].value);
  const [newCatIcon, setNewCatIcon] = useState('sparkles');

  const resolvedChapter = useMemo(() => {
    if (targetPage === pageIndex && chapterTitle) {
      return {id: chapterId, title: chapterTitle};
    }
    const found = [...(book.toc || [])].reverse().find((t) => targetPage >= t.pageIndex);
    return found ? {id: found.id, title: found.title} : {id: chapterId, title: chapterTitle};
  }, [book.toc, chapterId, chapterTitle, pageIndex, targetPage]);

  const handleSelectCategory = (catId: string) => {
    setType(catId);
    const cat = allBookmarkCategories.find((c) => c.id === catId);
    if (cat) {
      setColor(cat.color);
      setIcon(cat.icon);
    }
  };

  const handleAddCustomCat = async () => {
    if (!newCatName.trim()) return;
    const id = `bmcat_${Date.now()}`;
    await addCustomBookmarkCategory({
      id,
      label: newCatName.trim(),
      color: newCatColor,
      icon: newCatIcon,
      isCustom: true,
    });
    setType(id);
    setColor(newCatColor);
    setIcon(newCatIcon);
    setNewCatName('');
    setShowNewCat(false);
    showToast('Категория закладок добавлена');
  };

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    setImageDataUrl(dataUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const clampedPage = Math.max(0, Math.min(Math.max(0, book.totalPages - 1), targetPage));
    const bm: SmartBookmark = {
      id: existing?.id || `sbm_${now}_${Math.random().toString(36).slice(2, 6)}`,
      bookId: book.id,
      pageIndex: clampedPage,
      chapterId: resolvedChapter.id,
      chapterTitle: resolvedChapter.title,
      title: title.trim() || `Страница ${clampedPage + 1}`,
      type,
      color,
      icon,
      note: note.trim(),
      characterName: characterName.trim() || undefined,
      tags: tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      stickerEmoji: stickerEmoji || undefined,
      imageDataUrl,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await saveSmartBookmark(bm);
    recordRecentColor(color);

    if (alsoScrapbook) {
      const existingOnPage = scrapbookItems.filter(
        (s) => s.bookId === book.id && s.pageIndex === clampedPage
      );
      const baseZ = existingOnPage.length + 3;
      const noteTextLines = [
        `${bm.stickerEmoji ? `${bm.stickerEmoji} ` : ''}${bm.title}`,
        bm.characterName ? `Персонаж: ${bm.characterName}` : '',
        bm.note,
      ]
        .filter(Boolean)
        .join('\n');

      const newItems: (ScrapbookNoteItem | ScrapbookPhotoItem)[] = [
        {
          id: `sb_bm_note_${now}`,
          bookId: book.id,
          pageIndex: clampedPage,
          type: 'note',
          text: noteTextLines,
          noteVariant: 'vintage_card',
          bgColor: '#FAF5EC',
          textColor: '#2F251E',
          fontFamily: "'Lora', serif",
          fontSize: 14,
          padding: 12,
          borderStyle: 'dashed',
          x: 62,
          y: 12,
          width: 32,
          height: 20,
          rotation: 1.5,
          zIndex: baseZ,
          opacity: 0.96,
          locked: false,
          hidden: false,
          createdAt: now,
          updatedAt: now,
        },
      ];
      if (bm.imageDataUrl) {
        newItems.push({
          id: `sb_bm_photo_${now}`,
          bookId: book.id,
          pageIndex: clampedPage,
          type: 'photo',
          src: bm.imageDataUrl,
          x: 58,
          y: 35,
          width: 30,
          height: 24,
          rotation: -2,
          zIndex: baseZ + 1,
          opacity: 1,
          locked: false,
          hidden: false,
          clipFrame: 'polaroid',
          paperclipStyle: 'gold',
          paperclipPosition: 'top_center',
          caption: bm.title,
          flipX: false,
          borderRadius: 4,
          shadow: true,
          cropShape: 'rect',
          brightness: 100,
          contrast: 100,
          sepia: 0,
          blur: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
      await saveScrapbookItemsBulk(newItems);
      showToast('Умная закладка сохранена и добавлена на Scrapbook-страницу');
    } else {
      showToast(existing ? 'Умная закладка обновлена' : 'Умная закладка сохранена');
    }

    onSaved?.(bm);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border p-5 sm:p-6 shadow-2xl space-y-4"
        style={{
          backgroundColor: 'var(--site-surface)',
          borderColor: 'var(--site-border)',
          color: 'var(--site-text)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {existing ? 'Редактировать закладку' : 'Новая умная закладка'}
            </h2>
            <p className="text-xs mt-0.5 truncate max-w-md" style={{color: 'var(--site-text-muted)'}}>
              {book.title} · {resolvedChapter.title || `Страница ${targetPage + 1}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title & Page */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <label className="sm:col-span-8 block space-y-1">
              <span className="font-medium">Название закладки</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Важный разговор в саду..."
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
              />
            </label>
            <label className="sm:col-span-4 block space-y-1">
              <span className="font-medium">Страница (1–{book.totalPages})</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, book.totalPages)}
                value={targetPage + 1}
                onChange={(e) => setTargetPage(Math.max(0, Number(e.target.value) - 1))}
                className="w-full rounded-xl border px-3 py-2.5 text-sm font-mono-num outline-none"
                style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
              />
            </label>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Тип и смысл закладки</span>
              <button
                type="button"
                onClick={() => setShowNewCat((v) => !v)}
                className="inline-flex items-center gap-1 font-medium hover:underline whitespace-nowrap shrink-0"
                style={{color: 'var(--site-accent)'}}
              >
                <Plus className="w-3.5 h-3.5" /> Своя категория
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allBookmarkCategories.map((cat) => {
                const active = type === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                    style={{
                      borderColor: active ? cat.color : 'var(--site-border)',
                      backgroundColor: active ? 'var(--site-surface-alt)' : 'var(--site-bg)',
                    }}
                  >
                    <span style={{color: cat.color}}>{renderBookmarkIcon(cat.icon, 'w-3.5 h-3.5')}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {showNewCat && (
              <div
                className="rounded-2xl border p-3 flex flex-wrap items-center gap-2"
                style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
              >
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Название категории..."
                  className="flex-1 min-w-[140px] rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                  style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
                />
                <ColorSwatchButton
                  compact
                  value={newCatColor}
                  onChange={(c) => setNewCatColor(c)}
                  label="Цвет категории"
                  title="Выбрать цвет новой категории"
                />
                <select
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="rounded-lg border px-2 py-1.5 text-xs"
                  style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
                >
                  {BOOKMARK_ICON_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.emoji} {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomCat}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--site-accent)',
                    color: 'var(--site-accent-contrast)',
                  }}
                >
                  Добавить
                </button>
              </div>
            )}
          </div>

          {/* Color & Icon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="font-medium block">Цвет ленточки</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  ...BOOKMARK_COLOR_PALETTE,
                  ...userColors
                    .filter((uc) => uc.pinned)
                    .slice(0, 4)
                    .map((uc) => ({name: uc.name, value: uc.cssValue})),
                ].map((c, idx) => (
                  <button
                    key={`${c.value}_${idx}`}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      color === c.value ? 'scale-110 ring-2 ring-[var(--site-accent)]' : ''
                    }`}
                    style={{backgroundColor: c.value, borderColor: 'rgba(0,0,0,0.18)'}}
                    title={c.name}
                  />
                ))}
                <ColorSwatchButton
                  compact
                  value={color}
                  onChange={(c) => {
                    setColor(c);
                    recordRecentColor(c);
                  }}
                  label="Цвет ленточки"
                  title="Любой цвет из «Мои цвета» или Color Picker"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-medium block">Иконка</span>
              <div className="flex flex-wrap gap-1">
                {BOOKMARK_ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIcon(opt.id)}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: icon === opt.id ? color : 'var(--site-border)',
                      backgroundColor: icon === opt.id ? 'var(--site-surface-alt)' : 'var(--site-bg)',
                      color: icon === opt.id ? color : 'var(--site-text)',
                    }}
                    title={opt.label}
                  >
                    {renderBookmarkIcon(opt.id, 'w-3.5 h-3.5')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Note */}
          <label className="block space-y-1">
            <span className="font-medium">Комментарий или заметка</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Почему вы отметили это место? Мысли, догадки, атмосфера сцены..."
              className="w-full rounded-xl border p-3 text-sm outline-none"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            />
          </label>

          {/* Character & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-medium">Персонаж (необязательно)</span>
              <input
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Имя героя..."
                className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
                style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
              />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Теги (через запятую)</span>
              <input
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="тайна, финал, атмосфера..."
                className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
                style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
              />
            </label>
          </div>

          {/* Sticker & Optional Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="font-medium block">Стикер</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setStickerEmoji('')}
                  className="px-2 py-1 rounded-lg border text-[11px]"
                  style={{
                    borderColor: !stickerEmoji ? 'var(--site-accent)' : 'var(--site-border)',
                    backgroundColor: 'var(--site-bg)',
                  }}
                >
                  Нет
                </button>
                {BOOKMARK_STICKERS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setStickerEmoji(em)}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center text-sm"
                    style={{
                      borderColor: stickerEmoji === em ? 'var(--site-accent)' : 'var(--site-border)',
                      backgroundColor: stickerEmoji === em ? 'var(--site-surface-alt)' : 'var(--site-bg)',
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-medium block">Изображение или эстетика</span>
              <div className="flex items-center gap-2">
                <label
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer hover:bg-black/5 text-xs font-medium whitespace-nowrap"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {imageDataUrl ? 'Заменить фото' : 'Прикрепить фото'}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
                </label>
                {imageDataUrl && (
                  <div className="flex items-center gap-1.5">
                    <img
                      src={imageDataUrl}
                      alt="Превью"
                      className="w-9 h-9 rounded-lg object-cover border"
                      style={{borderColor: 'var(--site-border)'}}
                    />
                    <button
                      type="button"
                      onClick={() => setImageDataUrl(undefined)}
                      className="text-rose-600 p-1"
                      title="Убрать фото"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={alsoScrapbook}
              onChange={(e) => setAlsoScrapbook(e.target.checked)}
              className="accent-[var(--site-accent)]"
            />
            <span>Оформить эту закладку как декоративную карточку в Scrapbook страницы</span>
          </label>

          <div
            className="flex items-center justify-end gap-2 pt-3 border-t"
            style={{borderColor: 'var(--site-border)'}}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0"
              style={{borderColor: 'var(--site-border)'}}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0"
              style={{
                backgroundColor: 'var(--site-accent)',
                color: 'var(--site-accent-contrast)',
              }}
            >
              {existing ? 'Сохранить изменения' : 'Сохранить закладку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

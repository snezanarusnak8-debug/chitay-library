import React, {useRef, useState} from 'react';
import {ImagePlus, RefreshCw, Star, Trash2, X} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {Book, ReadingStatus} from '../types/library';

interface BookMetadataModalProps {
  book: Book;
  onClose: () => void;
}

const STATUS_OPTIONS: {value: ReadingStatus; label: string}[] = [
  {value: 'reading', label: 'Читаю сейчас'},
  {value: 'planned', label: 'В планах'},
  {value: 'finished', label: 'Прочитано'},
  {value: 'paused', label: 'Отложено'},
  {value: 'favorite', label: 'Любимые'},
  {value: 'dropped', label: 'Брошено'},
];

export const BookMetadataModal: React.FC<BookMetadataModalProps> = ({book, onClose}) => {
  const {collections, updateBook, deleteBook, replaceBookFile, showToast} = useLibrary();

  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [genre, setGenre] = useState(book.genre);
  const [tagsStr, setTagsStr] = useState(book.tags.join(', '));
  const [status, setStatus] = useState<ReadingStatus>(book.status);
  const [rating, setRating] = useState(book.rating);
  const [description, setDescription] = useState(book.description || '');
  const [coverDataUrl, setCoverDataUrl] = useState(book.coverDataUrl || '');
  const [selectedCols, setSelectedCols] = useState<string[]>(book.collections || []);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileReplaceRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCoverDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await replaceBookFile(book.id, file);
      onClose();
    } catch {
      showToast('Не удалось заменить файл книги');
    }
  };

  const toggleCollection = (id: string) => {
    setSelectedCols((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await updateBook({
      ...book,
      title: title.trim() || book.title,
      author: author.trim() || 'Неизвестный автор',
      genre: genre.trim() || 'Литература',
      tags,
      status,
      rating,
      description: description.trim(),
      coverDataUrl: coverDataUrl || undefined,
      collections: selectedCols,
    });
    showToast('Метаданные книги сохранены');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-5 sm:p-7 shadow-2xl"
        style={{
          backgroundColor: 'var(--site-surface)',
          borderColor: 'var(--site-border)',
          color: 'var(--site-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl font-semibold">Сведения о книге</h2>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div
                className="w-32 h-44 rounded-xl overflow-hidden border flex items-center justify-center relative group"
                style={{
                  backgroundColor: 'var(--site-surface-alt)',
                  borderColor: 'var(--site-border)',
                }}
              >
                {coverDataUrl ? (
                  <img
                    src={coverDataUrl}
                    alt={title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-center px-3 opacity-60">{title}</span>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border hover:opacity-80 transition-opacity"
                style={{borderColor: 'var(--site-border)'}}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Своя обложка
              </button>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 opacity-75">Название</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--site-bg)',
                    borderColor: 'var(--site-border)',
                  }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-75">Автор</label>
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--site-bg)',
                      borderColor: 'var(--site-border)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-75">Жанр</label>
                  <input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--site-bg)',
                      borderColor: 'var(--site-border)',
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-75">Статус чтения</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ReadingStatus)}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--site-bg)',
                      borderColor: 'var(--site-border)',
                    }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-75">Оценка</label>
                  <div className="flex items-center gap-1 h-[38px]">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n === rating ? 0 : n)}
                        className="p-1.5 rounded-md hover:bg-black/5 transition-colors"
                      >
                        <Star
                          className="w-5 h-5"
                          fill={n <= rating ? 'var(--site-accent)' : 'none'}
                          stroke={n <= rating ? 'var(--site-accent)' : 'currentColor'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 opacity-75">
              Теги (через запятую)
            </label>
            <input
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="Классика, Осень, Уют..."
              className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none"
              style={{
                backgroundColor: 'var(--site-bg)',
                borderColor: 'var(--site-border)',
              }}
            />
          </div>

          {collections.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-75">Коллекции и полки</label>
              <div className="flex flex-wrap gap-2">
                {collections.map((c) => {
                  const active = selectedCols.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCollection(c.id)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap shrink-0"
                      style={{
                        borderColor: active ? 'var(--site-accent)' : 'var(--site-border)',
                        backgroundColor: active ? 'var(--site-accent)' : 'var(--site-bg)',
                        color: active ? 'var(--site-accent-contrast)' : 'var(--site-text)',
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1 opacity-75">Аннотация / Описание</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none resize-y"
              style={{
                backgroundColor: 'var(--site-bg)',
                borderColor: 'var(--site-border)',
              }}
            />
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t"
            style={{borderColor: 'var(--site-border)'}}
          >
            <div className="flex items-center gap-2">
              <input
                ref={fileReplaceRef}
                type="file"
                accept=".epub,.pdf,.fb2,.mobi,.azw,.azw3,.txt,.doc,.docx,.rtf,.html,.htm,.cbz,.cbr,.zip"
                className="hidden"
                onChange={handleReplaceFile}
              />
              <button
                type="button"
                onClick={() => fileReplaceRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium hover:opacity-80 transition-opacity"
                style={{borderColor: 'var(--site-border)'}}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Заменить файл
              </button>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Удалить
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteBook(book.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-rose-600 text-white"
                >
                  Подтвердить удаление
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium border hover:opacity-80"
                style={{borderColor: 'var(--site-border)'}}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--site-accent)',
                  color: 'var(--site-accent-contrast)',
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

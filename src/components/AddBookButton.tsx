import React, {useEffect, useRef, useState} from 'react';
import {Files, FileUp, FolderOpen, Plus} from 'lucide-react';
import {useIsTouchDevice} from './BookUploadModal';

interface AddBookButtonProps {
  onPickFiles: (files: File[]) => void;
  onOpenDropModal: () => void;
  variant?: 'primary' | 'outline' | 'sidebar' | 'mobile-icon';
  collapsed?: boolean;
  className?: string;
}

const DESKTOP_ACCEPTED_EXTS =
  '.epub,.pdf,.fb2,.mobi,.azw,.azw3,.txt,.doc,.docx,.rtf,.html,.htm,.cbz,.cbr,.zip';

export const AddBookButton: React.FC<AddBookButtonProps> = ({
  onPickFiles,
  onOpenDropModal,
  variant = 'primary',
  collapsed = false,
  className = '',
}) => {
  const isTouch = useIsTouchDevice();
  const [menuOpen, setMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);
  const multiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onPickFiles(Array.from(e.target.files));
    }
    e.target.value = '';
    setMenuOpen(false);
  };

  const triggerSingle = () => {
    setMenuOpen(false);
    // Call synchronously in user click event so iOS/Android system file picker opens reliably
    singleInputRef.current?.click();
  };

  const triggerMulti = () => {
    setMenuOpen(false);
    multiInputRef.current?.click();
  };

  const triggerDragDrop = () => {
    setMenuOpen(false);
    onOpenDropModal();
  };

  const buttonNode =
    variant === 'mobile-icon' ? (
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 ${className}`}
        style={{
          backgroundColor: 'var(--site-accent)',
          color: 'var(--site-accent-contrast)',
        }}
        aria-label="Добавить книгу"
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Добавить</span>
      </button>
    ) : variant === 'sidebar' ? (
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-90 ${className}`}
        style={{
          backgroundColor: 'var(--site-accent)',
          color: 'var(--site-accent-contrast)',
        }}
        title="Добавить книгу"
      >
        <Plus className="w-4 h-4 shrink-0" />
        {!collapsed && <span className="whitespace-nowrap">Добавить книгу</span>}
      </button>
    ) : variant === 'outline' ? (
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border hover:bg-black/5 dark:hover:bg-white/5 transition-colors whitespace-nowrap shrink-0 ${className}`}
        style={{borderColor: 'var(--site-border)'}}
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Добавить книгу</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 ${className}`}
        style={{
          backgroundColor: 'var(--site-accent)',
          color: 'var(--site-accent-contrast)',
        }}
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Добавить книгу</span>
      </button>
    );

  return (
    <div ref={containerRef} className="relative inline-block">
      <input
        ref={singleInputRef}
        type="file"
        accept={isTouch ? undefined : DESKTOP_ACCEPTED_EXTS}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={multiInputRef}
        type="file"
        multiple
        accept={isTouch ? undefined : DESKTOP_ACCEPTED_EXTS}
        className="hidden"
        onChange={handleFileChange}
      />

      {buttonNode}

      {menuOpen && (
        <div
          className={`z-40 w-64 rounded-2xl border p-1.5 shadow-xl ${
            variant === 'sidebar'
              ? 'absolute left-0 top-full mt-1.5'
              : 'absolute right-0 top-full mt-1.5'
          }`}
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
            color: 'var(--site-text)',
          }}
        >
          <button
            type="button"
            onClick={triggerSingle}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-xs sm:text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <FolderOpen className="w-4 h-4 shrink-0" style={{color: 'var(--site-accent)'}} />
            <div>
              <p className="leading-tight">Выбрать файл на устройстве</p>
              <p className="text-[10px] mt-0.5" style={{color: 'var(--site-text-muted)'}}>
                Загрузки, память, Google Диск
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={triggerMulti}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-xs sm:text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Files className="w-4 h-4 shrink-0" style={{color: 'var(--site-accent)'}} />
            <div>
              <p className="leading-tight">Загрузить несколько книг</p>
              <p className="text-[10px] mt-0.5" style={{color: 'var(--site-text-muted)'}}>
                Пакетный импорт с прогрессом
              </p>
            </div>
          </button>

          {!isTouch && (
            <button
              type="button"
              onClick={triggerDragDrop}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-xs sm:text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <FileUp className="w-4 h-4 shrink-0" style={{color: 'var(--site-accent)'}} />
              <div>
                <p className="leading-tight">Перетащить файлы</p>
                <p className="text-[10px] mt-0.5" style={{color: 'var(--site-text-muted)'}}>
                  Окно загрузки Drag & Drop
                </p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

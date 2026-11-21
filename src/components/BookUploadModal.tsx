import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AlertCircle,
  BookOpen,
  BookPlus,
  CheckCircle2,
  FileUp,
  FolderOpen,
  Loader2,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {Book} from '../types/library';
import {ImportAbortedError} from '../utils/bookParser';

interface BookUploadModalProps {
  onClose: () => void;
  onImported?: (books: Book[]) => void;
  initialFiles?: File[];
}

interface ImportTask {
  id: string;
  file: File;
  status: 'queued' | 'importing' | 'done' | 'cancelled' | 'error';
  progress: number;
  stage: string;
  error?: string;
  books: Book[];
}

const DESKTOP_ACCEPTED_EXTS =
  '.epub,.pdf,.fb2,.mobi,.azw,.azw3,.txt,.doc,.docx,.rtf,.html,.htm,.cbz,.cbr,.zip';

export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)')?.matches || navigator.maxTouchPoints > 0;
    setIsTouch(Boolean(coarse));
  }, []);
  return isTouch;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export const BookUploadModal: React.FC<BookUploadModalProps> = ({
  onClose,
  onImported,
  initialFiles,
}) => {
  const {importSingleFile, openBookInReader, showToast} = useLibrary();
  const isTouch = useIsTouchDevice();

  const [dragging, setDragging] = useState(false);
  const [tasks, setTasks] = useState<ImportTask[]>([]);
  const singleInputRef = useRef<HTMLInputElement>(null);
  const multiInputRef = useRef<HTMLInputElement>(null);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const processingRef = useRef(false);
  const initialConsumedRef = useRef(false);

  const enqueueFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    const newTasks: ImportTask[] = list.map((file, idx) => ({
      id: `task_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      file,
      status: 'queued',
      progress: 0,
      stage: 'В очереди на загрузку…',
      books: [],
    }));
    setTasks((prev) => [...newTasks, ...prev]);
  }, []);

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && !initialConsumedRef.current) {
      initialConsumedRef.current = true;
      enqueueFiles(initialFiles);
    }
  }, [initialFiles, enqueueFiles]);

  // Cleanup controllers on unmount
  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      controllers.forEach((ctrl) => ctrl.abort());
      controllers.clear();
    };
  }, []);

  // Process queued tasks one by one smoothly without freezing UI
  useEffect(() => {
    if (processingRef.current) return;
    const nextTask = tasks.find((t) => t.status === 'queued');
    if (!nextTask) return;

    processingRef.current = true;
    const ctrl = new AbortController();
    controllersRef.current.set(nextTask.id, ctrl);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === nextTask.id
          ? {...t, status: 'importing', progress: 5, stage: 'Начинаем загрузку…', error: undefined}
          : t
      )
    );

    (async () => {
      try {
        const added = await importSingleFile(nextTask.file, {
          signal: ctrl.signal,
          onProgress: (percent, stage) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === nextTask.id ? {...t, progress: percent, stage} : t))
            );
          },
        });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === nextTask.id
              ? {...t, status: 'done', progress: 100, stage: 'Книга сохранена в библиотеку', books: added}
              : t
          )
        );
        if (added.length > 0) {
          if (onImported) onImported(added);
          showToast(
            added.length === 1
              ? `Книга «${added[0].title}» добавлена в библиотеку`
              : `Добавлено книг из архива: ${added.length}`
          );
        }
      } catch (err) {
        const isAborted = err instanceof ImportAbortedError || ctrl.signal.aborted;
        setTasks((prev) =>
          prev.map((t) =>
            t.id === nextTask.id
              ? {
                  ...t,
                  status: isAborted ? 'cancelled' : 'error',
                  stage: isAborted ? 'Импорт отменён' : 'Не удалось импортировать файл',
                  error: isAborted
                    ? undefined
                    : err instanceof Error
                    ? err.message
                    : 'Проверьте формат или целостность файла',
                }
              : t
          )
        );
      } finally {
        controllersRef.current.delete(nextTask.id);
        processingRef.current = false;
      }
    })();
  }, [tasks, importSingleFile, onImported, showToast]);

  const cancelTask = (taskId: string) => {
    const ctrl = controllersRef.current.get(taskId);
    if (ctrl) {
      ctrl.abort();
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId && (t.status === 'queued' || t.status === 'importing')
          ? {...t, status: 'cancelled', stage: 'Импорт отменён'}
          : t
      )
    );
  };

  const retryTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'queued',
              progress: 0,
              stage: 'Повторная загрузка в очереди…',
              error: undefined,
            }
          : t
      )
    );
  };

  const anyImporting = tasks.some((t) => t.status === 'importing' || t.status === 'queued');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border p-5 sm:p-7 shadow-2xl max-h-[90vh] flex flex-col"
        style={{
          backgroundColor: 'var(--site-surface)',
          borderColor: 'var(--site-border)',
          color: 'var(--site-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
          <div>
            <h2 className="font-display text-2xl font-semibold">Добавить книги</h2>
            <p className="text-xs mt-0.5 leading-relaxed" style={{color: 'var(--site-text-muted)'}}>
              EPUB, PDF, FB2, MOBI, AZW / AZW3, TXT, DOC / DOCX, RTF, HTML, CBR / CBZ, ZIP
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden Inputs (mobile-safe accept to avoid OS greying out .fb2/.azw3 in Downloads or Drive) */}
        <input
          ref={singleInputRef}
          type="file"
          accept={isTouch ? undefined : DESKTOP_ACCEPTED_EXTS}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) enqueueFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={multiInputRef}
          type="file"
          multiple
          accept={isTouch ? undefined : DESKTOP_ACCEPTED_EXTS}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) enqueueFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Quick Mobile & Desktop Picker Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => singleInputRef.current?.click()}
            className="flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--site-accent)',
              color: 'var(--site-accent-contrast)',
            }}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            Выбрать файл на устройстве
          </button>

          <button
            type="button"
            onClick={() => multiInputRef.current?.click()}
            className="flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{borderColor: 'var(--site-border)'}}
          >
            <BookPlus className="w-4 h-4 shrink-0" />
            Загрузить несколько книг
          </button>
        </div>

        {/* Drag & Drop Zone (Desktop & Tablet) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length > 0) {
              enqueueFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => multiInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-5 sm:p-6 text-center cursor-pointer transition-all shrink-0 ${
            dragging ? 'scale-[1.01]' : ''
          }`}
          style={{
            borderColor: dragging ? 'var(--site-accent)' : 'var(--site-border)',
            backgroundColor: dragging ? 'var(--site-surface-alt)' : 'var(--site-bg)',
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{backgroundColor: 'var(--site-surface-alt)'}}
            >
              <FileUp className="w-5 h-5" style={{color: 'var(--site-accent)'}} />
            </div>
            <p className="text-xs sm:text-sm font-medium">
              {isTouch
                ? 'Нажмите, чтобы выбрать книги из памяти телефона или Google Диска'
                : 'Перетащите файлы сюда или нажмите для выбора'}
            </p>
            <p className="text-[11px]" style={{color: 'var(--site-text-muted)'}}>
              Файлы, обложки и прогресс сохраняются прямо в вашем аккаунте
            </p>
          </div>
        </div>

        {/* Per-File Import Queue with Progress %, Cancel, Retry & Read CTA */}
        {tasks.length > 0 && (
          <div className="mt-4 space-y-2.5 overflow-y-auto pr-0.5 flex-1 min-h-0">
            <div className="flex items-center justify-between text-xs" style={{color: 'var(--site-text-muted)'}}>
              <span>Процесс загрузки ({tasks.length})</span>
              {anyImporting && <span>Импорт выполняется…</span>}
            </div>

            {tasks.map((task) => {
              const firstBook = task.books[0];
              return (
                <div
                  key={task.id}
                  className="rounded-xl border p-3.5 space-y-2.5"
                  style={{
                    backgroundColor: 'var(--site-bg)',
                    borderColor:
                      task.status === 'error'
                        ? 'rgba(225, 29, 72, 0.35)'
                        : task.status === 'done'
                        ? 'rgba(16, 185, 129, 0.35)'
                        : 'var(--site-border)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {task.status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      ) : task.status === 'error' ? (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      ) : task.status === 'cancelled' ? (
                        <XCircle className="w-4 h-4 shrink-0 opacity-50 mt-0.5" />
                      ) : (
                        <Loader2
                          className="w-4 h-4 shrink-0 animate-spin mt-0.5"
                          style={{color: 'var(--site-accent)'}}
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {firstBook ? firstBook.title : task.file.name}
                        </p>
                        <p className="text-[11px] truncate" style={{color: 'var(--site-text-muted)'}}>
                          {firstBook
                            ? `${firstBook.author} · ${firstBook.format} · ${firstBook.totalPages} стр.`
                            : `${formatBytes(task.file.size)} · ${task.stage}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(task.status === 'queued' || task.status === 'importing') && (
                        <>
                          <span className="font-mono-num text-xs font-semibold">
                            {task.progress}%
                          </span>
                          <button
                            type="button"
                            onClick={() => cancelTask(task.id)}
                            className="px-2.5 py-1 rounded-lg border text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5"
                            style={{borderColor: 'var(--site-border)'}}
                          >
                            Отменить
                          </button>
                        </>
                      )}

                      {(task.status === 'error' || task.status === 'cancelled') && (
                        <button
                          type="button"
                          onClick={() => retryTask(task.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5"
                          style={{borderColor: 'var(--site-border)'}}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Повторить
                        </button>
                      )}

                      {task.status === 'done' && firstBook && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            openBookInReader(firstBook.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--site-accent)',
                            color: 'var(--site-accent-contrast)',
                          }}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Читать
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(task.status === 'queued' || task.status === 'importing') && (
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{backgroundColor: 'var(--site-surface-alt)'}}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${Math.max(5, task.progress)}%`,
                          backgroundColor: 'var(--site-accent)',
                        }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {task.error && (
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                      {task.error}
                    </p>
                  )}

                  {/* Multi-book inside ZIP */}
                  {task.books.length > 1 && (
                    <div className="pt-1.5 border-t space-y-1.5" style={{borderColor: 'var(--site-border)'}}>
                      <p className="text-[11px]" style={{color: 'var(--site-text-muted)'}}>
                        Из архива добавлено книг: {task.books.length}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {task.books.slice(1).map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              onClose();
                              openBookInReader(b.id);
                            }}
                            className="px-2.5 py-1 rounded-lg border text-[11px] font-medium truncate max-w-[200px]"
                            style={{borderColor: 'var(--site-border)'}}
                          >
                            Читать: {b.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t flex justify-end gap-2 shrink-0" style={{borderColor: 'var(--site-border)'}}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: 'var(--site-accent)',
              color: 'var(--site-accent-contrast)',
            }}
          >
            {anyImporting ? 'Свернуть' : 'Готово'}
          </button>
        </div>
      </div>
    </div>
  );
};

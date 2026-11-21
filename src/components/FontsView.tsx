import React, {useRef, useState} from 'react';
import {Check, Plus, Trash2, Type} from 'lucide-react';
import {BUILT_IN_FONTS} from '../constants/themes';
import {useLibrary} from '../context/LibraryContext';
import {getFontCssName} from '../utils/fontLoader';

export const FontsView: React.FC = () => {
  const {customFonts, settings, addCustomFont, deleteCustomFont, updateSettings, showToast} =
    useLibrary();
  const [sampleText, setSampleText] = useState(
    'Вечерний свет ложится на страницы старой книги, и каждая буква звучит особенно ясно.'
  );
  const [fontNameInput, setFontNameInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await addCustomFont(file, fontNameInput || undefined);
    setFontNameInput('');
  };

  const applyBodyFont = (cssFamily: string) => {
    updateSettings((prev) => ({
      ...prev,
      reader: {...prev.reader, fontFamily: cssFamily},
    }));
    showToast('Основной шрифт чтения обновлён');
  };

  const applyHeadingFont = (cssFamily: string) => {
    updateSettings((prev) => ({
      ...prev,
      reader: {...prev.reader, headingFontFamily: cssFamily},
    }));
    showToast('Шрифт заголовков обновлён');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Мои шрифты</h1>
          <p className="text-xs mt-1" style={{color: 'var(--site-text-muted)'}}>
            Загружайте собственные шрифты TTF, OTF, WOFF и WOFF2 — они сохраняются навсегда и доступны в читалке
          </p>
        </div>
      </div>

      {/* Upload & Typography Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div
          className="lg:col-span-5 rounded-2xl border p-5 space-y-4"
          style={{
            backgroundColor: 'var(--site-surface)',
            borderColor: 'var(--site-border)',
            boxShadow: 'var(--site-shadow)',
          }}
        >
          <h2 className="font-display text-xl font-semibold">Загрузить новый шрифт</h2>
          <input
            value={fontNameInput}
            onChange={(e) => setFontNameInput(e.target.value)}
            placeholder="Название шрифта (необязательно)"
            className="w-full rounded-xl border px-3.5 py-2 text-sm outline-none"
            style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
            style={{backgroundColor: 'var(--site-accent)', color: 'var(--site-accent-contrast)'}}
          >
            <Plus className="w-4 h-4" />
            Выбрать файл (.TTF, .OTF, .WOFF, .WOFF2)
          </button>

          <div className="pt-3 border-t space-y-3 text-xs" style={{borderColor: 'var(--site-border)'}}>
            <label className="block">
              <div className="flex justify-between mb-1">
                <span>Размер текста в книге</span>
                <span className="font-mono-num">{settings.reader.fontSize}px</span>
              </div>
              <input
                type="range"
                min={13}
                max={28}
                value={settings.reader.fontSize}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    reader: {...prev.reader, fontSize: Number(e.target.value)},
                  }))
                }
                className="w-full accent-[var(--site-accent)]"
              />
            </label>
            <label className="block">
              <div className="flex justify-between mb-1">
                <span>Межстрочный интервал</span>
                <span className="font-mono-num">{settings.reader.lineHeight}</span>
              </div>
              <input
                type="range"
                min={1.3}
                max={2.2}
                step={0.05}
                value={settings.reader.lineHeight}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    reader: {...prev.reader, lineHeight: Number(e.target.value)},
                  }))
                }
                className="w-full accent-[var(--site-accent)]"
              />
            </label>
            <label className="block">
              <div className="flex justify-between mb-1">
                <span>Межбуквенный интервал</span>
                <span className="font-mono-num">{settings.reader.letterSpacing}em</span>
              </div>
              <input
                type="range"
                min={-0.02}
                max={0.12}
                step={0.01}
                value={settings.reader.letterSpacing}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    reader: {...prev.reader, letterSpacing: Number(e.target.value)},
                  }))
                }
                className="w-full accent-[var(--site-accent)]"
              />
            </label>
          </div>
        </div>

        <div
          className="lg:col-span-7 rounded-2xl border p-5 space-y-3"
          style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
        >
          <label className="block text-xs font-medium opacity-75">
            Демонстрационный текст для проверки начертания
          </label>
          <textarea
            rows={2}
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            className="w-full rounded-xl border p-3 text-sm outline-none"
            style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
          />

          <div className="space-y-3 pt-2">
            {customFonts.map((cf) => {
              const cssFamily = `'${getFontCssName(cf)}', serif`;
              const isBody = settings.reader.fontFamily === cssFamily;
              const isHeading = settings.reader.headingFontFamily === cssFamily;
              return (
                <div
                  key={cf.id}
                  className="rounded-xl border p-4 space-y-2"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 opacity-60" />
                      <span className="font-semibold text-sm">{cf.name}</span>
                      <span className="text-[11px] opacity-60">{cf.format.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        onClick={() => applyBodyFont(cssFamily)}
                        className="px-2.5 py-1 rounded-lg border inline-flex items-center gap-1"
                        style={{
                          borderColor: isBody ? 'var(--site-accent)' : 'var(--site-border)',
                          backgroundColor: isBody ? 'var(--site-accent)' : 'transparent',
                          color: isBody ? 'var(--site-accent-contrast)' : 'inherit',
                        }}
                      >
                        {isBody && <Check className="w-3 h-3" />}
                        Для текста
                      </button>
                      <button
                        onClick={() => applyHeadingFont(cssFamily)}
                        className="px-2.5 py-1 rounded-lg border inline-flex items-center gap-1"
                        style={{
                          borderColor: isHeading ? 'var(--site-accent)' : 'var(--site-border)',
                          backgroundColor: isHeading ? 'var(--site-accent)' : 'transparent',
                          color: isHeading ? 'var(--site-accent-contrast)' : 'inherit',
                        }}
                      >
                        {isHeading && <Check className="w-3 h-3" />}
                        Для заголовков
                      </button>
                      <button
                        onClick={() => deleteCustomFont(cf.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p
                    style={{
                      fontFamily: cssFamily,
                      fontSize: `${settings.reader.fontSize}px`,
                      lineHeight: settings.reader.lineHeight,
                      letterSpacing: `${settings.reader.letterSpacing}em`,
                    }}
                  >
                    {sampleText}
                  </p>
                </div>
              );
            })}

            {BUILT_IN_FONTS.map((f) => {
              const isBody = settings.reader.fontFamily === f.cssFamily;
              const isHeading = settings.reader.headingFontFamily === f.cssFamily;
              return (
                <div
                  key={f.id}
                  className="rounded-xl border p-4 space-y-2"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-sm">{f.name}</span>
                      <span className="text-xs opacity-60 ml-2">{f.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        onClick={() => applyBodyFont(f.cssFamily)}
                        className="px-2.5 py-1 rounded-lg border inline-flex items-center gap-1"
                        style={{
                          borderColor: isBody ? 'var(--site-accent)' : 'var(--site-border)',
                          backgroundColor: isBody ? 'var(--site-accent)' : 'transparent',
                          color: isBody ? 'var(--site-accent-contrast)' : 'inherit',
                        }}
                      >
                        {isBody && <Check className="w-3 h-3" />}
                        Для текста
                      </button>
                      <button
                        onClick={() => applyHeadingFont(f.cssFamily)}
                        className="px-2.5 py-1 rounded-lg border inline-flex items-center gap-1"
                        style={{
                          borderColor: isHeading ? 'var(--site-accent)' : 'var(--site-border)',
                          backgroundColor: isHeading ? 'var(--site-accent)' : 'transparent',
                          color: isHeading ? 'var(--site-accent-contrast)' : 'inherit',
                        }}
                      >
                        {isHeading && <Check className="w-3 h-3" />}
                        Для заголовков
                      </button>
                    </div>
                  </div>
                  <p
                    style={{
                      fontFamily: f.cssFamily,
                      fontSize: `${settings.reader.fontSize}px`,
                      lineHeight: settings.reader.lineHeight,
                      letterSpacing: `${settings.reader.letterSpacing}em`,
                    }}
                  >
                    {sampleText}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

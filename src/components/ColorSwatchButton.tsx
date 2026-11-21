import React, {useMemo, useState} from 'react';
import {Palette, X} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {CHECKERBOARD_BG, parseColorString, rgbaToHex} from '../utils/colorUtils';
import {UnifiedColorPicker} from './UnifiedColorPicker';

interface ColorSwatchButtonProps {
  value: string;
  gradientValue?: string;
  onChange: (color: string, gradient?: string) => void;
  label?: string;
  title?: string;
  enableAlpha?: boolean;
  enableGradient?: boolean;
  compact?: boolean;
  className?: string;
}

export const ColorSwatchButton: React.FC<ColorSwatchButtonProps> = ({
  value,
  gradientValue,
  onChange,
  label,
  title,
  enableAlpha = true,
  enableGradient = false,
  compact = false,
  className = '',
}) => {
  const {userColors, recordRecentColor} = useLibrary();
  const [open, setOpen] = useState(false);

  const matchedUserColor = useMemo(
    () => userColors.find((c) => c.cssValue === value || c.hex.toLowerCase() === value.toLowerCase()),
    [userColors, value]
  );

  const displayHex = useMemo(() => {
    if (gradientValue) return 'Градиент';
    const rgba = parseColorString(value);
    return rgbaToHex(rgba);
  }, [value, gradientValue]);

  const tooltip =
    title ||
    (matchedUserColor
      ? `${matchedUserColor.name} (${matchedUserColor.hex})`
      : `${label ? `${label}: ` : ''}${displayHex}`);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors whitespace-nowrap shrink-0 ${className}`}
        style={{
          backgroundColor: 'var(--site-bg)',
          borderColor: 'var(--site-border)',
          color: 'var(--site-text)',
        }}
        title={tooltip}
      >
        <span
          className="w-5 h-5 rounded-lg border shrink-0 relative overflow-hidden"
          style={{borderColor: 'rgba(0,0,0,0.2)', background: CHECKERBOARD_BG}}
        >
          <span
            className="absolute inset-0"
            style={{background: gradientValue || value}}
          />
        </span>
        {!compact && (
          <span className="truncate max-w-[110px]">
            {label ? `${label} · ` : ''}
            <span className="font-mono-num opacity-80">{displayHex}</span>
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border p-4 shadow-2xl space-y-3"
            style={{
              backgroundColor: 'var(--site-surface)',
              borderColor: 'var(--site-border)',
              color: 'var(--site-text)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Palette className="w-4 h-4 shrink-0" style={{color: 'var(--site-accent)'}} />
                <span className="font-display text-lg font-semibold truncate">
                  {label || 'Выбор цвета'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <UnifiedColorPicker
              value={value}
              gradientValue={gradientValue}
              enableAlpha={enableAlpha}
              enableGradient={enableGradient}
              onChange={(nextColor, nextGradient) => {
                onChange(nextColor, nextGradient);
              }}
            />

            <div className="pt-2 border-t flex justify-end" style={{borderColor: 'var(--site-border)'}}>
              <button
                type="button"
                onClick={() => {
                  recordRecentColor(value);
                  setOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-medium"
                style={{
                  backgroundColor: 'var(--site-accent)',
                  color: 'var(--site-accent-contrast)',
                }}
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

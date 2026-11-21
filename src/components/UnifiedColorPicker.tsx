import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Check, Copy, Plus, Sparkles, Star} from 'lucide-react';
import {useLibrary} from '../context/LibraryContext';
import {
  buildLinearGradient,
  CHECKERBOARD_BG,
  clamp,
  copyTextSafe,
  hslToRgb,
  hsvToRgb,
  normalizeHexInput,
  parseColorString,
  parseLinearGradient,
  RGBA,
  rgbaToCss,
  rgbaToHex,
  rgbToHsl,
  rgbToHsv,
} from '../utils/colorUtils';

export interface UnifiedColorPickerProps {
  value: string; // HEX or rgba(...)
  gradientValue?: string; // optional linear-gradient(...)
  onChange: (nextColor: string, nextGradient?: string) => void;
  enableAlpha?: boolean;
  enableGradient?: boolean;
  showSavedStrip?: boolean;
  showSaveToLibrary?: boolean;
  compact?: boolean;
}

export const UnifiedColorPicker: React.FC<UnifiedColorPickerProps> = ({
  value,
  gradientValue,
  onChange,
  enableAlpha = true,
  enableGradient = false,
  showSavedStrip = true,
  showSaveToLibrary = true,
  compact = false,
}) => {
  const {
    userColors,
    userColorPalettes,
    recentColors,
    saveUserColor,
    recordRecentColor,
    showToast,
  } = useLibrary();

  const initialGradient = useMemo(() => parseLinearGradient(gradientValue), [gradientValue]);
  const [mode, setMode] = useState<'solid' | 'gradient'>(
    enableGradient && initialGradient ? 'gradient' : 'solid'
  );
  const [gradAngle, setGradAngle] = useState<number>(initialGradient?.angle ?? 135);
  const [gradStop1, setGradStop1] = useState<string>(initialGradient?.stop1 || value || '#FAF0CA');
  const [gradStop2, setGradStop2] = useState<string>(initialGradient?.stop2 || '#F3D4D8');
  const [activeStop, setActiveStop] = useState<1 | 2>(1);

  const activeColorInput = mode === 'gradient' ? (activeStop === 1 ? gradStop1 : gradStop2) : value;
  const parsedRgba = useMemo(() => parseColorString(activeColorInput), [activeColorInput]);
  const hsv = useMemo(() => rgbToHsv(parsedRgba.r, parsedRgba.g, parsedRgba.b), [parsedRgba]);
  const hsl = useMemo(() => rgbToHsl(parsedRgba.r, parsedRgba.g, parsedRgba.b), [parsedRgba]);

  const [hue, setHue] = useState<number>(hsv.h);
  const [hexDraft, setHexDraft] = useState<string>(rgbaToHex(parsedRgba));
  const [copied, setCopied] = useState(false);

  // Palette filter inside quick swatches
  const [paletteFilter, setPaletteFilter] = useState<string>('all');

  // Inline save to "Мои цвета"
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savePaletteId, setSavePaletteId] = useState(
    userColorPalettes.find((p) => p.id === 'pal_custom')?.id || userColorPalettes[0]?.id || 'pal_custom'
  );

  // Sync hue when external value changes meaningfully (avoid jumping when s=0 or v=0)
  useEffect(() => {
    setHexDraft(rgbaToHex(parsedRgba));
    if (hsv.s > 2 && hsv.v > 2) {
      setHue(hsv.h);
    }
  }, [parsedRgba, hsv.h, hsv.s, hsv.v]);

  const svCanvasRef = useRef<HTMLDivElement>(null);
  const draggingSvRef = useRef(false);

  const emitColor = (nextRgba: RGBA, nextHue?: number) => {
    if (nextHue !== undefined) setHue(nextHue);
    const clamped: RGBA = {
      r: clamp(Math.round(nextRgba.r), 0, 255),
      g: clamp(Math.round(nextRgba.g), 0, 255),
      b: clamp(Math.round(nextRgba.b), 0, 255),
      a: enableAlpha ? clamp(Number(nextRgba.a.toFixed(2)), 0, 1) : 1,
    };
    const css = rgbaToCss(clamped);
    if (mode === 'gradient' && enableGradient) {
      const s1 = activeStop === 1 ? css : gradStop1;
      const s2 = activeStop === 2 ? css : gradStop2;
      if (activeStop === 1) setGradStop1(css);
      else setGradStop2(css);
      const gCss = buildLinearGradient(gradAngle, s1, s2);
      onChange(s1, gCss);
    } else {
      onChange(css, undefined);
    }
  };

  const handleSvPointer = (clientX: number, clientY: number) => {
    const box = svCanvasRef.current?.getBoundingClientRect();
    if (!box) return;
    const xPct = clamp(((clientX - box.left) / box.width) * 100, 0, 100);
    const yPct = clamp(((clientY - box.top) / box.height) * 100, 0, 100);
    const sat = xPct;
    const val = 100 - yPct;
    const rgb = hsvToRgb(hue, sat, val);
    emitColor({...rgb, a: parsedRgba.a});
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingSvRef.current) return;
      handleSvPointer(e.clientX, e.clientY);
    };
    const onUp = () => {
      draggingSvRef.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  });

  const handleHueChange = (nextH: number) => {
    setHue(nextH);
    const rgb = hsvToRgb(nextH, hsv.s || 65, hsv.v || 80);
    emitColor({...rgb, a: parsedRgba.a}, nextH);
  };

  const handleAlphaChange = (nextA: number) => {
    emitColor({...parsedRgba, a: nextA});
  };

  const handleHexCommit = (rawHex: string) => {
    setHexDraft(rawHex);
    const normalized = normalizeHexInput(rawHex);
    if (normalized) {
      const rgb = parseColorString(normalized);
      emitColor({...rgb, a: parsedRgba.a});
    }
  };

  const handleRgbInput = (channel: 'r' | 'g' | 'b', val: number) => {
    const next = {...parsedRgba, [channel]: clamp(val, 0, 255)};
    emitColor(next);
  };

  const handleHslInput = (channel: 'h' | 's' | 'l', val: number) => {
    const nextHsl = {
      h: channel === 'h' ? ((val % 360) + 360) % 360 : hsl.h,
      s: channel === 's' ? clamp(val, 0, 100) : hsl.s,
      l: channel === 'l' ? clamp(val, 0, 100) : hsl.l,
    };
    const rgb = hslToRgb(nextHsl.h, nextHsl.s, nextHsl.l);
    emitColor({...rgb, a: parsedRgba.a}, nextHsl.h);
  };

  const handleGradientAngleChange = (angle: number) => {
    setGradAngle(angle);
    if (mode === 'gradient' && enableGradient) {
      onChange(gradStop1, buildLinearGradient(angle, gradStop1, gradStop2));
    }
  };

  const handleModeSwitch = (nextMode: 'solid' | 'gradient') => {
    setMode(nextMode);
    if (nextMode === 'gradient' && enableGradient) {
      const s1 = value || gradStop1;
      setGradStop1(s1);
      onChange(s1, buildLinearGradient(gradAngle, s1, gradStop2));
    } else {
      onChange(gradStop1 || value, undefined);
    }
  };

  const handleSaveNewColor = async (e: React.FormEvent) => {
    e.preventDefault();
    const hex = rgbaToHex(parsedRgba);
    const css = rgbaToCss(parsedRgba);
    const grad =
      mode === 'gradient' && enableGradient
        ? buildLinearGradient(gradAngle, gradStop1, gradStop2)
        : undefined;
    const now = Date.now();
    await saveUserColor({
      id: `uc_${now}_${Math.random().toString(36).slice(2, 6)}`,
      name: saveName.trim() || `Оттенок ${hex}`,
      hex,
      alpha: enableAlpha ? parsedRgba.a : 1,
      cssValue: css,
      gradientCss: grad,
      paletteId: savePaletteId || 'pal_custom',
      pinned: false,
      createdAt: now,
      updatedAt: now,
    });
    recordRecentColor(css);
    setSaveName('');
    setShowSaveForm(false);
    showToast('Цвет сохранён в «Мои цвета»');
  };

  const handleCopyHex = async () => {
    const text =
      mode === 'gradient' && enableGradient
        ? buildLinearGradient(gradAngle, gradStop1, gradStop2)
        : parsedRgba.a < 0.995
        ? rgbaToCss(parsedRgba)
        : rgbaToHex(parsedRgba);
    const ok = await copyTextSafe(text);
    if (ok) {
      setCopied(true);
      showToast(`Скопировано: ${text}`);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const pinnedColors = useMemo(() => userColors.filter((c) => c.pinned), [userColors]);
  const visibleSavedColors = useMemo(() => {
    if (paletteFilter === 'all') return userColors;
    if (paletteFilter === 'pinned') return pinnedColors;
    return userColors.filter((c) => c.paletteId === paletteFilter);
  }, [userColors, pinnedColors, paletteFilter]);

  const pureHueColor = `hsl(${hue}, 100%, 50%)`;
  const currentPreviewCss =
    mode === 'gradient' && enableGradient
      ? buildLinearGradient(gradAngle, gradStop1, gradStop2)
      : rgbaToCss(parsedRgba);

  return (
    <div className={`space-y-3 text-xs ${compact ? 'w-full' : ''}`}>
      {/* Solid vs Gradient Switcher */}
      {enableGradient && (
        <div
          className="grid grid-cols-2 p-1 rounded-xl border"
          style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
        >
          <button
            type="button"
            onClick={() => handleModeSwitch('solid')}
            className={`py-1.5 rounded-lg font-medium transition-colors ${
              mode === 'solid' ? 'shadow-xs' : 'opacity-65 hover:opacity-100'
            }`}
            style={
              mode === 'solid'
                ? {backgroundColor: 'var(--site-surface)', color: 'var(--site-text)'}
                : undefined
            }
          >
            Сплошной цвет
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('gradient')}
            className={`py-1.5 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-1 ${
              mode === 'gradient' ? 'shadow-xs' : 'opacity-65 hover:opacity-100'
            }`}
            style={
              mode === 'gradient'
                ? {backgroundColor: 'var(--site-surface)', color: 'var(--site-text)'}
                : undefined
            }
          >
            <Sparkles className="w-3 h-3" /> Градиент
          </button>
        </div>
      )}

      {/* Gradient Stops & Angle */}
      {mode === 'gradient' && enableGradient && (
        <div
          className="rounded-xl border p-2.5 space-y-2"
          style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveStop(1)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
                  activeStop === 1 ? 'ring-2 ring-[var(--site-accent)]' : 'opacity-75'
                }`}
                style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-surface)'}}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border"
                  style={{backgroundColor: gradStop1, borderColor: 'rgba(0,0,0,0.2)'}}
                />
                Цвет 1
              </button>
              <button
                type="button"
                onClick={() => setActiveStop(2)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
                  activeStop === 2 ? 'ring-2 ring-[var(--site-accent)]' : 'opacity-75'
                }`}
                style={{borderColor: 'var(--site-border)', backgroundColor: 'var(--site-surface)'}}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border"
                  style={{backgroundColor: gradStop2, borderColor: 'rgba(0,0,0,0.2)'}}
                />
                Цвет 2
              </button>
            </div>
            <span className="font-mono-num opacity-75">{gradAngle}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={gradAngle}
            onChange={(e) => handleGradientAngleChange(Number(e.target.value))}
            className="w-full accent-[var(--site-accent)]"
            aria-label="Угол градиента"
          />
        </div>
      )}

      {/* 2D Saturation / Brightness Field */}
      <div
        ref={svCanvasRef}
        onPointerDown={(e) => {
          e.preventDefault();
          draggingSvRef.current = true;
          handleSvPointer(e.clientX, e.clientY);
        }}
        className={`relative w-full ${compact ? 'h-32' : 'h-40'} rounded-xl overflow-hidden cursor-crosshair select-none border`}
        style={{
          backgroundColor: pureHueColor,
          backgroundImage:
            'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
          borderColor: 'var(--site-border)',
          touchAction: 'none',
        }}
      >
        <div
          className="w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.55)] -translate-x-1/2 -translate-y-1/2 pointer-events-none absolute"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: rgbaToHex({...parsedRgba, a: 1}),
          }}
        />
      </div>

      {/* Hue + Alpha Sliders + Live Preview Swatch */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl border shrink-0 overflow-hidden relative shadow-xs"
          style={{borderColor: 'var(--site-border)', background: CHECKERBOARD_BG}}
        >
          <div className="absolute inset-0" style={{background: currentPreviewCss}} />
        </div>

        <div className="flex-1 space-y-2">
          {/* Hue Track */}
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => handleHueChange(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer border"
              style={{
                borderColor: 'var(--site-border)',
                background:
                  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
              }}
              aria-label="Оттенок (Hue)"
            />
          </div>

          {/* Opacity / Alpha Track */}
          {enableAlpha && (
            <div className="flex items-center gap-2">
              <div
                className="flex-1 relative h-3 rounded-full overflow-hidden border flex items-center"
                style={{borderColor: 'var(--site-border)', background: CHECKERBOARD_BG}}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(to right, transparent, ${rgbaToHex({
                      ...parsedRgba,
                      a: 1,
                    })})`,
                  }}
                />
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={parsedRgba.a}
                  onChange={(e) => handleAlphaChange(Number(e.target.value))}
                  className="relative z-10 w-full h-full opacity-90 cursor-pointer accent-[var(--site-accent)] bg-transparent"
                  aria-label="Прозрачность"
                />
              </div>
              <span className="font-mono-num w-9 text-right text-[11px] opacity-80">
                {Math.round(parsedRgba.a * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* HEX + Copy + RGB + HSL Inputs */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <div
            className="flex-1 flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5"
            style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
          >
            <span className="text-[10px] font-semibold opacity-60">HEX</span>
            <input
              value={hexDraft}
              onChange={(e) => handleHexCommit(e.target.value)}
              placeholder="#C8A2C8"
              maxLength={7}
              className="w-full bg-transparent font-mono-num text-xs outline-none uppercase"
            />
          </div>
          <button
            type="button"
            onClick={handleCopyHex}
            className="px-2.5 py-1.5 rounded-xl border inline-flex items-center gap-1 font-medium hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
            style={{borderColor: 'var(--site-border)'}}
            title="Скопировать код цвета"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Скопировано' : 'Копия'}</span>
          </button>
        </div>

        {/* RGB & HSL grid */}
        <div className="grid grid-cols-6 gap-1 text-[10px]">
          {(
            [
              ['R', parsedRgba.r, 255, (v: number) => handleRgbInput('r', v)],
              ['G', parsedRgba.g, 255, (v: number) => handleRgbInput('g', v)],
              ['B', parsedRgba.b, 255, (v: number) => handleRgbInput('b', v)],
              ['H', hsl.h, 360, (v: number) => handleHslInput('h', v)],
              ['S', hsl.s, 100, (v: number) => handleHslInput('s', v)],
              ['L', hsl.l, 100, (v: number) => handleHslInput('l', v)],
            ] as const
          ).map(([lbl, num, maxVal, handler]) => (
            <label
              key={lbl}
              className="rounded-lg border px-1.5 py-1 flex flex-col items-center"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            >
              <span className="opacity-55 font-semibold">{lbl}</span>
              <input
                type="number"
                min={0}
                max={maxVal}
                value={num}
                onChange={(e) => handler(Number(e.target.value))}
                className="w-full text-center bg-transparent font-mono-num outline-none"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Save directly to "Мои цвета" */}
      {showSaveToLibrary && (
        <div className="pt-1">
          {!showSaveForm ? (
            <button
              type="button"
              onClick={() => setShowSaveForm(true)}
              className="w-full py-1.5 px-3 rounded-xl border border-dashed text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
              style={{borderColor: 'var(--site-accent)', color: 'var(--site-accent)'}}
            >
              <Plus className="w-3.5 h-3.5" /> Сохранить этот оттенок в «Мои цвета»
            </button>
          ) : (
            <form
              onSubmit={handleSaveNewColor}
              className="rounded-xl border p-2.5 space-y-2"
              style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
            >
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Название цвета (напр. Сумеречная лаванда)"
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
                autoFocus
              />
              <div className="flex items-center gap-1.5">
                <select
                  value={savePaletteId}
                  onChange={(e) => setSavePaletteId(e.target.value)}
                  className="flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none"
                  style={{backgroundColor: 'var(--site-surface)', borderColor: 'var(--site-border)'}}
                >
                  {userColorPalettes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowSaveForm(false)}
                  className="px-2.5 py-1.5 rounded-lg border text-xs"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--site-accent)',
                    color: 'var(--site-accent-contrast)',
                  }}
                >
                  Сохранить
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Saved User Palette & Recent Colors Strip */}
      {showSavedStrip && (userColors.length > 0 || recentColors.length > 0) && (
        <div
          className="pt-2.5 border-t space-y-2"
          style={{borderColor: 'var(--site-border)'}}
        >
          {recentColors.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-medium opacity-70 block">Недавние</span>
              <div className="flex flex-wrap gap-1.5">
                {recentColors.slice(0, 8).map((rc, idx) => (
                  <button
                    key={`${rc}_${idx}`}
                    type="button"
                    onClick={() => {
                      onChange(rc, undefined);
                      setMode('solid');
                    }}
                    className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
                      value === rc ? 'ring-2 ring-[var(--site-accent)]' : ''
                    }`}
                    style={{
                      background: `${rc}`,
                      borderColor: 'rgba(0,0,0,0.18)',
                    }}
                    title={`Недавний: ${rc}`}
                  />
                ))}
              </div>
            </div>
          )}

          {userColors.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium opacity-70">Мои цвета</span>
                <select
                  value={paletteFilter}
                  onChange={(e) => setPaletteFilter(e.target.value)}
                  className="rounded-lg border px-2 py-0.5 text-[11px] outline-none"
                  style={{backgroundColor: 'var(--site-bg)', borderColor: 'var(--site-border)'}}
                >
                  <option value="all">Все ({userColors.length})</option>
                  {pinnedColors.length > 0 && (
                    <option value="pinned">★ Избранные ({pinnedColors.length})</option>
                  )}
                  {userColorPalettes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-0.5">
                {visibleSavedColors.map((uc) => {
                  const selected =
                    (uc.gradientCss && gradientValue === uc.gradientCss) ||
                    (!uc.gradientCss && value === uc.cssValue);
                  return (
                    <button
                      key={uc.id}
                      type="button"
                      onClick={() => {
                        if (uc.gradientCss && enableGradient) {
                          const parsed = parseLinearGradient(uc.gradientCss);
                          if (parsed) {
                            setMode('gradient');
                            setGradAngle(parsed.angle);
                            setGradStop1(parsed.stop1);
                            setGradStop2(parsed.stop2);
                          }
                          onChange(uc.cssValue, uc.gradientCss);
                        } else {
                          setMode('solid');
                          onChange(uc.cssValue, undefined);
                        }
                        recordRecentColor(uc.cssValue);
                      }}
                      className={`relative w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
                        selected ? 'ring-2 ring-[var(--site-accent)] scale-110' : ''
                      }`}
                      style={{
                        background: uc.gradientCss || uc.cssValue,
                        borderColor: 'rgba(0,0,0,0.2)',
                      }}
                      title={`${uc.name} (${uc.hex})`}
                    >
                      {uc.pinned && (
                        <Star
                          className="w-2.5 h-2.5 absolute -top-1 -right-1 text-amber-500"
                          fill="currentColor"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

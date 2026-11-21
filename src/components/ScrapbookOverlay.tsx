import React, {useEffect, useRef, useState} from 'react';
import {
  Copy,
  Lock,
  MoveDiagonal2,
  RotateCw,
  Trash2,
  Unlock,
} from 'lucide-react';
import {WASHI_TAPE_STYLES} from '../constants/themes';
import {
  DrawingStroke,
  ScrapbookDrawingItem,
  ScrapbookItem,
  ScrapbookNoteItem,
  ScrapbookPhotoItem,
  ScrapbookStickerItem,
  ScrapbookWashiItem,
} from '../types/library';
import {parseColorString, rgbaToCss} from '../utils/colorUtils';
import {PaperclipSvg} from './PaperclipSvg';

export interface DrawingBrushConfig {
  active: boolean;
  tool: 'pencil' | 'pen' | 'marker' | 'highlighter' | 'brush' | 'eraser';
  color: string;
  width: number;
  opacity: number;
}

interface ScrapbookOverlayProps {
  items: ScrapbookItem[];
  scrapbookActive: boolean;
  lockAllMobile: boolean;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onUpdateItem: (item: ScrapbookItem, pushHistory?: boolean) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (item: ScrapbookItem) => void;
  drawingConfig: DrawingBrushConfig;
  bookId: string;
  pageIndex: number;
  animateItems: boolean;
}

function strokesToSvgPath(points: {x: number; y: number}[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export const ScrapbookOverlay: React.FC<ScrapbookOverlayProps> = ({
  items,
  scrapbookActive,
  lockAllMobile,
  selectedIds,
  onSelectIds,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  drawingConfig,
  bookId,
  pageIndex,
  animateItems,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [liveStroke, setLiveStroke] = useState<DrawingStroke | null>(null);

  // Drag/resize/rotate interaction state
  const interactionRef = useRef<{
    kind: 'drag' | 'resize' | 'rotate';
    item: ScrapbookItem;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origRot: number;
    centerPxX: number;
    centerPxY: number;
  } | null>(null);

  const [draftOverride, setDraftOverride] = useState<Record<string, Partial<ScrapbookItem>>>({});

  const visibleItems = [...items]
    .filter((i) => !i.hidden)
    .sort((a, b) => a.zIndex - b.zIndex);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const act = interactionRef.current;
      const box = containerRef.current?.getBoundingClientRect();
      if (!act || !box) return;

      const dxPct = ((e.clientX - act.startX) / box.width) * 100;
      const dyPct = ((e.clientY - act.startY) / box.height) * 100;

      if (act.kind === 'drag') {
        const nextX = Math.max(-10, Math.min(92, act.origX + dxPct));
        const nextY = Math.max(-5, Math.min(94, act.origY + dyPct));
        setDraftOverride({[act.item.id]: {x: nextX, y: nextY}});
      } else if (act.kind === 'resize') {
        const nextW = Math.max(6, Math.min(95, act.origW + dxPct));
        const nextH = Math.max(3, Math.min(90, act.origH + dyPct));
        setDraftOverride({[act.item.id]: {width: nextW, height: nextH}});
      } else if (act.kind === 'rotate') {
        const angle =
          (Math.atan2(e.clientY - act.centerPxY, e.clientX - act.centerPxX) * 180) / Math.PI + 90;
        setDraftOverride({[act.item.id]: {rotation: Math.round(angle)}});
      }
    };

    const onPointerUp = () => {
      const act = interactionRef.current;
      if (!act) return;
      const patch = draftOverride[act.item.id];
      interactionRef.current = null;
      if (patch) {
        onUpdateItem({...act.item, ...patch, updatedAt: Date.now()} as ScrapbookItem, true);
        setDraftOverride({});
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [draftOverride, onUpdateItem]);

  const startInteraction = (
    e: React.PointerEvent,
    kind: 'drag' | 'resize' | 'rotate',
    item: ScrapbookItem
  ) => {
    if (!scrapbookActive || lockAllMobile || item.locked || drawingConfig.active) return;
    if (editingNoteId === item.id) return;
    e.stopPropagation();
    e.preventDefault();

    const box = containerRef.current?.getBoundingClientRect();
    const centerPxX = box ? box.left + ((item.x + item.width / 2) / 100) * box.width : e.clientX;
    const centerPxY = box ? box.top + ((item.y + item.height / 2) / 100) * box.height : e.clientY;

    if (e.shiftKey) {
      onSelectIds(
        selectedIds.includes(item.id)
          ? selectedIds.filter((id) => id !== item.id)
          : [...selectedIds, item.id]
      );
    } else if (!selectedIds.includes(item.id)) {
      onSelectIds([item.id]);
    }

    interactionRef.current = {
      kind,
      item,
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
      origW: item.width,
      origH: item.height,
      origRot: item.rotation,
      centerPxX,
      centerPxY,
    };
  };

  // Freehand Drawing Handlers
  const getNormalizedPoint = (e: React.PointerEvent) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return {x: 0, y: 0};
    return {
      x: Number((((e.clientX - box.left) / box.width) * 1000).toFixed(1)),
      y: Number((((e.clientY - box.top) / box.height) * 1000).toFixed(1)),
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (!scrapbookActive) return;
    if (!drawingConfig.active) {
      if (e.target === containerRef.current) {
        onSelectIds([]);
        setEditingNoteId(null);
      }
      return;
    }

    e.stopPropagation();
    const pt = getNormalizedPoint(e);
    if (drawingConfig.tool === 'eraser') {
      // Erase strokes near cursor from existing drawing items
      const drawings = items.filter((i): i is ScrapbookDrawingItem => i.type === 'drawing');
      for (const d of drawings) {
        const remaining = d.strokes.filter(
          (st) => !st.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 35)
        );
        if (remaining.length !== d.strokes.length) {
          if (remaining.length === 0) onDeleteItem(d.id);
          else onUpdateItem({...d, strokes: remaining, updatedAt: Date.now()}, true);
        }
      }
      return;
    }

    const opacity =
      drawingConfig.tool === 'highlighter'
        ? Math.min(0.45, drawingConfig.opacity)
        : drawingConfig.tool === 'pencil'
        ? Math.min(0.75, drawingConfig.opacity)
        : drawingConfig.opacity;

    setLiveStroke({
      tool: drawingConfig.tool,
      color: drawingConfig.color,
      width:
        drawingConfig.tool === 'highlighter'
          ? drawingConfig.width * 3.2
          : drawingConfig.tool === 'marker'
          ? drawingConfig.width * 2
          : drawingConfig.width,
      opacity,
      points: [pt],
    });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!drawingConfig.active || !liveStroke) return;
    const pt = getNormalizedPoint(e);
    setLiveStroke((prev) => (prev ? {...prev, points: [...prev.points, pt]} : null));
  };

  const handleCanvasPointerUp = () => {
    if (!drawingConfig.active || !liveStroke) return;
    const stroke = liveStroke;
    setLiveStroke(null);
    if (stroke.points.length < 1) return;

    const existingLayer = items.find((i): i is ScrapbookDrawingItem => i.type === 'drawing');
    if (existingLayer) {
      onUpdateItem(
        {
          ...existingLayer,
          strokes: [...existingLayer.strokes, stroke],
          updatedAt: Date.now(),
        },
        true
      );
    } else {
      const newLayer: ScrapbookDrawingItem = {
        id: `sb_draw_${Date.now()}`,
        bookId,
        pageIndex,
        type: 'drawing',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        zIndex: 8,
        opacity: 1,
        locked: false,
        hidden: false,
        strokes: [stroke],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onUpdateItem(newLayer, true);
    }
  };

  const renderPhoto = (item: ScrapbookPhotoItem) => {
    const frameClasses: Record<ScrapbookPhotoItem['clipFrame'], string> = {
      none: '',
      polaroid: 'bg-white p-2 pb-7 shadow-lg border border-black/10',
      vintage: 'bg-[#F1E6D0] p-2.5 pb-6 shadow-md border border-[#B89F7A]/40',
      white_frame: 'bg-white p-2 shadow-md border border-black/10',
      torn: 'torn-paper-edge shadow-md',
      taped: 'p-1 bg-white shadow-md',
      clipped: 'bg-white p-1.5 shadow-md border border-black/10',
      corners: 'p-1.5 bg-[#FAF7F2] shadow-md border border-black/10',
      paper_back: 'p-3 bg-[#E9DEC9] shadow-md border border-[#9E886B]/30',
    };

    const filterStyle = `brightness(${item.brightness}%) contrast(${item.contrast}%) sepia(${item.sepia}%) blur(${item.blur}px)`;
    const clipAlign =
      item.paperclipPosition === 'top_left'
        ? 'left-3'
        : item.paperclipPosition === 'top_right'
        ? 'right-3'
        : 'left-1/2 -translate-x-1/2';

    return (
      <div
        className={`relative w-full h-full ${frameClasses[item.clipFrame]} ${
          animateItems ? 'anim-paperclip-attach' : ''
        }`}
        style={{
          borderRadius: item.cropShape === 'circle' ? '9999px' : `${item.borderRadius}px`,
          boxShadow: item.shadow ? '0 10px 24px rgba(0,0,0,0.16)' : undefined,
        }}
      >
        {item.paperclipStyle !== 'none' && (
          <PaperclipSvg
            styleType={item.paperclipStyle}
            className={`absolute -top-6 w-6 h-12 z-20 ${clipAlign}`}
          />
        )}
        {item.clipFrame === 'taped' && (
          <div
            className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 h-4 z-20 rotate-[-2deg] opacity-85"
            style={{background: WASHI_TAPE_STYLES.cream.background}}
          />
        )}
        {item.clipFrame === 'corners' && (
          <>
            <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#7C624A] pointer-events-none" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#7C624A] pointer-events-none" />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#7C624A] pointer-events-none" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#7C624A] pointer-events-none" />
          </>
        )}

        <img
          src={item.src}
          alt={item.caption || 'Прикреплённое фото'}
          draggable={false}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover select-none"
          style={{
            borderRadius:
              item.cropShape === 'circle' ? '9999px' : `${Math.max(0, item.borderRadius - 2)}px`,
            transform: item.flipX ? 'scaleX(-1)' : undefined,
            filter: filterStyle,
          }}
        />
        {item.caption && (
          <p className="font-hand text-xs sm:text-sm text-center text-[#3D3128] mt-1 truncate px-1">
            {item.caption}
          </p>
        )}
      </div>
    );
  };

  const renderNote = (item: ScrapbookNoteItem) => {
    const isEditing = editingNoteId === item.id;
    const isTorn = item.noteVariant === 'torn_paper';
    let noteBackground: string = item.bgGradient || item.bgColor;
    if (!item.bgGradient && item.bgOpacity !== undefined && item.bgOpacity < 1) {
      const rgba = parseColorString(item.bgColor);
      noteBackground = rgbaToCss({...rgba, a: Number((rgba.a * item.bgOpacity).toFixed(2))});
    }
    return (
      <div
        onDoubleClick={(e) => {
          if (!scrapbookActive || item.locked) return;
          e.stopPropagation();
          setEditingNoteId(item.id);
        }}
        className={`w-full h-full shadow-md flex flex-col justify-center ${
          isTorn ? 'torn-paper-edge' : 'rounded-xl'
        }`}
        style={{
          background: noteBackground,
          color: item.textColor,
          fontFamily: item.fontFamily,
          fontSize: `${item.fontSize}px`,
          padding: `${item.padding}px`,
          border:
            item.borderStyle === 'dashed'
              ? '1.5px dashed rgba(90,70,50,0.35)'
              : item.borderStyle === 'solid'
              ? '1px solid rgba(90,70,50,0.25)'
              : 'none',
        }}
      >
        {isEditing ? (
          <textarea
            autoFocus
            value={item.text}
            onChange={(e) => onUpdateItem({...item, text: e.target.value, updatedAt: Date.now()})}
            onBlur={() => setEditingNoteId(null)}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full h-full bg-transparent outline-none resize-none leading-snug"
            style={{color: item.textColor, fontFamily: item.fontFamily, fontSize: `${item.fontSize}px`}}
          />
        ) : (
          <p className="whitespace-pre-wrap break-words leading-snug select-none">{item.text}</p>
        )}
      </div>
    );
  };

  const renderSticker = (item: ScrapbookStickerItem) => (
    <div
      className={`w-full h-full flex items-center justify-center select-none ${
        animateItems ? 'anim-sticker-slap' : ''
      }`}
    >
      {item.customImageSrc ? (
        <img
          src={item.customImageSrc}
          alt={item.label}
          draggable={false}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain"
          style={{
            filter: item.tintColor
              ? `drop-shadow(0 3px 10px ${item.tintColor})`
              : 'drop-shadow(0 2px 4px rgba(0,0,0,0.16))',
          }}
        />
      ) : (
        <span
          className="text-4xl sm:text-5xl leading-none"
          style={{
            color: item.tintColor || undefined,
            filter: item.tintColor
              ? `drop-shadow(0 3px 10px ${item.tintColor})`
              : 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
          }}
        >
          {item.emoji || '🌿'}
        </span>
      )}
    </div>
  );

  const renderWashi = (item: ScrapbookWashiItem) => {
    const def = WASHI_TAPE_STYLES[item.pattern] || WASHI_TAPE_STYLES.cream;
    return (
      <div
        className={`w-full h-full shadow-xs ${animateItems ? 'anim-washi-unroll' : ''}`}
        style={{
          background: def.background,
          border: def.border,
          clipPath:
            'polygon(1% 0%, 99% 2%, 98% 25%, 100% 50%, 98% 78%, 99% 98%, 1% 100%, 2% 72%, 0% 45%, 2% 18%)',
        }}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      className={`absolute inset-0 overflow-hidden ${
        scrapbookActive
          ? drawingConfig.active
            ? 'pointer-events-auto cursor-crosshair z-20'
            : 'pointer-events-auto z-20'
          : 'pointer-events-none z-10'
      }`}
      style={{touchAction: drawingConfig.active ? 'none' : 'pan-y'}}
    >
      {/* Vector Drawings Layer */}
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      >
        {visibleItems
          .filter((i): i is ScrapbookDrawingItem => i.type === 'drawing')
          .map((d) =>
            d.strokes.map((st, idx) => (
              <path
                key={`${d.id}_${idx}`}
                d={strokesToSvgPath(st.points)}
                fill="none"
                stroke={st.color}
                strokeWidth={st.width}
                strokeOpacity={st.opacity}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))
          )}
        {liveStroke && (
          <path
            d={strokesToSvgPath(liveStroke.points)}
            fill="none"
            stroke={liveStroke.color}
            strokeWidth={liveStroke.width}
            strokeOpacity={liveStroke.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Independent Layered Elements */}
      {visibleItems
        .filter((i) => i.type !== 'drawing')
        .map((rawItem) => {
          const patch = draftOverride[rawItem.id] || {};
          const item = {...rawItem, ...patch} as ScrapbookItem;
          const isSelected = scrapbookActive && selectedIds.includes(item.id);
          const canInteract = scrapbookActive && !drawingConfig.active;

          return (
            <div
              key={item.id}
              onPointerDown={(e) => startInteraction(e, 'drag', rawItem)}
              onClick={(e) => {
                if (!canInteract) return;
                e.stopPropagation();
                onSelectIds([item.id]);
              }}
              style={{
                position: 'absolute',
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}%`,
                height: `${item.height}%`,
                transform: `rotate(${item.rotation}deg)`,
                opacity: item.opacity,
                zIndex: item.zIndex + (isSelected ? 30 : 0),
                touchAction: item.locked || lockAllMobile ? 'pan-y' : 'none',
              }}
              className={`${
                canInteract
                  ? item.locked || lockAllMobile
                    ? 'pointer-events-auto cursor-default'
                    : 'pointer-events-auto cursor-grab active:cursor-grabbing'
                  : 'pointer-events-none'
              } ${isSelected ? 'ring-2 ring-[var(--site-accent)] ring-offset-2 rounded-lg' : ''}`}
            >
              {item.type === 'photo' && renderPhoto(item)}
              {(item.type === 'note' || item.type === 'paper') && renderNote(item)}
              {item.type === 'sticker' && renderSticker(item)}
              {item.type === 'washi' && renderWashi(item)}

              {/* Selection Handles (Large touch-friendly targets) */}
              {isSelected && !lockAllMobile && (
                <>
                  {/* Top floating quick bar */}
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -top-11 left-0 flex items-center gap-1 rounded-xl border px-1.5 py-1 shadow-lg z-40"
                    style={{
                      backgroundColor: 'var(--site-surface)',
                      borderColor: 'var(--site-border)',
                      color: 'var(--site-text)',
                    }}
                  >
                    <button
                      onClick={() =>
                        onUpdateItem({...rawItem, locked: !rawItem.locked, updatedAt: Date.now()}, true)
                      }
                      className="min-w-[30px] min-h-[30px] flex items-center justify-center rounded-lg hover:bg-black/5"
                      title={rawItem.locked ? 'Разблокировать' : 'Закрепить'}
                    >
                      {rawItem.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => onDuplicateItem(rawItem)}
                      className="min-w-[30px] min-h-[30px] flex items-center justify-center rounded-lg hover:bg-black/5"
                      title="Дублировать"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(rawItem.id)}
                      className="min-w-[30px] min-h-[30px] flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-500/10"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!rawItem.locked && (
                    <>
                      {/* Rotate handle */}
                      <button
                        type="button"
                        onPointerDown={(e) => startInteraction(e, 'rotate', rawItem)}
                        className="absolute -bottom-9 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border shadow-md flex items-center justify-center z-40 cursor-grab"
                        style={{
                          backgroundColor: 'var(--site-surface)',
                          borderColor: 'var(--site-border)',
                          color: 'var(--site-text)',
                        }}
                        title="Повернуть"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      {/* Resize handle */}
                      <button
                        type="button"
                        onPointerDown={(e) => startInteraction(e, 'resize', rawItem)}
                        className="absolute -bottom-4 -right-4 w-8 h-8 rounded-full border shadow-md flex items-center justify-center z-40 cursor-nwse-resize"
                        style={{
                          backgroundColor: 'var(--site-accent)',
                          borderColor: 'var(--site-surface)',
                          color: 'var(--site-accent-contrast)',
                        }}
                        title="Изменить размер"
                      >
                        <MoveDiagonal2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
    </div>
  );
};

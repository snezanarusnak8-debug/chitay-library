import React from 'react';
import {PaperclipStyle} from '../types/library';

interface PaperclipSvgProps {
  styleType: PaperclipStyle;
  className?: string;
}

export const PaperclipSvg: React.FC<PaperclipSvgProps> = ({styleType, className = ''}) => {
  if (styleType === 'none') return null;

  const colorMap: Record<Exclude<PaperclipStyle, 'none'>, {stroke: string; accent?: string}> = {
    classic_metal: {stroke: '#6C737E'},
    gold: {stroke: '#C59B38'},
    silver: {stroke: '#A7B0BC'},
    pastel_pink: {stroke: '#DF9AA8'},
    sage: {stroke: '#7E997B'},
    vintage_brass: {stroke: '#9B753D'},
    star_clip: {stroke: '#C49A45', accent: '#E8C56E'},
  };

  const palette = colorMap[styleType];

  return (
    <svg
      viewBox="0 0 36 74"
      fill="none"
      className={`pointer-events-none select-none drop-shadow-sm ${className}`}
      aria-hidden="true"
    >
      <path
        d="M11 22V56C11 63.18 16.82 69 24 69C31.18 69 37 63.18 37 56V16C37 9.92 32.08 5 26 5C19.92 5 15 9.92 15 16V52C15 56.42 18.58 60 23 60C27.42 60 31 56.42 31 52V20"
        transform="translate(-6, 0)"
        stroke={palette.stroke}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {styleType === 'star_clip' && (
        <path
          d="M18 6L20.2 10.6L25.2 11.3L21.6 14.8L22.5 19.8L18 17.4L13.5 19.8L14.4 14.8L10.8 11.3L15.8 10.6L18 6Z"
          fill={palette.accent}
          stroke={palette.stroke}
          strokeWidth="1.4"
        />
      )}
    </svg>
  );
};

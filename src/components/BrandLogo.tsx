import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  compact = false,
  size = 'md',
  onClick,
  className = '',
}) => {
  const iconBoxSize =
    size === 'lg' ? 'w-9 h-9 rounded-xl' : size === 'sm' ? 'w-7 h-7 rounded-lg' : 'w-8 h-8 rounded-xl';
  const wordSize =
    size === 'lg'
      ? 'text-[1.75rem]'
      : size === 'sm'
      ? 'text-[1.35rem]'
      : 'text-[1.55rem]';

  const content = (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <span
        className={`${iconBoxSize} flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105`}
        style={{
          backgroundColor: 'var(--site-accent)',
          color: 'var(--site-accent-contrast)',
        }}
        aria-hidden="true"
      >
        {/* Minimalist open-book + ribbon bookmark editorial mark */}
        <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="none">
          <path
            d="M4.5 5.5C7.2 5.5 9.8 6.4 12 8C14.2 6.4 16.8 5.5 19.5 5.5V17.5C16.8 17.5 14.2 18.2 12 19.6C9.8 18.2 7.2 17.5 4.5 17.5V5.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M12 8V19.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M15.4 5.9V12.2L16.9 10.9L18.4 12.2V5.6"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span
          className={`font-display ${wordSize} font-semibold tracking-[-0.025em] leading-none lowercase`}
          style={{color: 'var(--site-text)'}}
        >
          chitay
        </span>
      )}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group inline-flex items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] rounded-xl"
        title="chitay — на главную"
      >
        {content}
      </button>
    );
  }

  return content;
};

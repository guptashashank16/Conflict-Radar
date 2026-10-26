import React from 'react';
import emblemGoldUrl from '../../assets/emblem_of_india_gold.svg';

export interface EmblemWatermarkProps {
  className?: string;
  size?: number;
  opacity?: number;
  position?: 'center' | 'right';
  fullScreen?: boolean;
  variant?: 'app' | 'fullscreen' | 'login-card';
}

/**
 * EmblemWatermark: Renders the genuine State Emblem of India in authentic gold (#EAAA00)
 * as a clearly visible, elegant background watermark layer across application views.
 * 
 * - Preserves the authentic official vector artwork, proportions (145.52 / 231.92), and motto.
 * - Horizontally and vertically centered within the main content area (accounting for the sidebar on desktop).
 * - Calibrated opacity (0.16 default, 0.22 on login card) ensures it is clearly recognizable at a glance
 *   against Ice Silver (#DDE3E8) while maintaining high-contrast readability for foreground cards, charts, and text.
 * - Uses pointer-events: none and proper stacking context (z-0) so it never interferes with user interactions.
 */
export const EmblemWatermark: React.FC<EmblemWatermarkProps> = ({
  className = '',
  size = 480,
  opacity = 0.16,
  position = 'center',
  fullScreen = false,
  variant = 'app',
}) => {
  // Positioning classes:
  // - login-card: absolute inset-0 (centered directly behind Officer Sign-In card in its relative column)
  // - fullScreen: fixed inset-0 (for standalone full-page views)
  // - default (app layout): fixed top-16 bottom-0 right-0 left-0 md:left-64 (bounded strictly to the main content area)
  const containerPosition =
    variant === 'login-card'
      ? 'absolute inset-0'
      : fullScreen || variant === 'fullscreen'
      ? 'fixed inset-0'
      : 'fixed top-16 bottom-0 right-0 left-0 md:left-64';

  const alignment =
    position === 'right'
      ? 'justify-center lg:justify-end lg:pr-12 xl:pr-24'
      : 'justify-center';

  return (
    <div
      aria-hidden="true"
      className={`${containerPosition} pointer-events-none select-none flex items-center ${alignment} overflow-hidden z-0 ${className}`}
      style={{ opacity }}
    >
      <img
        src={emblemGoldUrl}
        alt=""
        width={size}
        height={Math.round(size * 1.5937)}
        className="shrink-0 object-contain drop-shadow-xs transition-opacity duration-300"
        style={{
          width: `${size}px`,
          height: 'auto',
          aspectRatio: '145.52 / 231.92',
          maxWidth: variant === 'login-card' ? '92%' : '80vw',
          maxHeight: variant === 'login-card' ? '92%' : '75vh',
        }}
      />
    </div>
  );
};

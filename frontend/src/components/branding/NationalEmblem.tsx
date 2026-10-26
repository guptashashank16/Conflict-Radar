import React from 'react';
import emblemGoldUrl from '../../assets/emblem_of_india_gold.svg';

interface EmblemProps {
  className?: string;
  size?: number;
  alt?: string;
}

/**
 * NationalEmblem: Renders the genuine State Emblem of India in authentic gold
 * using the verified official asset file, preserving original geometry and proportions.
 */
export const NationalEmblem: React.FC<EmblemProps> = ({
  className = '',
  size = 36,
  alt = 'State Emblem of India',
}) => {
  return (
    <div className={`flex items-center justify-center shrink-0 select-none ${className}`}>
      <img
        src={emblemGoldUrl}
        alt={alt}
        width={size}
        height={Math.round(size * 1.5937)}
        className="shrink-0 object-contain drop-shadow-xs"
        style={{
          width: `${size}px`,
          height: 'auto',
          aspectRatio: '145.52 / 231.92',
        }}
      />
    </div>
  );
};

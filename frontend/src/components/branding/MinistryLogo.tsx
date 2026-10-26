import React from 'react';
import { NationalEmblem } from './NationalEmblem';

interface MinistryLogoProps {
  className?: string;
  lightText?: boolean;
}

export const MinistryLogo: React.FC<MinistryLogoProps> = ({ className = '', lightText = true }) => {
  return (
    <div className={`flex items-center space-x-2 select-none ${className}`}>
      <NationalEmblem size={28} />
      <div className="flex flex-col text-left">
        <span className={`text-[10px] font-bold tracking-wider uppercase leading-none ${lightText ? 'text-[#EAAA00]' : 'text-[#3A0F34]'}`}>
          शिक्षा मंत्रालय
        </span>
        <span className={`text-[11px] font-bold leading-tight ${lightText ? 'text-white' : 'text-[#3A0F34]'}`}>
          Ministry of Education
        </span>
        <span className={`text-[9px] leading-none ${lightText ? 'text-slate-300' : 'text-slate-600'}`}>
          Government of India
        </span>
      </div>
    </div>
  );
};

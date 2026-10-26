import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface PrototypeDisclaimerProps {
  className?: string;
  variant?: 'subtle' | 'banner' | 'card';
}

export const PrototypeDisclaimer: React.FC<PrototypeDisclaimerProps> = ({
  className = '',
  variant = 'subtle',
}) => {
  if (variant === 'banner') {
    return (
      <div
        className={`px-3 py-1.5 bg-[#3A0F34] border-b border-[#EAAA00]/40 text-slate-100 text-[11px] flex items-center justify-center space-x-2 ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-[#EAAA00] shrink-0" />
        <span>
          <strong className="text-[#EAAA00] font-semibold">Demonstration Notice:</strong> Academic
          prototype for demonstration purposes. Not an official AICTE government service.
        </span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`p-3 bg-white/90 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start space-x-2.5 shadow-sm ${className}`}
      >
        <ShieldAlert className="w-4 h-4 text-[#EAAA00] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-[#3A0F34]">Statutory Notice</p>
          <p className="leading-relaxed">
            Academic prototype for demonstration purposes. Not an official AICTE government
            service. All institution profiles, personas, and records presented are synthetic and for
            evaluative oversight demonstration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`text-[11px] text-slate-600 text-center flex items-center justify-center space-x-1.5 select-none ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#EAAA00] shrink-0"></span>
      <span>Academic prototype for demonstration purposes. Not an official AICTE government service.</span>
    </div>
  );
};

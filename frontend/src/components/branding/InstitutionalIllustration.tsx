import React from 'react';
import { ShieldCheck, Crosshair, Building2, CheckCircle2 } from 'lucide-react';

export const InstitutionalIllustration: React.FC = () => {
  return (
    <div className="relative w-full max-w-md mx-auto my-6 select-none">
      {/* Decorative Outer Glow */}
      <div className="absolute inset-0 bg-[#EAAA00]/15 rounded-3xl blur-2xl pointer-events-none" />

      {/* Main Container Card in Deep Plum */}
      <div className="relative bg-[#3A0F34] border border-[#EAAA00]/30 rounded-2xl p-6 shadow-2xl backdrop-blur space-y-5">
        {/* Radar Graphic Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EAAA00] animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Cross-Bureau Radar Active
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#EAAA00]/20 text-[#EAAA00] border border-[#EAAA00]/40">
            Real-Time Scrutiny
          </span>
        </div>

        {/* Central Visual: Radar Nodes Diagram */}
        <div className="relative h-44 flex items-center justify-center">
          {/* Concentric Radar Rings */}
          <div className="absolute w-40 h-40 rounded-full border border-white/10" />
          <div className="absolute w-28 h-28 rounded-full border border-[#EAAA00]/30 animate-pulse" />
          <div className="absolute w-16 h-16 rounded-full border border-[#EAAA00]/50" />

          {/* Central Hub in Marigold */}
          <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-tr from-[#EAAA00] to-[#F7D452] flex items-center justify-center shadow-lg shadow-[#EAAA00]/30">
            <Crosshair className="w-6 h-6 text-[#3A0F34] animate-spin" style={{ animationDuration: '12s' }} />
          </div>

          {/* Orbiting Bureau Badges */}
          <div className="absolute top-2 left-4 px-2.5 py-1 rounded-lg bg-[#3A0F34] border border-[#EAAA00]/40 text-[11px] font-semibold text-slate-100 flex items-center space-x-1 shadow">
            <Building2 className="w-3 h-3 text-[#EAAA00]" />
            <span>Regulation (RB)</span>
          </div>

          <div className="absolute top-2 right-4 px-2.5 py-1 rounded-lg bg-[#3A0F34] border border-[#EAAA00]/40 text-[11px] font-semibold text-slate-100 flex items-center space-x-1 shadow">
            <Building2 className="w-3 h-3 text-[#EAAA00]" />
            <span>Grievances (PGRC)</span>
          </div>

          <div className="absolute bottom-2 left-6 px-2.5 py-1 rounded-lg bg-[#3A0F34] border border-[#EAAA00]/40 text-[11px] font-semibold text-slate-100 flex items-center space-x-1 shadow">
            <CheckCircle2 className="w-3 h-3 text-[#EAAA00]" />
            <span>Approval Bureau</span>
          </div>

          <div className="absolute bottom-2 right-6 px-2.5 py-1 rounded-lg bg-[#3A0F34] border border-[#EAAA00]/40 text-[11px] font-semibold text-slate-100 flex items-center space-x-1 shadow">
            <ShieldCheck className="w-3 h-3 text-[#EAAA00]" />
            <span>Vigilance Cell</span>
          </div>
        </div>

        {/* Multi-Signal Explanation Strip */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
          <div className="p-2 rounded-lg bg-white/10 border border-white/15">
            <div className="text-[10px] text-slate-300">Signal Matching</div>
            <div className="text-xs font-bold text-[#EAAA00]">5 Dimensions</div>
          </div>
          <div className="p-2 rounded-lg bg-white/10 border border-white/15">
            <div className="text-[10px] text-slate-300">Jurisdiction</div>
            <div className="text-xs font-bold text-white">8 Regions</div>
          </div>
          <div className="p-2 rounded-lg bg-white/10 border border-white/15">
            <div className="text-[10px] text-slate-300">Audit Safety</div>
            <div className="text-xs font-bold text-[#EAAA00]">OCC Locked</div>
          </div>
        </div>
      </div>
    </div>
  );
};

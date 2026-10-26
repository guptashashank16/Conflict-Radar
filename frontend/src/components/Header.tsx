import React from 'react';
import { User, DemoPersona } from '../types';
import { UserCheck, LogOut } from 'lucide-react';
import { AicteLogo } from './branding/AicteLogo';
import { NationalEmblem } from './branding/NationalEmblem';

interface HeaderProps {
  currentUser: User | null;
  personas: DemoPersona[];
  onSwitchRole: (role: string) => void;
  onLogout: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  personas,
  onSwitchRole,
  onLogout,
  isLoading,
}) => {
  return (
    <header className="h-16 bg-[#3A0F34] border-b-2 border-[#EAAA00] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-lg text-white">
      {/* Title & Institutional Branding */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <AicteLogo size={38} />
        <div className="h-7 w-px bg-white/20 hidden md:block" />
        <div className="hidden md:flex items-center" title="State Emblem of India">
          <NationalEmblem size={24} />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center">
              AICTE INSTITUTION CONFLICT RADAR
            </h1>
          </div>
          <p className="text-[11px] text-[#DDE3E8]/80 hidden sm:block">
            Cross-Bureau Case Oversight & Explainable Overlap Detection Platform
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Role Switcher */}
        <div className="flex items-center bg-white/10 border border-white/20 rounded-xl p-1 shadow-xs backdrop-blur-xs">
          <div className="hidden sm:flex items-center px-2 py-1 text-xs text-[#DDE3E8]/80 border-r border-white/10 mr-1.5">
            <UserCheck className="w-3.5 h-3.5 mr-1 text-[#EAAA00]" />
            <span className="font-semibold text-white">Persona:</span>
          </div>
          <select
            className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer pr-2 py-0.5"
            value={currentUser?.role || ''}
            onChange={(e) => onSwitchRole(e.target.value)}
            disabled={isLoading}
          >
            {personas.map((p) => (
              <option key={p.role} value={p.role} className="bg-[#3A0F34] text-white py-1">
                {p.full_name} ({p.role.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>

        {/* User Scope Tags */}
        {currentUser && (
          <div className="hidden lg:flex items-center space-x-2 text-xs">
            <div className="px-2.5 py-1 bg-white/10 border border-white/15 rounded-lg">
              <span className="text-[#DDE3E8]/80 text-[11px]">Bureau: </span>
              <span className="font-bold text-[#EAAA00]">{currentUser.bureau_scope}</span>
            </div>
            <div className="px-2.5 py-1 bg-white/10 border border-white/15 rounded-lg">
              <span className="text-[#DDE3E8]/80 text-[11px]">Region: </span>
              <span className="font-bold text-[#EAAA00]">{currentUser.region_scope}</span>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          title="Sign Out"
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-[#EAAA00] hover:text-[#3A0F34] border border-[#EAAA00]/50 text-[#EAAA00] rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

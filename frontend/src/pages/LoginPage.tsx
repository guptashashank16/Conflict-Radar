import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, AlertCircle, UserCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { User, DemoPersona } from '../types';
import { AicteLogo } from '../components/branding/AicteLogo';
import { MinistryLogo } from '../components/branding/MinistryLogo';
import { InstitutionalIllustration } from '../components/branding/InstitutionalIllustration';
import { PrototypeDisclaimer } from '../components/branding/PrototypeDisclaimer';
import { EmblemWatermark } from '../components/branding/EmblemWatermark';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  personas: DemoPersona[];
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, personas }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPersonaEmail, setSelectedPersonaEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectDemoPersona = (persona: DemoPersona) => {
    setSelectedPersonaEmail(persona.email);
    setEmail(persona.email);
    setPassword('demo123');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email address and password');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await api.login(email.trim(), password);
      onLoginSuccess(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please verify and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#DDE3E8] text-slate-800 flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden">
      {/* Top Prototype Notification Bar */}
      <div className="relative z-10">
        <PrototypeDisclaimer variant="banner" />
      </div>

      {/* Main Split Grid */}
      <div className="relative z-10 flex-1 grid lg:grid-cols-12 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-10 gap-8 items-center">
        
        {/* Left Column: Deep Plum Branded Hero Panel */}
        <div className="lg:col-span-7 bg-[#3A0F34] text-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-[#EAAA00]/30 space-y-6">
          {/* Official Co-Branding Bar */}
          <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-4">
            <AicteLogo size={48} showText={true} lightText={true} />
            <div className="h-8 w-px bg-white/20 hidden sm:block" />
            <MinistryLogo lightText={true} />
          </div>

          {/* Headline & Mission Statement */}
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EAAA00]/20 border border-[#EAAA00]/40 text-[#EAAA00] text-xs font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>Statutory Technical Education Oversight Platform</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              AICTE INSTITUTION CONFLICT RADAR
            </h1>
            <p className="text-sm sm:text-base text-[#DDE3E8]/80 leading-relaxed max-w-xl">
              Cross-Bureau Case Oversight & Explainable Overlap Detection Platform. Unifying regulatory
              scrutiny, public grievances, and institutional approvals with deterministic multi-signal matching
              and immutable audit trails.
            </p>
          </div>

          {/* Central Oversight Illustration */}
          <InstitutionalIllustration />

          {/* Stakeholder Demo Personas Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#EAAA00] flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-[#EAAA00]" />
                <span>Demonstration Institutional Profiles (Click to Auto-Fill)</span>
              </span>
              <span className="text-[11px] text-[#EAAA00]/90 font-medium">Fictional Synthetic Personas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {personas.slice(0, 4).map((p) => {
                const isSelected = selectedPersonaEmail === p.email;
                return (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => handleSelectDemoPersona(p)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EAAA00]/20 border-[#EAAA00] shadow-lg shadow-[#EAAA00]/10'
                        : 'bg-white/10 border-white/15 hover:border-[#EAAA00]/50 hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white truncate">{p.full_name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        isSelected ? 'bg-[#EAAA00] text-[#3A0F34]' : 'bg-white/10 text-[#DDE3E8]'
                      }`}>
                        {p.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#DDE3E8]/70 truncate">{p.designation || p.description}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-[#DDE3E8]/60">{p.office || 'AICTE Office'}</span>
                      <span className="text-[#EAAA00] font-bold">{isSelected ? '✓ Selected' : 'Auto-fill'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Clean White Sign-in Card on Ice Silver with Centered Emblem Watermark */}
        <div className="lg:col-span-5 w-full relative flex items-center justify-center">
          {/* Authentic State Emblem of India Watermark Layer (Login Page Only: Positioned directly behind the Officer Sign-In Card) */}
          <EmblemWatermark
            variant="login-card"
            size={380}
            opacity={0.22}
            className="transform -translate-y-2 pointer-events-none"
          />

          <div className="bg-white/92 backdrop-blur-xs border-2 border-[#3A0F34]/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 w-full overflow-hidden">
            
            {/* Top Accent Gradient Line with Deep Plum and Marigold */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#3A0F34] via-[#EAAA00] to-[#3A0F34]" />

            <div className="space-y-6">
              {/* Form Heading */}
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#3A0F34]">
                  Officer Sign-In
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Authenticate with authorized departmental credentials to access role-scoped case queues
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Credential Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#3A0F34]">
                    Departmental Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      id="login-email-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. oversight@aicte.gov.in"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F6F8FA] border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34] transition"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#3A0F34]">
                      Security Password
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Default: <code className="text-[#3A0F34] font-mono font-bold bg-[#EAAA00]/20 px-1 py-0.5 rounded">demo123</code>
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="login-password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-[#F6F8FA] border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#3A0F34] focus:outline-none cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember / Security Note */}
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scoped Session Encryption</span>
                  </div>
                  <span className="text-slate-500 text-[11px] font-mono">OCC v1.0</span>
                </div>

                {/* Submit Action in Marigold with Deep Plum Text */}
                <button
                  type="submit"
                  id="login-submit-button"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-[#EAAA00] hover:bg-[#d49900] disabled:opacity-50 text-[#3A0F34] rounded-xl text-sm font-extrabold shadow-lg shadow-[#EAAA00]/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#3A0F34] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security & Prototype Notice Card */}
              <PrototypeDisclaimer variant="card" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-300 py-4 px-6 text-center text-xs text-slate-600 bg-[#DDE3E8]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-[#3A0F34]">AICTE Institution Conflict Radar &bull; National Academic & Regulatory Governance Platform</span>
          <span className="text-[11px]">Strict Regional Scoping &bull; Cryptographic Audit Logs</span>
        </div>
      </footer>
    </div>
  );
};

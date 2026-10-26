import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Institution, Institution360, User } from '../types';
import {
  Building2,
  Search,
  MapPin,
  Lock,
  Crosshair,
  ArrowRight,
  Layers
} from 'lucide-react';

interface InstitutionsPageProps {
  currentUser: User | null;
  onNavigateToRadar: () => void;
}

export const InstitutionsPage: React.FC<InstitutionsPageProps> = ({ currentUser, onNavigateToRadar }) => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const [profile360, setProfile360] = useState<Institution360 | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 12;

  useEffect(() => {
    if (currentUser?.region_scope && currentUser.region_scope !== 'ALL') {
      setRegionFilter(currentUser.region_scope);
    } else {
      setRegionFilter('ALL');
    }
  }, [currentUser]);

  useEffect(() => {
    loadInstitutions();
  }, [currentUser, search, regionFilter, page]);

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      const res = await api.getInstitutions({
        query: search,
        region: regionFilter,
        skip: page * limit,
        limit,
      });
      setInstitutions(res.items);
      setTotal(res.total);
      // Auto-select first institution if none selected
      if (!selectedInstId && res.items.length > 0) {
        handleSelectInstitution(res.items[0].id);
      }
    } catch (err) {
      console.error('Failed to load institutions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstitution = async (id: string) => {
    setSelectedInstId(id);
    setLoadingProfile(true);
    try {
      const data = await api.getInstitution360(id);
      setProfile360(data);
    } catch (err) {
      console.error('Failed to load 360 profile', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-300">
        <div>
          <h2 className="text-2xl font-extrabold text-[#3A0F34] tracking-tight flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-[#EAAA00]" />
            <span>Institution 360° Consolidated Profiles</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Canonical institutional profiles with cross-bureau case mapping, reviewed identity aliases, and conflict tracking
          </p>
        </div>
        <div className="text-xs text-slate-700 font-semibold bg-white border border-slate-300/80 px-3 py-1.5 rounded-xl shadow-xs">
          Showing <span className="text-[#3A0F34] font-extrabold">{institutions.length}</span> of{' '}
          <span className="text-[#3A0F34] font-extrabold">{total}</span> institutions
        </div>
      </div>

      {/* Main Grid: Left List (1/3) + Right 360 Details (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & Institutions List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-3 bg-white border border-slate-300/80 rounded-2xl space-y-2 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, AICTE ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F6F8FA] border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
              />
            </div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              disabled={currentUser?.region_scope !== 'ALL'}
              className="w-full px-3 py-1.5 bg-[#F6F8FA] border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34] disabled:opacity-50 cursor-pointer"
            >
              <option value="ALL">All Regions</option>
              <option value="Northern">Northern Region (Kanpur)</option>
              <option value="North-West">North-West Region (Chandigarh)</option>
              <option value="Western">Western Region (Mumbai)</option>
              <option value="Central">Central Region (Bhopal)</option>
              <option value="Southern">Southern Region (Chennai)</option>
              <option value="South-Western">South-Western (Bengaluru)</option>
              <option value="Eastern">Eastern Region (Kolkata)</option>
            </select>
          </div>

          {/* Institution Cards */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading institutions...</div>
            ) : institutions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-medium">No institutions match search.</div>
            ) : (
              institutions.map((inst) => {
                const isSelected = selectedInstId === inst.id;
                return (
                  <div
                    key={inst.id}
                    onClick={() => handleSelectInstitution(inst.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#DDE3E8]/50 border-2 border-[#3A0F34] shadow-xs'
                        : 'bg-white border-slate-300/80 hover:border-[#3A0F34] hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-xs text-[#3A0F34] leading-snug">{inst.canonical_name}</h4>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                          <span className="font-mono text-[#3A0F34] font-semibold">{inst.aicte_permanent_id || 'ID Pending'}</span>
                          <span>&bull;</span>
                          <span className="font-medium">{inst.region}</span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#3A0F34]/10 text-[#3A0F34] border border-[#3A0F34]/20">
                        {inst.approval_status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: 360 Consolidated Profile */}
        <div className="lg:col-span-8">
          {loadingProfile ? (
            <div className="p-16 bg-white border border-slate-300/80 rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-xs">
              <div className="w-8 h-8 border-4 border-[#3A0F34] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-600 font-medium">Loading consolidated 360° profile & cases...</p>
            </div>
          ) : !profile360 ? (
            <div className="p-16 bg-white border border-slate-300/80 rounded-2xl text-center text-slate-500 text-sm shadow-xs font-medium">
              Select an institution from the list to inspect its consolidated profile.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Institution Identity Card */}
              <div className="p-6 bg-white border border-slate-300/80 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#3A0F34] text-[#EAAA00] font-mono shadow-xs">
                        {profile360.institution.aicte_permanent_id || 'AICTE Permanent ID Pending'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {profile360.institution.approval_status}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-[#3A0F34] tracking-tight">
                      {profile360.institution.canonical_name}
                    </h3>
                    <p className="text-xs text-slate-600 flex items-center space-x-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{profile360.institution.address || 'Address on record not verified'}</span>
                      <span>({profile360.institution.region} Region)</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 text-right">
                    <div className="p-3 bg-[#F6F8FA] border border-slate-300 rounded-xl text-center shadow-xs">
                      <div className="text-lg font-extrabold text-[#3A0F34]">{profile360.total_accessible_cases}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Accessible Cases</div>
                    </div>
                  </div>
                </div>

                {/* Reviewed Identity Aliases */}
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    Reviewed Identity Aliases & Historical Acronyms
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile360.aliases.length > 0 ? (
                      profile360.aliases.map((al) => (
                        <span
                          key={al.id}
                          className="px-2.5 py-1 rounded-md text-[11px] bg-[#F6F8FA] border border-slate-300 text-slate-800 font-semibold flex items-center space-x-1 shadow-xs"
                        >
                          <span>{al.alias_name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">({al.source})</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">No alternate aliases recorded.</span>
                    )}
                  </div>
                </div>

                {/* Scope Redaction Notice */}
                {profile360.redacted_cases_count > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs text-amber-900 font-medium">
                    <Lock className="w-4 h-4 shrink-0 text-[#EAAA00]" />
                    <span>
                      <strong>Least-Privilege Scope Notice:</strong> {profile360.redacted_cases_count} cases
                      for this institution exist in other bureaus but are redacted from your current view based on your role ({currentUser?.role}).
                    </span>
                  </div>
                )}
              </div>

              {/* Active Overlap Radar Alerts for this Institution */}
              {profile360.active_overlaps.length > 0 && (
                <div className="p-5 bg-amber-50 border-2 border-[#EAAA00] rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-[#3A0F34] font-extrabold text-sm">
                      <Crosshair className="w-4 h-4 text-[#EAAA00]" />
                      <span>Conflict Radar Alert: Potential Overlapping Cases Detected!</span>
                    </div>
                    <button
                      onClick={onNavigateToRadar}
                      className="text-xs text-[#3A0F34] hover:text-[#EAAA00] flex items-center space-x-1 font-extrabold cursor-pointer"
                    >
                      <span>Review in Radar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {profile360.active_overlaps.map((o) => (
                      <div key={o.id} className="p-3 bg-white border border-[#EAAA00]/40 rounded-xl text-xs space-y-1 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            Radar Score: <span className="text-[#3A0F34] font-extrabold">{o.composite_score}/100</span>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAAA00]/20 text-[#3A0F34] border border-[#EAAA00]/60">
                            {o.review_status}
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px] leading-relaxed">{o.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cases Grouped by Bureau */}
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#3A0F34] flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#EAAA00]" />
                  <span>Cross-Bureau Cases Breakdown</span>
                </h4>

                {Object.keys(profile360.cases_by_bureau).length === 0 ? (
                  <div className="p-8 bg-white border border-slate-300/80 rounded-2xl text-center text-slate-500 text-xs font-medium shadow-xs">
                    No active complaint cases recorded for this institution within your authorized bureau scope.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(profile360.cases_by_bureau).map(([bureau, bCases]) => (
                      <div key={bureau} className="p-5 bg-white border border-slate-300/80 rounded-2xl space-y-3 shadow-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-0.5 rounded font-extrabold text-xs bg-[#3A0F34] text-white shadow-xs">
                              {bureau}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {bureau === 'RB' && 'Regulation Bureau (Norms & Regulatory Compliance)'}
                              {bureau === 'PGRC' && 'Public Grievance Redressal Cell (Student & Citizen Intake)'}
                              {bureau === 'APPROVAL' && 'Approval Bureau (Scrutiny & Deficiencies)'}
                              {bureau === 'VIGILANCE' && 'Vigilance & Ethics Cell'}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-semibold text-slate-500">{bCases.length} records</span>
                        </div>

                        <div className="space-y-2">
                          {bCases.map((c) => (
                            <div
                              key={c.id}
                              className="p-3 bg-[#F6F8FA] border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-[#3A0F34]">{c.source_case_id}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-slate-200 text-slate-600 font-semibold">
                                    {c.category}
                                  </span>
                                </div>
                                <p className="font-medium text-slate-800">{c.subject}</p>
                              </div>

                              <div className="flex items-center space-x-3 text-right shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    c.status === 'UNDER_PROCESS'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : c.status === 'ESCALATED'
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {c.status}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    c.sla_status === 'OVERDUE'
                                      ? 'text-red-700 bg-red-50 border border-red-200'
                                      : c.sla_status === 'WARNING'
                                      ? 'text-[#855700] bg-[#EAAA00]/20 border border-[#EAAA00]/60'
                                      : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                  }`}
                                >
                                  {c.sla_status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

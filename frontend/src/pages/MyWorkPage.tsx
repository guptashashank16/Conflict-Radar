import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Case, CaseAction, User } from '../types';
import {
  Search,
  Briefcase,
  AlertTriangle,
  Clock,
  Send,
  GitPullRequest,
  CheckCircle2,
  X,
  History
} from 'lucide-react';

interface MyWorkPageProps {
  currentUser: User | null;
  initialFilters?: {
    bureau?: string;
    status?: string;
    sla_status?: string;
    region?: string;
    search?: string;
    selectedCaseId?: string;
  };
  onClearInitialFilters?: () => void;
}

export const MyWorkPage: React.FC<MyWorkPageProps> = ({
  currentUser,
  initialFilters,
  onClearInitialFilters
}) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState(initialFilters?.search || '');
  const [bureauFilter, setBureauFilter] = useState(initialFilters?.bureau || 'ALL');
  const [regionFilter, setRegionFilter] = useState(initialFilters?.region || 'ALL');
  const [statusFilter, setStatusFilter] = useState(initialFilters?.status || 'ALL');
  const [slaFilter, setSlaFilter] = useState(initialFilters?.sla_status || 'ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const limit = 15;

  // Drawer / Selection
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [timeline, setTimeline] = useState<CaseAction[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Action Dialogs
  const [actionModal, setActionModal] = useState<'ASSIGN' | 'TRANSFER' | 'STATUS' | 'COORD' | null>(null);
  const [actionInput, setActionInput] = useState({
    reason: '',
    targetBureau: 'PGRC',
    assigneeId: '',
    toStatus: 'DISPOSED',
    dispositionSummary: '',
    coordSubject: '',
    coordMessage: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.region_scope && currentUser.region_scope !== 'ALL') {
      setRegionFilter(currentUser.region_scope);
    } else if (initialFilters?.region) {
      setRegionFilter(initialFilters.region);
    } else {
      setRegionFilter('ALL');
    }
  }, [currentUser, initialFilters]);

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.bureau) setBureauFilter(initialFilters.bureau);
      if (initialFilters.status) setStatusFilter(initialFilters.status);
      if (initialFilters.sla_status) setSlaFilter(initialFilters.sla_status);
      if (initialFilters.search) setSearch(initialFilters.search);
    }
  }, [initialFilters]);

  useEffect(() => {
    loadCases();
  }, [currentUser, search, bureauFilter, regionFilter, statusFilter, slaFilter, categoryFilter, page]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const res = await api.getCases({
        search,
        bureau: bureauFilter,
        region: regionFilter,
        status: statusFilter,
        sla_status: slaFilter,
        category: categoryFilter,
        skip: page * limit,
        limit,
      });
      setCases(res.items);
      setTotal(res.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load case workbench');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCase = async (c: Case) => {
    setSelectedCase(c);
    setLoadingTimeline(true);
    try {
      const actions = await api.getCaseTimeline(c.id);
      setTimeline(actions);
    } catch (err: any) {
      console.error('Failed to load timeline', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!selectedCase) return;
    setActionLoading(true);
    setActionError(null);

    try {
      if (actionModal === 'TRANSFER') {
        if (!actionInput.reason.trim()) throw new Error('Transfer rationale is required');
        const updated = await api.transferCase(
          selectedCase.id,
          actionInput.targetBureau,
          selectedCase.version,
          actionInput.reason
        );
        setSelectedCase(updated);
      } else if (actionModal === 'STATUS') {
        if (!actionInput.reason.trim()) throw new Error('Transition remarks are required');
        const updated = await api.updateCaseStatus(
          selectedCase.id,
          actionInput.toStatus,
          selectedCase.version,
          actionInput.reason,
          actionInput.toStatus === 'DISPOSED' ? actionInput.dispositionSummary : undefined
        );
        setSelectedCase(updated);
      } else if (actionModal === 'COORD') {
        if (!actionInput.coordSubject.trim() || !actionInput.coordMessage.trim()) {
          throw new Error('Coordination subject and message are required');
        }
        await api.requestCoordination(
          selectedCase.id,
          actionInput.targetBureau,
          actionInput.coordSubject,
          actionInput.coordMessage
        );
      }

      // Refresh timeline and case list
      const actions = await api.getCaseTimeline(selectedCase.id);
      setTimeline(actions);
      setActionModal(null);
      loadCases();
    } catch (err: any) {
      setActionError(err.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header and Summary Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-300">
        <div>
          <h2 className="text-2xl font-extrabold text-[#3A0F34] tracking-tight flex items-center space-x-2">
            <Briefcase className="w-6 h-6 text-[#EAAA00]" />
            <span>Case Explorer & Workbench</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Searchable, scoped queue with chronological audit histories and workflow controls
          </p>
        </div>
        <div className="text-xs text-slate-700 font-semibold bg-white border border-slate-300/80 px-3 py-1.5 rounded-xl shadow-xs">
          Showing <span className="text-[#3A0F34] font-extrabold">{cases.length}</span> of{' '}
          <span className="text-[#3A0F34] font-extrabold">{total}</span> scoped records
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Active Filter Notification Banner */}
      {(bureauFilter !== 'ALL' || statusFilter !== 'ALL' || slaFilter !== 'ALL' || search || (regionFilter !== 'ALL' && currentUser?.region_scope === 'ALL')) && (
        <div className="flex items-center justify-between p-3 bg-white border border-[#EAAA00] rounded-xl text-xs text-[#3A0F34] shadow-xs">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <span className="font-bold">Active Drilldown Filter:</span>
            {bureauFilter !== 'ALL' && (
              <span className="bg-[#3A0F34] text-white px-2.5 py-0.5 rounded text-[11px] font-bold">
                Bureau: {bureauFilter}
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="bg-[#3A0F34] text-white px-2.5 py-0.5 rounded text-[11px] font-bold">
                Status: {statusFilter.replace(/_/g, ' ')}
              </span>
            )}
            {slaFilter !== 'ALL' && (
              <span className="bg-[#EAAA00] text-[#3A0F34] px-2.5 py-0.5 rounded text-[11px] font-extrabold">
                SLA: {slaFilter}
              </span>
            )}
            {search && (
              <span className="bg-[#F6F8FA] border border-slate-300 px-2.5 py-0.5 rounded text-[11px] font-bold">
                Search: "{search}"
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setBureauFilter('ALL');
              setStatusFilter('ALL');
              setSlaFilter('ALL');
              setSearch('');
              if (currentUser?.region_scope === 'ALL') setRegionFilter('ALL');
              if (onClearInitialFilters) onClearInitialFilters();
            }}
            className="text-xs font-extrabold text-[#3A0F34] hover:text-red-700 underline cursor-pointer shrink-0 ml-2"
          >
            Clear Filters &times;
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-white border border-slate-300/80 rounded-2xl shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search ID, subject, keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#F6F8FA] border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
          />
        </div>

        {/* Region Filter */}
        <div>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            disabled={currentUser?.region_scope !== 'ALL'}
            className="w-full px-3 py-1.5 bg-[#F6F8FA] border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34] cursor-pointer disabled:opacity-50"
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

        {/* Bureau Filter */}
        <div>
          <select
            value={bureauFilter}
            onChange={(e) => setBureauFilter(e.target.value)}
            disabled={currentUser?.bureau_scope !== 'ALL'}
            className="w-full px-3 py-1.5 bg-[#F6F8FA] border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34] cursor-pointer disabled:opacity-50"
          >
            <option value="ALL">All Bureaus (Scoped)</option>
            <option value="RB">Regulation Bureau (RB)</option>
            <option value="PGRC">Public Grievance (PGRC)</option>
            <option value="APPROVAL">Approval Bureau</option>
            <option value="VIGILANCE">Vigilance Cell</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#F6F8FA] border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="UNDER_PROCESS">Under Process</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="ESCALATED">Escalated</option>
            <option value="DISPOSED">Disposed</option>
          </select>
        </div>

        {/* SLA Status Filter */}
        <div>
          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#F6F8FA] border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34] cursor-pointer"
          >
            <option value="ALL">All SLA States</option>
            <option value="NORMAL">Normal SLA</option>
            <option value="WARNING">Warning (&le; 72h)</option>
            <option value="OVERDUE">Overdue (Breached)</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#F6F8FA] border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34] cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="FACULTY_NORMS">Faculty Norms</option>
            <option value="INFRASTRUCTURE_DEFICIT">Infrastructure Deficit</option>
            <option value="ADMISSION_FRAUD">Admission Fraud</option>
            <option value="CAPITATION_FEE">Capitation Fee</option>
            <option value="GOVERNANCE">Governance</option>
            <option value="RAGGING">Ragging</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-300/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#3A0F34] text-white font-bold border-b border-[#3A0F34] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Case Ref</th>
                <th className="py-3 px-4">Institution & Region</th>
                <th className="py-3 px-4">Bureau</th>
                <th className="py-3 px-4">Subject & Narrative</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">SLA Deadline</th>
                <th className="py-3 px-4 text-center">Version</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#3A0F34] border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium">Querying persistent repository...</span>
                    </div>
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                    No cases match the selected filter criteria within your assigned authorization scope.
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const isSelected = selectedCase?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectCase(c)}
                      className={`hover:bg-[#F6F8FA] cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#DDE3E8]/50 border-l-4 border-[#3A0F34]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-extrabold text-[#3A0F34]">
                        <div>{c.source_case_id}</div>
                        <span className="text-[10px] text-slate-500 font-normal">{c.source_system}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[210px]">
                        <div className="font-bold text-slate-800 truncate">{c.institution_name}</div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500">{c.aicte_permanent_id || 'ID Pending'}</span>
                          {c.institution_region && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EAAA00]/20 text-[#3A0F34] border border-[#EAAA00]/40 font-bold">
                              {c.institution_region}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3A0F34]/10 text-[#3A0F34] border border-[#3A0F34]/20">
                          {c.bureau}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <div className="font-semibold text-slate-800 truncate">{c.subject}</div>
                        <div className="text-[10px] text-slate-500 truncate">{c.description}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'UNDER_PROCESS'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : c.status === 'ESCALATED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : c.status === 'TRANSFERRED'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : c.status === 'DISPOSED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 w-max ${
                            c.sla_status === 'OVERDUE'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : c.sla_status === 'WARNING'
                              ? 'bg-[#EAAA00]/20 text-[#855700] border border-[#EAAA00]/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {c.sla_status === 'OVERDUE' && <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                          {c.sla_status === 'WARNING' && <Clock className="w-3 h-3 mr-1 inline" />}
                          <span>{c.sla_status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-[11px] font-semibold text-slate-600">
                        v{c.version}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCase(c);
                          }}
                          className="px-2.5 py-1 bg-[#3A0F34] hover:bg-[#EAAA00] hover:text-[#3A0F34] text-white rounded text-xs font-semibold transition cursor-pointer shadow-xs"
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="p-3.5 bg-[#F6F8FA] border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div>
            Page <span className="font-extrabold text-[#3A0F34]">{page + 1}</span> of{' '}
            <span className="font-extrabold text-[#3A0F34]">{Math.max(1, Math.ceil(total / limit))}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-300 rounded font-semibold transition cursor-pointer shadow-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-3 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-300 rounded font-semibold transition cursor-pointer shadow-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Case Details Slide-Over Drawer */}
      {selectedCase && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] lg:w-[560px] bg-white border-l-2 border-[#3A0F34] shadow-2xl z-50 flex flex-col justify-between overflow-hidden">
          {/* Drawer Header */}
          <div className="p-5 border-b border-[#3A0F34]/20 flex items-center justify-between bg-[#3A0F34] text-white">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 text-xs font-extrabold bg-[#EAAA00] text-[#3A0F34] rounded shadow-xs">
                  {selectedCase.bureau}
                </span>
                <span className="font-mono text-sm font-extrabold text-white">{selectedCase.source_case_id}</span>
                <span className="text-[10px] text-white/70 font-mono">v{selectedCase.version}</span>
              </div>
              <p className="text-xs text-[#DDE3E8] mt-1 font-semibold">{selectedCase.institution_name}</p>
            </div>
            <button
              onClick={() => setSelectedCase(null)}
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs bg-[#F6F8FA]">
            {/* Subject and narrative */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
              <h4 className="font-bold text-sm text-[#3A0F34]">{selectedCase.subject}</h4>
              <p className="text-slate-700 leading-relaxed text-xs">{selectedCase.description}</p>
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600">
                <span className="bg-[#DDE3E8]/60 px-2 py-0.5 rounded text-slate-800">Category: {selectedCase.category}</span>
                <span className="bg-[#DDE3E8]/60 px-2 py-0.5 rounded text-slate-800">Priority: {selectedCase.priority}</span>
                <span className="bg-[#DDE3E8]/60 px-2 py-0.5 rounded text-slate-800">
                  Due: {selectedCase.due_at ? new Date(selectedCase.due_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Workflow Action Bar */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#3A0F34]">
                Authorized Workflow Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActionModal('TRANSFER')}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-300 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 text-[#3A0F34]" />
                  <span>Transfer Bureau</span>
                </button>
                <button
                  onClick={() => setActionModal('STATUS')}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-300 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Update Status</span>
                </button>
                <button
                  onClick={() => setActionModal('COORD')}
                  className="col-span-2 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-300 shadow-xs"
                >
                  <GitPullRequest className="w-3.5 h-3.5 text-[#EAAA00]" />
                  <span>Request Cross-Bureau Coordination</span>
                </button>
              </div>
            </div>

            {/* Chronological Action History Timeline */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3A0F34] flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5 text-[#EAAA00]" />
                  <span>Chronological Action History</span>
                </h4>
                <span className="text-[10px] text-slate-500 font-mono font-medium">Immutable Log</span>
              </div>

              {loadingTimeline ? (
                <div className="py-6 text-center text-slate-500 font-medium">Loading timeline...</div>
              ) : (
                <div className="relative pl-6 border-l-2 border-[#3A0F34]/20 space-y-4">
                  {timeline.map((act) => (
                    <div key={act.id} className="relative group">
                      <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-[#3A0F34] ring-4 ring-[#DDE3E8]"></div>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1 shadow-xs">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-extrabold text-[#3A0F34]">{act.action_type}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(act.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-800 text-[11px] leading-relaxed">{act.remarks}</p>
                        <p className="text-[10px] text-slate-500 font-medium">By: {act.actor_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-2 border-[#3A0F34] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-[#3A0F34]">
                {actionModal === 'TRANSFER' && 'Execute Case Transfer'}
                {actionModal === 'STATUS' && 'Update Case Status'}
                {actionModal === 'COORD' && 'Request Cross-Bureau Coordination'}
              </h3>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold">
                {actionError}
              </div>
            )}

            {actionModal === 'TRANSFER' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Receiving Bureau</label>
                  <select
                    value={actionInput.targetBureau}
                    onChange={(e) => setActionInput({ ...actionInput, targetBureau: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                  >
                    <option value="RB">Regulation Bureau (RB)</option>
                    <option value="PGRC">Public Grievance (PGRC)</option>
                    <option value="APPROVAL">Approval Bureau</option>
                    <option value="VIGILANCE">Vigilance Cell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Transfer Rationale (Mandatory)</label>
                  <textarea
                    rows={3}
                    placeholder="Document mandatory administrative reason for bureau handoff..."
                    value={actionInput.reason}
                    onChange={(e) => setActionInput({ ...actionInput, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                  />
                </div>
              </div>
            )}

            {actionModal === 'STATUS' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">New Workflow Status</label>
                  <select
                    value={actionInput.toStatus}
                    onChange={(e) => setActionInput({ ...actionInput, toStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                  >
                    <option value="UNDER_PROCESS">Under Process</option>
                    <option value="ESCALATED">Escalated</option>
                    <option value="DISPOSED">Disposed (Complete)</option>
                  </select>
                </div>
                {actionInput.toStatus === 'DISPOSED' && (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Disposition Summary (Mandatory)</label>
                    <textarea
                      rows={2}
                      placeholder="Summary of regulatory resolution or grievance redressal outcome..."
                      value={actionInput.dispositionSummary}
                      onChange={(e) => setActionInput({ ...actionInput, dispositionSummary: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Action Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Timeline remarks..."
                    value={actionInput.reason}
                    onChange={(e) => setActionInput({ ...actionInput, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                  />
                </div>
              </div>
            )}

            {actionModal === 'COORD' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Bureau</label>
                  <select
                    value={actionInput.targetBureau}
                    onChange={(e) => setActionInput({ ...actionInput, targetBureau: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                  >
                    <option value="RB">Regulation Bureau (RB)</option>
                    <option value="PGRC">Public Grievance (PGRC)</option>
                    <option value="APPROVAL">Approval Bureau</option>
                    <option value="VIGILANCE">Vigilance Cell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Information request regarding inspection findings"
                    value={actionInput.coordSubject}
                    onChange={(e) => setActionInput({ ...actionInput, coordSubject: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Message</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details for coordination..."
                    value={actionInput.coordMessage}
                    onChange={(e) => setActionInput({ ...actionInput, coordMessage: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F6F8FA] border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#3A0F34] focus:ring-1 focus:ring-[#3A0F34]"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className="px-4 py-2 bg-[#EAAA00] hover:bg-[#d49900] disabled:opacity-50 text-[#3A0F34] rounded-lg text-xs font-extrabold cursor-pointer shadow-md shadow-[#EAAA00]/25"
              >
                {actionLoading ? 'Executing...' : 'Submit Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

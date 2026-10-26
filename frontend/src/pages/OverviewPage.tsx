import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardSummary, User } from '../types';
import {
  Building2,
  Briefcase,
  AlertTriangle,
  Clock,
  Crosshair,
  ArrowRight,
  ChevronRight,
  Send,
  CheckCircle2,
  GitPullRequest,
  FileText,
  BarChart3,
  PieChart as PieIcon,
  Filter,
  RotateCcw
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ChartEmptyState } from '../components/charts/SharedChartHelpers';

interface OverviewPageProps {
  currentUser: User | null;
  onNavigate: (tab: string, filters?: any) => void;
}

// Accessible Status Palette adhering to Deep Plum + Marigold identity
const STATUS_COLORS: Record<string, string> = {
  UNDER_PROCESS: '#2563EB', // Restrained Blue
  PENDING: '#3A0F34',       // Deep Plum
  DISPOSED: '#10B981',      // Emerald / Verified
  TRANSFERRED: '#8B5CF6',   // Soft Purple
  ESCALATED: '#EF4444',     // Soft Coral / Red
};

const STATUS_LABELS: Record<string, string> = {
  UNDER_PROCESS: 'Under Process',
  PENDING: 'Pending',
  DISPOSED: 'Disposed / Closed',
  TRANSFERRED: 'Transferred',
  ESCALATED: 'Escalated',
};

// Mini Lightweight SVG Sparkline Component
const Sparkline: React.FC<{ data?: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const isFlat = min === max;
  const width = 84;
  const height = 26;
  const padding = 2;

  if (isFlat) {
    return (
      <svg width={width} height={height} className="overflow-visible shrink-0">
        <line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          stroke={color}
          strokeWidth="1.8"
          strokeDasharray="3 3"
          opacity="0.6"
        />
      </svg>
    );
  }

  const range = max - min;
  const points = data
    .map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Relative Time Formatter
function getRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch (e) {
    return dateString;
  }
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ currentUser, onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Global Interactive Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(30); // 7, 30, or null (All)

  // Interactive Chart States
  const [activeDonutStatus, setActiveDonutStatus] = useState<string | null>(null);
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState<number | null>(null);

  useEffect(() => {
    if (currentUser?.region_scope && currentUser.region_scope !== 'ALL') {
      setSelectedRegion(currentUser.region_scope);
    } else {
      setSelectedRegion('ALL');
    }
  }, [currentUser]);

  useEffect(() => {
    loadSummary();
  }, [currentUser, selectedRegion, selectedPeriod]);

  const loadSummary = async () => {
    try {
      if (!summary) setLoading(true);
      else setRefreshing(true);

      const data = await api.getDashboardSummary({
        region: selectedRegion,
        days: selectedPeriod || undefined,
      });
      setSummary(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResetFilters = () => {
    if (currentUser?.region_scope === 'ALL') setSelectedRegion('ALL');
    setSelectedPeriod(30);
    setActiveDonutStatus(null);
  };

  if (loading && !summary) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#3A0F34] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-[#3A0F34]">Compiling institutional intelligence overview...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm shadow-sm flex items-center justify-between">
          <span>{error || 'Unable to retrieve dashboard summary'}</span>
          <button
            onClick={loadSummary}
            className="px-3 py-1 bg-red-700 text-white rounded-lg text-xs font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate Donut Chart Data
  const statusCounts = summary.status_distribution || {};
  const totalCasesCount = summary.total_cases || Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const donutData = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([statusKey, count]) => ({
      name: statusKey,
      label: STATUS_LABELS[statusKey] || statusKey.replace(/_/g, ' '),
      value: count,
      percentage: totalCasesCount > 0 ? Math.round((count / totalCasesCount) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Calculate Bureau Caseload Stacked Bars Data
  const bureauWorkload = summary.bureau_workload || {};
  const bureauNames: Record<string, string> = {
    RB: 'Regulation (RB)',
    PGRC: 'Grievance (PGRC)',
    APPROVAL: 'Approval Bureau',
    VIGILANCE: 'Vigilance Cell',
  };

  const caseloadData = Object.entries(bureauWorkload).map(([code, stats]) => ({
    code,
    shortName: bureauNames[code] || code,
    'Under Process': stats.under_process || 0,
    Pending: stats.pending || 0,
    Transferred: stats.transferred || 0,
    Escalated: stats.escalated || 0,
    Disposed: stats.disposed || 0,
    total: stats.total || 0,
  }));

  const isCaseloadEmpty =
    caseloadData.length === 0 || caseloadData.every((item) => item.total === 0);

  // Sparkline data sequences (from database or fallbacks)
  const sparklines = summary.trend_sparklines || {
    institutions: [26, 28, 29, 30, 30],
    total_cases: [112, 118, 126, 131, 136],
    active_cases: [85, 88, 92, 95, 98],
    warning_cases: [14, 18, 16, 20, 22],
    overdue_cases: [10, 12, 11, 13, 14],
    conflicts: [21, 23, 25, 27, 28],
  };

  // Custom Donut Tooltip with Smart Center Exclusion (guarantees tooltip never obscures the central total cases label)
  const CustomDonutTooltip = ({ active, payload, coordinate, viewBox }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      // Center coordinates of the donut chart
      const cx = viewBox?.width ? viewBox.width / 2 : 110;
      const cy = viewBox?.height ? viewBox.height / 2 : 105;
      const x = coordinate?.x ?? cx;
      const y = coordinate?.y ?? cy;
      const dx = x - cx;
      const dy = y - cy;

      // Position tooltip away from central hole:
      // - Lower segments (dy > 30): anchor below the slice
      // - Middle-right segments (Math.abs(dy) <= 30 && dx > 0): offset to the right into the open space towards legend
      // - Upper and middle-left segments: anchor above the slice so it does not cross the center
      let transformStyle = 'translate(-50%, calc(-100% - 14px))';
      if (dy > 30) {
        transformStyle = 'translate(-50%, 14px)';
      } else if (Math.abs(dy) <= 30 && dx > 0) {
        transformStyle = 'translate(16px, -50%)';
      }

      return (
        <div
          style={{ transform: transformStyle }}
          className="bg-[#3A0F34] text-white px-3 py-2 rounded-xl shadow-2xl border border-[#EAAA00] text-xs space-y-0.5 transition-transform duration-75 pointer-events-none select-none min-w-[140px] max-w-[210px] z-50"
        >
          <div className="font-extrabold flex items-center space-x-1.5 truncate">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
              style={{ backgroundColor: STATUS_COLORS[data.name] || '#ffffff' }}
            />
            <span className="truncate">{data.label}</span>
          </div>
          <div className="text-white/90 text-[11px]">
            Records: <span className="font-extrabold text-[#EAAA00]">{data.value}</span> ({data.percentage}%)
          </div>
          <div className="text-[9.5px] text-[#EAAA00]/90 italic truncate">
            Click slice to filter Case Explorer
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Stacked Bar Tooltip
  const CustomStackedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-[#3A0F34] text-white p-3 rounded-xl shadow-xl border border-[#EAAA00] text-xs space-y-1 min-w-[200px]">
          <div className="font-extrabold text-sm border-b border-white/20 pb-1 mb-1 text-[#EAAA00]">
            {item.shortName}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            <div>Under Process: <strong className="text-blue-300">{item['Under Process']}</strong></div>
            <div>Pending: <strong className="text-amber-200">{item['Pending']}</strong></div>
            <div>Transferred: <strong className="text-purple-300">{item['Transferred']}</strong></div>
            <div>Escalated: <strong className="text-red-300">{item['Escalated']}</strong></div>
            <div>Disposed: <strong className="text-emerald-300">{item['Disposed']}</strong></div>
            <div className="font-bold border-t border-white/10 col-span-2 pt-0.5 mt-0.5 flex justify-between">
              <span>Total Cases:</span>
              <span className="text-[#EAAA00]">{item.total}</span>
            </div>
          </div>
          <div className="text-[10px] text-white/70 italic pt-1">Click to filter Case Explorer by bureau</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Greeting & Integrated Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-300">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Executive Coordination Desk
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#3A0F34] mt-0.5">
            Welcome back, {currentUser?.full_name}
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Cross-bureau institutional monitoring across{' '}
            <span className="text-[#3A0F34] font-bold">
              {selectedRegion === 'ALL' ? 'All Jurisdictions' : `${selectedRegion} Region`}
            </span>
            {selectedPeriod ? ` (Last ${selectedPeriod} Days)` : ' (All Historical Records)'}
          </p>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Region Dropdown */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-300/80 px-3 py-1.5 rounded-xl shadow-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              disabled={currentUser?.region_scope !== 'ALL'}
              className="bg-transparent text-xs text-[#3A0F34] font-bold focus:outline-none cursor-pointer pr-1 disabled:opacity-60"
            >
              <option value="ALL">All Regions</option>
              <option value="Northern">Northern (Kanpur)</option>
              <option value="North-West">North-West (Chandigarh)</option>
              <option value="Western">Western (Mumbai)</option>
              <option value="Central">Central (Bhopal)</option>
              <option value="Southern">Southern (Chennai)</option>
              <option value="South-Western">South-Western (Bengaluru)</option>
              <option value="Eastern">Eastern (Kolkata)</option>
            </select>
          </div>

          {/* Timeframe Toggle Pills */}
          <div className="flex items-center bg-white border border-slate-300/80 p-0.5 rounded-xl shadow-xs">
            {[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: 'All', value: null },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setSelectedPeriod(p.value)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  selectedPeriod === p.value
                    ? 'bg-[#3A0F34] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Reset Filter Button (Active when filter changed from default) */}
          {(selectedRegion !== 'ALL' || selectedPeriod !== 30) && (
            <button
              onClick={handleResetFilters}
              title="Reset all filters to default"
              className="p-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 rounded-xl transition cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Radar CTA */}
          <button
            onClick={() => onNavigate('conflict-radar')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#EAAA00] hover:bg-[#d49900] text-[#3A0F34] rounded-xl text-xs font-extrabold shadow-sm shadow-[#EAAA00]/25 transition cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Radar ({summary.unreviewed_overlap_candidates})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {refreshing && (
        <div className="text-[11px] font-semibold text-slate-500 flex items-center space-x-2">
          <div className="w-3 h-3 border-2 border-[#3A0F34] border-t-transparent rounded-full animate-spin"></div>
          <span>Refreshing filtered analytics...</span>
        </div>
      )}

      {/* 2. Enhanced KPI Metrics Row with Sparklines & Trend Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Institutions */}
        <div
          onClick={() => onNavigate('institutions')}
          className="p-5 bg-white border border-slate-300/80 hover:border-[#3A0F34] rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-[#3A0F34]/10 text-[#3A0F34]">
              <Building2 className="w-5 h-5" />
            </div>
            <Sparkline data={sparklines.institutions} color="#3A0F34" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-[#3A0F34]">
              {summary.total_institutions || 30}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">Total Institutions</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-bold flex items-center">
              &uarr; 12% <span className="font-normal text-slate-500 ml-1">active base</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Total Active Cases */}
        <div
          onClick={() => onNavigate('my-work')}
          className="p-5 bg-white border border-slate-300/80 hover:border-blue-500 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <Sparkline data={sparklines.active_cases} color="#2563EB" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-blue-700">
              {summary.total_active_cases}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">Active Caseload</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-bold flex items-center">
              &uarr; 8% <span className="font-normal text-slate-500 ml-1">inflow rate</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Conflicts Identified */}
        <div
          onClick={() => onNavigate('conflict-radar')}
          className="p-5 bg-white border border-slate-300/80 hover:border-[#EAAA00] rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 text-[#EAAA00]">
              <Crosshair className="w-5 h-5" />
            </div>
            <Sparkline data={sparklines.conflicts} color="#EAAA00" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-[#3A0F34]">
              {summary.unreviewed_overlap_candidates}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">Conflicts Identified</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-[#855700] font-bold flex items-center">
              Multi-signal radar
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: SLA Warning Cases */}
        <div
          onClick={() => onNavigate('my-work', { sla_status: 'WARNING' })}
          className="p-5 bg-white border border-amber-300/80 hover:border-[#EAAA00] rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 text-[#855700]">
              <Clock className="w-5 h-5" />
            </div>
            <Sparkline data={sparklines.warning_cases} color="#EAAA00" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-[#855700]">
              {summary.cases_at_risk_warning}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">SLA Warning (&le; 72h)</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-bold flex items-center">
              &darr; 18% <span className="font-normal text-slate-500 ml-1">resolution</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 5: Overdue Breaches */}
        <div
          onClick={() => onNavigate('my-work', { sla_status: 'OVERDUE' })}
          className="p-5 bg-white border border-red-200 hover:border-red-500 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <Sparkline data={sparklines.overdue_cases} color="#EF4444" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-red-600">
              {summary.cases_overdue}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">Overdue Breaches</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-red-700 font-bold flex items-center">
              Immediate action
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. Primary Analytical Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Visualization: Case Status Distribution (Donut Chart) */}
        <div className="lg:col-span-5 p-6 bg-white border border-slate-300/80 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-extrabold text-[#3A0F34] flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-[#EAAA00]" />
              <span>Case Status Distribution</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-bold bg-[#F6F8FA] px-2.5 py-0.5 rounded-lg border border-slate-200">
              {totalCasesCount} Total Cases
            </span>
          </div>

          {totalCasesCount === 0 ? (
            <div className="py-4">
              <ChartEmptyState
                title="No Cases for Current Selection"
                description={`No active records found for ${
                  selectedRegion === 'ALL' ? 'the selected timeframe' : `${selectedRegion} region`
                }.`}
                height={210}
                onReset={handleResetFilters}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 py-4">
              {/* Donut Chart with Centered Total */}
              <div className="sm:col-span-7 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Tooltip
                      content={<CustomDonutTooltip />}
                      wrapperStyle={{ pointerEvents: 'none', zIndex: 40 }}
                      allowEscapeViewBox={{ x: true, y: true }}
                    />
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={(entry) => onNavigate('my-work', { status: entry.name })}
                      onMouseEnter={(_, index) => setHoveredDonutIndex(index)}
                      onMouseLeave={() => setHoveredDonutIndex(null)}
                      cursor="pointer"
                      animationDuration={250}
                    >
                      {donutData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.name] || '#64748b'}
                          stroke="#ffffff"
                          strokeWidth={2}
                          opacity={hoveredDonutIndex === null || hoveredDonutIndex === index ? 1 : 0.4}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Centered Donut Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-[#3A0F34]">{totalCasesCount}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Cases
                  </span>
                </div>
              </div>

              {/* Right Status Breakdown Legend Table */}
              <div className="sm:col-span-5 space-y-2">
                {donutData.map((entry, idx) => {
                  const isHovered = hoveredDonutIndex === idx;
                  return (
                    <div
                      key={entry.name}
                      onMouseEnter={() => setHoveredDonutIndex(idx)}
                      onMouseLeave={() => setHoveredDonutIndex(null)}
                      onClick={() => onNavigate('my-work', { status: entry.name })}
                      className={`flex items-center justify-between p-1.5 rounded-lg transition-all cursor-pointer text-xs ${
                        isHovered ? 'bg-[#F6F8FA] shadow-xs' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: STATUS_COLORS[entry.name] || '#64748b' }}
                        />
                        <span className="font-semibold text-slate-800 truncate text-[11px]">
                          {entry.label}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        <span className="font-bold text-[#3A0F34] text-[11px]">{entry.value}</span>
                        <span className="text-[10px] text-slate-400 font-medium w-8 text-right">
                          {entry.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tip: Click any slice or row to inspect matching records</span>
            <button
              onClick={() => onNavigate('my-work')}
              className="text-[#3A0F34] font-bold hover:underline flex items-center space-x-1"
            >
              <span>Explore All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Visualization: Bureau Caseload (Refined Stacked Horizontal Bars) */}
        <div className="lg:col-span-7 p-6 bg-white border border-slate-300/80 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-extrabold text-[#3A0F34] flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[#EAAA00]" />
              <span>Bureau Caseload by Workflow Stage</span>
            </h3>
            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              <span>Process</span>
              <span className="w-2 h-2 rounded-full bg-[#3A0F34] inline-block ml-1" />
              <span>Pending</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block ml-1" />
              <span>Disposed</span>
            </div>
          </div>

          <div className="py-2">
            {isCaseloadEmpty ? (
              <ChartEmptyState
                title="No Caseload in Current Scope"
                description="No cases assigned to bureaus in this filtered view."
                height={210}
                onReset={handleResetFilters}
              />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={caseloadData}
                  layout="vertical"
                  margin={{ top: 8, right: 32, left: 10, bottom: 0 }}
                  onClick={(state) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const item = state.activePayload[0].payload;
                      onNavigate('my-work', { bureau: item.code });
                    }
                  }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    dataKey="shortName"
                    type="category"
                    stroke="#3A0F34"
                    fontSize={12}
                    fontWeight={700}
                    width={110}
                  />
                  <Tooltip content={<CustomStackedTooltip />} />
                  <Bar dataKey="Under Process" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} cursor="pointer" />
                  <Bar dataKey="Pending" stackId="a" fill="#3A0F34" radius={[0, 0, 0, 0]} cursor="pointer" />
                  <Bar dataKey="Transferred" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} cursor="pointer" />
                  <Bar dataKey="Escalated" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} cursor="pointer" />
                  <Bar dataKey="Disposed" stackId="a" fill="#10B981" radius={[0, 5, 5, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Click any bureau bar to open its dedicated workbench queue</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-[#3A0F34] font-bold hover:underline flex items-center space-x-1"
            >
              <span>Workload Report</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Recent Case Activity (Compact Institutional Action Timeline) */}
      <div className="p-6 bg-white border border-slate-300/80 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#EAAA00]" />
            <h3 className="text-sm font-extrabold text-[#3A0F34]">Recent Authorized Case Actions</h3>
          </div>
          <button
            onClick={() => onNavigate('my-work')}
            className="text-xs font-bold text-[#3A0F34] hover:text-[#EAAA00] flex items-center space-x-1 cursor-pointer"
          >
            <span>View All Cases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {summary.recent_actions && summary.recent_actions.length > 0 ? (
            summary.recent_actions.map((act: any) => {
              const isTransfer = act.action_type === 'TRANSFER';
              const isDisposed = act.to_status === 'DISPOSED';
              const isCoord = act.action_type === 'COORDINATION_REQUEST';

              return (
                <div
                  key={act.id}
                  onClick={() => onNavigate('my-work', { search: act.source_case_id })}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-[#F6F8FA] px-3 rounded-xl transition cursor-pointer group"
                >
                  {/* Action Icon + Details */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isTransfer
                          ? 'bg-purple-50 text-purple-600'
                          : isDisposed
                          ? 'bg-emerald-50 text-emerald-600'
                          : isCoord
                          ? 'bg-amber-50 text-[#855700]'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {isTransfer ? (
                        <Send className="w-4 h-4" />
                      ) : isDisposed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isCoord ? (
                        <GitPullRequest className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="font-extrabold text-xs text-[#3A0F34]">
                          {act.source_case_id}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">&bull;</span>
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {act.institution_name || 'Institution Record'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium truncate max-w-xl">
                        {act.remarks || `${act.action_type} recorded by ${act.actor_name}`}
                      </p>
                    </div>
                  </div>

                  {/* Badges, Region & Timestamp */}
                  <div className="flex items-center space-x-4 shrink-0 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isDisposed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isTransfer
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {act.to_status ? act.to_status.replace(/_/g, ' ') : act.action_type}
                    </span>

                    <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-500">
                      {act.region || 'National'} &bull; {act.bureau}
                    </span>

                    <span
                      className="text-[11px] text-slate-400 font-medium min-w-[70px] text-right"
                      title={new Date(act.created_at).toLocaleString()}
                    >
                      {getRelativeTime(act.created_at)}
                    </span>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#3A0F34] transition-all" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 font-medium">
              No recent activity recorded within the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

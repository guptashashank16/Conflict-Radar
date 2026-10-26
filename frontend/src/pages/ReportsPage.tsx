import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { User } from '../types';
import {
  BarChart3,
  Upload,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import {
  CHART_STATUS_COLORS,
  BUREAU_SHORT_LABELS,
  ChartEmptyState,
  ChartLoadingState,
  ChartTooltipShell
} from '../components/charts/SharedChartHelpers';

interface ReportsPageProps {
  currentUser: User | null;
  onNavigate?: (tab: string, filters?: any) => void;
  initialSection?: string;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  currentUser,
  onNavigate,
  initialSection,
}) => {
  const [workload, setWorkload] = useState<any>(null);
  const [ageing, setAgeing] = useState<any>(null);
  const [importJobs, setImportJobs] = useState<any[]>([]);
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // CSV Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.region_scope && currentUser.region_scope !== 'ALL') {
      setRegionFilter(currentUser.region_scope);
    } else {
      setRegionFilter('ALL');
    }
  }, [currentUser]);

  useEffect(() => {
    loadReports();
  }, [currentUser, regionFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [wlData, agData, jobsData] = await Promise.all([
        api.getWorkloadReport(regionFilter),
        api.getAgeingReport(regionFilter),
        api.getImportJobs(),
      ]);
      setWorkload(wlData);
      setAgeing(agData);
      setImportJobs(jobsData);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleUploadCSV = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);
    try {
      const result = await api.uploadCSV(selectedFile);
      setUploadResult(result);
      setSelectedFile(null);
      await loadReports();
    } catch (err: any) {
      setUploadError(err.message || 'CSV ingestion failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading && !workload) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <ChartLoadingState message="Compiling verified bureau workload and ageing intelligence..." />
      </div>
    );
  }

  // Format chart data for workload
  const rawWorkload = workload?.bureau_workload || {};
  const workloadChartData = Object.entries(rawWorkload).map(([bureau, stats]: any) => ({
    bureau,
    bureauLabel: BUREAU_SHORT_LABELS[bureau] || bureau,
    Pending: stats.pending || 0,
    'Under Process': stats.under_process || 0,
    Transferred: stats.transferred || 0,
    Escalated: stats.escalated || 0,
    Disposed: stats.disposed || 0,
    Overdue: stats.overdue || 0,
    total: stats.total || 0,
  }));

  const isWorkloadEmpty =
    workloadChartData.length === 0 ||
    workloadChartData.every((b) => b.total === 0);

  // Format ageing data
  const ageingBuckets = ageing?.ageing_buckets || {};
  const ageingChartData = [
    {
      bucket: '< 7 Days',
      count: ageingBuckets['less_than_7_days'] || 0,
      description: 'Recent registrations',
    },
    {
      bucket: '7 - 14 Days',
      count: ageingBuckets['7_to_14_days'] || 0,
      description: 'Under standard review',
    },
    {
      bucket: '15 - 30 Days',
      count: ageingBuckets['15_to_30_days'] || 0,
      description: 'SLA warning zone',
    },
    {
      bucket: '> 30 Days',
      count: ageingBuckets['greater_than_30_days'] || 0,
      description: 'Critical overdue backlog',
    },
  ];

  const isAgeingEmpty = (ageing?.total_active_cases || 0) === 0;

  // Real timestamped activity trends from backend
  const activityTrendsData = workload?.activity_trends || [];
  const isTrendsEmpty =
    activityTrendsData.length === 0 ||
    activityTrendsData.every((t: any) => t.inflow === 0 && t.disposed === 0);

  // Custom Tooltip for Bureau Workload Stacked Bars
  const CustomWorkloadTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <ChartTooltipShell
          title={data.bureauLabel}
          subtitle={`Total Cases: ${data.total}`}
        >
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Under Process: <strong>{data['Under Process']}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3A0F34]" />
              <span>Pending: <strong>{data['Pending']}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Transferred: <strong>{data['Transferred']}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>Escalated: <strong>{data['Escalated']}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5 col-span-2 pt-0.5 border-t border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Disposed / Resolved: <strong>{data['Disposed']}</strong></span>
            </div>
          </div>
          {onNavigate && (
            <div className="text-[10px] text-amber-200/80 pt-1 italic">
              Click row to filter Case Explorer
            </div>
          )}
        </ChartTooltipShell>
      );
    }
    return null;
  };

  // Custom Tooltip for Ageing Bars
  const CustomAgeingTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <ChartTooltipShell title={`Ageing Window: ${data.bucket}`}>
          <div className="text-sm font-extrabold text-[#EAAA00]">
            {data.count} <span className="text-xs font-normal text-white">cases</span>
          </div>
          <div className="text-[11px] text-[#DDE3E8]/80">{data.description}</div>
          {onNavigate && (
            <div className="text-[10px] text-amber-200/80 pt-1 italic">
              Click bar to inspect matching cases
            </div>
          )}
        </ChartTooltipShell>
      );
    }
    return null;
  };

  // Custom Tooltip for Activity Trends
  const CustomTrendsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <ChartTooltipShell title={`Week Starting ${data.period}`}>
          <div className="space-y-1 text-[11px] pt-0.5">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-blue-300 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                <span>New Inflow:</span>
              </span>
              <strong className="text-white">{data.inflow} cases</strong>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-emerald-300 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Disposed / Closed:</span>
              </span>
              <strong className="text-white">{data.disposed} cases</strong>
            </div>
          </div>
        </ChartTooltipShell>
      );
    }
    return null;
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Header & Jurisdiction Scope Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-300">
        <div>
          <h2 className="text-2xl font-extrabold text-[#3A0F34] tracking-tight flex items-center space-x-2.5">
            <BarChart3 className="w-6 h-6 text-[#EAAA00]" />
            <span>Workload Analytics & Ingestion Workbench</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Cross-bureau SLA compliance, operational ageing metrics, and validated intake pipeline
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-slate-300/80 px-3 py-1.5 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-slate-600">Jurisdiction:</span>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              disabled={currentUser?.region_scope !== 'ALL'}
              className="bg-transparent text-xs text-[#3A0F34] font-extrabold focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Regions (Consolidated)</option>
              <option value="Northern">Northern (Kanpur)</option>
              <option value="North-West">North-West (Chandigarh)</option>
              <option value="Western">Western (Mumbai)</option>
              <option value="Central">Central (Bhopal)</option>
              <option value="Southern">Southern (Chennai)</option>
              <option value="South-Western">South-Western (Bengaluru)</option>
              <option value="Eastern">Eastern (Kolkata)</option>
            </select>
          </div>

          {regionFilter !== 'ALL' && (
            <button
              onClick={() => setRegionFilter('ALL')}
              title="Reset jurisdiction to all"
              className="p-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 rounded-xl transition cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. SLA Health KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: SLA Compliance */}
        <div className="p-5 bg-white border border-slate-300/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              SLA Compliance Rate
            </div>
            <div className="text-3xl font-extrabold text-emerald-700 mt-1">
              {ageing?.compliance_rate_percent || 0}%
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Cases within target statutory timeline
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        </div>

        {/* Card 2: Monitored Caseload */}
        <div
          onClick={() => onNavigate && onNavigate('my-work')}
          className="p-5 bg-white border border-slate-300/80 hover:border-[#3A0F34] rounded-2xl flex items-center justify-between shadow-xs cursor-pointer transition group"
        >
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Total Monitored Cases
            </div>
            <div className="text-3xl font-extrabold text-[#3A0F34] mt-1">
              {ageing?.total_active_cases || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium flex items-center">
              <span>Authorized bureaus</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
          <div className="p-3 bg-[#3A0F34]/10 rounded-xl text-[#3A0F34]">
            <Layers className="w-7 h-7" />
          </div>
        </div>

        {/* Card 3: Ageing Severity */}
        <div
          onClick={() => onNavigate && onNavigate('my-work-overdue')}
          className="p-5 bg-white border border-slate-300/80 hover:border-red-400 rounded-2xl flex items-center justify-between shadow-xs cursor-pointer transition group"
        >
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
              Ageing Severity (&gt;30 Days)
            </div>
            <div className="text-3xl font-extrabold text-[#DC2626] mt-1">
              {ageing?.ageing_buckets?.greater_than_30_days || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium flex items-center">
              <span>Immediate escalation required</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <Clock className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* 3. Primary Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visualization A: Bureau Caseload Stacked Bars */}
        <div className="p-6 bg-white border border-slate-300/80 rounded-2xl space-y-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-extrabold text-[#3A0F34] flex items-center space-x-2">
                <span>Caseload State by Bureau</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Mutually exclusive workflow stages across authorized bureaus
              </p>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              <span>Process</span>
              <span className="w-2 h-2 rounded-full bg-[#3A0F34] inline-block ml-1" />
              <span>Pending</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block ml-1" />
              <span>Disposed</span>
            </div>
          </div>

          <div className="w-full min-h-[250px] flex items-center justify-center">
            {isWorkloadEmpty ? (
              <ChartEmptyState
                title="No Caseload for Selected Jurisdiction"
                description={`No active cases found for ${
                  regionFilter === 'ALL' ? 'the selected filter' : `${regionFilter} region`
                }.`}
                onReset={() => setRegionFilter('ALL')}
              />
            ) : (
              <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={workloadChartData}
                    margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                    onClick={(state) => {
                      if (onNavigate && state && state.activePayload && state.activePayload.length > 0) {
                        const item = state.activePayload[0].payload;
                        onNavigate('my-work', { bureau: item.bureau });
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="bureau"
                      stroke="#64748b"
                      fontSize={11}
                      fontWeight={600}
                    />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip content={<CustomWorkloadTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar
                      dataKey="Under Process"
                      stackId="bureauStack"
                      fill={CHART_STATUS_COLORS.UNDER_PROCESS}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="Pending"
                      stackId="bureauStack"
                      fill={CHART_STATUS_COLORS.PENDING}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="Transferred"
                      stackId="bureauStack"
                      fill={CHART_STATUS_COLORS.TRANSFERRED}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="Escalated"
                      stackId="bureauStack"
                      fill={CHART_STATUS_COLORS.ESCALATED}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="Disposed"
                      stackId="bureauStack"
                      fill={CHART_STATUS_COLORS.DISPOSED}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Click any bureau column to filter matching case records</span>
            {onNavigate && (
              <button
                onClick={() => onNavigate('my-work')}
                className="text-[#3A0F34] font-bold hover:underline flex items-center"
              >
                <span>View All</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>
        </div>

        {/* Visualization B: Case Ageing Distribution */}
        <div className="p-6 bg-white border border-slate-300/80 rounded-2xl space-y-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-extrabold text-[#3A0F34]">Case Ageing Distribution</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Resolution latency by target regulatory SLA windows
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              Statutory Thresholds
            </span>
          </div>

          <div className="w-full min-h-[250px] flex items-center justify-center">
            {isAgeingEmpty ? (
              <ChartEmptyState
                title="Zero Ageing Backlog"
                description="No open unresolved cases present for the current jurisdiction."
                onReset={() => setRegionFilter('ALL')}
              />
            ) : (
              <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={ageingChartData}
                    margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                    onClick={(state) => {
                      if (onNavigate && state && state.activePayload && state.activePayload.length > 0) {
                        const item = state.activePayload[0].payload;
                        if (item.bucket === '> 30 Days') {
                          onNavigate('my-work-overdue');
                        } else if (item.bucket === '15 - 30 Days') {
                          onNavigate('my-work-warnings');
                        } else {
                          onNavigate('my-work');
                        }
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="bucket"
                      stroke="#64748b"
                      fontSize={11}
                      fontWeight={600}
                    />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip content={<CustomAgeingTooltip />} />
                    <Bar
                      dataKey="count"
                      fill="#3A0F34"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Click any bracket to drill down into active or overdue cases</span>
            {onNavigate && (
              <button
                onClick={() => onNavigate('my-work-overdue')}
                className="text-[#DC2626] font-bold hover:underline flex items-center"
              >
                <span>Inspect Breaches</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Time-Series: Case Activity & Weekly Inflow vs. Resolution Trends */}
      <div className="p-6 bg-white border border-slate-300/80 rounded-2xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-extrabold text-[#3A0F34] flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#EAAA00]" />
              <span>Case Activity & Inflow vs. Resolution Trends</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Timestamped intake velocity and resolution throughput across the last 6 calendar weeks
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
              <span className="font-semibold">New Inflow</span>
            </span>
            <span className="flex items-center space-x-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" />
              <span className="font-semibold">Disposed / Closed</span>
            </span>
          </div>
        </div>

        <div className="w-full min-h-[220px] flex items-center justify-center">
          {isTrendsEmpty ? (
            <ChartEmptyState
              title="No Activity Trends Available"
              description="Historical activity timestamps are compiling for the selected region."
              height={220}
              onReset={() => setRegionFilter('ALL')}
            />
          ) : (
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={activityTrendsData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="disposedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="period"
                    stroke="#64748b"
                    fontSize={11}
                    fontWeight={600}
                  />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip content={<CustomTrendsTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="inflow"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#inflowGradient)"
                    name="New Inflow"
                  />
                  <Area
                    type="monotone"
                    dataKey="disposed"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#disposedGradient)"
                    name="Disposed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 5. Validated CSV Ingestion Workbench */}
      <div className="p-6 bg-white border border-slate-300/80 rounded-2xl space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-extrabold text-[#3A0F34] flex items-center space-x-2">
              <Upload className="w-5 h-5 text-[#EAAA00]" />
              <span>Validated CSV Ingestion & Integration Workbench</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Supports bulk intake with column validation, identity resolution, duplicate rejection, and automatic Conflict Radar candidate generation
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="p-6 border-2 border-dashed border-[#3A0F34]/30 hover:border-[#3A0F34] rounded-xl bg-[#F6F8FA] text-center space-y-4 transition">
          <div className="flex flex-col items-center space-y-2">
            <FileText className="w-10 h-10 text-[#3A0F34]" />
            <div className="text-sm font-bold text-slate-800">
              {selectedFile ? selectedFile.name : 'Select or drop a complaint intake CSV file'}
            </div>
            <p className="text-xs text-slate-600 max-w-md font-medium">
              Required headers: source_system, source_case_id, bureau, category, subject, description, aicte_permanent_id, institution_name
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold cursor-pointer border border-slate-300 transition shadow-xs">
              <span>Choose CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>

            {selectedFile && (
              <button
                onClick={handleUploadCSV}
                disabled={uploading}
                className="px-5 py-2 bg-[#EAAA00] hover:bg-[#d49900] text-[#3A0F34] rounded-lg text-xs font-extrabold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Processing & Matching...' : 'Upload & Ingest Intake Batch'}
              </button>
            )}
          </div>

          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 max-w-md mx-auto">
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 max-w-xl mx-auto text-left space-y-2">
              <div className="font-bold flex items-center space-x-1.5 text-sm text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Ingestion Completed Successfully</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div>Rows: <strong>{uploadResult.total_rows}</strong></div>
                <div>Created: <strong>{uploadResult.successful_rows}</strong></div>
                <div>Duplicates: <strong>{uploadResult.duplicate_rows}</strong></div>
                <div>Radar Signals: <strong className="text-[#EAAA00]">{uploadResult.overlap_candidates_generated}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Ingestion Audit History */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Recent Batch Ingestion Audit Log
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F8FA] border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Filename</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Processed</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Conflicts Generated</th>
                  <th className="p-3">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500 text-xs">
                      No ingestion jobs executed yet. Upload sample CSV above to intake cases.
                    </td>
                  </tr>
                ) : (
                  importJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-[#3A0F34]">{job.id.slice(0, 8)}...</td>
                      <td className="p-3 font-medium text-slate-800">{job.filename}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {job.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{job.total_rows}</td>
                      <td className="p-3 font-mono text-emerald-700 font-bold">{job.successful_rows}</td>
                      <td className="p-3 font-mono font-bold text-[#EAAA00]">
                        {job.overlap_candidates_generated}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { BarChart3, Inbox } from 'lucide-react';

// Unified status color map adhering to Deep Plum (#3A0F34) + Marigold (#EAAA00) + Semantic Tokens
export const CHART_STATUS_COLORS: Record<string, string> = {
  UNDER_PROCESS: '#2563EB', // Semantic Blue (In-progress)
  PENDING: '#3A0F34',       // Deep Plum
  DISPOSED: '#10B981',      // Semantic Green (Completed / Verified)
  TRANSFERRED: '#8B5CF6',   // Soft Violet
  ESCALATED: '#EF4444',     // Semantic Red (Alert / Escalated)
  WARNING: '#EAAA00',       // Marigold (SLA Warning)
  OVERDUE: '#DC2626',       // Semantic Deep Red (Overdue Breach)
  NORMAL: '#10B981',        // Semantic Green (SLA Compliant)
};

export const CHART_STATUS_LABELS: Record<string, string> = {
  UNDER_PROCESS: 'Under Process',
  PENDING: 'Pending',
  DISPOSED: 'Disposed / Closed',
  TRANSFERRED: 'Transferred',
  ESCALATED: 'Escalated',
  WARNING: 'SLA Warning',
  OVERDUE: 'Overdue Breach',
  NORMAL: 'SLA Compliant',
};

export const BUREAU_SHORT_LABELS: Record<string, string> = {
  RB: 'Regulation (RB)',
  PGRC: 'Grievance (PGRC)',
  APPROVAL: 'Approval Bureau',
  VIGILANCE: 'Vigilance Cell',
};

// Reusable Empty State for Charts
interface ChartEmptyStateProps {
  title?: string;
  description?: string;
  height?: number | string;
  onReset?: () => void;
}

export const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({
  title = 'No Data Available',
  description = 'No matching records found for the current region, bureau, or date filter.',
  height = 220,
  onReset,
}) => {
  return (
    <div
      style={{ height }}
      className="w-full flex flex-col items-center justify-center p-6 bg-[#F6F8FA] border border-dashed border-slate-300 rounded-xl text-center select-none"
    >
      <div className="w-10 h-10 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-500 mb-2.5">
        <Inbox className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-xs font-bold text-[#3A0F34]">{title}</p>
      <p className="text-[11px] text-slate-500 max-w-xs mt-1 font-medium leading-relaxed">
        {description}
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-3 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-[#3A0F34] rounded-lg shadow-xs transition cursor-pointer"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
};

// Reusable Loading State for Charts
export const ChartLoadingState: React.FC<{ height?: number | string; message?: string }> = ({
  height = 220,
  message = 'Loading analytics...',
}) => {
  return (
    <div
      style={{ height }}
      className="w-full flex flex-col items-center justify-center p-6 bg-[#F6F8FA]/60 rounded-xl text-center select-none"
    >
      <div className="w-7 h-7 border-3 border-[#3A0F34] border-t-transparent rounded-full animate-spin mb-2" />
      <p className="text-xs font-bold text-[#3A0F34]">{message}</p>
    </div>
  );
};

// Reusable Tooltip Shell
export const ChartTooltipShell: React.FC<{
  title: string;
  children: React.ReactNode;
  subtitle?: string;
}> = ({ title, children, subtitle }) => {
  return (
    <div className="bg-[#3A0F34] text-white p-3 rounded-xl shadow-xl border border-[#EAAA00] text-xs space-y-1.5 min-w-[190px]">
      <div className="border-b border-white/20 pb-1">
        <div className="font-extrabold text-[#EAAA00] text-xs tracking-tight">{title}</div>
        {subtitle && <div className="text-[10px] text-[#DDE3E8]/80">{subtitle}</div>}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

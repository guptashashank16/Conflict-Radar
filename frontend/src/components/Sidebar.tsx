import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Crosshair,
  BarChart3,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Info,
  Layers,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  FileSpreadsheet,
  History,
  Lock,
  UserCheck
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string, filters?: any) => void;
  currentUser: User | null;
  unreviewedOverlapsCount: number;
  atRiskCount: number;
}

interface NavChild {
  id: string;
  label: string;
  icon?: any;
  badge?: string | number | null;
  badgeColor?: string;
  filters?: any;
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  defaultTab: string;
  defaultFilters?: any;
  badge?: string | number | null;
  badgeColor?: string;
  highlight?: boolean;
  adminOnly?: boolean;
  children: NavChild[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  unreviewedOverlapsCount,
  atRiskCount,
}) => {
  const isAuditorOrAdmin =
    currentUser?.role === 'SECURITY_ADMIN' || currentUser?.role === 'AUDITOR';

  // Navigation Groups Definition
  const navGroups: NavGroup[] = [
    {
      id: 'overview-group',
      label: 'Overview',
      icon: LayoutDashboard,
      defaultTab: 'overview',
      children: [
        {
          id: 'overview',
          label: 'Executive Dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      id: 'institutions-group',
      label: 'Institutions',
      icon: Building2,
      defaultTab: 'institutions',
      children: [
        {
          id: 'institutions',
          label: 'Institutions 360°',
          icon: Building2,
        },
        {
          id: 'institutions-directory',
          label: 'Institution Directory',
          icon: Layers,
        },
      ],
    },
    {
      id: 'workflows-group',
      label: 'Case Management',
      icon: Briefcase,
      defaultTab: 'my-work',
      badge: atRiskCount > 0 ? `${atRiskCount} SLA` : null,
      badgeColor: 'bg-[#EAAA00] text-[#3A0F34]',
      children: [
        {
          id: 'my-work',
          label: 'All Active Cases',
          icon: Briefcase,
        },
        {
          id: 'my-work-pending',
          label: 'Pending Scrutiny',
          icon: Clock,
          filters: { status: 'PENDING' },
        },
        {
          id: 'my-work-warnings',
          label: 'SLA Warning Cases',
          icon: AlertTriangle,
          badge: atRiskCount > 0 ? atRiskCount : null,
          badgeColor: 'bg-amber-500/20 text-[#EAAA00]',
          filters: { sla_status: 'WARNING' },
        },
        {
          id: 'my-work-overdue',
          label: 'Overdue Breaches',
          icon: AlertTriangle,
          filters: { sla_status: 'OVERDUE' },
        },
        {
          id: 'my-work-transfers',
          label: 'Transferred Matters',
          icon: ArrowRightLeft,
          filters: { status: 'TRANSFERRED' },
        },
      ],
    },
    {
      id: 'radar-group',
      label: 'Conflict Radar',
      icon: Crosshair,
      defaultTab: 'conflict-radar',
      highlight: true,
      badge: unreviewedOverlapsCount > 0 ? `${unreviewedOverlapsCount} Alerts` : null,
      badgeColor: 'bg-rose-500 text-white',
      children: [
        {
          id: 'conflict-radar',
          label: 'Radar Overview',
          icon: Crosshair,
        },
        {
          id: 'conflict-radar-unreviewed',
          label: 'Priority Alerts',
          icon: AlertTriangle,
          badge: unreviewedOverlapsCount > 0 ? unreviewedOverlapsCount : null,
          badgeColor: 'bg-rose-500/30 text-rose-300',
        },
        {
          id: 'conflict-radar-linked',
          label: 'Linked Cross-Bureau Cases',
          icon: Layers,
        },
      ],
    },
    {
      id: 'reports-group',
      label: 'Reports & Analytics',
      icon: BarChart3,
      defaultTab: 'reports',
      children: [
        {
          id: 'reports',
          label: 'Workload Analytics',
          icon: BarChart3,
        },
        {
          id: 'reports-ageing',
          label: 'Case Ageing Breakdown',
          icon: Clock,
        },
        {
          id: 'reports-ingestion',
          label: 'CSV Ingestion Workbench',
          icon: FileSpreadsheet,
        },
      ],
    },
  ];

  if (isAuditorOrAdmin) {
    navGroups.push({
      id: 'admin-group',
      label: 'Security & Audit',
      icon: ShieldAlert,
      defaultTab: 'audit-admin',
      adminOnly: true,
      badge: 'Protected',
      badgeColor: 'bg-[#EAAA00]/20 text-[#EAAA00] border border-[#EAAA00]/40',
      children: [
        {
          id: 'audit-admin',
          label: 'Audit Trail Records',
          icon: History,
        },
        {
          id: 'audit-admin-security',
          label: 'Security Events',
          icon: Lock,
        },
        {
          id: 'audit-admin-roles',
          label: 'Role Controls & Scopes',
          icon: UserCheck,
        },
      ],
    });
  }

  // Find parent group of active tab
  const findParentGroupId = (tab: string): string => {
    for (const group of navGroups) {
      if (group.id === tab || group.defaultTab === tab) return group.id;
      if (group.children.some((c) => c.id === tab)) return group.id;
    }
    return 'overview-group';
  };

  // State for expanded parent groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const parentId = findParentGroupId(activeTab);
    return {
      'overview-group': true,
      [parentId]: true,
    };
  });

  // Auto-expand group when activeTab changes
  useEffect(() => {
    const parentId = findParentGroupId(activeTab);
    setExpandedGroups((prev) => ({
      ...prev,
      [parentId]: true,
    }));
  }, [activeTab]);

  const toggleGroup = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleGroupHeaderClick = (group: NavGroup) => {
    // If the group is already expanded and has children, navigate to default tab
    if (!expandedGroups[group.id]) {
      setExpandedGroups((prev) => ({ ...prev, [group.id]: true }));
    }
    setActiveTab(group.defaultTab, group.defaultFilters);
  };

  return (
    <aside className="fixed top-16 left-0 bottom-0 w-64 bg-[#3A0F34] border-r border-[#EAAA00]/25 flex flex-col justify-between shrink-0 font-['Plus_Jakarta_Sans',sans-serif] text-slate-100 shadow-xl select-none z-30">
      {/* Navigation Groups Container */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        <div>
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-[#EAAA00]">
            <span>Portal Navigation</span>
          </div>

          <nav className="space-y-1.5" role="navigation" aria-label="Portal Navigation">
            {navGroups.map((group) => {
              const GroupIcon = group.icon;
              const isGroupActive =
                activeTab === group.defaultTab ||
                group.children.some((child) => child.id === activeTab);
              const isExpanded = !!expandedGroups[group.id];

              return (
                <div key={group.id} className="rounded-xl transition-all">
                  {/* Group Header Button */}
                  <div
                    onClick={() => handleGroupHeaderClick(group)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                      isGroupActive
                        ? 'bg-[#3A0F34] text-white border-l-4 border-[#EAAA00] shadow-sm'
                        : group.highlight
                        ? 'text-[#EAAA00] hover:bg-white/10 hover:text-white bg-[#3A0F34]/40 border border-[#EAAA00]/25'
                        : 'text-[#DDE3E8]/90 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <GroupIcon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isGroupActive
                            ? 'text-[#EAAA00]'
                            : group.highlight
                            ? 'text-[#EAAA00]'
                            : 'text-[#DDE3E8]/70 group-hover:text-white'
                        }`}
                      />
                      <span className="truncate">{group.label}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                      {group.badge && (
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                            group.badgeColor || 'bg-white/20 text-white'
                          }`}
                        >
                          {group.badge}
                        </span>
                      )}
                      {group.children.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => toggleGroup(group.id, e)}
                          aria-label={`Toggle ${group.label} submenu`}
                          className="p-1 hover:bg-white/10 rounded-md text-[#DDE3E8]/70 hover:text-white transition cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[#EAAA00]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[#DDE3E8]/60" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submenu Children Links */}
                  {isExpanded && group.children.length > 0 && (
                    <div className="mt-1 ml-4 pl-2 border-l border-white/15 space-y-0.5 py-0.5">
                      {group.children.map((child) => {
                        const isChildActive = activeTab === child.id;
                        const ChildIcon = child.icon || Layers;

                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => setActiveTab(child.id, child.filters)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              isChildActive
                                ? 'bg-[#EAAA00] text-[#3A0F34] font-extrabold shadow-sm'
                                : 'text-[#DDE3E8]/80 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <ChildIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isChildActive ? 'text-[#3A0F34]' : 'text-[#DDE3E8]/60'
                                }`}
                              />
                              <span className="truncate">{child.label}</span>
                            </div>

                            {child.badge && (
                              <span
                                className={`px-1.5 py-0.2 text-[9px] font-extrabold rounded-full ${
                                  isChildActive
                                    ? 'bg-[#3A0F34] text-white'
                                    : child.badgeColor || 'bg-white/20 text-white'
                                }`}
                              >
                                {child.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Radar Architecture Note */}
        <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-xs text-[#DDE3E8]/80 space-y-1 shadow-xs">
          <div className="flex items-center space-x-1.5 text-[#EAAA00] font-bold text-[11px]">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Radar Governance</span>
          </div>
          <p className="text-[10.5px] leading-relaxed text-[#DDE3E8]/70">
            Cases, SLA timers, and Conflict Radar signals are server-enforced with OCC concurrency protection.
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="p-3 border-t border-white/10 text-center space-y-0.5 bg-[#3A0F34]">
        <p className="font-extrabold text-xs text-[#EAAA00]">AICTE Conflict Radar</p>
        <p className="text-[10px] text-[#DDE3E8]/60">All India Council for Technical Education</p>
      </div>
    </aside>
  );
};

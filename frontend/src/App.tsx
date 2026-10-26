import React, { useEffect, useState } from 'react';
import { api } from './api/client';
import { User, DemoPersona } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { MyWorkPage } from './pages/MyWorkPage';
import { InstitutionsPage } from './pages/InstitutionsPage';
import { ConflictRadarPage } from './pages/ConflictRadarPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditAdminPage } from './pages/AuditAdminPage';
import { EmblemWatermark } from './components/branding/EmblemWatermark';
import { PrototypeDisclaimer } from './components/branding/PrototypeDisclaimer';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [personas, setPersonas] = useState<DemoPersona[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unreviewedCount, setUnreviewedCount] = useState<number>(0);
  const [atRiskCount, setAtRiskCount] = useState<number>(0);
  const [workFilters, setWorkFilters] = useState<any>(null);

  useEffect(() => {
    initApp();
  }, []);

  const handleNavigate = (tab: string, filters?: any) => {
    if (filters) {
      setWorkFilters(filters);
    } else if (tab === 'my-work') {
      setWorkFilters(null);
    }
    setActiveTab(tab);
  };

  const initApp = async () => {
    try {
      setIsLoading(true);
      const personaList = await api.getDemoPersonas();
      setPersonas(personaList);

      // Verify existing session
      if (api.getToken()) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
          await refreshBadges();
        } catch (e) {
          api.logout();
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Initialization error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBadges = async () => {
    try {
      const summary = await api.getDashboardSummary();
      setUnreviewedCount(summary.unreviewed_overlap_candidates);
      setAtRiskCount(summary.cases_at_risk_warning + summary.cases_overdue);
    } catch (e) {
      // ignore badge refresh failure
    }
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    await refreshBadges();
    setActiveTab('overview');
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setActiveTab('overview');
  };

  const handleSwitchRole = async (role: string) => {
    try {
      setIsLoading(true);
      const res = await api.switchDemoRole(role);
      setCurrentUser(res);
      await refreshBadges();
      // If user had audit tab open and role doesn't permit it, return to overview
      if (
        (activeTab.startsWith('audit-admin')) &&
        role !== 'SECURITY_ADMIN' &&
        role !== 'AUDITOR'
      ) {
        setActiveTab('overview');
      }
    } catch (err) {
      console.error('Switch role failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading Screen
  if (isLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#DDE3E8] text-[#3A0F34] flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#3A0F34] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-[#3A0F34]">Initializing AICTE Conflict Radar...</p>
        </div>
      </div>
    );
  }

  // Authentication Guard: If not logged in, render SETU-inspired LoginPage
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        personas={personas}
      />
    );
  }

  // Route mapping helpers
  const isWorkTab =
    activeTab === 'my-work' ||
    activeTab === 'my-work-pending' ||
    activeTab === 'my-work-warnings' ||
    activeTab === 'my-work-overdue' ||
    activeTab === 'my-work-transfers';

  const isInstitutionsTab =
    activeTab === 'institutions' ||
    activeTab === 'institutions-directory';

  const isRadarTab =
    activeTab === 'conflict-radar' ||
    activeTab === 'conflict-radar-unreviewed' ||
    activeTab === 'conflict-radar-linked';

  const isReportsTab =
    activeTab === 'reports' ||
    activeTab === 'reports-ageing' ||
    activeTab === 'reports-ingestion';

  const isAdminTab =
    activeTab === 'audit-admin' ||
    activeTab === 'audit-admin-security' ||
    activeTab === 'audit-admin-roles';

  return (
    <div className="h-screen max-h-screen bg-[#DDE3E8] text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden">
      <Header
        currentUser={currentUser}
        personas={personas}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
        isLoading={isLoading}
      />

      <div className="flex flex-1 overflow-hidden relative min-h-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleNavigate}
          currentUser={currentUser}
          unreviewedOverlapsCount={unreviewedCount}
          atRiskCount={atRiskCount}
        />

        <main className="relative flex-1 overflow-y-auto min-h-0 bg-[#DDE3E8] ml-64">
          {/* Authentic State Emblem of India Watermark Layer */}
          <EmblemWatermark />

          {/* Foreground Active Page Content */}
          <div className="relative z-10 flex flex-col min-h-full justify-between">
            <div className="flex-1">
              {activeTab === 'overview' && (
                <OverviewPage currentUser={currentUser} onNavigate={handleNavigate} />
              )}
              {isWorkTab && (
                <MyWorkPage
                  currentUser={currentUser}
                  initialFilters={workFilters}
                  onClearInitialFilters={() => setWorkFilters(null)}
                />
              )}
              {isInstitutionsTab && (
                <InstitutionsPage
                  currentUser={currentUser}
                  onNavigateToRadar={() => handleNavigate('conflict-radar')}
                />
              )}
              {isRadarTab && (
                <ConflictRadarPage
                  currentUser={currentUser}
                  onRefreshData={refreshBadges}
                />
              )}
              {isReportsTab && (
                <ReportsPage
                  currentUser={currentUser}
                  onNavigate={handleNavigate}
                  initialSection={
                    activeTab === 'reports-ageing'
                      ? 'ageing'
                      : activeTab === 'reports-ingestion'
                      ? 'ingestion'
                      : 'workload'
                  }
                />
              )}
              {isAdminTab && (
                <AuditAdminPage currentUser={currentUser} />
              )}
            </div>

            {/* Statutory Prototype Disclaimer Footer */}
            <div className="mt-8 py-3 bg-slate-200/50 border-t border-slate-300">
              <PrototypeDisclaimer variant="subtle" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { PublicPortal } from './components/public/PublicPortal.tsx';
import { InternalLoginView } from './components/auth/InternalLoginView.tsx';
import { DashboardView } from './components/modules/dashboard/DashboardView.tsx';
import { AnnouncementList } from './components/modules/announcements/AnnouncementList.tsx';
import { ScheduleView } from './components/modules/schedule/ScheduleView.tsx';
import { PlanApprovalDashboard } from './components/modules/plans/PlanApprovalDashboard.tsx';
import { TaskList } from './components/modules/tasks/TaskList.tsx';
import { ReportList } from './components/modules/reports/ReportList.tsx';
import { DocumentList } from './components/modules/documents/DocumentList.tsx';
import { NotificationCenter } from './components/modules/notifications/NotificationCenter.tsx';
import { GlobalSearchView } from './components/modules/search/GlobalSearchView.tsx';
import { SettingsView } from './components/modules/settings/SettingsView.tsx';

function MainRouter() {
  const { activeModule } = useApp();

  switch (activeModule) {
    case 'dashboard':
      return <DashboardView />;
    case 'announcements':
      return <AnnouncementList />;
    case 'schedule':
      return <ScheduleView />;
    case 'plans':
      return <PlanApprovalDashboard />;
    case 'tasks':
      return <TaskList />;
    case 'reports':
      return <ReportList />;
    case 'documents':
      return <DocumentList />;
    case 'notifications':
      return <NotificationCenter />;
    case 'search':
      return <GlobalSearchView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
}

function AppContent() {
  const { portalMode, setPortalMode } = useApp();
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Đang tải dữ liệu trường học...</p>
        </div>
      </div>
    );
  }

  if (portalMode === 'public') {
    return <PublicPortal onEnterInternalPortal={() => setPortalMode('internal')} />;
  }

  // Internal management portal strictly requires an authenticated session
  if (!currentUser) {
    return <InternalLoginView onBackToPublic={() => setPortalMode('public')} />;
  }

  return (
    <AppLayout>
      <MainRouter />
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

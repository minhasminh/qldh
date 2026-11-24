import React from 'react';
import { useApp, NavigationModule } from '../../context/AppContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  BellRing,
  CalendarDays,
  FileCheck2,
  CheckSquare,
  FileSpreadsheet,
  FolderArchive,
  Bell,
  Search,
  Settings,
  X,
  School,
  Building2,
  Globe,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeModule, setActiveModule, stats, unreadNotificationCount, setPortalMode } = useApp();
  const { currentUser, isAdmin, isPrincipal, isDean } = useAuth();

  const navItems: {
    id: NavigationModule;
    label: string;
    icon: React.ReactNode;
    badgeCount?: number;
    badgeColor?: string;
    minRole?: 'guest' | 'teacher' | 'dean' | 'principal' | 'admin';
  }[] = [
    {
      id: 'dashboard',
      label: 'Tổng quan điều hành',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'announcements',
      label: 'Thông báo điều hành',
      icon: <BellRing className="h-4 w-4" />,
      badgeCount: stats?.unreadAnnouncementsCount || 0,
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'schedule',
      label: 'Lịch công tác trường',
      icon: <CalendarDays className="h-4 w-4" />,
      badgeCount: stats?.todayEventsCount || 0,
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'plans',
      label: 'Kế hoạch & Duyệt 2 cấp',
      icon: <FileCheck2 className="h-4 w-4" />,
      badgeCount: stats?.pendingPlansCount || 0,
      badgeColor: 'bg-amber-100 text-amber-700',
      minRole: 'dean',
    },
    {
      id: 'tasks',
      label: 'Giao việc & Tiến độ',
      icon: <CheckSquare className="h-4 w-4" />,
      badgeCount: stats?.overdueTasksCount || stats?.ongoingTasksCount || 0,
      badgeColor: (stats?.overdueTasksCount || 0) > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700',
      minRole: 'teacher',
    },
    {
      id: 'reports',
      label: 'Báo cáo & Minh chứng',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      badgeCount: stats?.pendingReportsCount || 0,
      badgeColor: 'bg-purple-100 text-purple-700',
      minRole: 'dean',
    },
    {
      id: 'documents',
      label: 'Văn bản - Tài liệu',
      icon: <FolderArchive className="h-4 w-4" />,
    },
    {
      id: 'notifications',
      label: 'Thông báo hệ thống',
      icon: <Bell className="h-4 w-4" />,
      badgeCount: unreadNotificationCount,
      badgeColor: 'bg-rose-100 text-rose-700',
      minRole: 'teacher',
    },
    {
      id: 'search',
      label: 'Tra cứu toàn trường',
      icon: <Search className="h-4 w-4" />,
    },
    {
      id: 'settings',
      label: 'Quản trị hệ thống',
      icon: <Settings className="h-4 w-4" />,
      minRole: 'admin',
    },
  ];

  const userRole = currentUser?.role || 'teacher';
  const roleLevel: Record<string, number> = {
    teacher: 2,
    dean: 3,
    principal: 4,
    admin: 5,
  };

  const visibleNavItems = navItems.filter((item) => {
    if (!item.minRole) return true;
    return (roleLevel[userRole] || 2) >= (roleLevel[item.minRole] || 2);
  });

  const handleSelect = (id: NavigationModule) => {
    setActiveModule(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } print:hidden`}
      >
        {/* Top Header in Sidebar */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <School className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white">CỔNG ĐIỀU HÀNH</p>
              <p className="text-[10px] text-slate-400">Trường Phổ Thông</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Mini Banner */}
        <div className="border-b border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-900/60 border border-blue-700/50 text-blue-200 font-bold text-xs uppercase">
              {currentUser?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-semibold text-white">
                {currentUser?.fullName || 'Cán bộ nhà trường'}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {currentUser?.title || currentUser?.departmentName || 'Hệ thống điều hành'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            CÁC PHÂN HỆ ĐIỀU HÀNH
          </p>

          {visibleNavItems.map((item, idx) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span className="truncate">
                    {idx + 1}. {item.label}
                  </span>
                </div>

                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums shrink-0 ${
                      isActive ? 'bg-white text-blue-900' : item.badgeColor || 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Public Website Shortcut Button */}
        <div className="p-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              setPortalMode('public');
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2 px-3 bg-blue-950/70 hover:bg-blue-900 border border-blue-700/60 text-sky-200 text-xs font-semibold transition-colors"
          >
            <Globe className="h-4 w-4 text-sky-400" />
            <span>Cổng Thông Tin Công Khai</span>
          </button>
        </div>

        {/* Sidebar Footer info */}
        <div className="border-t border-slate-800 p-3 bg-slate-950/60 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Hệ Thống Quản Lý Giáo Dục Số</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Tiêu chuẩn nghiệp vụ trường học Việt Nam</p>
        </div>
      </aside>
    </>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { SchoolEmblem } from '../common/SchoolEmblem.tsx';
import { LoginModal } from '../auth/LoginModal.tsx';
import {
  Bell,
  Search,
  UserCheck,
  LogOut,
  ChevronDown,
  CheckCheck,
  Calendar,
  AlertCircle,
  Menu,
  Shield,
  Globe,
  LogIn,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { currentUser, allUsers, switchUser, logout } = useAuth();
  const {
    schoolSettings,
    unreadNotificationCount,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    navigateTo,
    globalSearchQuery,
    setGlobalSearchQuery,
    setPortalMode,
  } = useApp();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearchQuery.trim()) {
      navigateTo('search');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'principal':
        return 'Ban Giám Hiệu';
      case 'dean':
        return 'Tổ trưởng chuyên môn';
      case 'teacher':
        return 'Giáo viên';
      default:
        return 'Cán bộ / Nhân viên';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-6 backdrop-blur-xs print:hidden">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          title="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div
          onClick={() => navigateTo('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <SchoolEmblem size={38} className="group-hover:scale-105 transition-transform" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors uppercase">
              {schoolSettings?.schoolName || 'HỆ THỐNG QUẢN LÝ NHÀ TRƯỜNG'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Năm học {schoolSettings?.currentSchoolYearId.replace('sy-', '') || '2026-2027'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-blue-700">{schoolSettings?.currentSemester || 'Học kỳ I'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder="Tra cứu thông báo, lịch công tác, kế hoạch, nhiệm vụ..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden transition-all"
          />
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
        </form>
      </div>

      {/* Right Controls: Public Portal Toggle & Role Quick-Switcher & Notifications */}
      <div className="flex items-center gap-2">
        {/* Toggle to Public School Website */}
        <button
          type="button"
          onClick={() => setPortalMode('public')}
          className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-2xs"
          title="Xem Website công khai dành cho Phụ huynh & Học sinh"
        >
          <Globe className="h-3.5 w-3.5 text-blue-700" />
          <span className="hidden sm:inline">Website Trường</span>
        </button>

        {/* User Authentication & Profile Controls */}
        {!currentUser ? (
          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors shadow-xs"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Đăng nhập</span>
          </button>
        ) : (
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-[10px]">
                {currentUser.fullName.charAt(0)}
              </div>
              <span className="font-semibold text-slate-900 truncate max-w-[130px]">
                {currentUser.fullName}
              </span>
              <span className="hidden md:inline text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                {getRoleLabel(currentUser.role)}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900">{currentUser.fullName}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{currentUser.title || currentUser.email}</p>
                  <div className="mt-1.5 inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {getRoleLabel(currentUser.role)}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setPortalMode('public');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-left transition-colors font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Thông báo hệ thống"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white tabular-nums">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Thông báo điều hành</span>
                  {unreadNotificationCount > 0 && (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 tabular-nums">
                      {unreadNotificationCount} mới
                    </span>
                  )}
                </div>
                {unreadNotificationCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsAsRead()}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Đọc tất cả
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 my-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-slate-400">
                    Không có thông báo mới nào
                  </div>
                ) : (
                  notifications.slice(0, 6).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationAsRead(notif.id);
                        navigateTo(notif.targetModule as any, notif.targetId);
                        setShowNotifMenu(false);
                      }}
                      className={`p-3 cursor-pointer transition-colors ${
                        notif.isRead ? 'hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium ${notif.isRead ? 'text-slate-800' : 'text-blue-900 font-semibold'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                          {new Date(notif.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 pt-1.5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    navigateTo('notifications');
                    setShowNotifMenu(false);
                  }}
                  className="w-full py-1 text-center font-semibold text-blue-700 hover:underline"
                >
                  Xem toàn bộ trung tâm thông báo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Login Modal for Real Authentication */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </header>
  );
};

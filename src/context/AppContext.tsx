import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type {
  SchoolSettings,
  Department,
  DashboardStats,
  SystemNotification,
} from '../types/database.ts';
import { api, getStoredToken } from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';

export type NavigationModule =
  | 'dashboard'
  | 'announcements'
  | 'schedule'
  | 'plans'
  | 'tasks'
  | 'reports'
  | 'documents'
  | 'notifications'
  | 'search'
  | 'settings';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  portalMode: 'internal' | 'public';
  setPortalMode: (mode: 'internal' | 'public') => void;
  activeModule: NavigationModule;
  setActiveModule: (m: NavigationModule) => void;
  targetEntityId: string | null;
  setTargetEntityId: (id: string | null) => void;
  navigateTo: (module: NavigationModule, entityId?: string) => void;
  schoolSettings: SchoolSettings | null;
  departments: Department[];
  stats: DashboardStats | null;
  notifications: SystemNotification[];
  unreadNotificationCount: number;
  refreshAppData: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [portalMode, setPortalMode] = useState<'internal' | 'public'>(() => {
    return getStoredToken() ? 'internal' : 'public';
  });
  const [activeModule, setActiveModule] = useState<NavigationModule>('dashboard');
  const [targetEntityId, setTargetEntityId] = useState<string | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const navigateTo = (module: NavigationModule, entityId?: string) => {
    setActiveModule(module);
    if (entityId) {
      setTargetEntityId(entityId);
    }
  };

  const refreshAppData = async () => {
    try {
      const [settingsData, deptsData, statsData, notifsData] = await Promise.all([
        api.getSettings(),
        api.getDepartments(),
        api.getDashboardStats(),
        currentUser ? api.getNotifications() : Promise.resolve([]),
      ]);
      setSchoolSettings(settingsData);
      setDepartments(deptsData);
      setStats(statsData);
      setNotifications(notifsData);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu trường học:', err);
    }
  };

  useEffect(() => {
    refreshAppData();
  }, [currentUser]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast('Đã đánh dấu đã đọc tất cả thông báo');
    } catch (err) {
      console.error(err);
    }
  };

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        portalMode,
        setPortalMode,
        activeModule,
        setActiveModule,
        targetEntityId,
        setTargetEntityId,
        navigateTo,
        schoolSettings,
        departments,
        stats,
        notifications,
        unreadNotificationCount,
        refreshAppData,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        toasts,
        showToast,
        dismissToast,
        globalSearchQuery,
        setGlobalSearchQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

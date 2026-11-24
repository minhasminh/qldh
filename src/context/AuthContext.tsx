import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Role } from '../types/database.ts';
import { api, setStoredToken, clearStoredToken, getStoredToken } from '../services/api.ts';

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
  switchUser: (user: User | null) => Promise<void>;
  refreshUsers: () => Promise<void>;
  // Role helpers
  isAdmin: boolean;
  isPrincipal: boolean;
  isDean: boolean;
  isTeacher: boolean;
  isGuest: boolean;
  canApprovePlans: boolean;
  canPublishAnnouncements: boolean;
  canAssignTasks: boolean;
  canManageSettings: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUsers = async () => {
    try {
      const users = await api.getUsers();
      setAllUsers(users);
    } catch (err) {
      console.error('Không thể tải danh sách người dùng:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const token = getStoredToken();
      if (token) {
        try {
          const me = await api.getCurrentUser();
          setCurrentUser(me);
        } catch {
          clearStoredToken();
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      await fetchUsers();
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      setStoredToken(res.token);
      setCurrentUser(res.user);
      await fetchUsers();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    setCurrentUser(null);
  };

  const switchUser = async (user: User | null) => {
    if (!user) {
      logout();
      return;
    }
    setStoredToken(user.id);
    setCurrentUser(user);
    await fetchUsers();
  };

  const refreshUsers = async () => {
    await fetchUsers();
  };

  const role: Role = currentUser?.role || 'guest';
  const isAdmin = role === 'admin';
  const isPrincipal = role === 'principal';
  const isDean = role === 'dean';
  const isTeacher = role === 'teacher';
  const isGuest = role === 'guest';

  const canApprovePlans = isAdmin || isPrincipal;
  const canPublishAnnouncements = isAdmin || isPrincipal;
  const canAssignTasks = isAdmin || isPrincipal || isDean;
  const canManageSettings = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        isLoading,
        login,
        logout,
        switchUser,
        refreshUsers,
        isAdmin,
        isPrincipal,
        isDean,
        isTeacher,
        isGuest,
        canApprovePlans,
        canPublishAnnouncements,
        canAssignTasks,
        canManageSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

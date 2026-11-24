import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { SchoolEmblem } from '../common/SchoolEmblem.tsx';
import { Lock, User, Eye, EyeOff, X, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const { schoolSettings, showToast, setPortalMode } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username.trim(), password);
      showToast('Đăng nhập thành công vào Hệ thống Quản trị & Điều hành', 'success');
      onClose();
      setPortalMode('internal');
    } catch (err: any) {
      setError(err?.message || 'Tên đăng nhập / Email hoặc mật khẩu không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex justify-center mb-3">
            <SchoolEmblem size={48} />
          </div>
          <h2 className="text-lg font-bold">ĐĂNG NHẬP HỆ THỐNG NỘI BỘ</h2>
          <p className="text-xs text-blue-200 mt-1">
            {schoolSettings?.schoolName || 'Trường TH&THCS Nguyễn Đình Anh'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên đăng nhập
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Email hoặc Tên đăng nhập..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu bảo mật
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-900 hover:bg-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isLoading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

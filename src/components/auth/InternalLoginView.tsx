import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { SchoolEmblem } from '../common/SchoolEmblem.tsx';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

interface InternalLoginViewProps {
  onBackToPublic: () => void;
}

export const InternalLoginView: React.FC<InternalLoginViewProps> = ({ onBackToPublic }) => {
  const { login } = useAuth();
  const { schoolSettings, showToast } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username.trim(), password);
      showToast('Đăng nhập thành công vào Hệ thống Quản trị & Điều hành Nội bộ', 'success');
    } catch (err: any) {
      setError(
        err?.message ||
          'Tên đăng nhập / Email hoặc mật khẩu không chính xác. Vui lòng thử lại hoặc liên hệ Quản trị viên.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col justify-between text-slate-100 font-sans antialiased relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="p-4 sm:p-6 flex items-center justify-between z-10 max-w-6xl mx-auto w-full">
        <button
          type="button"
          onClick={onBackToPublic}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về Website Trường Học (Công khai)</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-blue-200">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span>Cổng Thông Tin Bảo Mật & Xác Thực Nội Bộ</span>
        </div>
      </header>

      {/* Center Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-6 text-white text-center relative">
            <div className="flex justify-center mb-3">
              <SchoolEmblem size={52} className="drop-shadow-md" />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-blue-200 font-semibold">
              {schoolSettings?.managementAgency || 'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO'}
            </p>
            <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-tight mt-0.5">
              {schoolSettings?.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
            </h1>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-800/80 border border-blue-600/50 text-[10px] font-bold text-blue-100">
              <KeyRound className="h-3 w-3 text-amber-300" />
              <span>HỆ THỐNG QUẢN LÝ & ĐIỀU HÀNH NỘI BỘ</span>
            </div>
          </div>

          {/* Access Notice */}
          <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2.5 flex items-start gap-2.5 text-[11px] text-amber-900">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Yêu cầu xác thực tài khoản</p>
              <p className="text-amber-800 text-[10px] mt-0.5 leading-snug">
                Chức năng khách vãng lai đã tắt. Để vào trang nội bộ, vui lòng đăng nhập bằng Email hoặc Tên đăng nhập được nhà trường cấp.
              </p>
            </div>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tên đăng nhập hoặc Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Email hoặc Tên đăng nhập..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-medium text-slate-900 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mật khẩu bảo mật
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu truy cập..."
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden text-slate-900 bg-slate-50 focus:bg-white transition-colors"
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

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-900 hover:bg-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <ShieldCheck className="h-4 w-4 text-amber-300" />
                <span>{isLoading ? 'Đang xác thực tài khoản...' : 'Đăng nhập vào Hệ thống Nội bộ'}</span>
              </button>

              <button
                type="button"
                onClick={onBackToPublic}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Quay lại Website Trường học</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[11px] text-slate-400 z-10">
        <p>© 2026 {schoolSettings?.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'} · Cổng Điều Hành Nội Bộ</p>
      </footer>
    </div>
  );
};

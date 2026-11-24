import React, { useState } from 'react';
import type { User } from '../../../types/database.ts';
import { api } from '../../../services/api.ts';
import { useApp } from '../../../context/AppContext.tsx';
import { Key, X, Copy, Check, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultPassword, setResultPassword] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const gen = `NDA@${new Date().getFullYear()}!${rand}`;
    setNewPassword(gen);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Đã sao chép mật khẩu vào bộ nhớ tạm', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim().length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.resetPassword(user.id, newPassword.trim());
      setResultPassword(res.newPassword);
      showToast(`Đã cấp lại mật khẩu thành công cho ${user.username}`, 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Không thể cấp lại mật khẩu', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setResultPassword(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5 text-indigo-900">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cấp Lại Mật Khẩu Người Dùng</h3>
              <p className="text-[11px] text-slate-500">Quyền quản trị viên cấp phát chứng thực</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Target User Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Họ và tên:</span>
              <span className="font-bold text-slate-900">{user.fullName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tên tài khoản (Email):</span>
              <span className="font-mono font-semibold text-indigo-700">{user.username}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Chức vụ / Đơn vị:</span>
              <span className="text-slate-700">{user.title || 'Cán bộ giáo viên'}</span>
            </div>
          </div>

          {resultPassword ? (
            /* Success Screen displaying the new password */
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>Cấp lại mật khẩu thành công!</span>
              </div>
              <p className="text-[11px] text-emerald-900">
                Mật khẩu mới đã được lưu vào hệ thống. Vui lòng sao chép và gửi cho cán bộ/giáo viên:
              </p>
              <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-white p-3 font-mono font-bold text-sm text-slate-900">
                <span>{resultPassword}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(resultPassword)}
                  className="flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-500 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                * Giáo viên có thể đăng nhập bằng tài khoản <strong className="text-slate-700 font-mono">{user.username}</strong> và mật khẩu mới này.
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-full mt-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          ) : (
            /* Input Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Thao tác này sẽ ghi đè mật khẩu hiện tại của người dùng. Mật khẩu mới có hiệu lực ngay lập tức.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-900">
                    Mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Tạo ngẫu nhiên an toàn</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ví dụ: NDA@2026!xyz (tối thiểu 6 ký tự)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPassword}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-xs disabled:opacity-50"
                >
                  <Key className="h-4 w-4" />
                  <span>{isSubmitting ? 'Đang cập nhật...' : 'Xác nhận cấp lại'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

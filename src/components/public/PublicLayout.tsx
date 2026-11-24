import React, { ReactNode, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { SchoolEmblem } from '../common/SchoolEmblem.tsx';
import { SchoolWebsiteEditModal, WebsiteTab } from './SchoolWebsiteEditModal.tsx';
import { LoginModal } from '../auth/LoginModal.tsx';
import {
  Phone,
  Mail,
  MapPin,
  LogIn,
  Menu,
  X,
  School,
  ExternalLink,
  ChevronRight,
  Shield,
  Edit3,
  Settings,
  Sparkles,
  LogOut,
  Key,
  Newspaper,
  BookOpen,
  Home,
} from 'lucide-react';

export type PublicPage =
  | 'home'
  | 'about'
  | 'news'
  | 'announcements'
  | 'schedule'
  | 'documents'
  | 'contact';

interface PublicLayoutProps {
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onEnterInternalPortal: () => void;
  onOpenEditModal?: (tab?: WebsiteTab) => void;
  children: ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  currentPage,
  onNavigate,
  onEnterInternalPortal,
  onOpenEditModal,
  children,
}) => {
  const { schoolSettings } = useApp();
  const { currentUser, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editWebsiteModalOpen, setEditWebsiteModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<WebsiteTab>('general');
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const navLinks: { id: PublicPage; label: string }[] = [
    { id: 'home', label: 'Trang chủ' },
    { id: 'about', label: 'Giới thiệu' },
    { id: 'news', label: 'Tin tức & Hoạt động' },
    { id: 'announcements', label: 'Thông báo' },
    { id: 'schedule', label: 'Lịch hoạt động' },
    { id: 'documents', label: 'Văn bản - Biểu mẫu' },
    { id: 'contact', label: 'Liên hệ' },
  ];

  const handleNavClick = (page: PublicPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEdit = (tab: WebsiteTab = 'general') => {
    if (onOpenEditModal) {
      onOpenEditModal(tab);
    } else {
      setEditModalTab(tab);
      setEditWebsiteModalOpen(true);
    }
  };

  const handleInternalPortalClick = () => {
    if (currentUser) {
      onEnterInternalPortal();
    } else {
      setLoginModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Administrator Bar for instant website content editing */}
      {isAdmin ? (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white text-xs px-4 md:px-8 py-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 shadow-md border-b border-amber-900/30">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-300 animate-pulse shrink-0" />
            <span className="font-extrabold uppercase tracking-wide">Chế độ Quản trị viên:</span>
            <span className="text-amber-100 hidden sm:inline">
              Bạn có quyền chỉnh sửa toàn bộ nội dung hiển thị trên Website công khai.
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Quick jump edit tabs */}
            <button
              type="button"
              onClick={() => handleOpenEdit('general')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 font-bold text-amber-950 hover:bg-amber-50 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Mở bảng chỉnh sửa toàn bộ Website Trường"
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-700" />
              <span>Sửa Website Trường</span>
            </button>

            <div className="hidden lg:flex items-center gap-1 bg-amber-800/80 rounded-lg p-0.5 border border-amber-600/60">
              <button
                type="button"
                onClick={() => handleOpenEdit('home')}
                className="px-2 py-0.5 rounded text-[11px] text-amber-100 hover:text-white hover:bg-amber-700 transition-colors"
                title="Sửa Banner & Thống kê trang chủ"
              >
                Banner
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit('about')}
                className="px-2 py-0.5 rounded text-[11px] text-amber-100 hover:text-white hover:bg-amber-700 transition-colors"
                title="Sửa bài giới thiệu & 2 bậc học"
              >
                Giới thiệu
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit('news')}
                className="px-2 py-0.5 rounded text-[11px] text-amber-100 hover:text-white hover:bg-amber-700 transition-colors"
                title="Quản lý tin tức & bài viết"
              >
                Bản tin
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit('contact')}
                className="px-2 py-0.5 rounded text-[11px] text-amber-100 hover:text-white hover:bg-amber-700 transition-colors"
                title="Sửa thông tin liên hệ & giờ làm việc"
              >
                Liên hệ
              </button>
            </div>

            <button
              type="button"
              onClick={onEnterInternalPortal}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-950/70 hover:bg-amber-950 px-2.5 py-1 text-white border border-amber-600/40 transition-colors cursor-pointer"
            >
              <span>Vào Cổng nội bộ</span>
              <ChevronRight className="h-3 w-3" />
            </button>

            <button
              type="button"
              onClick={logout}
              className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-amber-900/60 transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Top Bar with Agency & Hotline */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 md:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-blue-300 tracking-wide uppercase">
              {schoolSettings?.managementAgency || 'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO'}
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline">
              Mã trường: <strong className="text-white font-mono">{schoolSettings?.schoolCode || 'TH-THCS-NDA-01'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-emerald-400" />
              <span className="tabular-nums">{schoolSettings?.phone || '0237 387 6543'}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Mail className="h-3 w-3 text-sky-400" />
              <span>{schoolSettings?.email || 'ththcsnguyendinhanh@thachthanh.edu.vn'}</span>
            </span>

            {!currentUser && (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-semibold cursor-pointer ml-1"
              >
                <Key className="h-3 w-3" />
                <span>Đăng nhập Quản trị</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Header / Banner Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          {/* School Emblem & Name */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <SchoolEmblem size={46} className="group-hover:scale-105 transition-transform" />
            <div>
              <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-blue-800">
                Trường liên cấp Tiểu học & Trung học cơ sở
              </p>
              <h1 className="text-sm md:text-base font-extrabold uppercase text-slate-900 tracking-tight group-hover:text-blue-900 transition-colors">
                {schoolSettings?.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
              </h1>
              <p className="hidden lg:block text-[10px] italic text-slate-500">
                "{schoolSettings?.motto || 'Chăm ngoan - Sáng tạo - Tự tin - Tỏa sáng tri thức'}"
              </p>
            </div>
          </div>

          {/* Right Action: Access Internal Portal or Admin Login */}
          <div className="hidden lg:flex items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleOpenEdit('general')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 transition-all shadow-xs cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-amber-700" />
                <span>Sửa Website</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleInternalPortalClick}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <Shield className="h-4 w-4 text-amber-400" />
              <span>Cổng Điều Hành Nội Bộ</span>
              {currentUser && (
                <span className="rounded bg-blue-800 px-1.5 py-0.2 text-[10px] text-blue-200">
                  {currentUser.fullName}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleOpenEdit('general')}
                className="rounded-lg bg-amber-100 text-amber-900 p-1.5 text-xs font-bold border border-amber-300"
                title="Sửa Website"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleInternalPortalClick}
              className="rounded-lg bg-blue-900 px-2.5 py-1.5 text-[11px] font-bold text-white"
            >
              Cổng nội bộ
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Desktop Navbar */}
        <nav className="hidden lg:block border-t border-slate-100 bg-slate-50/80">
          <div className="max-w-7xl mx-auto px-8 flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = currentPage === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleNavClick(link.id)}
                  className={`px-3.5 py-2.5 text-xs font-semibold transition-all relative ${
                    isActive
                      ? 'text-blue-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-800 rounded-t" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white p-4 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavClick(link.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                  currentPage === link.id
                    ? 'bg-blue-50 text-blue-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Public Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 md:py-8">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: School Identity */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <SchoolEmblem size={40} />
              <div>
                <p className="text-white font-bold uppercase text-sm">
                  {schoolSettings?.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Mô hình trường liên cấp Tiểu học và Trung học cơ sở
                </p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px] max-w-md">
              Nhà trường cam kết xây dựng môi trường giáo dục kỷ cương, tình thương, trách nhiệm, phát triển toàn diện năng lực và phẩm chất của học sinh hai cấp học theo định hướng đổi mới giáo dục quốc gia.
            </p>
          </div>

          {/* Col 2: Contact Info */}
          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Thông Tin Liên Hệ</h4>
            <div className="space-y-1.5 text-[11px]">
              <p className="flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{schoolSettings?.address || 'Xã Thạch Bình, Huyện Thạch Thành, Tỉnh Thanh Hóa'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="tabular-nums">{schoolSettings?.phone || '0237 387 6543'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{schoolSettings?.email || 'ththcsnguyendinhanh@thachthanh.edu.vn'}</span>
              </p>
            </div>
          </div>

          {/* Col 3: Portal Shortcut & Admin Access */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Quản Trị Điều Hành</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Khu vực dành cho Ban Giám hiệu, Tổ trưởng chuyên môn, Giáo viên và Quản trị viên nhà trường.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleInternalPortalClick}
                className="inline-flex items-center justify-between rounded-lg bg-blue-700 hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <span>Vào Cổng nội bộ</span>
                <ChevronRight className="h-3 w-3" />
              </button>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => handleOpenEdit('general')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3 w-3 text-amber-400" />
                  <span>Sửa thông tin Website</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Key className="h-3 w-3 text-amber-400" />
                  <span>Đăng nhập Quản trị viên</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 py-4 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto px-4">
          <p>© 2026 {schoolSettings?.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-3 mt-2 sm:mt-0 text-[10px]">
            {isAdmin ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Shield className="h-3 w-3" /> Đang đăng nhập: {currentUser?.fullName} (Quản trị viên)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="text-slate-400 hover:text-blue-300 transition-colors"
              >
                Đăng nhập hệ thống
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Admin Website Editor Modal */}
      {isAdmin && (
        <SchoolWebsiteEditModal
          isOpen={editWebsiteModalOpen}
          initialTab={editModalTab}
          onClose={() => setEditWebsiteModalOpen(false)}
        />
      )}

      {/* Quick Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
};

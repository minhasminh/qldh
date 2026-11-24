import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import type { Announcement, CalendarEvent, DocumentItem } from '../../types/database.ts';
import type { PublicPage } from './PublicLayout.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import type { WebsiteTab } from './SchoolWebsiteEditModal.tsx';
import {
  Bell,
  Calendar,
  FolderArchive,
  ArrowRight,
  BookOpen,
  Award,
  Users,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  MapPin,
  Edit3,
  Image as ImageIcon,
} from 'lucide-react';

interface PublicHomeProps {
  onNavigate: (page: PublicPage) => void;
  onEnterInternalPortal: () => void;
  onOpenEditModal?: (tab?: WebsiteTab) => void;
}

export const PublicHome: React.FC<PublicHomeProps> = ({
  onNavigate,
  onEnterInternalPortal,
  onOpenEditModal,
}) => {
  const { schoolSettings } = useApp();
  const { isAdmin } = useAuth();

  const [publicAnnouncements, setPublicAnnouncements] = useState<Announcement[]>([]);
  const [publicEvents, setPublicEvents] = useState<CalendarEvent[]>([]);
  const [publicDocs, setPublicDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Banner slideshow state
  const bannerList: string[] = React.useMemo(() => {
    const list = schoolSettings?.websiteConfig?.bannerImages || [];
    if (list.length > 0) return list;
    if (schoolSettings?.websiteConfig?.bannerImageUrl) return [schoolSettings.websiteConfig.bannerImageUrl];
    return [];
  }, [schoolSettings?.websiteConfig?.bannerImages, schoolSettings?.websiteConfig?.bannerImageUrl]);

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isHoveringBanner, setIsHoveringBanner] = useState(false);

  useEffect(() => {
    if (bannerList.length <= 1 || isHoveringBanner) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerList.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [bannerList.length, isHoveringBanner]);

  useEffect(() => {
    if (currentBannerIndex >= bannerList.length && bannerList.length > 0) {
      setCurrentBannerIndex(0);
    }
  }, [bannerList.length, currentBannerIndex]);

  const activeBannerUrl = bannerList[currentBannerIndex] || schoolSettings?.websiteConfig?.bannerImageUrl;

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      try {
        const [annData, evData, docData] = await Promise.all([
          api.getAnnouncements(),
          api.getEvents(),
          api.getDocuments(),
        ]);
        setPublicAnnouncements(annData.filter((a) => a.isPublic).slice(0, 4));
        setPublicEvents(evData.slice(0, 4));
        setPublicDocs(docData.filter((d) => d.isPublic).slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero Banner Section */}
      <div
        onMouseEnter={() => setIsHoveringBanner(true)}
        onMouseLeave={() => setIsHoveringBanner(false)}
        className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-8 md:p-12 shadow-xl border border-blue-900/40 min-h-[340px] flex flex-col justify-center"
      >
        {/* Banner Background Image(s) */}
        {activeBannerUrl ? (
          <>
            <img
              key={activeBannerUrl}
              src={activeBannerUrl}
              alt="Ảnh toàn cảnh trường học"
              className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none transition-all duration-1000 ease-in-out"
            />
            {/* Dark contrast gradient overlay for WCAG AA readability */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to right, rgba(15, 23, 42, ${Math.min(
                  0.95,
                  (schoolSettings?.websiteConfig?.bannerOverlayOpacity ?? 0.65) + 0.15
                )}), rgba(15, 23, 42, ${
                  schoolSettings?.websiteConfig?.bannerOverlayOpacity ?? 0.65
                }) 60%, rgba(30, 27, 75, ${Math.max(
                  0.35,
                  (schoolSettings?.websiteConfig?.bannerOverlayOpacity ?? 0.65) - 0.2
                )}))`,
              }}
            />
          </>
        ) : null}

        {/* Admin Quick Action Buttons */}
        {isAdmin && (
          <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenEditModal?.('home')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white border border-blue-400/40 shadow-md cursor-pointer transition-all active:scale-95"
              title="Thêm hoặc chọn ảnh banner cho trường học"
            >
              <ImageIcon className="h-3.5 w-3.5 text-blue-200" />
              <span>Thêm / Đổi ảnh Banner</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenEditModal?.('home')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md px-3 py-2 text-xs font-bold text-white border border-white/20 shadow-md cursor-pointer transition-all active:scale-95"
              title="Chỉnh sửa Banner, ảnh nền và tiêu đề trang chủ"
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Sửa nội dung</span>
            </button>
          </div>
        )}

        {/* Carousel Prev/Next Buttons (if multiple banner images exist) */}
        {bannerList.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setCurrentBannerIndex((prev) => (prev - 1 + bannerList.length) % bannerList.length)
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 rounded-full bg-slate-900/60 hover:bg-slate-900/90 p-2 text-white/80 hover:text-white backdrop-blur-xs border border-white/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
              title="Ảnh banner trước"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % bannerList.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 rounded-full bg-slate-900/60 hover:bg-slate-900/90 p-2 text-white/80 hover:text-white backdrop-blur-xs border border-white/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
              title="Ảnh banner kế tiếp"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Carousel Indicator Dots */}
            <div className="absolute bottom-4 right-6 z-20 flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
              {bannerList.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentBannerIndex(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    i === currentBannerIndex ? 'w-6 bg-blue-400' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  title={`Xem banner ${i + 1}/${bannerList.length}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200 border border-blue-400/30 backdrop-blur-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>{schoolSettings?.websiteConfig?.heroTagline || 'Mô hình trường liên cấp chuẩn quốc gia · Năm học 2026 - 2027'}</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold uppercase tracking-tight leading-tight">
            {schoolSettings?.websiteConfig?.heroTitle || schoolSettings?.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
          </h2>

          <p className="text-sm md:text-base text-slate-200 leading-relaxed font-light">
            {schoolSettings?.websiteConfig?.heroDescription ||
              'Nơi ươm mầm tri thức, rèn luyện nhân cách và chắp cánh ước mơ cho các thế hệ học sinh từ bậc Tiểu học (Lớp 1 - 5) đến bậc Trung học cơ sở (Lớp 6 - 9).'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-100 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Tìm hiểu nhà trường
            </button>
            <button
              type="button"
              onClick={onEnterInternalPortal}
              className="rounded-xl bg-blue-600/90 hover:bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition-all border border-blue-400/30 shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Vào Cổng điều hành nội bộ</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* 4 Pillars / Statistics of the Dual-Level School */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quy mô & Thống kê giáo dục liên cấp
          </h3>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onOpenEditModal?.('home')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
              title="Chỉnh sửa 4 khối thông số nổi bật"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Sửa 4 thông số</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-800">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">
              {schoolSettings?.websiteConfig?.stat1Value || '2 Cấp Học'}
            </p>
            <p className="text-xs text-slate-500">
              {schoolSettings?.websiteConfig?.stat1Label || 'Tiểu học & THCS'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">
              {schoolSettings?.websiteConfig?.stat2Value || '9 Khối Lớp'}
            </p>
            <p className="text-xs text-slate-500">
              {schoolSettings?.websiteConfig?.stat2Label || 'Từ Lớp 1 đến Lớp 9'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-800">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">
              {schoolSettings?.websiteConfig?.stat3Value || '100%'}
            </p>
            <p className="text-xs text-slate-500">
              {schoolSettings?.websiteConfig?.stat3Label || 'Giáo viên đạt chuẩn'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-800">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">
              {schoolSettings?.websiteConfig?.stat4Value || 'Chất Lượng'}
            </p>
            <p className="text-xs text-slate-500">
              {schoolSettings?.websiteConfig?.stat4Label || 'Thi đua toàn diện'}
            </p>
          </div>
        </div>
      </div>
      </div>

      {/* Public Announcements & Weekly Schedule Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Public Announcements */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-700" />
              <h3 className="text-base font-bold text-slate-900">
                Thông Báo Mới Nhất Cho Phụ Huynh & Học Sinh
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('announcements')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            {publicAnnouncements.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Không có thông báo công khai nào.
              </p>
            ) : (
              publicAnnouncements.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigate('announcements')}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-blue-800">
                      {item.category === 'academic' ? 'Học vụ & Chuyên môn' : 'Thông báo nhà trường'}
                    </span>
                    <span className="tabular-nums">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 hover:text-blue-700 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.summary || item.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Public Schedule */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900">Lịch Hoạt Động Tuần</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <span>Chi tiết</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {publicEvents.slice(0, 3).map((ev) => (
              <div
                key={ev.id}
                className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-[11px] text-emerald-800 font-bold tabular-nums">
                  <span>
                    {ev.startTime} - {ev.endTime}
                  </span>
                  <span className="text-slate-500 font-normal">
                    {new Date(ev.startDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 line-clamp-2">{ev.title}</h5>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">{ev.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Downloadable Forms Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FolderArchive className="h-5 w-5 text-purple-700" />
            <h3 className="text-base font-bold text-slate-900">
              Văn Bản, Thông Tri & Biểu Mẫu Công Khai
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('documents')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            <span>Kho biểu mẫu</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {publicDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 transition-colors"
            >
              <div className="truncate pr-3 space-y-0.5">
                <span className="text-[10px] font-bold text-blue-800 bg-blue-100/60 px-1.5 py-0.2 rounded">
                  {doc.codeNumber}
                </span>
                <p className="text-xs font-bold text-slate-900 truncate">{doc.title}</p>
                <p className="text-[11px] text-slate-500 truncate">Người ký: {doc.signer}</p>
              </div>
              <a
                href={doc.file.url}
                download={doc.file.name}
                className="rounded-lg bg-white border border-slate-200 p-2 text-blue-700 hover:bg-blue-50 transition-colors shadow-2xs shrink-0"
                title="Tải văn bản"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

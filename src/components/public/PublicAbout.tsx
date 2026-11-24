import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { SchoolEmblem } from '../common/SchoolEmblem.tsx';
import type { WebsiteTab } from './SchoolWebsiteEditModal.tsx';
import { CheckCircle2, Award, Users, BookOpen, GraduationCap, HeartHandshake, Edit3 } from 'lucide-react';

interface PublicAboutProps {
  onOpenEditModal?: (tab?: WebsiteTab) => void;
}

export const PublicAbout: React.FC<PublicAboutProps> = ({ onOpenEditModal }) => {
  const { schoolSettings, departments } = useApp();
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="text-center space-y-2 border-b border-slate-200 pb-6 relative">
        {isAdmin && (
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => onOpenEditModal?.('about')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              title="Chỉnh sửa bài viết giới thiệu lịch sử và 2 bậc học"
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-700" />
              <span>Sửa bài Giới thiệu & 2 Bậc học</span>
            </button>
          </div>
        )}

        <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">
          GIỚI THIỆU NHÀ TRƯỜNG
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase text-slate-900 tracking-tight">
          {schoolSettings?.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
        </h2>
        <p className="text-xs text-slate-500 max-w-xl mx-auto italic">
          "{schoolSettings?.motto || 'Chăm ngoan - Sáng tạo - Tự tin - Tỏa sáng tri thức'}"
        </p>
      </div>

      {/* Historical & Educational Overview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs space-y-4 text-xs md:text-sm text-slate-700 leading-relaxed">
        <h3 className="text-base font-bold text-slate-900 uppercase">
          {schoolSettings?.websiteConfig?.aboutHistoryTitle || '1. Lịch Sử Hình Thành & Truyền Thống Dạy Tốt - Học Tốt'}
        </h3>
        <p>
          {schoolSettings?.websiteConfig?.aboutHistoryParagraph1 ||
            'Trường Tiểu học & Trung học cơ sở Nguyễn Đình Anh là ngôi trường liên cấp trọng điểm, mang tên danh nhân văn hóa - lịch sử Nguyễn Đình Anh. Nhà trường vinh dự đảm nhận trọng trách giáo dục thế hệ măng non và thanh thiếu niên trên địa bàn từ lớp 1 đến lớp 9.'}
        </p>
        <p>
          {schoolSettings?.websiteConfig?.aboutHistoryParagraph2 ||
            'Trải qua các giai đoạn phát triển, nhà trường luôn khẳng định vị thế dẫn đầu trong phong trào thi đua "Xây dựng trường học thân thiện, học sinh tích cực". Tỷ lệ học sinh hoàn thành chương trình Tiểu học đạt 100%, tỷ lệ học sinh tốt nghiệp THCS và thi đỗ vào các trường THPT công lập luôn đạt thứ hạng cao trong toàn huyện.'}
        </p>
      </div>

      {/* Two School Levels Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Level */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-700 text-white">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {schoolSettings?.websiteConfig?.primaryLevelTitle || 'BẬC TIỂU HỌC'}
              </h4>
              <p className="text-xs text-blue-800 font-semibold">
                {schoolSettings?.websiteConfig?.primaryLevelSubtitle || 'Khối 1, Khối 2, Khối 3, Khối 4, Khối 5'}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {schoolSettings?.websiteConfig?.primaryLevelDesc ||
              'Tập trung rèn luyện chữ viết, phát triển tư duy ngôn ngữ, toán học cơ bản và hình thành các thói quen đạo đức chuẩn mực theo chương trình Giáo dục Phổ thông 2018. Tổ chức hiệu quả các câu lạc bộ đọc sách, ngày hội chữ đẹp và hoạt động Sao nhi đồng.'}
          </p>
        </div>

        {/* Secondary Level */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-700 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {schoolSettings?.websiteConfig?.secondaryLevelTitle || 'BẬC TRUNG HỌC CƠ SỞ'}
              </h4>
              <p className="text-xs text-emerald-800 font-semibold">
                {schoolSettings?.websiteConfig?.secondaryLevelSubtitle || 'Khối 6, Khối 7, Khối 8, Khối 9'}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {schoolSettings?.websiteConfig?.secondaryLevelDesc ||
              'Chú trọng bồi dưỡng năng lực tự học, nghiên cứu khoa học kỹ thuật, thực hành bộ môn KHTN và KHXH. Định hướng giáo dục STEM, tăng cường tiếng Anh giao tiếp và chuẩn bị nền tảng kiến thức vững chắc cho kỳ thi tuyển sinh vào lớp 10.'}
          </p>
        </div>
      </div>

      {/* Leadership & Departments */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 uppercase">
          2. Cơ Cấu Tổ Chức & Hội Đồng Sư Phạm
        </h3>
        <p className="text-xs text-slate-600">
          Đội ngũ cán bộ quản lý và giáo viên 100% đạt chuẩn và trên chuẩn trình độ đào tạo theo Luật Giáo dục:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {departments.map((dept) => (
            <div key={dept.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-1">
              <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-1.5 py-0.2 rounded">
                {dept.code}
              </span>
              <h5 className="text-xs font-bold text-slate-900">{dept.name}</h5>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{dept.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

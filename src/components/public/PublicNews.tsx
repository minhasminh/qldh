import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import type { PublicNewsItem } from '../../types/database.ts';
import type { WebsiteTab } from './SchoolWebsiteEditModal.tsx';
import {
  Calendar,
  User,
  Sparkles,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Edit3,
  Newspaper,
  CheckCircle2,
} from 'lucide-react';

interface PublicNewsProps {
  onOpenEditModal?: (tab?: WebsiteTab) => void;
}

const DEFAULT_NEWS: PublicNewsItem[] = [
  {
    id: 'news-01',
    title: 'Tổ chức thành công Ngày hội "Thiếu nhi vui khỏe - Tiến bước lên Đoàn" cấp liên đội',
    category: 'phong trào',
    summary:
      'Hơn 600 đội viên và nhi đồng hai cấp học Tiểu học và THCS đã hào hứng tham gia các trò chơi dân gian, đồng diễn Semaphore và kết nạp Đội viên mới.',
    content: `Sáng ngày 14/10/2026, Liên đội Trường TH&THCS Nguyễn Đình Anh đã long trọng tổ chức Ngày hội "Thiếu nhi vui khỏe - Tiến bước lên Đoàn".\n\nNgày hội diễn ra với nhiều hoạt động sôi nổi: thi nghi thức Đội, biểu diễn văn nghệ chào mừng và các gian hàng trò chơi trí tuệ. Ban Giám hiệu nhà trường đã trao 15 suất học bổng "Thắp sáng ước mơ" cho các em học sinh có hoàn cảnh khó khăn vươn lên đạt thành tích học tập xuất sắc.`,
    date: '14/10/2026',
    author: 'Cô Nguyễn Diệu Linh - Tổng phụ trách Đội',
  },
  {
    id: 'news-02',
    title: 'Hội thảo chuyên đề "Đổi mới phương pháp dạy học môn Tiếng Việt lớp 3 theo CT GDPT 2018"',
    category: 'tiểu học',
    summary:
      'Tổ chuyên môn Tiểu học Khối 1-2-3 tổ chức tiết dạy thể nghiệm minh họa, tăng cường ứng dụng học liệu số và tương tác nhóm.',
    content: `Thực hiện kế hoạch nhiệm vụ năm học 2026 - 2027, Tổ Tiểu học Khối 1-2-3 đã tổ chức sinh hoạt chuyên môn theo hình thức nghiên cứu bài học. Tiết dạy do Cô Vũ Thị Thu Hương thực hiện tại lớp 3A nhận được đánh giá cao từ Hội đồng Sư phạm về sự sáng tạo trong tổ chức trò chơi ngôn ngữ.`,
    date: '12/10/2026',
    author: 'Tổ Tiểu học Khối 1 - 2 - 3',
  },
  {
    id: 'news-03',
    title: 'Phát động phong trào Nghiên cứu Khoa học Kỹ thuật và sáng tạo STEM cấp THCS',
    category: 'thcs',
    summary:
      'Khuyến khích học sinh khối 8 và 9 đề xuất các ý tưởng giải quyết vấn đề thực tiễn về môi trường và nông nghiệp thông minh.',
    content: `Tổ Khoa học Tự nhiên THCS đã chính thức phát động Cuộc thi KHKT dành cho học sinh THCS năm học 2026 - 2027. Các nhóm học sinh sẽ được các thầy cô giáo bộ môn hướng dẫn hoàn thiện đề tài tham gia vòng thi cấp huyện vào tháng 12 tới.`,
    date: '09/10/2026',
    author: 'Thầy Hoàng Minh Đức - Tổ trưởng KHTN',
  },
];

export const PublicNews: React.FC<PublicNewsProps> = ({ onOpenEditModal }) => {
  const { schoolSettings, refreshAppData, showToast } = useApp();
  const { isAdmin } = useAuth();
  const [selectedNews, setSelectedNews] = useState<PublicNewsItem | null>(null);

  const newsList: PublicNewsItem[] =
    schoolSettings?.websiteConfig?.newsArticles &&
    schoolSettings.websiteConfig.newsArticles.length > 0
      ? schoolSettings.websiteConfig.newsArticles
      : DEFAULT_NEWS;

  const handleDeleteNews = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này khỏi Website Trường?')) return;

    try {
      const updatedNews = newsList.filter((n) => n.id !== id);
      await api.updateWebsiteSettings({
        websiteConfig: {
          ...(schoolSettings?.websiteConfig || {}),
          newsArticles: updatedNews,
        },
      });
      await refreshAppData();
      showToast('Đã xóa bài viết thành công!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Không thể xóa bài viết.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">
            TIN TỨC & HOẠT ĐỘNG GIÁO DỤC
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">
            Bản Tin Nhà Trường & Hoạt Động Liên Cấp
          </h2>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenEditModal?.('news')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm bài viết mới</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenEditModal?.('news')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-2 text-xs font-bold text-amber-900 shadow-xs cursor-pointer transition-all"
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-700" />
              <span>Quản lý tin bài</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {newsList.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedNews(item)}
            className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden"
          >
            {isAdmin && (
              <div className="absolute top-3 right-3 flex items-center gap-1 z-10 bg-white/95 rounded-lg border border-slate-200 p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEditModal?.('news');
                  }}
                  className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                  title="Sửa bài viết trong trình quản trị"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteNews(e, item.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Xóa bài viết"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-2 pr-12">
              <span className="rounded bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-bold uppercase inline-block">
                {item.category}
              </span>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {item.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="tabular-nums">{item.date}</span>
              </span>
              <span className="text-blue-700 font-semibold group-hover:underline">Chi tiết →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="rounded bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-bold uppercase">
                {selectedNews.category}
              </span>
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm px-2 py-1 rounded"
              >
                ✕ Đóng
              </button>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{selectedNews.title}</h3>
            <p className="text-xs text-slate-400">
              Người đăng: {selectedNews.author} · Ngày xuất bản: {selectedNews.date}
            </p>
            <div className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap py-2 border-t border-b border-slate-100">
              {selectedNews.content}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNews(null);
                    onOpenEditModal?.('news');
                  }}
                  className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-blue-500 transition-colors"
                >
                  Chỉnh sửa bài này trong trình quản trị
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

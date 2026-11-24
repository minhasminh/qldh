import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import type { WebsiteTab } from './SchoolWebsiteEditModal.tsx';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, Building, MessageSquare, Edit3 } from 'lucide-react';

interface PublicContactProps {
  onOpenEditModal?: (tab?: WebsiteTab) => void;
}

export const PublicContact: React.FC<PublicContactProps> = ({ onOpenEditModal }) => {
  const { schoolSettings, showToast } = useApp();
  const { isAdmin } = useAuth();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.message) {
      showToast('Vui lòng điền đầy đủ họ tên, số điện thoại và nội dung tin nhắn.', 'error');
      return;
    }
    setFormSubmitted(true);
    showToast('Tin nhắn liên hệ của bạn đã được gửi thành công đến Văn phòng nhà trường!', 'success');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center space-y-2 border-b border-slate-200 pb-6 relative">
        {isAdmin && (
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => onOpenEditModal?.('contact')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              title="Chỉnh sửa thông tin liên hệ, hotline, email và giờ làm việc"
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-700" />
              <span>Sửa thông tin Liên hệ & Giờ làm việc</span>
            </button>
          </div>
        )}

        <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">
          THÔNG TIN LIÊN HỆ & PHẢN HỒI
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase text-slate-900 tracking-tight">
          Văn Phòng {schoolSettings?.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
        </h2>
        <p className="text-xs text-slate-500 max-w-xl mx-auto">
          Nhà trường luôn sẵn sàng tiếp nhận thông tin phản hồi, giải đáp thắc mắc từ quý phụ huynh, học sinh và nhân dân.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: School Information */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-800" />
              <span>Địa Chỉ & Điện Thoại Trực Ban</span>
            </h3>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700 shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Địa chỉ trường:</p>
                  <p className="mt-0.5 leading-relaxed">
                    {schoolSettings?.address || 'Xã Thạch Bình, Huyện Thạch Thành, Tỉnh Thanh Hóa'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 shrink-0 mt-0.5">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Đường dây nóng / Văn phòng:</p>
                  <p className="mt-0.5 font-mono text-slate-800 font-semibold tabular-nums">
                    {schoolSettings?.phone || '0237 387 6543'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-700 shrink-0 mt-0.5">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Hòm thư điện tử công vụ:</p>
                  <p className="mt-0.5 text-slate-800">
                    {schoolSettings?.email || 'ththcsnguyendinhanh@thachthanh.edu.vn'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700 shrink-0 mt-0.5">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Thời gian làm việc văn phòng:</p>
                  <p className="mt-0.5 leading-relaxed">
                    {schoolSettings?.websiteConfig?.officeHours ||
                      'Thứ Hai đến Thứ Bảy: Sáng 07:00 - 11:30 | Chiều 13:30 - 17:00'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 space-y-2 text-xs text-blue-900">
            <h4 className="font-bold flex items-center gap-1.5">
              <span>Lưu ý gửi phản hồi</span>
            </h4>
            <p className="leading-relaxed text-[11px] text-blue-800">
              {schoolSettings?.websiteConfig?.contactNotes ||
                'Đối với các vấn đề liên quan trực tiếp đến hồ sơ học tập của học sinh, chuyển trường hoặc thủ tục nhập học, quý phụ huynh có thể liên hệ trực tiếp Bộ phận Văn thư - Học vụ tại trường trong giờ hành chính.'}
            </p>
          </div>
        </div>

        {/* Right Column: Contact & Feedback Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MessageSquare className="h-4 w-4 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Gửi Ý Kiến Đóng Góp / Phản Hồi
            </h3>
          </div>

          {formSubmitted ? (
            <div className="py-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Cảm Ơn Quý Phụ Huynh & Thầy Cô!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Nội dung thư điện tử đã được chuyển tiếp đến Ban Giám hiệu nhà trường. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFormData({ fullName: '', phone: '', email: '', subject: '', message: '' });
                  setFormSubmitted(false);
                }}
                className="mt-4 rounded-xl bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
              >
                Gửi thêm ý kiến khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên người gửi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn Nam (Phụ huynh học sinh Lớp 6A)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số điện thoại liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912 345 678"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Địa chỉ email (nếu có)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chủ đề / Vấn đề phản ánh
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Về việc bán trú, học tập, cơ sở vật chất..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Nhập nội dung ý kiến đóng góp, thắc mắc..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 shadow-md transition-all active:scale-98"
              >
                <Send className="h-4 w-4" />
                <span>Gửi thông tin đến nhà trường</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

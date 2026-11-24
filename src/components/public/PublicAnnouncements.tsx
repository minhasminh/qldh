import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import type { Announcement } from '../../types/database.ts';
import { Bell, Eye, Paperclip, Download, Calendar } from 'lucide-react';
import { Modal } from '../common/Modal.tsx';

export const PublicAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);

  useEffect(() => {
    const fetchPublicAnnouncements = async () => {
      setLoading(true);
      try {
        const data = await api.getPublicAnnouncements();
        setAnnouncements(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicAnnouncements();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">
          THÔNG BÁO CÔNG KHAI
        </span>
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">
          Thông Báo Dành Cho Phụ Huynh, Học Sinh & Nhân Dân
        </h2>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Đang tải thông báo...</div>
      ) : announcements.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 rounded-2xl bg-white border">
          Hiện tại không có thông báo công khai nào.
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {item.category === 'academic' ? 'Chuyên môn & Khảo thí' : 'Thông báo trường'}
                </span>
                <span className="tabular-nums">
                  {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 hover:text-blue-700 transition-colors">
                {item.title}
              </h3>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {item.summary || item.content}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                <span>Người đăng: {item.authorName}</span>
                <span className="font-semibold text-blue-700 hover:underline">Xem toàn văn →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title || 'Chi tiết thông báo'}
        subtitle={`Người phát hành: ${selectedItem?.authorName} · Ngày: ${selectedItem ? new Date(selectedItem.createdAt).toLocaleDateString('vi-VN') : ''}`}
        maxWidth="2xl"
        actions={
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Đóng
          </button>
        }
      >
        {selectedItem && (
          <div className="space-y-4 text-xs md:text-sm">
            <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed py-2">
              {selectedItem.content}
            </div>

            {selectedItem.attachments?.length > 0 && (
              <div className="border-t border-slate-200 pt-3">
                <p className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-blue-600" />
                  Tài liệu đính kèm ({selectedItem.attachments.length}):
                </p>
                <div className="space-y-1.5">
                  {selectedItem.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <span className="truncate pr-2 font-medium text-slate-800">{att.name}</span>
                      <a
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 text-blue-700 hover:bg-blue-100"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

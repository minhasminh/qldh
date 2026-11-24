import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext.tsx';
import { useAuth } from '../../../context/AuthContext.tsx';
import {
  Bell,
  CheckCheck,
  Calendar,
  FileCheck2,
  CheckSquare,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, navigateTo } = useApp();
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'schedule':
        return <Calendar className="h-5 w-5 text-emerald-600" />;
      case 'plan':
        return <FileCheck2 className="h-5 w-5 text-amber-600" />;
      case 'task':
        return <CheckSquare className="h-5 w-5 text-blue-600" />;
      case 'report':
        return <FileSpreadsheet className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-sky-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Trung Tâm Thông Báo & Nhắc Việc
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhắc nhở tự động về hạn nộp công việc, lịch làm việc trong ngày và kết quả phê duyệt
          </p>
        </div>

        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.isRead) && (
            <button
              type="button"
              onClick={() => markAllNotificationsAsRead()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-slate-50 shadow-xs"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Đánh dấu đã đọc tất cả</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === 'unread' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Chưa đọc ({notifications.filter((n) => !n.isRead).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Không có thông báo nào trong hộp thư của bạn.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  markNotificationAsRead(item.id);
                  if (item.targetModule) {
                    navigateTo(item.targetModule as any, item.targetId);
                  }
                }}
                className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                  item.isRead ? 'hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs ${item.isRead ? 'font-bold text-slate-800' : 'font-extrabold text-blue-950'}`}>
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="pt-1 flex items-center gap-2 text-[11px] font-semibold text-blue-700">
                    <span>Xem chi tiết nội dung</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

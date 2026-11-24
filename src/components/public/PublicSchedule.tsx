import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import type { CalendarEvent } from '../../types/database.ts';
import { PrintableDocument } from '../common/PrintableDocument.tsx';
import { Calendar, Printer, MapPin, Clock, User } from 'lucide-react';
import { Modal } from '../common/Modal.tsx';

export const PublicSchedule: React.FC = () => {
  const { schoolSettings } = useApp();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const data = await api.getPublicEvents();
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const monday = getMonday(new Date());
  const weekDays = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const weekdayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  const getDayEvents = (dateStr: string) => {
    return events.filter((e) => e.status !== 'cancelled' && e.startDate <= dateStr && e.endDate >= dateStr);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">
            LỊCH CÔNG TÁC & HOẠT ĐỘNG
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">
            Lịch Hoạt Động Tuần Nhà Trường
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsPrintModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          <Printer className="h-4 w-4 text-slate-600" />
          <span>In lịch công tác tuần</span>
        </button>
      </div>

      {/* Week Grid */}
      <div className="space-y-4">
        {weekDays.map((day, idx) => {
          const dateStr = day.toISOString().split('T')[0];
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const dayEvents = getDayEvents(dateStr);

          return (
            <div
              key={dateStr}
              className={`rounded-2xl border p-4 transition-all ${
                isToday ? 'border-blue-400 bg-blue-50/20 shadow-xs' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase ${isToday ? 'text-blue-900' : 'text-slate-800'}`}>
                    {weekdayNames[idx]}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    ({day.toLocaleDateString('vi-VN')})
                  </span>
                  {isToday && (
                    <span className="rounded bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2">
                      Hôm nay
                    </span>
                  )}
                </div>
              </div>

              {dayEvents.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  Hoạt động dạy học và sinh hoạt theo thời khóa biểu bình thường.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-blue-100 text-blue-900 font-bold px-2 py-0.5 tabular-nums">
                            {ev.startTime} - {ev.endTime}
                          </span>
                          <h4 className="font-bold text-slate-900">{ev.title}</h4>
                        </div>
                        {ev.content && <p className="text-slate-600 pl-1">{ev.content}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px] shrink-0">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{ev.location}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>Chủ trì: {ev.hostName}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Print Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Bản in Lịch Hoạt Động Tuần"
        maxWidth="5xl"
        actions={
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(false)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Đóng
          </button>
        }
      >
        <PrintableDocument
          title="LỊCH CÔNG TÁC & HOẠT ĐỘNG NHÀ TRƯỜNG"
          subtitle={`Tuần từ ${weekDays[0].toLocaleDateString('vi-VN')} đến ${weekDays[5].toLocaleDateString('vi-VN')}`}
          signerTitle="HIỆU TRƯỞNG"
          signerName={schoolSettings?.principalName}
        >
          <div className="overflow-x-auto my-4">
            <table className="w-full border-collapse border border-slate-900 text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 font-bold text-slate-900 text-center">
                  <th className="border border-slate-900 py-2 px-2 w-28">Thứ, Ngày</th>
                  <th className="border border-slate-900 py-2 px-2 w-24">Thời gian</th>
                  <th className="border border-slate-900 py-2 px-3">Nội dung công việc</th>
                  <th className="border border-slate-900 py-2 px-2 w-32">Địa điểm</th>
                  <th className="border border-slate-900 py-2 px-2 w-36">Chủ trì</th>
                  <th className="border border-slate-900 py-2 px-2 w-40">Thành phần tham gia</th>
                </tr>
              </thead>
              <tbody>
                {weekDays.map((day, idx) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const dayEvents = getDayEvents(dateStr);
                  if (dayEvents.length === 0) {
                    return (
                      <tr key={dateStr} className="border-b border-slate-900">
                        <td className="border border-slate-900 py-2 px-2 font-bold text-center">
                          {weekdayNames[idx]}
                          <div className="text-[10px] font-normal text-slate-600">{day.toLocaleDateString('vi-VN')}</div>
                        </td>
                        <td colSpan={5} className="border border-slate-900 py-2 px-3 text-center text-slate-400 italic">
                          Dạy học bình thường theo thời khóa biểu
                        </td>
                      </tr>
                    );
                  }
                  return dayEvents.map((ev, evIdx) => (
                    <tr key={ev.id} className="border-b border-slate-900">
                      {evIdx === 0 && (
                        <td
                          rowSpan={dayEvents.length}
                          className="border border-slate-900 py-2 px-2 font-bold text-center align-top bg-slate-50/50"
                        >
                          {weekdayNames[idx]}
                          <div className="text-[10px] font-normal text-slate-600">{day.toLocaleDateString('vi-VN')}</div>
                        </td>
                      )}
                      <td className="border border-slate-900 py-2 px-2 text-center tabular-nums">
                        {ev.startTime} - {ev.endTime}
                      </td>
                      <td className="border border-slate-900 py-2 px-3 font-semibold">
                        {ev.title}
                        {ev.content && <p className="text-[11px] font-normal text-slate-600 mt-0.5">{ev.content}</p>}
                      </td>
                      <td className="border border-slate-900 py-2 px-2 text-center">{ev.location}</td>
                      <td className="border border-slate-900 py-2 px-2 text-center font-medium">{ev.hostName}</td>
                      <td className="border border-slate-900 py-2 px-2 text-[11px]">{ev.attendeesDescription}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </PrintableDocument>
      </Modal>
    </div>
  );
};

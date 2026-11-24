import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api.ts';
import { useAuth } from '../../../context/AuthContext.tsx';
import { useApp } from '../../../context/AppContext.tsx';
import type { CalendarEvent, EventStatus, Plan } from '../../../types/database.ts';
import { Modal } from '../../common/Modal.tsx';
import { ConfirmDialog } from '../../common/ConfirmDialog.tsx';
import { ExportModal } from '../../common/ExportModal.tsx';
import { PrintableDocument } from '../../common/PrintableDocument.tsx';
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Plus,
  AlertTriangle,
  Printer,
  FileSpreadsheet,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  FileCheck2,
  Ban,
  CheckCircle2,
} from 'lucide-react';

export const ScheduleView: React.FC = () => {
  const { currentUser, isPrincipal, isAdmin, isDean, isTeacher } = useAuth();
  const { showToast, departments, schoolSettings, targetEntityId, setTargetEntityId } = useApp();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [cancellingEvent, setCancellingEvent] = useState<CalendarEvent | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('09:30');
  const [formLocation, setFormLocation] = useState('Hội trường nhà trường');
  const [formHostName, setFormHostName] = useState('');
  const [formAttendees, setFormAttendees] = useState('Toàn thể cán bộ, giáo viên');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formRelatedPlanId, setFormRelatedPlanId] = useState('');
  const [formStatus, setFormStatus] = useState<EventStatus>('scheduled');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Clash Detection State
  const [clashWarning, setClashWarning] = useState<string[]>([]);
  const [clashAcknowledged, setClashAcknowledged] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [data, plansData] = await Promise.all([
        api.getEvents({
          departmentId: selectedDepartment === 'all' ? undefined : selectedDepartment,
        }),
        api.getPlans().catch(() => []),
      ]);
      setEvents(data);
      setAvailablePlans(plansData);

      if (targetEntityId) {
        const found = data.find((e) => e.id === targetEntityId);
        if (found) {
          setSelectedEvent(found);
          setTargetEntityId(null);
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedDepartment, currentUser]);

  // Compute Monday of current week
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7; // Monday = 0
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const monday = getMonday(currentDate);
  const weekDays = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  }); // Mon to Sat

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenCreate = (prefillDate?: string) => {
    const targetDate = prefillDate || new Date().toISOString().split('T')[0];
    setEditingEvent(null);
    setFormTitle('');
    setFormContent('');
    setFormPurpose('');
    setFormStartDate(targetDate);
    setFormEndDate(targetDate);
    setFormStartTime('08:00');
    setFormEndTime('09:30');
    setFormLocation('Hội trường nhà trường');
    setFormHostName(currentUser?.fullName || 'Ban Giám hiệu');
    setFormAttendees('Toàn thể cán bộ, giáo viên');
    setFormDepartmentId(currentUser?.departmentId || 'dept-bgh');
    setFormRelatedPlanId('');
    setFormStatus('scheduled');
    setFormNotes('');
    setClashWarning([]);
    setClashAcknowledged(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormContent(ev.content);
    setFormPurpose(ev.purpose);
    setFormStartDate(ev.startDate);
    setFormEndDate(ev.endDate);
    setFormStartTime(ev.startTime);
    setFormEndTime(ev.endTime);
    setFormLocation(ev.location);
    setFormHostName(ev.hostName);
    setFormAttendees(ev.attendeesDescription);
    setFormDepartmentId(ev.departmentId || '');
    setFormRelatedPlanId(ev.relatedPlanId || '');
    setFormStatus(ev.status);
    setFormNotes(ev.notes || '');
    setClashWarning([]);
    setClashAcknowledged(false);
    setIsFormOpen(true);
  };

  // Real-time Clash Check on blur
  const checkClash = async () => {
    if (!formStartDate || !formStartTime || !formEndTime) return;
    try {
      const clashRes = await api.checkScheduleClash({
        startDate: formStartDate,
        endDate: formEndDate || formStartDate,
        startTime: formStartTime,
        endTime: formEndTime,
        location: formLocation,
        hostName: formHostName,
        excludeId: editingEvent?.id,
      });
      if (clashRes.hasClash) {
        setClashWarning(clashRes.clashes);
      } else {
        setClashWarning([]);
      }
    } catch (err) {
      console.error('Lỗi kiểm tra xung đột lịch:', err);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim() || !formStartDate || !formStartTime || !formEndTime) {
      showToast('Vui lòng điền tiêu đề sự kiện, ngày và khung giờ', 'error');
      return;
    }

    // Clash validation rule: "Không tự động ghi đè lịch đã công bố khi có xung đột. Phải thông báo cho người dùng và yêu cầu xác nhận."
    if (clashWarning.length > 0 && !clashAcknowledged) {
      showToast('Phát hiện xung đột lịch làm việc hoặc địa điểm! Vui lòng kiểm tra cảnh báo và tích xác nhận nếu vẫn muốn lưu.', 'error');
      return;
    }

    setSaving(true);
    try {
      const linkedPlan = availablePlans.find((p) => p.id === formRelatedPlanId);
      const payload: Partial<CalendarEvent> = {
        title: formTitle.trim(),
        content: formContent.trim(),
        purpose: formPurpose.trim(),
        startDate: formStartDate,
        endDate: formEndDate || formStartDate,
        startTime: formStartTime,
        endTime: formEndTime,
        location: formLocation.trim(),
        hostName: formHostName.trim(),
        attendeesDescription: formAttendees.trim(),
        departmentId: formDepartmentId || undefined,
        relatedPlanId: formRelatedPlanId || undefined,
        relatedPlanTitle: linkedPlan ? `${linkedPlan.code} - ${linkedPlan.title}` : undefined,
        status: formStatus,
        notes: formNotes.trim(),
      };

      if (editingEvent) {
        const updated = await api.updateEvent(editingEvent.id, payload);
        setEvents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        showToast('Cập nhật sự kiện lịch công tác thành công');
      } else {
        const created = await api.createEvent(payload);
        setEvents((prev) => [...prev, created]);
        showToast('Thêm sự kiện lịch công tác thành công');
      }

      setIsFormOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!cancellingEvent) return;
    try {
      const updated = await api.cancelEvent(cancellingEvent.id, cancelReasonInput.trim());
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      if (selectedEvent?.id === updated.id) setSelectedEvent(updated);
      showToast('Đã hủy sự kiện lịch công tác và gửi thông báo cho các bên liên quan');
      setCancellingEvent(null);
      setCancelReasonInput('');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.deleteEvent(deleteConfirmId);
      setEvents((prev) => prev.filter((e) => e.id !== deleteConfirmId));
      showToast('Đã xóa sự kiện lịch công tác');
      setDeleteConfirmId(null);
      if (selectedEvent?.id === deleteConfirmId) {
        setSelectedEvent(null);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const getDayEvents = (dateStr: string) => {
    return events.filter(
      (e) => e.status !== 'cancelled' && e.startDate <= dateStr && e.endDate >= dateStr
    );
  };

  // Export Data
  const exportHeaders = ['STT', 'Tên công việc / Hoạt động', 'Ngày', 'Thời gian', 'Địa điểm', 'Chủ trì', 'Thành phần', 'Đơn vị', 'Trạng thái'];
  const exportRows = events.map((e, idx) => [
    idx + 1,
    e.title,
    e.startDate,
    `${e.startTime} - ${e.endTime}`,
    e.location,
    e.hostName,
    e.attendeesDescription,
    departments.find((d) => d.id === e.departmentId)?.name || 'Toàn trường',
    e.status,
  ]);

  const weekdayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Lịch Công Tác Nhà Trường
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lịch hoạt động, hội đồng sư phạm, thao giảng và các sự kiện giáo dục trong tuần
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'day' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch Ngày
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'week' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch Tuần
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'month' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch Tháng
            </button>
          </div>

          {/* Administrative Print */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span className="hidden sm:inline">In lịch tuần chuẩn</span>
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          {(isPrincipal || isAdmin || isDean || isTeacher) && (
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Đăng ký lịch</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Navigation & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <span className="font-bold text-slate-900 text-xs sm:text-sm pl-2">
            {viewMode === 'week' && (
              <>
                Tuần từ {weekDays[0].toLocaleDateString('vi-VN')} đến {weekDays[5].toLocaleDateString('vi-VN')}
              </>
            )}
            {viewMode === 'day' && (
              <>
                {weekdayNames[(currentDate.getDay() + 6) % 7]}, {currentDate.toLocaleDateString('vi-VN')}
              </>
            )}
            {viewMode === 'month' && (
              <>
                Tháng {currentDate.getMonth() + 1} / {currentDate.getFullYear()}
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">Tất cả các tổ / bộ phận</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SCHEDULE VIEWS */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {weekDays.map((day, idx) => {
            const dateStr = day.toISOString().split('T')[0];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const dayEvents = getDayEvents(dateStr);

            return (
              <div
                key={dateStr}
                className={`rounded-xl border flex flex-col min-h-[420px] transition-all ${
                  isToday ? 'border-blue-500 bg-blue-50/20 shadow-md ring-1 ring-blue-500' : 'border-slate-200 bg-white'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-3 border-b flex items-center justify-between ${
                    isToday ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold uppercase">{weekdayNames[idx]}</p>
                    <p className={`text-[11px] tabular-nums ${isToday ? 'text-blue-100' : 'text-slate-500'}`}>
                      {day.toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  {(isPrincipal || isAdmin || isDean || isTeacher) && (
                    <button
                      type="button"
                      onClick={() => handleOpenCreate(dateStr)}
                      className={`p-1 rounded hover:bg-black/10 transition-colors ${
                        isToday ? 'text-white' : 'text-slate-500'
                      }`}
                      title="Thêm sự kiện ngày này"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Day Events List */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {dayEvents.length === 0 ? (
                    <p className="py-8 text-center text-[11px] text-slate-400 italic">
                      Trống lịch
                    </p>
                  ) : (
                    dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[10px] text-blue-700 font-bold tabular-nums">
                          <span>
                            {ev.startTime} - {ev.endTime}
                          </span>
                          {ev.status === 'cancelled' && (
                            <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-200">
                              Đã hủy
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-bold ${ev.status === 'cancelled' ? 'line-through text-slate-400' : 'text-slate-900'} line-clamp-2`}>
                          {ev.title}
                        </p>
                        {ev.relatedPlanTitle && (
                          <div className="flex items-center gap-1 text-[9px] text-blue-800 font-medium bg-blue-50/80 px-1 py-0.5 rounded truncate">
                            <FileCheck2 className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{ev.relatedPlanTitle}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <p className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </p>
                          <p className="flex items-center gap-1 truncate">
                            <User className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{ev.hostName}</span>
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'day' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b pb-3 mb-4">
            Lịch làm việc chi tiết ngày {currentDate.toLocaleDateString('vi-VN')}
          </h3>
          {getDayEvents(currentDate.toISOString().split('T')[0]).length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-400">
              Không có sự kiện lịch công tác nào trong ngày này.
            </p>
          ) : (
            <div className="space-y-4">
              {getDayEvents(currentDate.toISOString().split('T')[0]).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 tabular-nums">
                        {ev.startTime} - {ev.endTime}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{ev.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600">{ev.content}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span>Địa điểm: <strong className="text-slate-700">{ev.location}</strong></span>
                      <span>Chủ trì: <strong className="text-slate-700">{ev.hostName}</strong></span>
                      <span>Thành phần: <strong>{ev.attendeesDescription}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'month' && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase">
                <th className="py-2 px-3">Thời gian</th>
                <th className="py-2 px-3">Nội dung công việc</th>
                <th className="py-2 px-3">Địa điểm</th>
                <th className="py-2 px-3">Chủ trì</th>
                <th className="py-2 px-3">Thành phần tham dự</th>
                <th className="py-2 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800 tabular-nums">
                    <div>{new Date(ev.startDate).toLocaleDateString('vi-VN')}</div>
                    <div className="text-[11px] text-blue-700">{ev.startTime} - {ev.endTime}</div>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">{ev.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{ev.content}</p>
                  </td>
                  <td className="py-3 px-3 text-slate-700">{ev.location}</td>
                  <td className="py-3 px-3 text-slate-700 font-medium">{ev.hostName}</td>
                  <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{ev.attendeesDescription}</td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(ev)}
                      className="text-xs text-blue-700 font-semibold hover:underline"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      <Modal
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Chi tiết sự kiện'}
        subtitle={`Ngày ${selectedEvent?.startDate ? new Date(selectedEvent.startDate).toLocaleDateString('vi-VN') : ''} (${selectedEvent?.startTime} - ${selectedEvent?.endTime})`}
        maxWidth="lg"
        actions={
          <div className="flex items-center justify-between w-full">
            <div>
              {(isPrincipal || isAdmin || selectedEvent?.creatorId === currentUser?.id) && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEvent) {
                      setDeleteConfirmId(selectedEvent.id);
                    }
                  }}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Xóa sự kiện
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedEvent && selectedEvent.status !== 'cancelled' && (isPrincipal || isAdmin || selectedEvent.creatorId === currentUser?.id) && (
                <button
                  type="button"
                  onClick={() => {
                    setCancellingEvent(selectedEvent);
                    setCancelReasonInput('');
                  }}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 flex items-center gap-1"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Hủy lịch này</span>
                </button>
              )}
              {(isPrincipal || isAdmin || selectedEvent?.creatorId === currentUser?.id) && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEvent) {
                      handleOpenEdit(selectedEvent);
                      setSelectedEvent(null);
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Chỉnh sửa
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        }
      >
        {selectedEvent && (
          <div className="space-y-4 text-xs">
            {selectedEvent.status === 'cancelled' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-start gap-2">
                <Ban className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-rose-800">SỰ KIỆN NÀY ĐÃ ĐƯỢC THÔNG BÁO HỦY:</strong>
                  <p className="mt-0.5">Lý do: {selectedEvent.cancelReason || 'Điều chỉnh kế hoạch công tác'}</p>
                  {selectedEvent.cancelledByName && (
                    <p className="text-[10px] text-rose-700 mt-1">Người hủy: {selectedEvent.cancelledByName}</p>
                  )}
                </div>
              </div>
            )}

            {selectedEvent.relatedPlanTitle && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Thuộc kế hoạch: <strong>{selectedEvent.relatedPlanTitle}</strong></span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Thời gian:</span>
                <p className="font-bold text-slate-900 tabular-nums">
                  {selectedEvent.startTime} - {selectedEvent.endTime}
                </p>
                <p className="text-slate-600">{new Date(selectedEvent.startDate).toLocaleDateString('vi-VN')}</p>
              </div>
              <div>
                <span className="text-slate-500">Địa điểm tổ chức:</span>
                <p className="font-bold text-slate-900">{selectedEvent.location}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="font-bold text-slate-700">Người chủ trì:</span>
                <p className="text-slate-900 font-medium">{selectedEvent.hostName}</p>
              </div>

              <div>
                <span className="font-bold text-slate-700">Thành phần tham dự:</span>
                <p className="text-slate-900">{selectedEvent.attendeesDescription}</p>
              </div>

              {selectedEvent.content && (
                <div>
                  <span className="font-bold text-slate-700">Nội dung chi tiết:</span>
                  <p className="text-slate-900 leading-relaxed whitespace-pre-wrap mt-0.5">
                    {selectedEvent.content}
                  </p>
                </div>
              )}

              {selectedEvent.notes && (
                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900">
                  <span className="font-bold">Ghi chú & yêu cầu chuẩn bị:</span>
                  <p className="mt-0.5">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE / EDIT EVENT MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingEvent ? 'Chỉnh sửa sự kiện lịch công tác' : 'Đăng ký sự kiện lịch công tác mới'}
        subtitle="Hệ thống tự động phát hiện và cảnh báo nếu có trùng lặp địa điểm hoặc người chủ trì"
        maxWidth="2xl"
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSaveForm}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-xs"
            >
              {saving ? 'Đang lưu...' : editingEvent ? 'Lưu cập nhật' : 'Xác nhận lưu'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveForm} className="space-y-4">
          {/* Clash Alert Warning */}
          {clashWarning.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <span>CẢNH BÁO XUNG ĐỘT THỜI GIAN / ĐỊA ĐIỂM:</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {clashWarning.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <label className="flex items-center gap-2 pt-2 border-t border-amber-200 font-semibold cursor-pointer text-amber-950">
                <input
                  type="checkbox"
                  checked={clashAcknowledged}
                  onChange={(e) => setClashAcknowledged(e.target.checked)}
                  className="rounded text-amber-600"
                />
                <span>Tôi đã xác minh và vẫn đồng ý lên lịch này</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Tên hoạt động / Công việc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="VD: Họp giao ban Ban Giám hiệu và các Tổ trưởng chuyên môn"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Ngày diễn ra <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => {
                  setFormStartDate(e.target.value);
                  setFormEndDate(e.target.value);
                }}
                onBlur={checkClash}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Giờ bắt đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                onBlur={checkClash}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Giờ kết thúc <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                onBlur={checkClash}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Địa điểm tổ chức <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                onBlur={checkClash}
                placeholder="VD: Hội trường Tầng 2 - Nhà Hiệu bộ"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Người chủ trì <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formHostName}
                onChange={(e) => setFormHostName(e.target.value)}
                onBlur={checkClash}
                placeholder="VD: TS. Nguyễn Văn Hưng - Hiệu trưởng"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Thành phần tham gia / Triệu tập
            </label>
            <input
              type="text"
              value={formAttendees}
              onChange={(e) => setFormAttendees(e.target.value)}
              placeholder="VD: Ban Giám hiệu, Các đồng chí Tổ trưởng chuyên môn, Trưởng các đoàn thể"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Nội dung & Mục đích
            </label>
            <textarea
              rows={3}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Mô tả nội dung công việc và yêu cầu chuẩn bị tài liệu..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Liên kết Kế hoạch liên quan (nếu có)
            </label>
            <select
              value={formRelatedPlanId}
              onChange={(e) => setFormRelatedPlanId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            >
              <option value="">-- Không liên kết kế hoạch --</option>
              {availablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.title} ({p.status === 'approved' ? 'Đã duyệt' : p.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Ghi chú chuẩn bị (nếu có)
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="VD: Văn phòng chuẩn bị âm thanh, máy chiếu, nước uống"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>
        </form>
      </Modal>

      {/* ADMINISTRATIVE PRINT PREVIEW MODAL */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Mẫu In Lịch Công Tác Tuần Chuẩn Hành Chính"
        subtitle="Mẫu văn bản hành chính theo tiêu chuẩn ngành Giáo dục & Đào tạo"
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
          docCode={`Số: ... /LCT-${schoolSettings?.shortName?.replace(/\s+/g, '') || 'THPT'}`}
          title={`LỊCH CÔNG TÁC TUẦN`}
          subtitle={`Từ ngày ${weekDays[0].toLocaleDateString('vi-VN')} đến ngày ${weekDays[5].toLocaleDateString('vi-VN')}`}
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
                  <th className="border border-slate-900 py-2 px-2 w-40">Thành phần tham dự</th>
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
                          Làm việc bình thường theo thời khóa biểu
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

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Xóa lịch công tác"
        message="Bạn có chắc chắn muốn xóa sự kiện này? Hành động sẽ được ghi nhận vào nhật ký kiểm toán."
        confirmText="Xác nhận xóa"
        type="danger"
      />

      {/* CANCEL EVENT MODAL */}
      <Modal
        isOpen={Boolean(cancellingEvent)}
        onClose={() => setCancellingEvent(null)}
        title="Hủy / Hoãn Lịch Công Tác"
        subtitle="Hệ thống sẽ cập nhật trạng thái ĐÃ HỦY và phát thông báo hệ thống đến toàn bộ thành phần tham gia"
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCancellingEvent(null)}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={handleCancelEvent}
              disabled={!cancelReasonInput.trim()}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 shadow-xs"
            >
              Xác nhận hủy lịch
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <p className="text-slate-500 font-medium">Sự kiện sẽ hủy:</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{cancellingEvent?.title}</p>
            <p className="text-slate-600 mt-1">
              Thời gian: {cancellingEvent?.startTime} - {cancellingEvent?.endTime}, {cancellingEvent?.startDate} | Địa điểm: {cancellingEvent?.location}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Lý do hủy / hoãn lịch <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              placeholder="VD: Ban Giám hiệu bận họp đột xuất tại Phòng Giáo dục và Đào tạo..."
              required
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:outline-hidden"
            />
          </div>
        </div>
      </Modal>

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Xuất lịch công tác nhà trường"
        filename={`Lich_cong_tac_${new Date().toISOString().split('T')[0]}`}
        headers={exportHeaders}
        rows={exportRows}
      />
    </div>
  );
};

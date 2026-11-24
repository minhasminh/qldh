import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext.tsx';
import { useAuth } from '../../../context/AuthContext.tsx';
import { api } from '../../../services/api.ts';
import type {
  Announcement,
  CalendarEvent,
  Task,
  Plan,
  Report,
  TaskStatisticsReport,
} from '../../../types/database.ts';
import {
  Bell,
  Calendar,
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight,
  Pin,
  MapPin,
  User,
  Sparkles,
  TrendingUp,
  Building2,
  Layers,
  GraduationCap,
  Shield,
  Eye,
  CheckSquare,
  AlertCircle,
  FolderArchive,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { stats, navigateTo, schoolSettings, departments } = useApp();
  const { currentUser, isPrincipal, isAdmin, isDean, isTeacher } = useAuth();

  // Role preview tab (allows Admin/Principal to test Dean and Teacher views)
  const defaultRoleView = (isPrincipal || isAdmin) ? 'bgh' : isDean ? 'dean' : 'teacher';
  const [activeRoleView, setActiveRoleView] = useState<'bgh' | 'dean' | 'teacher'>(defaultRoleView);

  const [urgentAnnouncements, setUrgentAnnouncements] = useState<Announcement[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
  const [priorityTasks, setPriorityTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [statsData, setStatsData] = useState<TaskStatisticsReport | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveRoleView((isPrincipal || isAdmin) ? 'bgh' : isDean ? 'dean' : 'teacher');
  }, [currentUser]);

  useEffect(() => {
    const fetchDashboardContent = async () => {
      setLoading(true);
      try {
        const [announcementsData, eventsData, tasksData, plansData, reportsData, statsReport] = await Promise.all([
          api.getAnnouncements(),
          api.getEvents(),
          api.getTasks(),
          api.getPlans(),
          api.getReports(),
          api.getTaskStatistics({ schoolYearId: 'all' }),
        ]);

        setAllAnnouncements(announcementsData);
        setAllTasks(tasksData);
        setAllPlans(plansData);
        setAllReports(reportsData);
        setStatsData(statsReport);

        // Filter urgent or pinned announcements
        setUrgentAnnouncements(
          announcementsData.filter((a) => a.isPinned || a.priority === 'urgent' || a.priority === 'high').slice(0, 4)
        );

        // Today & Upcoming events
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const dayOfWeek = (now.getDay() + 6) % 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - dayOfWeek);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const mondayStr = monday.toISOString().split('T')[0];
        const sundayStr = sunday.toISOString().split('T')[0];

        setTodayEvents(eventsData.filter((e) => e.status !== 'cancelled' && e.startDate <= today && e.endDate >= today));
        setWeekEvents(eventsData.filter((e) => e.status !== 'cancelled' && e.startDate <= sundayStr && e.endDate >= mondayStr));
        setUpcomingEvents(eventsData.filter((e) => e.status !== 'cancelled' && e.startDate >= today).slice(0, 5));

        // Priority tasks
        setPriorityTasks(
          tasksData.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').slice(0, 5)
        );
      } catch (err) {
        console.error('Lỗi nạp dữ liệu dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardContent();
  }, [currentUser]);

  const todayStr = new Date().toISOString().split('T')[0];
  const userDeptId = currentUser?.departmentId || '';

  // -------------------------------------------------------------
  // ROLE 1: BAN GIÁM HIỆU DATA
  // -------------------------------------------------------------
  const bghPublishedAnnouncements = allAnnouncements.filter((a) => a.status === 'published');
  const bghPendingLevel1Plans = allPlans.filter((p) => p.status === 'pending_level_1');
  const bghPendingLevel2Plans = allPlans.filter((p) => p.status === 'pending_level_2');
  const bghInProgressPlans = allPlans.filter((p) => p.status === 'in_progress');
  const bghOverdueTasks = allTasks.filter(
    (t) => t.status === 'overdue' || (t.deadline < todayStr && t.status !== 'completed' && t.status !== 'cancelled')
  );
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = in7Days.toISOString().split('T')[0];
  const bghUpcomingTasks = allTasks.filter(
    (t) => t.deadline >= todayStr && t.deadline <= in7DaysStr && t.status !== 'completed' && t.status !== 'cancelled'
  );
  const bghPendingReports = allReports.filter((r) => r.status === 'submitted');

  // -------------------------------------------------------------
  // ROLE 2: TỔ TRƯỞNG CHUYÊN MÔN DATA
  // -------------------------------------------------------------
  const deanDept = departments.find((d) => d.id === userDeptId);
  const deanPlans = allPlans.filter((p) => p.leadDepartmentId === userDeptId);
  const deanPlansWaitingBgh = deanPlans.filter((p) => p.status === 'pending_level_2');
  const deanTasks = allTasks.filter((t) => t.departmentId === userDeptId);
  const deanOverdueTasks = deanTasks.filter(
    (t) => t.status === 'overdue' || (t.deadline < todayStr && t.status !== 'completed' && t.status !== 'cancelled')
  );
  const deanReportsToHandle = allReports.filter((r) => r.departmentId === userDeptId && r.status === 'submitted');
  const deanCompletedTasks = deanTasks.filter((t) => t.status === 'completed');
  const deanCompletionRate = deanTasks.length > 0 ? Math.round((deanCompletedTasks.length / deanTasks.length) * 100) : 0;

  // -------------------------------------------------------------
  // ROLE 3: GIÁO VIÊN & NHÂN VIÊN DATA
  // -------------------------------------------------------------
  const teacherUnreadAnnouncements = allAnnouncements.filter(
    (a) => a.status === 'published' && (!currentUser || !a.readUserIds?.includes(currentUser.id))
  );
  const teacherPersonalEvents = upcomingEvents.filter(
    (e) => !currentUser || e.departmentId === currentUser.departmentId || e.hostName?.includes(currentUser.fullName)
  );
  const teacherMyAssignedTasks = allTasks.filter((t) => t.mainAssigneeId === currentUser?.id);
  const teacherMyCoordinatedTasks = allTasks.filter((t) => t.coAssigneeIds?.includes(currentUser?.id || ''));
  const teacherAllMyTasks = allTasks.filter(
    (t) => t.mainAssigneeId === currentUser?.id || t.coAssigneeIds?.includes(currentUser?.id || '')
  );
  const teacherUpcomingTasks = teacherAllMyTasks
    .filter((t) => t.deadline >= todayStr && t.status !== 'completed' && t.status !== 'cancelled')
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const teacherNeedsAdditionReports = allReports.filter(
    (r) => r.authorId === currentUser?.id && r.status === 'needs_addition'
  );
  const teacherNeedsAdditionTasks = teacherAllMyTasks.filter((t) => t.status === 'needs_addition');
  const teacherCompletedTasks = teacherAllMyTasks.filter((t) => t.status === 'completed');
  const teacherCompletionRate = teacherAllMyTasks.length > 0
    ? Math.round((teacherCompletedTasks.length / teacherAllMyTasks.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome School Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Hệ thống chỉ đạo & điều hành điện tử</span>
              <span>·</span>
              <span>{schoolSettings?.managementAgency || 'SỞ GD&ĐT'}</span>
            </div>
            <h2 className="mt-1 text-xl md:text-2xl font-bold tracking-tight">
              Kính chào {currentUser?.fullName || 'Quý Thầy Cô'}!
            </h2>
            <p className="mt-1 text-xs text-slate-300 max-w-2xl leading-relaxed">
              {currentUser?.title ? `${currentUser.title} · ` : ''}
              Năm học {schoolSettings?.currentSchoolYearId.replace('sy-', '') || '2026-2027'} ({schoolSettings?.currentSemester || 'Học kỳ I'}).
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            {(isPrincipal || isAdmin || isDean) && (
              <button
                type="button"
                onClick={() => navigateTo('tasks')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Giao nhiệm vụ
              </button>
            )}
            {(isPrincipal || isAdmin) && (
              <button
                type="button"
                onClick={() => navigateTo('announcements')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors border border-white/20"
              >
                <Bell className="h-3.5 w-3.5" />
                Soạn thông báo
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateTo('schedule')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors border border-white/20"
            >
              <Calendar className="h-3.5 w-3.5" />
              Lịch tuần
            </button>
          </div>
        </div>
      </div>

      {/* Role View Switcher for Administrators / Leaders */}
      {(isPrincipal || isAdmin) && (
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Layers className="h-4 w-4 text-blue-600" />
            <span>Chế độ hiển thị Dashboard theo vai trò:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveRoleView('bgh')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeRoleView === 'bgh'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ban Giám Hiệu
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleView('dean')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeRoleView === 'dean'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tổ Trưởng Chuyên Môn
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleView('teacher')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeRoleView === 'teacher'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Giáo Viên / Nhân Viên
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DASHBOARD 1: BAN GIÁM HIỆU */}
      {/* ============================================================= */}
      {activeRoleView === 'bgh' && (
        <div className="space-y-6">
          {/* Header indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              <Shield className="h-4 w-4 text-blue-600" />
              <span>Bảng Điều Hành Ban Giám Hiệu & Quản Trị Toàn Trường</span>
            </div>
            <span className="text-[11px] text-slate-500">Dữ liệu nguồn trực tiếp Supabase</span>
          </div>

          {/* Metric Cards Grid - 8 BGH Core KPI metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* 1. Thông báo đã công bố */}
            <div
              onClick={() => navigateTo('announcements')}
              className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">TB công bố</span>
                <Bell className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{bghPublishedAnnouncements.length}</p>
              <span className="text-[10px] text-blue-700">Đã ban hành</span>
            </div>

            {/* 2. Lịch hôm nay & tuần này */}
            <div
              onClick={() => navigateTo('schedule')}
              className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">Lịch hôm nay</span>
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{todayEvents.length}</p>
              <span className="text-[10px] text-emerald-700">Tuần này: {weekEvents.length}</span>
            </div>

            {/* 3. KH chờ duyệt cấp 1 */}
            <div
              onClick={() => navigateTo('plans')}
              className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 text-amber-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">Chờ duyệt C1</span>
                <FileCheck2 className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{bghPendingLevel1Plans.length}</p>
              <span className="text-[10px] text-amber-700">Tổ thẩm định</span>
            </div>

            {/* 4. KH chờ BGH duyệt (Cấp 2) */}
            <div
              onClick={() => navigateTo('plans')}
              className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 text-indigo-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">Chờ BGH duyệt</span>
                <FileCheck2 className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{bghPendingLevel2Plans.length}</p>
              <span className="text-[10px] text-indigo-700">Cấp 2 quyết định</span>
            </div>

            {/* 5. Kế hoạch đang thực hiện */}
            <div
              onClick={() => navigateTo('plans')}
              className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/60 text-sky-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">KH đang làm</span>
                <Clock className="h-4 w-4 text-sky-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{bghInProgressPlans.length}</p>
              <span className="text-[10px] text-sky-700">Tiến độ thực tế</span>
            </div>

            {/* 6. Tỷ lệ hoàn thành nhiệm vụ */}
            <div
              onClick={() => navigateTo('tasks')}
              className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/60 text-teal-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">Tỷ lệ xong</span>
                <TrendingUp className="h-4 w-4 text-teal-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{stats?.taskCompletionRate ?? 0}%</p>
              <span className="text-[10px] text-teal-700">Toàn trường</span>
            </div>

            {/* 7. Nhiệm vụ quá hạn / Sắp đến hạn */}
            <div
              onClick={() => navigateTo('tasks')}
              className={`p-3.5 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between ${
                bghOverdueTasks.length > 0 ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">Quá hạn</span>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{bghOverdueTasks.length}</p>
              <span className="text-[10px] text-rose-700">Sắp đến hạn: {bghUpcomingTasks.length}</span>
            </div>

            {/* 8. Báo cáo chờ xác nhận */}
            <div
              onClick={() => navigateTo('reports')}
              className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/60 text-purple-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">Báo cáo nộp</span>
                <FileSpreadsheet className="h-4 w-4 text-purple-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{bghPendingReports.length}</p>
              <span className="text-[10px] text-purple-700">Chờ phê duyệt</span>
            </div>
          </div>

          {/* Section: Breakdown theo Cấp học & Tổ chuyên môn */}
          {statsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thống kê theo cấp học */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3 text-xs font-bold text-slate-900">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  <span>Tiến độ thực hiện nhiệm vụ theo cấp học</span>
                </div>
                <div className="space-y-3">
                  {statsData.bySchoolLevel?.map((sl) => (
                    <div key={sl.level} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{sl.levelName}</span>
                        <span className="font-bold text-blue-700 tabular-nums">
                          {sl.completedTasks}/{sl.totalTasks} ({sl.completionRate}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${sl.completionRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Đang làm: {sl.inProgressTasks}</span>
                        <span className={sl.overdueTasks > 0 ? 'text-rose-600 font-bold' : ''}>
                          Quá hạn: {sl.overdueTasks}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thống kê theo tổ chuyên môn */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    <span>Thống kê theo các tổ bộ môn</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('reports')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Xem chi tiết
                  </button>
                </div>
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {statsData.byDepartment?.map((dept) => (
                    <div
                      key={dept.departmentId}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{dept.departmentName}</p>
                        <p className="text-[10px] text-slate-500">
                          {dept.completedTasks} hoàn thành / {dept.totalTasks} nhiệm vụ
                        </p>
                      </div>
                      <span className="font-bold text-slate-700 tabular-nums">{dept.completionRate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pending BGH Plans & Overdue Tasks alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Kế hoạch cần Ban Giám Hiệu phê duyệt ngay */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <FileCheck2 className="h-4 w-4 text-indigo-600" />
                  <span>Kế hoạch cần BGH phê duyệt ban hành ({bghPendingLevel2Plans.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('plans')}
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Tất cả <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {bghPendingLevel2Plans.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Không có kế hoạch nào đang chờ Ban Giám hiệu ký duyệt.
                </p>
              ) : (
                <div className="space-y-2">
                  {bghPendingLevel2Plans.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigateTo('plans', p.id)}
                      className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-indigo-900">{p.code}</span>
                        <span className="rounded bg-indigo-200 px-1.5 py-0.2 text-[10px] font-bold text-indigo-900">
                          Chờ duyệt Cấp 2
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{p.title}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Người lập: {p.responsiblePersonName}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nhiệm vụ quá hạn cần chỉ đạo */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Nhiệm vụ trễ hạn / Cần đôn đốc ({bghOverdueTasks.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('tasks')}
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Xử lý <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {bghOverdueTasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Xuất sắc! Toàn trường không có nhiệm vụ nào bị quá hạn.
                </p>
              ) : (
                <div className="space-y-2">
                  {bghOverdueTasks.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigateTo('tasks', t.id)}
                      className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-rose-900 line-clamp-1">{t.title}</span>
                        <span className="rounded bg-rose-200 px-1.5 py-0.2 text-[10px] font-bold text-rose-900">
                          Trễ hạn
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1">
                        <span>Phụ trách: <strong>{t.mainAssigneeName}</strong></span>
                        <span className="text-rose-700 font-semibold">Hạn chót: {new Date(t.deadline).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DASHBOARD 2: TỔ TRƯỞNG CHUYÊN MÔN */}
      {/* ============================================================= */}
      {activeRoleView === 'dean' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              <Building2 className="h-4 w-4 text-emerald-600" />
              <span>Bảng Quản Lý Hoạt Động: {deanDept?.name || 'Tổ Chuyên Môn'}</span>
            </div>
            <span className="text-[11px] text-slate-500">Tổ trưởng chuyên môn</span>
          </div>

          {/* 5 Core Dean Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {/* 1. Kế hoạch của tổ */}
            <div
              onClick={() => navigateTo('plans')}
              className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">KH của Tổ</span>
                <FileCheck2 className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{deanPlans.length}</p>
              <span className="text-[10px] text-blue-700">Kế hoạch tuần & tháng</span>
            </div>

            {/* 2. Nhiệm vụ thành viên */}
            <div
              onClick={() => navigateTo('tasks')}
              className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Nhiệm vụ tổ</span>
                <CheckSquare className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{deanTasks.length}</p>
              <span className="text-[10px] text-emerald-700">Đã xong {deanCompletionRate}%</span>
            </div>

            {/* 3. Báo cáo cần xử lý */}
            <div
              onClick={() => navigateTo('reports')}
              className="p-4 rounded-xl border border-purple-200 bg-purple-50/70 text-purple-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Báo cáo cần xử lý</span>
                <FileSpreadsheet className="h-4 w-4 text-purple-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{deanReportsToHandle.length}</p>
              <span className="text-[10px] text-purple-700">Tổ viên nộp lên</span>
            </div>

            {/* 4. Nhiệm vụ trễ hạn */}
            <div
              onClick={() => navigateTo('tasks')}
              className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between ${
                deanOverdueTasks.length > 0 ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Nhiệm vụ trễ hạn</span>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{deanOverdueTasks.length}</p>
              <span className="text-[10px] text-rose-700">Cần đôn đốc ngay</span>
            </div>

            {/* 5. KH chờ BGH duyệt */}
            <div
              onClick={() => navigateTo('plans')}
              className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Chờ BGH duyệt</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{deanPlansWaitingBgh.length}</p>
              <span className="text-[10px] text-amber-700">Đã qua Cấp 1</span>
            </div>
          </div>

          {/* Detailed Dean Tasks & Reports tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Nhiệm vụ của các thành viên trong tổ */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <span>Nhiệm vụ các thành viên trong tổ ({deanTasks.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('tasks')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Quản lý nhiệm vụ
                </button>
              </div>

              {deanTasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">Tổ chưa có nhiệm vụ nào được giao.</p>
              ) : (
                <div className="space-y-2">
                  {deanTasks.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigateTo('tasks', t.id)}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 space-y-0.5">
                        <p className="font-semibold text-slate-900 line-clamp-1">{t.title}</p>
                        <p className="text-[10px] text-slate-500">
                          Thực hiện: <strong>{t.mainAssigneeName}</strong> • Hạn:{' '}
                          {new Date(t.deadline).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <span className="font-bold text-blue-700 tabular-nums">{t.progress}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Báo cáo cần thẩm định và Kế hoạch chờ BGH */}
            <div className="space-y-4">
              {/* Báo cáo cần xử lý */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                    <span>Báo cáo cần xử lý ({deanReportsToHandle.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateTo('reports')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Xem tất cả
                  </button>
                </div>
                {deanReportsToHandle.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">Không có báo cáo nào tồn đọng.</p>
                ) : (
                  <div className="space-y-2">
                    {deanReportsToHandle.slice(0, 3).map((r) => (
                      <div
                        key={r.id}
                        onClick={() => navigateTo('reports', r.id)}
                        className="p-2.5 rounded-lg border border-purple-100 bg-purple-50/50 hover:bg-purple-100/50 cursor-pointer text-xs"
                      >
                        <p className="font-semibold text-slate-900 line-clamp-1">{r.title}</p>
                        <p className="text-[10px] text-slate-500">
                          Tác giả: {r.authorName} • Kỳ: {r.period}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kế hoạch của tổ chờ Ban Giám Hiệu duyệt */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>Kế hoạch của tổ chờ BGH duyệt ({deanPlansWaitingBgh.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateTo('plans')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Xem kế hoạch
                  </button>
                </div>
                {deanPlansWaitingBgh.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">Các kế hoạch của tổ đều đã được xử lý.</p>
                ) : (
                  <div className="space-y-2">
                    {deanPlansWaitingBgh.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => navigateTo('plans', p.id)}
                        className="p-2.5 rounded-lg border border-amber-100 bg-amber-50/50 hover:bg-amber-100/50 cursor-pointer text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] mb-0.5">
                          <span className="font-bold text-amber-900">{p.code}</span>
                          <span className="text-[10px] text-amber-800 font-semibold">Đã qua Cấp 1</span>
                        </div>
                        <p className="font-semibold text-slate-900 line-clamp-1">{p.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DASHBOARD 3: GIÁO VIÊN & NHÂN VIÊN */}
      {/* ============================================================= */}
      {activeRoleView === 'teacher' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              <User className="h-4 w-4 text-blue-600" />
              <span>Bàn Làm Việc Cá Nhân: {currentUser?.fullName || 'Giáo viên / Nhân viên'}</span>
            </div>
            <span className="text-[11px] text-slate-500">{currentUser?.title || 'Giáo viên'}</span>
          </div>

          {/* 6 Core Teacher KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 1. Thông báo mới */}
            <div
              onClick={() => navigateTo('announcements')}
              className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Thông báo mới</span>
                <Bell className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{teacherUnreadAnnouncements.length}</p>
              <span className="text-[10px] text-blue-700">Chưa đọc</span>
            </div>

            {/* 2. Lịch cá nhân */}
            <div
              onClick={() => navigateTo('schedule')}
              className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Lịch công tác</span>
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{teacherPersonalEvents.length}</p>
              <span className="text-[10px] text-emerald-700">Sự kiện tham dự</span>
            </div>

            {/* 3. Nhiệm vụ chính */}
            <div
              onClick={() => navigateTo('tasks')}
              className="p-4 rounded-xl border border-sky-200 bg-sky-50/70 text-sky-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Nhiệm vụ chính</span>
                <CheckSquare className="h-4 w-4 text-sky-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{teacherMyAssignedTasks.length}</p>
              <span className="text-[10px] text-sky-700">Phụ trách chính</span>
            </div>

            {/* 4. Nhiệm vụ phối hợp */}
            <div
              onClick={() => navigateTo('tasks')}
              className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Nhiệm vụ phối hợp</span>
                <User className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{teacherMyCoordinatedTasks.length}</p>
              <span className="text-[10px] text-indigo-700">Thành viên phối hợp</span>
            </div>

            {/* 5. Cần bổ sung / Sửa đổi */}
            <div
              onClick={() => navigateTo('reports')}
              className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between ${
                teacherNeedsAdditionReports.length + teacherNeedsAdditionTasks.length > 0
                  ? 'border-rose-300 bg-rose-50 text-rose-900'
                  : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Cần bổ sung</span>
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">
                {teacherNeedsAdditionReports.length + teacherNeedsAdditionTasks.length}
              </p>
              <span className="text-[10px] text-rose-700">Báo cáo & minh chứng</span>
            </div>

            {/* 6. Tỷ lệ hoàn thành cá nhân */}
            <div
              onClick={() => navigateTo('tasks')}
              className="p-4 rounded-xl border border-teal-200 bg-teal-50/70 text-teal-900 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Hoàn thành</span>
                <TrendingUp className="h-4 w-4 text-teal-600" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums">{teacherCompletionRate}%</p>
              <span className="text-[10px] text-teal-700">{teacherCompletedTasks.length} nhiệm vụ xong</span>
            </div>
          </div>

          {/* Teacher Two-Column: Nearest Deadlines & Work History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Nhiệm vụ có thời hạn gần nhất */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Nhiệm vụ có thời hạn gần nhất (Sắp đến hạn)</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('tasks')}
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Xem tất cả <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {teacherUpcomingTasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Bạn không có nhiệm vụ nào sắp đến hạn.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {teacherUpcomingTasks.slice(0, 5).map((t) => {
                    const daysLeft = Math.ceil(
                      (new Date(t.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
                    );
                    const isUrgent = daysLeft <= 3;
                    return (
                      <div
                        key={t.id}
                        onClick={() => navigateTo('tasks', t.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          isUrgent ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/50' : 'border-slate-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <p className="text-xs font-bold text-slate-900 line-clamp-1">{t.title}</p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span>Người giao: {t.assignerName}</span>
                              <span>·</span>
                              <span className={isUrgent ? 'text-amber-800 font-bold' : ''}>
                                Hạn: {new Date(t.deadline).toLocaleDateString('vi-VN')} ({daysLeft} ngày nữa)
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-blue-700 tabular-nums">{t.progress}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lịch sử công việc & Báo cáo cần bổ sung */}
            <div className="space-y-4">
              {/* Báo cáo cần bổ sung */}
              {teacherNeedsAdditionReports.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900 border-b border-rose-200/60 pb-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <span>Báo cáo yêu cầu bổ sung số liệu ({teacherNeedsAdditionReports.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {teacherNeedsAdditionReports.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => navigateTo('reports', r.id)}
                        className="p-2.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 cursor-pointer text-xs"
                      >
                        <p className="font-bold text-slate-900">{r.title}</p>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          Ý kiến chỉ đạo: {r.reviewComment || 'Vui lòng bổ sung minh chứng'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lịch sử công việc đã hoàn thành gần đây */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Lịch sử công việc hoàn thành gần đây</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Đã nghiệm thu</span>
                </div>

                {teacherCompletedTasks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">Chưa có nhiệm vụ nào hoàn thành gần đây.</p>
                ) : (
                  <div className="space-y-2">
                    {teacherCompletedTasks.slice(0, 4).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => navigateTo('tasks', t.id)}
                        className="p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-100/40 transition-colors cursor-pointer text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 line-clamp-1">{t.title}</p>
                          <p className="text-[10px] text-slate-500">
                            Nghiệm thu bởi: <strong>{t.verifiedByName || 'Người giao'}</strong> • Ngày:{' '}
                            {t.verifiedAt ? new Date(t.verifiedAt).toLocaleDateString('vi-VN') : 'Đã duyệt'}
                          </p>
                        </div>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          100%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Section: Lịch công tác trọng tâm & Thông báo quan trọng */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Lịch Công Tác Trọng Tâm</h3>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('schedule')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
              >
                Xem toàn bộ lịch <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Không có sự kiện lịch công tác nào sắp diễn ra.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => navigateTo('schedule', ev.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 transition-colors cursor-pointer gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">{ev.title}</span>
                        {ev.startDate === todayStr && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                            Hôm nay
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <strong className="text-slate-700 tabular-nums">
                            {ev.startTime} - {ev.endTime}
                          </strong>
                          <span>({new Date(ev.startDate).toLocaleDateString('vi-VN')})</span>
                        </span>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Pinned Announcements */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Thông Báo Quan Trọng</h3>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('announcements')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
              >
                Tất cả <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {urgentAnnouncements.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Không có thông báo quan trọng nào.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {urgentAnnouncements.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => navigateTo('announcements', a.id)}
                    className="py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      {a.isPinned && <Pin className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 hover:text-blue-700 transition-colors line-clamp-2">
                          {a.title}
                        </h4>
                        <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{a.summary}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{a.authorName}</span>
                          <span>·</span>
                          <span className="tabular-nums">
                            {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

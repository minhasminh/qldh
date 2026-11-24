import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api.ts';
import { useApp } from '../../../context/AppContext.tsx';
import { useAuth } from '../../../context/AuthContext.tsx';
import type {
  Announcement,
  CalendarEvent,
  Plan,
  Task,
  Report,
  DocumentItem,
  AdvancedSearchParams,
} from '../../../types/database.ts';
import {
  Search,
  Bell,
  Calendar,
  FileCheck2,
  CheckSquare,
  FolderArchive,
  FileSpreadsheet,
  ArrowRight,
  Clock,
  User,
  Filter,
  X,
  Building2,
  Shield,
  Layers,
} from 'lucide-react';

export const GlobalSearchView: React.FC = () => {
  const { globalSearchQuery, setGlobalSearchQuery, navigateTo, departments } = useApp();
  const { currentUser, isPrincipal, isAdmin, isDean } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'announcements' | 'events' | 'plans' | 'tasks' | 'reports' | 'documents'>('all');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>('all');
  const [allUsersList, setAllUsersList] = useState<{ id: string; fullName: string; role: string }[]>([]);

  const [results, setResults] = useState<{
    announcements: Announcement[];
    events: CalendarEvent[];
    plans: Plan[];
    tasks: Task[];
    reports: Report[];
    documents: DocumentItem[];
  }>({
    announcements: [],
    events: [],
    plans: [],
    tasks: [],
    reports: [],
    documents: [],
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await api.getUsers();
        setAllUsersList(users.map((u) => ({ id: u.id, fullName: u.fullName, role: u.role })));
      } catch (err) {
        console.error('Lỗi tải danh sách người dùng cho tìm kiếm:', err);
      }
    };
    fetchUsers();
  }, []);

  const doSearch = async () => {
    setLoading(true);
    try {
      const searchParams: AdvancedSearchParams = {
        q: globalSearchQuery.trim(),
        type: activeTab,
        departmentId: filterDepartmentId !== 'all' ? filterDepartmentId : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        assigneeId: filterAssigneeId !== 'all' ? filterAssigneeId : undefined,
      };

      const data = await api.searchGlobal(searchParams);
      setResults({
        announcements: data.announcements || [],
        events: data.events || [],
        plans: data.plans || [],
        tasks: data.tasks || [],
        reports: data.reports || [],
        documents: data.documents || [],
      });
    } catch (err) {
      console.error('Lỗi thực hiện tìm kiếm:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    doSearch();
  }, [globalSearchQuery, activeTab, filterDepartmentId, filterStatus, filterDateFrom, filterDateTo, filterAssigneeId, currentUser]);

  const handleResetFilters = () => {
    setFilterDepartmentId('all');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAssigneeId('all');
  };

  const setDatePreset = (preset: 'today' | 'this_week' | 'this_month' | 'clear') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'clear') {
      setFilterDateFrom('');
      setFilterDateTo('');
      return;
    }

    if (preset === 'today') {
      setFilterDateFrom(todayStr);
      setFilterDateTo(todayStr);
      return;
    }

    if (preset === 'this_week') {
      const dayOfWeek = (now.getDay() + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFilterDateFrom(monday.toISOString().split('T')[0]);
      setFilterDateTo(sunday.toISOString().split('T')[0]);
      return;
    }

    if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilterDateFrom(firstDay.toISOString().split('T')[0]);
      setFilterDateTo(lastDay.toISOString().split('T')[0]);
      return;
    }
  };

  const totalResults =
    results.announcements.length +
    results.events.length +
    results.plans.length +
    results.tasks.length +
    results.reports.length +
    results.documents.length;

  const hasActiveFilters =
    filterDepartmentId !== 'all' ||
    filterStatus !== 'all' ||
    filterDateFrom !== '' ||
    filterDateTo !== '' ||
    filterAssigneeId !== 'all';

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Tra Cứu Dữ Liệu Toàn Hệ Thống
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
              <Shield className="h-3 w-3" />
              <span>Phân quyền bảo mật</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tìm kiếm đồng bộ trên thông báo, lịch công tác, kế hoạch, nhiệm vụ, báo cáo và văn bản hồ sơ
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Bộ lọc nâng cao</span>
          {hasActiveFilters && (
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          )}
        </button>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <input
          type="text"
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          placeholder="Nhập từ khóa tìm kiếm (VD: Toán, STEM, thao giảng, 20/11, kiểm tra, văn bản, biên bản...)"
          className="w-full rounded-xl border border-slate-300 bg-white p-3.5 pl-11 text-sm text-slate-900 shadow-xs focus:border-blue-600 focus:outline-hidden"
        />
        <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
        {globalSearchQuery && (
          <button
            type="button"
            onClick={() => setGlobalSearchQuery('')}
            className="absolute right-3.5 top-3.5 p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 text-xs space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-blue-600" />
              <span>Các tiêu chí lọc kết quả tra cứu:</span>
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Department Filter */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tổ / Bộ phận</label>
              <select
                value={filterDepartmentId}
                onChange={(e) => setFilterDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800"
              >
                <option value="all">Tất cả các tổ/bộ phận</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee / Author Filter */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Người phụ trách / Tác giả</label>
              <select
                value={filterAssigneeId}
                onChange={(e) => setFilterAssigneeId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800"
              >
                <option value="all">Tất cả nhân sự</option>
                {allUsersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Trạng thái xử lý</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="published">Đã công bố / Ban hành</option>
                <option value="draft">Bản nháp</option>
                <option value="pending_level_1">Chờ duyệt Cấp 1</option>
                <option value="pending_level_2">Chờ duyệt Cấp 2</option>
                <option value="in_progress">Đang thực hiện</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="overdue">Quá hạn</option>
                <option value="needs_addition">Yêu cầu bổ sung</option>
              </select>
            </div>

            {/* Date Presets */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mốc thời gian nhanh</label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setDatePreset('today')}
                  className="rounded bg-white border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('this_week')}
                  className="rounded bg-white border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  Tuần này
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('this_month')}
                  className="rounded bg-white border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  Tháng này
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('clear')}
                  className="rounded bg-white border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <span className="font-bold text-slate-700">Khoảng thời gian:</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Từ:</span>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
              />
              <span className="text-slate-500">Đến:</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tất cả ({totalResults})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'announcements' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Thông báo ({results.announcements.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'events' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Lịch công tác ({results.events.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'plans' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Kế hoạch ({results.plans.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'tasks' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Nhiệm vụ ({results.tasks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'reports' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Báo cáo ({results.reports.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'documents' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Văn bản ({results.documents.length})
        </button>
      </div>

      {/* Security Context Notice */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-600" />
          <span>
            Kết quả tìm kiếm hiển thị tương ứng với quyền của tài khoản:{' '}
            <strong className="text-slate-700">
              {currentUser?.fullName || 'Người dùng'} ({currentUser?.title || 'Cán bộ'})
            </strong>
          </span>
        </span>
        <span className="tabular-nums">Tìm thấy {totalResults} bản ghi</span>
      </div>

      {/* Results Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Đang tìm kiếm dữ liệu trên toàn hệ thống...</div>
        ) : totalResults === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 rounded-xl border border-slate-200 bg-white">
            {globalSearchQuery.trim() || hasActiveFilters
              ? `Không tìm thấy kết quả nào phù hợp với từ khóa "${globalSearchQuery}" và các bộ lọc đã chọn.`
              : 'Hãy nhập từ khóa để bắt đầu tra cứu.'}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Announcements Section */}
            {(activeTab === 'all' || activeTab === 'announcements') && results.announcements.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold text-slate-900">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span>Thông báo ({results.announcements.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {results.announcements.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => navigateTo('announcements', a.id)}
                      className="py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 hover:text-blue-700">{a.title}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{a.summary || a.content}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                            <span>Người đăng: {a.authorName}</span>
                            <span>·</span>
                            <span>{new Date(a.publishedAt || a.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            a.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {a.status === 'published' ? 'Đã công bố' : a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events Section */}
            {(activeTab === 'all' || activeTab === 'events') && results.events.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold text-slate-900">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span>Lịch công tác ({results.events.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {results.events.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => navigateTo('schedule', e.id)}
                      className="py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <h4 className="text-xs font-bold text-slate-900 hover:text-blue-700">{e.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                        <span className="tabular-nums font-medium text-slate-700">
                          {new Date(e.startDate).toLocaleDateString('vi-VN')} ({e.startTime} - {e.endTime})
                        </span>
                        <span>Địa điểm: {e.location}</span>
                        <span>Chủ trì: {e.hostName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plans Section */}
            {(activeTab === 'all' || activeTab === 'plans') && results.plans.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold text-slate-900">
                  <FileCheck2 className="h-4 w-4 text-amber-600" />
                  <span>Kế hoạch ({results.plans.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {results.plans.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigateTo('plans', p.id)}
                      className="py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                          {p.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 hover:text-blue-700">{p.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.basisAndGoals}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                        <span>Phụ trách: {p.responsiblePersonName}</span>
                        <span>·</span>
                        <span>Hạn: {new Date(p.endDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {(activeTab === 'all' || activeTab === 'tasks') && results.tasks.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold text-slate-900">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <span>Nhiệm vụ ({results.tasks.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {results.tasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigateTo('tasks', t.id)}
                      className="py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 hover:text-blue-700">{t.title}</h4>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span>Người thực hiện: <strong>{t.mainAssigneeName}</strong></span>
                          <span>Hạn: {new Date(t.deadline).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-blue-700 tabular-nums">{t.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reports Section */}
            {(activeTab === 'all' || activeTab === 'reports') && results.reports.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold text-slate-900">
                  <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                  <span>Báo cáo chuyên môn ({results.reports.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {results.reports.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => navigateTo('reports', r.id)}
                      className="py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 hover:text-blue-700">{r.title}</h4>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span>Kỳ: <strong>{r.period}</strong></span>
                          <span>Tác giả: {r.authorName}</span>
                          <span>Ngày gửi: {new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          r.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'needs_addition'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status === 'approved' ? 'Đã duyệt' : r.status === 'needs_addition' ? 'Cần bổ sung' : 'Chờ duyệt'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Section */}
            {(activeTab === 'all' || activeTab === 'documents') && results.documents.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold text-slate-900">
                  <FolderArchive className="h-4 w-4 text-indigo-600" />
                  <span>Văn bản & Hồ sơ ({results.documents.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {results.documents.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => navigateTo('documents', d.id)}
                      className="py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                          {d.codeNumber}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 hover:text-blue-700">{d.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{d.summary}</p>
                      <span className="text-[10px] text-slate-400">Người ký: {d.signer}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api.ts';
import { useAuth } from '../../../context/AuthContext.tsx';
import { useApp } from '../../../context/AppContext.tsx';
import type { Report, ReportType, ReportStatus, Attachment, TaskStatisticsReport, SchoolYear, SchoolLevelType } from '../../../types/database.ts';
import { Modal } from '../../common/Modal.tsx';
import { ExportModal } from '../../common/ExportModal.tsx';
import { PrintableDocument } from '../../common/PrintableDocument.tsx';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Download,
  Eye,
  Send,
  User,
  Calendar,
  BarChart3,
  FileText,
  TrendingUp,
  Building2,
  CheckSquare,
  Clock,
  AlertTriangle,
  RotateCcw,
  Layers,
  Filter,
} from 'lucide-react';

export const ReportList: React.FC = () => {
  const { currentUser, isPrincipal, isAdmin, isDean, isTeacher } = useAuth();
  const { showToast, departments, schoolSettings, targetEntityId, setTargetEntityId } = useApp();

  const [activeTab, setActiveTab] = useState<'documents' | 'statistics'>('documents');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Statistics State
  const [statsData, setStatsData] = useState<TaskStatisticsReport | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsSchoolYearId, setStatsSchoolYearId] = useState<string>('all');
  const [statsSchoolLevel, setStatsSchoolLevel] = useState<string>('all');
  const [statsDeptId, setStatsDeptId] = useState<string>('all');
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [statsBreakdownTab, setStatsBreakdownTab] = useState<'individual' | 'department' | 'school_level'>('individual');
  const [isStatsExportOpen, setIsStatsExportOpen] = useState(false);
  const [isStatsPrintOpen, setIsStatsPrintOpen] = useState(false);

  // Modals
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [reviewRemark, setReviewRemark] = useState('');

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ReportType>('weekly');
  const [formPeriod, setFormPeriod] = useState('Tuần 08 (12/10 - 18/10/2026)');
  const [formDeptId, setFormDeptId] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formResults, setFormResults] = useState('');
  const [formRate, setFormRate] = useState(100);
  const [formDifficulties, setFormDifficulties] = useState('');
  const [formSolutions, setFormSolutions] = useState('');
  const [formProofs, setFormProofs] = useState<Attachment[]>([]);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports();
      setReports(data);

      if (targetEntityId) {
        const found = data.find((r) => r.id === targetEntityId);
        if (found) {
          setSelectedReport(found);
          setTargetEntityId(null);
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    setLoadingStats(true);
    try {
      const [stats, syList] = await Promise.all([
        api.getTaskStatistics({
          schoolYearId: statsSchoolYearId,
          schoolLevel: statsSchoolLevel,
          departmentId: statsDeptId,
        }),
        api.getSchoolYears(),
      ]);
      setStatsData(stats);
      setSchoolYears(syList);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchStatistics();
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab, statsSchoolYearId, statsSchoolLevel, statsDeptId]);

  const handleOpenCreate = () => {
    setFormTitle('');
    setFormType('weekly');
    setFormPeriod('Tuần 08 (12/10 - 18/10/2026)');
    setFormDeptId(currentUser?.departmentId || 'dept-toan-tin');
    setFormContent('');
    setFormResults('');
    setFormRate(100);
    setFormDifficulties('');
    setFormSolutions('');
    setFormProofs([]);
    setIsFormOpen(true);
  };

  const handleUploadProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingProof(true);
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const uploaded = await api.uploadFile({
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          data: reader.result as string,
        });
        setFormProofs((prev) => [...prev, uploaded]);
        showToast(`Đã đính kèm minh chứng ${file.name}`);
      } catch (err: any) {
        showToast(err.message, 'error');
      } finally {
        setUploadingProof(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim() || !formResults.trim()) {
      showToast('Vui lòng điền tiêu đề, nội dung đã thực hiện và kết quả đạt được', 'error');
      return;
    }

    setSaving(true);
    try {
      const created = await api.createReport({
        title: formTitle.trim(),
        type: formType,
        period: formPeriod.trim(),
        departmentId: formDeptId || undefined,
        executedContent: formContent.trim(),
        achievedResults: formResults.trim(),
        completionRate: Number(formRate),
        difficultiesAndCauses: formDifficulties.trim(),
        upcomingSolutions: formSolutions.trim(),
        proofs: formProofs,
        status: 'submitted',
      });
      setReports((prev) => [created, ...prev]);
      showToast('Đã gửi báo cáo lên Ban Giám hiệu thành công');
      setIsFormOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewDecision = async (action: 'approve' | 'needs_addition') => {
    if (!selectedReport) return;
    try {
      const updated = await api.reviewReport(selectedReport.id, action, reviewRemark.trim());
      setSelectedReport(updated);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(action === 'approve' ? 'Đã phê duyệt báo cáo' : 'Đã yêu cầu bổ sung số liệu');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.period.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType = typeFilter === 'all' || r.type === typeFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchSearch && matchType && matchStatus;
  });

  const getTypeLabel = (t: ReportType) => {
    switch (t) {
      case 'weekly':
        return 'Báo cáo Tuần';
      case 'monthly':
        return 'Báo cáo Tháng';
      case 'semester':
        return 'Báo cáo Học kỳ';
      case 'year':
        return 'Báo cáo Năm học';
      case 'plan':
        return 'Theo Kế hoạch';
      default:
        return 'Theo Nhiệm vụ';
    }
  };

  const getStatusBadge = (st: ReportStatus) => {
    switch (st) {
      case 'approved':
        return <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Đã phê duyệt</span>;
      case 'needs_addition':
        return <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Yêu cầu bổ sung</span>;
      default:
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Chờ BGH duyệt</span>;
    }
  };

  // Export Data
  // Export Data for Documents
  const exportHeaders = ['STT', 'Tiêu đề báo cáo', 'Loại', 'Kỳ báo cáo', 'Tổ / Đơn vị', 'Người lập', 'Tỷ lệ HT (%)', 'Trạng thái'];
  const exportRows = filteredReports.map((r, i) => [
    i + 1,
    r.title,
    getTypeLabel(r.type),
    r.period,
    departments.find((d) => d.id === r.departmentId)?.name || 'Trường học',
    r.authorName,
    r.completionRate,
    r.status === 'approved' ? 'Đã duyệt' : r.status,
  ]);

  // Export Data for Statistics
  const statsExportHeaders = [
    'STT',
    'Họ và tên',
    'Chức vụ',
    'Tổ bộ môn',
    'Tổng nhiệm vụ',
    'Đã hoàn thành',
    'Đang thực hiện',
    'Chờ xác nhận',
    'Cần bổ sung',
    'Quá hạn',
    'Tỷ lệ hoàn thành (%)',
  ];
  const statsExportRows = (statsData?.byIndividual || []).map((ind, i) => [
    i + 1,
    ind.fullName,
    ind.title,
    ind.departmentName || 'Chung',
    ind.totalTasks,
    ind.completedTasks,
    ind.inProgressTasks,
    ind.pendingVerificationTasks,
    ind.needsAdditionTasks,
    ind.overdueTasks,
    `${ind.completionRate}%`,
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header & Fast View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Báo Cáo Tiến Độ & Thống Kê Nhiệm Vụ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu số thực tế được đồng bộ từ Supabase: theo tuần, tháng, học kỳ, cá nhân, tổ bộ môn và toàn trường
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'documents' && (
            <>
              <button
                type="button"
                onClick={() => setIsExportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>

              {(isPrincipal || isAdmin || isDean || isTeacher) && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Gửi báo cáo mới</span>
                </button>
              )}
            </>
          )}

          {activeTab === 'statistics' && (
            <>
              <button
                type="button"
                onClick={() => setIsStatsPrintOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
              >
                <Printer className="h-4 w-4 text-slate-600" />
                <span>In báo cáo</span>
              </button>
              <button
                type="button"
                onClick={() => setIsStatsExportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 shadow-xs"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'documents'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Văn Bản Báo Cáo Định Kỳ ({reports.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('statistics')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'statistics'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Bảng Thống Kê & Phân Tích Tiến Độ</span>
        </button>
      </div>

      {/* VIEW 1: DOCUMENTS & WRITTEN REPORTS */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tiêu đề, người lập, kỳ báo cáo..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Tất cả kỳ báo cáo</option>
                <option value="weekly">Báo cáo tuần</option>
                <option value="monthly">Báo cáo tháng</option>
                <option value="semester">Báo cáo học kỳ</option>
                <option value="year">Báo cáo năm học</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="submitted">Chờ duyệt</option>
                <option value="approved">Đã phê duyệt</option>
                <option value="needs_addition">Yêu cầu bổ sung</option>
              </select>
            </div>
          </div>

          {/* Reports List */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Đang tải danh sách báo cáo...</div>
            ) : filteredReports.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Không tìm thấy báo cáo nào phù hợp.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredReports.map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                          {getTypeLabel(rep.type)}
                        </span>
                        <span className="font-semibold text-xs text-slate-700">
                          {rep.period}
                        </span>
                        {getStatusBadge(rep.status)}
                        <span className="text-xs font-bold text-emerald-700 tabular-nums">
                          Đạt {rep.completionRate}%
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 hover:text-blue-700">
                        {rep.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {rep.executedContent}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-0.5">
                        <span>Người gửi: <strong className="text-slate-700">{rep.authorName}</strong></span>
                        <span>·</span>
                        <span>Tổ: <strong>{departments.find((d) => d.id === rep.departmentId)?.name || 'Văn phòng'}</strong></span>
                        <span>·</span>
                        <span className="tabular-nums">
                          Ngày gửi: {new Date(rep.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                        {rep.proofs?.length > 0 && (
                          <span className="flex items-center gap-1 font-medium text-blue-700">
                            <Paperclip className="h-3 w-3" />
                            <span>{rep.proofs.length} minh chứng đính kèm</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReport(rep);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-slate-50"
                      >
                        Xem chi tiết / Duyệt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: REAL-TIME STATISTICS & DATA ANALYTICS */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {/* Top Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-blue-600" />
                <span>Bộ lọc phân tích:</span>
              </span>

              {/* School Year Filter */}
              <select
                value={statsSchoolYearId}
                onChange={(e) => setStatsSchoolYearId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Tất cả năm học</option>
                {schoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    Năm học {sy.name} {sy.isCurrent ? '★' : ''}
                  </option>
                ))}
              </select>

              {/* School Level Filter */}
              <select
                value={statsSchoolLevel}
                onChange={(e) => setStatsSchoolLevel(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Toàn trường / Cả 2 cấp</option>
                <option value="primary">Cấp Tiểu học (Khối 1 - 5)</option>
                <option value="secondary">Cấp THCS (Khối 6 - 9)</option>
              </select>

              {/* Department Filter */}
              <select
                value={statsDeptId}
                onChange={(e) => setStatsDeptId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Tất cả tổ / bộ phận</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Nguồn dữ liệu: <strong className="text-emerald-700">Thời gian thực (Supabase)</strong>
            </div>
          </div>

          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* 1. Tổng nhiệm vụ */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Tổng nhiệm vụ</span>
              <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {statsData?.summary.totalTasks || 0}
              </p>
              <span className="text-[10px] text-slate-400">Đã giao</span>
            </div>

            {/* 2. Hoàn thành */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-emerald-700 block">Đã hoàn thành</span>
              <p className="text-xl font-bold text-emerald-800 mt-1 tabular-nums">
                {statsData?.summary.completedTasks || 0}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold">Đã nghiệm thu</span>
            </div>

            {/* 3. Đang thực hiện */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-blue-700 block">Đang thực hiện</span>
              <p className="text-xl font-bold text-blue-800 mt-1 tabular-nums">
                {statsData?.summary.inProgressTasks || 0}
              </p>
              <span className="text-[10px] text-blue-600">Đang triển khai</span>
            </div>

            {/* 4. Chờ xác nhận */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-amber-700 block">Chờ xác nhận</span>
              <p className="text-xl font-bold text-amber-800 mt-1 tabular-nums">
                {statsData?.summary.pendingVerificationTasks || 0}
              </p>
              <span className="text-[10px] text-amber-600 font-semibold">Cần BGH duyệt</span>
            </div>

            {/* 5. Cần bổ sung */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-purple-700 block">Cần bổ sung</span>
              <p className="text-xl font-bold text-purple-800 mt-1 tabular-nums">
                {statsData?.summary.needsAdditionTasks || 0}
              </p>
              <span className="text-[10px] text-purple-600">Bị trả lại</span>
            </div>

            {/* 6. Quá hạn */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-rose-700 block">Quá hạn</span>
              <p className="text-xl font-bold text-rose-800 mt-1 tabular-nums">
                {statsData?.summary.overdueTasks || 0}
              </p>
              <span className="text-[10px] text-rose-600 font-bold">Cần đôn đốc</span>
            </div>

            {/* 7. Tỷ lệ hoàn thành */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-teal-700 block">Tỷ lệ hoàn thành</span>
              <p className="text-xl font-bold text-teal-800 mt-1 tabular-nums">
                {statsData?.summary.overallCompletionRate || 0}%
              </p>
              <span className="text-[10px] text-teal-600 font-medium">Toàn trường</span>
            </div>
          </div>

          {/* Breakdown Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setStatsBreakdownTab('individual')}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold transition-colors ${
                statsBreakdownTab === 'individual'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Thống kê theo Cán bộ / Giáo viên ({(statsData?.byIndividual || []).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatsBreakdownTab('department')}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold transition-colors ${
                statsBreakdownTab === 'department'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Thống kê theo Tổ / Bộ phận ({(statsData?.byDepartment || []).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatsBreakdownTab('school_level')}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold transition-colors ${
                statsBreakdownTab === 'school_level'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Thống kê theo Cấp học & Toàn trường</span>
            </button>
          </div>

          {/* TABLE 1: BY INDIVIDUAL */}
          {statsBreakdownTab === 'individual' && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase">
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Cán bộ / Giáo viên</th>
                    <th className="py-2.5 px-3">Tổ bộ môn</th>
                    <th className="py-2.5 px-3 text-center">Tổng số</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Hoàn thành</th>
                    <th className="py-2.5 px-3 text-center text-blue-700">Đang làm</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">Chờ duyệt</th>
                    <th className="py-2.5 px-3 text-center text-purple-700">Cần bổ sung</th>
                    <th className="py-2.5 px-3 text-center text-rose-700">Quá hạn</th>
                    <th className="py-2.5 px-3 text-right">Tỷ lệ hoàn thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(statsData?.byIndividual || []).map((ind, idx) => (
                    <tr key={ind.userId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{ind.fullName}</p>
                        <p className="text-[10px] text-slate-400">{ind.title}</p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {ind.departmentName || 'Chung'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums">
                        {ind.totalTasks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700 tabular-nums">
                        {ind.completedTasks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-blue-700 tabular-nums">
                        {ind.inProgressTasks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-amber-700 tabular-nums">
                        {ind.pendingVerificationTasks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-purple-700 tabular-nums">
                        {ind.needsAdditionTasks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600 tabular-nums">
                        {ind.overdueTasks}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600"
                              style={{ width: `${ind.completionRate}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 tabular-nums text-xs">
                            {ind.completionRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE 2: BY DEPARTMENT */}
          {statsBreakdownTab === 'department' && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase">
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Tổ chuyên môn / Bộ phận</th>
                    <th className="py-2.5 px-3">Mã tổ</th>
                    <th className="py-2.5 px-3 text-center">Số thành viên</th>
                    <th className="py-2.5 px-3 text-center">Tổng nhiệm vụ</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Đã hoàn thành</th>
                    <th className="py-2.5 px-3 text-center text-blue-700">Đang thực hiện</th>
                    <th className="py-2.5 px-3 text-center text-rose-700">Quá hạn</th>
                    <th className="py-2.5 px-3 text-right">Tỷ lệ hoàn thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(statsData?.byDepartment || []).map((dep, idx) => (
                    <tr key={dep.departmentId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{dep.departmentName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{dep.departmentCode}</td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-700 tabular-nums">
                        {dep.memberCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums">
                        {dep.totalTasks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700 tabular-nums">
                        {dep.completedTasks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-blue-700 tabular-nums">
                        {dep.inProgressTasks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600 tabular-nums">
                        {dep.overdueTasks}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600"
                              style={{ width: `${dep.completionRate}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 tabular-nums text-xs">
                            {dep.completionRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE 3: BY SCHOOL LEVEL */}
          {statsBreakdownTab === 'school_level' && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase">
                    <th className="py-2.5 px-3">Cấp học áp dụng</th>
                    <th className="py-2.5 px-3 text-center">Tổng số nhiệm vụ</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Đã hoàn thành</th>
                    <th className="py-2.5 px-3 text-center text-blue-700">Đang thực hiện</th>
                    <th className="py-2.5 px-3 text-center text-rose-700">Quá hạn</th>
                    <th className="py-2.5 px-3 text-right">Tỷ lệ hoàn thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(statsData?.bySchoolLevel || []).map((lvl) => (
                    <tr key={lvl.level} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          lvl.level === 'primary' ? 'bg-sky-500' : lvl.level === 'secondary' ? 'bg-indigo-500' : 'bg-slate-500'
                        }`} />
                        <span>{lvl.levelName}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 tabular-nums">
                        {lvl.totalTasks}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700 tabular-nums">
                        {lvl.completedTasks}
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-blue-700 tabular-nums">
                        {lvl.inProgressTasks}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600 tabular-nums">
                        {lvl.overdueTasks}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600"
                              style={{ width: `${lvl.completionRate}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 tabular-nums text-sm">
                            {lvl.completionRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* REPORT DETAIL MODAL */}
      <Modal
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title={selectedReport?.title || 'Chi tiết báo cáo'}
        subtitle={`Kỳ: ${selectedReport?.period} · Người lập: ${selectedReport?.authorName}`}
        maxWidth="4xl"
        actions={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              In mẫu hành chính
            </button>
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedReport && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Trạng thái:</span>
                <p className="font-bold text-slate-900">{getStatusBadge(selectedReport.status)}</p>
              </div>
              <div>
                <span className="text-slate-500">Mức độ hoàn thành:</span>
                <p className="font-bold text-emerald-700 tabular-nums text-sm">
                  {selectedReport.completionRate}%
                </p>
              </div>
              <div>
                <span className="text-slate-500">Người lập biểu:</span>
                <p className="font-bold text-slate-900">{selectedReport.authorName}</p>
              </div>
              {selectedReport.reviewedByName && (
                <div>
                  <span className="text-slate-500">Người phê duyệt:</span>
                  <p className="font-bold text-slate-900">{selectedReport.reviewedByName}</p>
                </div>
              )}
            </div>

            <div>
              <span className="font-bold text-slate-900 uppercase">1. Nội dung công việc đã thực hiện:</span>
              <p className="mt-1 leading-relaxed text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                {selectedReport.executedContent}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 uppercase">2. Kết quả đạt được & Chỉ tiêu:</span>
              <p className="mt-1 leading-relaxed text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                {selectedReport.achievedResults}
              </p>
            </div>

            {selectedReport.difficultiesAndCauses && (
              <div>
                <span className="font-bold text-slate-900 uppercase">3. Khó khăn, vướng mắc & Nguyên nhân:</span>
                <p className="mt-1 leading-relaxed text-slate-800 p-2.5 rounded bg-amber-50/50 border border-amber-200">
                  {selectedReport.difficultiesAndCauses}
                </p>
              </div>
            )}

            {selectedReport.upcomingSolutions && (
              <div>
                <span className="font-bold text-slate-900 uppercase">4. Đề xuất giải pháp & Nhiệm vụ tiếp theo:</span>
                <p className="mt-1 leading-relaxed text-slate-800 p-2.5 rounded bg-blue-50/40 border border-blue-200">
                  {selectedReport.upcomingSolutions}
                </p>
              </div>
            )}

            {/* Proofs */}
            {selectedReport.proofs?.length > 0 && (
              <div className="border-t border-slate-200 pt-3">
                <p className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-blue-600" />
                  Minh chứng kèm theo ({selectedReport.proofs.length}):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedReport.proofs.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <span className="truncate pr-2 font-medium text-slate-700">{att.name}</span>
                      <a
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline shrink-0 text-xs"
                      >
                        Tải về
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Comment if present */}
            {selectedReport.reviewComment && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950">
                <span className="font-bold">Ý kiến đánh giá của Ban Giám hiệu:</span>
                <p className="mt-1">{selectedReport.reviewComment}</p>
              </div>
            )}

            {/* Principal Review Action Form */}
            {(isPrincipal || isAdmin) && selectedReport.status !== 'approved' && (
              <div className="border-t border-slate-200 pt-3 bg-slate-50 p-3 rounded-lg space-y-2">
                <label className="block font-bold text-slate-900">
                  Nhận xét & Ý kiến chỉ đạo của Ban Giám hiệu:
                </label>
                <textarea
                  rows={2}
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
                  placeholder="Ghi nhận kết quả của tổ, yêu cầu giải trình số liệu hoặc bổ sung..."
                  className="w-full rounded border border-slate-300 bg-white p-2 text-slate-900"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleReviewDecision('needs_addition')}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Yêu cầu bổ sung
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewDecision('approve')}
                    className="rounded-lg bg-emerald-600 px-3.5 py-1.5 font-semibold text-white hover:bg-emerald-500 shadow-xs"
                  >
                    Phê duyệt báo cáo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* CREATE REPORT MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Lập và gửi báo cáo kết quả hoạt động"
        subtitle="Báo cáo được lưu trữ chính thống và gửi trực tiếp đến Ban Giám hiệu"
        maxWidth="4xl"
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveReport}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
            >
              {saving ? 'Đang gửi...' : 'Gửi báo cáo lên Ban Giám hiệu'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveReport} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tiêu đề báo cáo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="VD: Báo cáo công tác chuyên môn Tuần 08 - Tổ Toán - Tin học"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Kỳ báo cáo
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="weekly">Báo cáo tuần</option>
                <option value="monthly">Báo cáo tháng</option>
                <option value="semester">Báo cáo học kỳ</option>
                <option value="year">Báo cáo năm học</option>
                <option value="plan">Báo cáo theo kế hoạch</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Khoảng thời gian (Tuần / Tháng)
              </label>
              <input
                type="text"
                value={formPeriod}
                onChange={(e) => setFormPeriod(e.target.value)}
                placeholder="VD: Tuần 08 (12/10 - 18/10/2026)"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Đánh giá mức độ hoàn thành (%): {formRate}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formRate}
                onChange={(e) => setFormRate(Number(e.target.value))}
                className="w-full accent-blue-600 mt-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              1. Nội dung công việc đã thực hiện <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Tập trung nêu các hoạt động giảng dạy, thao giảng, hội họp, thực hành..."
              required
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              2. Kết quả đạt được & Số liệu cụ thể <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={formResults}
              onChange={(e) => setFormResults(e.target.value)}
              placeholder="Nêu số liệu thực tế: số tiết dạy, xếp loại giờ dạy, số học sinh đạt giải..."
              required
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                3. Khó khăn, vướng mắc & Nguyên nhân
              </label>
              <textarea
                rows={2}
                value={formDifficulties}
                onChange={(e) => setFormDifficulties(e.target.value)}
                placeholder="Các vấn đề phát sinh về cơ sở vật chất, đường truyền, sĩ số..."
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                4. Đề xuất giải pháp & Trọng tâm tuần tới
              </label>
              <textarea
                rows={2}
                value={formSolutions}
                onChange={(e) => setFormSolutions(e.target.value)}
                placeholder="Kiến nghị Ban Giám hiệu, kế hoạch bù giờ, nâng cấp..."
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-900"
              />
            </div>
          </div>

          {/* Proof Attachments */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900">
                Tệp minh chứng kèm theo (Bảng tổng hợp điểm, biên bản, hình ảnh):
              </span>
              <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />
                <span>{uploadingProof ? 'Đang tải...' : 'Thêm minh chứng'}</span>
                <input
                  type="file"
                  onChange={handleUploadProof}
                  disabled={uploadingProof}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                />
              </label>
            </div>

            {formProofs.length > 0 && (
              <div className="space-y-1">
                {formProofs.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200"
                  >
                    <span className="truncate pr-2 font-medium text-slate-800">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => setFormProofs(formProofs.filter((x) => x.id !== p.id))}
                      className="text-rose-600 hover:text-rose-800 text-[11px]"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* PRINT PREVIEW MODAL */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Mẫu In Báo Cáo Chuẩn Hành Chính"
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
        {selectedReport && (
          <PrintableDocument
            docCode={`Số: ... /BC-${schoolSettings?.shortName?.replace(/\s+/g, '') || 'THPT'}`}
            title={selectedReport.title}
            subtitle={selectedReport.period}
            signerTitle="NGƯỜI LẬP BIỂU"
            signerName={selectedReport.authorName}
          >
            <div className="space-y-4 my-6 text-sm font-serif">
              <div>
                <p className="font-bold uppercase">I. NỘI DUNG CÔNG VIỆC ĐÃ THỰC HIỆN:</p>
                <p className="mt-1 leading-relaxed pl-4">{selectedReport.executedContent}</p>
              </div>

              <div>
                <p className="font-bold uppercase">II. KẾT QUẢ ĐẠT ĐƯỢC:</p>
                <p className="mt-1 leading-relaxed pl-4">{selectedReport.achievedResults}</p>
                <p className="mt-1 font-bold pl-4">Đánh giá tỷ lệ hoàn thành: {selectedReport.completionRate}%</p>
              </div>

              {selectedReport.difficultiesAndCauses && (
                <div>
                  <p className="font-bold uppercase">III. KHÓ KHĂN & VƯỚNG MẮC:</p>
                  <p className="mt-1 leading-relaxed pl-4">{selectedReport.difficultiesAndCauses}</p>
                </div>
              )}

              {selectedReport.upcomingSolutions && (
                <div>
                  <p className="font-bold uppercase">IV. ĐỀ XUẤT KIẾN NGHỊ:</p>
                  <p className="mt-1 leading-relaxed pl-4">{selectedReport.upcomingSolutions}</p>
                </div>
              )}
            </div>
          </PrintableDocument>
        )}
      </Modal>

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Xuất bảng tổng hợp báo cáo"
        filename={`Bao_cao_tong_hop_${new Date().toISOString().split('T')[0]}`}
        headers={exportHeaders}
        rows={exportRows}
      />
      {/* EXPORT MODAL FOR STATS */}
      <ExportModal
        isOpen={isStatsExportOpen}
        onClose={() => setIsStatsExportOpen(false)}
        title="Xuất bảng thống kê tiến độ nhiệm vụ"
        filename={`Thong_ke_nhiem_vu_${new Date().toISOString().split('T')[0]}`}
        headers={statsExportHeaders}
        rows={statsExportRows}
      />

      {/* PRINT MODAL FOR STATS */}
      <Modal
        isOpen={isStatsPrintOpen}
        onClose={() => setIsStatsPrintOpen(false)}
        title="Mẫu In Báo Cáo Thống Kê Tiến Độ Nhiệm Vụ"
        maxWidth="5xl"
        actions={
          <button
            type="button"
            onClick={() => setIsStatsPrintOpen(false)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Đóng
          </button>
        }
      >
        <PrintableDocument
          docCode={`Số: ... /BC-TK-${schoolSettings?.shortName?.replace(/\s+/g, '') || 'TH&THCS'}`}
          title="BÁO CÁO THỐNG KÊ TIẾN ĐỘ THỰC HIỆN NHIỆM VỤ"
          subtitle={`Năm học: ${schoolYears.find((sy) => sy.id === statsSchoolYearId)?.name || 'Hiện hành'} · Kỳ báo cáo: ${schoolSettings?.currentSemester || 'Học kỳ I'}`}
          signerTitle="HIỆU TRƯỞNG"
          signerName={schoolSettings?.principalName || 'Ban Giám Hiệu'}
        >
          <div className="space-y-5 my-6 text-xs font-serif text-slate-900">
            {/* I. Overview */}
            <div>
              <p className="font-bold text-sm uppercase mb-2">I. TỔNG QUAN TIẾN ĐỘ TOÀN TRƯỜNG:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-slate-300 p-3 bg-slate-50/50">
                <div>
                  <span className="text-slate-600 block">Tổng nhiệm vụ:</span>
                  <strong className="text-base">{statsData?.summary.totalTasks || 0}</strong>
                </div>
                <div>
                  <span className="text-slate-600 block">Đã hoàn thành:</span>
                  <strong className="text-base text-emerald-800">{statsData?.summary.completedTasks || 0}</strong>
                </div>
                <div>
                  <span className="text-slate-600 block">Đang thực hiện:</span>
                  <strong className="text-base text-blue-800">{statsData?.summary.inProgressTasks || 0}</strong>
                </div>
                <div>
                  <span className="text-slate-600 block">Quá hạn:</span>
                  <strong className="text-base text-rose-800">{statsData?.summary.overdueTasks || 0}</strong>
                </div>
              </div>
              <p className="mt-2 text-right font-bold text-sm">
                Tỷ lệ hoàn thành nhiệm vụ toàn trường: {statsData?.summary.overallCompletionRate || 0}%
              </p>
            </div>

            {/* II. Department Breakdown */}
            <div>
              <p className="font-bold text-sm uppercase mb-2">II. KẾT QUẢ THEO CÁC TỔ CHUYÊN MÔN / BỘ PHẬN:</p>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold">
                    <th className="border border-slate-300 p-2">Tổ chuyên môn</th>
                    <th className="border border-slate-300 p-2">Tổng số</th>
                    <th className="border border-slate-300 p-2">Hoàn thành</th>
                    <th className="border border-slate-300 p-2">Đang làm</th>
                    <th className="border border-slate-300 p-2">Quá hạn</th>
                    <th className="border border-slate-300 p-2">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {(statsData?.byDepartment || []).map((d) => (
                    <tr key={d.departmentId} className="text-center">
                      <td className="border border-slate-300 p-2 text-left font-bold">{d.departmentName}</td>
                      <td className="border border-slate-300 p-2">{d.totalTasks}</td>
                      <td className="border border-slate-300 p-2 font-bold text-emerald-800">{d.completedTasks}</td>
                      <td className="border border-slate-300 p-2">{d.inProgressTasks}</td>
                      <td className="border border-slate-300 p-2 font-bold text-rose-800">{d.overdueTasks}</td>
                      <td className="border border-slate-300 p-2 font-bold">{d.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* III. School Level Breakdown */}
            <div>
              <p className="font-bold text-sm uppercase mb-2">III. KẾT QUẢ THEO CẤP HỌC:</p>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold">
                    <th className="border border-slate-300 p-2">Cấp học</th>
                    <th className="border border-slate-300 p-2">Tổng nhiệm vụ</th>
                    <th className="border border-slate-300 p-2">Hoàn thành</th>
                    <th className="border border-slate-300 p-2">Đang làm</th>
                    <th className="border border-slate-300 p-2">Quá hạn</th>
                    <th className="border border-slate-300 p-2">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {(statsData?.bySchoolLevel || []).map((l) => (
                    <tr key={l.level} className="text-center">
                      <td className="border border-slate-300 p-2 text-left font-bold">{l.levelName}</td>
                      <td className="border border-slate-300 p-2">{l.totalTasks}</td>
                      <td className="border border-slate-300 p-2 font-bold text-emerald-800">{l.completedTasks}</td>
                      <td className="border border-slate-300 p-2">{l.inProgressTasks}</td>
                      <td className="border border-slate-300 p-2 font-bold text-rose-800">{l.overdueTasks}</td>
                      <td className="border border-slate-300 p-2 font-bold">{l.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </PrintableDocument>
      </Modal>
    </div>
  );
};

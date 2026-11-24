import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api.ts';
import { useAuth } from '../../../context/AuthContext.tsx';
import { useApp } from '../../../context/AppContext.tsx';
import type { Plan, PlanType, PlanStatus, Attachment } from '../../../types/database.ts';
import { Modal } from '../../common/Modal.tsx';
import { ConfirmDialog } from '../../common/ConfirmDialog.tsx';
import { ExportModal } from '../../common/ExportModal.tsx';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  History,
  FileSpreadsheet,
  ArrowRight,
  Send,
  Eye,
  AlertCircle,
  DollarSign,
  Building,
  User,
  Paperclip,
  Edit,
} from 'lucide-react';

export const PlanList: React.FC = () => {
  const { currentUser, isPrincipal, isAdmin, isDean, isTeacher } = useAuth();
  const { showToast, departments, navigateTo, targetEntityId, setTargetEntityId } = useApp();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [approvalModalPlan, setApprovalModalPlan] = useState<Plan | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<PlanType>('month');
  const [formParentPlanId, setFormParentPlanId] = useState('');
  const [formBasis, setFormBasis] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formLeadDept, setFormLeadDept] = useState('');
  const [formCoDepts, setFormCoDepts] = useState<string[]>([]);
  const [formTargets, setFormTargets] = useState('');
  const [formBudget, setFormBudget] = useState<number | ''>('');
  const [formProofReq, setFormProofReq] = useState('');
  const [formStatus, setFormStatus] = useState<PlanStatus>('draft');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await api.getPlans();
      setPlans(data);

      if (targetEntityId) {
        const found = data.find((p) => p.id === targetEntityId);
        if (found) {
          setSelectedPlan(found);
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
    fetchPlans();
  }, [currentUser]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormCode(`KH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setFormTitle('');
    setFormType('month');
    setFormParentPlanId('');
    setFormBasis('');
    setFormContent('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    setFormEndDate(endDate.toISOString().split('T')[0]);
    setFormLeadDept(currentUser?.departmentId || 'dept-bgh');
    setFormCoDepts([]);
    setFormTargets('');
    setFormBudget('');
    setFormProofReq('');
    setFormStatus(isPrincipal || isAdmin ? 'approved' : 'draft');
    setEditReason('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormCode(plan.code);
    setFormTitle(plan.title);
    setFormType(plan.type);
    setFormParentPlanId(plan.parentPlanId || '');
    setFormBasis(plan.basisAndGoals);
    setFormContent(plan.content);
    setFormStartDate(plan.startDate);
    setFormEndDate(plan.endDate);
    setFormLeadDept(plan.leadDepartmentId);
    setFormCoDepts(plan.coDepartmentIds || []);
    setFormTargets(plan.expectedTargets);
    setFormBudget(plan.expectedBudget || '');
    setFormProofReq(plan.requiredProofDescription || '');
    setFormStatus(plan.status);
    setEditReason('');
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStartDate || !formEndDate) {
      showToast('Vui lòng điền tiêu đề kế hoạch và khoảng thời gian thực hiện', 'error');
      return;
    }

    if (editingPlan && (editingPlan.status === 'approved' || editingPlan.status === 'in_progress') && !editReason.trim()) {
      showToast('Kế hoạch đã được phê duyệt. Vui lòng ghi rõ lý do điều chỉnh để lưu vết phiên bản.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Plan> & { editReason?: string } = {
        code: formCode.trim(),
        title: formTitle.trim(),
        type: formType,
        parentPlanId: formParentPlanId || undefined,
        basisAndGoals: formBasis.trim(),
        content: formContent.trim(),
        startDate: formStartDate,
        endDate: formEndDate,
        leadDepartmentId: formLeadDept || 'dept-bgh',
        coDepartmentIds: formCoDepts,
        expectedTargets: formTargets.trim(),
        expectedBudget: formBudget ? Number(formBudget) : undefined,
        requiredProofDescription: formProofReq.trim(),
        status: formStatus,
        editReason: editReason.trim(),
      };

      if (editingPlan) {
        const updated = await api.updatePlan(editingPlan.id, payload);
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast('Cập nhật kế hoạch và lưu nhật ký phiên bản thành công');
      } else {
        const created = await api.createPlan(payload);
        setPlans((prev) => [created, ...prev]);
        showToast('Tạo kế hoạch mới thành công');
      }

      setIsFormOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!approvalModalPlan) return;
    try {
      const updated = await api.approvalPlan(
        approvalModalPlan.id,
        approvalAction,
        approvalComment.trim()
      );
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast(
        approvalAction === 'approve'
          ? 'Đã phê duyệt kế hoạch thành công'
          : 'Đã trả lại kế hoạch kèm ý kiến điều chỉnh'
      );
      setApprovalModalPlan(null);
      if (selectedPlan?.id === updated.id) {
        setSelectedPlan(updated);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredPlans = plans.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.responsiblePersonName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType = selectedType === 'all' || p.type === selectedType;
    const matchStatus = selectedStatus === 'all' || p.status === selectedStatus;

    return matchSearch && matchType && matchStatus;
  });

  const getTypeLabel = (t: PlanType) => {
    switch (t) {
      case 'year':
        return 'Năm học';
      case 'month':
        return 'Tháng';
      case 'week':
        return 'Tuần';
      case 'academic':
        return 'Chuyên môn';
      case 'department':
        return 'Tổ bộ môn';
      case 'event':
        return 'Hội thi / Sự kiện';
      case 'inspection':
        return 'Kiểm tra đánh giá';
      case 'digital_transformation':
        return 'Chuyển đổi số';
      default:
        return t;
    }
  };

  const getStatusBadge = (st: PlanStatus) => {
    switch (st) {
      case 'approved':
        return <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Đã phê duyệt</span>;
      case 'pending':
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Chờ BGH duyệt</span>;
      case 'needs_revision':
        return <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Cần chỉnh sửa</span>;
      case 'in_progress':
        return <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">Đang triển khai</span>;
      case 'completed':
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800">Đã hoàn thành</span>;
      case 'paused':
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Tạm dừng</span>;
      default:
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Bản nháp</span>;
    }
  };

  // Export Data
  const exportHeaders = ['Mã KH', 'Tên kế hoạch', 'Nhóm', 'Thời gian', 'Đơn vị chủ trì', 'Phụ trách', 'Trạng thái', 'Kinh phí'];
  const exportRows = filteredPlans.map((p) => [
    p.code,
    p.title,
    getTypeLabel(p.type),
    `${p.startDate} -> ${p.endDate}`,
    departments.find((d) => d.id === p.leadDepartmentId)?.name || 'Ban Giám hiệu',
    p.responsiblePersonName,
    p.status,
    p.expectedBudget ? `${p.expectedBudget.toLocaleString('vi-VN')} đ` : '0 đ',
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản Lý Kế Hoạch Năm, Tháng, Tuần
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hệ thống phân cấp kế hoạch giáo dục: Năm học → Tháng → Tuần → Nhiệm vụ cụ thể
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Xuất dữ liệu</span>
          </button>

          {(isPrincipal || isAdmin || isDean) && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Lập kế hoạch mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã kế hoạch, tên kế hoạch, người phụ trách..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">Tất cả nhóm kế hoạch</option>
            <option value="year">Kế hoạch năm học</option>
            <option value="month">Kế hoạch tháng</option>
            <option value="week">Kế hoạch tuần</option>
            <option value="academic">Kế hoạch chuyên môn</option>
            <option value="department">Kế hoạch tổ / bộ phận</option>
            <option value="event">Hội thi / Sự kiện</option>
            <option value="digital_transformation">Chuyển đổi số</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ phê duyệt</option>
            <option value="approved">Đã phê duyệt</option>
            <option value="in_progress">Đang thực hiện</option>
            <option value="needs_revision">Cần chỉnh sửa</option>
            <option value="draft">Bản nháp</option>
          </select>
        </div>
      </div>

      {/* Plans List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Đang tải danh sách kế hoạch...</div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Không tìm thấy kế hoạch nào phù hợp.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div
                  onClick={() => setSelectedPlan(plan)}
                  className="flex-1 cursor-pointer space-y-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {plan.code}
                    </span>
                    {getStatusBadge(plan.status)}
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      {getTypeLabel(plan.type)}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {new Date(plan.startDate).toLocaleDateString('vi-VN')} → {new Date(plan.endDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 hover:text-blue-700 transition-colors">
                    {plan.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {plan.basisAndGoals || plan.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>
                      Chủ trì: <strong>{departments.find((d) => d.id === plan.leadDepartmentId)?.name || 'Ban Giám hiệu'}</strong>
                    </span>
                    <span>·</span>
                    <span>Người phụ trách: <strong>{plan.responsiblePersonName}</strong></span>
                    {plan.expectedBudget && (
                      <>
                        <span>·</span>
                        <span className="font-bold text-emerald-700 tabular-nums">
                          Kinh phí: {plan.expectedBudget.toLocaleString('vi-VN')} đ
                        </span>
                      </>
                    )}
                    {plan.versions?.length > 1 && (
                      <span className="flex items-center gap-1 text-slate-600 font-semibold">
                        <History className="h-3 w-3" />
                        <span>Phiên bản {plan.versions.length}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {/* Approve / Reject buttons for Principal */}
                  {(isPrincipal || isAdmin) && plan.status === 'pending' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setApprovalModalPlan(plan);
                          setApprovalAction('approve');
                          setApprovalComment('');
                        }}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-xs"
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setApprovalModalPlan(plan);
                          setApprovalAction('reject');
                          setApprovalComment('');
                        }}
                        className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        Trả lại
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                    title="Xem chi tiết"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {(isPrincipal || isAdmin || plan.responsiblePersonId === currentUser?.id) && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(plan)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                      title="Chỉnh sửa kế hoạch"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PLAN DETAIL MODAL */}
      <Modal
        isOpen={Boolean(selectedPlan)}
        onClose={() => setSelectedPlan(null)}
        title={selectedPlan ? `${selectedPlan.code} - ${selectedPlan.title}` : ''}
        subtitle={`Nhóm: ${selectedPlan ? getTypeLabel(selectedPlan.type) : ''} · Người phụ trách: ${selectedPlan?.responsiblePersonName}`}
        maxWidth="4xl"
        actions={
          <div className="flex items-center justify-between w-full">
            <div>
              {/* Shortcut: Create task from this plan */}
              {(isPrincipal || isAdmin || isDean) && selectedPlan?.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => {
                    navigateTo('tasks');
                    setSelectedPlan(null);
                  }}
                  className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                >
                  Giao nhiệm vụ từ kế hoạch này
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedPlan && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
              {getStatusBadge(selectedPlan.status)}
              <span className="text-slate-500">
                Thời gian: <strong className="tabular-nums text-slate-800">{new Date(selectedPlan.startDate).toLocaleDateString('vi-VN')} → {new Date(selectedPlan.endDate).toLocaleDateString('vi-VN')}</strong>
              </span>
              {selectedPlan.approvedByName && (
                <span className="text-emerald-700 font-medium">
                  · Người phê duyệt: <strong>{selectedPlan.approvedByName}</strong> ({new Date(selectedPlan.approvedAt!).toLocaleDateString('vi-VN')})
                </span>
              )}
            </div>

            {selectedPlan.revisionComment && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                <span className="font-bold">Ý kiến trả lại / Yêu cầu chỉnh sửa của Ban Giám hiệu:</span>
                <p className="mt-1 leading-relaxed">{selectedPlan.revisionComment}</p>
              </div>
            )}

            <div>
              <span className="font-bold text-slate-900 uppercase">Căn cứ & Mục tiêu kế hoạch:</span>
              <p className="mt-1 leading-relaxed text-slate-800 whitespace-pre-wrap">
                {selectedPlan.basisAndGoals}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 uppercase">Nội dung công việc triển khai:</span>
              <p className="mt-1 leading-relaxed text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                {selectedPlan.content}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="font-bold text-slate-700">Chỉ tiêu / Kết quả dự kiến:</span>
                <p className="mt-0.5 text-slate-900">{selectedPlan.expectedTargets}</p>
              </div>
              <div>
                <span className="font-bold text-slate-700">Kinh phí dự kiến:</span>
                <p className="mt-0.5 font-bold text-emerald-700 tabular-nums">
                  {selectedPlan.expectedBudget ? `${selectedPlan.expectedBudget.toLocaleString('vi-VN')} đ` : 'Kinh phí chi thường xuyên'}
                </p>
              </div>
            </div>

            {selectedPlan.requiredProofDescription && (
              <div>
                <span className="font-bold text-slate-700">Minh chứng nghiệm thu bắt buộc:</span>
                <p className="mt-0.5 text-slate-800 italic">{selectedPlan.requiredProofDescription}</p>
              </div>
            )}

            {/* Version History */}
            {selectedPlan.versions?.length > 0 && (
              <div className="border-t border-slate-200 pt-3">
                <p className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-slate-500" />
                  Lịch sử phiên bản chỉnh sửa ({selectedPlan.versions.length}):
                </p>
                <div className="space-y-1.5">
                  {selectedPlan.versions.map((ver) => (
                    <div
                      key={ver.version}
                      className="p-2 rounded border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-800">Phiên bản {ver.version}:</span>{' '}
                        <span className="text-slate-600">{ver.reason}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        {ver.modifiedByName} · {new Date(ver.modifiedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* APPROVAL MODAL */}
      <Modal
        isOpen={Boolean(approvalModalPlan)}
        onClose={() => setApprovalModalPlan(null)}
        title={approvalAction === 'approve' ? 'Phê duyệt kế hoạch' : 'Trả lại kế hoạch yêu cầu chỉnh sửa'}
        subtitle={approvalModalPlan ? `${approvalModalPlan.code} - ${approvalModalPlan.title}` : ''}
        maxWidth="md"
        actions={
          <>
            <button
              type="button"
              onClick={() => setApprovalModalPlan(null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApprovalSubmit}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-xs ${
                approvalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {approvalAction === 'approve' ? 'Xác nhận phê duyệt' : 'Xác nhận trả lại'}
            </button>
          </>
        }
      >
        <div className="space-y-3 py-1">
          <label className="block text-xs font-bold text-slate-900">
            Ý kiến nhận xét & chỉ đạo của Ban Giám hiệu:
          </label>
          <textarea
            rows={4}
            value={approvalComment}
            onChange={(e) => setApprovalComment(e.target.value)}
            placeholder={
              approvalAction === 'approve'
                ? 'Đồng ý kế hoạch. Đề nghị tổ trưởng triển khai theo đúng tiến độ.'
                : 'Yêu cầu điều chỉnh lại nội dung và dự trù kinh phí trước khi trình duyệt lại.'
            }
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
          />
        </div>
      </Modal>

      {/* CREATE / EDIT FORM */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingPlan ? 'Điều chỉnh kế hoạch' : 'Xây dựng kế hoạch mới'}
        subtitle="Mọi thay đổi trên kế hoạch đã phê duyệt sẽ được lưu lại phiên bản và thời điểm chỉnh sửa"
        maxWidth="4xl"
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSaveForm}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
            >
              {saving ? 'Đang lưu...' : editingPlan ? 'Lưu phiên bản mới' : 'Trình duyệt kế hoạch'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
          {editingPlan && (editingPlan.status === 'approved' || editingPlan.status === 'in_progress') && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 text-amber-900 space-y-1">
              <label className="block font-bold">
                Lý do điều chỉnh nội dung (Bắt buộc theo quy định):
              </label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="VD: Cập nhật chỉ tiêu theo công văn mới của Sở GD&ĐT"
                required
                className="w-full rounded border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Mã kế hoạch <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Nhóm kế hoạch
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="year">Kế hoạch năm học</option>
                <option value="month">Kế hoạch tháng</option>
                <option value="week">Kế hoạch tuần</option>
                <option value="academic">Kế hoạch chuyên môn</option>
                <option value="department">Kế hoạch tổ / bộ phận</option>
                <option value="event">Hội thi / Sự kiện</option>
                <option value="inspection">Kiểm tra đánh giá</option>
                <option value="digital_transformation">Chuyển đổi số</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Trạng thái trình duyệt
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                {(isPrincipal || isAdmin) && <option value="approved">Đã phê duyệt (Trực tiếp)</option>}
                <option value="pending">Gửi Ban Giám hiệu phê duyệt</option>
                <option value="draft">Lưu bản nháp</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tên kế hoạch <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="VD: Kế hoạch Bồi dưỡng Học sinh giỏi và Ôn thi Tốt nghiệp THPT 2027"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Ngày bắt đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Hạn kết thúc <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Căn cứ pháp lý & Mục tiêu kế hoạch
            </label>
            <textarea
              rows={3}
              value={formBasis}
              onChange={(e) => setFormBasis(e.target.value)}
              placeholder="Căn cứ hướng dẫn của Bộ, Sở GD&ĐT; Nghị quyết Chi bộ; Mục tiêu cần đạt..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Nội dung công việc & Lộ trình thực hiện
            </label>
            <textarea
              rows={4}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Các giai đoạn thực hiện, phân công trách nhiệm, biện pháp thực hiện..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Chỉ tiêu / Kết quả dự kiến
              </label>
              <input
                type="text"
                value={formTargets}
                onChange={(e) => setFormTargets(e.target.value)}
                placeholder="VD: 100% giáo viên tham gia; đạt từ 5 giải thành phố trở lên"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Dự toán kinh phí (VNĐ, nếu có)
              </label>
              <input
                type="number"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value ? Number(e.target.value) : '')}
                placeholder="VD: 25000000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Minh chứng nghiệm thu bắt buộc
            </label>
            <input
              type="text"
              value={formProofReq}
              onChange={(e) => setFormProofReq(e.target.value)}
              placeholder="VD: Biên bản nghiệm thu, giáo án điện tử, bảng điểm kết quả thi thử"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>
        </form>
      </Modal>

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Xuất danh mục kế hoạch nhà trường"
        filename={`Ke_hoach_nha_truong_${new Date().toISOString().split('T')[0]}`}
        headers={exportHeaders}
        rows={exportRows}
      />
    </div>
  );
};

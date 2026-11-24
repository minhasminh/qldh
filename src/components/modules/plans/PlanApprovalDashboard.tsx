import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api.ts';
import { useAuth } from '../../../context/AuthContext.tsx';
import { useApp } from '../../../context/AppContext.tsx';
import type {
  Plan,
  PlanType,
  PlanStatus,
  SchoolLevelType,
  PlanDecision,
  ApprovalWorkflowRule,
  SchoolYear,
} from '../../../types/database.ts';
import { Modal } from '../../common/Modal.tsx';
import { ExportModal } from '../../common/ExportModal.tsx';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  FileSpreadsheet,
  ArrowRight,
  Send,
  Eye,
  AlertCircle,
  DollarSign,
  Building2,
  User,
  Paperclip,
  Edit,
  RotateCcw,
  Sliders,
  PlayCircle,
  PauseCircle,
  CheckSquare,
  AlertTriangle,
  School,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Info,
  Calendar,
  Lock,
  Check,
} from 'lucide-react';

export type DashboardTab =
  | 'pending_my_approval' // Kế hoạch chờ tôi duyệt
  | 'approved_by_me'      // Kế hoạch tôi đã duyệt
  | 'returned'            // Kế hoạch bị trả lại
  | 'in_progress'         // Kế hoạch đang thực hiện
  | 'overdue'             // Kế hoạch quá hạn
  | 'history'             // Lịch sử quyết định
  | 'all_plans'           // Tất cả kế hoạch
  | 'workflow_config';    // Cấu hình quy chế duyệt 2 cấp

export const PlanApprovalDashboard: React.FC = () => {
  const { currentUser, isPrincipal, isAdmin, isDean, isTeacher } = useAuth();
  const { showToast, departments, targetEntityId, setTargetEntityId, navigateTo } = useApp();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [approvalRules, setApprovalRules] = useState<ApprovalWorkflowRule[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<DashboardTab>('pending_my_approval');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<string>('all');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [selectedPlanType, setSelectedPlanType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all');

  // Modals
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Approval Action Modal
  const [approvalModalPlan, setApprovalModalPlan] = useState<Plan | null>(null);
  const [approvalTargetTier, setApprovalTargetTier] = useState<1 | 2>(1);
  const [approvalActionType, setApprovalActionType] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Status Transition Modal
  const [transitionModalPlan, setTransitionModalPlan] = useState<Plan | null>(null);
  const [transitionTargetStatus, setTransitionTargetStatus] = useState<PlanStatus>('in_progress');
  const [transitionReason, setTransitionReason] = useState('');

  // Plan Form State
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<PlanType>('month');
  const [formSchoolLevel, setFormSchoolLevel] = useState<SchoolLevelType>('all');
  const [formParentPlanId, setFormParentPlanId] = useState('');
  const [formSchoolYearId, setFormSchoolYearId] = useState('');
  const [formBasis, setFormBasis] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formLeadDept, setFormLeadDept] = useState('');
  const [formCoDepts, setFormCoDepts] = useState<string[]>([]);
  const [formTargets, setFormTargets] = useState('');
  const [formDeliverables, setFormDeliverables] = useState('');
  const [formBudget, setFormBudget] = useState<number | ''>('');
  const [formActualBudget, setFormActualBudget] = useState<number | ''>('');
  const [formBudgetSource, setFormBudgetSource] = useState('Ngân sách nhà nước');
  const [formActualOutcome, setFormActualOutcome] = useState('');
  const [formCompletionRate, setFormCompletionRate] = useState<number | ''>('');
  const [formProofReq, setFormProofReq] = useState('');
  const [formRequiredTiers, setFormRequiredTiers] = useState<1 | 2>(2);
  const [editReason, setEditReason] = useState('');
  const [requireReapproval, setRequireReapproval] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);

  // Workflow Config Edit State
  const [editingRules, setEditingRules] = useState<ApprovalWorkflowRule[]>([]);
  const [savingRules, setSavingRules] = useState(false);

  const handleOpenPlanDetail = async (plan: Plan) => {
    setSelectedPlan(plan);
    try {
      const full = await api.getPlanById(plan.id);
      setSelectedPlan(full);
    } catch {
      // keep basic plan
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [plansData, rulesData, syData] = await Promise.all([
        api.getPlans(),
        api.getApprovalRules().catch(() => []),
        api.getSchoolYears().catch(() => []),
      ]);
      setPlans(plansData);
      setApprovalRules(rulesData);
      setEditingRules(rulesData);
      setSchoolYears(syData);

      if (targetEntityId) {
        const found = plansData.find((p) => p.id === targetEntityId);
        if (found) {
          handleOpenPlanDetail(found);
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
    fetchInitialData();
  }, [currentUser]);

  // Determine if a plan is overdue
  const isPlanOverdue = (p: Plan) => {
    const today = new Date().toISOString().split('T')[0];
    return p.endDate < today && p.status !== 'completed' && p.status !== 'closed' && p.status !== 'cancelled';
  };

  // Determine if a plan is waiting for current user's approval
  const isWaitingForMyApproval = (p: Plan) => {
    if (!currentUser) return false;
    // Cannot approve own plan according to anti-self-approval rule
    if (p.responsiblePersonId === currentUser.id) return false;

    if (p.status === 'pending_level_1') {
      // Tier 1: Dean of the department or Principal/Admin
      return (
        (currentUser.role === 'dean' && currentUser.departmentId === p.leadDepartmentId) ||
        currentUser.role === 'principal' ||
        currentUser.role === 'admin'
      );
    }

    if (p.status === 'pending_level_2') {
      // Tier 2: Principal or Admin only
      return currentUser.role === 'principal' || currentUser.role === 'admin';
    }

    return false;
  };

  // Determine if current user has approved this plan
  const hasUserApproved = (p: Plan) => {
    if (!currentUser) return false;
    const isLevel1Approver = p.level1ApprovedById === currentUser.id;
    const isLevel2Approver = p.approvedById === currentUser.id;
    const inDecisions = p.decisionHistory?.some(
      (d) => d.actorId === currentUser.id && (d.action === 'approve_level_1' || d.action === 'approve_level_2')
    );
    return isLevel1Approver || isLevel2Approver || inDecisions;
  };

  // Category counts
  const pendingMyApprovalPlans = plans.filter(isWaitingForMyApproval);
  const approvedByMePlans = plans.filter(hasUserApproved);
  const returnedPlans = plans.filter(
    (p) => p.status === 'revision_level_1' || p.status === 'revision_level_2' || p.status === 'needs_revision'
  );
  const inProgressPlans = plans.filter((p) => p.status === 'in_progress');
  const overduePlans = plans.filter(isPlanOverdue);

  // All decision audit history flat mapped
  const allDecisions: { decision: PlanDecision; plan: Plan }[] = [];
  plans.forEach((p) => {
    if (p.decisionHistory && Array.isArray(p.decisionHistory)) {
      p.decisionHistory.forEach((d) => {
        allDecisions.push({ decision: d, plan: p });
      });
    }
  });
  allDecisions.sort(
    (a, b) => new Date(b.decision.timestamp).getTime() - new Date(a.decision.timestamp).getTime()
  );

  // Filter plans based on active tab & filters
  const getTabFilteredPlans = () => {
    switch (activeTab) {
      case 'pending_my_approval':
        return pendingMyApprovalPlans;
      case 'approved_by_me':
        return approvedByMePlans;
      case 'returned':
        return returnedPlans;
      case 'in_progress':
        return inProgressPlans;
      case 'overdue':
        return overduePlans;
      case 'all_plans':
      default:
        return plans;
    }
  };

  const currentTabPlans = getTabFilteredPlans();

  const filteredPlans = currentTabPlans.filter((p) => {
    const matchSearch =
      searchQuery.trim() === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.responsiblePersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchLevel = selectedSchoolLevel === 'all' || !p.schoolLevel || p.schoolLevel === 'all' || p.schoolLevel === selectedSchoolLevel;
    const matchDept = selectedDepartmentId === 'all' || p.leadDepartmentId === selectedDepartmentId || p.coDepartmentIds?.includes(selectedDepartmentId);
    const matchType = selectedPlanType === 'all' || p.type === selectedPlanType;
    const matchStatus = selectedStatus === 'all' || p.status === selectedStatus;
    const matchAuthor = selectedAuthor === 'all' || p.responsiblePersonId === selectedAuthor;

    return matchSearch && matchLevel && matchDept && matchType && matchStatus && matchAuthor;
  });

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormCode(`KH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setFormTitle('');
    setFormType('month');
    setFormSchoolLevel('all');
    setFormParentPlanId('');
    const currentSy = schoolYears.find((sy) => sy.isCurrent);
    setFormSchoolYearId(currentSy ? currentSy.id : schoolYears[0]?.id || '');
    setFormBasis('');
    setFormContent('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    setFormEndDate(endDate.toISOString().split('T')[0]);
    setFormLeadDept(currentUser?.departmentId || 'dept-bgh');
    setFormCoDepts([]);
    setFormTargets('');
    setFormDeliverables('');
    setFormBudget('');
    setFormActualBudget('');
    setFormBudgetSource('Ngân sách nhà nước');
    setFormActualOutcome('');
    setFormCompletionRate('');
    setFormProofReq('');
    setFormRequiredTiers(currentUser?.role === 'principal' ? 1 : 2);
    setEditReason('');
    setRequireReapproval(true);
    setIsFormOpen(true);
  };

  const handleOpenCreateWithParent = (parentId: string) => {
    handleOpenCreate();
    setFormParentPlanId(parentId);
    const parent = plans.find((p) => p.id === parentId);
    if (parent) {
      if (parent.schoolYearId) setFormSchoolYearId(parent.schoolYearId);
      if (parent.schoolLevel) setFormSchoolLevel(parent.schoolLevel);
      if (parent.type === 'year') setFormType('month');
      else if (parent.type === 'month') setFormType('week');
      else setFormType('department');
    }
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormCode(plan.code);
    setFormTitle(plan.title);
    setFormType(plan.type);
    setFormSchoolLevel(plan.schoolLevel || 'all');
    setFormParentPlanId(plan.parentPlanId || '');
    setFormSchoolYearId(plan.schoolYearId || '');
    setFormBasis(plan.basisAndGoals);
    setFormContent(plan.content);
    setFormStartDate(plan.startDate);
    setFormEndDate(plan.endDate);
    setFormLeadDept(plan.leadDepartmentId);
    setFormCoDepts(plan.coDepartmentIds || []);
    setFormTargets(plan.expectedTargets);
    setFormDeliverables(plan.deliverables || '');
    setFormBudget(plan.expectedBudget || '');
    setFormActualBudget(plan.actualBudget || '');
    setFormBudgetSource(plan.budgetSource || 'Ngân sách nhà nước');
    setFormActualOutcome(plan.actualOutcome || '');
    setFormCompletionRate(plan.completionRate !== undefined ? plan.completionRate : '');
    setFormProofReq(plan.requiredProofDescription || '');
    setFormRequiredTiers(plan.requiredTiers || 2);
    setEditReason('');
    setRequireReapproval(true);
    setIsFormOpen(true);
  };

  // Save Plan Form
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

    setSavingPlan(true);
    try {
      const payload: Partial<Plan> & { editReason?: string; requireReapproval?: boolean } = {
        code: formCode.trim(),
        title: formTitle.trim(),
        type: formType,
        schoolLevel: formSchoolLevel,
        parentPlanId: formParentPlanId || undefined,
        schoolYearId: formSchoolYearId || undefined,
        basisAndGoals: formBasis.trim(),
        content: formContent.trim(),
        startDate: formStartDate,
        endDate: formEndDate,
        leadDepartmentId: formLeadDept || 'dept-bgh',
        coDepartmentIds: formCoDepts,
        expectedTargets: formTargets.trim(),
        deliverables: formDeliverables.trim() || undefined,
        expectedBudget: formBudget ? Number(formBudget) : undefined,
        actualBudget: formActualBudget ? Number(formActualBudget) : undefined,
        budgetSource: formBudgetSource,
        actualOutcome: formActualOutcome.trim() || undefined,
        completionRate: formCompletionRate !== '' ? Number(formCompletionRate) : undefined,
        requiredProofDescription: formProofReq.trim(),
        requiredTiers: formRequiredTiers,
        editReason: editReason.trim(),
        requireReapproval,
      };

      if (editingPlan) {
        const updated = await api.updatePlan(editingPlan.id, payload);
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast('Cập nhật kế hoạch và tạo phiên bản mới thành công');
        if (selectedPlan?.id === updated.id) handleOpenPlanDetail(updated);
      } else {
        const created = await api.createPlan(payload);
        setPlans((prev) => [created, ...prev]);
        showToast('Lập kế hoạch mới thành công (Trạng thái: Bản nháp)');
      }

      setIsFormOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  // Submit Plan for Approval (Trình duyệt)
  const handleSubmitPlan = async (plan: Plan) => {
    try {
      const updated = await api.submitPlan(plan.id, 'Trình lãnh đạo xem xét phê duyệt theo quy chế');
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast(`Đã trình duyệt kế hoạch "${plan.title}"`);
      if (selectedPlan?.id === updated.id) setSelectedPlan(updated);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Open Approval Modal (Approve or Reject Tier)
  const handleOpenApprovalModal = (plan: Plan, tier: 1 | 2, action: 'approve' | 'reject') => {
    setApprovalModalPlan(plan);
    setApprovalTargetTier(tier);
    setApprovalActionType(action);
    setApprovalComment(
      action === 'approve'
        ? tier === 1
          ? 'Tổ chuyên môn đồng ý thông qua kế hoạch và kính chuyển Ban Giám hiệu duyệt Cấp 2'
          : 'Ban Giám hiệu nhất trí phê duyệt ban hành kế hoạch'
        : ''
    );
  };

  // Execute Approval or Rejection
  const handleExecuteApproval = async () => {
    if (!approvalModalPlan) return;

    if (approvalActionType === 'reject' && (!approvalComment || approvalComment.trim().length < 5)) {
      showToast('Vui lòng nhập lý do và yêu cầu điều chỉnh cụ thể (tối thiểu 5 ký tự)', 'error');
      return;
    }

    setSubmittingAction(true);
    try {
      let updated: Plan;
      if (approvalActionType === 'approve') {
        updated = await api.approvePlanTier(approvalModalPlan.id, approvalTargetTier, approvalComment.trim());
        showToast(
          approvalTargetTier === 1
            ? 'Đã phê duyệt Cấp 1 thành công. Kế hoạch đã chuyển lên Ban Giám hiệu duyệt Cấp 2.'
            : 'Ban Giám hiệu đã phê duyệt ban hành kế hoạch thành công.'
        );
      } else {
        updated = await api.rejectPlanTier(approvalModalPlan.id, approvalTargetTier, approvalComment.trim());
        showToast(`Đã trả lại kế hoạch (Cấp ${approvalTargetTier}) kèm nhận xét yêu cầu điều chỉnh.`, 'info');
      }

      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (selectedPlan?.id === updated.id) setSelectedPlan(updated);
      setApprovalModalPlan(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Status Transition Modal
  const handleOpenTransitionModal = (plan: Plan, targetStatus: PlanStatus) => {
    setTransitionModalPlan(plan);
    setTransitionTargetStatus(targetStatus);
    setTransitionReason('');
  };

  const handleExecuteTransition = async () => {
    if (!transitionModalPlan) return;
    try {
      const updated = await api.transitionPlanStatus(transitionModalPlan.id, transitionTargetStatus, transitionReason.trim());
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast(`Đã chuyển trạng thái kế hoạch sang: ${getStatusLabel(transitionTargetStatus)}`);
      if (selectedPlan?.id === updated.id) setSelectedPlan(updated);
      setTransitionModalPlan(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Save Workflow Rules
  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      const updated = await api.updateApprovalRules(editingRules);
      setApprovalRules(updated);
      showToast('Đã lưu cấu hình quy chế phê duyệt 2 cấp thành công');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingRules(false);
    }
  };

  // Helper Labels & Badges
  const getTypeLabel = (t: PlanType) => {
    switch (t) {
      case 'year':
        return 'Năm học';
      case 'semester':
        return 'Học kỳ';
      case 'month':
        return 'Tháng';
      case 'week':
        return 'Tuần';
      case 'academic':
        return 'Chuyên môn & Dạy học';
      case 'department':
        return 'Tổ bộ môn';
      case 'event':
        return 'Hội thi / Sự kiện';
      case 'inspection':
        return 'Kiểm tra & Đánh giá';
      case 'digital_transformation':
        return 'Chuyển đổi số';
      default:
        return t;
    }
  };

  const getSchoolLevelBadge = (lvl?: SchoolLevelType) => {
    switch (lvl) {
      case 'primary':
        return <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">Tiểu học (1-5)</span>;
      case 'secondary':
        return <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">THCS (6-9)</span>;
      default:
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Liên cấp / Toàn trường</span>;
    }
  };

  const getStatusLabel = (st: PlanStatus) => {
    switch (st) {
      case 'draft':
        return 'Bản nháp';
      case 'pending_level_1':
        return 'Chờ duyệt Cấp 1 (Tổ trưởng)';
      case 'revision_level_1':
        return 'Cần chỉnh sửa Cấp 1';
      case 'pending_level_2':
        return 'Chờ duyệt Cấp 2 (Ban Giám hiệu)';
      case 'revision_level_2':
        return 'Cần chỉnh sửa Cấp 2';
      case 'approved':
        return 'Đã phê duyệt';
      case 'in_progress':
        return 'Đang thực hiện';
      case 'completed':
        return 'Đã hoàn thành';
      case 'paused':
        return 'Tạm dừng';
      case 'closed':
        return 'Đã kết thúc';
      case 'cancelled':
        return 'Đã hủy';
      case 'pending':
        return 'Chờ duyệt';
      case 'needs_revision':
        return 'Cần chỉnh sửa';
      default:
        return st;
    }
  };

  const getStatusBadge = (st: PlanStatus, isOverdue = false) => {
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
          <AlertTriangle className="h-3 w-3" />
          <span>Quá hạn ({getStatusLabel(st)})</span>
        </span>
      );
    }

    switch (st) {
      case 'draft':
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Bản nháp</span>;
      case 'pending_level_1':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <Clock className="h-3 w-3" />
            <span>Chờ duyệt Cấp 1 (Tổ trưởng)</span>
          </span>
        );
      case 'revision_level_1':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
            <RotateCcw className="h-3 w-3" />
            <span>Cần chỉnh sửa Cấp 1</span>
          </span>
        );
      case 'pending_level_2':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
            <Clock className="h-3 w-3" />
            <span>Chờ duyệt Cấp 2 (BGH)</span>
          </span>
        );
      case 'revision_level_2':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
            <RotateCcw className="h-3 w-3" />
            <span>Cần chỉnh sửa Cấp 2 (BGH)</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            <span>Đã phê duyệt</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
            <PlayCircle className="h-3 w-3" />
            <span>Đang thực hiện</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
            <CheckSquare className="h-3 w-3" />
            <span>Hoàn thành</span>
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            <PauseCircle className="h-3 w-3" />
            <span>Tạm dừng</span>
          </span>
        );
      case 'closed':
        return <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-800">Đã kết thúc</span>;
      case 'cancelled':
        return <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600 line-through">Đã hủy</span>;
      default:
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{st}</span>;
    }
  };

  // Export Data Rows
  const exportHeaders = [
    'Mã KH',
    'Tên kế hoạch',
    'Cấp học',
    'Nhóm kế hoạch',
    'Số cấp duyệt',
    'Người lập',
    'Đơn vị chủ trì',
    'Thời gian thực hiện',
    'Trạng thái',
    'Duyệt Cấp 1',
    'Duyệt Cấp 2',
    'Dự toán kinh phí',
  ];
  const exportRows = filteredPlans.map((p) => [
    p.code,
    p.title,
    p.schoolLevel === 'primary' ? 'Tiểu học' : p.schoolLevel === 'secondary' ? 'THCS' : 'Toàn trường',
    getTypeLabel(p.type),
    `${p.requiredTiers || 2} cấp`,
    p.responsiblePersonName,
    departments.find((d) => d.id === p.leadDepartmentId)?.name || 'Ban Giám hiệu',
    `${p.startDate} -> ${p.endDate}`,
    getStatusLabel(p.status),
    p.level1ApprovedByName ? `${p.level1ApprovedByName} (${p.level1ApprovedAt?.split('T')[0]})` : 'Chưa duyệt',
    p.approvedByName ? `${p.approvedByName} (${p.approvedAt?.split('T')[0]})` : 'Chưa duyệt',
    p.expectedBudget ? `${p.expectedBudget.toLocaleString('vi-VN')} đ` : '0 đ',
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Quy Trình Phê Duyệt Kế Hoạch Hai Cấp
            </h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              Trường TH&THCS Nguyễn Đình Anh
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Luồng chuẩn hóa: Người lập → Tổ trưởng duyệt Cấp 1 → Ban Giám hiệu duyệt Cấp 2 → Ban hành & Triển khai
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {(isAdmin || isPrincipal) && (
            <button
              type="button"
              onClick={() => setActiveTab('workflow_config')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors shadow-xs ${
                activeTab === 'workflow_config'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sliders className="h-4 w-4 text-blue-600" />
              <span>Cấu hình quy chế</span>
            </button>
          )}

          {(isPrincipal || isAdmin || isDean || isTeacher) && (
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

      {/* Metric Cards - 6 Functional Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Chờ tôi duyệt */}
        <button
          type="button"
          onClick={() => setActiveTab('pending_my_approval')}
          className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'pending_my_approval'
              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-medium text-slate-500">Chờ tôi duyệt</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{pendingMyApprovalPlans.length}</span>
            <span className="text-[10px] text-amber-600 font-medium">Cần xử lý</span>
          </div>
        </button>

        {/* Card 2: Tôi đã duyệt */}
        <button
          type="button"
          onClick={() => setActiveTab('approved_by_me')}
          className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'approved_by_me'
              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-medium text-slate-500">Tôi đã duyệt</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{approvedByMePlans.length}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Đã thông qua</span>
          </div>
        </button>

        {/* Card 3: Bị trả lại */}
        <button
          type="button"
          onClick={() => setActiveTab('returned')}
          className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'returned'
              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-medium text-slate-500">Bị trả lại</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-rose-700">
              <RotateCcw className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{returnedPlans.length}</span>
            <span className="text-[10px] text-rose-600 font-medium">Cần sửa đổi</span>
          </div>
        </button>

        {/* Card 4: Đang thực hiện */}
        <button
          type="button"
          onClick={() => setActiveTab('in_progress')}
          className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'in_progress'
              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-medium text-slate-500">Đang thực hiện</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-100 text-cyan-700">
              <PlayCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{inProgressPlans.length}</span>
            <span className="text-[10px] text-cyan-600 font-medium">Triển khai</span>
          </div>
        </button>

        {/* Card 5: Quá hạn */}
        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'overdue'
              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-medium text-slate-500">Quá hạn</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{overduePlans.length}</span>
            <span className="text-[10px] text-rose-600 font-medium">Cần đôn đốc</span>
          </div>
        </button>

        {/* Card 6: Lịch sử quyết định */}
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'history'
              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-medium text-slate-500">Lịch sử quyết định</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700">
              <History className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{allDecisions.length}</span>
            <span className="text-[10px] text-purple-600 font-medium">Nhật ký duyệt</span>
          </div>
        </button>
      </div>

      {/* Tabs Navigation Header */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setActiveTab('pending_my_approval')}
            className={`flex items-center gap-2 border-b-2 py-2.5 px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'pending_my_approval'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <span>📥 Chờ tôi duyệt</span>
            {pendingMyApprovalPlans.length > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendingMyApprovalPlans.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved_by_me')}
            className={`flex items-center gap-2 border-b-2 py-2.5 px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'approved_by_me'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <span>✅ Tôi đã duyệt</span>
            <span className="text-slate-400">({approvedByMePlans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('returned')}
            className={`flex items-center gap-2 border-b-2 py-2.5 px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'returned'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <span>↩️ Bị trả lại cần sửa</span>
            {returnedPlans.length > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {returnedPlans.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('in_progress')}
            className={`flex items-center gap-2 border-b-2 py-2.5 px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'in_progress'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <span>🚀 Đang thực hiện</span>
            <span className="text-slate-400">({inProgressPlans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overdue')}
            className={`flex items-center gap-2 border-b-2 py-2.5 px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'overdue'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <span>⚠️ Quá hạn</span>
            {overduePlans.length > 0 && (
              <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {overduePlans.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 border-b-2 py-2.5 px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <span>📜 Lịch sử quyết định ({allDecisions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_plans')}
            className={`flex items-center gap-2 border-b-2 py-2.5 px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'all_plans'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <span>📁 Toàn bộ kế hoạch ({plans.length})</span>
          </button>
        </nav>
      </div>

      {/* FILTER & SEARCH CONTROLS (Only when not in History or Workflow Config tab) */}
      {activeTab !== 'history' && activeTab !== 'workflow_config' && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo mã KH, tiêu đề kế hoạch, người lập, nội dung..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Quick reset filters */}
            {(searchQuery || selectedSchoolLevel !== 'all' || selectedDepartmentId !== 'all' || selectedPlanType !== 'all' || selectedStatus !== 'all' || selectedAuthor !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSchoolLevel('all');
                  setSelectedDepartmentId('all');
                  setSelectedPlanType('all');
                  setSelectedStatus('all');
                  setSelectedAuthor('all');
                }}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>

          {/* Detailed Filters row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1 border-t border-slate-100">
            {/* Filter 1: Cấp học */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Cấp học
              </label>
              <select
                value={selectedSchoolLevel}
                onChange={(e) => setSelectedSchoolLevel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Tất cả cấp học</option>
                <option value="primary">Cấp Tiểu học (Khối 1-5)</option>
                <option value="secondary">Cấp THCS (Khối 6-9)</option>
                <option value="all">Toàn trường / Liên cấp</option>
              </select>
            </div>

            {/* Filter 2: Tổ / Bộ phận */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Tổ / Bộ phận
              </label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Tất cả tổ / bộ phận</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 3: Loại kế hoạch */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Loại kế hoạch
              </label>
              <select
                value={selectedPlanType}
                onChange={(e) => setSelectedPlanType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Tất cả nhóm</option>
                <option value="year">Kế hoạch năm học</option>
                <option value="semester">Kế hoạch học kỳ</option>
                <option value="month">Kế hoạch tháng</option>
                <option value="week">Kế hoạch tuần</option>
                <option value="academic">Chuyên môn & Dạy học</option>
                <option value="department">Tổ chuyên môn</option>
                <option value="event">Hội thi / Sự kiện</option>
                <option value="inspection">Kiểm tra & Đánh giá</option>
                <option value="digital_transformation">Chuyển đổi số</option>
              </select>
            </div>

            {/* Filter 4: Trạng thái */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Trạng thái
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Tất cả 11 trạng thái</option>
                <option value="draft">Bản nháp</option>
                <option value="pending_level_1">Chờ duyệt Cấp 1</option>
                <option value="revision_level_1">Cần chỉnh sửa Cấp 1</option>
                <option value="pending_level_2">Chờ duyệt Cấp 2</option>
                <option value="revision_level_2">Cần chỉnh sửa Cấp 2</option>
                <option value="approved">Đã phê duyệt</option>
                <option value="in_progress">Đang thực hiện</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="paused">Tạm dừng</option>
                <option value="closed">Đã kết thúc</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>

            {/* Filter 5: Người lập */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Người lập
              </label>
              <select
                value={selectedAuthor}
                onChange={(e) => setSelectedAuthor(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Tất cả người lập</option>
                {Array.from(new Set(plans.map((p) => p.responsiblePersonId))).map((uid) => {
                  const authorPlan = plans.find((p) => p.responsiblePersonId === uid);
                  return (
                    <option key={uid} value={uid}>
                      {authorPlan?.responsiblePersonName || uid}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 1 - 5 & ALL PLANS: TABLE VIEW OF PLANS
      ========================================================================== */}
      {activeTab !== 'history' && activeTab !== 'workflow_config' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2"></div>
              <p>Đang tải dữ liệu kế hoạch...</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Không có kế hoạch nào</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {activeTab === 'pending_my_approval'
                  ? 'Hiện tại không có kế hoạch nào đang chờ bạn phê duyệt.'
                  : activeTab === 'returned'
                  ? 'Tuyệt vời! Không có kế hoạch nào bị trả lại yêu cầu chỉnh sửa.'
                  : activeTab === 'overdue'
                  ? 'Tất cả các kế hoạch đều đang được thực hiện đúng tiến độ.'
                  : 'Không tìm thấy kế hoạch phù hợp với tiêu chí lọc.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Mã KH & Kế hoạch</th>
                    <th className="py-3 px-3">Cấp học & Nhóm</th>
                    <th className="py-3 px-3">Đơn vị & Người lập</th>
                    <th className="py-3 px-3">Thời gian thực hiện</th>
                    <th className="py-3 px-3">Tiến trình duyệt 2 cấp</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPlans.map((plan) => {
                    const overdue = isPlanOverdue(plan);
                    const canApproveTier1 =
                      plan.status === 'pending_level_1' &&
                      plan.responsiblePersonId !== currentUser?.id &&
                      ((currentUser?.role === 'dean' && currentUser.departmentId === plan.leadDepartmentId) ||
                        currentUser?.role === 'principal' ||
                        currentUser?.role === 'admin');

                    const canApproveTier2 =
                      plan.status === 'pending_level_2' &&
                      plan.responsiblePersonId !== currentUser?.id &&
                      (currentUser?.role === 'principal' || currentUser?.role === 'admin');

                    const isOwner = plan.responsiblePersonId === currentUser?.id;
                    const canSubmit = (plan.status === 'draft' || plan.status === 'revision_level_1' || plan.status === 'revision_level_2') && (isOwner || isAdmin);
                    const canStart = plan.status === 'approved' && (isOwner || isDean || isPrincipal || isAdmin);
                    const canComplete = plan.status === 'in_progress' && (isOwner || isDean || isPrincipal || isAdmin);

                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/75 transition-colors group">
                        {/* Title & Code */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                              {plan.title}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-blue-600 font-medium">
                                {plan.code}
                              </span>
                              {plan.versions && plan.versions.length > 1 && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                                  v{plan.versions.length}
                                </span>
                              )}
                              {plan.expectedBudget && plan.expectedBudget > 0 && (
                                <span className="text-[10px] text-slate-400">
                                  • {plan.expectedBudget.toLocaleString('vi-VN')} đ
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* School Level & Type */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            {getSchoolLevelBadge(plan.schoolLevel)}
                            <span className="text-[11px] text-slate-500 font-medium">
                              {getTypeLabel(plan.type)}
                            </span>
                          </div>
                        </td>

                        {/* Lead Department & Author */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800 line-clamp-1">
                              {departments.find((d) => d.id === plan.leadDepartmentId)?.name || 'Ban Giám hiệu'}
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5">
                              Lập bởi: {plan.responsiblePersonName}
                            </span>
                          </div>
                        </td>

                        {/* Schedule */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col text-[11px]">
                            <span className="text-slate-700 font-medium">{plan.startDate}</span>
                            <span className="text-slate-400 text-[10px]">đến {plan.endDate}</span>
                          </div>
                        </td>

                        {/* Two-Tier Workflow Stepper Indicator */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {/* Tier 1 Box */}
                            <div
                              className={`flex items-center gap-1 rounded px-2 py-0.5 font-semibold ${
                                plan.level1ApprovedAt
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : plan.status === 'revision_level_1'
                                  ? 'bg-rose-100 text-rose-800'
                                  : plan.status === 'pending_level_1'
                                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                              title={
                                plan.level1ApprovedByName
                                  ? `Cấp 1 duyệt bởi: ${plan.level1ApprovedByName}`
                                  : 'Cấp 1: Tổ trưởng chuyên môn'
                              }
                            >
                              <span>C1</span>
                              {plan.level1ApprovedAt ? (
                                <CheckCircle2 className="h-2.5 w-2.5" />
                              ) : plan.status === 'revision_level_1' ? (
                                <RotateCcw className="h-2.5 w-2.5" />
                              ) : null}
                            </div>

                            <ArrowRight className="h-3 w-3 text-slate-300" />

                            {/* Tier 2 Box */}
                            <div
                              className={`flex items-center gap-1 rounded px-2 py-0.5 font-semibold ${
                                plan.approvedAt
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : plan.status === 'revision_level_2'
                                  ? 'bg-purple-100 text-purple-800'
                                  : plan.status === 'pending_level_2'
                                  ? 'bg-blue-100 text-blue-800 animate-pulse'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                              title={
                                plan.approvedByName
                                  ? `Cấp 2 duyệt bởi: ${plan.approvedByName}`
                                  : 'Cấp 2: Ban Giám hiệu'
                              }
                            >
                              <span>C2</span>
                              {plan.approvedAt ? (
                                <CheckCircle2 className="h-2.5 w-2.5" />
                              ) : plan.status === 'revision_level_2' ? (
                                <RotateCcw className="h-2.5 w-2.5" />
                              ) : null}
                            </div>
                          </div>

                          {plan.revisionComment && (
                            <p className="text-[10px] text-rose-600 line-clamp-1 mt-1 max-w-[180px]">
                              ⚠️ {plan.revisionComment}
                            </p>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3">
                          {getStatusBadge(plan.status, overdue)}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Detail Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenPlanDetail(plan)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                              title="Xem chi tiết kế hoạch & tiến trình duyệt"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Action: Nộp duyệt (Submit) */}
                            {canSubmit && (
                              <button
                                type="button"
                                onClick={() => handleSubmitPlan(plan)}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                                title="Trình duyệt kế hoạch"
                              >
                                <Send className="h-3 w-3" />
                                <span>Trình duyệt</span>
                              </button>
                            )}

                            {/* Action: Duyệt Cấp 1 */}
                            {canApproveTier1 && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenApprovalModal(plan, 1, 'approve')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 shadow-xs"
                                  title="Phê duyệt Cấp 1"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Duyệt C1</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenApprovalModal(plan, 1, 'reject')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                                  title="Yêu cầu sửa Cấp 1"
                                >
                                  <span>Trả lại</span>
                                </button>
                              </div>
                            )}

                            {/* Action: Duyệt Cấp 2 */}
                            {canApproveTier2 && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenApprovalModal(plan, 2, 'approve')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 shadow-xs"
                                  title="Ban Giám hiệu phê duyệt Cấp 2"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>BGH Duyệt C2</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenApprovalModal(plan, 2, 'reject')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                                  title="BGH trả lại yêu cầu chỉnh sửa"
                                >
                                  <span>Trả lại</span>
                                </button>
                              </div>
                            )}

                            {/* Action: Triển khai thực hiện */}
                            {canStart && (
                              <button
                                type="button"
                                onClick={() => handleOpenTransitionModal(plan, 'in_progress')}
                                className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-cyan-500 shadow-xs"
                                title="Chuyển sang đang triển khai"
                              >
                                <PlayCircle className="h-3 w-3" />
                                <span>Triển khai</span>
                              </button>
                            )}

                            {/* Action: Báo cáo hoàn thành */}
                            {canComplete && (
                              <button
                                type="button"
                                onClick={() => handleOpenTransitionModal(plan, 'completed')}
                                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-teal-500 shadow-xs"
                                title="Báo cáo hoàn thành kế hoạch"
                              >
                                <CheckSquare className="h-3 w-3" />
                                <span>Hoàn thành</span>
                              </button>
                            )}

                            {/* Edit Button */}
                            {(isOwner || isPrincipal || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(plan)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title="Chỉnh sửa kế hoạch"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 6: LỊCH SỬ QUYẾT ĐỊNH TOÀN TRƯỜNG (DECISION AUDIT TRAIL)
      ========================================================================== */}
      {activeTab === 'history' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Nhật Ký Quyết Định Phê Duyệt Kế Hoạch (Audit Trail)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ghi nhận đầy đủ người thực hiện, vai trò, thời điểm, trạng thái trước/sau và nhận xét chỉ đạo
              </p>
            </div>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
              {allDecisions.length} Quyết định
            </span>
          </div>

          {allDecisions.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">Chưa có quyết định phê duyệt nào được lưu vết.</p>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 py-2">
              {allDecisions.map(({ decision, plan }, idx) => {
                const isApprove = decision.action.startsWith('approve');
                const isReject = decision.action.startsWith('reject');
                const isSubmit = decision.action === 'submit' || decision.action === 'resubmit';

                return (
                  <div key={decision.id || idx} className="relative pl-6">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-xs ${
                        isApprove
                          ? 'bg-emerald-600'
                          : isReject
                          ? 'bg-rose-600'
                          : isSubmit
                          ? 'bg-blue-600'
                          : 'bg-purple-600'
                      }`}
                    />

                    <div className="rounded-lg border border-slate-100 bg-slate-50/75 p-3.5 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{decision.actorName}</span>
                          <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-medium text-slate-700">
                            {decision.actorRole === 'principal'
                              ? 'Ban Giám hiệu'
                              : decision.actorRole === 'dean'
                              ? 'Tổ trưởng chuyên môn'
                              : decision.actorRole === 'admin'
                              ? 'Quản trị viên'
                              : 'Giáo viên'}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(decision.timestamp).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Chuyển:</span>
                          <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[9px] font-semibold text-slate-700">
                            {getStatusLabel(decision.fromStatus)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-800">
                            {getStatusLabel(decision.toStatus)}
                          </span>
                        </div>
                      </div>

                      {/* Associated Plan Title */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => setSelectedPlan(plan)}>
                          {plan.code} - {plan.title}
                        </span>
                        {decision.tierLevel && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                            Cấp {decision.tierLevel}
                          </span>
                        )}
                      </div>

                      {/* Comment text */}
                      {decision.comment && (
                        <div className="rounded bg-white p-2.5 text-xs text-slate-700 border border-slate-200/60 font-medium">
                          💬 "{decision.comment}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 7: CẤU HÌNH QUY CHẾ PHÊ DUYỆT 2 CẤP (WORKFLOW RULES CONFIG)
      ========================================================================== */}
      {activeTab === 'workflow_config' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Cấu Hình Quy Trình Phê Duyệt Kế Hoạch
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tùy chỉnh số cấp phê duyệt (1 cấp hay 2 cấp), quy định tự duyệt và quy định duyệt lại khi sửa đổi
              </p>
            </div>

            {(isAdmin || isPrincipal) && (
              <button
                type="button"
                onClick={handleSaveRules}
                disabled={savingRules}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs transition-colors"
              >
                {savingRules ? 'Đang lưu...' : 'Lưu quy chế'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {editingRules.map((rule, idx) => (
              <div key={rule.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-slate-900">{rule.name}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Số cấp duyệt:</span>
                    <select
                      value={rule.requiredTiers}
                      disabled={!isAdmin && !isPrincipal}
                      onChange={(e) => {
                        const val = Number(e.target.value) as 1 | 2;
                        setEditingRules((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, requiredTiers: val } : r))
                        );
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-700 focus:outline-hidden"
                    >
                      <option value={1}>1 Cấp (BGH duyệt trực tiếp)</option>
                      <option value={2}>2 Cấp (Tổ trưởng C1 → BGH C2)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.allowSelfApproval}
                      disabled={!isAdmin && !isPrincipal}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditingRules((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, allowSelfApproval: checked } : r))
                        );
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">
                      Cho phép người lập tự phê duyệt kế hoạch của mình (Mặc định: TẮT để bảo đảm tính khách quan)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.requireReapprovalOnEdit}
                      disabled={!isAdmin && !isPrincipal}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditingRules((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, requireReapprovalOnEdit: checked } : r))
                        );
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">
                      Bắt buộc phê duyệt lại khi sửa đổi nội dung quan trọng của kế hoạch đã ban hành
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CHI TIẾT KẾ HOẠCH & VISUAL STEPPER QUY TRÌNH 2 CẤP
      ========================================================================== */}
      {selectedPlan && (
        <Modal
          isOpen={Boolean(selectedPlan)}
          onClose={() => setSelectedPlan(null)}
          title={`Chi tiết: ${selectedPlan.code} - ${selectedPlan.title}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Visual Two-Tier Stepper Progress Bar */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
                Tiến Trình Phê Duyệt & Ban Hành Kế Hoạch ({selectedPlan.requiredTiers || 2} Cấp)
              </span>

              <div className="grid grid-cols-4 gap-2 text-center text-xs relative">
                {/* Step 1: Lập kế hoạch */}
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-slate-800 mt-1.5 text-[11px]">1. Người lập</span>
                  <span className="text-[10px] text-slate-500">{selectedPlan.responsiblePersonName}</span>
                </div>

                {/* Step 2: Duyệt Cấp 1 */}
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold shadow-xs ${
                      selectedPlan.level1ApprovedAt
                        ? 'bg-emerald-600 text-white'
                        : selectedPlan.status === 'revision_level_1'
                        ? 'bg-rose-600 text-white'
                        : selectedPlan.status === 'pending_level_1'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {selectedPlan.level1ApprovedAt ? (
                      <Check className="h-4 w-4" />
                    ) : selectedPlan.status === 'revision_level_1' ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      '2'
                    )}
                  </div>
                  <span className="font-semibold text-slate-800 mt-1.5 text-[11px]">2. Duyệt Cấp 1</span>
                  <span className="text-[10px] text-slate-500">
                    {selectedPlan.level1ApprovedByName || 'Tổ trưởng chuyên môn'}
                  </span>
                </div>

                {/* Step 3: Duyệt Cấp 2 */}
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold shadow-xs ${
                      selectedPlan.approvedAt
                        ? 'bg-emerald-600 text-white'
                        : selectedPlan.status === 'revision_level_2'
                        ? 'bg-purple-600 text-white'
                        : selectedPlan.status === 'pending_level_2'
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {selectedPlan.approvedAt ? (
                      <Check className="h-4 w-4" />
                    ) : selectedPlan.status === 'revision_level_2' ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      '3'
                    )}
                  </div>
                  <span className="font-semibold text-slate-800 mt-1.5 text-[11px]">3. Duyệt Cấp 2</span>
                  <span className="text-[10px] text-slate-500">
                    {selectedPlan.approvedByName || 'Ban Giám hiệu'}
                  </span>
                </div>

                {/* Step 4: Ban hành & Triển khai */}
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold shadow-xs ${
                      selectedPlan.status === 'completed' || selectedPlan.status === 'closed'
                        ? 'bg-teal-600 text-white'
                        : selectedPlan.status === 'in_progress'
                        ? 'bg-cyan-600 text-white animate-pulse'
                        : selectedPlan.status === 'approved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {selectedPlan.status === 'completed' || selectedPlan.status === 'closed' ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      '4'
                    )}
                  </div>
                  <span className="font-semibold text-slate-800 mt-1.5 text-[11px]">4. Triển khai</span>
                  <span className="text-[10px] text-slate-500">{getStatusLabel(selectedPlan.status)}</span>
                </div>
              </div>
            </div>

            {/* Rejection notice if returned */}
            {selectedPlan.revisionComment && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 space-y-1">
                  <span className="font-bold">Ý kiến yêu cầu điều chỉnh từ cấp duyệt:</span>
                  <p className="bg-white/70 p-2 rounded border border-rose-200 font-medium text-rose-800">
                    "{selectedPlan.revisionComment}"
                  </p>
                </div>
              </div>
            )}

            {/* Main Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Cấp học</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {selectedPlan.schoolLevel === 'primary' ? 'Tiểu học' : selectedPlan.schoolLevel === 'secondary' ? 'THCS' : 'Liên cấp / Toàn trường'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Nhóm kế hoạch</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{getTypeLabel(selectedPlan.type)}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Thời gian thực hiện</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {selectedPlan.startDate} → {selectedPlan.endDate}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Đơn vị chủ trì</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {departments.find((d) => d.id === selectedPlan.leadDepartmentId)?.name || 'Ban Giám hiệu'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Dự toán kinh phí</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {selectedPlan.expectedBudget ? `${selectedPlan.expectedBudget.toLocaleString('vi-VN')} đ` : '0 đ'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Phiên bản hiện tại</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  v{selectedPlan.versions?.length || 1}
                </span>
              </div>
            </div>

            {/* Content & Targets */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-800 block mb-1">Căn cứ & Mục tiêu:</span>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 whitespace-pre-line">
                  {selectedPlan.basisAndGoals || 'Chưa cập nhật'}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-1">Nội dung kế hoạch chi tiết:</span>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 whitespace-pre-line leading-relaxed">
                  {selectedPlan.content || 'Chưa có nội dung chi tiết'}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-1">Chỉ tiêu phấn đấu & Yêu cầu minh chứng:</span>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">
                  <p><strong>Chỉ tiêu:</strong> {selectedPlan.expectedTargets || 'Theo quy định chung'}</p>
                  <p className="mt-1"><strong>Minh chứng nghiệm thu:</strong> {selectedPlan.requiredProofDescription || 'Biên bản, báo cáo'}</p>
                </div>
              </div>
            </div>

            {/* Deliverables & Outcomes */}
            {(selectedPlan.deliverables || selectedPlan.actualOutcome || selectedPlan.completionRate !== undefined || selectedPlan.actualBudget !== undefined) && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="font-bold text-xs text-slate-800 block">Sản phẩm đầu ra & Đánh giá kết quả:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedPlan.deliverables && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5">
                      <span className="font-semibold text-emerald-900 block text-[11px]">Sản phẩm đầu ra bắt buộc:</span>
                      <p className="text-slate-700 mt-1">{selectedPlan.deliverables}</p>
                    </div>
                  )}
                  {selectedPlan.actualOutcome && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2.5">
                      <span className="font-semibold text-blue-900 block text-[11px]">Kết quả đạt được:</span>
                      <p className="text-slate-700 mt-1">{selectedPlan.actualOutcome}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                  {selectedPlan.completionRate !== undefined && (
                    <div>
                      <span className="text-slate-500">Tỷ lệ hoàn thành: </span>
                      <strong className="text-emerald-700 font-bold">{selectedPlan.completionRate}%</strong>
                    </div>
                  )}
                  {selectedPlan.actualBudget !== undefined && (
                    <div>
                      <span className="text-slate-500">Kinh phí thực tế: </span>
                      <strong className="text-slate-800">{selectedPlan.actualBudget.toLocaleString('vi-VN')} đ</strong>
                      {selectedPlan.budgetSource && <span className="text-slate-400 text-[10px]"> ({selectedPlan.budgetSource})</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TWO-WAY HIERARCHY & LINKED TASKS */}
            <div className="space-y-3 border-t border-slate-200 pt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Truy xuất phân cấp hai chiều & Nhiệm vụ thực hiện
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const parentId = selectedPlan.id;
                      setSelectedPlan(null);
                      handleOpenCreateWithParent(parentId);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                  >
                    <Plus className="h-3 w-3 text-blue-600" />
                    <span>Tạo KH cấp dưới</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigateTo('tasks', selectedPlan.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 shadow-2xs"
                  >
                    <CheckSquare className="h-3 w-3" />
                    <span>Giao nhiệm vụ từ KH này</span>
                  </button>
                </div>
              </div>

              {/* Parent Plan link */}
              {selectedPlan.parentPlan && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                        Kế hoạch cấp trên trực tiếp (Kế hoạch cha)
                      </span>
                      <p className="font-bold text-slate-900 text-xs mt-0.5">
                        {selectedPlan.parentPlan.code} - {selectedPlan.parentPlan.title}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Người chủ trì: {selectedPlan.parentPlan.responsiblePersonName} • Nhóm: {getTypeLabel(selectedPlan.parentPlan.type)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const parent = plans.find((p) => p.id === selectedPlan.parentPlan?.id);
                        if (parent) handleOpenPlanDetail(parent);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-white border border-indigo-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 shadow-2xs"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Xem KH cha</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Plans List */}
              {selectedPlan.subPlans && selectedPlan.subPlans.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Kế hoạch cấp dưới trực thuộc ({selectedPlan.subPlans.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedPlan.subPlans.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 hover:border-blue-300 transition-colors cursor-pointer flex items-center justify-between"
                        onClick={() => {
                          const subFull = plans.find((p) => p.id === sub.id);
                          if (subFull) handleOpenPlanDetail(subFull);
                        }}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-900 truncate text-[11px]">{sub.code} - {sub.title}</p>
                          <p className="text-[10px] text-slate-500">{sub.responsiblePersonName} • {sub.startDate} → {sub.endDate}</p>
                        </div>
                        {getStatusBadge(sub.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Tasks List */}
              {selectedPlan.linkedTasks && selectedPlan.linkedTasks.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Nhiệm vụ cụ thể trực thuộc kế hoạch này ({selectedPlan.linkedTasks.length}):
                  </span>
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden">
                    {selectedPlan.linkedTasks.map((tsk) => (
                      <div key={tsk.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-900 truncate">{tsk.title}</p>
                          <p className="text-[10px] text-slate-500">
                            Người thực hiện: <span className="font-medium text-slate-700">{tsk.mainAssigneeName}</span> • Hạn: {tsk.deadline}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-blue-700 font-bold tabular-nums text-[11px]">{tsk.progress}%</span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {tsk.status === 'completed' ? 'Hoàn thành' : tsk.status === 'pending_verification' ? 'Chờ xác nhận' : tsk.status === 'needs_addition' ? 'Cần bổ sung' : 'Đang làm'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Version Snapshot History */}
            {selectedPlan.versions && selectedPlan.versions.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="font-bold text-xs text-slate-800 block">Lịch sử các phiên bản:</span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
                  {selectedPlan.versions.map((ver) => (
                    <div key={ver.version} className="p-2.5 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600 font-mono">v{ver.version}</span>
                        <span className="text-slate-700 font-medium">{ver.reason}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {ver.modifiedByName} • {new Date(ver.modifiedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 2: FORM LẬP HOẶC CHỈNH SỬA KẾ HOẠCH
      ========================================================================== */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editingPlan ? `Chỉnh sửa: ${editingPlan.code}` : 'Lập Kế Hoạch Mới'}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
            {/* Version bump warning if modifying approved plan */}
            {editingPlan && (editingPlan.status === 'approved' || editingPlan.status === 'in_progress') && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>Kế hoạch đã được phê duyệt ban hành!</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Để tuân thủ quy tắc chống sửa đổi âm thầm, hệ thống sẽ tự động tạo một phiên bản mới (v
                  {(editingPlan.versions?.length || 1) + 1}). Vui lòng nhập rõ lý do điều chỉnh bên dưới.
                </p>
                <div className="pt-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">
                    Lý do điều chỉnh (Bắt buộc) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Ví dụ: Bổ sung đối tượng phụ đạo theo chỉ đạo mới của BGH..."
                    className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireReapproval}
                    onChange={(e) => setRequireReapproval(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] font-medium text-slate-800">
                    Kích hoạt phê duyệt lại (chuyển về trạng thái chờ duyệt cấp tương ứng)
                  </span>
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Năm học thực hiện *</label>
                <select
                  value={formSchoolYearId}
                  onChange={(e) => setFormSchoolYearId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                >
                  {schoolYears.map((sy) => (
                    <option key={sy.id} value={sy.id}>
                      Năm học {sy.name} ({sy.startDate} → {sy.endDate}) {sy.isCurrent ? '★ (Hiện hành)' : ''}
                    </option>
                  ))}
                  {schoolYears.length === 0 && (
                    <option value="sy-2026-2027">Năm học 2026-2027</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kế hoạch cấp trên trực tiếp (Kế hoạch cha)</label>
                <select
                  value={formParentPlanId}
                  onChange={(e) => setFormParentPlanId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="">-- Kế hoạch độc lập / Cấp cao nhất --</option>
                  {plans.filter((p) => !editingPlan || p.id !== editingPlan.id).map((p) => (
                    <option key={p.id} value={p.id}>
                      [{getTypeLabel(p.type)}] {p.code} - {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã kế hoạch *</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cấp học áp dụng *</label>
                <select
                  value={formSchoolLevel}
                  onChange={(e) => setFormSchoolLevel(e.target.value as SchoolLevelType)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="all">Toàn trường / Liên cấp (Tiểu học & THCS)</option>
                  <option value="primary">Cấp Tiểu học (Khối 1 - 5)</option>
                  <option value="secondary">Cấp THCS (Khối 6 - 9)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tiêu đề kế hoạch *</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ví dụ: Kế hoạch Dạy học Tăng cường Tiếng Việt Khối 3..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhóm kế hoạch</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as PlanType)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="year">Kế hoạch năm học</option>
                  <option value="semester">Kế hoạch học kỳ</option>
                  <option value="month">Kế hoạch tháng</option>
                  <option value="week">Kế hoạch tuần</option>
                  <option value="academic">Chuyên môn & Dạy học</option>
                  <option value="department">Tổ bộ môn</option>
                  <option value="event">Hội thi / Sự kiện</option>
                  <option value="inspection">Kiểm tra & Đánh giá</option>
                  <option value="digital_transformation">Chuyển đổi số</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số cấp duyệt bắt buộc</label>
                <select
                  value={formRequiredTiers}
                  onChange={(e) => setFormRequiredTiers(Number(e.target.value) as 1 | 2)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                >
                  <option value={2}>2 Cấp (Tổ trưởng C1 → BGH C2)</option>
                  <option value={1}>1 Cấp (BGH duyệt trực tiếp)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Đơn vị chủ trì</label>
                <select
                  value={formLeadDept}
                  onChange={(e) => setFormLeadDept(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu *</label>
                <input
                  type="date"
                  required
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày kết thúc *</label>
                <input
                  type="date"
                  required
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Căn cứ & Mục tiêu</label>
              <textarea
                rows={2}
                value={formBasis}
                onChange={(e) => setFormBasis(e.target.value)}
                placeholder="Căn cứ công văn, hướng dẫn nhiệm vụ năm học..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nội dung kế hoạch chi tiết *</label>
              <textarea
                rows={4}
                required
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Các bước triển khai, phân công nhiệm vụ, thời gian thực hiện..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chỉ tiêu phấn đấu</label>
                <input
                  type="text"
                  value={formTargets}
                  onChange={(e) => setFormTargets(e.target.value)}
                  placeholder="Ví dụ: 100% học sinh đạt yêu cầu..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sản phẩm đầu ra bắt buộc</label>
                <input
                  type="text"
                  value={formDeliverables}
                  onChange={(e) => setFormDeliverables(e.target.value)}
                  placeholder="Ví dụ: Kỷ yếu chuyên đề, Biên bản họp, Giáo án..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dự toán kinh phí (VNĐ)</label>
                <input
                  type="number"
                  value={formBudget}
                  onChange={(e) => setFormBudget(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nguồn kinh phí</label>
                <input
                  type="text"
                  value={formBudgetSource}
                  onChange={(e) => setFormBudgetSource(e.target.value)}
                  placeholder="Ngân sách nhà nước / Xã hội hóa..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Post execution updates when editing */}
            {editingPlan && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2.5 rounded-lg border border-blue-100 bg-blue-50/40">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kết quả thực hiện thực tế</label>
                  <input
                    type="text"
                    value={formActualOutcome}
                    onChange={(e) => setFormActualOutcome(e.target.value)}
                    placeholder="Mô tả kết quả đạt được..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kinh phí thực tế đã sử dụng (đ)</label>
                  <input
                    type="number"
                    value={formActualBudget}
                    onChange={(e) => setFormActualBudget(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tỷ lệ hoàn thành (%): {formCompletionRate || 0}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formCompletionRate === '' ? 0 : formCompletionRate}
                    onChange={(e) => setFormCompletionRate(Number(e.target.value))}
                    className="w-full accent-blue-600 mt-2"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={savingPlan}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
              >
                {savingPlan ? 'Đang lưu...' : editingPlan ? 'Cập nhật kế hoạch' : 'Lưu bản nháp'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 3: PHÊ DUYỆT HOẶC TRẢ LẠI (APPROVE / REJECT TIER MODAL)
      ========================================================================== */}
      {approvalModalPlan && (
        <Modal
          isOpen={Boolean(approvalModalPlan)}
          onClose={() => setApprovalModalPlan(null)}
          title={
            approvalActionType === 'approve'
              ? `Ký Duyệt Cấp ${approvalTargetTier}: ${approvalModalPlan.code}`
              : `Trả Lại Yêu Cầu Chỉnh Sửa Cấp ${approvalTargetTier}: ${approvalModalPlan.code}`
          }
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
              <span className="font-bold text-slate-900 block">{approvalModalPlan.title}</span>
              <p className="text-slate-600 text-[11px]">
                Người lập: {approvalModalPlan.responsiblePersonName} • Đơn vị:{' '}
                {departments.find((d) => d.id === approvalModalPlan.leadDepartmentId)?.name || 'Ban Giám hiệu'}
              </p>
              <p className="text-[11px] text-blue-600 font-medium">
                Cấp xét duyệt: {approvalTargetTier === 1 ? 'Cấp 1 (Tổ trưởng chuyên môn)' : 'Cấp 2 (Ban Giám hiệu)'}
              </p>
            </div>

            {/* Anti-self approval warning if detected */}
            {approvalModalPlan.responsiblePersonId === currentUser?.id && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  <strong>Cảnh báo:</strong> Bạn là người lập kế hoạch này. Quy chế nhà trường không cho phép tự phê duyệt!
                </span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {approvalActionType === 'approve' ? 'Ý kiến chỉ đạo / Nhận xét phê duyệt:' : 'Lý do trả lại & Yêu cầu điều chỉnh (Bắt buộc) *:'}
              </label>
              <textarea
                rows={3}
                required={approvalActionType === 'reject'}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={
                  approvalActionType === 'approve'
                    ? 'Nhập ý kiến chỉ đạo thực hiện...'
                    : 'Ghi rõ các nội dung cần bổ sung, chỉnh sửa...'
                }
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovalModalPlan(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={handleExecuteApproval}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-xs ${
                  approvalActionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {submittingAction
                  ? 'Đang xử lý...'
                  : approvalActionType === 'approve'
                  ? `Xác nhận phê duyệt Cấp ${approvalTargetTier}`
                  : `Xác nhận trả lại Cấp ${approvalTargetTier}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 4: CHUYỂN TRẠNG THÁI VẬN HÀNH (TRANSITION STATUS MODAL)
      ========================================================================== */}
      {transitionModalPlan && (
        <Modal
          isOpen={Boolean(transitionModalPlan)}
          onClose={() => setTransitionModalPlan(null)}
          title={`Chuyển trạng thái: ${transitionModalPlan.code}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-700">
              Bạn có chắc chắn muốn chuyển trạng thái kế hoạch <strong>"{transitionModalPlan.title}"</strong> sang{' '}
              <span className="font-bold text-blue-600">"{getStatusLabel(transitionTargetStatus)}"</span>?
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ghi chú thực hiện:</label>
              <input
                type="text"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder="Nhập ghi chú nếu có..."
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTransitionModalPlan(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteTransition}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Xuất Dữ Liệu Kế Hoạch Giáo Dục"
        filename={`ke_hoach_giao_duc_${new Date().toISOString().split('T')[0]}`}
        headers={exportHeaders}
        rows={exportRows}
      />
    </div>
  );
};

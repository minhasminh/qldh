import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api.ts';
import { useAuth } from '../../../context/AuthContext.tsx';
import { useApp } from '../../../context/AppContext.tsx';
import type { Task, TaskPriority, TaskStatus, Attachment } from '../../../types/database.ts';
import { Modal } from '../../common/Modal.tsx';
import { ConfirmDialog } from '../../common/ConfirmDialog.tsx';
import { ExportModal } from '../../common/ExportModal.tsx';
import {
  CheckSquare,
  Plus,
  Search,
  Kanban,
  Table as TableIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  MessageSquare,
  User,
  History,
  Send,
  FileSpreadsheet,
  Download,
  Calendar,
  Edit,
  Trash2,
} from 'lucide-react';

export const TaskList: React.FC = () => {
  const { currentUser, allUsers: ctxUsers, isPrincipal, isAdmin, isDean, isTeacher } = useAuth();
  const { showToast, departments, targetEntityId, setTargetEntityId } = useApp();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [plans, setPlans] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'assigned_to_me' | 'created_by_me'>('all');

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formGuidanceNotes, setFormGuidanceNotes] = useState('');
  const [formPlanId, setFormPlanId] = useState('');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formCoAssignees, setFormCoAssignees] = useState<string[]>([]);
  const [formDeptId, setFormDeptId] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('normal');
  const [formResultReq, setFormResultReq] = useState('');
  const [formProofReq, setFormProofReq] = useState(true);
  const [saving, setSaving] = useState(false);

  // Task Progress & Verification in Detail Modal
  const [progressInput, setProgressInput] = useState(0);
  const [completionNote, setCompletionNote] = useState('');
  const [challengesAndProposals, setChallengesAndProposals] = useState('');
  const [proofList, setProofList] = useState<Attachment[]>([]);
  const [reviewRemark, setReviewRemark] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [tasksData, plansData] = await Promise.all([
        api.getTasks(),
        api.getPlans(),
      ]);
      setTasks(tasksData);
      setPlans(plansData.map((p) => ({ id: p.id, title: p.title })));

      if (targetEntityId) {
        const found = tasksData.find((t) => t.id === targetEntityId);
        if (found) {
          handleOpenDetail(found);
          setTargetEntityId(null);
        } else {
          // If target is a plan, prepare to create task for that plan
          const planFound = plansData.find((p) => p.id === targetEntityId);
          if (planFound) {
            handleOpenCreate();
            setFormPlanId(planFound.id);
            setFormTitle(`Nhiệm vụ triển khai: ${planFound.title}`);
            setTargetEntityId(null);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentUser]);

  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setProgressInput(task.progress);
    setCompletionNote(task.completionNote || '');
    setChallengesAndProposals(task.challengesAndProposals || '');
    setProofList(task.proofs || []);
    setReviewRemark('');
    setNewCommentText('');
  };

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormGuidanceNotes('');
    setFormPlanId('');
    setFormAssigneeId('');
    setFormCoAssignees([]);
    setFormDeptId(currentUser?.departmentId || 'dept-toan-tin');
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    setFormDeadline(deadline.toISOString().split('T')[0]);
    setFormPriority('normal');
    setFormResultReq('');
    setFormProofReq(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description || '');
    setFormGuidanceNotes(task.guidanceNotes || '');
    setFormPlanId(task.planId || '');
    setFormAssigneeId(task.mainAssigneeId);
    setFormCoAssignees(task.coAssigneeIds || []);
    setFormDeptId(task.departmentId);
    setFormDeadline(task.deadline);
    setFormPriority(task.priority);
    setFormResultReq(task.requiredResult || '');
    setFormProofReq(Boolean(task.isProofRequired));
    setSelectedTask(null);
    setIsFormOpen(true);
  };

  const handleSaveTaskForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAssigneeId || !formDeadline) {
      showToast('Vui lòng nhập tên nhiệm vụ, người chịu trách nhiệm và hạn hoàn thành', 'error');
      return;
    }

    setSaving(true);
    try {
      const selectedPlan = plans.find((p) => p.id === formPlanId);
      const payload: Partial<Task> = {
        title: formTitle.trim(),
        description: formDesc.trim(),
        guidanceNotes: formGuidanceNotes.trim() || undefined,
        planId: formPlanId || undefined,
        planTitle: selectedPlan ? selectedPlan.title : undefined,
        mainAssigneeId: formAssigneeId,
        coAssigneeIds: formCoAssignees,
        departmentId: formDeptId,
        deadline: formDeadline,
        priority: formPriority,
        requiredResult: formResultReq.trim(),
        isProofRequired: formProofReq,
      };

      if (editingTask) {
        const updated = await api.updateTask(editingTask.id, payload);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        showToast('Cập nhật nhiệm vụ thành công');
      } else {
        const created = await api.createTask(payload);
        setTasks((prev) => [created, ...prev]);
        showToast('Giao nhiệm vụ thành công');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Assignee updates progress
  const handleUpdateProgress = async () => {
    if (!selectedTask) return;
    try {
      const updated = await api.updateTask(selectedTask.id, {
        progress: progressInput,
        completionNote: completionNote.trim(),
        challengesAndProposals: challengesAndProposals.trim(),
        proofs: proofList,
      });
      setSelectedTask(updated);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast('Đã lưu tiến độ công việc');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Assignee requests verification
  const handleRequestVerification = async () => {
    if (!selectedTask) return;
    if (selectedTask.isProofRequired && proofList.length === 0) {
      showToast('Nhiệm vụ này yêu cầu nộp minh chứng bắt buộc (file/biên bản) trước khi yêu cầu xác nhận.', 'error');
      return;
    }

    try {
      const updated = await api.updateTask(selectedTask.id, {
        progress: 100,
        completionNote: completionNote.trim(),
        challengesAndProposals: challengesAndProposals.trim(),
        proofs: proofList,
        requestVerification: true,
      });
      setSelectedTask(updated);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast('Đã gửi báo cáo chờ người giao việc xác nhận hoàn thành');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Assigner / Authority verifies or requests additions
  const handleVerificationDecision = async (status: 'completed' | 'needs_addition') => {
    if (!selectedTask) return;
    try {
      const updated = await api.updateTask(selectedTask.id, {
        status,
        reviewComment: reviewRemark.trim(),
      });
      setSelectedTask(updated);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast(
        status === 'completed'
          ? 'Đã xác nhận hoàn thành nhiệm vụ'
          : 'Đã gửi yêu cầu bổ sung báo cáo/minh chứng'
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Post comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;
    try {
      const added = await api.addTaskComment(selectedTask.id, newCommentText.trim());
      const updatedTask = {
        ...selectedTask,
        comments: [...(selectedTask.comments || []), added],
      };
      setSelectedTask(updatedTask);
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      setNewCommentText('');
      showToast('Đã gửi trao đổi');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Upload proof file
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
        setProofList((prev) => [...prev, uploaded]);
        showToast(`Đã tải lên minh chứng: ${file.name}`);
      } catch (err: any) {
        showToast(err.message, 'error');
      } finally {
        setUploadingProof(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const kanbanColumns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'not_started', title: 'Chưa thực hiện', color: 'border-slate-300 bg-slate-50' },
    { id: 'in_progress', title: 'Đang thực hiện', color: 'border-blue-300 bg-blue-50/30' },
    { id: 'pending_verification', title: 'Chờ xác nhận', color: 'border-amber-300 bg-amber-50/40' },
    { id: 'needs_addition', title: 'Yêu cầu bổ sung', color: 'border-purple-300 bg-purple-50/30' },
    { id: 'completed', title: 'Đã hoàn thành', color: 'border-emerald-300 bg-emerald-50/30' },
    { id: 'overdue', title: 'Quá hạn', color: 'border-rose-300 bg-rose-50/40' },
  ];

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.mainAssigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchDept = deptFilter === 'all' || t.departmentId === deptFilter;
    const matchPlan = planFilter === 'all' || t.planId === planFilter;
    const matchScope =
      scopeFilter === 'all' ||
      (scopeFilter === 'assigned_to_me' && (t.mainAssigneeId === currentUser?.id || t.coAssigneeIds?.includes(currentUser?.id || ''))) ||
      (scopeFilter === 'created_by_me' && t.assignerId === currentUser?.id);

    return matchSearch && matchStatus && matchDept && matchPlan && matchScope;
  });

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800">Khẩn cấp</span>;
      case 'high':
        return <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">Cao</span>;
      case 'low':
        return <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600">Thấp</span>;
      default:
        return <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-700">Bình thường</span>;
    }
  };

  // Export Data
  const exportHeaders = ['STT', 'Tên nhiệm vụ', 'Người thực hiện', 'Người giao', 'Hạn chót', 'Tiến độ (%)', 'Trạng thái', 'Mức độ', 'Yêu cầu minh chứng'];
  const exportRows = filteredTasks.map((t, i) => [
    i + 1,
    t.title,
    t.mainAssigneeName,
    t.assignerName,
    t.deadline,
    t.progress,
    t.status,
    t.priority,
    t.isProofRequired ? 'Bắt buộc' : 'Không',
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Giao Việc & Theo Dõi Tiến Độ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân công công tác, cập nhật tiến độ, nộp minh chứng và phê duyệt hoàn thành nhiệm vụ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Bảng Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Danh sách</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {(isPrincipal || isAdmin || isDean) && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Giao nhiệm vụ</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên nhiệm vụ, người thực hiện, người giao..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="not_started">Chưa thực hiện</option>
            <option value="in_progress">Đang thực hiện</option>
            <option value="pending_verification">Chờ xác nhận</option>
            <option value="needs_addition">Yêu cầu bổ sung</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="overdue">Quá hạn</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">Tất cả tổ / bộ phận</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden max-w-[160px] truncate"
          >
            <option value="all">Tất cả kế hoạch</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as any)}
            className="rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-1.5 text-xs font-semibold text-blue-900 focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">Phạm vi: Tất cả</option>
            <option value="assigned_to_me">Nhiệm vụ của tôi (Chính/Phối hợp)</option>
            <option value="created_by_me">Nhiệm vụ tôi đã giao</option>
          </select>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className={`flex flex-col rounded-xl border p-3 min-h-[480px] ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                  <span className="text-xs font-bold text-slate-900">{col.title}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-2xs tabular-nums">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards in Column */}
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center text-[11px] text-slate-400 italic">
                      Trống
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleOpenDetail(t)}
                        className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          {getPriorityBadge(t.priority)}
                          <span className="text-[10px] font-bold text-blue-700 tabular-nums">
                            {t.progress}%
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-900 line-clamp-2">
                          {t.title}
                        </p>

                        {t.planTitle && (
                          <span className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-700 block truncate">
                            KH: {t.planTitle}
                          </span>
                        )}

                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <p className="flex items-center gap-1 truncate font-medium text-slate-700">
                            <User className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {t.mainAssigneeName}
                              {t.coAssigneeNames && t.coAssigneeNames.length > 0 ? ` (+${t.coAssigneeNames.length} phối hợp)` : ''}
                            </span>
                          </p>
                          <p className="flex items-center gap-1 truncate">
                            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate tabular-nums">
                              Hạn: {new Date(t.deadline).toLocaleDateString('vi-VN')}
                            </span>
                          </p>
                        </div>

                        {/* Mini progress line */}
                        <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${
                              t.status === 'completed'
                                ? 'bg-emerald-500'
                                : t.status === 'overdue'
                                ? 'bg-rose-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase bg-slate-50/60">
                <th className="py-2.5 px-3">Tên nhiệm vụ</th>
                <th className="py-2.5 px-3">Người thực hiện</th>
                <th className="py-2.5 px-3">Người giao</th>
                <th className="py-2.5 px-3">Hạn hoàn thành</th>
                <th className="py-2.5 px-3">Tiến độ</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleOpenDetail(t)}>
                  <td className="py-3 px-3 font-semibold text-slate-900 max-w-xs">
                    <p className="truncate">{t.title}</p>
                    {t.planTitle && <p className="text-[10px] text-slate-400 truncate">Từ: {t.planTitle}</p>}
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">
                    <p>{t.mainAssigneeName}</p>
                    {t.coAssigneeNames && t.coAssigneeNames.length > 0 && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[150px]">PH: {t.coAssigneeNames.join(', ')}</p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-500">{t.assignerName}</td>
                  <td className="py-3 px-3 tabular-nums text-slate-700">
                    {new Date(t.deadline).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3 px-3 tabular-nums font-bold text-blue-700">{t.progress}%</td>
                  <td className="py-3 px-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800">
                      {kanbanColumns.find((c) => c.id === t.status)?.title || t.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(t);
                      }}
                      className="text-blue-700 font-semibold hover:underline"
                    >
                      Báo cáo / Duyệt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL, REPORTING & VERIFICATION MODAL */}
      <Modal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title || 'Chi tiết nhiệm vụ'}
        subtitle={`Người giao: ${selectedTask?.assignerName} · Người thực hiện: ${selectedTask?.mainAssigneeName}`}
        maxWidth="4xl"
        actions={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {(isPrincipal || isAdmin || selectedTask?.assignerId === currentUser?.id) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTask) handleOpenEdit(selectedTask);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                    <span>Sửa nhiệm vụ</span>
                  </button>
                  {selectedTask && selectedTask.status !== 'completed' && selectedTask.progress === 0 && (!selectedTask.proofs || selectedTask.proofs.length === 0) && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Xác nhận xóa nhiệm vụ "${selectedTask.title}"?`)) return;
                        try {
                          await api.deleteTask(selectedTask.id);
                          showToast('Đã xóa nhiệm vụ');
                          setSelectedTask(null);
                          setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
                        } catch (err: any) {
                          showToast(err.message, 'error');
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                      <span>Xóa</span>
                    </button>
                  )}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedTask(null)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedTask && (
          <div className="space-y-5 text-xs">
            {/* Status & Deadline Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Trạng thái:</span>
                <p className="font-bold text-slate-900">
                  {kanbanColumns.find((c) => c.id === selectedTask.status)?.title}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Hạn hoàn thành:</span>
                <p className="font-bold text-slate-900 tabular-nums">
                  {new Date(selectedTask.deadline).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Tiến độ hiện tại:</span>
                <p className="font-bold text-blue-700 tabular-nums text-sm">
                  {selectedTask.progress}%
                </p>
              </div>
              <div>
                <span className="text-slate-500">Minh chứng bắt buộc:</span>
                <p className="font-bold text-slate-900">
                  {selectedTask.isProofRequired ? 'Có bắt buộc' : 'Không'}
                </p>
              </div>
            </div>

            {/* Plan association & Co-assignees banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg border border-blue-100 bg-blue-50/40">
              <div>
                <span className="text-[11px] text-slate-500 block">Kế hoạch triển khai:</span>
                <p className="font-bold text-blue-900 text-xs mt-0.5 truncate">
                  {selectedTask.planTitle ? `KH: ${selectedTask.planTitle}` : 'Nhiệm vụ độc lập'}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Người phối hợp cùng thực hiện:</span>
                <p className="font-bold text-slate-800 text-xs mt-0.5 truncate">
                  {selectedTask.coAssigneeNames && selectedTask.coAssigneeNames.length > 0
                    ? selectedTask.coAssigneeNames.join(', ')
                    : 'Không có'}
                </p>
              </div>
            </div>

            {/* Description & Requirements */}
            <div className="space-y-2">
              <div>
                <span className="font-bold text-slate-900 uppercase">Yêu cầu nhiệm vụ:</span>
                <p className="mt-1 leading-relaxed text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedTask.description || 'Không có mô tả chi tiết'}
                </p>
              </div>

              {selectedTask.requiredResult && (
                <div>
                  <span className="font-bold text-slate-900 uppercase">Kết quả cần đạt:</span>
                  <p className="mt-0.5 text-slate-800 italic">{selectedTask.requiredResult}</p>
                </div>
              )}

              {selectedTask.guidanceNotes && (
                <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-indigo-950">
                  <span className="font-bold block text-[11px] uppercase tracking-wider text-indigo-900">
                    Tài liệu hướng dẫn & Chỉ đạo thực hiện:
                  </span>
                  <p className="mt-1 leading-relaxed whitespace-pre-wrap text-slate-800">{selectedTask.guidanceNotes}</p>
                </div>
              )}
            </div>

            {/* Verification Success Banner */}
            {selectedTask.status === 'completed' && selectedTask.verifiedByName && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-emerald-900">Đã được nghiệm thu & xác nhận hoàn thành</span>
                  <p className="text-xs text-slate-700">
                    Người xác nhận: <strong>{selectedTask.verifiedByName}</strong> • Thời điểm:{' '}
                    <span className="tabular-nums font-medium">
                      {selectedTask.verifiedAt ? new Date(selectedTask.verifiedAt).toLocaleString('vi-VN') : ''}
                    </span>
                  </p>
                  {selectedTask.reviewComment && (
                    <p className="text-xs italic text-slate-600 mt-1">"{selectedTask.reviewComment}"</p>
                  )}
                </div>
              </div>
            )}

            {/* Rejection / Addition Request Banner */}
            {selectedTask.status === 'needs_addition' && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-900">Yêu cầu bổ sung báo cáo / minh chứng:</span>
                  <p className="mt-1 text-xs text-rose-800 font-medium">
                    {selectedTask.rejectionReason || selectedTask.reviewComment || 'Vui lòng bổ sung minh chứng và giải trình kết quả đầy đủ.'}
                  </p>
                </div>
              </div>
            )}

            {/* Review Comment if available */}
            {selectedTask.reviewComment && selectedTask.status !== 'completed' && selectedTask.status !== 'needs_addition' && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <span className="font-bold">Ý kiến phản hồi / Nhận xét của người giao việc:</span>
                <p className="mt-1 leading-relaxed">{selectedTask.reviewComment}</p>
              </div>
            )}

            {/* ASSIGNEE PROGRESS & PROOF SECTION */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/20 p-4 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center justify-between">
                <span>Cập nhật tiến độ & Nộp minh chứng (Người thực hiện)</span>
                <span className="text-blue-700 font-semibold">{progressInput}%</span>
              </h4>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progressInput}
                onChange={(e) => setProgressInput(Number(e.target.value))}
                className="w-full accent-blue-600"
              />

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Nội dung báo cáo kết quả thực hiện:
                </label>
                <textarea
                  rows={2}
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Mô tả kết quả đã làm được, tiến trình đạt được..."
                  className="w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Giải trình khó khăn & Đề xuất hỗ trợ (nếu có):
                </label>
                <textarea
                  rows={2}
                  value={challengesAndProposals}
                  onChange={(e) => setChallengesAndProposals(e.target.value)}
                  placeholder="Nêu rõ vướng mắc, khó khăn cơ sở vật chất, chuyên môn hoặc đề xuất BGH hỗ trợ..."
                  className="w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Proofs List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-800">
                    Minh chứng đính kèm ({proofList.length}):
                  </span>
                  <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    <span>{uploadingProof ? 'Đang tải...' : 'Tải lên minh chứng'}</span>
                    <input
                      type="file"
                      onChange={handleUploadProof}
                      disabled={uploadingProof}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                  </label>
                </div>

                {proofList.length > 0 && (
                  <div className="space-y-1">
                    {proofList.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs"
                      >
                        <span className="truncate pr-2 font-medium text-slate-700">{p.name}</span>
                        <a
                          href={p.url}
                          download={p.name}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline shrink-0 text-[11px]"
                        >
                          Tải về
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons for Assignee */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleUpdateProgress}
                  className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Lưu tiến độ
                </button>
                <button
                  type="button"
                  onClick={handleRequestVerification}
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white hover:bg-blue-500 shadow-xs"
                >
                  Gửi báo cáo chờ nghiệm thu
                </button>
              </div>
            </div>

            {/* ASSIGNER / AUTHORITY VERIFICATION SECTION */}
            {(isPrincipal || isAdmin || selectedTask.assignerId === currentUser?.id || isDean) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase">
                  Nghiệm thu & Phê duyệt kết quả (Dành cho Người giao việc / BGH)
                </h4>

                {selectedTask.challengesAndProposals && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <span className="font-bold block text-amber-950">Giải trình khó khăn & Đề xuất từ người thực hiện:</span>
                    <p className="mt-1 whitespace-pre-wrap text-slate-800">{selectedTask.challengesAndProposals}</p>
                  </div>
                )}

                <textarea
                  rows={2}
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
                  placeholder="Nhận xét chất lượng minh chứng, đánh giá kết quả hoàn thành..."
                  className="w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:outline-hidden"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerificationDecision('needs_addition')}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Yêu cầu bổ sung
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerificationDecision('completed')}
                    className="rounded-lg bg-emerald-600 px-3.5 py-1.5 font-semibold text-white hover:bg-emerald-500 shadow-xs"
                  >
                    Xác nhận hoàn thành nhiệm vụ
                  </button>
                </div>
              </div>
            )}

            {/* Task History Timeline */}
            {selectedTask.history && selectedTask.history.length > 0 && (
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <History className="h-4 w-4 text-blue-600" />
                  Nhật ký tiến độ & Nghiệm thu ({selectedTask.history.length}):
                </span>
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden text-[11px]">
                  {selectedTask.history.map((h) => (
                    <div key={h.id} className="p-2 flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800">{h.action}</span>
                        {h.note && <p className="text-slate-600 mt-0.5">{h.note}</p>}
                      </div>
                      <div className="text-right shrink-0 text-slate-400 tabular-nums">
                        <span className="font-medium text-slate-600">{h.actorName}</span>
                        <p className="text-[10px]">{new Date(h.timestamp).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMMENTS & EXCHANGE THREAD */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Trao đổi & Hướng dẫn thực hiện ({selectedTask.comments?.length || 0}):
              </h4>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedTask.comments?.length === 0 ? (
                  <p className="text-slate-400 italic">Chưa có ý kiến trao đổi nào.</p>
                ) : (
                  selectedTask.comments?.map((cmt) => (
                    <div key={cmt.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-900">{cmt.authorName}</span>
                        <span className="text-slate-400 tabular-nums">
                          {new Date(cmt.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{cmt.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Gửi ý kiến phản hồi hoặc câu hỏi liên quan đến nhiệm vụ..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-white font-semibold hover:bg-blue-500 flex items-center gap-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Gửi</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE / EDIT TASK MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTask ? 'Chỉnh sửa nhiệm vụ' : 'Giao nhiệm vụ mới'}
        subtitle="Chỉ định người chịu trách nhiệm chính, kết quả cần đạt và thời hạn bắt buộc"
        maxWidth="2xl"
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
              onClick={handleSaveTaskForm}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
            >
              {saving ? 'Đang lưu...' : editingTask ? 'Lưu cập nhật' : 'Giao việc'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveTaskForm} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tên nhiệm vụ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="VD: Biên soạn đề kiểm tra giữa học kỳ I môn Toán khối 10"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Kế hoạch liên quan (nếu có)
              </label>
              <select
                value={formPlanId}
                onChange={(e) => setFormPlanId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="">Nhiệm vụ độc lập</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Tổ / Bộ phận phụ trách
              </label>
              <select
                value={formDeptId}
                onChange={(e) => setFormDeptId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
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
              <label className="block font-bold text-slate-900 mb-1">
                Người chịu trách nhiệm chính <span className="text-rose-500">*</span>
              </label>
              <select
                value={formAssigneeId}
                onChange={(e) => setFormAssigneeId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="">-- Chọn cán bộ / giáo viên --</option>
                {ctxUsers
                  .filter((u) => u.status === 'active')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.title})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Hạn hoàn thành <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Người phối hợp cùng thực hiện ({formCoAssignees.length})
            </label>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50 max-h-32 overflow-y-auto">
              {ctxUsers
                .filter((u) => u.status === 'active' && u.id !== formAssigneeId)
                .map((u) => {
                  const isSelected = formCoAssignees.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setFormCoAssignees((prev) =>
                          isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                        );
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{u.fullName}</span>
                      <span>{isSelected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Mức độ ưu tiên
            </label>
            <div className="flex gap-4">
              {(['low', 'normal', 'high', 'urgent'] as TaskPriority[]).map((pr) => (
                <label key={pr} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={pr}
                    checked={formPriority === pr}
                    onChange={() => setFormPriority(pr)}
                    className="text-blue-600"
                  />
                  <span>
                    {pr === 'urgent'
                      ? 'Khẩn cấp'
                      : pr === 'high'
                      ? 'Cao'
                      : pr === 'low'
                      ? 'Thấp'
                      : 'Bình thường'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Yêu cầu nhiệm vụ chi tiết
            </label>
            <textarea
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Nội dung công việc, tiêu chuẩn kỹ thuật hoặc chuyên môn..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tài liệu hướng dẫn & Chỉ đạo thực hiện
            </label>
            <textarea
              rows={2}
              value={formGuidanceNotes}
              onChange={(e) => setFormGuidanceNotes(e.target.value)}
              placeholder="Văn bản quy phạm, đường dẫn tài liệu hướng dẫn, lưu ý của Ban Giám hiệu..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Kết quả cần đạt & Minh chứng bắt buộc
            </label>
            <input
              type="text"
              value={formResultReq}
              onChange={(e) => setFormResultReq(e.target.value)}
              placeholder="VD: 02 bộ ma trận đề, file đề Word kèm đáp án và hướng dẫn chấm"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>

          <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formProofReq}
              onChange={(e) => setFormProofReq(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>Bắt buộc phải tải lên tệp minh chứng khi báo cáo hoàn thành</span>
          </label>
        </form>
      </Modal>

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Xuất bảng theo dõi tiến độ nhiệm vụ"
        filename={`Tien_do_nhiem_vu_${new Date().toISOString().split('T')[0]}`}
        headers={exportHeaders}
        rows={exportRows}
      />
    </div>
  );
};

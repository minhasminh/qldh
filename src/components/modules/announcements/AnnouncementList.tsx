import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api.ts';
import { useAuth } from '../../../context/AuthContext.tsx';
import { useApp } from '../../../context/AppContext.tsx';
import type { Announcement, AnnouncementCategory, AnnouncementPriority, Attachment, User } from '../../../types/database.ts';
import { Modal } from '../../common/Modal.tsx';
import { ConfirmDialog } from '../../common/ConfirmDialog.tsx';
import { ExportModal } from '../../common/ExportModal.tsx';
import {
  Bell,
  Search,
  Plus,
  Pin,
  Paperclip,
  Eye,
  FileText,
  Trash2,
  Edit,
  Download,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  Send,
  Ban,
  Clock,
  RotateCcw,
  CheckCheck,
  AlertCircle,
  Calendar,
  Globe,
  Lock,
} from 'lucide-react';

export const AnnouncementList: React.FC = () => {
  const { currentUser, isPrincipal, isAdmin, isDean, isTeacher } = useAuth();
  const { showToast, departments, targetEntityId, setTargetEntityId } = useApp();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab Filtering
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'pending' | 'draft' | 'revoked_expired' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals state
  const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Reader Tracking Modal State
  const [readerModalItem, setReaderModalItem] = useState<Announcement | null>(null);
  const [readerData, setReaderData] = useState<{
    readRecords: {
      userId: string;
      userName: string;
      userRole: string;
      departmentName?: string;
      readAt: string;
    }[];
    unreadUsers: {
      id: string;
      fullName: string;
      role: string;
      departmentName?: string;
    }[];
    totalExpected: number;
    readCount: number;
    readPercentage: number;
  } | null>(null);
  const [loadingReaders, setLoadingReaders] = useState(false);
  const [readerTab, setReaderTab] = useState<'unread' | 'read'>('unread');
  const [reminding, setReminding] = useState(false);

  // Revoke Modal State
  const [revokingItem, setRevokingItem] = useState<Announcement | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('general');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('normal');
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formAudience, setFormAudience] = useState<'all' | 'principals' | 'deans' | 'teachers' | 'departments' | 'users'>('all');
  const [formSelectedDepts, setFormSelectedDepts] = useState<string[]>([]);
  const [formSelectedUsers, setFormSelectedUsers] = useState<string[]>([]);
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formStatus, setFormStatus] = useState<'draft' | 'pending' | 'published'>('published');
  const [formAttachments, setFormAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const [data, usersData] = await Promise.all([
        api.getAnnouncements(),
        api.getUsers().catch(() => []),
      ]);
      setAnnouncements(data);
      setAvailableUsers(usersData);

      if (targetEntityId) {
        const found = data.find((a) => a.id === targetEntityId);
        if (found) {
          handleViewDetail(found);
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
    fetchAnnouncements();
  }, [currentUser]);

  const handleViewDetail = async (item: Announcement) => {
    setSelectedItem(item);
    if (currentUser && !item.readUserIds?.includes(currentUser.id)) {
      try {
        await api.markAnnouncementRead(item.id);
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === item.id
              ? {
                  ...a,
                  readCount: a.readCount + 1,
                  readUserIds: [...(a.readUserIds || []), currentUser.id],
                }
              : a
          )
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleTogglePin = async (item: Announcement) => {
    try {
      const updated = await api.togglePinAnnouncement(item.id);
      setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast(updated.isPinned ? 'Đã ghim thông báo lên đầu danh sách' : 'Đã bỏ ghim thông báo');
      if (selectedItem?.id === item.id) setSelectedItem(updated);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmit = async (item: Announcement) => {
    try {
      const updated = await api.submitAnnouncement(item.id);
      setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast('Đã gửi thông báo cho Ban Giám hiệu phê duyệt');
      if (selectedItem?.id === item.id) setSelectedItem(updated);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handlePublish = async (item: Announcement) => {
    try {
      const updated = await api.publishAnnouncement(item.id);
      setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast('Ban Giám hiệu đã công bố thông báo thành công');
      if (selectedItem?.id === item.id) setSelectedItem(updated);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenRevoke = (item: Announcement) => {
    setRevokingItem(item);
    setRevokeReason('');
  };

  const handleConfirmRevoke = async () => {
    if (!revokingItem) return;
    try {
      const updated = await api.revokeAnnouncement(revokingItem.id, revokeReason.trim());
      setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast('Đã thu hồi thông báo');
      setRevokingItem(null);
      if (selectedItem?.id === revokingItem.id) setSelectedItem(updated);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExpire = async (item: Announcement) => {
    try {
      const updated = await api.expireAnnouncement(item.id);
      setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast('Đã chuyển trạng thái thông báo sang hết hạn');
      if (selectedItem?.id === item.id) setSelectedItem(updated);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenReaders = async (item: Announcement) => {
    setReaderModalItem(item);
    setLoadingReaders(true);
    setReaderData(null);
    try {
      const data = await api.getAnnouncementReaders(item.id);
      setReaderData(data);
      setReaderTab(data.unreadUsers.length > 0 ? 'unread' : 'read');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoadingReaders(false);
    }
  };

  const handleSendReminder = async () => {
    if (!readerModalItem) return;
    setReminding(true);
    try {
      const res = await api.sendAnnouncementReminder(readerModalItem.id);
      showToast(res.message);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setReminding(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormSummary('');
    setFormContent('');
    setFormCategory('general');
    setFormPriority('normal');
    setFormIsPublic(false);
    setFormAudience('all');
    setFormSelectedDepts([]);
    setFormSelectedUsers([]);
    setFormExpiresAt('');
    setFormIsPinned(false);
    setFormStatus(isPrincipal || isAdmin ? 'published' : 'pending');
    setFormAttachments([]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Announcement) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormSummary(item.summary || '');
    setFormContent(item.content);
    setFormCategory(item.category);
    setFormPriority(item.priority);
    setFormIsPublic(item.isPublic);
    setFormAudience(item.targetAudience as any);
    setFormSelectedDepts(item.targetDepartmentIds || []);
    setFormSelectedUsers(item.targetUserIds || []);
    setFormExpiresAt(item.expiresAt ? item.expiresAt.split('T')[0] : '');
    setFormIsPinned(item.isPinned);
    setFormStatus(item.status as any);
    setFormAttachments(item.attachments || []);
    setIsFormOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
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
        setFormAttachments((prev) => [...prev, uploaded]);
        showToast(`Đã đính kèm tệp ${file.name}`);
      } catch (err: any) {
        showToast(err.message, 'error');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = (id: string) => {
    setFormAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      showToast('Vui lòng điền tiêu đề và nội dung thông báo', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Announcement> = {
        title: formTitle.trim(),
        summary: formSummary.trim() || formContent.trim().substring(0, 160),
        content: formContent.trim(),
        category: formCategory,
        priority: formPriority,
        isPublic: formIsPublic,
        targetAudience: formAudience,
        targetDepartmentIds: formAudience === 'departments' ? formSelectedDepts : [],
        targetUserIds: formAudience === 'users' ? formSelectedUsers : [],
        expiresAt: formExpiresAt || undefined,
        isPinned: formIsPinned,
        status: formStatus,
        attachments: formAttachments,
      };

      if (editingItem) {
        const updated = await api.updateAnnouncement(editingItem.id, payload);
        setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        showToast('Cập nhật thông báo thành công');
      } else {
        const created = await api.createAnnouncement(payload);
        setAnnouncements((prev) => [created, ...prev]);
        showToast('Tạo và phát hành thông báo thành công');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.deleteAnnouncement(deleteConfirmId);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteConfirmId));
      showToast('Đã thu hồi / xóa thông báo thành công');
      setDeleteConfirmId(null);
      if (selectedItem?.id === deleteConfirmId) {
        setSelectedItem(null);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filtered List
  const filteredList = announcements.filter((item) => {
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authorName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchStatus = selectedStatus === 'all' || item.status === selectedStatus;

    return matchSearch && matchCat && matchStatus;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'academic':
        return 'Chuyên môn dạy học';
      case 'management':
        return 'Chỉ đạo điều hành';
      case 'union':
        return 'Đoàn thể - Phong trào';
      case 'urgent':
        return 'Khẩn cấp';
      default:
        return 'Thông báo chung';
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Khẩn cấp</span>;
      case 'high':
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Quan trọng</span>;
      default:
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">Bình thường</span>;
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'published':
        return <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Đã công bố</span>;
      case 'pending':
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Chờ duyệt</span>;
      case 'draft':
        return <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Bản nháp</span>;
      case 'withdrawn':
        return <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Đã thu hồi</span>;
      default:
        return null;
    }
  };

  // Prepare export data
  const exportHeaders = ['STT', 'Tiêu đề', 'Danh mục', 'Mức độ', 'Đối tượng', 'Trạng thái', 'Người phát hành', 'Lượt đọc', 'Ngày tạo'];
  const exportRows = filteredList.map((a, i) => [
    i + 1,
    a.title,
    getCategoryLabel(a.category),
    a.priority,
    a.targetAudience === 'all' ? 'Toàn trường' : a.targetAudience,
    a.status === 'published' ? 'Đã công bố' : a.status,
    a.authorName,
    a.readCount,
    new Date(a.createdAt).toLocaleDateString('vi-VN'),
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản Lý & Phát Hành Thông Báo
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phát hành chỉ thị, hướng dẫn chuyên môn và thông tri điều hành nội bộ nhà trường
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

          {(isPrincipal || isAdmin || isDean || isTeacher) && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo thông báo</span>
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
            placeholder="Tìm theo tiêu đề, nội dung, người phát hành..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">Tất cả danh mục</option>
            <option value="management">Chỉ đạo điều hành</option>
            <option value="academic">Chuyên môn dạy học</option>
            <option value="union">Đoàn thể - Phong trào</option>
            <option value="urgent">Khẩn cấp</option>
            <option value="general">Thông báo chung</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã công bố</option>
            <option value="pending">Chờ duyệt</option>
            <option value="draft">Bản nháp</option>
          </select>
        </div>
      </div>

      {/* List Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Đang tải danh sách thông báo...</div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Không tìm thấy thông báo nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div
                  onClick={() => handleViewDetail(item)}
                  className="flex-1 cursor-pointer space-y-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {item.isPinned && (
                      <span className="flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                        <Pin className="h-3 w-3" /> Ghim
                      </span>
                    )}
                    {getPriorityBadge(item.priority)}
                    {getStatusBadge(item.status)}
                    <span className="text-xs text-slate-500">
                      {getCategoryLabel(item.category)}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">
                      {item.isPublic ? 'Công khai toàn trường' : 'Nội bộ'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 hover:text-blue-700 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.summary || item.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                    <span>Người đăng: <strong className="text-slate-700">{item.authorName}</strong></span>
                    <span>·</span>
                    <span>Ngày: <strong className="tabular-nums text-slate-700">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</strong></span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-slate-400" />
                      <span className="tabular-nums font-semibold text-slate-700">{item.readCount}</span> lượt xem
                    </span>
                    {item.attachments?.length > 0 && (
                      <span className="flex items-center gap-1 text-blue-700 font-medium">
                        <Paperclip className="h-3 w-3" />
                        <span>{item.attachments.length} tệp đính kèm</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewDetail(item)}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700 transition-colors"
                    title="Xem chi tiết"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {(isPrincipal || isAdmin || item.authorId === currentUser?.id) && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700 transition-colors"
                        title="Chỉnh sửa thông báo"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Thu hồi / Xóa thông báo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title || 'Chi tiết thông báo'}
        subtitle={`Người phát hành: ${selectedItem?.authorName} · Ngày: ${selectedItem ? new Date(selectedItem.createdAt).toLocaleDateString('vi-VN') : ''}`}
        maxWidth="4xl"
        actions={
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Đóng
          </button>
        }
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
              {selectedItem.isPinned && (
                <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                  Đã ghim
                </span>
              )}
              {getPriorityBadge(selectedItem.priority)}
              {getStatusBadge(selectedItem.status)}
              <span className="text-xs text-slate-500">
                Danh mục: <strong>{getCategoryLabel(selectedItem.category)}</strong>
              </span>
              <span className="text-xs text-slate-500">
                Lượt đọc: <strong className="tabular-nums">{selectedItem.readCount}</strong>
              </span>
            </div>

            {selectedItem.summary && (
              <div className="rounded-lg bg-blue-50/50 p-3 text-xs text-blue-900 italic border border-blue-100">
                <strong>Tóm tắt:</strong> {selectedItem.summary}
              </div>
            )}

            <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed py-2">
              {selectedItem.content}
            </div>

            {/* Attachments */}
            {selectedItem.attachments?.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-blue-600" />
                  Tài liệu và hồ sơ đính kèm ({selectedItem.attachments.length}):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedItem.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {att.name}
                        </span>
                      </div>
                      <a
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Tải tệp xuống"
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

      {/* CREATE / EDIT FORM MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? 'Chỉnh sửa thông báo' : 'Soạn và phát hành thông báo mới'}
        maxWidth="4xl"
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
              {saving ? 'Đang lưu...' : editingItem ? 'Cập nhật' : 'Phát hành thông báo'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveForm} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Tiêu đề thông báo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="VD: Thông báo lịch kiểm tra giữa học kỳ I năm học 2026 - 2027"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Danh mục
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="general">Thông báo chung</option>
                <option value="academic">Chuyên môn dạy học</option>
                <option value="management">Chỉ đạo điều hành</option>
                <option value="union">Đoàn thể - Phong trào</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Mức độ ưu tiên
              </label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="normal">Bình thường</option>
                <option value="high">Quan trọng</option>
                <option value="urgent">Khẩn cấp (Báo động)</option>
                <option value="low">Tham khảo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Trạng thái phát hành
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                {(isPrincipal || isAdmin) && <option value="published">Đã công bố (Phát hành ngay)</option>}
                <option value="pending">Gửi Ban Giám hiệu duyệt</option>
                <option value="draft">Bản nháp nội bộ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Đối tượng tiếp nhận
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  value="all"
                  checked={formAudience === 'all'}
                  onChange={() => setFormAudience('all')}
                  className="text-blue-600"
                />
                <span>Toàn trường</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  value="principals"
                  checked={formAudience === 'principals'}
                  onChange={() => setFormAudience('principals')}
                  className="text-blue-600"
                />
                <span>Ban Giám hiệu</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  value="deans"
                  checked={formAudience === 'deans'}
                  onChange={() => setFormAudience('deans')}
                  className="text-blue-600"
                />
                <span>Tổ trưởng CM</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  value="departments"
                  checked={formAudience === 'departments'}
                  onChange={() => setFormAudience('departments')}
                  className="text-blue-600"
                />
                <span>Theo tổ/bộ phận</span>
              </label>
            </div>
          </div>

          {formAudience === 'departments' && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <p className="text-xs font-semibold text-slate-700">Chọn các tổ nhận thông báo:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {departments.map((dept) => (
                  <label key={dept.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={formSelectedDepts.includes(dept.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormSelectedDepts([...formSelectedDepts, dept.id]);
                        } else {
                          setFormSelectedDepts(formSelectedDepts.filter((id) => id !== dept.id));
                        }
                      }}
                      className="rounded text-blue-600"
                    />
                    <span className="truncate">{dept.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Tóm tắt nội dung
            </label>
            <input
              type="text"
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              placeholder="Tóm tắt ngắn gọn để hiển thị trên dashboard và danh sách"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Nội dung thông báo chi tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={6}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Nhập toàn văn thông báo chỉ đạo, căn cứ pháp lý, nội dung phân công..."
              required
              className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Tùy chọn ghim & công khai */}
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsPinned}
                onChange={(e) => setFormIsPinned(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Ghim thông báo lên đầu trang tổng quan</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsPublic}
                onChange={(e) => setFormIsPublic(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Hiển thị công khai trên Website nhà trường</span>
            </label>
          </div>

          {/* Attachments Section */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-900">
                Tệp đính kèm (PDF, Word, Excel, Hình ảnh)
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
                <Plus className="h-3.5 w-3.5" />
                <span>{uploading ? 'Đang tải lên...' : 'Thêm tệp'}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                />
              </label>
            </div>

            {formAttachments.length > 0 && (
              <div className="space-y-1.5">
                {formAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700"
                  >
                    <span className="truncate pr-2">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-rose-600 hover:text-rose-800 text-xs shrink-0"
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

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Thu hồi / Xóa thông báo"
        message="Bạn có chắc chắn muốn thu hồi hoặc xóa thông báo này khỏi hệ thống? Thao tác này sẽ được ghi vào nhật ký kiểm toán hệ thống."
        confirmText="Xác nhận xóa"
        type="danger"
      />

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Xuất danh sách thông báo điều hành"
        filename={`Danh_sach_thong_bao_${new Date().toISOString().split('T')[0]}`}
        headers={exportHeaders}
        rows={exportRows}
      />
    </div>
  );
};

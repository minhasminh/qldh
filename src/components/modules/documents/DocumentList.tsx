import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api.ts';
import { useAuth } from '../../../context/AuthContext.tsx';
import { useApp } from '../../../context/AppContext.tsx';
import type { DocumentItem, DocumentType, Attachment } from '../../../types/database.ts';
import { Modal } from '../../common/Modal.tsx';
import { ExportModal } from '../../common/ExportModal.tsx';
import {
  FolderArchive,
  Search,
  Plus,
  Download,
  FileText,
  Filter,
  FileSpreadsheet,
  Lock,
  Globe,
  Eye,
  Calendar,
  Building,
} from 'lucide-react';

export const DocumentList: React.FC = () => {
  const { currentUser, isPrincipal, isAdmin, isDean } = useAuth();
  const { showToast, departments, targetEntityId, setTargetEntityId } = useApp();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modals
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<DocumentType>('decision');
  const [formDeptId, setFormDeptId] = useState('');
  const [formIssuedDate, setFormIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formSigner, setFormSigner] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formFile, setFormFile] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments();
      setDocuments(data);

      if (targetEntityId) {
        const found = data.find((d) => d.id === targetEntityId);
        if (found) {
          setSelectedDoc(found);
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
    fetchDocuments();
  }, [currentUser]);

  const handleOpenCreate = () => {
    setFormCode(`${Math.floor(10 + Math.random() * 90)}/QĐ-THPT`);
    setFormTitle('');
    setFormType('decision');
    setFormDeptId(currentUser?.departmentId || 'dept-bgh');
    setFormIssuedDate(new Date().toISOString().split('T')[0]);
    setFormSigner(currentUser?.fullName || 'TS. Nguyễn Văn Hưng - Hiệu trưởng');
    setFormSummary('');
    setFormIsPublic(true);
    setFormFile(null);
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
          type: file.type || 'application/pdf',
          data: reader.result as string,
        });
        setFormFile(uploaded);
        showToast(`Đã đính kèm tệp văn bản: ${file.name}`);
      } catch (err: any) {
        showToast(err.message, 'error');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formTitle.trim()) {
      showToast('Vui lòng nhập số hiệu và trích yếu văn bản', 'error');
      return;
    }

    setSaving(true);
    try {
      const created = await api.createDocument({
        codeNumber: formCode.trim(),
        title: formTitle.trim(),
        type: formType,
        departmentId: formDeptId || undefined,
        issuedDate: formIssuedDate,
        signer: formSigner.trim(),
        summary: formSummary.trim(),
        isPublic: formIsPublic,
        file: formFile || {
          id: `att-${Date.now()}`,
          name: `${formCode.replace('/', '_')}.pdf`,
          size: 320000,
          type: 'application/pdf',
          url: `/docs/${encodeURIComponent(formTitle)}.pdf`,
          uploadedAt: new Date().toISOString(),
        },
      });

      setDocuments((prev) => [created, ...prev]);
      showToast('Lưu trữ và ban hành văn bản thành công');
      setIsFormOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadFile = async (doc: DocumentItem) => {
    try {
      await api.trackDocumentDownload(doc.id);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, downloadCount: (d.downloadCount || 0) + 1 } : d))
      );
      // Create download trigger
      const link = document.createElement('a');
      link.href = doc.file.url;
      link.download = doc.file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Đang tải tệp "${doc.file.name}"`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredDocs = documents.filter((d) => {
    const matchSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.codeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.signer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType = typeFilter === 'all' || d.type === typeFilter;
    const matchDept = deptFilter === 'all' || d.departmentId === deptFilter;

    return matchSearch && matchType && matchDept;
  });

  const getTypeLabel = (t: DocumentType) => {
    switch (t) {
      case 'directive':
        return 'Chỉ đạo / Hướng dẫn';
      case 'decision':
        return 'Quyết định';
      case 'plan':
        return 'Kế hoạch';
      case 'minutes':
        return 'Biên bản';
      case 'form':
        return 'Biểu mẫu chuẩn';
      default:
        return 'Văn bản khác';
    }
  };

  // Export Data
  const exportHeaders = ['STT', 'Số hiệu', 'Tên văn bản / Trích yếu', 'Loại', 'Ngày ban hành', 'Người ký', 'Phạm vi', 'Lượt tải'];
  const exportRows = filteredDocs.map((d, i) => [
    i + 1,
    d.codeNumber,
    d.title,
    getTypeLabel(d.type),
    d.issuedDate,
    d.signer,
    d.isPublic ? 'Công khai' : 'Nội bộ',
    d.downloadCount || 0,
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản Lý Văn Bản & Tài Liệu Hồ Sơ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lưu trữ quyết định, văn bản hướng dẫn của Sở, kế hoạch, biểu mẫu hành chính nhà trường
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Xuất danh mục</span>
          </button>

          {(isPrincipal || isAdmin || isDean) && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Lưu văn bản mới</span>
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
            placeholder="Tìm theo số hiệu (VD: 86/QĐ), tên văn bản, người ký..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">Tất cả loại văn bản</option>
            <option value="decision">Quyết định</option>
            <option value="directive">Chỉ đạo / Hướng dẫn</option>
            <option value="plan">Kế hoạch</option>
            <option value="minutes">Biên bản</option>
            <option value="form">Biểu mẫu chuẩn</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
          >
            <option value="all">Tất cả đơn vị ban hành</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Đang tải hồ sơ văn bản...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Không tìm thấy văn bản hoặc hồ sơ nào.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase bg-slate-50/60">
                <th className="py-2.5 px-3">Số hiệu</th>
                <th className="py-2.5 px-3">Trích yếu nội dung văn bản</th>
                <th className="py-2.5 px-3">Loại văn bản</th>
                <th className="py-2.5 px-3">Ngày ban hành</th>
                <th className="py-2.5 px-3">Người ký</th>
                <th className="py-2.5 px-3">Phạm vi</th>
                <th className="py-2.5 px-3 text-right">Tải về</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-bold text-blue-900 whitespace-nowrap">
                    {doc.codeNumber}
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900 max-w-md">{doc.title}</p>
                    {doc.summary && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{doc.summary}</p>
                    )}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      {getTypeLabel(doc.type)}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap tabular-nums text-slate-700">
                    {new Date(doc.issuedDate).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-medium">
                    {doc.signer}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {doc.isPublic ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                        <Globe className="h-3 w-3" /> Công khai
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                        <Lock className="h-3 w-3" /> Nội bộ
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(doc)}
                      className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
                      title="Tải tệp đính kèm"
                    >
                      <Download className="h-3 w-3" />
                      <span className="tabular-nums">({doc.downloadCount || 0})</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE DOCUMENT MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Lưu trữ & Ban hành văn bản mới"
        subtitle="Hệ thống lưu trữ hồ sơ điện tử chính thức của nhà trường"
        maxWidth="2xl"
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
              onClick={handleSaveDoc}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
            >
              {saving ? 'Đang lưu...' : 'Lưu trữ văn bản'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveDoc} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Số ký hiệu văn bản <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="VD: 86/QĐ-THPT"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Loại văn bản
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="decision">Quyết định</option>
                <option value="directive">Chỉ đạo / Hướng dẫn</option>
                <option value="plan">Kế hoạch</option>
                <option value="minutes">Biên bản</option>
                <option value="form">Biểu mẫu chuẩn</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tên văn bản / Trích yếu nội dung <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="VD: Quyết định thành lập Hội đồng coi thi và chấm thi Học sinh giỏi cấp trường"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Ngày ban hành <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formIssuedDate}
                onChange={(e) => setFormIssuedDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Người ký văn bản <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formSigner}
                onChange={(e) => setFormSigner(e.target.value)}
                placeholder="VD: TS. Nguyễn Văn Hưng - Hiệu trưởng"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tóm tắt trích yếu
            </label>
            <textarea
              rows={2}
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              placeholder="Tóm tắt ngắn gọn nội dung quy định trong văn bản..."
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsPublic}
                onChange={(e) => setFormIsPublic(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Công khai cho toàn trường và phụ huynh tra cứu</span>
            </label>
          </div>

          {/* File Upload */}
          <div className="border-t border-slate-200 pt-3">
            <label className="block font-bold text-slate-900 mb-1">
              Tệp tài liệu đính kèm (PDF, Word, Excel)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100">
                <FileText className="h-4 w-4 text-slate-500" />
                <span>{uploading ? 'Đang tải lên...' : 'Chọn tệp văn bản'}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </label>
              {formFile && (
                <span className="font-semibold text-blue-700 truncate">{formFile.name}</span>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Xuất sổ công văn & tài liệu lưu trữ"
        filename={`So_cong_van_${new Date().toISOString().split('T')[0]}`}
        headers={exportHeaders}
        rows={exportRows}
      />
    </div>
  );
};

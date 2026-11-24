import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import type { DocumentItem } from '../../types/database.ts';
import { FileText, Download, Eye, Search, Filter, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal.tsx';

export const PublicDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const data = await api.getDocuments();
        // Public documents and forms only
        setDocuments(data.filter((d) => d.isPublic));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, []);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.codeNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'directive':
        return 'Chỉ thị - Hướng dẫn';
      case 'decision':
        return 'Quyết định';
      case 'plan_doc':
        return 'Kế hoạch công khai';
      case 'minutes':
        return 'Biên bản';
      case 'form':
        return 'Biểu mẫu - Đơn từ';
      default:
        return 'Văn bản';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">
          VĂN BẢN & BIỂU MẪU CÔNG KHAI
        </span>
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">
          Hệ Thống Biểu Mẫu, Hồ Sơ & Quyết Định Công Bố
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Cung cấp các biểu mẫu đơn từ cho phụ huynh, học sinh và các văn bản chỉ đạo điều hành được phép chia sẻ.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo số hiệu văn bản hoặc tiêu đề..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-700 focus:outline-hidden"
          >
            <option value="all">Tất cả loại văn bản</option>
            <option value="form">Biểu mẫu - Đơn từ</option>
            <option value="decision">Quyết định ban hành</option>
            <option value="directive">Chỉ thị - Hướng dẫn</option>
            <option value="plan_doc">Kế hoạch công khai</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Đang tải văn bản...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 rounded-2xl bg-white border border-slate-200">
          Không tìm thấy văn bản hoặc biểu mẫu phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-400 hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {doc.codeNumber}
                  </span>
                  <span className="text-slate-400">
                    {new Date(doc.issuedDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                  {doc.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {doc.summary || 'Văn bản chính thức được công bố trên cổng thông tin nhà trường.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  {getDocTypeLabel(doc.type)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Xem chi tiết</span>
                  </button>
                  {doc.file && (
                    <a
                      href={doc.file.url}
                      download={doc.file.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-semibold px-2 py-1 rounded bg-blue-50 hover:bg-blue-100"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Tải về</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDoc && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDoc(null)}
          title={selectedDoc.title}
          subtitle={`Số hiệu: ${selectedDoc.codeNumber} · Ban hành: ${new Date(selectedDoc.issuedDate).toLocaleDateString('vi-VN')}`}
          maxWidth="lg"
        >
          <div className="space-y-5 text-xs text-slate-700">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-400 font-semibold text-[11px]">Cơ quan ban hành:</p>
                <p className="font-bold text-slate-900 mt-0.5">Trường TH&THCS Nguyễn Đình Anh</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold text-[11px]">Người ký:</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDoc.signer || 'Hiệu trưởng'}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">Trích yếu nội dung:</h4>
              <p className="leading-relaxed text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                {selectedDoc.summary}
              </p>
            </div>

            {selectedDoc.file && (
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Tệp văn bản đính kèm:</h4>
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-800">{selectedDoc.file.name}</p>
                      <p className="text-[10px] text-slate-400">{selectedDoc.file.size}</p>
                    </div>
                  </div>
                  <a
                    href={selectedDoc.file.url}
                    download={selectedDoc.file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải tệp</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

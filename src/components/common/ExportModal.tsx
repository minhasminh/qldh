import React, { useState } from 'react';
import { Modal } from './Modal.tsx';
import { FileSpreadsheet, Printer, Download, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  onCustomPrint?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  title,
  filename,
  headers,
  rows,
  onCustomPrint,
}) => {
  const { showToast } = useApp();
  const [downloaded, setDownloaded] = useState(false);

  const handleExportCSV = () => {
    // Add UTF-8 BOM (\uFEFF) so Microsoft Excel opens Vietnamese characters without mojibake
    const csvContent =
      '\uFEFF' +
      [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    showToast(`Đã xuất ${rows.length} dòng dữ liệu ra tệp ${filename}.csv thành công!`);
    setTimeout(() => {
      setDownloaded(false);
      onClose();
    }, 1500);
  };

  const handlePrint = () => {
    if (onCustomPrint) {
      onCustomPrint();
    } else {
      window.print();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Xuất dữ liệu hệ thống ra tệp Excel bảng tính hoặc in ấn văn bản hành chính"
      maxWidth="md"
      actions={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Đóng
        </button>
      }
    >
      <div className="space-y-4 py-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Dữ liệu nguồn thực tế:</p>
          <p className="mt-1">
            Tổng số bản ghi trích xuất: <strong className="text-slate-900">{rows.length}</strong> hàng.
          </p>
          <p className="mt-0.5">Số cột thuộc tính: <strong className="text-slate-900">{headers.length}</strong> cột.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Excel Export */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-800 transition-all text-center group"
          >
            {downloaded ? (
              <Check className="h-8 w-8 text-emerald-600 mb-2" />
            ) : (
              <FileSpreadsheet className="h-8 w-8 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-sm font-bold">Xuất Excel (.csv UTF-8)</span>
            <span className="text-xs text-emerald-600 mt-1">
              {downloaded ? 'Đã tải xuống!' : 'Mở trực tiếp trên Excel/Sheets'}
            </span>
          </button>

          {/* Print Template */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all text-center group"
          >
            <Printer className="h-8 w-8 text-slate-700 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold">In văn bản hành chính</span>
            <span className="text-xs text-slate-500 mt-1">Xuất bản in / Lưu PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

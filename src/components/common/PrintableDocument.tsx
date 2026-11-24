import React, { ReactNode } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Printer } from 'lucide-react';

interface PrintableDocumentProps {
  docCode?: string;
  title: string;
  subtitle?: string;
  dateStr?: string;
  recipientText?: string;
  signerTitle?: string;
  signerName?: string;
  children: ReactNode;
  showPrintButton?: boolean;
}

export const PrintableDocument: React.FC<PrintableDocumentProps> = ({
  docCode = 'Số: ... /LCT-THPT',
  title,
  subtitle,
  dateStr,
  recipientText = 'Ban Giám hiệu, Các tổ chuyên môn, Website, Lưu: VT',
  signerTitle = 'HIỆU TRƯỞNG',
  signerName,
  children,
  showPrintButton = true,
}) => {
  const { schoolSettings } = useApp();

  const handlePrint = () => {
    window.print();
  };

  const agency = schoolSettings?.managementAgency || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO';
  const school = schoolSettings?.schoolName || 'TRƯỜNG THPT CHU VĂN AN';
  const defaultSigner = signerName || schoolSettings?.principalName || 'TS. Nguyễn Văn Hưng';

  const today = new Date();
  const defaultDateStr = `Hà Nội, ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-10 shadow-xs text-slate-900 print:border-none print:shadow-none print:p-0">
      {/* Print action toolbar for web view */}
      {showPrintButton && (
        <div className="mb-6 flex justify-end print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Printer className="h-4 w-4" />
            In văn bản / Lưu PDF
          </button>
        </div>
      )}

      {/* Official Vietnamese Administrative Header */}
      <div className="grid grid-cols-2 gap-4 pb-4 border-b-2 border-slate-900/80 mb-6">
        {/* Left header */}
        <div className="text-center font-serif">
          <p className="text-xs uppercase tracking-tight text-slate-700">{agency}</p>
          <p className="text-sm font-bold uppercase tracking-tight text-slate-900 mt-0.5">{school}</p>
          <div className="w-24 h-px bg-slate-900 mx-auto my-1"></div>
          <p className="text-xs italic text-slate-600 mt-1">{docCode}</p>
        </div>

        {/* Right header */}
        <div className="text-center font-serif">
          <p className="text-xs font-bold uppercase tracking-tight text-slate-900">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </p>
          <p className="text-xs font-bold text-slate-900 mt-0.5">
            Độc lập - Tự do - Hạnh phúc
          </p>
          <div className="w-32 h-px bg-slate-900 mx-auto my-1"></div>
          <p className="text-xs italic text-slate-600 mt-1">{dateStr || defaultDateStr}</p>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center my-6">
        <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-slate-900 font-serif">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs md:text-sm italic text-slate-600 mt-1 font-serif">
            ({subtitle})
          </p>
        )}
      </div>

      {/* Main Body */}
      <div className="text-sm leading-relaxed text-slate-800 min-h-[250px]">{children}</div>

      {/* Signatures & Recipients Footer */}
      <div className="grid grid-cols-2 gap-6 mt-12 pt-6 border-t border-slate-200 font-serif">
        {/* Recipients */}
        <div className="text-xs text-slate-700">
          <p className="font-bold italic">Nơi nhận:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs text-slate-600">
            {recipientText.split(',').map((item, idx) => (
              <li key={idx}>{item.trim()}</li>
            ))}
          </ul>
        </div>

        {/* Signer */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase text-slate-900">{signerTitle}</p>
          <p className="text-xs italic text-slate-500 mt-0.5">(Ký, ghi rõ họ tên và đóng dấu)</p>
          <div className="h-20 flex items-center justify-center">
            <span className="text-xs text-slate-300 italic select-none">
              [Chữ ký số & Dấu điện tử]
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">
            {defaultSigner}
          </p>
        </div>
      </div>
    </div>
  );
};

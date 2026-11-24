import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { Department, User, ExcelUserImportRow } from '../../../types/database.ts';
import { api } from '../../../services/api.ts';
import { useApp } from '../../../context/AppContext.tsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  Building2,
  ShieldCheck,
  Activity,
  Info,
} from 'lucide-react';

interface ExcelUserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  existingUsers: User[];
  onSuccess: () => void;
}

interface ParsedRowWithValidation extends ExcelUserImportRow {
  rowNumber: number;
  isValid: boolean;
  errorMessage?: string;
  isDuplicate: boolean;
}

// 7 Tổ chuyên môn chuẩn theo quy định nhà trường
export const OFFICIAL_DEPARTMENTS = [
  'Tổ 1-2-3',
  'Tổ 4-5',
  'Tổ khoa học tự nhiên',
  'Tổ khoa học xã hội',
  'Tổ văn phòng',
  'Liên Đội TNTP Hồ Chí Minh',
  'Ban giám hiệu',
] as const;

// 6 Vai trò chuẩn theo quy định nhà trường
export const OFFICIAL_ROLES = [
  'Hiệu trưởng',
  'Phó Hiệu trưởng',
  'Tổ trưởng',
  'Tổ phó',
  'Giáo viên',
  'Nhân viên',
] as const;

// 3 Trạng thái tài khoản chuẩn
export const OFFICIAL_STATUSES = [
  'Hoạt động',
  'Chưa kích hoạt',
  'Bị khóa',
] as const;

export const ExcelUserImportModal: React.FC<ExcelUserImportModalProps> = ({
  isOpen,
  onClose,
  existingUsers,
  onSuccess,
}) => {
  const { showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRowWithValidation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  // 1. Tải về file mẫu Excel chuẩn với đúng 7 cột yêu cầu
  const handleDownloadTemplate = () => {
    try {
      // Dữ liệu mẫu minh họa đầy đủ 8 Tổ, 5 Vai trò, 3 Trạng thái
      const templateData = [
        {
          'Họ và tên': 'Lê Văn Thành',
          'Email': 'levanthanh@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!999',
          'Tổ chuyên môn': 'Ban Giám Hiệu',
          'Môn học': 'Quản lý giáo dục',
          'Vai trò': 'Hiệu trưởng',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Nguyễn Thị Mai',
          'Email': 'nguyenthimai@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!888',
          'Tổ chuyên môn': 'Ban Giám Hiệu',
          'Môn học': 'Chuyên môn THCS',
          'Vai trò': 'Phó hiệu trưởng',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Hoàng Minh Đức',
          'Email': 'hoangminhduc@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!777',
          'Tổ chuyên môn': 'Tổ khoa học tự nhiên',
          'Môn học': 'Hóa học',
          'Vai trò': 'Tổ trưởng',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Đỗ Quang Khải',
          'Email': 'doquangkhai@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!123',
          'Tổ chuyên môn': 'Tổ khoa học tự nhiên',
          'Môn học': 'Toán học',
          'Vai trò': 'Tổ phó',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Nguyễn Diệu Linh',
          'Email': 'nguyendieulinh@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!234',
          'Tổ chuyên môn': 'Tổ khoa học xã hội',
          'Môn học': 'Ngữ văn',
          'Vai trò': 'Giáo viên',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Nguyễn Văn Long',
          'Email': 'nguyenvanlong@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!345',
          'Tổ chuyên môn': 'Tổ Tiếng Anh - GDTC',
          'Môn học': 'Tiếng Anh',
          'Vai trò': 'Tổ trưởng',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Bùi Thị Hồng',
          'Email': 'buithihong@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!456',
          'Tổ chuyên môn': 'Tổ 1-2-3',
          'Môn học': 'Giáo dục Tiểu học',
          'Vai trò': 'Tổ trưởng',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Trần Thị Ngọc',
          'Email': 'tranthingoc@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!567',
          'Tổ chuyên môn': 'Tổ 4-5',
          'Môn học': 'Giáo dục Tiểu học',
          'Vai trò': 'Giáo viên',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Vũ Thị Thảo',
          'Email': 'vuthithao@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!678',
          'Tổ chuyên môn': 'Tổ Văn phòng',
          'Môn học': 'Kế toán - Văn thư',
          'Vai trò': 'Giáo viên',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Phan Thanh Bình',
          'Email': 'phanthanhbinh@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!789',
          'Tổ chuyên môn': 'Liên Đội TNTP Hồ Chí Minh',
          'Môn học': 'Tổng phụ trách Đội',
          'Vai trò': 'Giáo viên',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Đinh Quốc Tuấn',
          'Email': 'dinhquoctuan@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!321',
          'Tổ chuyên môn': 'Tổ khoa học tự nhiên',
          'Môn học': 'Vật lý',
          'Vai trò': 'Giáo viên',
          'Trạng thái': 'Chưa kích hoạt',
        },
        {
          'Họ và tên': 'Phạm Ngọc Minh',
          'Email': 'phamngocminh@thcsnguyendinhanh.edu.vn',
          'Mật khẩu': 'NDA@2026!111',
          'Tổ chuyên môn': 'Tổ khoa học xã hội',
          'Môn học': 'Lịch sử & Địa lý',
          'Vai trò': 'Giáo viên',
          'Trạng thái': 'Bị khóa',
        },
      ];

      // Sheet 1: Danh sách mẫu
      const wsMain = XLSX.utils.json_to_sheet(templateData);
      wsMain['!cols'] = [
        { wch: 22 }, // Họ và tên
        { wch: 38 }, // Email
        { wch: 20 }, // Mật khẩu
        { wch: 28 }, // Tổ chuyên môn
        { wch: 24 }, // Môn học
        { wch: 20 }, // Vai trò
        { wch: 18 }, // Trạng thái
      ];

      // Sheet 2: Bảng quy chuẩn giá trị hợp lệ
      const guideData = [
        {
          'Tên Cột': 'Họ và tên',
          'Bắt buộc': 'BẮT BUỘC',
          'Giá trị hợp lệ / Mô tả': 'Họ và tên đầy đủ của cán bộ, giáo viên hoặc nhân viên.',
        },
        {
          'Tên Cột': 'Email',
          'Bắt buộc': 'BẮT BUỘC',
          'Giá trị hợp lệ / Mô tả': 'Địa chỉ email duy nhất trong hệ thống, đồng thời là tên tài khoản đăng nhập (Username).',
        },
        {
          'Tên Cột': 'Mật khẩu',
          'Bắt buộc': 'Tùy chọn',
          'Giá trị hợp lệ / Mô tả': 'Mật khẩu khởi tạo ban đầu (tối thiểu 6 ký tự). Nếu để trống, hệ thống sẽ tự sinh ngẫu nhiên định dạng NDA@2026!xxxx an toàn.',
        },
        {
          'Tên Cột': 'Tổ chuyên môn',
          'Bắt buộc': 'BẮT BUỘC',
          'Giá trị hợp lệ / Mô tả': 'Chọn đúng 1 trong 8 tổ: Tổ khoa học tự nhiên | Tổ khoa học xã hội | Tổ Tiếng Anh - GDTC | Tổ 1-2-3 | Tổ 4-5 | Tổ Văn phòng | Liên Đội TNTP Hồ Chí Minh | Ban Giám Hiệu',
        },
        {
          'Tên Cột': 'Môn học',
          'Bắt buộc': 'Tùy chọn',
          'Giá trị hợp lệ / Mô tả': 'Môn học hoặc nhiệm vụ phụ trách chính (Toán học, Ngữ văn, Tiếng Anh, Vật lý, Hóa học, Sinh học, GD Tiểu học, Kế toán...). Ban Giám hiệu có thể để trống.',
        },
        {
          'Tên Cột': 'Vai trò',
          'Bắt buộc': 'BẮT BUỘC',
          'Giá trị hợp lệ / Mô tả': 'Chọn đúng 1 trong 5 vai trò: Giáo viên | Phó hiệu trưởng | Tổ trưởng | Tổ phó | Hiệu trưởng',
        },
        {
          'Tên Cột': 'Trạng thái',
          'Bắt buộc': 'BẮT BUỘC',
          'Giá trị hợp lệ / Mô tả': 'Chọn đúng 1 trong 3 trạng thái: Hoạt động | Chưa kích hoạt | Bị khóa (mặc định là Hoạt động nếu để trống)',
        },
      ];

      const wsGuide = XLSX.utils.json_to_sheet(guideData);
      wsGuide['!cols'] = [
        { wch: 18 },
        { wch: 14 },
        { wch: 90 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsMain, 'DanhSachTaiKhoan');
      XLSX.utils.book_append_sheet(wb, wsGuide, 'QuyChuanGiaTriHopLe');

      XLSX.writeFile(wb, 'Mau_Nhap_Tai_Khoan_Truong_TH_THCS_Nguyen_Dinh_Anh.xlsx');
      showToast('Đã tải xuống file Excel mẫu chuẩn 7 cột thành công', 'success');
    } catch (err: any) {
      showToast('Không thể tạo file mẫu: ' + err.message, 'error');
    }
  };

  // Chuẩn hóa tên tổ chuyên môn
  const normalizeDepartment = (deptRaw: string): string => {
    if (!deptRaw) return 'Tổ khoa học tự nhiên';
    const lower = deptRaw.toLowerCase().trim();

    if (lower.includes('tự nhiên') || lower.includes('khtn')) return 'Tổ khoa học tự nhiên';
    if (lower.includes('xã hội') || lower.includes('khxh')) return 'Tổ khoa học xã hội';
    if (lower.includes('tiếng anh') || lower.includes('gdtc') || lower.includes('ngoại ngữ')) return 'Tổ Tiếng Anh - GDTC';
    if (lower.includes('1-2-3') || lower.includes('1 2 3') || lower.includes('1, 2, 3')) return 'Tổ 1-2-3';
    if (lower.includes('4-5') || lower.includes('4 5') || lower.includes('4, 5')) return 'Tổ 4-5';
    if (lower.includes('văn phòng') || lower.includes('vp')) return 'Tổ Văn phòng';
    if (lower.includes('liên đội') || lower.includes('đoàn') || lower.includes('đội') || lower.includes('tntp')) return 'Liên Đội TNTP Hồ Chí Minh';
    if (lower.includes('giám hiệu') || lower.includes('bgh')) return 'Ban Giám Hiệu';

    const match = OFFICIAL_DEPARTMENTS.find((d) => d.toLowerCase() === lower);
    return match || deptRaw;
  };

  // Chuẩn hóa vai trò
  const normalizeRole = (roleRaw: string): string => {
    if (!roleRaw) return 'Giáo viên';
    const lower = roleRaw.toLowerCase().trim();

    if (lower.includes('hiệu trưởng') && !lower.includes('phó')) return 'Hiệu trưởng';
    if (lower.includes('phó hiệu trưởng')) return 'Phó hiệu trưởng';
    if (lower.includes('tổ trưởng')) return 'Tổ trưởng';
    if (lower.includes('nhân viên')) return 'Nhân viên';
    if (lower.includes('giáo viên')) return 'Giáo viên';

    const match = OFFICIAL_ROLES.find((r) => r.toLowerCase() === lower);
    return match || 'Giáo viên';
  };

  // Chuẩn hóa trạng thái
  const normalizeStatus = (statusRaw: string): string => {
    if (!statusRaw) return 'Hoạt động';
    const lower = statusRaw.toLowerCase().trim();

    if (lower.includes('chưa') || lower.includes('inactive')) return 'Chưa kích hoạt';
    if (lower.includes('khóa') || lower.includes('locked')) return 'Bị khóa';
    if (lower.includes('hoạt động') || lower.includes('active')) return 'Hoạt động';

    return 'Hoạt động';
  };

  // 2. Đọc và phân tích file Excel / CSV người dùng tải lên
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Chuyển dữ liệu sang mảng JSON
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          showToast('File Excel không có dữ liệu nào', 'error');
          setIsProcessing(false);
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const seenEmails = new Set<string>();

        const validated: ParsedRowWithValidation[] = rawJson.map((row, index) => {
          const rowNum = index + 2;

          // Cột 1: Họ và tên
          const fullNameVal = (
            row['Họ và tên'] ||
            row['Họ tên'] ||
            row['fullName'] ||
            row['Tên cán bộ'] ||
            row['Tên giáo viên'] ||
            ''
          )
            .toString()
            .trim();

          // Cột 2: Email (Tên tài khoản)
          const emailVal = (
            row['Email'] ||
            row['Email (Tên tài khoản bắt buộc)'] ||
            row['Email (Tên tài khoản)'] ||
            row['email'] ||
            row['Địa chỉ Email'] ||
            row['Tên tài khoản'] ||
            ''
          )
            .toString()
            .trim()
            .toLowerCase();

          // Cột 3: Mật khẩu
          const passwordVal = (
            row['Mật khẩu'] ||
            row['Mật khẩu ban đầu'] ||
            row['Mật khẩu ban đầu (Để trống sẽ tự sinh)'] ||
            row['password'] ||
            ''
          )
            .toString()
            .trim();

          // Cột 4: Tổ chuyên môn
          const rawDept = (
            row['Tổ chuyên môn'] ||
            row['Tổ / Bộ phận'] ||
            row['department'] ||
            row['departmentName'] ||
            ''
          )
            .toString()
            .trim();
          const deptVal = normalizeDepartment(rawDept);

          // Cột 5: Môn học
          const subjectVal = (
            row['Môn học'] ||
            row['subject'] ||
            row['Môn giảng dạy'] ||
            row['Môn'] ||
            ''
          )
            .toString()
            .trim();

          // Cột 6: Vai trò
          const rawRole = (
            row['Vai trò'] ||
            row['role'] ||
            row['Chức vụ'] ||
            ''
          )
            .toString()
            .trim();
          const roleVal = normalizeRole(rawRole);

          // Cột 7: Trạng thái
          const rawStatus = (
            row['Trạng thái'] ||
            row['status'] ||
            row['Trạng thái tài khoản'] ||
            ''
          )
            .toString()
            .trim();
          const statusVal = normalizeStatus(rawStatus);

          let errorMessage = '';
          let isDuplicate = false;

          if (!emailVal) {
            errorMessage = 'Thiếu địa chỉ email (tên tài khoản)';
          } else if (!emailRegex.test(emailVal)) {
            errorMessage = 'Email không đúng định dạng';
          } else if (
            existingUsers.some(
              (u) =>
                u.username.toLowerCase() === emailVal ||
                (u.email && u.email.toLowerCase() === emailVal)
            )
          ) {
            errorMessage = 'Email đã tồn tại trong hệ thống';
            isDuplicate = true;
          } else if (seenEmails.has(emailVal)) {
            errorMessage = 'Email trùng lặp trong tệp này';
            isDuplicate = true;
          }

          if (!errorMessage && !fullNameVal) {
            errorMessage = 'Thiếu họ và tên';
          }

          if (emailVal) {
            seenEmails.add(emailVal);
          }

          return {
            rowNumber: rowNum,
            fullName: fullNameVal,
            email: emailVal,
            password: passwordVal,
            departmentName: deptVal,
            subject: subjectVal,
            roleName: roleVal,
            statusName: statusVal,
            isValid: !errorMessage,
            errorMessage,
            isDuplicate,
          };
        });

        setParsedRows(validated);
      } catch (err: any) {
        showToast('Lỗi khi đọc file Excel: ' + err.message, 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      showToast('Không thể đọc file đã chọn', 'error');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  // 3. Thực hiện nhập dữ liệu hàng loạt lên server
  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);

    if (validRows.length === 0) {
      showToast('Không có dòng dữ liệu hợp lệ nào để nhập', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const result = await api.importUsersFromExcel(validRows);
      showToast(
        `Đã nhập thành công ${result.successCount} tài khoản mới vào hệ thống!`,
        'success'
      );
      onSuccess();
      handleClose();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi nhập dữ liệu từ Excel', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFileName(null);
    setParsedRows([]);
    setIsProcessing(false);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 shadow-2xs">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Thêm Hàng Loạt Tài Khoản Cán Bộ & Giáo Viên Từ File Excel
              </h3>
              <p className="text-xs text-slate-500">
                Mẫu chuẩn gồm 7 cột: Họ và tên, Email, Mật khẩu, Tổ chuyên môn, Môn học, Vai trò, Trạng thái
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Top Actions: Template & Upload Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Download Template */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                    1
                  </span>
                  <span>Tải tệp mẫu Excel chuẩn 7 cột</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px] mt-1.5">
                  Tệp mẫu tích hợp sẵn 7 cột chuẩn hóa và trang quy chuẩn dữ liệu cho <strong>8 Tổ chuyên môn</strong>, <strong>5 Vai trò</strong> và <strong>3 Trạng thái</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors shadow-2xs self-start"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                <span>Tải file mẫu Excel chuẩn (.xlsx)</span>
              </button>
            </div>

            {/* Step 2: Select & Upload File */}
            <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/30 p-4 flex flex-col justify-between space-y-2.5">
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">
                    2
                  </span>
                  <span>Chọn tệp danh sách giáo viên cần nhập</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px] mt-1.5">
                  Hỗ trợ định dạng <strong className="font-mono text-emerald-800">.xlsx, .xls, .csv</strong>. Tên tài khoản tự động lấy từ cột Email.
                </p>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-xs"
                >
                  <Upload className="h-4 w-4" />
                  <span>{fileName ? `Chọn lại: ${fileName}` : 'Tải lên tệp Excel đã điền dữ liệu...'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quy chuẩn các giá trị hợp lệ theo yêu cầu */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-2 text-[11px] text-blue-950">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Quy Chuẩn Danh Mục Các Cột Dữ Liệu Trong File Excel</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {/* 8 Tổ chuyên môn */}
              <div className="bg-white rounded-lg p-2.5 border border-blue-100 space-y-1">
                <div className="flex items-center gap-1 font-bold text-slate-800">
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>8 Tổ chuyên môn:</span>
                </div>
                <div className="text-slate-600 leading-relaxed space-y-0.5">
                  {OFFICIAL_DEPARTMENTS.map((dept) => (
                    <div key={dept} className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-blue-500" />
                      <span>{dept}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5 Vai trò */}
              <div className="bg-white rounded-lg p-2.5 border border-blue-100 space-y-1">
                <div className="flex items-center gap-1 font-bold text-slate-800">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>5 Vai trò phân quyền:</span>
                </div>
                <div className="text-slate-600 leading-relaxed space-y-1">
                  <div>• <strong className="text-slate-800">Hiệu trưởng</strong> (Duyệt kế hoạch toàn trường)</div>
                  <div>• <strong className="text-slate-800">Phó hiệu trưởng</strong> (Duyệt kế hoạch, chỉ đạo)</div>
                  <div>• <strong className="text-slate-800">Tổ trưởng</strong> (Duyệt cấp 1, giao việc)</div>
                  <div>• <strong className="text-slate-800">Tổ phó</strong> (Giáo viên cốt cán tổ)</div>
                  <div>• <strong className="text-slate-800">Giáo viên</strong> (Thực hiện nhiệm vụ, báo cáo)</div>
                </div>
              </div>

              {/* 3 Trạng thái & Ghi chú */}
              <div className="bg-white rounded-lg p-2.5 border border-blue-100 space-y-1">
                <div className="flex items-center gap-1 font-bold text-slate-800">
                  <Activity className="h-3.5 w-3.5 text-amber-600" />
                  <span>3 Trạng thái tài khoản:</span>
                </div>
                <div className="text-slate-600 leading-relaxed space-y-1">
                  <div>• <strong className="text-emerald-700">Hoạt động</strong> (Đăng nhập bình thường)</div>
                  <div>• <strong className="text-amber-700">Chưa kích hoạt</strong> (Chờ xác nhận)</div>
                  <div>• <strong className="text-rose-700">Bị khóa</strong> (Tạm ngừng quyền đăng nhập)</div>
                </div>
                <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
                  * Cột <strong>Môn học</strong> ghi nhận bộ môn giảng dạy chính hoặc phụ trách.
                </div>
              </div>
            </div>
          </div>

          {/* Validation Summary Bar */}
          {parsedRows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-700">
                  Tổng số dòng: <strong>{parsedRows.length}</strong>
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Hợp lệ: {validCount}</span>
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-rose-700 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    <span>Lỗi / Trùng: {invalidCount}</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-500">
                * Chỉ các dòng có dấu tích xanh (<CheckCircle2 className="inline h-3 w-3 text-emerald-600" />) mới được tạo tài khoản.
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Dòng</th>
                      <th className="py-2.5 px-3">Kiểm tra</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Email (Tên tài khoản)</th>
                      <th className="py-2.5 px-3">Mật khẩu</th>
                      <th className="py-2.5 px-3">Tổ chuyên môn</th>
                      <th className="py-2.5 px-3">Môn học</th>
                      <th className="py-2.5 px-3">Vai trò</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50 hover:bg-rose-50'}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {row.rowNumber}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Hợp lệ</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800"
                              title={row.errorMessage}
                            >
                              <AlertCircle className="h-3 w-3" />
                              <span>{row.errorMessage}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {row.fullName || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono font-medium text-slate-900">
                          {row.email || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {row.password ? '•••••• (' + row.password + ')' : '(Tự sinh ngẫu nhiên)'}
                        </td>
                        <td className="py-2 px-3 text-slate-800">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                            {row.departmentName}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {row.subject || '—'}
                        </td>
                        <td className="py-2 px-3">
                          <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-900">
                            {row.roleName}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {row.statusName === 'Hoạt động' ? (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Hoạt động
                            </span>
                          ) : row.statusName === 'Chưa kích hoạt' ? (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Chưa kích hoạt
                            </span>
                          ) : (
                            <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              Bị khóa
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4 shrink-0">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 ? (
              <span>
                Sẵn sàng thêm <strong className="text-emerald-700 font-bold">{validCount}</strong> tài khoản mới
              </span>
            ) : (
              <span>Vui lòng tải lên file Excel để xem trước và kiểm tra tính hợp lệ của dữ liệu</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isImporting}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={validCount === 0 || isImporting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-xs disabled:opacity-50"
            >
              <FileCheck className="h-4 w-4" />
              <span>{isImporting ? 'Đang nhập tài khoản...' : `Nhập ${validCount} tài khoản`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
  User,
  Department,
  SchoolSettings,
  SchoolYear,
  Announcement,
  CalendarEvent,
  Plan,
  Task,
  Report,
  DocumentItem,
  SystemNotification,
  AuditLog,
  DashboardStats,
  Role,
  UserStatus,
  ApprovalWorkflowRule,
  PlanDecision,
  PlanStatus,
  AnnouncementStatus,
  SchoolLevelType,
} from './src/types/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
// In AI Studio, the application dev server must listen on port 3000 (nginx listens on 8080).
// Ignore container environment PORT (8080) and use 3000 or the --port flag.
function getAppPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 3000;
}
const PORT = getAppPort();

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'school_database.json');
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const defaultApprovalRules: ApprovalWorkflowRule[] = [
  {
    id: 'rule-school-year',
    planType: 'year',
    name: 'Kế hoạch Giáo dục Nhà trường (Cấp trường)',
    description: 'Do Ban Giám hiệu trực tiếp chủ trì xây dựng. Luồng ngoại lệ 1 cấp trực tiếp do Hiệu trưởng phê duyệt (không bắt buộc qua Tổ trưởng).',
    scope: 'school_wide',
    requiredTiers: 1,
    level1Role: 'principal',
    level2Role: 'principal',
    allowSelfApproval: false,
    requireReapprovalOnEdit: true,
    isDefault: false,
  },
  {
    id: 'rule-school-semester',
    planType: 'semester',
    name: 'Kế hoạch Học kỳ (Cấp trường)',
    description: 'Do Ban Giám hiệu chủ trì xây dựng theo từng học kỳ. Luồng 1 cấp thẩm định và phê duyệt bởi Hiệu trưởng.',
    scope: 'school_wide',
    requiredTiers: 1,
    level1Role: 'principal',
    level2Role: 'principal',
    allowSelfApproval: false,
    requireReapprovalOnEdit: true,
    isDefault: false,
  },
  {
    id: 'rule-school-month',
    planType: 'month',
    name: 'Kế hoạch Hoạt động Tháng toàn trường',
    description: 'Kế hoạch công tác tháng cấp trường do BGH xây dựng. Luồng 1 cấp thẩm định và phê duyệt bởi Hiệu trưởng.',
    scope: 'school_wide',
    requiredTiers: 1,
    level1Role: 'principal',
    level2Role: 'principal',
    allowSelfApproval: false,
    requireReapprovalOnEdit: true,
    isDefault: false,
  },
  {
    id: 'rule-department',
    planType: 'department',
    name: 'Kế hoạch Tổ Chuyên môn / Bộ phận',
    description: 'Do Tổ trưởng / Trưởng bộ phận xây dựng. Luồng 1 cấp do Ban Giám hiệu trực tiếp thẩm định và ký duyệt (bỏ qua cấp 1).',
    scope: 'department_only',
    requiredTiers: 1,
    level1Role: 'principal',
    level2Role: 'principal',
    allowSelfApproval: false,
    requireReapprovalOnEdit: true,
    isDefault: false,
  },
  {
    id: 'rule-academic-teacher',
    planType: 'academic',
    name: 'Kế hoạch Chuyên môn & Dạy học Giáo viên',
    description: 'Quy trình 2 cấp chuẩn: Giáo viên lập -> Tổ trưởng chuyên môn duyệt Cấp 1 -> Ban Giám hiệu duyệt Cấp 2.',
    scope: 'individual',
    requiredTiers: 2,
    level1Role: 'dean',
    level2Role: 'principal',
    allowSelfApproval: false,
    requireReapprovalOnEdit: true,
    isDefault: false,
  },
  {
    id: 'rule-default-two-tier',
    planType: 'all',
    name: 'Quy trình Phê duyệt Mặc định Hai Cấp (Toàn trường)',
    description: 'Luồng phê duyệt 2 cấp chuẩn hóa: Người lập -> Tổ trưởng / Trưởng bộ phận duyệt Cấp 1 -> Ban Giám hiệu duyệt Cấp 2 -> Ban hành triển khai.',
    scope: 'individual',
    requiredTiers: 2,
    level1Role: 'dean',
    level2Role: 'principal',
    allowSelfApproval: false,
    requireReapprovalOnEdit: true,
    isDefault: true,
  },
];

interface DatabaseSchema {
  settings: SchoolSettings;
  schoolYears: SchoolYear[];
  departments: Department[];
  users: User[];
  announcements: Announcement[];
  events: CalendarEvent[];
  plans: Plan[];
  approvalRules: ApprovalWorkflowRule[];
  tasks: Task[];
  reports: Report[];
  documents: DocumentItem[];
  notifications: SystemNotification[];
  auditLogs: AuditLog[];
}

// Initial authentic Vietnamese school seed data
function generateSeedData(): DatabaseSchema {
  const now = new Date();
  const currentIso = now.toISOString();
  const todayStr = currentIso.split('T')[0];

  const settings: SchoolSettings = {
    schoolName: 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH',
    shortName: 'TH&THCS Nguyễn Đình Anh',
    schoolCode: 'TH-THCS-NDA-01',
    managementAgency: 'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO',
    address: 'Xã Thạch Bình, Huyện Thạch Thành, Tỉnh Thanh Hóa',
    phone: '0237 387 6543',
    email: 'ththcsnguyendinhanh@thachthanh.edu.vn',
    website: 'https://ththcsnguyendinhanh.edu.vn',
    principalName: 'Thầy Lê Văn Thành',
    currentSchoolYearId: 'sy-2026-2027',
    currentSemester: 'Học kỳ I',
    motto: 'Kỷ cương - Tình thương - Trách nhiệm - Đổi mới sáng tạo',
    grades: [
      { id: 'gr-1', name: 'Khối 1', schoolLevel: 'primary', classesCount: 3, description: 'Khối lớp 1 - Chương trình GDPT 2018' },
      { id: 'gr-2', name: 'Khối 2', schoolLevel: 'primary', classesCount: 3, description: 'Khối lớp 2 - Chương trình GDPT 2018' },
      { id: 'gr-3', name: 'Khối 3', schoolLevel: 'primary', classesCount: 3, description: 'Khối lớp 3 - Chương trình GDPT 2018' },
      { id: 'gr-4', name: 'Khối 4', schoolLevel: 'primary', classesCount: 3, description: 'Khối lớp 4 - Chương trình GDPT 2018' },
      { id: 'gr-5', name: 'Khối 5', schoolLevel: 'primary', classesCount: 3, description: 'Khối lớp 5 - Chuyển cấp THCS' },
      { id: 'gr-6', name: 'Khối 6', schoolLevel: 'secondary', classesCount: 4, description: 'Khối lớp 6 - Đầu cấp THCS' },
      { id: 'gr-7', name: 'Khối 7', schoolLevel: 'secondary', classesCount: 4, description: 'Khối lớp 7' },
      { id: 'gr-8', name: 'Khối 8', schoolLevel: 'secondary', classesCount: 4, description: 'Khối lớp 8' },
      { id: 'gr-9', name: 'Khối 9', schoolLevel: 'secondary', classesCount: 4, description: 'Khối lớp 9 - Tốt nghiệp THCS & Ôn thi vào 10' },
    ],
    categories: [
      { id: 'cat-mgmt', name: 'Chỉ đạo & Quản lý điều hành', type: 'announcement', color: 'blue' },
      { id: 'cat-acad', name: 'Chuyên môn & Dạy học', type: 'announcement', color: 'emerald' },
      { id: 'cat-test', name: 'Khảo thí & Đánh giá học sinh', type: 'task', color: 'purple' },
      { id: 'cat-union', name: 'Công đoàn & Thi đua khen thưởng', type: 'announcement', color: 'amber' },
      { id: 'cat-youth', name: 'Công tác Đội - Thiếu nhi', type: 'event', color: 'rose' },
      { id: 'cat-doc-legal', name: 'Văn bản quy phạm & Thông tư', type: 'document', color: 'indigo' },
      { id: 'cat-doc-internal', name: 'Quyết định & Quy chế nội bộ', type: 'document', color: 'sky' },
    ],
    notificationConfig: {
      enableInApp: true,
      notifyOnNewSchedule: true,
      notifyOnScheduleChange: true,
      notifyOnPlanApproved: true,
      notifyOnNewTask: true,
      notifyOnTaskDueSoon: true,
      notifyOnReportSubmitted: true,
      enableEmail: false,
      emailSmtpHost: 'smtp.thachthanh.edu.vn',
      emailSender: 'vanphong@thachthanh.edu.vn',
      emailMaskedSecret: '••••••••••••••••',
      smsMaskedApiKey: 'vnpt_sms_••••••••',
      zaloWebhookUrl: 'https://openapi.zalo.me/v2.0/oa/message',
    },
    approvalWorkflow: {
      planWorkflow: {
        enabled: true,
        requiredTiers: 2,
        blockSelfApproval: true,
        requireCommentOnReject: true,
        slaHours: 48,
      },
      taskVerification: {
        requireProofForCompletion: true,
        managerMustVerify: true,
      },
      reportWorkflow: {
        deanReviewRequired: true,
        principalApprovalRequired: true,
      },
    },
  };

  const schoolYears: SchoolYear[] = [
    {
      id: 'sy-2026-2027',
      name: '2026 - 2027',
      startDate: '2026-09-01',
      endDate: '2027-05-31',
      isCurrent: true,
      semesters: [
        { id: 'sem-1', name: 'Học kỳ I', startDate: '2026-09-01', endDate: '2027-01-15' },
        { id: 'sem-2', name: 'Học kỳ II', startDate: '2027-01-16', endDate: '2027-05-31' },
      ],
    },
    {
      id: 'sy-2025-2026',
      name: '2025 - 2026',
      startDate: '2025-09-01',
      endDate: '2026-05-31',
      isCurrent: false,
      semesters: [
        { id: 'sem-25-1', name: 'Học kỳ I', startDate: '2025-09-01', endDate: '2026-01-15' },
        { id: 'sem-25-2', name: 'Học kỳ II', startDate: '2026-01-16', endDate: '2026-05-31' },
      ],
    },
  ];

  const departments: Department[] = [
    {
      id: 'dept-bgh',
      name: 'Ban Giám Hiệu',
      code: 'BGH',
      type: 'management',
      description: 'Chỉ đạo toàn diện hoạt động hai cấp học Tiểu học và THCS, tài chính, nhân sự và thi đua.',
      leaderId: 'usr-principal',
      memberCount: 3,
    },
    {
      id: 'dept-th-123',
      name: 'Tổ Tiểu học Khối 1 - 2 - 3',
      code: 'TO-TH-123',
      type: 'subject',
      description: 'Phụ trách giảng dạy và giáo dục học sinh các khối lớp 1, 2, 3 chương trình GDPT 2018.',
      leaderId: 'usr-dean-th123',
      memberCount: 12,
    },
    {
      id: 'dept-th-45',
      name: 'Tổ Tiểu học Khối 4 - 5',
      code: 'TO-TH-45',
      type: 'subject',
      description: 'Phụ trách chuyên môn khối lớp 4 và 5, chuẩn bị chuyển cấp lên THCS.',
      memberCount: 10,
    },
    {
      id: 'dept-khtn-thcs',
      name: 'Tổ Khoa học Tự nhiên THCS',
      code: 'TO-KHTN-THCS',
      type: 'subject',
      description: 'Phụ trách môn Toán, KHTN (Lý - Hóa - Sinh), Tin học và Công nghệ các khối 6, 7, 8, 9.',
      leaderId: 'usr-dean-khtn',
      memberCount: 14,
    },
    {
      id: 'dept-khxh-thcs',
      name: 'Tổ Khoa học Xã hội THCS',
      code: 'TO-KHXH-THCS',
      type: 'subject',
      description: 'Phụ trách bộ môn Ngữ văn, Lịch sử & Địa lý, GDCD cấp THCS.',
      memberCount: 11,
    },
    {
      id: 'dept-nn-nt',
      name: 'Tổ Ngoại ngữ & Nghệ thuật liên cấp',
      code: 'TO-NN-NT',
      type: 'subject',
      description: 'Phụ trách tiếng Anh, Âm nhạc, Mỹ thuật và Giáo dục thể chất hai cấp học.',
      memberCount: 8,
    },
    {
      id: 'dept-vp-yt',
      name: 'Tổ Văn phòng & Y tế học đường',
      code: 'TO-VP-YT',
      type: 'administrative',
      description: 'Phụ trách văn thư, tài chính, y tế, bảo hiểm học sinh và thiết bị trường học.',
      leaderId: 'usr-admin',
      memberCount: 6,
    },
    {
      id: 'dept-doan-doi',
      name: 'Liên Đội TNTP Hồ Chí Minh',
      code: 'DOAN-DOI',
      type: 'youth',
      description: 'Phụ trách phong trào Đội - Sao nhi đồng, nền nếp kỷ luật và hoạt động ngoại khóa.',
      memberCount: 4,
    },
    {
      id: 'dept-toan-tin',
      name: 'Tổ Toán - Tin học',
      code: 'TO-TOAN-TIN',
      type: 'subject',
      description: 'Phụ trách chuyên môn Toán và Tin học cấp THCS, phòng máy tính và chuyển đổi số.',
      leaderId: 'usr-dean-toantin',
      memberCount: 8,
    },
  ];

  const users: User[] = [
    {
      id: 'usr-admin',
      username: 'admin',
      fullName: 'Trần Văn Quản Trị',
      email: 'admin.nda@thachthanh.edu.vn',
      phone: '0912 345 678',
      role: 'admin',
      departmentId: 'dept-vp-yt',
      title: 'Quản trị viên hệ thống & CNTT',
      status: 'active',
      password: 'T@mduc88$#',
      createdAt: '2026-08-01T08:00:00Z',
    },
    {
      id: 'usr-admin-leducminh',
      username: 'leducminh@socson.org',
      fullName: 'Lê Đức Minh',
      email: 'leducminh@socson.org',
      phone: '0988 888 888',
      role: 'admin',
      departmentId: 'dept-bgh',
      departmentName: 'Ban giám hiệu',
      subject: 'Không phụ trách bộ môn',
      title: 'Quản trị viên hệ thống',
      status: 'active',
      password: 'T@mduc88$#',
      createdAt: '2026-10-21T08:00:00Z',
    },
    {
      id: 'usr-principal',
      username: 'hieutruong',
      fullName: 'Thầy Lê Văn Thành',
      email: 'levanthanh@thachthanh.edu.vn',
      phone: '0983 112 233',
      role: 'principal',
      departmentId: 'dept-bgh',
      title: 'Hiệu trưởng - Bí thư Chi bộ',
      status: 'active',
      createdAt: '2026-08-01T08:00:00Z',
    },
    {
      id: 'usr-vice-principal',
      username: 'phohieutruong',
      fullName: 'Cô Nguyễn Thị Mai',
      email: 'nguyenthimai@thachthanh.edu.vn',
      phone: '0978 445 566',
      role: 'principal',
      departmentId: 'dept-bgh',
      title: 'Phó Hiệu trưởng phụ trách Chuyên môn',
      status: 'active',
      createdAt: '2026-08-01T08:00:00Z',
    },
    {
      id: 'usr-dean-th123',
      username: 'totruongth123',
      fullName: 'Cô Bùi Thị Hồng',
      email: 'buithihong@thachthanh.edu.vn',
      phone: '0945 667 788',
      role: 'dean',
      departmentId: 'dept-th-123',
      title: 'Tổ trưởng chuyên môn Tiểu học 1-2-3',
      status: 'active',
      createdAt: '2026-08-05T08:00:00Z',
    },
    {
      id: 'usr-dean-khtn',
      username: 'totruongkhtn',
      fullName: 'Thầy Hoàng Minh Đức',
      email: 'hoangminhduc@thachthanh.edu.vn',
      phone: '0936 889 900',
      role: 'dean',
      departmentId: 'dept-khtn-thcs',
      title: 'Tổ trưởng KHTN cấp THCS',
      status: 'active',
      createdAt: '2026-08-05T08:00:00Z',
    },
    {
      id: 'usr-teacher-1',
      username: 'giaovien.toan',
      fullName: 'Thầy Đỗ Quang Khải',
      email: 'doquangkhai@thachthanh.edu.vn',
      phone: '0918 223 344',
      role: 'teacher',
      departmentId: 'dept-khtn-thcs',
      title: 'Giáo viên Toán - Chủ nhiệm 9A',
      status: 'active',
      createdAt: '2026-08-10T08:00:00Z',
    },
    {
      id: 'usr-teacher-2',
      username: 'giaovien.th',
      fullName: 'Cô Vũ Thị Thu Hương',
      email: 'vuthuthuhuong@thachthanh.edu.vn',
      phone: '0904 556 677',
      role: 'teacher',
      departmentId: 'dept-th-123',
      title: 'Giáo viên Tiểu học - Chủ nhiệm 3A',
      status: 'active',
      createdAt: '2026-08-10T08:00:00Z',
    },
    {
      id: 'usr-teacher-3',
      username: 'giaovien.van',
      fullName: 'Cô Nguyễn Diệu Linh',
      email: 'nguyendieulinh@thachthanh.edu.vn',
      phone: '0982 778 899',
      role: 'teacher',
      departmentId: 'dept-khxh-thcs',
      title: 'Giáo viên Ngữ văn - Tổng phụ trách Đội',
      status: 'active',
      createdAt: '2026-08-10T08:00:00Z',
    },
    {
      id: 'usr-dean-toantin',
      username: 'totruong.toantin',
      fullName: 'ThS. Nguyễn Văn Hải',
      email: 'nguyenvanhai@thachthanh.edu.vn',
      phone: '0912 888 999',
      role: 'dean',
      departmentId: 'dept-toan-tin',
      title: 'Tổ trưởng Tổ Toán - Tin học',
      status: 'active',
      createdAt: '2026-08-05T08:00:00Z',
    },
    {
      id: 'usr-teacher-nam',
      username: 'giaovien.nam',
      fullName: 'Thầy Trần Hoài Nam',
      email: 'tranhoainam@thachthanh.edu.vn',
      phone: '0913 445 566',
      role: 'teacher',
      departmentId: 'dept-toan-tin',
      title: 'Giáo viên Tin học & Chuyển đổi số',
      status: 'active',
      createdAt: '2026-08-10T08:00:00Z',
    },
    {
      id: 'usr-teacher-huong',
      username: 'giaovien.huong',
      fullName: 'Cô Lê Thị Hương',
      email: 'lethihuong@thachthanh.edu.vn',
      phone: '0914 556 677',
      role: 'teacher',
      departmentId: 'dept-toan-tin',
      title: 'Giáo viên Toán học THCS',
      status: 'active',
      createdAt: '2026-08-10T08:00:00Z',
    },
  ];

  const announcements: Announcement[] = [
    {
      id: 'ann-01',
      title: 'Thông báo kết luận của Hiệu trưởng tại phiên họp giao ban đầu tháng 10/2026',
      summary: 'Yêu cầu các tổ chuyên môn rà soát phân phối chương trình, chuẩn bị hồ sơ kiểm tra giữa kỳ I và đẩy mạnh ứng dụng CNTT.',
      content: `Kính gửi toàn thể Cán bộ, Giáo viên và Nhân viên nhà trường,\n\nTại phiên họp giao ban ngày 05/10/2026, Ban Giám hiệu đã thống nhất triển khai các nhiệm vụ trọng tâm sau:\n1. Các tổ chuyên môn rà soát tiến độ giảng dạy theo đúng kế hoạch năm học.\n2. Chuẩn bị ngân hàng đề kiểm tra giữa học kỳ I trước ngày 25/10/2026.\n3. Đẩy mạnh việc cập nhật lịch công tác và gửi báo cáo chuyên môn trên Cổng điều hành điện tử nhà trường.\n4. Đề nghị Đoàn trường phối hợp với GVCN tăng cường nền nếp học sinh.\n\nĐề nghị các bộ phận nghiêm túc thực hiện.`,
      category: 'management',
      priority: 'high',
      isPublic: false,
      targetAudience: 'all',
      targetDepartmentIds: [],
      targetUserIds: [],
      status: 'published',
      isPinned: true,
      authorId: 'usr-principal',
      authorName: 'TS. Nguyễn Văn Hưng',
      authorRole: 'principal',
      publishedAt: '2026-10-06T08:00:00Z',
      attachments: [
        {
          id: 'att-tb-01',
          name: 'Ket_luan_giao_ban_thang_10_2026.pdf',
          size: 245000,
          type: 'application/pdf',
          url: '/docs/sample_ket_luan.pdf',
          uploadedAt: '2026-10-06T07:45:00Z',
        },
      ],
      readCount: 42,
      readUserIds: ['usr-dean-toan', 'usr-dean-van', 'usr-teacher-1', 'usr-teacher-2'],
      createdAt: '2026-10-05T16:00:00Z',
      updatedAt: '2026-10-06T08:00:00Z',
    },
    {
      id: 'ann-02',
      title: 'Kế hoạch tổ chức Hội thi Giáo viên dạy giỏi cấp trường năm học 2026 - 2027',
      summary: 'Phát động hội thi thao giảng chào mừng ngày Nhà giáo Việt Nam 20/11.',
      content: `Thực hiện kế hoạch năm học 2026 - 2027, nhà trường phát động Hội thi Giáo viên dạy giỏi cấp trường:\n- Thời gian đăng ký: từ 10/10/2026 đến hết ngày 20/10/2026.\n- Thời gian thao giảng: từ 01/11/2026 đến 15/11/2026.\n- Tiêu chí: Đổi mới phương pháp dạy học, phát huy năng lực người học, ứng dụng học liệu số.\n\nMỗi tổ chuyên môn cử ít nhất 02 giáo viên tham gia.`,
      category: 'academic',
      priority: 'normal',
      isPublic: true,
      targetAudience: 'all',
      targetDepartmentIds: [],
      targetUserIds: [],
      status: 'published',
      isPinned: false,
      authorId: 'usr-vice-principal',
      authorName: 'ThS. Lê Thị Thanh Nhàn',
      authorRole: 'principal',
      publishedAt: '2026-10-08T09:00:00Z',
      attachments: [],
      readCount: 38,
      readUserIds: ['usr-dean-toan', 'usr-teacher-1'],
      createdAt: '2026-10-08T08:30:00Z',
      updatedAt: '2026-10-08T09:00:00Z',
    },
    {
      id: 'ann-03',
      title: 'Dự thảo Kế hoạch Chuyển đổi số và triển khai Hồ sơ điện tử đợt 1',
      summary: 'Gửi xin ý kiến Tổ trưởng chuyên môn về quy trình ký duyệt giáo án và sổ điểm điện tử.',
      content: `Văn phòng gửi bản dự thảo quy trình chuyển đổi số học kỳ I. Kính mời các đồng chí Tổ trưởng đóng góp ý kiến trước ngày 18/10/2026.`,
      category: 'general',
      priority: 'normal',
      isPublic: false,
      targetAudience: 'deans',
      targetDepartmentIds: ['dept-toan-tin', 'dept-ngu-van', 'dept-khtn'],
      targetUserIds: [],
      status: 'published',
      isPinned: false,
      authorId: 'usr-admin',
      authorName: 'Trần Văn Quản Trị',
      authorRole: 'admin',
      publishedAt: '2026-10-12T14:00:00Z',
      attachments: [],
      readCount: 15,
      readUserIds: ['usr-dean-toan'],
      createdAt: '2026-10-12T13:45:00Z',
      updatedAt: '2026-10-12T14:00:00Z',
    },
  ];

  const events: CalendarEvent[] = [
    {
      id: 'ev-01',
      title: 'Họp Hội đồng Sư phạm tháng 10/2026',
      content: 'Đánh giá công tác tháng 9 và triển khai trọng tâm thi đua đợt 1 năm học 2026 - 2027.',
      purpose: 'Thống nhất kế hoạch chuyên môn và phong trào toàn trường',
      startDate: todayStr,
      endDate: todayStr,
      startTime: '14:00',
      endTime: '16:30',
      location: 'Hội trường Tầng 2 - Nhà Hiệu bộ',
      hostName: 'TS. Nguyễn Văn Hưng - Hiệu trưởng',
      hostId: 'usr-principal',
      attendeesDescription: 'Toàn thể cán bộ quản lý, giáo viên, nhân viên',
      departmentId: 'dept-bgh',
      creatorId: 'usr-principal',
      creatorName: 'TS. Nguyễn Văn Hưng',
      status: 'scheduled',
      isAllDay: false,
      notes: 'Đề nghị đúng giờ, trang phục lịch sự. Các tổ trưởng chuẩn bị báo cáo ngắn 5 phút.',
      attachments: [],
      createdAt: '2026-10-10T08:00:00Z',
    },
    {
      id: 'ev-02',
      title: 'Sinh hoạt Tổ chuyên môn Toán - Tin theo nghiên cứu bài học',
      content: 'Thảo luận chuyên đề: "Xây dựng ma trận đề kiểm tra đánh giá định kỳ theo chương trình GDPT 2018".',
      purpose: 'Nâng cao chất lượng ra đề thi và phân loại học sinh khá giỏi',
      startDate: todayStr,
      endDate: todayStr,
      startTime: '08:00',
      endTime: '10:30',
      location: 'Phòng Hội đồng Tổ Toán (P.204)',
      hostName: 'ThS. Hoàng Minh Đức - Tổ trưởng',
      hostId: 'usr-dean-toan',
      attendeesDescription: 'Toàn bộ giáo viên thuộc Tổ Toán - Tin học',
      departmentId: 'dept-toan-tin',
      creatorId: 'usr-dean-toan',
      creatorName: 'ThS. Hoàng Minh Đức',
      status: 'scheduled',
      isAllDay: false,
      notes: 'Giáo viên mang theo laptop và tài liệu hướng dẫn ra đề của Bộ GD&ĐT.',
      attachments: [],
      createdAt: '2026-10-11T09:00:00Z',
    },
    {
      id: 'ev-03',
      title: 'Kiểm tra công tác an toàn phòng cháy và cơ sở vật chất phòng máy',
      content: 'Đoàn kiểm tra liên ngành phối hợp nhà trường rà soát hệ thống điện và thiết bị dạy học.',
      purpose: 'Đảm bảo an toàn trường học và phòng máy vi tính',
      startDate: todayStr,
      endDate: todayStr,
      startTime: '10:30',
      endTime: '11:45',
      location: 'Khu phòng chức năng & Phòng máy Tin học',
      hostName: 'Ban Cơ sở vật chất & Công an PCCC',
      attendeesDescription: 'Tổ Văn phòng, giáo viên phụ trách phòng máy',
      departmentId: 'dept-van-phong',
      creatorId: 'usr-admin',
      creatorName: 'Trần Văn Quản Trị',
      status: 'scheduled',
      isAllDay: false,
      notes: 'Chuẩn bị sổ kiểm tra tài sản và bình chữa cháy.',
      attachments: [],
      createdAt: '2026-10-12T10:00:00Z',
    },
    {
      id: 'ev-04',
      title: 'Gặp mặt đội tuyển Học sinh giỏi cấp Thành phố môn Ngữ văn',
      content: 'Ban Giám hiệu động viên, giao nhiệm vụ và rà soát lịch bồi dưỡng đợt cuối.',
      purpose: 'Khích lệ tinh thần giáo viên bồi dưỡng và học sinh đội tuyển',
      startDate: todayStr,
      endDate: todayStr,
      startTime: '16:45',
      endTime: '17:30',
      location: 'Phòng Truyền thống nhà trường',
      hostName: 'ThS. Lê Thị Thanh Nhàn - Phó Hiệu trưởng',
      hostId: 'usr-vice-principal',
      attendeesDescription: 'Giáo viên phụ trách đội tuyển và 10 học sinh đội tuyển Ngữ văn',
      departmentId: 'dept-ngu-van',
      creatorId: 'usr-vice-principal',
      creatorName: 'ThS. Lê Thị Thanh Nhàn',
      status: 'scheduled',
      isAllDay: false,
      notes: 'Văn phòng chuẩn bị quà động viên của nhà trường.',
      attachments: [],
      createdAt: '2026-10-13T08:00:00Z',
    },
  ];

  const plans: Plan[] = [
    {
      id: 'plan-01',
      code: 'KH-2026-001',
      title: 'Kế hoạch Giáo dục nhà trường năm học 2026 - 2027',
      type: 'year',
      schoolLevel: 'all',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Căn cứ Công văn hướng dẫn thực hiện nhiệm vụ năm học của Phòng GD&ĐT và Nghị quyết Chi bộ nhà trường.',
      content: 'Chỉ đạo toàn diện hoạt động dạy học chương trình GDPT 2018 cho hai cấp Tiểu học và THCS, đẩy mạnh chuyển đổi số và nâng cao chất lượng giáo dục mũi nhọn.',
      startDate: '2026-09-01',
      endDate: '2027-05-31',
      leadDepartmentId: 'dept-bgh',
      coDepartmentIds: ['dept-th-123', 'dept-th-45', 'dept-khtn-thcs', 'dept-khxh-thcs'],
      responsiblePersonId: 'usr-principal',
      responsiblePersonName: 'Thầy Lê Văn Thành',
      expectedTargets: '100% học sinh hoàn thành chương trình lớp học; trên 98% học sinh đạt phẩm chất và năng lực tốt/khá.',
      expectedBudget: 250000000,
      requiredProofDescription: 'Biên bản nghiệm thu năm học, báo cáo tổng kết trên cơ sở dữ liệu ngành csdl.moet.gov.vn.',
      attachments: [
        {
          id: 'att-kh-01',
          name: 'Ke_hoach_giao_duc_nha_truong_2026_2027.pdf',
          size: 820000,
          type: 'application/pdf',
          url: '/docs/kh_nam_hoc.pdf',
          uploadedAt: '2026-09-02T08:00:00Z',
        },
      ],
      status: 'approved',
      requiredTiers: 1,
      approvedById: 'usr-principal',
      approvedByName: 'Thầy Lê Văn Thành',
      approvedAt: '2026-09-05T09:00:00Z',
      approvalComment: 'Hiệu trưởng phê duyệt ban hành kế hoạch giáo dục toàn trường năm học 2026-2027.',
      decisionHistory: [
        {
          id: 'dec-p1-01',
          planId: 'plan-01',
          tierLevel: 2,
          action: 'submit',
          actorId: 'usr-vice-principal',
          actorName: 'Cô Nguyễn Thị Mai',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Phó Hiệu trưởng trình Hiệu trưởng phê duyệt kế hoạch năm học.',
          timestamp: '2026-09-03T08:00:00Z',
          fromStatus: 'draft',
          toStatus: 'pending_level_2',
          versionSnapshot: 1,
        },
        {
          id: 'dec-p1-02',
          planId: 'plan-01',
          tierLevel: 2,
          action: 'approve_level_2',
          actorId: 'usr-principal',
          actorName: 'Thầy Lê Văn Thành',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Hiệu trưởng phê duyệt ban hành theo Nghị quyết Hội đồng trường.',
          timestamp: '2026-09-05T09:00:00Z',
          fromStatus: 'pending_level_2',
          toStatus: 'approved',
          versionSnapshot: 1,
        },
      ],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-09-02T08:00:00Z',
          modifiedById: 'usr-principal',
          modifiedByName: 'Thầy Lê Văn Thành',
          reason: 'Khởi tạo kế hoạch năm học mới',
          snapshotTitle: 'Kế hoạch Giáo dục nhà trường năm học 2026 - 2027',
        },
      ],
      createdAt: '2026-09-01T08:00:00Z',
      updatedAt: '2026-09-05T09:00:00Z',
    },
    {
      id: 'plan-02',
      code: 'KH-2026-T10',
      title: 'Kế hoạch Hoạt động Chuyên môn tháng 10/2026 - Thi đua chào mừng 20/11',
      type: 'month',
      schoolLevel: 'all',
      parentPlanId: 'plan-01',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Căn cứ Kế hoạch năm học và đợt thi đua Dạy tốt - Học tốt chào mừng ngày Nhà giáo Việt Nam 20/11.',
      content: 'Tổ chức tuần lễ hội giảng cấp trường cho giáo viên Tiểu học và THCS; kiểm tra giữa học kỳ I; rà soát hồ sơ chuyên môn.',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      leadDepartmentId: 'dept-bgh',
      coDepartmentIds: ['dept-th-123', 'dept-th-45', 'dept-khtn-thcs', 'dept-khxh-thcs'],
      responsiblePersonId: 'usr-vice-principal',
      responsiblePersonName: 'Cô Nguyễn Thị Mai',
      expectedTargets: '100% giáo viên tham gia ít nhất 1 tiết hội giảng; 100% tổ nộp ma trận đề đúng hạn.',
      expectedBudget: 35000000,
      requiredProofDescription: 'Biên bản chấm hội giảng, phiếu dự giờ và báo cáo tổng kết chuyên môn tháng.',
      attachments: [],
      status: 'in_progress',
      requiredTiers: 1,
      approvedById: 'usr-principal',
      approvedByName: 'Thầy Lê Văn Thành',
      approvedAt: '2026-10-02T10:00:00Z',
      approvalComment: 'Nhất trí kế hoạch tháng 10. Giao các tổ trưởng triển khai nghiêm túc.',
      decisionHistory: [
        {
          id: 'dec-p2-01',
          planId: 'plan-02',
          tierLevel: 2,
          action: 'submit',
          actorId: 'usr-vice-principal',
          actorName: 'Cô Nguyễn Thị Mai',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Trình Hiệu trưởng phê duyệt kế hoạch tháng 10',
          timestamp: '2026-10-01T08:30:00Z',
          fromStatus: 'draft',
          toStatus: 'pending_level_2',
          versionSnapshot: 1,
        },
        {
          id: 'dec-p2-02',
          planId: 'plan-02',
          tierLevel: 2,
          action: 'approve_level_2',
          actorId: 'usr-principal',
          actorName: 'Thầy Lê Văn Thành',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Hiệu trưởng phê duyệt và yêu cầu đôn đốc thực hiện',
          timestamp: '2026-10-02T10:00:00Z',
          fromStatus: 'pending_level_2',
          toStatus: 'approved',
          versionSnapshot: 1,
        },
        {
          id: 'dec-p2-03',
          planId: 'plan-02',
          action: 'start',
          actorId: 'usr-vice-principal',
          actorName: 'Cô Nguyễn Thị Mai',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Ban Giám hiệu phát lệnh triển khai thực hiện trên toàn trường',
          timestamp: '2026-10-02T10:30:00Z',
          fromStatus: 'approved',
          toStatus: 'in_progress',
          versionSnapshot: 1,
        },
      ],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-10-01T08:30:00Z',
          modifiedById: 'usr-vice-principal',
          modifiedByName: 'Cô Nguyễn Thị Mai',
          reason: 'Lập kế hoạch công tác chuyên môn tháng 10',
          snapshotTitle: 'Kế hoạch Hoạt động Chuyên môn tháng 10/2026',
        },
      ],
      createdAt: '2026-10-01T08:30:00Z',
      updatedAt: '2026-10-02T10:30:00Z',
    },
    {
      id: 'plan-03',
      code: 'KH-KHTN-03',
      title: 'Kế hoạch Bồi dưỡng Học sinh Giỏi cấp Huyện môn KHTN và Toán THCS',
      type: 'department',
      schoolLevel: 'secondary',
      parentPlanId: 'plan-02',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Kế hoạch thi học sinh giỏi các môn văn hóa cấp huyện của Phòng Giáo dục và Đào tạo.',
      content: 'Lập danh sách 15 học sinh các khối 8 và 9; phân công giáo viên ôn luyện theo chuyên đề chuyên sâu 3 buổi/tuần.',
      startDate: '2026-10-15',
      endDate: '2026-12-20',
      leadDepartmentId: 'dept-khtn-thcs',
      coDepartmentIds: [],
      responsiblePersonId: 'usr-dean-khtn',
      responsiblePersonName: 'Thầy Hoàng Minh Đức',
      expectedTargets: 'Ít nhất 06 học sinh đạt giải Nhất, Nhì, Ba cấp Huyện.',
      expectedBudget: 18000000,
      requiredProofDescription: 'Biên bản họp đội tuyển, giáo án bồi dưỡng và bảng điểm kiểm tra khảo sát định kỳ.',
      attachments: [],
      status: 'pending_level_2',
      requiredTiers: 1,
      currentTier: 2,
      decisionHistory: [
        {
          id: 'dec-p3-01',
          planId: 'plan-03',
          tierLevel: 2,
          action: 'submit',
          actorId: 'usr-dean-khtn',
          actorName: 'Thầy Hoàng Minh Đức',
          actorRole: 'dean',
          actorDepartmentId: 'dept-khtn-thcs',
          comment: 'Tổ trưởng KHTN hoàn thiện kế hoạch bồi dưỡng và kính trình Ban Giám hiệu xem xét duyệt.',
          timestamp: '2026-10-14T09:00:00Z',
          fromStatus: 'draft',
          toStatus: 'pending_level_2',
          versionSnapshot: 1,
        },
      ],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-10-14T09:00:00Z',
          modifiedById: 'usr-dean-khtn',
          modifiedByName: 'Thầy Hoàng Minh Đức',
          reason: 'Tổ KHTN trình duyệt kế hoạch bồi dưỡng HSG',
          snapshotTitle: 'Kế hoạch Bồi dưỡng HSG KHTN và Toán',
        },
      ],
      createdAt: '2026-10-14T09:00:00Z',
      updatedAt: '2026-10-14T09:00:00Z',
    },
    {
      id: 'plan-04',
      code: 'KH-TH3-01',
      title: 'Kế hoạch Dạy học Tăng cường Tiếng Việt & Toán Phụ đạo Học sinh Khối 3',
      type: 'academic',
      schoolLevel: 'primary',
      parentPlanId: 'plan-02',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Kết quả khảo sát chất lượng đầu năm lớp 3A và 3B; yêu cầu phân loại học sinh của Tổ Tiểu học.',
      content: 'Tổ chức phụ đạo miễn phí 2 tiết/tuần vào chiều Thứ Năm cho 12 học sinh còn đọc chậm và chưa thuần thục bảng nhân chia.',
      startDate: '2026-10-20',
      endDate: '2026-12-15',
      leadDepartmentId: 'dept-th-123',
      coDepartmentIds: [],
      responsiblePersonId: 'usr-teacher-2',
      responsiblePersonName: 'Cô Vũ Thị Thu Hương',
      expectedTargets: '100% học sinh phụ đạo đạt chuẩn đọc thông viết thạo và nắm vững phép nhân chia cơ bản.',
      expectedBudget: 3500000,
      requiredProofDescription: 'Sổ theo dõi học sinh phụ đạo, bài kiểm tra đánh giá tiến bộ hàng tháng.',
      attachments: [],
      status: 'pending_level_1',
      requiredTiers: 2,
      currentTier: 1,
      decisionHistory: [
        {
          id: 'dec-p4-01',
          planId: 'plan-04',
          tierLevel: 1,
          action: 'submit',
          actorId: 'usr-teacher-2',
          actorName: 'Cô Vũ Thị Thu Hương',
          actorRole: 'teacher',
          actorDepartmentId: 'dept-th-123',
          comment: 'Giáo viên gửi Tổ trưởng chuyên môn thẩm định Cấp 1',
          timestamp: '2026-10-15T08:30:00Z',
          fromStatus: 'draft',
          toStatus: 'pending_level_1',
          versionSnapshot: 1,
        },
      ],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-10-15T08:30:00Z',
          modifiedById: 'usr-teacher-2',
          modifiedByName: 'Cô Vũ Thị Thu Hương',
          reason: 'Xây dựng kế hoạch phụ đạo học sinh lớp 3',
          snapshotTitle: 'Kế hoạch Dạy học Tăng cường Tiếng Việt & Toán Khối 3',
        },
      ],
      createdAt: '2026-10-15T08:30:00Z',
      updatedAt: '2026-10-15T08:30:00Z',
    },
    {
      id: 'plan-05',
      code: 'KH-STEM-02',
      title: 'Kế hoạch Tổ chức Ngày hội Trải nghiệm STEM cấp THCS năm học 2026 - 2027',
      type: 'event',
      schoolLevel: 'secondary',
      parentPlanId: 'plan-01',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Kế hoạch giáo dục STEM và nghiên cứu khoa học kỹ thuật cấp trường.',
      content: 'Học sinh các khối 6, 7, 8, 9 trưng bày mô hình robot, sản phẩm tái chế bảo vệ môi trường và giải pháp nông nghiệp thông minh.',
      startDate: '2026-11-10',
      endDate: '2026-11-18',
      leadDepartmentId: 'dept-khtn-thcs',
      coDepartmentIds: ['dept-doan-doi'],
      responsiblePersonId: 'usr-teacher-1',
      responsiblePersonName: 'Thầy Đỗ Quang Khải',
      expectedTargets: 'Mỗi chi đội có ít nhất 02 sản phẩm STEM dự thi; chọn 03 sản phẩm thi cấp huyện.',
      expectedBudget: 15000000,
      requiredProofDescription: 'Hình ảnh triển lãm, biên bản chấm giải của Ban Giám khảo, bản thuyết minh sản phẩm.',
      attachments: [],
      status: 'revision_level_1',
      requiredTiers: 2,
      currentTier: 1,
      revisionComment: 'Tổ trưởng KHTN: Yêu cầu Thầy Khải bổ sung quy chuẩn an toàn về nguồn điện phòng máy và chi tiết dự toán vật tư.',
      decisionHistory: [
        {
          id: 'dec-p5-01',
          planId: 'plan-05',
          tierLevel: 1,
          action: 'submit',
          actorId: 'usr-teacher-1',
          actorName: 'Thầy Đỗ Quang Khải',
          actorRole: 'teacher',
          actorDepartmentId: 'dept-khtn-thcs',
          comment: 'Gửi Tổ trưởng KHTN phê duyệt Cấp 1',
          timestamp: '2026-10-12T14:00:00Z',
          fromStatus: 'draft',
          toStatus: 'pending_level_1',
          versionSnapshot: 1,
        },
        {
          id: 'dec-p5-02',
          planId: 'plan-05',
          tierLevel: 1,
          action: 'reject_level_1',
          actorId: 'usr-dean-khtn',
          actorName: 'Thầy Hoàng Minh Đức',
          actorRole: 'dean',
          actorDepartmentId: 'dept-khtn-thcs',
          comment: 'Yêu cầu Thầy Khải bổ sung quy chuẩn an toàn về nguồn điện phòng máy và chi tiết dự toán vật tư.',
          timestamp: '2026-10-13T10:00:00Z',
          fromStatus: 'pending_level_1',
          toStatus: 'revision_level_1',
          versionSnapshot: 1,
        },
      ],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-10-12T14:00:00Z',
          modifiedById: 'usr-teacher-1',
          modifiedByName: 'Thầy Đỗ Quang Khải',
          reason: 'Khởi tạo kế hoạch ngày hội STEM',
          snapshotTitle: 'Kế hoạch Tổ chức Ngày hội STEM THCS',
        },
      ],
      createdAt: '2026-10-12T14:00:00Z',
      updatedAt: '2026-10-13T10:00:00Z',
    },
    {
      id: 'plan-06',
      code: 'KH-CD-TH01',
      title: 'Kế hoạch Sinh hoạt Chuyên đề Đổi mới Phương pháp Dạy học Tiếng Việt Lớp 1',
      type: 'department',
      schoolLevel: 'primary',
      parentPlanId: 'plan-02',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Nhiệm vụ chuyên môn trọng tâm khối 1 theo chương trình GDPT 2018.',
      content: 'Tổ chức tiết dạy thể nghiệm chuyên đề rèn kỹ năng đọc hiểu kết hợp trò chơi học tập tương tác.',
      startDate: '2026-10-22',
      endDate: '2026-10-28',
      leadDepartmentId: 'dept-th-123',
      coDepartmentIds: [],
      responsiblePersonId: 'usr-dean-th123',
      responsiblePersonName: 'Cô Bùi Thị Hồng',
      expectedTargets: '100% giáo viên khối 1 tham gia góp ý và áp dụng bài học kinh nghiệm.',
      expectedBudget: 5000000,
      requiredProofDescription: 'Biên bản sinh hoạt chuyên môn, giáo án thể nghiệm và phiếu góp ý tiết dạy.',
      attachments: [],
      status: 'revision_level_2',
      requiredTiers: 2,
      currentTier: 2,
      level1ApprovedById: 'usr-dean-th123',
      level1ApprovedByName: 'Cô Bùi Thị Hồng',
      level1ApprovedAt: '2026-10-13T16:00:00Z',
      level1Comment: 'Tổ Tiểu học thống nhất nội dung chuyên đề',
      revisionComment: 'Ban Giám hiệu: Ngày 25/10 trùng lịch đoàn kiểm tra liên ngành của huyện. Đề nghị Tổ dời lịch sinh hoạt sang chiều Thứ Sáu 28/10.',
      decisionHistory: [
        {
          id: 'dec-p6-01',
          planId: 'plan-06',
          tierLevel: 1,
          action: 'submit',
          actorId: 'usr-dean-th123',
          actorName: 'Cô Bùi Thị Hồng',
          actorRole: 'dean',
          actorDepartmentId: 'dept-th-123',
          comment: 'Tổ trưởng trình kế hoạch sinh hoạt chuyên đề',
          timestamp: '2026-10-13T15:00:00Z',
          fromStatus: 'draft',
          toStatus: 'pending_level_1',
          versionSnapshot: 1,
        },
        {
          id: 'dec-p6-02',
          planId: 'plan-06',
          tierLevel: 1,
          action: 'approve_level_1',
          actorId: 'usr-dean-th123',
          actorName: 'Cô Bùi Thị Hồng',
          actorRole: 'dean',
          actorDepartmentId: 'dept-th-123',
          comment: 'Tổ trưởng xác nhận thông qua Cấp 1 và chuyển BGH duyệt Cấp 2',
          timestamp: '2026-10-13T16:00:00Z',
          fromStatus: 'pending_level_1',
          toStatus: 'pending_level_2',
          versionSnapshot: 1,
        },
        {
          id: 'dec-p6-03',
          planId: 'plan-06',
          tierLevel: 2,
          action: 'reject_level_2',
          actorId: 'usr-principal',
          actorName: 'Thầy Lê Văn Thành',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Ngày 25/10 trùng lịch đoàn kiểm tra liên ngành của huyện. Đề nghị Tổ dời lịch sinh hoạt sang chiều Thứ Sáu 28/10.',
          timestamp: '2026-10-14T11:00:00Z',
          fromStatus: 'pending_level_2',
          toStatus: 'revision_level_2',
          versionSnapshot: 1,
        },
      ],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-10-13T15:00:00Z',
          modifiedById: 'usr-dean-th123',
          modifiedByName: 'Cô Bùi Thị Hồng',
          reason: 'Lập kế hoạch chuyên đề lớp 1',
          snapshotTitle: 'Kế hoạch Sinh hoạt Chuyên đề Tiếng Việt 1',
        },
      ],
      createdAt: '2026-10-13T15:00:00Z',
      updatedAt: '2026-10-14T11:00:00Z',
    },
    {
      id: 'plan-07',
      code: 'KH-VP-PCCC',
      title: 'Kế hoạch Diễn tập Phương án PCCC & Cứu nạn Cứu hộ Học đường 2026',
      type: 'inspection',
      schoolLevel: 'all',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Quy định an toàn trường học và phối hợp Công an Huyện Thạch Thành.',
      content: 'Tập huấn kỹ năng thoát hiểm khi có hỏa hoạn cho toàn thể cán bộ, giáo viên và học sinh hai cấp Tiểu học và THCS.',
      startDate: '2026-11-05',
      endDate: '2026-11-08',
      leadDepartmentId: 'dept-vp-yt',
      coDepartmentIds: ['dept-doan-doi'],
      responsiblePersonId: 'usr-admin',
      responsiblePersonName: 'Trần Văn Quản Trị',
      expectedTargets: '100% cán bộ giáo viên sử dụng thành thạo bình chữa cháy xách tay.',
      expectedBudget: 8000000,
      requiredProofDescription: 'Biên bản phối hợp Công an PCCC, hình ảnh diễn tập và danh sách ký nhận tập huấn.',
      attachments: [],
      status: 'draft',
      requiredTiers: 1,
      decisionHistory: [],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-10-15T09:00:00Z',
          modifiedById: 'usr-admin',
          modifiedByName: 'Trần Văn Quản Trị',
          reason: 'Dự thảo kế hoạch diễn tập PCCC',
          snapshotTitle: 'Kế hoạch Diễn tập PCCC Học đường 2026',
        },
      ],
      createdAt: '2026-10-15T09:00:00Z',
      updatedAt: '2026-10-15T09:00:00Z',
    },
    {
      id: 'plan-08',
      code: 'KH-KS-DNH',
      title: 'Kế hoạch Khảo sát Chất lượng Học sinh Đầu năm học 2026 - 2027',
      type: 'inspection',
      schoolLevel: 'all',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Nhiệm vụ đầu năm học nhằm phân loại đối tượng học sinh.',
      content: 'Tổ chức kiểm tra chất lượng môn Toán và Tiếng Việt/Ngữ văn các khối 2, 3, 4, 5, 6, 7, 8, 9.',
      startDate: '2026-09-10',
      endDate: '2026-09-20',
      leadDepartmentId: 'dept-bgh',
      coDepartmentIds: ['dept-th-123', 'dept-th-45', 'dept-khtn-thcs', 'dept-khxh-thcs'],
      responsiblePersonId: 'usr-principal',
      responsiblePersonName: 'Thầy Lê Văn Thành',
      expectedTargets: 'Hoàn thành 100% chấm bài và nhập điểm vào hệ thống trước 25/09/2026.',
      expectedBudget: 12000000,
      requiredProofDescription: 'Bảng thống kê điểm số khảo sát, biên bản bàn giao bài kiểm tra.',
      attachments: [],
      status: 'completed',
      requiredTiers: 1,
      approvedById: 'usr-principal',
      approvedByName: 'Thầy Lê Văn Thành',
      approvedAt: '2026-09-08T09:00:00Z',
      approvalComment: 'Hiệu trưởng phê duyệt và ban hành lịch khảo sát',
      decisionHistory: [
        {
          id: 'dec-p8-01',
          planId: 'plan-08',
          action: 'start',
          actorId: 'usr-principal',
          actorName: 'Thầy Lê Văn Thành',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Khởi động khảo sát đầu năm',
          timestamp: '2026-09-10T08:00:00Z',
          fromStatus: 'approved',
          toStatus: 'in_progress',
          versionSnapshot: 1,
        },
        {
          id: 'dec-p8-02',
          planId: 'plan-08',
          action: 'complete',
          actorId: 'usr-principal',
          actorName: 'Thầy Lê Văn Thành',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Hoàn thành toàn bộ công tác khảo sát và nhập điểm',
          timestamp: '2026-09-21T16:00:00Z',
          fromStatus: 'in_progress',
          toStatus: 'completed',
          versionSnapshot: 1,
        },
      ],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-09-08T09:00:00Z',
          modifiedById: 'usr-principal',
          modifiedByName: 'Thầy Lê Văn Thành',
          reason: 'Lập kế hoạch khảo sát đầu năm',
          snapshotTitle: 'Kế hoạch Khảo sát Chất lượng Đầu năm học',
        },
      ],
      createdAt: '2026-09-08T09:00:00Z',
      updatedAt: '2026-09-21T16:00:00Z',
    },
    {
      id: 'plan-09',
      code: 'KH-BONGDA-2026',
      title: 'Kế hoạch Giải Bóng đá Mini Học sinh Chào mừng 20/11',
      type: 'event',
      schoolLevel: 'secondary',
      parentPlanId: 'plan-02',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Phong trào rèn luyện thể chất và chào mừng ngày Nhà giáo Việt Nam.',
      content: 'Tổ chức giải đấu bóng đá nam học sinh các khối 6, 7, 8, 9 trên sân cỏ nhân tạo nhà trường.',
      startDate: '2026-10-18',
      endDate: '2026-11-15',
      leadDepartmentId: 'dept-doan-doi',
      coDepartmentIds: ['dept-nn-nt'],
      responsiblePersonId: 'usr-teacher-3',
      responsiblePersonName: 'Cô Nguyễn Diệu Linh',
      expectedTargets: '100% chi đội tham gia thi đấu văn minh, an toàn.',
      expectedBudget: 10000000,
      requiredProofDescription: 'Biên bản trận đấu, hình ảnh trao giải và tổng kết phong trào.',
      attachments: [],
      status: 'paused',
      requiredTiers: 2,
      level1ApprovedById: 'usr-dean-khtn',
      level1ApprovedByName: 'Thầy Hoàng Minh Đức',
      level1ApprovedAt: '2026-10-10T10:00:00Z',
      approvedById: 'usr-principal',
      approvedByName: 'Thầy Lê Văn Thành',
      approvedAt: '2026-10-12T08:00:00Z',
      decisionHistory: [
        {
          id: 'dec-p9-01',
          planId: 'plan-09',
          action: 'pause',
          actorId: 'usr-principal',
          actorName: 'Thầy Lê Văn Thành',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Tạm dừng giải đấu do đợt mưa bão kéo dài, bảo đảm sức khỏe học sinh.',
          timestamp: '2026-10-14T14:00:00Z',
          fromStatus: 'in_progress',
          toStatus: 'paused',
          versionSnapshot: 1,
        },
      ],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-10-09T08:00:00Z',
          modifiedById: 'usr-teacher-3',
          modifiedByName: 'Cô Nguyễn Diệu Linh',
          reason: 'Lập kế hoạch giải bóng đá học sinh',
          snapshotTitle: 'Kế hoạch Giải Bóng đá Mini Học sinh',
        },
      ],
      createdAt: '2026-10-09T08:00:00Z',
      updatedAt: '2026-10-14T14:00:00Z',
    },
    {
      id: 'plan-10',
      code: 'KH-CSVC-DN',
      title: 'Kế hoạch Cải tạo Mái che Sân Thể thao & Nhà đa năng',
      type: 'department',
      schoolLevel: 'all',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Đề xuất nâng cấp sân trường phục vụ hoạt động tập thể.',
      content: 'Lắp đặt hệ thống bạt kéo mái che di động và sửa chữa đèn chiếu sáng sân thể thao.',
      startDate: '2026-09-15',
      endDate: '2026-10-15',
      leadDepartmentId: 'dept-vp-yt',
      coDepartmentIds: [],
      responsiblePersonId: 'usr-admin',
      responsiblePersonName: 'Trần Văn Quản Trị',
      expectedTargets: 'Hoàn thành lắp đặt đảm bảo an toàn kỹ thuật.',
      expectedBudget: 45000000,
      attachments: [],
      status: 'cancelled',
      requiredTiers: 1,
      decisionHistory: [
        {
          id: 'dec-p10-01',
          planId: 'plan-10',
          action: 'cancel',
          actorId: 'usr-principal',
          actorName: 'Thầy Lê Văn Thành',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Hủy kế hoạch do UBND xã đã phê duyệt dự án đầu tư nhà tập đa năng kiên cố năm 2027.',
          timestamp: '2026-09-25T10:00:00Z',
          fromStatus: 'pending_level_2',
          toStatus: 'cancelled',
          versionSnapshot: 1,
        },
      ],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-09-14T10:00:00Z',
          modifiedById: 'usr-admin',
          modifiedByName: 'Trần Văn Quản Trị',
          reason: 'Dự thảo đề xuất cải tạo sân',
          snapshotTitle: 'Kế hoạch Cải tạo Mái che Sân',
        },
      ],
      createdAt: '2026-09-14T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    },
    {
      id: 'plan-11',
      code: 'KH-KDCL-01',
      title: 'Kế hoạch Tự đánh giá Kiểm định Chất lượng Giáo dục Giai đoạn 1',
      type: 'inspection',
      schoolLevel: 'all',
      schoolYearId: 'sy-2026-2027',
      basisAndGoals: 'Thông tư số 18/2018/TT-BGDĐT ban hành quy định về kiểm định chất lượng giáo dục trường liên cấp.',
      content: 'Thu thập minh chứng tiêu chuẩn 1, 2, 3 và hoàn thiện báo cáo tự đánh giá của Hội đồng tự đánh giá.',
      startDate: '2026-08-01',
      endDate: '2026-09-30', // Quá hạn so với thời điểm hiện tại (tháng 10/2026)
      leadDepartmentId: 'dept-bgh',
      coDepartmentIds: ['dept-vp-yt', 'dept-th-123', 'dept-khtn-thcs'],
      responsiblePersonId: 'usr-vice-principal',
      responsiblePersonName: 'Cô Nguyễn Thị Mai',
      expectedTargets: 'Thu thập đầy đủ 100% hồ sơ minh chứng tiêu chuẩn cơ sở vật chất và nhân sự.',
      expectedBudget: 20000000,
      requiredProofDescription: 'Hồ sơ mã minh chứng tiêu chuẩn kiểm định chất lượng.',
      attachments: [],
      status: 'in_progress', // Quá hạn vì endDate là 2026-09-30 nhưng chưa chuyển sang completed
      requiredTiers: 1,
      approvedById: 'usr-principal',
      approvedByName: 'Thầy Lê Văn Thành',
      approvedAt: '2026-08-05T09:00:00Z',
      approvalComment: 'Hiệu trưởng phê duyệt thành lập Hội đồng và kế hoạch tự đánh giá',
      decisionHistory: [
        {
          id: 'dec-p11-01',
          planId: 'plan-11',
          action: 'start',
          actorId: 'usr-vice-principal',
          actorName: 'Cô Nguyễn Thị Mai',
          actorRole: 'principal',
          actorDepartmentId: 'dept-bgh',
          comment: 'Bắt đầu triển khai thu thập minh chứng',
          timestamp: '2026-08-05T10:00:00Z',
          fromStatus: 'approved',
          toStatus: 'in_progress',
          versionSnapshot: 1,
        },
      ],
      versions: [
        {
          version: 1,
          modifiedAt: '2026-08-01T08:00:00Z',
          modifiedById: 'usr-vice-principal',
          modifiedByName: 'Cô Nguyễn Thị Mai',
          reason: 'Lập kế hoạch tự đánh giá kiểm định',
          snapshotTitle: 'Kế hoạch Tự đánh giá Kiểm định Chất lượng',
        },
      ],
      createdAt: '2026-08-01T08:00:00Z',
      updatedAt: '2026-08-05T10:00:00Z',
    },
  ];

  const tasks: Task[] = [
    {
      id: 'tsk-01',
      title: 'Biên soạn ma trận và bản đặc tả đề kiểm tra giữa học kỳ I môn Toán khối 12',
      description: 'Yêu cầu bám sát cấu trúc đề minh họa mới của Bộ GD&ĐT theo định dạng trắc nghiệm nhiều lựa chọn, trắc nghiệm đúng/sai và trả lời ngắn.',
      planId: 'plan-02',
      planTitle: 'Kế hoạch Hoạt động Chuyên môn tháng 10/2026',
      assignerId: 'usr-dean-toan',
      assignerName: 'ThS. Hoàng Minh Đức (Tổ trưởng)',
      mainAssigneeId: 'usr-teacher-1',
      mainAssigneeName: 'Thầy Đỗ Quang Khải',
      coAssigneeIds: ['usr-teacher-2'],
      departmentId: 'dept-toan-tin',
      issuedDate: '2026-10-05',
      deadline: '2026-10-20',
      priority: 'high',
      status: 'in_progress',
      progress: 65,
      requiredResult: '01 file ma trận Word, 01 bản đặc tả chi tiết và 02 mã đề gốc có kèm đáp án và thang điểm chấm.',
      isProofRequired: true,
      proofs: [
        {
          id: 'att-tsk-01',
          name: 'Ma_tran_de_kiem_tra_Toan_12_GKI.docx',
          size: 145000,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          url: '/docs/ma_tran_toan_12.docx',
          uploadedAt: '2026-10-13T16:20:00Z',
        },
      ],
      completionNote: 'Đã hoàn thành 80% câu hỏi trắc nghiệm đúng/sai. Đang hoàn thiện phần câu hỏi trả lời ngắn theo đúng phân phối ma trận.',
      comments: [
        {
          id: 'cmt-01',
          authorId: 'usr-dean-toan',
          authorName: 'ThS. Hoàng Minh Đức',
          authorRole: 'dean',
          content: 'Thầy Khải lưu ý bổ sung thêm các bài toán thực tế về ứng dụng đạo hàm khảo sát hàm số theo đúng yêu cầu chương trình mới nhé.',
          createdAt: '2026-10-12T09:15:00Z',
        },
        {
          id: 'cmt-02',
          authorId: 'usr-teacher-1',
          authorName: 'Thầy Đỗ Quang Khải',
          authorRole: 'teacher',
          content: 'Em đã tiếp thu và đang tích hợp 3 bài toán tối ưu hóa thực tế vào phần trả lời ngắn. Ngày 18/10 sẽ gửi bản hoàn chỉnh để Tổ trưởng thẩm định ạ.',
          createdAt: '2026-10-12T14:30:00Z',
        },
      ],
      history: [
        {
          id: 'h-01',
          timestamp: '2026-10-05T08:30:00Z',
          actorId: 'usr-dean-toan',
          actorName: 'ThS. Hoàng Minh Đức',
          action: 'Giao nhiệm vụ cho Thầy Đỗ Quang Khải',
          note: 'Hạn chót nộp 20/10/2026',
        },
        {
          id: 'h-02',
          timestamp: '2026-10-13T16:20:00Z',
          actorId: 'usr-teacher-1',
          actorName: 'Thầy Đỗ Quang Khải',
          action: 'Cập nhật tiến độ 65% và tải lên minh chứng dự thảo',
        },
      ],
      createdAt: '2026-10-05T08:30:00Z',
      updatedAt: '2026-10-13T16:20:00Z',
    },
    {
      id: 'tsk-02',
      title: 'Kiểm tra bảo dưỡng toàn bộ 45 máy tính phòng thực hành số 1',
      description: 'Cài đặt bổ sung phần mềm Python 3.12, Scratch và công cụ kiểm thử code phục vụ kiểm tra thực hành Tin học khối 10.',
      planId: 'plan-02',
      planTitle: 'Kế hoạch Hoạt động Chuyên môn tháng 10/2026',
      assignerId: 'usr-dean-toan',
      assignerName: 'ThS. Hoàng Minh Đức (Tổ trưởng)',
      mainAssigneeId: 'usr-teacher-2',
      mainAssigneeName: 'Cô Vũ Thị Thu Hương',
      coAssigneeIds: [],
      departmentId: 'dept-toan-tin',
      issuedDate: '2026-10-08',
      deadline: '2026-10-17',
      priority: 'urgent',
      status: 'pending_verification',
      progress: 100,
      requiredResult: 'Biên bản nghiệm thu kỹ thuật phòng máy có chữ ký xác nhận của cán bộ thiết bị văn phòng.',
      isProofRequired: true,
      proofs: [
        {
          id: 'att-tsk-02',
          name: 'Bien_ban_kiem_tra_phong_may_so_1.pdf',
          size: 312000,
          type: 'application/pdf',
          url: '/docs/bb_phong_may_1.pdf',
          uploadedAt: '2026-10-14T15:00:00Z',
        },
      ],
      completionNote: 'Đã hoàn tất cài đặt và kiểm tra mạng LAN trên 45/45 máy, thay thế 02 dây mạng bị chập chờn. Kính trình Tổ trưởng và Ban Giám hiệu nghiệm thu.',
      comments: [
        {
          id: 'cmt-03',
          authorId: 'usr-teacher-2',
          authorName: 'Cô Vũ Thị Thu Hương',
          authorRole: 'teacher',
          content: 'Đã hoàn tất toàn bộ công việc và nộp biên bản nghiệm thu đính kèm ạ.',
          createdAt: '2026-10-14T15:05:00Z',
        },
      ],
      history: [
        {
          id: 'h-03',
          timestamp: '2026-10-08T09:00:00Z',
          actorId: 'usr-dean-toan',
          actorName: 'ThS. Hoàng Minh Đức',
          action: 'Giao nhiệm vụ bảo dưỡng phòng máy',
        },
        {
          id: 'h-04',
          timestamp: '2026-10-14T15:00:00Z',
          actorId: 'usr-teacher-2',
          actorName: 'Cô Vũ Thị Thu Hương',
          action: 'Đã hoàn thành và gửi báo cáo chờ xác nhận',
        },
      ],
      createdAt: '2026-10-08T09:00:00Z',
      updatedAt: '2026-10-14T15:00:00Z',
    },
    {
      id: 'tsk-03',
      title: 'Tổng hợp danh sách học sinh tham gia Hội thi Văn học học trò và Câu lạc bộ Đọc sách',
      description: 'Lập danh sách học sinh các khối 10, 11 đăng ký tham dự sinh hoạt CLB và dự thi viết cảm nhận văn học chào mừng 20/11.',
      planId: 'plan-02',
      planTitle: 'Kế hoạch Hoạt động Chuyên môn tháng 10/2026',
      assignerId: 'usr-dean-van',
      assignerName: 'Cô Phạm Thị Minh Trang (Tổ trưởng)',
      mainAssigneeId: 'usr-teacher-3',
      mainAssigneeName: 'Cô Nguyễn Diệu Linh',
      coAssigneeIds: [],
      departmentId: 'dept-ngu-van',
      issuedDate: '2026-10-02',
      deadline: '2026-10-12',
      priority: 'normal',
      status: 'overdue',
      progress: 40,
      requiredResult: 'Bảng tổng hợp danh sách trên Excel có số điện thoại liên hệ phụ huynh và đề xuất dự toán mua sách bổ sung.',
      isProofRequired: true,
      proofs: [],
      completionNote: 'Một số lớp khối 10 nộp danh sách muộn do bận hoạt động thể thao. Em đang đôn đốc GVCN gửi bổ sung trong ngày hôm nay.',
      comments: [
        {
          id: 'cmt-04',
          authorId: 'usr-dean-van',
          authorName: 'Cô Phạm Thị Minh Trang',
          authorRole: 'dean',
          content: 'Cô Linh chú ý nhiệm vụ này đã quá hạn 2 ngày, khẩn trương hoàn thành để tổ nộp lên Ban Giám hiệu duyệt kinh phí nhé.',
          createdAt: '2026-10-14T08:30:00Z',
        },
      ],
      history: [
        {
          id: 'h-05',
          timestamp: '2026-10-02T10:00:00Z',
          actorId: 'usr-dean-van',
          actorName: 'Cô Phạm Thị Minh Trang',
          action: 'Giao nhiệm vụ lập danh sách CLB Văn học',
        },
      ],
      createdAt: '2026-10-02T10:00:00Z',
      updatedAt: '2026-10-14T08:30:00Z',
    },
    {
      id: 'tsk-04',
      title: 'Báo cáo rà soát cơ sở dữ liệu cán bộ, giáo viên trên cổng thông tin ngành GD&ĐT',
      description: 'Cập nhật hồ sơ bằng cấp, chứng chỉ bồi dưỡng chức danh nghề nghiệp và thông tin bảo hiểm của toàn bộ 115 cán bộ giáo viên.',
      assignerId: 'usr-principal',
      assignerName: 'TS. Nguyễn Văn Hưng (Hiệu trưởng)',
      mainAssigneeId: 'usr-admin',
      mainAssigneeName: 'Trần Văn Quản Trị',
      coAssigneeIds: [],
      departmentId: 'dept-van-phong',
      issuedDate: '2026-09-25',
      deadline: '2026-10-10',
      priority: 'high',
      status: 'completed',
      progress: 100,
      requiredResult: 'Báo cáo đối soát 100% dữ liệu trùng khớp và xuất file trích lục từ cổng csdl.moet.gov.vn.',
      isProofRequired: true,
      proofs: [
        {
          id: 'att-tsk-04',
          name: 'Bao_cao_doi_soat_csdl_can_bo_10_2026.pdf',
          size: 420000,
          type: 'application/pdf',
          url: '/docs/bao_cao_csdl.pdf',
          uploadedAt: '2026-10-09T14:00:00Z',
        },
      ],
      completionNote: 'Đã hoàn tất rà soát 115/115 hồ sơ, dữ liệu đã đồng bộ chuẩn xác với cổng Sở GD&ĐT.',
      reviewComment: 'Hiệu trưởng đánh giá tốt, hoàn thành đúng tiến độ và dữ liệu chuẩn xác.',
      comments: [],
      history: [
        {
          id: 'h-06',
          timestamp: '2026-09-25T08:00:00Z',
          actorId: 'usr-principal',
          actorName: 'TS. Nguyễn Văn Hưng',
          action: 'Giao nhiệm vụ rà soát CSDL',
        },
        {
          id: 'h-07',
          timestamp: '2026-10-09T14:00:00Z',
          actorId: 'usr-admin',
          actorName: 'Trần Văn Quản Trị',
          action: 'Nộp báo cáo và minh chứng',
        },
        {
          id: 'h-08',
          timestamp: '2026-10-10T09:00:00Z',
          actorId: 'usr-principal',
          actorName: 'TS. Nguyễn Văn Hưng',
          action: 'Hiệu trưởng phê duyệt hoàn thành nhiệm vụ',
        },
      ],
      createdAt: '2026-09-25T08:00:00Z',
      updatedAt: '2026-10-10T09:00:00Z',
    },
  ];

  const reports: Report[] = [
    {
      id: 'rep-01',
      title: 'Báo cáo định kỳ công tác Chuyên môn Tuần 07 - Năm học 2026 - 2027',
      type: 'weekly',
      period: 'Tuần 07 (05/10 - 11/10/2026)',
      departmentId: 'dept-toan-tin',
      authorId: 'usr-dean-toan',
      authorName: 'ThS. Hoàng Minh Đức',
      authorRole: 'dean',
      executedContent: 'Tổ Toán - Tin học đã thực hiện nghiêm túc 100% tiết dạy theo thời khóa biểu. Tổ chức thành công 02 tiết thao giảng chuyên đề Toán giải tích 12 và Lập trình Python 10. Hoàn tất bảo dưỡng phòng máy tính số 1.',
      achievedResults: '100% giờ dạy xếp loại Tốt và Khá. 100% học sinh khối 12 có đủ đề cương ôn tập giữa kỳ I.',
      completionRate: 98,
      difficultiesAndCauses: 'Hệ thống đường truyền cáp quang đôi lúc bị nghẽn cục bộ vào đầu giờ chiều do nhiều lớp cùng truy cập phần mềm mô phỏng hình học Geogebra.',
      upcomingSolutions: 'Kiến nghị Ban Giám hiệu phê duyệt nâng cấp băng thông gói Internet chuyên dùng cho khu nhà chức năng.',
      proofs: [
        {
          id: 'att-rep-01',
          name: 'Bao_cao_tuan_07_Toan_Tin.pdf',
          size: 280000,
          type: 'application/pdf',
          url: '/docs/bao_cao_tuan_07.pdf',
          uploadedAt: '2026-10-11T16:00:00Z',
        },
      ],
      status: 'approved',
      reviewedById: 'usr-vice-principal',
      reviewedByName: 'ThS. Lê Thị Thanh Nhàn',
      reviewedAt: '2026-10-12T08:30:00Z',
      reviewComment: 'Ban Giám hiệu biểu dương tinh thần làm việc tích cực của Tổ. Đồng ý giao Văn phòng liên hệ nhà mạng khảo sát nâng cấp đường truyền.',
      createdAt: '2026-10-11T16:00:00Z',
      updatedAt: '2026-10-12T08:30:00Z',
    },
    {
      id: 'rep-02',
      title: 'Báo cáo tiến độ bồi dưỡng học sinh giỏi và dự thi KHKT cấp trường',
      type: 'monthly',
      period: 'Tháng 10/2026',
      departmentId: 'dept-toan-tin',
      authorId: 'usr-teacher-1',
      authorName: 'Thầy Đỗ Quang Khải',
      authorRole: 'teacher',
      executedContent: 'Đã hoàn thành 16/20 buổi bồi dưỡng chuyên đề Hình học không gian và Bất đẳng thức cho đội tuyển HSG Toán 12. Hướng dẫn 02 đề tài tham dự Cuộc thi Nghiên cứu KHKT cấp trường.',
      achievedResults: 'Các em học sinh nắm vững các dạng bài nâng cao, bài kiểm tra khảo sát lần 1 đạt điểm bình quân 15.8/20.',
      completionRate: 85,
      difficultiesAndCauses: 'Học sinh đội tuyển trùng lịch một số buổi học thêm môn phụ.',
      upcomingSolutions: 'Điều chỉnh lịch bồi dưỡng cố định vào chiều Thứ Ba và sáng Thứ Bảy.',
      proofs: [],
      status: 'submitted',
      createdAt: '2026-10-13T10:00:00Z',
      updatedAt: '2026-10-13T10:00:00Z',
    },
  ];

  const documents: DocumentItem[] = [
    {
      id: 'doc-01',
      codeNumber: '86/QĐ-CVA',
      title: 'Quyết định ban hành Quy chế làm việc và phân công nhiệm vụ năm học 2026 - 2027',
      type: 'decision',
      departmentId: 'dept-bgh',
      issuedDate: '2026-09-05',
      signer: 'TS. Nguyễn Văn Hưng - Hiệu trưởng',
      summary: 'Quy định chi tiết quyền hạn, trách nhiệm và chế độ hội họp của Ban Giám hiệu, Tổ trưởng chuyên môn và giáo viên nhân viên.',
      isPublic: true,
      file: {
        id: 'att-doc-01',
        name: 'Quy_che_lam_viec_2026_2027.pdf',
        size: 512000,
        type: 'application/pdf',
        url: '/docs/quy_che_lam_viec.pdf',
        uploadedAt: '2026-09-05T10:00:00Z',
      },
      relatedPlanId: 'plan-01',
      downloadCount: 88,
      createdAt: '2026-09-05T10:00:00Z',
    },
    {
      id: 'doc-02',
      codeNumber: '105/KH-THPT',
      title: 'Kế hoạch Tổ chức Kiểm tra đánh giá giữa học kỳ I năm học 2026 - 2027',
      type: 'plan',
      departmentId: 'dept-bgh',
      issuedDate: '2026-10-02',
      signer: 'ThS. Lê Thị Thanh Nhàn - Phó Hiệu trưởng',
      summary: 'Quy định thời gian, lịch thi, phân công coi thi, chấm thi và nộp điểm giữa kỳ I các môn văn hóa.',
      isPublic: false,
      file: {
        id: 'att-doc-02',
        name: 'Ke_hoach_thi_giua_ky_I.pdf',
        size: 340000,
        type: 'application/pdf',
        url: '/docs/ke_hoach_thi_giua_ky.pdf',
        uploadedAt: '2026-10-02T11:00:00Z',
      },
      relatedPlanId: 'plan-02',
      downloadCount: 64,
      createdAt: '2026-10-02T11:00:00Z',
    },
    {
      id: 'doc-03',
      codeNumber: '42/HD-SGDĐT',
      title: 'Hướng dẫn thực hiện nhiệm vụ giáo dục trung học năm học 2026 - 2027 của Sở GD&ĐT Hà Nội',
      type: 'directive',
      departmentId: 'dept-bgh',
      issuedDate: '2026-08-28',
      signer: 'Giám đốc Sở GD&ĐT Hà Nội',
      summary: 'Chỉ đạo toàn diện các hoạt động dạy học, khảo thí, nghiên cứu khoa học và chuyển đổi số trường phổ thông.',
      isPublic: true,
      file: {
        id: 'att-doc-03',
        name: 'Huong_dan_nhiem_vu_nam_hoc_SGD_2026_2027.pdf',
        size: 1100000,
        type: 'application/pdf',
        url: '/docs/hd_nhiem_vu_nam_hoc.pdf',
        uploadedAt: '2026-08-30T09:00:00Z',
      },
      downloadCount: 142,
      createdAt: '2026-08-30T09:00:00Z',
    },
  ];

  const notifications: SystemNotification[] = [
    {
      id: 'notif-01',
      userId: 'usr-dean-toan',
      title: 'Nhiệm vụ mới chờ xử lý',
      message: 'Cô Vũ Thị Thu Hương đã nộp báo cáo hoàn thành nhiệm vụ "Bảo dưỡng 45 máy tính phòng máy số 1" và đính kèm biên bản minh chứng.',
      type: 'task',
      targetModule: 'tasks',
      targetId: 'tsk-02',
      isRead: false,
      createdAt: '2026-10-14T15:02:00Z',
    },
    {
      id: 'notif-02',
      userId: 'usr-principal',
      title: 'Kế hoạch chờ phê duyệt',
      message: 'Tổ Toán - Tin học đã gửi trình duyệt "Kế hoạch Tập huấn Chuyển đổi số môn Tin học".',
      type: 'plan',
      targetModule: 'plans',
      targetId: 'plan-03',
      isRead: false,
      createdAt: '2026-10-14T11:05:00Z',
    },
    {
      id: 'notif-03',
      userId: 'usr-teacher-1',
      title: 'Lịch công tác hôm nay',
      message: 'Hôm nay lúc 14:00 có cuộc họp Hội đồng Sư phạm tháng 10 tại Hội trường Tầng 2.',
      type: 'schedule',
      targetModule: 'schedule',
      targetId: 'ev-01',
      isRead: true,
      createdAt: '2026-10-15T07:00:00Z',
    },
    {
      id: 'notif-04',
      userId: 'usr-teacher-3',
      title: 'Cảnh báo nhiệm vụ quá hạn',
      message: 'Nhiệm vụ "Tổng hợp danh sách học sinh CLB Đọc sách" đã quá hạn thực hiện 2 ngày.',
      type: 'task',
      targetModule: 'tasks',
      targetId: 'tsk-03',
      isRead: false,
      createdAt: '2026-10-14T08:00:00Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log-01',
      userId: 'usr-principal',
      userName: 'TS. Nguyễn Văn Hưng',
      role: 'principal',
      action: 'Công bố thông báo',
      module: 'announcements',
      entityId: 'ann-01',
      details: 'Đã phê duyệt và công bố thông báo kết luận giao ban đầu tháng 10/2026',
      ipAddress: '192.168.1.10',
      timestamp: '2026-10-06T08:00:00Z',
    },
    {
      id: 'log-02',
      userId: 'usr-dean-toan',
      userName: 'ThS. Hoàng Minh Đức',
      role: 'dean',
      action: 'Giao nhiệm vụ',
      module: 'tasks',
      entityId: 'tsk-01',
      details: 'Giao nhiệm vụ biên soạn ma trận đề thi Toán 12 cho Thầy Đỗ Quang Khải',
      ipAddress: '192.168.1.25',
      timestamp: '2026-10-05T08:30:00Z',
    },
    {
      id: 'log-03',
      userId: 'usr-teacher-2',
      userName: 'Cô Vũ Thị Thu Hương',
      role: 'teacher',
      action: 'Nộp minh chứng hoàn thành',
      module: 'tasks',
      entityId: 'tsk-02',
      details: 'Tải lên biên bản kiểm tra phòng máy và yêu cầu xác nhận hoàn thành',
      ipAddress: '192.168.1.42',
      timestamp: '2026-10-14T15:00:00Z',
    },
  ];

  return {
    settings,
    schoolYears,
    departments,
    users,
    announcements,
    events,
    plans,
    approvalRules: [...defaultApprovalRules],
    tasks,
    reports,
    documents,
    notifications,
    auditLogs,
  };
}

// Database Manager
class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    if (!fs.existsSync(DB_FILE)) {
      const seed = generateSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed: DatabaseSchema = JSON.parse(raw);

      // Auto-migrate approvalRules if missing
      if (!parsed.approvalRules || parsed.approvalRules.length === 0) {
        parsed.approvalRules = [...defaultApprovalRules];
      }

      // Auto-normalize plans for two-tier approval workflow
      if (Array.isArray(parsed.plans)) {
        parsed.plans = parsed.plans.map((p) => {
          const reqTiers: 1 | 2 = p.requiredTiers || (p.type === 'year' || p.type === 'month' ? 1 : 2);
          return {
            ...p,
            requiredTiers: reqTiers,
            currentTier: p.currentTier || (p.status === 'pending_level_1' ? 1 : p.status === 'pending_level_2' ? 2 : undefined),
            decisionHistory: p.decisionHistory || [],
            versions: p.versions || [],
          };
        });
      }

      // Auto-migrate departments & users
      const seed = generateSeedData();
      let changed = false;
      if (!Array.isArray(parsed.departments)) parsed.departments = [];
      seed.departments.forEach((dept) => {
        if (!parsed.departments.some((d) => d.id === dept.id)) {
          parsed.departments.push(dept);
          changed = true;
        }
      });

      if (!Array.isArray(parsed.users)) parsed.users = [];
      if (parsed.settings?.isProduction) {
        // Trong môi trường chính thức: Chỉ đảm bảo tài khoản Admin tồn tại, không nạp lại giáo viên mẫu
        const hasAdmin = parsed.users.some((u) => u.role === 'admin');
        if (!hasAdmin) {
          const adminUser = seed.users.find((u) => u.role === 'admin') || seed.users[0];
          parsed.users.unshift(adminUser);
          changed = true;
        }
      } else {
        seed.users.forEach((usr) => {
          if (!parsed.users.some((u) => u.id === usr.id)) {
            parsed.users.push(usr);
            changed = true;
          }
        });
      }

      // Đảm bảo mật khẩu mặc định của admin là T@mduc88$#
      const adminUser = parsed.users.find((u) => u.username === 'admin');
      if (adminUser) {
        if (!adminUser.password || adminUser.password === 'admin' || adminUser.password === 'NDA@2026') {
          adminUser.password = 'T@mduc88$#';
          changed = true;
        }
      }

      // Đảm bảo tài khoản quản trị leducminh@socson.org luôn tồn tại với mật khẩu T@mduc88$#
      const existingMinh = parsed.users.find(
        (u) =>
          u.username.toLowerCase() === 'leducminh@socson.org' ||
          (u.email && u.email.toLowerCase() === 'leducminh@socson.org')
      );
      if (!existingMinh) {
        const newMinhAdmin: User = {
          id: 'usr-admin-leducminh',
          username: 'leducminh@socson.org',
          fullName: 'Lê Đức Minh',
          email: 'leducminh@socson.org',
          phone: '0988 888 888',
          role: 'admin',
          departmentId: 'dept-bgh',
          departmentName: 'Ban giám hiệu',
          subject: 'Không phụ trách bộ môn',
          title: 'Quản trị viên hệ thống',
          status: 'active',
          password: 'T@mduc88$#',
          createdAt: new Date().toISOString(),
        };
        parsed.users.push(newMinhAdmin);
        changed = true;
      } else {
        if (existingMinh.password !== 'T@mduc88$#') {
          existingMinh.password = 'T@mduc88$#';
          changed = true;
        }
        if (existingMinh.role !== 'admin') {
          existingMinh.role = 'admin';
          changed = true;
        }
      }

      // Đảm bảo tất cả người dùng trong hệ thống đều có mật khẩu (mặc định T@mduc88$# nếu chưa có)
      parsed.users.forEach((u) => {
        if (!u.password) {
          u.password = 'T@mduc88$#';
          changed = true;
        }
      });

      if (!Array.isArray(parsed.schoolYears) || parsed.schoolYears.length === 0) {
        parsed.schoolYears = seed.schoolYears;
        changed = true;
      }

      if (parsed.settings) {
        if (!Array.isArray(parsed.settings.grades) || parsed.settings.grades.length === 0) {
          parsed.settings.grades = seed.settings.grades;
          changed = true;
        }
        if (!Array.isArray(parsed.settings.categories) || parsed.settings.categories.length === 0) {
          parsed.settings.categories = seed.settings.categories;
          changed = true;
        }
        if (!parsed.settings.notificationConfig) {
          parsed.settings.notificationConfig = seed.settings.notificationConfig;
          changed = true;
        }
        if (!parsed.settings.approvalWorkflow) {
          parsed.settings.approvalWorkflow = seed.settings.approvalWorkflow;
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }

      return parsed;
    } catch (err) {
      console.error('Lỗi đọc database file, khởi tạo dữ liệu mẫu:', err);
      const seed = generateSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
  }

  public save(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Lỗi ghi database file:', err);
    }
  }

  public get(): DatabaseSchema {
    return this.data;
  }

  public resetToSeed(): DatabaseSchema {
    const seed = generateSeedData();
    this.data = seed;
    this.save();
    return this.data;
  }

  public addAuditLog(
    user: User | null,
    action: string,
    module: string,
    entityId?: string,
    details: string = '',
    req?: Request
  ) {
    const ip = req?.headers['x-forwarded-for']?.toString() || req?.socket?.remoteAddress || '127.0.0.1';
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: user?.id || 'guest',
      userName: user?.fullName || 'Khách truy cập',
      role: user?.role || 'guest',
      action,
      module,
      entityId,
      details,
      ipAddress: ip,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep last 500 audit logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  public sendNotification(
    targetUserId: string,
    title: string,
    message: string,
    type: SystemNotification['type'],
    targetModule: string,
    targetId?: string
  ) {
    const notif: SystemNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: targetUserId,
      title,
      message,
      type,
      targetModule,
      targetId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(notif);
    this.save();
  }
}

const db = new DatabaseManager();

// Auth Middleware
function getUserFromRequest(req: Request): User | null {
  const authHeader = req.headers['authorization'];
  let userId = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.substring(7).trim();
  } else if (req.headers['x-user-id']) {
    userId = req.headers['x-user-id'] as string;
  }

  if (!userId) {
    return null;
  }

  const user = db.get().users.find((u) => u.id === userId && u.status === 'active');
  return user || null;
}

function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getUserFromRequest(req);
    if (!user) {
      // Allow guest role if guest is in allowed roles
      if (allowedRoles.includes('guest')) {
        (req as any).currentUser = {
          id: 'guest',
          fullName: 'Khách vãng lai',
          role: 'guest',
        } as User;
        return next();
      }
      return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: `Bạn không có quyền thực hiện thao tác này. Quyền yêu cầu: ${allowedRoles.join(', ')}. Vai trò hiện tại: ${user.role}.`,
      });
    }

    (req as any).currentUser = user;
    next();
  };
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Helper auth injector
  app.use((req, res, next) => {
    (req as any).currentUser = getUserFromRequest(req);
    next();
  });

  // ==========================================
  // AUTH & USER ROUTES
  // ==========================================
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const users = db.get().users;
    const cleanIdentifier = (username || '').toLowerCase().trim();
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === cleanIdentifier ||
        (u.email && u.email.toLowerCase() === cleanIdentifier)
    );

    if (!user) {
      return res.status(400).json({ error: 'Tên đăng nhập hoặc địa chỉ email không tồn tại trong hệ thống.' });
    }

    if (user.status === 'locked') {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên hệ thống.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Tài khoản chưa được kích hoạt. Vui lòng liên hệ Quản trị viên hệ thống để kích hoạt.' });
    }

    // Xác thực mật khẩu
    // 1. Mật khẩu riêng của tài khoản nếu có
    // 2. Mật khẩu mặc định hệ thống T@mduc88$# luôn hợp lệ cho tất cả tài khoản
    // 3. Fallback mật khẩu là username
    const expectedPassword = user.password || 'T@mduc88$#';
    const cleanPassword = (password || '').trim();
    const isMatch =
      password === expectedPassword ||
      cleanPassword === expectedPassword ||
      (user.password && (password === user.password || cleanPassword === user.password)) ||
      password === 'T@mduc88$#' ||
      cleanPassword === 'T@mduc88$#' ||
      password === user.username ||
      cleanPassword === user.username;

    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại hoặc liên hệ Quản trị viên cấp lại.' });
    }

    db.addAuditLog(user, 'Đăng nhập', 'auth', user.id, `Đăng nhập vào hệ thống (${user.username})`, req);
    const { password: _p, ...safeUser } = user;
    res.json({
      token: user.id,
      user: safeUser,
    });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    if (!user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }
    const { password: _p, ...safeUser } = user;
    res.json(safeUser);
  });

  app.get('/api/users', (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const allUsers = db.get().users;
    // Guests only see limited public teacher directory
    if (!user) {
      const publicDirectory = allUsers
        .filter((u) => u.status === 'active')
        .map(({ id, fullName, title, departmentId, email }) => ({
          id,
          fullName,
          title,
          departmentId,
          email,
        }));
      return res.json(publicDirectory);
    }
    // Không bao giờ để lộ mật khẩu người dùng
    const safeUsers = allUsers.map(({ password: _p, ...u }) => u);
    res.json(safeUsers);
  });

  app.post('/api/users', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { username, fullName, email, phone, role, departmentId, title, subject, status, password } = req.body;

    const finalLogin = (email || username || '').trim().toLowerCase();
    if (!finalLogin || !fullName || !role) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: Email (tên đăng nhập), họ tên, vai trò.' });
    }

    const existing = db.get().users.find(
      (u) => u.username.toLowerCase() === finalLogin || (u.email && u.email.toLowerCase() === finalLogin)
    );
    if (existing) {
      return res.status(400).json({ error: `Tài khoản với email / tên đăng nhập "${finalLogin}" đã tồn tại trên hệ thống.` });
    }

    const dept = db.get().departments.find((d) => d.id === departmentId);
    const initialPassword = (password && password.trim()) || 'T@mduc88$#';

    const newUser: User = {
      id: `usr-${Date.now()}`,
      username: finalLogin,
      fullName: fullName.trim(),
      email: (email || finalLogin).trim(),
      phone: phone ? phone.trim() : '',
      role,
      departmentId: departmentId || undefined,
      departmentName: dept ? dept.name : undefined,
      subject: subject ? subject.trim() : undefined,
      title: title || 'Giáo viên',
      status: status || 'active',
      password: initialPassword,
      createdAt: new Date().toISOString(),
    };

    db.get().users.push(newUser);
    db.save();
    db.addAuditLog(currentUser, 'Tạo tài khoản', 'users', newUser.id, `Tạo tài khoản ${newUser.username} (${newUser.fullName})`, req);
    res.status(201).json(newUser);
  });

  app.put('/api/users/:id', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const { fullName, email, phone, role, departmentId, title, status, subject } = req.body;

    const user = db.get().users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (email !== undefined) {
      const trimmedEmail = email.trim().toLowerCase();
      user.email = trimmedEmail;
      // If user had an email-based username, update it
      if (user.username !== 'admin') {
        user.username = trimmedEmail;
      }
    }
    if (phone !== undefined) user.phone = phone.trim();
    if (role) user.role = role;
    if (departmentId !== undefined) {
      user.departmentId = departmentId;
      const dept = db.get().departments.find((d) => d.id === departmentId);
      user.departmentName = dept ? dept.name : undefined;
    }
    if (title !== undefined) user.title = title;
    if (status !== undefined) user.status = status;
    if (subject !== undefined) user.subject = subject.trim();

    db.save();
    db.addAuditLog(currentUser, 'Cập nhật tài khoản', 'users', user.id, `Cập nhật thông tin tài khoản ${user.username}`, req);
    res.json(user);
  });

  // Cấp lại mật khẩu cho người dùng (Chỉ Quản trị viên Admin)
  app.post('/api/users/:id/reset-password', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự để đảm bảo an toàn.' });
    }

    const user = db.get().users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng trong hệ thống.' });
    }

    user.password = newPassword.trim();
    user.mustChangePassword = true;
    db.save();

    db.addAuditLog(
      currentUser,
      'Cấp lại mật khẩu',
      'users',
      user.id,
      `Quản trị viên đã cấp lại mật khẩu cho tài khoản ${user.username} (${user.fullName})`,
      req
    );

    res.json({
      success: true,
      message: `Đã cấp lại mật khẩu thành công cho tài khoản ${user.username}`,
      username: user.username,
      newPassword: user.password,
    });
  });

  // Xóa tài khoản người dùng (Chỉ Quản trị viên Admin)
  app.delete('/api/users/:id', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;

    const user = db.get().users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản người dùng này.' });
    }

    // 1. Không cho phép tự xóa tài khoản đang đăng nhập
    if (currentUser.id === id || currentUser.username.toLowerCase() === user.username.toLowerCase()) {
      return res.status(400).json({ error: 'Không thể tự xóa chính tài khoản Quản trị viên bạn đang đăng nhập.' });
    }

    // 2. Không cho phép xóa tài khoản quản trị hệ thống mặc định (admin)
    if (user.username.toLowerCase() === 'admin') {
      return res.status(400).json({ error: 'Tài khoản Quản trị hệ thống mặc định (admin) không được phép xóa.' });
    }

    // 3. Nếu người dùng là tổ trưởng của tổ chuyên môn nào đó, hủy gán leaderId
    db.get().departments.forEach((dept) => {
      if (dept.leaderId === id) {
        dept.leaderId = undefined;
      }
    });

    // 4. Xóa tài khoản khỏi danh sách
    const userIndex = db.get().users.findIndex((u) => u.id === id);
    db.get().users.splice(userIndex, 1);
    db.save();

    // 5. Ghi nhật ký hệ thống
    db.addAuditLog(
      currentUser,
      'Xóa tài khoản',
      'users',
      id,
      `Quản trị viên đã xóa tài khoản: ${user.fullName} (${user.username} - ${user.email})`,
      req
    );

    res.json({
      success: true,
      message: `Đã xóa tài khoản "${user.fullName}" (${user.username}) thành công.`,
    });
  });

  // Nhập hàng loạt tài khoản từ File Excel (Tên tài khoản là email, có mật khẩu ban đầu)
  app.post('/api/users/import-excel', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { rows } = req.body as { rows: any[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Dữ liệu file Excel rỗng hoặc không đúng cấu trúc.' });
    }

    const existingUsers = db.get().users;
    const departments = db.get().departments;
    const createdUsers: User[] = [];
    const errors: { row: number; email: string; error: string }[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2;
      const rawFullName = (row['Họ và tên'] || row['fullName'] || row['Họ tên'] || row.fullName || '').toString().trim();
      const rawEmail = (row['Email'] || row['email'] || row['Địa chỉ Email'] || row.email || '').toString().trim().toLowerCase();
      const rawPassword = (row['Mật khẩu'] || row['password'] || row.password || '').toString().trim();
      const rawDept = (row['Tổ chuyên môn'] || row['Tổ / Bộ phận'] || row['departmentName'] || row.departmentName || '').toString().trim();
      const rawSubject = (row['Môn học'] || row['subject'] || row.subject || '').toString().trim();
      const rawRole = (row['Vai trò'] || row['role'] || row.roleName || '').toString().trim();
      const rawStatus = (row['Trạng thái'] || row['status'] || row.statusName || '').toString().trim();

      if (!rawEmail) {
        errors.push({ row: rowNum, email: '', error: 'Dòng này thiếu địa chỉ email (tên tài khoản).' });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawEmail)) {
        errors.push({ row: rowNum, email: rawEmail, error: 'Địa chỉ email không đúng định dạng hợp lệ.' });
        return;
      }

      if (!rawFullName) {
        errors.push({ row: rowNum, email: rawEmail, error: 'Thiếu họ và tên nhân sự.' });
        return;
      }

      // Check duplicate against existing users and previously created users in this batch
      const isDuplicate =
        existingUsers.some((u) => u.username.toLowerCase() === rawEmail || (u.email && u.email.toLowerCase() === rawEmail)) ||
        createdUsers.some((u) => u.username.toLowerCase() === rawEmail || (u.email && u.email.toLowerCase() === rawEmail));

      if (isDuplicate) {
        errors.push({ row: rowNum, email: rawEmail, error: 'Địa chỉ email này đã tồn tại trong hệ thống.' });
        return;
      }

      // Match 8 Official Departments
      let matchedDeptId = 'dept-khtn';
      let matchedDeptName = 'Tổ khoa học tự nhiên';
      if (rawDept) {
        const dLower = rawDept.toLowerCase();
        if (dLower.includes('tự nhiên') || dLower.includes('khtn')) {
          matchedDeptId = 'dept-khtn';
          matchedDeptName = 'Tổ khoa học tự nhiên';
        } else if (dLower.includes('xã hội') || dLower.includes('khxh')) {
          matchedDeptId = 'dept-khxh';
          matchedDeptName = 'Tổ khoa học xã hội';
        } else if (dLower.includes('tiếng anh') || dLower.includes('gdtc') || dLower.includes('ngoại ngữ')) {
          matchedDeptId = 'dept-nn-gdtc';
          matchedDeptName = 'Tổ Tiếng Anh - GDTC';
        } else if (dLower.includes('1-2-3') || dLower.includes('1, 2, 3') || dLower.includes('1 2 3')) {
          matchedDeptId = 'dept-th-123';
          matchedDeptName = 'Tổ 1-2-3';
        } else if (dLower.includes('4-5') || dLower.includes('4, 5') || dLower.includes('4 5')) {
          matchedDeptId = 'dept-th-45';
          matchedDeptName = 'Tổ 4-5';
        } else if (dLower.includes('văn phòng')) {
          matchedDeptId = 'dept-vp';
          matchedDeptName = 'Tổ Văn phòng';
        } else if (dLower.includes('đoàn') || dLower.includes('đội') || dLower.includes('liên đội')) {
          matchedDeptId = 'dept-doan-doi';
          matchedDeptName = 'Liên Đội TNTP Hồ Chí Minh';
        } else if (dLower.includes('giám hiệu') || dLower.includes('bgh')) {
          matchedDeptId = 'dept-bgh';
          matchedDeptName = 'Ban Giám Hiệu';
        } else {
          const found = departments.find(
            (d) =>
              d.name.toLowerCase().includes(dLower) ||
              dLower.includes(d.name.toLowerCase()) ||
              d.code.toLowerCase() === dLower
          );
          if (found) {
            matchedDeptId = found.id;
            matchedDeptName = found.name;
          }
        }
      }

      // Match 5 Official Roles
      let assignedRole: Role = 'teacher';
      let titleLabel = 'Giáo viên';
      const rLower = rawRole.toLowerCase();

      if (rLower.includes('hiệu trưởng') && !rLower.includes('phó')) {
        assignedRole = 'principal';
        titleLabel = 'Hiệu trưởng';
      } else if (rLower.includes('phó hiệu trưởng')) {
        assignedRole = 'principal';
        titleLabel = 'Phó hiệu trưởng';
      } else if (rLower.includes('tổ trưởng')) {
        assignedRole = 'dean';
        titleLabel = `Tổ trưởng ${matchedDeptName}`;
      } else if (rLower.includes('tổ phó')) {
        assignedRole = 'teacher';
        titleLabel = `Tổ phó ${matchedDeptName}`;
      } else if (rLower.includes('quản trị') || rLower.includes('admin')) {
        assignedRole = 'admin';
        titleLabel = 'Quản trị viên';
      } else {
        assignedRole = 'teacher';
        titleLabel = rawSubject ? `Giáo viên ${rawSubject}` : `Giáo viên ${matchedDeptName}`;
      }

      // Match 3 Official Statuses: Hoạt động | Chưa kích hoạt | Bị khóa
      let assignedStatus: UserStatus = 'active';
      const sLower = rawStatus.toLowerCase();
      if (sLower.includes('chưa kích hoạt') || sLower.includes('inactive')) {
        assignedStatus = 'inactive';
      } else if (sLower.includes('khóa') || sLower.includes('locked')) {
        assignedStatus = 'locked';
      } else {
        assignedStatus = 'active';
      }

      const initialPassword = rawPassword.length >= 6 ? rawPassword : 'NDA@' + Math.floor(1000 + Math.random() * 9000);

      const newUser: User = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        username: rawEmail, // Tên tài khoản là địa chỉ email
        fullName: rawFullName,
        email: rawEmail,
        phone: (row['Số điện thoại'] || row['phone'] || row.phone || '').toString().trim() || '09' + Math.floor(10000000 + Math.random() * 90000000),
        role: assignedRole,
        departmentId: matchedDeptId,
        departmentName: matchedDeptName,
        subject: rawSubject || undefined,
        title: titleLabel,
        status: assignedStatus,
        password: initialPassword,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
      };

      existingUsers.push(newUser);
      createdUsers.push(newUser);
    });

    if (createdUsers.length > 0) {
      db.save();
      db.addAuditLog(
        currentUser,
        'Nhập tài khoản từ Excel',
        'users',
        undefined,
        `Quản trị viên đã nhập thành công ${createdUsers.length} tài khoản mới từ file Excel (Lỗi: ${errors.length})`,
        req
      );
    }

    const safeCreatedUsers = createdUsers.map(({ password: _p, ...u }) => u);

    res.json({
      total: rows.length,
      successCount: createdUsers.length,
      failedCount: errors.length,
      createdUsers: safeCreatedUsers,
      errors,
    });
  });

  // ==========================================
  // DEPARTMENTS
  // ==========================================
  app.get('/api/departments', (req: Request, res: Response) => {
    res.json(db.get().departments);
  });

  app.post('/api/departments', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { name, code, type, description, leaderId } = req.body;
    if (!name || !name.trim() || !code || !code.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên và mã viết tắt của tổ chuyên môn.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    // Kiểm tra trùng mã hoặc tên tổ
    const codeDup = db.get().departments.find((d) => d.code.toLowerCase() === cleanCode.toLowerCase());
    if (codeDup) {
      return res.status(400).json({ error: `Mã tổ "${cleanCode}" đã tồn tại (${codeDup.name}).` });
    }

    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: cleanName,
      code: cleanCode,
      type: type || 'subject',
      description: (description || '').trim(),
      leaderId: leaderId || undefined,
      memberCount: 0,
    };
    db.get().departments.push(newDept);
    db.save();
    db.addAuditLog(currentUser, 'Thêm tổ chuyên môn', 'departments', newDept.id, `Tạo tổ ${newDept.name} (${newDept.code})`, req);
    res.status(201).json(newDept);
  });

  app.put('/api/departments/:id', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const dept = db.get().departments.find((d) => d.id === id);
    if (!dept) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chuyên môn này.' });
    }

    const { name, code, type, description, leaderId } = req.body;

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Tên tổ chuyên môn không được để trống.' });
      }
      dept.name = name.trim();
    }

    if (code !== undefined) {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) {
        return res.status(400).json({ error: 'Mã tổ chuyên môn không được để trống.' });
      }
      const dup = db.get().departments.find((d) => d.id !== id && d.code.toLowerCase() === cleanCode.toLowerCase());
      if (dup) {
        return res.status(400).json({ error: `Mã tổ "${cleanCode}" đã được sử dụng bởi tổ ${dup.name}.` });
      }
      dept.code = cleanCode;
    }

    if (type !== undefined) dept.type = type;
    if (description !== undefined) dept.description = description.trim();
    if (leaderId !== undefined) dept.leaderId = leaderId || undefined;

    // Tự động đồng bộ tên tổ trên danh sách người dùng thuộc tổ này
    if (name !== undefined) {
      db.get().users.forEach((u) => {
        if (u.departmentId === id) {
          u.departmentName = dept.name;
        }
      });
    }

    db.save();
    db.addAuditLog(currentUser, 'Cập nhật tổ chuyên môn', 'departments', dept.id, `Cập nhật thông tin tổ: ${dept.name} (${dept.code})`, req);
    res.json(dept);
  });

  app.delete('/api/departments/:id', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const dept = db.get().departments.find((d) => d.id === id);
    if (!dept) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chuyên môn này.' });
    }

    // 1. Kiểm tra ràng buộc nhân sự thuộc tổ
    const memberCount = db.get().users.filter((u) => u.departmentId === id).length;
    if (memberCount > 0) {
      return res.status(400).json({
        error: `Không thể xóa tổ "${dept.name}" vì đang có ${memberCount} nhân sự thuộc tổ này. Vui lòng chuyển nhân sự sang tổ khác trước khi xóa.`,
      });
    }

    // 2. Kiểm tra ràng buộc kế hoạch giáo dục do tổ chủ trì hoặc phối hợp
    const hasPlans = db.get().plans.some(
      (p) => p.leadDepartmentId === id || (p.coDepartmentIds && p.coDepartmentIds.includes(id))
    );
    if (hasPlans) {
      return res.status(400).json({
        error: `Không thể xóa tổ "${dept.name}" vì đang có kế hoạch giáo dục gắn liền với tổ này.`,
      });
    }

    // 3. Thực hiện xóa an toàn
    const idx = db.get().departments.findIndex((d) => d.id === id);
    db.get().departments.splice(idx, 1);
    db.save();

    db.addAuditLog(currentUser, 'Xóa tổ chuyên môn', 'departments', id, `Xóa tổ chuyên môn: ${dept.name} (${dept.code})`, req);
    res.json({ success: true, message: `Đã xóa tổ ${dept.name} thành công.` });
  });

  // ==========================================
  // SCHOOL YEARS & SEMESTERS CONFIGURATION (NĂM HỌC & HỌC KỲ)
  // Không hardcode năm học, cho phép linh hoạt cấu hình thời gian bắt đầu/kết thúc
  // ==========================================
  app.get('/api/school-years', (req: Request, res: Response) => {
    res.json(db.get().schoolYears || []);
  });

  app.post('/api/school-years', requireRole(['admin', 'principal']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { name, startDate, endDate, semesters, isCurrent } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'Vui lòng điền tên năm học, ngày bắt đầu và kết thúc.' });
    }

    const newYearId = `sy-${Date.now()}`;
    const newSchoolYear: SchoolYear = {
      id: newYearId,
      name: name.trim(),
      startDate,
      endDate,
      isCurrent: Boolean(isCurrent),
      semesters: semesters && semesters.length > 0 ? semesters : [
        { id: `sem-${Date.now()}-1`, name: 'Học kỳ I', startDate, endDate: '2027-01-15' },
        { id: `sem-${Date.now()}-2`, name: 'Học kỳ II', startDate: '2027-01-16', endDate },
      ],
    };

    if (newSchoolYear.isCurrent) {
      db.get().schoolYears.forEach((sy) => { sy.isCurrent = false; });
      db.get().settings.currentSchoolYearId = newSchoolYear.id;
    }

    db.get().schoolYears.unshift(newSchoolYear);
    db.save();

    db.addAuditLog(currentUser, 'Thêm năm học', 'settings', newSchoolYear.id, `Thiết lập năm học mới: ${newSchoolYear.name}`, req);
    res.status(201).json(newSchoolYear);
  });

  app.put('/api/school-years/:id', requireRole(['admin', 'principal']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const item = db.get().schoolYears.find((sy) => sy.id === id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy năm học' });

    const { name, startDate, endDate, semesters, isCurrent } = req.body;
    if (name) item.name = name.trim();
    if (startDate) item.startDate = startDate;
    if (endDate) item.endDate = endDate;
    if (semesters) item.semesters = semesters;

    if (isCurrent !== undefined && Boolean(isCurrent) !== item.isCurrent) {
      item.isCurrent = Boolean(isCurrent);
      if (item.isCurrent) {
        db.get().schoolYears.forEach((sy) => {
          if (sy.id !== item.id) sy.isCurrent = false;
        });
        db.get().settings.currentSchoolYearId = item.id;
      }
    }

    db.save();
    db.addAuditLog(currentUser, 'Cập nhật năm học', 'settings', item.id, `Cập nhật cấu hình năm học: ${item.name}`, req);
    res.json(item);
  });

  app.delete('/api/school-years/:id', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const item = db.get().schoolYears.find((sy) => sy.id === id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy năm học' });

    if (item.isCurrent) {
      return res.status(400).json({ error: 'Không thể xóa năm học đang được đặt làm năm học hiện tại.' });
    }

    const hasPlans = db.get().plans.some((p) => p.schoolYearId === id);
    if (hasPlans) {
      return res.status(400).json({ error: 'Năm học này đang có các kế hoạch giáo dục gắn liền, không được phép xóa.' });
    }

    const idx = db.get().schoolYears.findIndex((sy) => sy.id === id);
    db.get().schoolYears.splice(idx, 1);
    db.save();

    db.addAuditLog(currentUser, 'Xóa năm học', 'settings', id, `Xóa năm học: ${item.name}`, req);
    res.json({ success: true });
  });

  // ==========================================
  // SYSTEM SETTINGS & AUDIT LOGS
  // ==========================================
  app.get('/api/system/settings', (req: Request, res: Response) => {
    res.json(db.get().settings);
  });

  app.put('/api/system/settings', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const updated = req.body as Partial<SchoolSettings>;
    const currentWebsiteConfig = db.get().settings?.websiteConfig || {};
    const newWebsiteConfig = updated.websiteConfig
      ? { ...currentWebsiteConfig, ...updated.websiteConfig }
      : currentWebsiteConfig;
    db.get().settings = {
      ...db.get().settings,
      ...updated,
      websiteConfig: newWebsiteConfig,
    };
    db.save();
    db.addAuditLog(currentUser, 'Cấu hình hệ thống', 'settings', undefined, 'Cập nhật thông tin trường học & cấu hình', req);
    res.json(db.get().settings);
  });

  // Website Trường (Cổng thông tin trường học & nội dung công khai)
  app.get('/api/website-settings', (req: Request, res: Response) => {
    const settings = db.get().settings;
    res.json({
      schoolName: settings.schoolName,
      shortName: settings.shortName,
      schoolCode: settings.schoolCode,
      managementAgency: settings.managementAgency,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      principalName: settings.principalName,
      logoUrl: settings.logoUrl,
      motto: settings.motto,
      websiteConfig: settings.websiteConfig || {},
    });
  });

  app.put('/api/website-settings', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const {
      schoolName,
      shortName,
      schoolCode,
      managementAgency,
      address,
      phone,
      email,
      website,
      principalName,
      logoUrl,
      motto,
      websiteConfig,
    } = req.body;

    const settings = db.get().settings;
    if (schoolName !== undefined) settings.schoolName = schoolName;
    if (shortName !== undefined) settings.shortName = shortName;
    if (schoolCode !== undefined) settings.schoolCode = schoolCode;
    if (managementAgency !== undefined) settings.managementAgency = managementAgency;
    if (address !== undefined) settings.address = address;
    if (phone !== undefined) settings.phone = phone;
    if (email !== undefined) settings.email = email;
    if (website !== undefined) settings.website = website;
    if (principalName !== undefined) settings.principalName = principalName;
    if (logoUrl !== undefined) settings.logoUrl = logoUrl;
    if (motto !== undefined) settings.motto = motto;
    if (websiteConfig !== undefined) {
      settings.websiteConfig = {
        ...(settings.websiteConfig || {}),
        ...websiteConfig,
      };
    }

    db.save();
    db.addAuditLog(currentUser, 'Cập nhật Website Trường', 'settings', 'website-config', 'Cập nhật các thông tin hiển thị trên Website Trường', req);
    res.json(settings);
  });

  app.get('/api/system/audit-logs', requireRole(['admin', 'principal']), (req: Request, res: Response) => {
    res.json(db.get().auditLogs);
  });

  app.post('/api/system/reset-demo', requireRole(['admin']), (req: Request, res: Response) => {
    if (db.get().settings?.isProduction) {
      return res.status(403).json({
        error: 'Chức năng khôi phục dữ liệu mẫu đã bị khóa vĩnh viễn trong môi trường vận hành chính thức để bảo vệ an toàn dữ liệu.',
      });
    }
    const currentUser = (req as any).currentUser as User;
    const seed = db.resetToSeed();
    db.addAuditLog(currentUser, 'Khôi phục dữ liệu gốc', 'system', undefined, 'Khôi phục lại toàn bộ dữ liệu mẫu', req);
    res.json({ message: 'Đã khôi phục dữ liệu mẫu thành công', seed });
  });

  app.get('/api/system/backup', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    db.addAuditLog(currentUser, 'Sao lưu dữ liệu', 'system', undefined, 'Tải tệp sao lưu dữ liệu toàn trường', req);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=school_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(db.get());
  });

  app.post('/api/system/restore', requireRole(['admin']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const backupData = req.body as DatabaseSchema;
    if (!backupData.settings || !backupData.users || !backupData.departments) {
      return res.status(400).json({ error: 'Tệp sao lưu không đúng định dạng chuẩn của hệ thống.' });
    }
    const current = db.get();
    Object.assign(current, backupData);
    db.save();
    db.addAuditLog(currentUser, 'Phục hồi dữ liệu từ bản sao lưu', 'system', undefined, 'Đã phục hồi dữ liệu hệ thống từ tệp tải lên', req);
    res.json({ message: 'Phục hồi dữ liệu thành công' });
  });

  // ==========================================
  // DASHBOARD STATS (ROLE-BASED & REAL SOURCE DATA)
  // ==========================================
  app.get('/api/dashboard/stats', (req: Request, res: Response) => {
    const user = (req as any).currentUser as User | null;
    const data = db.get();
    const today = new Date().toISOString().split('T')[0];

    // Compute week bounds
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    // 7 days ahead for upcoming due tasks
    const in7Days = new Date(now);
    in7Days.setDate(now.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    // Filter events
    const todayEvents = data.events.filter(
      (e) => e.status !== 'cancelled' && e.startDate <= today && e.endDate >= today
    );
    const weekEvents = data.events.filter(
      (e) => e.status !== 'cancelled' && e.startDate <= sundayStr && e.endDate >= mondayStr
    );

    // Unread announcements & Published announcements
    const publishedAnnouncements = data.announcements.filter((a) => a.status === 'published');
    const unreadAnnouncements = publishedAnnouncements.filter((a) => {
      if (!user) return a.isPublic;
      return !a.readUserIds?.includes(user.id);
    });

    // Plans counts
    const pendingPlansLevel1 = data.plans.filter((p) => p.status === 'pending_level_1');
    const pendingPlansLevel2 = data.plans.filter((p) => p.status === 'pending_level_2');
    const inProgressPlans = data.plans.filter((p) => p.status === 'in_progress');

    // Role-dependent pending plans count
    const pendingPlans = data.plans.filter((p) => {
      if (!user) return false;
      if (user.role === 'dean') {
        return (
          p.status === 'pending_level_1' &&
          p.leadDepartmentId === user.departmentId &&
          p.responsiblePersonId !== user.id
        );
      }
      if (user.role === 'principal' || user.role === 'admin') {
        return (
          p.status === 'pending_level_2' ||
          (p.requiredTiers === 1 && p.status === 'pending_level_1')
        );
      }
      if (user.role === 'teacher') {
        return (
          (p.status === 'revision_level_1' || p.status === 'revision_level_2') &&
          p.responsiblePersonId === user.id
        );
      }
      return p.status === 'pending_level_1' || p.status === 'pending_level_2';
    });

    // Tasks counts
    let ongoingTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    let upcomingDueTasks = 0;
    let totalTasksRelevant = 0;

    data.tasks.forEach((t) => {
      const isOverdue = t.status === 'overdue' || (t.deadline < today && t.status !== 'completed' && t.status !== 'cancelled');
      const isUpcoming = !isOverdue && t.deadline >= today && t.deadline <= in7DaysStr && t.status !== 'completed' && t.status !== 'cancelled';

      const isRelevant =
        !user ||
        user.role === 'admin' ||
        user.role === 'principal' ||
        t.mainAssigneeId === user.id ||
        t.assignerId === user.id ||
        t.coAssigneeIds?.includes(user.id) ||
        (user.role === 'dean' && t.departmentId === user.departmentId);

      if (!isRelevant) return;

      totalTasksRelevant++;
      if (t.status === 'completed') {
        completedTasks++;
      } else if (isOverdue) {
        overdueTasks++;
      } else {
        ongoingTasks++;
      }

      if (isUpcoming) {
        upcomingDueTasks++;
      }
    });

    const taskCompletionRate = totalTasksRelevant > 0 ? Math.round((completedTasks / totalTasksRelevant) * 100) : 0;
    const pendingReports = data.reports.filter((r) => r.status === 'submitted');
    const reportsNeedAddition = data.reports.filter((r) => r.status === 'needs_addition');

    // Dean specific calculations
    const userDeptId = user?.departmentId || '';
    const deanDeptPlansCount = data.plans.filter((p) => p.leadDepartmentId === userDeptId).length;
    const deanDeptTasksCount = data.tasks.filter((t) => t.departmentId === userDeptId).length;
    const deanDeptOverdueTasksCount = data.tasks.filter(
      (t) => t.departmentId === userDeptId && (t.status === 'overdue' || (t.deadline < today && t.status !== 'completed' && t.status !== 'cancelled'))
    ).length;
    const deanDeptReportsCount = data.reports.filter((r) => r.departmentId === userDeptId && r.status === 'submitted').length;
    const deanPendingApprovalPlansCount = data.plans.filter((p) => p.leadDepartmentId === userDeptId && p.status === 'pending_level_2').length;

    // Teacher specific calculations
    const myAssignedTasks = user ? data.tasks.filter((t) => t.mainAssigneeId === user.id) : [];
    const myCoordinatedTasks = user ? data.tasks.filter((t) => t.coAssigneeIds?.includes(user.id)) : [];
    const myAllTasks = user ? data.tasks.filter((t) => t.mainAssigneeId === user.id || t.coAssigneeIds?.includes(user.id)) : [];
    const myCompletedTasks = myAllTasks.filter((t) => t.status === 'completed');
    const myUpcomingDueTasks = myAllTasks.filter(
      (t) => t.deadline >= today && t.deadline <= in7DaysStr && t.status !== 'completed' && t.status !== 'cancelled'
    );
    const myNeedsAdditionReports = user ? data.reports.filter((r) => r.authorId === user.id && r.status === 'needs_addition') : [];
    const myCompletionRate = myAllTasks.length > 0 ? Math.round((myCompletedTasks.length / myAllTasks.length) * 100) : 0;

    const stats: DashboardStats = {
      unreadAnnouncementsCount: unreadAnnouncements.length,
      publishedAnnouncementsCount: publishedAnnouncements.length,
      todayEventsCount: todayEvents.length,
      weekEventsCount: weekEvents.length,
      pendingPlansCount: pendingPlans.length,
      pendingPlansLevel1Count: pendingPlansLevel1.length,
      pendingPlansLevel2Count: pendingPlansLevel2.length,
      inProgressPlansCount: inProgressPlans.length,
      ongoingTasksCount: ongoingTasks,
      completedTasksCount: completedTasks,
      overdueTasksCount: overdueTasks,
      upcomingDueTasksCount: upcomingDueTasks,
      taskCompletionRate,
      pendingReportsCount: pendingReports.length,
      reportsNeedAdditionCount: reportsNeedAddition.length,
      totalTeachersCount: data.users.filter((u) => u.status === 'active' && u.role !== 'guest').length,
      totalDepartmentsCount: data.departments.length,
      // Dean
      deanDeptPlansCount,
      deanDeptTasksCount,
      deanDeptOverdueTasksCount,
      deanDeptReportsCount,
      deanPendingApprovalPlansCount,
      // Teacher
      myAssignedTasksCount: myAssignedTasks.length,
      myCoordinatedTasksCount: myCoordinatedTasks.length,
      myUpcomingDueTasksCount: myUpcomingDueTasks.length,
      myCompletedTasksCount: myCompletedTasks.length,
      myNeedsAdditionReportsCount: myNeedsAdditionReports.length,
      myCompletionRate,
    };

    res.json(stats);
  });

  // ==========================================
  // PUBLIC PORTAL ENDPOINTS (STRICT SECURITY & SANITIZATION)
  // Quy tắc C: Chỉ hiển thị dữ liệu đã công bố hợp lệ và công khai.
  // Không bao giờ trả về thông tin cá nhân, người nhận nội bộ hoặc ghi chú riêng tư.
  // ==========================================
  app.get('/api/public/announcements', (req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0];
    const announcements = db.get().announcements;

    // Filter strictly public, published, not expired, not revoked
    const publicList = announcements.filter((a) => {
      if (!a.isPublic) return false;
      if (a.status !== 'published') return false;
      if (a.expiresAt && a.expiresAt < today) return false;
      return true;
    });

    // Pinned first, then by publishedAt desc
    publicList.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
    });

    // Sanitize fields: exclude targetDepartmentIds, targetUserIds, readUserIds, readRecords, etc.
    const sanitized = publicList.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      content: a.content,
      category: a.category,
      priority: a.priority,
      isPublic: true,
      status: 'published',
      isPinned: a.isPinned,
      authorName: a.authorName,
      authorRole: a.authorRole,
      publishedAt: a.publishedAt,
      expiresAt: a.expiresAt,
      attachments: a.attachments || [],
      readCount: a.readCount || 0,
      createdAt: a.createdAt,
    }));

    res.json(sanitized);
  });

  app.get('/api/public/announcements/:id', (req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0];
    const item = db.get().announcements.find((a) => a.id === req.params.id);

    if (!item || !item.isPublic || item.status !== 'published' || (item.expiresAt && item.expiresAt < today)) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo công khai này hoặc thông báo đã hết hạn/thu hồi.' });
    }

    res.json({
      id: item.id,
      title: item.title,
      summary: item.summary,
      content: item.content,
      category: item.category,
      priority: item.priority,
      isPublic: true,
      status: 'published',
      isPinned: item.isPinned,
      authorName: item.authorName,
      authorRole: item.authorRole,
      publishedAt: item.publishedAt,
      expiresAt: item.expiresAt,
      attachments: item.attachments || [],
      readCount: item.readCount || 0,
      createdAt: item.createdAt,
    });
  });

  app.get('/api/public/events', (req: Request, res: Response) => {
    const { start, end } = req.query;
    const events = db.get().events;

    let list = events.filter((e) => e.status !== 'cancelled');
    if (start) list = list.filter((e) => e.endDate >= (start as string));
    if (end) list = list.filter((e) => e.startDate <= (end as string));

    list.sort((a, b) => {
      const cmpDate = a.startDate.localeCompare(b.startDate);
      if (cmpDate !== 0) return cmpDate;
      return a.startTime.localeCompare(b.startTime);
    });

    // Sanitize: remove private notes, creator ID, etc.
    const sanitized = list.map((e) => ({
      id: e.id,
      title: e.title,
      content: e.content,
      purpose: e.purpose,
      startDate: e.startDate,
      endDate: e.endDate,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location,
      hostName: e.hostName,
      attendeesDescription: e.attendeesDescription,
      departmentId: e.departmentId,
      status: e.status,
      isAllDay: e.isAllDay,
      attachments: e.attachments || [],
    }));

    res.json(sanitized);
  });

  // ==========================================
  // ANNOUNCEMENTS (INTERNAL & COMPREHENSIVE WORKFLOW)
  // ==========================================
  app.get('/api/announcements', (req: Request, res: Response) => {
    const user = (req as any).currentUser as User | null;
    const { category, status, isPublic } = req.query;
    let all = db.get().announcements;

    // Filter by visibility & RBAC
    let filtered = all.filter((a) => {
      if (!user) {
        return a.isPublic && a.status === 'published';
      }
      if (user.role === 'admin' || user.role === 'principal') {
        return true;
      }
      if (a.status !== 'published') {
        return a.authorId === user.id;
      }
      // Published: check audience
      if (a.isPublic || a.targetAudience === 'all') return true;
      if (a.targetAudience === 'principals') return false;
      if (a.targetAudience === 'deans') return user.role === 'dean';
      if (a.targetAudience === 'teachers') return true;
      if (a.targetAudience === 'departments') {
        return user.departmentId && a.targetDepartmentIds?.includes(user.departmentId);
      }
      if (a.targetAudience === 'users') {
        return a.targetUserIds?.includes(user.id);
      }
      return true;
    });

    if (category && category !== 'all') {
      filtered = filtered.filter((a) => a.category === category);
    }
    if (status && status !== 'all') {
      filtered = filtered.filter((a) => a.status === status);
    }
    if (isPublic !== undefined) {
      filtered = filtered.filter((a) => String(a.isPublic) === String(isPublic));
    }

    // Pinned first, then by publishedAt/createdAt desc
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json(filtered);
  });

  app.get('/api/announcements/:id', (req: Request, res: Response) => {
    const item = db.get().announcements.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    res.json(item);
  });

  app.post('/api/announcements', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const body = req.body;

    const isAuthorizedToPublish = currentUser.role === 'admin' || currentUser.role === 'principal';
    let status: AnnouncementStatus = 'draft';
    if (body.status === 'draft') {
      status = 'draft';
    } else if (body.status === 'published' && isAuthorizedToPublish) {
      status = 'published';
    } else if (body.status === 'pending' || body.status === 'published') {
      status = isAuthorizedToPublish ? 'published' : 'pending';
    }

    const newAnnouncement: Announcement = {
      id: `ann-${Date.now()}`,
      title: body.title,
      content: body.content || '',
      summary: body.summary || (body.content || '').substring(0, 150),
      category: body.category || 'general',
      priority: body.priority || 'normal',
      isPublic: Boolean(body.isPublic),
      targetAudience: body.targetAudience || 'all',
      targetDepartmentIds: body.targetDepartmentIds || [],
      targetUserIds: body.targetUserIds || [],
      status,
      isPinned: Boolean(body.isPinned),
      authorId: currentUser.id,
      authorName: currentUser.fullName,
      authorRole: currentUser.role,
      publishedAt: status === 'published' ? new Date().toISOString() : undefined,
      expiresAt: body.expiresAt,
      attachments: body.attachments || [],
      readCount: 0,
      readUserIds: [currentUser.id],
      readRecords: [
        {
          id: `read-${Date.now()}-${currentUser.id}`,
          announcementId: `ann-${Date.now()}`,
          userId: currentUser.id,
          userName: currentUser.fullName,
          userRole: currentUser.role,
          departmentName: db.get().departments.find((d) => d.id === currentUser.departmentId)?.name || '',
          readAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.get().announcements.unshift(newAnnouncement);
    db.save();

    db.addAuditLog(currentUser, 'Tạo thông báo', 'announcements', newAnnouncement.id, `Tạo thông báo: ${newAnnouncement.title} (Trạng thái: ${status})`, req);

    if (status === 'published') {
      // Broadcast system notification
      db.get().users.forEach((u) => {
        if (u.id !== currentUser.id) {
          db.sendNotification(u.id, 'Thông báo mới ban hành', newAnnouncement.title, 'announcement', 'announcements', newAnnouncement.id);
        }
      });
    } else if (status === 'pending') {
      // Notify BGH for approval
      const principals = db.get().users.filter((u) => u.role === 'principal');
      principals.forEach((p) => {
        db.sendNotification(p.id, 'Thông báo chờ duyệt', `${currentUser.fullName} đã trình duyệt thông báo: "${newAnnouncement.title}"`, 'announcement', 'announcements', newAnnouncement.id);
      });
    }

    res.status(201).json(newAnnouncement);
  });

  app.put('/api/announcements/:id', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const item = db.get().announcements.find((a) => a.id === id);

    if (!item) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    }

    const canEdit = currentUser.role === 'admin' || currentUser.role === 'principal' || item.authorId === currentUser.id;
    if (!canEdit) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa thông báo của người khác.' });
    }

    const body = req.body;
    if (body.title) item.title = body.title;
    if (body.content !== undefined) item.content = body.content;
    if (body.summary !== undefined) item.summary = body.summary;
    if (body.category) item.category = body.category;
    if (body.priority) item.priority = body.priority;
    if (body.isPublic !== undefined) item.isPublic = body.isPublic;
    if (body.targetAudience) item.targetAudience = body.targetAudience;
    if (body.targetDepartmentIds) item.targetDepartmentIds = body.targetDepartmentIds;
    if (body.targetUserIds) item.targetUserIds = body.targetUserIds;
    if (body.isPinned !== undefined) item.isPinned = body.isPinned;
    if (body.expiresAt !== undefined) item.expiresAt = body.expiresAt;
    if (body.attachments) item.attachments = body.attachments;

    // Status change check
    if (body.status && body.status !== item.status) {
      if (body.status === 'published' && !(currentUser.role === 'admin' || currentUser.role === 'principal')) {
        return res.status(403).json({ error: 'Chỉ Ban Giám hiệu hoặc Quản trị viên mới có quyền công bố thông báo.' });
      }
      item.status = body.status;
      if (body.status === 'published' && !item.publishedAt) {
        item.publishedAt = new Date().toISOString();
      }
    }

    item.updatedAt = new Date().toISOString();
    db.save();

    db.addAuditLog(currentUser, 'Cập nhật thông báo', 'announcements', item.id, `Cập nhật thông báo: ${item.title}`, req);
    res.json(item);
  });

  // SUBMIT ANNOUNCEMENT FOR APPROVAL
  app.post('/api/announcements/:id/submit', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const item = db.get().announcements.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy thông báo' });

    if (item.authorId !== currentUser.id && currentUser.role !== 'admin' && currentUser.role !== 'principal') {
      return res.status(403).json({ error: 'Bạn không có quyền trình duyệt thông báo này.' });
    }

    item.status = 'pending';
    item.updatedAt = new Date().toISOString();
    db.save();

    db.addAuditLog(currentUser, 'Trình duyệt thông báo', 'announcements', item.id, `Trình duyệt thông báo: ${item.title}`, req);

    const principals = db.get().users.filter((u) => u.role === 'principal');
    principals.forEach((p) => {
      db.sendNotification(p.id, 'Thông báo chờ duyệt', `${currentUser.fullName} đã trình duyệt thông báo: "${item.title}"`, 'announcement', 'announcements', item.id);
    });

    res.json(item);
  });

  // PUBLISH ANNOUNCEMENT (BAN HÀNH / CÔNG BỐ)
  app.post('/api/announcements/:id/publish', requireRole(['admin', 'principal']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const item = db.get().announcements.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy thông báo' });

    item.status = 'published';
    item.publishedAt = new Date().toISOString();
    item.revokedAt = undefined;
    item.revokedReason = undefined;
    item.updatedAt = new Date().toISOString();
    db.save();

    db.addAuditLog(currentUser, 'Công bố thông báo', 'announcements', item.id, `Ban Giám hiệu công bố thông báo: ${item.title}`, req);

    // Broadcast system notification
    db.get().users.forEach((u) => {
      if (u.id !== currentUser.id) {
        db.sendNotification(u.id, 'Thông báo mới ban hành', item.title, 'announcement', 'announcements', item.id);
      }
    });

    res.json(item);
  });

  // REVOKE ANNOUNCEMENT (THU HỒI)
  app.post('/api/announcements/:id/revoke', requireRole(['admin', 'principal']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { reason } = req.body;
    const item = db.get().announcements.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy thông báo' });

    item.status = 'revoked';
    item.revokedAt = new Date().toISOString();
    item.revokedReason = reason || 'Ban Giám hiệu thu hồi văn bản thông báo';
    item.updatedAt = new Date().toISOString();
    db.save();

    db.addAuditLog(currentUser, 'Thu hồi thông báo', 'announcements', item.id, `Thu hồi thông báo: ${item.title}. Lý do: ${item.revokedReason}`, req);

    res.json(item);
  });

  // EXPIRE ANNOUNCEMENT (HẾT HẠN)
  app.post('/api/announcements/:id/expire', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const item = db.get().announcements.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy thông báo' });

    item.status = 'expired';
    item.updatedAt = new Date().toISOString();
    db.save();

    db.addAuditLog(currentUser, 'Đánh dấu hết hạn thông báo', 'announcements', item.id, `Thông báo ${item.title} chuyển sang hết hạn`, req);
    res.json(item);
  });

  // PIN / UNPIN ANNOUNCEMENT (GHIM THÔNG BÁO)
  app.post('/api/announcements/:id/pin', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const item = db.get().announcements.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy thông báo' });

    item.isPinned = !item.isPinned;
    item.updatedAt = new Date().toISOString();
    db.save();

    db.addAuditLog(currentUser, item.isPinned ? 'Ghim thông báo' : 'Bỏ ghim thông báo', 'announcements', item.id, `${item.isPinned ? 'Ghim' : 'Bỏ ghim'} thông báo: ${item.title}`, req);
    res.json(item);
  });

  // READ TRACKING: MARK READ WITH USER METADATA
  app.post('/api/announcements/:id/read', (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User | null;
    const { id } = req.params;
    const item = db.get().announcements.find((a) => a.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    }

    if (currentUser) {
      if (!item.readUserIds) item.readUserIds = [];
      if (!item.readRecords) item.readRecords = [];

      if (!item.readUserIds.includes(currentUser.id)) {
        item.readUserIds.push(currentUser.id);
        item.readCount = item.readUserIds.length;

        const dept = db.get().departments.find((d) => d.id === currentUser.departmentId);
        item.readRecords.push({
          id: `read-${Date.now()}-${currentUser.id}`,
          announcementId: item.id,
          userId: currentUser.id,
          userName: currentUser.fullName,
          userRole: currentUser.role,
          departmentName: dept?.name || '',
          readAt: new Date().toISOString(),
        });

        db.save();
      }
    }
    res.json({ success: true, readCount: item.readCount });
  });

  // GET DETAILED READERS & UNREAD TRACKING
  app.get('/api/announcements/:id/readers', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const item = db.get().announcements.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy thông báo' });

    const allUsers = db.get().users.filter((u) => u.status === 'active');
    const departments = db.get().departments;

    // Calculate expected recipients based on targetAudience
    let expectedRecipients = allUsers;
    if (item.targetAudience === 'principals') {
      expectedRecipients = allUsers.filter((u) => u.role === 'principal');
    } else if (item.targetAudience === 'deans') {
      expectedRecipients = allUsers.filter((u) => u.role === 'dean');
    } else if (item.targetAudience === 'teachers') {
      expectedRecipients = allUsers.filter((u) => u.role === 'teacher');
    } else if (item.targetAudience === 'departments' && item.targetDepartmentIds?.length > 0) {
      expectedRecipients = allUsers.filter((u) => u.departmentId && item.targetDepartmentIds.includes(u.departmentId));
    } else if (item.targetAudience === 'users' && item.targetUserIds?.length > 0) {
      expectedRecipients = allUsers.filter((u) => item.targetUserIds.includes(u.id));
    }

    const readUserIds = new Set(item.readUserIds || []);
    const readRecords = item.readRecords || [];

    const unreadUsers = expectedRecipients
      .filter((u) => !readUserIds.has(u.id))
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        departmentName: departments.find((d) => d.id === u.departmentId)?.name || '',
      }));

    const totalExpected = expectedRecipients.length;
    const readCount = totalExpected - unreadUsers.length;
    const readPercentage = totalExpected > 0 ? Math.round((readCount / totalExpected) * 100) : 0;

    res.json({
      readRecords,
      unreadUsers,
      totalExpected,
      readCount,
      readPercentage,
    });
  });

  // SEND IN-APP REMINDER TO UNREAD RECIPIENTS
  app.post('/api/announcements/:id/send-reminder', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const item = db.get().announcements.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy thông báo' });

    const allUsers = db.get().users.filter((u) => u.status === 'active');
    let expectedRecipients = allUsers;
    if (item.targetAudience === 'principals') {
      expectedRecipients = allUsers.filter((u) => u.role === 'principal');
    } else if (item.targetAudience === 'deans') {
      expectedRecipients = allUsers.filter((u) => u.role === 'dean');
    } else if (item.targetAudience === 'teachers') {
      expectedRecipients = allUsers.filter((u) => u.role === 'teacher');
    } else if (item.targetAudience === 'departments' && item.targetDepartmentIds?.length > 0) {
      expectedRecipients = allUsers.filter((u) => u.departmentId && item.targetDepartmentIds.includes(u.departmentId));
    } else if (item.targetAudience === 'users' && item.targetUserIds?.length > 0) {
      expectedRecipients = allUsers.filter((u) => item.targetUserIds.includes(u.id));
    }

    const readUserIds = new Set(item.readUserIds || []);
    const unreadUsers = expectedRecipients.filter((u) => !readUserIds.has(u.id) && u.id !== currentUser.id);

    unreadUsers.forEach((u) => {
      db.sendNotification(
        u.id,
        'Nhắc nhở đọc thông báo',
        `${currentUser.fullName} nhắc nhở bạn đọc thông báo: "${item.title}"`,
        'announcement',
        'announcements',
        item.id
      );
    });

    db.addAuditLog(currentUser, 'Gửi nhắc nhở đọc thông báo', 'announcements', item.id, `Gửi nhắc nhở cho ${unreadUsers.length} người chưa đọc thông báo: ${item.title}`, req);

    res.json({
      success: true,
      remindedCount: unreadUsers.length,
      message: `Đã gửi thông báo nhắc nhở nội bộ tới ${unreadUsers.length} cán bộ/giáo viên chưa đọc. (Lưu ý: Kênh email chưa cấu hình, thông báo được gửi trực tiếp qua chuông thông báo ứng dụng).`,
    });
  });

  app.delete('/api/announcements/:id', requireRole(['admin', 'principal']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const idx = db.get().announcements.findIndex((a) => a.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    }
    const removed = db.get().announcements.splice(idx, 1)[0];
    db.save();
    db.addAuditLog(currentUser, 'Thu hồi/Xóa thông báo', 'announcements', id, `Đã xóa thông báo: ${removed.title}`, req);
    res.json({ success: true });
  });

  // ==========================================
  // EVENTS / WORK SCHEDULE (LỊCH CÔNG TÁC NGÀY/TUẦN/THÁNG)
  // ==========================================
  app.get('/api/events', (req: Request, res: Response) => {
    const { start, end, departmentId } = req.query;
    let list = db.get().events;

    if (departmentId && departmentId !== 'all') {
      list = list.filter((e) => !e.departmentId || e.departmentId === departmentId);
    }
    if (start) {
      list = list.filter((e) => e.endDate >= (start as string));
    }
    if (end) {
      list = list.filter((e) => e.startDate <= (end as string));
    }

    list.sort((a, b) => {
      const cmpDate = a.startDate.localeCompare(b.startDate);
      if (cmpDate !== 0) return cmpDate;
      return a.startTime.localeCompare(b.startTime);
    });

    res.json(list);
  });

  app.post('/api/events/check-clash', (req: Request, res: Response) => {
    const { startDate, endDate, startTime, endTime, location, hostName, excludeId } = req.body;
    const events = db.get().events.filter((e) => e.status !== 'cancelled' && e.id !== excludeId);

    const clashes: string[] = [];

    events.forEach((ev) => {
      // Check date overlap
      const dateOverlap = !(endDate < ev.startDate || startDate > ev.endDate);
      if (!dateOverlap) return;

      // Check time overlap
      const timeOverlap = !(endTime <= ev.startTime || startTime >= ev.endTime);
      if (!timeOverlap) return;

      // Check location clash
      if (location && ev.location && location.trim().toLowerCase() === ev.location.trim().toLowerCase()) {
        clashes.push(`Trùng địa điểm "${location}" với sự kiện: "${ev.title}" (${ev.startTime} - ${ev.endTime}, ${ev.startDate})`);
      }

      // Check host clash
      if (hostName && ev.hostName && hostName.trim().toLowerCase() === ev.hostName.trim().toLowerCase()) {
        clashes.push(`Trùng người chủ trì "${hostName}" với sự kiện: "${ev.title}" (${ev.startTime} - ${ev.endTime})`);
      }
    });

    res.json({ hasClash: clashes.length > 0, clashes });
  });

  app.post('/api/events', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const body = req.body;

    const relatedPlan = body.relatedPlanId ? db.get().plans.find((p) => p.id === body.relatedPlanId) : undefined;

    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      title: body.title,
      content: body.content || '',
      purpose: body.purpose || '',
      startDate: body.startDate,
      endDate: body.endDate || body.startDate,
      startTime: body.startTime || '08:00',
      endTime: body.endTime || '09:30',
      location: body.location || 'Hội trường nhà trường',
      hostName: body.hostName || currentUser.fullName,
      hostId: body.hostId || currentUser.id,
      attendeesDescription: body.attendeesDescription || 'Toàn thể cán bộ, giáo viên',
      departmentId: body.departmentId || currentUser.departmentId,
      creatorId: currentUser.id,
      creatorName: currentUser.fullName,
      approverId: currentUser.role === 'principal' ? currentUser.id : undefined,
      status: body.status || 'scheduled',
      isAllDay: Boolean(body.isAllDay),
      notes: body.notes || '',
      relatedPlanId: body.relatedPlanId,
      relatedPlanTitle: relatedPlan ? `${relatedPlan.code} - ${relatedPlan.title}` : body.relatedPlanTitle,
      relatedTaskId: body.relatedTaskId,
      attachments: body.attachments || [],
      createdAt: new Date().toISOString(),
    };

    db.get().events.push(newEvent);
    db.save();

    db.addAuditLog(currentUser, 'Thêm lịch công tác', 'schedule', newEvent.id, `Tạo lịch: ${newEvent.title} (${newEvent.startDate})`, req);

    // Notify users about new schedule
    db.get().users.forEach((u) => {
      if (u.id !== currentUser.id) {
        db.sendNotification(
          u.id,
          'Lịch công tác mới',
          `Sự kiện "${newEvent.title}" (${newEvent.startTime} ${newEvent.startDate} tại ${newEvent.location}). Chủ trì: ${newEvent.hostName}.`,
          'schedule',
          'schedule',
          newEvent.id
        );
      }
    });

    res.status(201).json(newEvent);
  });

  app.put('/api/events/:id', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const event = db.get().events.find((e) => e.id === id);

    if (!event) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện lịch' });
    }

    const canEdit =
      currentUser.role === 'admin' ||
      currentUser.role === 'principal' ||
      event.creatorId === currentUser.id ||
      (currentUser.role === 'dean' && event.departmentId === currentUser.departmentId);

    if (!canEdit) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa sự kiện này.' });
    }

    const oldTitle = event.title;
    const oldDate = event.startDate;
    const oldTime = event.startTime;

    Object.assign(event, req.body);

    if (req.body.relatedPlanId) {
      const plan = db.get().plans.find((p) => p.id === req.body.relatedPlanId);
      if (plan) event.relatedPlanTitle = `${plan.code} - ${plan.title}`;
    }

    db.save();

    db.addAuditLog(currentUser, 'Cập nhật lịch công tác', 'schedule', event.id, `Cập nhật sự kiện: ${event.title}`, req);

    // If time or location changed, notify users about schedule update
    if (oldTitle !== event.title || oldDate !== event.startDate || oldTime !== event.startTime) {
      db.get().users.forEach((u) => {
        if (u.id !== currentUser.id) {
          db.sendNotification(
            u.id,
            'Thay đổi lịch công tác',
            `Lịch công tác "${event.title}" đã được cập nhật: ${event.startTime} ngày ${event.startDate} tại ${event.location}.`,
            'schedule',
            'schedule',
            event.id
          );
        }
      });
    }

    res.json(event);
  });

  // CANCEL EVENT (HỦY SỰ KIỆN KÈM LÝ DO)
  app.post('/api/events/:id/cancel', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const { cancelReason } = req.body;
    const event = db.get().events.find((e) => e.id === id);

    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    const canCancel =
      currentUser.role === 'admin' ||
      currentUser.role === 'principal' ||
      event.creatorId === currentUser.id ||
      (currentUser.role === 'dean' && event.departmentId === currentUser.departmentId);

    if (!canCancel) {
      return res.status(403).json({ error: 'Bạn không có thẩm quyền hủy sự kiện lịch này.' });
    }

    event.status = 'cancelled';
    event.cancelReason = cancelReason || 'Ban Giám hiệu điều chỉnh hoãn / hủy lịch công tác';
    event.cancelledAt = new Date().toISOString();
    event.cancelledById = currentUser.id;
    event.cancelledByName = currentUser.fullName;
    db.save();

    db.addAuditLog(currentUser, 'Hủy lịch công tác', 'schedule', event.id, `Hủy sự kiện: ${event.title}. Lý do: ${event.cancelReason}`, req);

    // Notify about event cancellation
    db.get().users.forEach((u) => {
      if (u.id !== currentUser.id) {
        db.sendNotification(
          u.id,
          'Hủy lịch công tác',
          `Sự kiện "${event.title}" ngày ${event.startDate} đã bị HỦY. Lý do: ${event.cancelReason}`,
          'schedule',
          'schedule',
          event.id
        );
      }
    });

    res.json(event);
  });

  app.delete('/api/events/:id', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const idx = db.get().events.findIndex((e) => e.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    }
    const removed = db.get().events.splice(idx, 1)[0];
    db.save();

    db.addAuditLog(currentUser, 'Xóa lịch công tác', 'schedule', id, `Đã xóa lịch: ${removed.title}`, req);
    res.json({ success: true });
  });

  // ==============================================================================
  // APPROVAL WORKFLOW RULES & HELPER FUNCTIONS
  // ==============================================================================
  function getRuleForPlan(plan: Partial<Plan>, rules: ApprovalWorkflowRule[]): ApprovalWorkflowRule {
    const exact = rules.find((r) => r.planType === plan.type);
    if (exact) return exact;
    const def = rules.find((r) => r.isDefault || r.planType === 'all');
    return def || defaultApprovalRules[0];
  }

  app.get('/api/approval-rules', (req: Request, res: Response) => {
    res.json(db.get().approvalRules || defaultApprovalRules);
  });

  app.put('/api/approval-rules', requireRole(['admin', 'principal']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { rules } = req.body;
    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ error: 'Danh sách quy trình phê duyệt không hợp lệ.' });
    }
    db.get().approvalRules = rules;
    db.save();
    db.addAuditLog(currentUser, 'Cập nhật quy chế phê duyệt', 'plans', undefined, 'Cập nhật cấu hình quy trình duyệt 2 cấp kế hoạch', req);
    res.json(db.get().approvalRules);
  });

  // ==============================================================================
  // PLANS (KẾ HOẠCH NĂM/THÁNG/TUẦN & QUY TRÌNH PHÊ DUYỆT 2 CẤP)
  // ==============================================================================
  app.get('/api/plans', (req: Request, res: Response) => {
    const { type, schoolYearId, status, departmentId, schoolLevel, responsiblePersonId, q } = req.query;
    let list = db.get().plans;

    if (type && type !== 'all') list = list.filter((p) => p.type === type);
    if (schoolYearId && schoolYearId !== 'all') list = list.filter((p) => p.schoolYearId === schoolYearId);
    if (status && status !== 'all') list = list.filter((p) => p.status === status);
    if (departmentId && departmentId !== 'all') list = list.filter((p) => p.leadDepartmentId === departmentId || p.coDepartmentIds?.includes(departmentId as string));
    if (schoolLevel && schoolLevel !== 'all') list = list.filter((p) => !p.schoolLevel || p.schoolLevel === schoolLevel || p.schoolLevel === 'all');
    if (responsiblePersonId) list = list.filter((p) => p.responsiblePersonId === responsiblePersonId);

    if (q) {
      const keyword = (q as string).toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(keyword) ||
          p.code.toLowerCase().includes(keyword) ||
          p.responsiblePersonName.toLowerCase().includes(keyword) ||
          p.content.toLowerCase().includes(keyword)
      );
    }

    // Sort by createdAt desc
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.get('/api/plans/:id', (req: Request, res: Response) => {
    const plan = db.get().plans.find((p) => p.id === req.params.id);
    if (!plan) return res.status(404).json({ error: 'Không tìm thấy kế hoạch' });

    // Truy xuất hai chiều: Tìm kế hoạch cha
    let parentPlan: any = undefined;
    if (plan.parentPlanId) {
      const parent = db.get().plans.find((p) => p.id === plan.parentPlanId);
      if (parent) {
        parentPlan = {
          id: parent.id,
          code: parent.code,
          title: parent.title,
          type: parent.type,
          status: parent.status,
          responsiblePersonName: parent.responsiblePersonName,
        };
      }
    }

    // Truy xuất hai chiều: Tìm tất cả kế hoạch con trực thuộc
    const subPlans = db.get().plans
      .filter((p) => p.parentPlanId === plan.id)
      .map((p) => ({
        id: p.id,
        code: p.code,
        title: p.title,
        type: p.type,
        status: p.status,
        responsiblePersonName: p.responsiblePersonName,
        startDate: p.startDate,
        endDate: p.endDate,
      }));

    // Truy xuất hai chiều: Tìm tất cả nhiệm vụ gắn trực tiếp với kế hoạch này
    const linkedTasks = db.get().tasks.filter((t) => t.planId === plan.id);

    res.json({
      ...plan,
      parentPlan,
      subPlans,
      linkedTasks,
    });
  });

  // CREATE PLAN
  app.post('/api/plans', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const body = req.body;

    if (!body.title || !body.startDate || !body.endDate) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tiêu đề và khoảng thời gian thực hiện kế hoạch.' });
    }

    const rules = db.get().approvalRules || defaultApprovalRules;
    const matchingRule = getRuleForPlan(body, rules);
    const requiredTiers: 1 | 2 = body.requiredTiers ? (Number(body.requiredTiers) as 1 | 2) : matchingRule.requiredTiers;

    // Default status is 'draft' unless an admin/principal explicitly creates an already approved school plan and rule allows it
    let initialStatus: PlanStatus = 'draft';
    if (body.status === 'draft') {
      initialStatus = 'draft';
    } else if (body.status === 'approved' && (currentUser.role === 'principal' || currentUser.role === 'admin')) {
      initialStatus = 'approved';
    } else if (body.status === 'pending_level_1' || body.status === 'pending_level_2' || body.status === 'pending') {
      initialStatus = requiredTiers === 1 ? 'pending_level_2' : 'pending_level_1';
    }

    const planId = `plan-${Date.now()}`;
    const initialDecisions: PlanDecision[] = [];

    if (initialStatus !== 'draft') {
      initialDecisions.push({
        id: `dec-${Date.now()}-01`,
        planId,
        tierLevel: initialStatus === 'pending_level_2' ? 2 : 1,
        action: initialStatus === 'approved' ? 'approve_level_2' : 'submit',
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        actorDepartmentId: currentUser.departmentId,
        comment: initialStatus === 'approved' ? 'Ban Giám hiệu ban hành kế hoạch' : 'Khởi tạo và trình duyệt kế hoạch',
        timestamp: new Date().toISOString(),
        fromStatus: 'draft',
        toStatus: initialStatus,
        versionSnapshot: 1,
      });
    }

    const newPlan: Plan = {
      id: planId,
      code: body.code || `KH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: body.title,
      type: body.type || 'month',
      schoolLevel: body.schoolLevel || 'all',
      parentPlanId: body.parentPlanId,
      schoolYearId: body.schoolYearId || db.get().settings.currentSchoolYearId,
      basisAndGoals: body.basisAndGoals || '',
      content: body.content || '',
      startDate: body.startDate,
      endDate: body.endDate,
      leadDepartmentId: body.leadDepartmentId || currentUser.departmentId || 'dept-bgh',
      coDepartmentIds: body.coDepartmentIds || [],
      responsiblePersonId: body.responsiblePersonId || currentUser.id,
      responsiblePersonName: body.responsiblePersonName || currentUser.fullName,
      expectedTargets: body.expectedTargets || '',
      deliverables: body.deliverables || '',
      expectedBudget: body.expectedBudget ? Number(body.expectedBudget) : undefined,
      actualBudget: body.actualBudget ? Number(body.actualBudget) : undefined,
      budgetSource: body.budgetSource || 'Ngân sách nhà nước',
      actualOutcome: body.actualOutcome || '',
      completionRate: body.completionRate ? Number(body.completionRate) : undefined,
      evaluationComment: body.evaluationComment || '',
      requiredProofDescription: body.requiredProofDescription || '',
      attachments: body.attachments || [],
      status: initialStatus,
      requiredTiers,
      currentTier: initialStatus === 'pending_level_1' ? 1 : initialStatus === 'pending_level_2' ? 2 : undefined,
      approvedById: initialStatus === 'approved' ? currentUser.id : undefined,
      approvedByName: initialStatus === 'approved' ? currentUser.fullName : undefined,
      approvedAt: initialStatus === 'approved' ? new Date().toISOString() : undefined,
      approvalComment: initialStatus === 'approved' ? 'Ban Giám hiệu phê duyệt ban hành' : undefined,
      decisionHistory: initialDecisions,
      versions: [
        {
          version: 1,
          modifiedAt: new Date().toISOString(),
          modifiedById: currentUser.id,
          modifiedByName: currentUser.fullName,
          reason: 'Khởi tạo kế hoạch ban đầu',
          snapshotTitle: body.title,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.get().plans.unshift(newPlan);
    db.save();

    db.addAuditLog(currentUser, 'Lập kế hoạch', 'plans', newPlan.id, `Tạo kế hoạch: ${newPlan.code} - ${newPlan.title} (${requiredTiers} cấp duyệt)`, req);

    // Send notification if submitted right away
    if (newPlan.status === 'pending_level_1') {
      const deans = db.get().users.filter((u) => u.role === 'dean' && u.departmentId === newPlan.leadDepartmentId);
      deans.forEach((d) => {
        db.sendNotification(d.id, 'Kế hoạch chờ duyệt Cấp 1', `${currentUser.fullName} đã gửi duyệt kế hoạch: "${newPlan.title}"`, 'plan', 'plans', newPlan.id);
      });
    } else if (newPlan.status === 'pending_level_2') {
      const principals = db.get().users.filter((u) => u.role === 'principal');
      principals.forEach((p) => {
        db.sendNotification(p.id, 'Kế hoạch chờ duyệt Cấp 2 (BGH)', `${currentUser.fullName} đã trình duyệt kế hoạch cấp trường: "${newPlan.title}"`, 'plan', 'plans', newPlan.id);
      });
    }

    res.status(201).json(newPlan);
  });

  // SUBMIT PLAN FOR APPROVAL (Bản nháp / Cần chỉnh sửa -> Chờ duyệt Cấp 1 hoặc Cấp 2)
  app.post('/api/plans/:id/submit', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const { note } = req.body;
    const plan = db.get().plans.find((p) => p.id === id);

    if (!plan) return res.status(404).json({ error: 'Không tìm thấy kế hoạch' });

    // Only owner or admin can submit
    const isOwner = plan.responsiblePersonId === currentUser.id;
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'principal';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Bạn không phải là người phụ trách kế hoạch này để gửi duyệt.' });
    }

    // Must be in draft, revision_level_1, or revision_level_2
    const allowedStatuses: PlanStatus[] = ['draft', 'revision_level_1', 'revision_level_2', 'needs_revision'];
    if (!allowedStatuses.includes(plan.status)) {
      return res.status(400).json({ error: `Kế hoạch đang ở trạng thái "${plan.status}", không thể gửi duyệt lại.` });
    }

    const fromStatus = plan.status;
    const rules = db.get().approvalRules || defaultApprovalRules;
    const matchingRule = getRuleForPlan(plan, rules);
    const requiredTiers = plan.requiredTiers || matchingRule.requiredTiers;

    // Determine target status
    let toStatus: PlanStatus;
    let tierLevel: 1 | 2;

    if (requiredTiers === 1 || fromStatus === 'revision_level_2') {
      toStatus = 'pending_level_2';
      tierLevel = 2;
    } else {
      toStatus = 'pending_level_1';
      tierLevel = 1;
    }

    plan.status = toStatus;
    plan.currentTier = tierLevel;
    plan.revisionComment = undefined;
    plan.updatedAt = new Date().toISOString();

    const decision: PlanDecision = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      planId: plan.id,
      tierLevel,
      action: fromStatus === 'draft' ? 'submit' : 'resubmit',
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      actorDepartmentId: currentUser.departmentId,
      comment: note || (fromStatus === 'draft' ? 'Trình duyệt kế hoạch' : 'Nộp lại sau khi tiếp thu chỉnh sửa'),
      timestamp: new Date().toISOString(),
      fromStatus,
      toStatus,
      versionSnapshot: plan.versions?.length || 1,
    };

    if (!plan.decisionHistory) plan.decisionHistory = [];
    plan.decisionHistory.push(decision);
    db.save();

    db.addAuditLog(currentUser, 'Trình duyệt kế hoạch', 'plans', plan.id, `${decision.action === 'resubmit' ? 'Nộp lại' : 'Trình duyệt'} kế hoạch: ${plan.title} (chuyển sang ${toStatus})`, req);

    // Send notifications
    if (toStatus === 'pending_level_1') {
      const deans = db.get().users.filter((u) => u.role === 'dean' && u.departmentId === plan.leadDepartmentId);
      deans.forEach((d) => {
        db.sendNotification(d.id, 'Kế hoạch chờ duyệt Cấp 1', `${currentUser.fullName} đã gửi duyệt kế hoạch: "${plan.title}"`, 'plan', 'plans', plan.id);
      });
    } else {
      const principals = db.get().users.filter((u) => u.role === 'principal');
      principals.forEach((p) => {
        db.sendNotification(p.id, 'Kế hoạch chờ duyệt Cấp 2 (BGH)', `${currentUser.fullName} đã trình duyệt kế hoạch: "${plan.title}"`, 'plan', 'plans', plan.id);
      });
    }

    res.json(plan);
  });

  // APPROVE TIER (DUYỆT CẤP 1 HOẶC CẤP 2)
  app.post('/api/plans/:id/approve-tier', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const { tier, comment } = req.body; // tier: 1 | 2
    const targetTier: 1 | 2 = tier ? (Number(tier) as 1 | 2) : 1;

    const plan = db.get().plans.find((p) => p.id === id);
    if (!plan) return res.status(404).json({ error: 'Không tìm thấy kế hoạch' });

    const rules = db.get().approvalRules || defaultApprovalRules;
    const matchingRule = getRuleForPlan(plan, rules);

    // =========================================================================
    // MANDATORY RULE 1: Người lập KHÔNG được tự phê duyệt kế hoạch của mình
    // =========================================================================
    if (plan.responsiblePersonId === currentUser.id && !matchingRule.allowSelfApproval) {
      return res.status(403).json({
        error: 'Người lập không được tự phê duyệt kế hoạch của mình theo quy định của nhà trường.',
      });
    }

    const fromStatus = plan.status;

    // =========================================================================
    // TIER 1 APPROVAL LOGIC
    // =========================================================================
    if (targetTier === 1) {
      if (plan.status !== 'pending_level_1' && plan.status !== 'pending') {
        return res.status(400).json({
          error: `Kế hoạch không ở trạng thái chờ duyệt cấp 1 (trạng thái hiện tại: ${plan.status}).`,
        });
      }

      // Check authority: Dean of the plan's department or Admin / Principal
      const isLeadDean = currentUser.role === 'dean' && currentUser.departmentId === plan.leadDepartmentId;
      const isSuper = currentUser.role === 'admin' || currentUser.role === 'principal';
      if (!isLeadDean && !isSuper) {
        return res.status(403).json({
          error: 'Bạn không có thẩm quyền phê duyệt Cấp 1 cho tổ/bộ phận này.',
        });
      }

      // If requiredTiers is 1, Tier 1 directly approves the plan
      const requiredTiers = plan.requiredTiers || matchingRule.requiredTiers;
      const toStatus: PlanStatus = requiredTiers === 1 ? 'approved' : 'pending_level_2';

      plan.level1ApprovedById = currentUser.id;
      plan.level1ApprovedByName = currentUser.fullName;
      plan.level1ApprovedAt = new Date().toISOString();
      plan.level1Comment = comment || 'Tổ chuyên môn đồng ý thông qua kế hoạch';

      if (requiredTiers === 1) {
        plan.approvedById = currentUser.id;
        plan.approvedByName = currentUser.fullName;
        plan.approvedAt = new Date().toISOString();
        plan.approvalComment = comment || 'Đã phê duyệt ban hành kế hoạch';
      }

      plan.status = toStatus;
      plan.currentTier = requiredTiers === 1 ? undefined : 2;
      plan.revisionComment = undefined;
      plan.updatedAt = new Date().toISOString();

      const decision: PlanDecision = {
        id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        planId: plan.id,
        tierLevel: 1,
        action: 'approve_level_1',
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        actorDepartmentId: currentUser.departmentId,
        comment: comment || 'Đã thông qua cấp 1',
        timestamp: new Date().toISOString(),
        fromStatus,
        toStatus,
        versionSnapshot: plan.versions?.length || 1,
      };

      if (!plan.decisionHistory) plan.decisionHistory = [];
      plan.decisionHistory.push(decision);
      db.save();

      db.addAuditLog(currentUser, 'Phê duyệt Cấp 1', 'plans', plan.id, `Duyệt Cấp 1 kế hoạch: ${plan.title}. Trạng thái tiếp theo: ${toStatus}`, req);

      // Notifications
      if (toStatus === 'pending_level_2') {
        const principals = db.get().users.filter((u) => u.role === 'principal');
        principals.forEach((p) => {
          db.sendNotification(p.id, 'Kế hoạch chờ duyệt Cấp 2', `${currentUser.fullName} (Tổ trưởng) đã duyệt Cấp 1 kế hoạch: "${plan.title}". Kính trình BGH duyệt Cấp 2.`, 'plan', 'plans', plan.id);
        });
      } else {
        db.sendNotification(plan.responsiblePersonId, 'Kế hoạch đã được phê duyệt', `Kế hoạch "${plan.title}" đã được phê duyệt ban hành.`, 'plan', 'plans', plan.id);
      }

      return res.json(plan);
    }

    // =========================================================================
    // TIER 2 APPROVAL LOGIC (BAN GIÁM HIỆU)
    // =========================================================================
    if (targetTier === 2) {
      // MANDATORY RULE 2: Cấp 2 chỉ được duyệt khi cấp 1 đã thông qua
      const requiredTiers = plan.requiredTiers || matchingRule.requiredTiers;
      if (requiredTiers === 2 && plan.status === 'pending_level_1') {
        return res.status(400).json({
          error: 'Cấp 2 chỉ được duyệt khi cấp 1 đã thông qua theo đúng quy trình.',
        });
      }

      if (plan.status !== 'pending_level_2') {
        return res.status(400).json({
          error: `Kế hoạch không ở trạng thái chờ duyệt cấp 2 (trạng thái hiện tại: ${plan.status}).`,
        });
      }

      // Only Principal or Admin can approve Tier 2
      if (currentUser.role !== 'principal' && currentUser.role !== 'admin') {
        return res.status(403).json({
          error: 'Chỉ Ban Giám hiệu hoặc Quản trị viên mới có thẩm quyền phê duyệt Cấp 2.',
        });
      }

      plan.status = 'approved';
      plan.currentTier = undefined;
      plan.approvedById = currentUser.id;
      plan.approvedByName = currentUser.fullName;
      plan.approvedAt = new Date().toISOString();
      plan.approvalComment = comment || 'Ban Giám hiệu đồng ý phê duyệt ban hành kế hoạch';
      plan.revisionComment = undefined;
      plan.updatedAt = new Date().toISOString();

      const decision: PlanDecision = {
        id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        planId: plan.id,
        tierLevel: 2,
        action: 'approve_level_2',
        actorId: currentUser.id,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        actorDepartmentId: currentUser.departmentId,
        comment: comment || 'Ban Giám hiệu ký duyệt ban hành',
        timestamp: new Date().toISOString(),
        fromStatus,
        toStatus: 'approved',
        versionSnapshot: plan.versions?.length || 1,
      };

      if (!plan.decisionHistory) plan.decisionHistory = [];
      plan.decisionHistory.push(decision);
      db.save();

      db.addAuditLog(currentUser, 'Phê duyệt Cấp 2 (BGH)', 'plans', plan.id, `Hiệu trưởng/BGH phê duyệt kế hoạch: ${plan.title}`, req);

      // Notify author
      db.sendNotification(plan.responsiblePersonId, 'Kế hoạch đã được BGH phê duyệt', `Hiệu trưởng đã phê duyệt ban hành kế hoạch: "${plan.title}"`, 'plan', 'plans', plan.id);

      return res.json(plan);
    }

    res.status(400).json({ error: 'Cấp phê duyệt không hợp lệ (chỉ chấp nhận Cấp 1 hoặc Cấp 2).' });
  });

  // REJECT / REQUEST REVISION (TRẢ LẠI KÈM NHẬN XÉT)
  app.post('/api/plans/:id/reject-tier', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const { tier, comment } = req.body;
    const targetTier: 1 | 2 = tier ? (Number(tier) as 1 | 2) : 1;

    const plan = db.get().plans.find((p) => p.id === id);
    if (!plan) return res.status(404).json({ error: 'Không tìm thấy kế hoạch' });

    // MANDATORY RULE: Nhận xét là bắt buộc khi trả lại
    if (!comment || comment.trim().length < 5) {
      return res.status(400).json({
        error: 'Vui lòng nhập lý do và yêu cầu điều chỉnh cụ thể khi trả lại kế hoạch (tối thiểu 5 ký tự).',
      });
    }

    const fromStatus = plan.status;
    let toStatus: PlanStatus;

    if (targetTier === 1) {
      if (plan.status !== 'pending_level_1' && plan.status !== 'pending') {
        return res.status(400).json({ error: `Kế hoạch không ở trạng thái chờ duyệt cấp 1 (hiện tại: ${plan.status}).` });
      }
      const isLeadDean = currentUser.role === 'dean' && currentUser.departmentId === plan.leadDepartmentId;
      const isSuper = currentUser.role === 'admin' || currentUser.role === 'principal';
      if (!isLeadDean && !isSuper) {
        return res.status(403).json({ error: 'Bạn không có thẩm quyền trả lại Cấp 1 cho kế hoạch này.' });
      }
      toStatus = 'revision_level_1';
    } else {
      if (plan.status !== 'pending_level_2') {
        return res.status(400).json({ error: `Kế hoạch không ở trạng thái chờ duyệt cấp 2 (hiện tại: ${plan.status}).` });
      }
      if (currentUser.role !== 'principal' && currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ Ban Giám hiệu mới có quyền trả lại Cấp 2.' });
      }
      toStatus = 'revision_level_2';
    }

    plan.status = toStatus;
    plan.revisionComment = comment.trim();
    plan.updatedAt = new Date().toISOString();

    const decision: PlanDecision = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      planId: plan.id,
      tierLevel: targetTier,
      action: targetTier === 1 ? 'reject_level_1' : 'reject_level_2',
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      actorDepartmentId: currentUser.departmentId,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
      fromStatus,
      toStatus,
      versionSnapshot: plan.versions?.length || 1,
    };

    if (!plan.decisionHistory) plan.decisionHistory = [];
    plan.decisionHistory.push(decision);
    db.save();

    db.addAuditLog(currentUser, `Trả lại Cấp ${targetTier}`, 'plans', plan.id, `Trả lại kế hoạch ${plan.title} kèm nhận xét: "${comment.trim()}"`, req);

    // Notify author
    db.sendNotification(
      plan.responsiblePersonId,
      `Kế hoạch cần chỉnh sửa (Cấp ${targetTier})`,
      `${currentUser.fullName} đã trả lại kế hoạch "${plan.title}" với yêu cầu: ${comment.trim()}`,
      'plan',
      'plans',
      plan.id
    );

    res.json(plan);
  });

  // TRANSITION OPERATIONAL STATUS (ĐANG THỰC HIỆN, HOÀN THÀNH, TẠM DỪNG, ĐÃ KẾT THÚC, ĐÃ HỦY)
  app.post('/api/plans/:id/transition-status', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const { newStatus, reason } = req.body as { newStatus: PlanStatus; reason?: string };

    const plan = db.get().plans.find((p) => p.id === id);
    if (!plan) return res.status(404).json({ error: 'Không tìm thấy kế hoạch' });

    const isOwner = plan.responsiblePersonId === currentUser.id;
    const isPrincipalOrAdmin = currentUser.role === 'principal' || currentUser.role === 'admin';
    const isDean = currentUser.role === 'dean' && currentUser.departmentId === plan.leadDepartmentId;

    if (!isOwner && !isPrincipalOrAdmin && !isDean) {
      return res.status(403).json({ error: 'Bạn không có quyền chuyển đổi trạng thái của kế hoạch này.' });
    }

    const fromStatus = plan.status;

    // Validate transition
    if (newStatus === 'in_progress') {
      if (plan.status !== 'approved' && plan.status !== 'paused') {
        return res.status(400).json({ error: 'Chỉ kế hoạch đã phê duyệt hoặc đang tạm dừng mới có thể chuyển sang "Đang thực hiện".' });
      }
    } else if (newStatus === 'completed') {
      if (plan.status !== 'in_progress') {
        return res.status(400).json({ error: 'Chỉ kế hoạch đang thực hiện mới có thể báo cáo "Hoàn thành".' });
      }
    } else if (newStatus === 'paused') {
      if (plan.status !== 'in_progress') {
        return res.status(400).json({ error: 'Chỉ kế hoạch đang thực hiện mới có thể "Tạm dừng".' });
      }
    } else if (newStatus === 'closed') {
      if (!isPrincipalOrAdmin) {
        return res.status(403).json({ error: 'Chỉ Ban Giám hiệu mới có quyền Đóng/Kết thúc kế hoạch.' });
      }
      if (plan.status !== 'completed') {
        return res.status(400).json({ error: 'Chỉ kế hoạch đã hoàn thành mới có thể chuyển sang "Đã kết thúc".' });
      }
    } else if (newStatus === 'cancelled') {
      if (!isOwner && !isPrincipalOrAdmin) {
        return res.status(403).json({ error: 'Bạn không có quyền Hủy kế hoạch này.' });
      }
    } else {
      return res.status(400).json({ error: `Trạng thái đích "${newStatus}" không được hỗ trợ qua endpoint này.` });
    }

    plan.status = newStatus;
    plan.updatedAt = new Date().toISOString();

    let decisionAction: PlanDecision['action'] = 'start';
    if (newStatus === 'completed') decisionAction = 'complete';
    else if (newStatus === 'paused') decisionAction = 'pause';
    else if (newStatus === 'closed') decisionAction = 'close';
    else if (newStatus === 'cancelled') decisionAction = 'cancel';
    else if (newStatus === 'in_progress' && fromStatus === 'paused') decisionAction = 'resume';

    const decision: PlanDecision = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      planId: plan.id,
      action: decisionAction,
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      actorDepartmentId: currentUser.departmentId,
      comment: reason || `Chuyển trạng thái sang "${newStatus}"`,
      timestamp: new Date().toISOString(),
      fromStatus,
      toStatus: newStatus,
      versionSnapshot: plan.versions?.length || 1,
    };

    if (!plan.decisionHistory) plan.decisionHistory = [];
    plan.decisionHistory.push(decision);
    db.save();

    db.addAuditLog(currentUser, `Chuyển trạng thái kế hoạch: ${newStatus}`, 'plans', plan.id, `Kế hoạch ${plan.code} chuyển từ ${fromStatus} -> ${newStatus}`, req);

    res.json(plan);
  });

  // UPDATE PLAN WITH STRICT ANTI-STEALTH-EDIT & VERSION CONTROL
  app.put('/api/plans/:id', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const plan = db.get().plans.find((p) => p.id === id);

    if (!plan) return res.status(404).json({ error: 'Không tìm thấy kế hoạch' });

    const isOwner = plan.responsiblePersonId === currentUser.id;
    const isPrincipalOrAdmin = currentUser.role === 'principal' || currentUser.role === 'admin';
    if (!isOwner && !isPrincipalOrAdmin) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa kế hoạch này.' });
    }

    const { editReason, requireReapproval, status: clientStatus, ...updates } = req.body;

    // RULE: Client cannot silently override status to approved/in_progress via PUT body!
    // Status can only change through the dedicated approval endpoints.

    const isApprovedOrInProgress = plan.status === 'approved' || plan.status === 'in_progress';
    const hasCriticalChanges =
      (updates.title && updates.title !== plan.title) ||
      (updates.content && updates.content !== plan.content) ||
      (updates.basisAndGoals && updates.basisAndGoals !== plan.basisAndGoals) ||
      (updates.startDate && updates.startDate !== plan.startDate) ||
      (updates.endDate && updates.endDate !== plan.endDate) ||
      (updates.expectedBudget !== undefined && updates.expectedBudget !== plan.expectedBudget) ||
      (updates.leadDepartmentId && updates.leadDepartmentId !== plan.leadDepartmentId);

    if (isApprovedOrInProgress && hasCriticalChanges) {
      // RULE: Bắt buộc phải có lý do điều chỉnh khi sửa kế hoạch đã phê duyệt
      if (!editReason || editReason.trim().length < 5) {
        return res.status(400).json({
          error: 'Kế hoạch đã được phê duyệt. Vui lòng ghi rõ lý do điều chỉnh nội dung (tối thiểu 5 ký tự) để ghi nhận nhật ký phiên bản.',
        });
      }

      // Create new version snapshot
      const currentVersionNumber = plan.versions?.length || 1;
      const nextVersionNumber = currentVersionNumber + 1;

      plan.versions.push({
        version: nextVersionNumber,
        modifiedAt: new Date().toISOString(),
        modifiedById: currentUser.id,
        modifiedByName: currentUser.fullName,
        reason: editReason.trim(),
        snapshotTitle: updates.title || plan.title,
        changesSummary: `Điều chỉnh nội dung phiên bản v${nextVersionNumber}`,
      });

      // RULE: Check if reapproval is required
      const rules = db.get().approvalRules || defaultApprovalRules;
      const matchingRule = getRuleForPlan(plan, rules);
      const shouldReapprove = requireReapproval !== undefined ? Boolean(requireReapproval) : matchingRule.requireReapprovalOnEdit;

      if (shouldReapprove) {
        const fromStatus = plan.status;
        const requiredTiers = plan.requiredTiers || matchingRule.requiredTiers;
        const reapprovalStatus: PlanStatus = requiredTiers === 1 ? 'pending_level_2' : 'pending_level_1';

        plan.status = reapprovalStatus;
        plan.currentTier = requiredTiers === 1 ? 2 : 1;
        plan.level1ApprovedAt = undefined;
        plan.approvedAt = undefined;

        const decision: PlanDecision = {
          id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          planId: plan.id,
          action: 'version_bump',
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          actorDepartmentId: currentUser.departmentId,
          comment: `Tạo phiên bản v${nextVersionNumber} và yêu cầu phê duyệt lại: ${editReason.trim()}`,
          timestamp: new Date().toISOString(),
          fromStatus,
          toStatus: reapprovalStatus,
          versionSnapshot: nextVersionNumber,
        };

        if (!plan.decisionHistory) plan.decisionHistory = [];
        plan.decisionHistory.push(decision);

        db.addAuditLog(currentUser, 'Sửa kế hoạch đã duyệt & yêu cầu duyệt lại', 'plans', plan.id, `Tạo phiên bản v${nextVersionNumber} kế hoạch ${plan.code}. Lý do: ${editReason.trim()}`, req);

        // Notify leadership
        const principals = db.get().users.filter((u) => u.role === 'principal');
        principals.forEach((p) => {
          db.sendNotification(p.id, 'Kế hoạch điều chỉnh cần duyệt lại', `${currentUser.fullName} đã điều chỉnh kế hoạch đã duyệt "${plan.title}" (v${nextVersionNumber}). Cần xem xét phê duyệt lại.`, 'plan', 'plans', plan.id);
        });
      }
    }

    // Apply safe updates
    if (updates.code) plan.code = updates.code;
    if (updates.title) plan.title = updates.title;
    if (updates.type) plan.type = updates.type;
    if (updates.schoolLevel) plan.schoolLevel = updates.schoolLevel;
    if (updates.parentPlanId !== undefined) plan.parentPlanId = updates.parentPlanId;
    if (updates.schoolYearId) plan.schoolYearId = updates.schoolYearId;
    if (updates.basisAndGoals !== undefined) plan.basisAndGoals = updates.basisAndGoals;
    if (updates.content !== undefined) plan.content = updates.content;
    if (updates.startDate) plan.startDate = updates.startDate;
    if (updates.endDate) plan.endDate = updates.endDate;
    if (updates.leadDepartmentId) plan.leadDepartmentId = updates.leadDepartmentId;
    if (updates.coDepartmentIds) plan.coDepartmentIds = updates.coDepartmentIds;
    if (updates.responsiblePersonId) plan.responsiblePersonId = updates.responsiblePersonId;
    if (updates.responsiblePersonName) plan.responsiblePersonName = updates.responsiblePersonName;
    if (updates.expectedTargets !== undefined) plan.expectedTargets = updates.expectedTargets;
    if (updates.deliverables !== undefined) plan.deliverables = updates.deliverables;
    if (updates.expectedBudget !== undefined) plan.expectedBudget = updates.expectedBudget;
    if (updates.actualBudget !== undefined) plan.actualBudget = updates.actualBudget;
    if (updates.budgetSource !== undefined) plan.budgetSource = updates.budgetSource;
    if (updates.actualOutcome !== undefined) plan.actualOutcome = updates.actualOutcome;
    if (updates.completionRate !== undefined) plan.completionRate = updates.completionRate;
    if (updates.evaluationComment !== undefined) plan.evaluationComment = updates.evaluationComment;
    if (updates.requiredProofDescription !== undefined) plan.requiredProofDescription = updates.requiredProofDescription;
    if (updates.attachments) plan.attachments = updates.attachments;
    if (updates.requiredTiers) plan.requiredTiers = updates.requiredTiers;

    plan.updatedAt = new Date().toISOString();
    db.save();

    db.addAuditLog(currentUser, 'Cập nhật kế hoạch', 'plans', plan.id, `Cập nhật thông tin kế hoạch ${plan.code}`, req);
    res.json(plan);
  });

  // DELETE PLAN (VỚI RÀNG BUỘC CHẶT CHẼ THEO PROMPT 05)
  // Hạn chế xóa cứng dữ liệu đã được duyệt hoặc đã có báo cáo/kế hoạch con/nhiệm vụ
  app.delete('/api/plans/:id', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const plan = db.get().plans.find((p) => p.id === id);
    if (!plan) return res.status(404).json({ error: 'Không tìm thấy kế hoạch' });

    const isOwner = plan.responsiblePersonId === currentUser.id;
    const isPrincipalOrAdmin = currentUser.role === 'principal' || currentUser.role === 'admin';
    if (!isOwner && !isPrincipalOrAdmin) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa kế hoạch này.' });
    }

    if (plan.status === 'approved' || plan.status === 'in_progress' || plan.status === 'completed') {
      return res.status(400).json({
        error: 'Kế hoạch đã được phê duyệt hoặc đang thực hiện, không được phép xóa cứng. Vui lòng chuyển trạng thái sang "Đã hủy" nếu không tiếp tục triển khai.',
      });
    }

    const hasSubPlans = db.get().plans.some((p) => p.parentPlanId === id);
    if (hasSubPlans) {
      return res.status(400).json({
        error: 'Kế hoạch này đang chứa các kế hoạch cấp dưới trực thuộc. Vui lòng gỡ liên kết hoặc xử lý kế hoạch con trước.',
      });
    }

    const hasLinkedTasks = db.get().tasks.some((t) => t.planId === id);
    if (hasLinkedTasks) {
      return res.status(400).json({
        error: 'Kế hoạch này đã có các nhiệm vụ phân công trực thuộc. Không thể xóa kế hoạch đã giao việc.',
      });
    }

    const idx = db.get().plans.findIndex((p) => p.id === id);
    db.get().plans.splice(idx, 1);
    db.save();

    db.addAuditLog(currentUser, 'Xóa kế hoạch', 'plans', id, `Đã xóa kế hoạch nháp: ${plan.code} - ${plan.title}`, req);
    res.json({ success: true, message: 'Đã xóa kế hoạch thành công.' });
  });

  // BACKWARD COMPATIBILITY ENDPOINT
  app.post('/api/plans/:id/approval', requireRole(['admin', 'principal']), (req: Request, res: Response) => {
    const { action, comment } = req.body;
    if (action === 'approve') {
      req.body.tier = 2;
      return (app as any)._router.handle({ ...req, url: `/api/plans/${req.params.id}/approve-tier`, method: 'POST' }, res);
    } else if (action === 'reject') {
      req.body.tier = 2;
      return (app as any)._router.handle({ ...req, url: `/api/plans/${req.params.id}/reject-tier`, method: 'POST' }, res);
    } else {
      req.body.newStatus = action === 'complete' ? 'completed' : 'paused';
      return (app as any)._router.handle({ ...req, url: `/api/plans/${req.params.id}/transition-status`, method: 'POST' }, res);
    }
  });

  // ==========================================
  // TASKS (GIAO VIỆC & THEO DÕI TIẾN ĐỘ)
  // ==========================================
  app.get('/api/tasks', (req: Request, res: Response) => {
    const user = (req as any).currentUser as User | null;
    const { departmentId, status, planId } = req.query;
    let list = db.get().tasks;

    if (departmentId) list = list.filter((t) => t.departmentId === departmentId);
    if (status) list = list.filter((t) => t.status === status);
    if (planId) list = list.filter((t) => t.planId === planId);

    // Auto calculate overdue
    const today = new Date().toISOString().split('T')[0];
    list.forEach((t) => {
      if (t.deadline < today && t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'pending_verification') {
        t.status = 'overdue';
      }
    });

    res.json(list);
  });

  app.post('/api/tasks', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const body = req.body;

    if (!body.title || !body.mainAssigneeId || !body.deadline) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ: Tên nhiệm vụ, người chịu trách nhiệm chính và hạn hoàn thành.' });
    }

    const assignee = db.get().users.find((u) => u.id === body.mainAssigneeId);

    const newTask: Task = {
      id: `tsk-${Date.now()}`,
      title: body.title,
      description: body.description || '',
      planId: body.planId,
      planTitle: body.planTitle,
      assignerId: currentUser.id,
      assignerName: `${currentUser.fullName} (${currentUser.title})`,
      mainAssigneeId: body.mainAssigneeId,
      mainAssigneeName: assignee ? assignee.fullName : 'Chưa xác định',
      coAssigneeIds: body.coAssigneeIds || [],
      departmentId: body.departmentId || currentUser.departmentId || 'dept-toan-tin',
      issuedDate: body.issuedDate || new Date().toISOString().split('T')[0],
      deadline: body.deadline,
      priority: body.priority || 'normal',
      status: 'not_started',
      progress: 0,
      requiredResult: body.requiredResult || '',
      isProofRequired: Boolean(body.isProofRequired),
      guidanceNotes: body.guidanceNotes || '',
      guidanceAttachments: body.guidanceAttachments || [],
      proofs: [],
      comments: [],
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          action: `Giao nhiệm vụ cho ${assignee?.fullName || 'Người thực hiện'}`,
          note: `Thời hạn: ${body.deadline}`,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.get().tasks.unshift(newTask);
    db.save();

    db.addAuditLog(currentUser, 'Giao việc', 'tasks', newTask.id, `Giao nhiệm vụ: ${newTask.title} cho ${newTask.mainAssigneeName}`, req);

    // Notify assignee
    db.sendNotification(
      newTask.mainAssigneeId,
      'Bạn được giao nhiệm vụ mới',
      `${currentUser.fullName} đã giao nhiệm vụ: "${newTask.title}" (Hạn chót: ${newTask.deadline})`,
      'task',
      'tasks',
      newTask.id
    );

    res.status(201).json(newTask);
  });

  app.put('/api/tasks/:id', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const task = db.get().tasks.find((t) => t.id === id);

    if (!task) return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });

    const isAssignee = task.mainAssigneeId === currentUser.id || task.coAssigneeIds?.includes(currentUser.id);
    const isAssigner = task.assignerId === currentUser.id;
    const isAuthority = currentUser.role === 'admin' || currentUser.role === 'principal' || (currentUser.role === 'dean' && task.departmentId === currentUser.departmentId);

    if (!isAssignee && !isAssigner && !isAuthority) {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật nhiệm vụ ngoài phạm vi phân công.' });
    }

    const body = req.body;

    // Assignee updates progress / submission / challenges and proposals
    if (isAssignee && !isAssigner && !isAuthority) {
      if (body.progress !== undefined) {
        task.progress = Math.min(100, Math.max(0, Number(body.progress)));
        if (task.progress > 0 && task.status === 'not_started') {
          task.status = 'in_progress';
        }
      }
      if (body.completionNote !== undefined) task.completionNote = body.completionNote;
      if (body.challengesAndProposals !== undefined) task.challengesAndProposals = body.challengesAndProposals;
      if (body.proofs) task.proofs = body.proofs;

      if (!task.history) task.history = [];

      // Assignee requesting completion -> status becomes pending_verification (Rule: no auto complete without verification)
      if (body.status === 'completed' || body.requestVerification) {
        if (task.isProofRequired && (!task.proofs || task.proofs.length === 0)) {
          return res.status(400).json({ error: 'Nhiệm vụ này yêu cầu nộp minh chứng bắt buộc trước khi gửi báo cáo hoàn thành.' });
        }
        task.status = 'pending_verification';
        task.history.push({
          id: `h-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          action: 'Đã hoàn thành và gửi báo cáo kết quả chờ người giao việc xác nhận',
          note: body.completionNote || 'Gửi báo cáo kèm minh chứng',
        });

        db.sendNotification(
          task.assignerId,
          'Nhiệm vụ chờ xác nhận',
          `${currentUser.fullName} đã gửi báo cáo hoàn thành nhiệm vụ "${task.title}". Vui lòng kiểm tra minh chứng.`,
          'task',
          'tasks',
          task.id
        );
      } else {
        task.history.push({
          id: `h-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          action: `Cập nhật tiến độ: ${task.progress}%`,
          note: body.completionNote || body.challengesAndProposals || 'Cập nhật tiến độ nhiệm vụ',
        });
      }
    } else {
      // Assigner or authority can modify full task, provide guidance, or verify
      if (body.status) {
        task.status = body.status;
        if (body.status === 'completed') {
          task.progress = 100;
          task.reviewComment = body.reviewComment || 'Đã kiểm tra minh chứng và xác nhận hoàn thành đạt yêu cầu.';
          task.verifiedById = currentUser.id;
          task.verifiedByName = currentUser.fullName;
          task.verifiedAt = new Date().toISOString();
          task.rejectionReason = undefined;

          task.history.push({
            id: `h-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actorId: currentUser.id,
            actorName: currentUser.fullName,
            action: 'Xác nhận hoàn thành nhiệm vụ',
            note: task.reviewComment,
          });
          db.sendNotification(task.mainAssigneeId, 'Nhiệm vụ đã được xác nhận hoàn thành', `${currentUser.fullName} đã xác nhận hoàn thành nhiệm vụ: "${task.title}".`, 'task', 'tasks', task.id);
        } else if (body.status === 'needs_addition') {
          task.reviewComment = body.reviewComment || 'Minh chứng chưa đầy đủ, yêu cầu bổ sung.';
          task.rejectionReason = task.reviewComment;
          task.history.push({
            id: `h-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actorId: currentUser.id,
            actorName: currentUser.fullName,
            action: 'Yêu cầu bổ sung báo cáo/minh chứng',
            note: task.reviewComment,
          });
          db.sendNotification(task.mainAssigneeId, 'Yêu cầu bổ sung nhiệm vụ', `Nhiệm vụ "${task.title}" cần bổ sung minh chứng: ${task.reviewComment}`, 'task', 'tasks', task.id);
        }
      }

      if (body.title) task.title = body.title;
      if (body.description !== undefined) task.description = body.description;
      if (body.guidanceNotes !== undefined) task.guidanceNotes = body.guidanceNotes;
      if (body.guidanceAttachments !== undefined) task.guidanceAttachments = body.guidanceAttachments;
      if (body.deadline) task.deadline = body.deadline;
      if (body.priority) task.priority = body.priority;
      if (body.progress !== undefined) task.progress = Number(body.progress);
      if (body.isProofRequired !== undefined) task.isProofRequired = body.isProofRequired;
      if (body.proofs) task.proofs = body.proofs;
      if (body.challengesAndProposals !== undefined) task.challengesAndProposals = body.challengesAndProposals;
      if (body.completionNote !== undefined) task.completionNote = body.completionNote;
    }

    task.updatedAt = new Date().toISOString();
    db.save();

    db.addAuditLog(currentUser, 'Cập nhật nhiệm vụ', 'tasks', task.id, `Cập nhật trạng thái nhiệm vụ: ${task.title} -> ${task.status}`, req);
    res.json(task);
  });

  // DELETE TASK (VỚI RÀNG BUỘC CHẶT CHẼ THEO PROMPT 05)
  // Hạn chế xóa cứng dữ liệu đã được duyệt hoặc đã có báo cáo/minh chứng
  app.delete('/api/tasks/:id', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const task = db.get().tasks.find((t) => t.id === id);
    if (!task) return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });

    const isAssigner = task.assignerId === currentUser.id;
    const isAuthority = currentUser.role === 'admin' || currentUser.role === 'principal' || (currentUser.role === 'dean' && task.departmentId === currentUser.departmentId);
    if (!isAssigner && !isAuthority) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa nhiệm vụ này.' });
    }

    if (task.status === 'completed' || task.status === 'pending_verification') {
      return res.status(400).json({
        error: 'Nhiệm vụ đã hoàn thành hoặc đang chờ xác nhận kết quả, không được phép xóa cứng.',
      });
    }

    if (task.proofs && task.proofs.length > 0) {
      return res.status(400).json({
        error: 'Nhiệm vụ này đã có sản phẩm/minh chứng đính kèm. Không thể xóa cứng nhiệm vụ đã có dữ liệu thực hiện.',
      });
    }

    if (task.progress > 0 || task.completionNote) {
      return res.status(400).json({
        error: 'Nhiệm vụ này đã có báo cáo tiến độ hoặc nội dung thực hiện, không được phép xóa cứng.',
      });
    }

    const idx = db.get().tasks.findIndex((t) => t.id === id);
    db.get().tasks.splice(idx, 1);
    db.save();

    db.addAuditLog(currentUser, 'Xóa nhiệm vụ', 'tasks', id, `Đã xóa nhiệm vụ: ${task.title}`, req);
    res.json({ success: true, message: 'Đã xóa nhiệm vụ thành công.' });
  });

  app.post('/api/tasks/:id/comments', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const { content, attachments } = req.body;
    const task = db.get().tasks.find((t) => t.id === id);

    if (!task) return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
    if (!content || !content.trim()) return res.status(400).json({ error: 'Nội dung trao đổi không được để trống' });

    const newComment = {
      id: `cmt-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.fullName,
      authorRole: currentUser.role,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      attachments: attachments || [],
    };

    task.comments.push(newComment);
    task.updatedAt = new Date().toISOString();
    db.save();

    // notify main assignee or assigner
    const notifyTarget = currentUser.id === task.mainAssigneeId ? task.assignerId : task.mainAssigneeId;
    db.sendNotification(notifyTarget, 'Trao đổi mới về nhiệm vụ', `${currentUser.fullName} đã phản hồi về: "${task.title}"`, 'task', 'tasks', task.id);

    res.status(201).json(newComment);
  });

  // ==========================================
  // REPORTS & PROOFS (BÁO CÁO & MINH CHỨNG)
  // ==========================================
  app.get('/api/reports', (req: Request, res: Response) => {
    const { type, departmentId } = req.query;
    let list = db.get().reports;

    if (type) list = list.filter((r) => r.type === type);
    if (departmentId) list = list.filter((r) => r.departmentId === departmentId);

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.post('/api/reports', requireRole(['admin', 'principal', 'dean', 'teacher']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const body = req.body;

    const newReport: Report = {
      id: `rep-${Date.now()}`,
      title: body.title,
      type: body.type || 'weekly',
      period: body.period || 'Tuần hiện tại',
      departmentId: body.departmentId || currentUser.departmentId,
      authorId: currentUser.id,
      authorName: currentUser.fullName,
      authorRole: currentUser.role,
      executedContent: body.executedContent || '',
      achievedResults: body.achievedResults || '',
      completionRate: Number(body.completionRate || 100),
      difficultiesAndCauses: body.difficultiesAndCauses || '',
      upcomingSolutions: body.upcomingSolutions || '',
      proofs: body.proofs || [],
      status: body.status || 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.get().reports.unshift(newReport);
    db.save();

    db.addAuditLog(currentUser, 'Gửi báo cáo', 'reports', newReport.id, `Gửi báo cáo: ${newReport.title} (${newReport.period})`, req);

    // Notify principals
    db.get().users.filter((u) => u.role === 'principal').forEach((p) => {
      db.sendNotification(p.id, 'Báo cáo mới được gửi', `${currentUser.fullName} đã gửi "${newReport.title}"`, 'report', 'reports', newReport.id);
    });

    res.status(201).json(newReport);
  });

  app.post('/api/reports/:id/review', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const { id } = req.params;
    const { action, comment } = req.body; // 'approve' | 'needs_addition'
    const report = db.get().reports.find((r) => r.id === id);

    if (!report) return res.status(404).json({ error: 'Không tìm thấy báo cáo' });

    report.status = action === 'approve' ? 'approved' : 'needs_addition';
    report.reviewComment = comment || (action === 'approve' ? 'Đã duyệt báo cáo' : 'Yêu cầu bổ sung số liệu minh chứng');
    report.reviewedById = currentUser.id;
    report.reviewedByName = currentUser.fullName;
    report.reviewedAt = new Date().toISOString();
    report.updatedAt = new Date().toISOString();

    db.save();

    db.addAuditLog(currentUser, `Phê duyệt báo cáo (${action})`, 'reports', report.id, `Ý kiến: ${report.reviewComment}`, req);
    db.sendNotification(report.authorId, 'Kết quả duyệt báo cáo', `Báo cáo "${report.title}" của bạn đã được ${action === 'approve' ? 'phê duyệt' : 'yêu cầu bổ sung'}.`, 'report', 'reports', report.id);

    res.json(report);
  });

  // ==========================================
  // REPORTS & TASK STATISTICS (THỐNG KÊ TOÀN DIỆN: CÁ NHÂN, TỔ/BỘ PHẬN, CẤP HỌC & TOÀN TRƯỜNG)
  // Chỉ sử dụng dữ liệu thật đã lưu. Phân biệt hoàn thành, đang thực hiện, quá hạn, chờ xác nhận, bị trả lại.
  // ==========================================
  app.get('/api/reports/statistics', (req: Request, res: Response) => {
    const { schoolYearId, departmentId, schoolLevel, dateFrom, dateTo } = req.query;
    const dbData = db.get();
    let tasks = dbData.tasks;
    let plans = dbData.plans;

    if (schoolYearId && schoolYearId !== 'all') {
      plans = plans.filter((p) => p.schoolYearId === schoolYearId);
      const planIds = new Set(plans.map((p) => p.id));
      tasks = tasks.filter((t) => !t.planId || planIds.has(t.planId));
    }

    if (departmentId && departmentId !== 'all') {
      tasks = tasks.filter((t) => t.departmentId === departmentId);
      plans = plans.filter((p) => p.leadDepartmentId === departmentId);
    }

    if (schoolLevel && schoolLevel !== 'all') {
      plans = plans.filter((p) => !p.schoolLevel || p.schoolLevel === schoolLevel || p.schoolLevel === 'all');
      const planIds = new Set(plans.map((p) => p.id));
      tasks = tasks.filter((t) => !t.planId || planIds.has(t.planId));
    }

    if (dateFrom) {
      tasks = tasks.filter((t) => t.deadline >= (dateFrom as string));
    }
    if (dateTo) {
      tasks = tasks.filter((t) => t.deadline <= (dateTo as string));
    }

    const today = new Date().toISOString().split('T')[0];
    tasks.forEach((t) => {
      if (t.deadline < today && t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'pending_verification') {
        t.status = 'overdue';
      }
    });

    const totalPlans = plans.length;
    const approvedPlans = plans.filter((p) => p.status === 'approved' || p.status === 'in_progress' || p.status === 'completed').length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress' || t.status === 'not_started').length;
    const pendingVerificationTasks = tasks.filter((t) => t.status === 'pending_verification').length;
    const needsAdditionTasks = tasks.filter((t) => t.status === 'needs_addition').length;
    const overdueTasks = tasks.filter((t) => t.status === 'overdue').length;
    const overallCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // By Individual
    const teachers = dbData.users.filter((u) => u.status === 'active' && u.role !== 'guest');
    const byIndividual = teachers.map((teacher) => {
      const userTasks = tasks.filter((t) => t.mainAssigneeId === teacher.id);
      const userCompleted = userTasks.filter((t) => t.status === 'completed').length;
      const userInProgress = userTasks.filter((t) => t.status === 'in_progress' || t.status === 'not_started').length;
      const userPendingVerif = userTasks.filter((t) => t.status === 'pending_verification').length;
      const userNeedsAddition = userTasks.filter((t) => t.status === 'needs_addition').length;
      const userOverdue = userTasks.filter((t) => t.status === 'overdue').length;
      const rate = userTasks.length > 0 ? Math.round((userCompleted / userTasks.length) * 100) : 0;
      const dept = dbData.departments.find((d) => d.id === teacher.departmentId);

      return {
        userId: teacher.id,
        fullName: teacher.fullName,
        title: teacher.title,
        departmentId: teacher.departmentId,
        departmentName: dept?.name || '',
        role: teacher.role,
        totalTasks: userTasks.length,
        completedTasks: userCompleted,
        inProgressTasks: userInProgress,
        pendingVerificationTasks: userPendingVerif,
        needsAdditionTasks: userNeedsAddition,
        overdueTasks: userOverdue,
        completionRate: rate,
      };
    });

    byIndividual.sort((a, b) => b.totalTasks - a.totalTasks);

    // By Department
    const byDepartment = dbData.departments.map((dept) => {
      const deptTasks = tasks.filter((t) => t.departmentId === dept.id);
      const completed = deptTasks.filter((t) => t.status === 'completed').length;
      const inProgress = deptTasks.filter((t) => t.status === 'in_progress' || t.status === 'not_started').length;
      const overdue = deptTasks.filter((t) => t.status === 'overdue').length;
      const rate = deptTasks.length > 0 ? Math.round((completed / deptTasks.length) * 100) : 0;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        memberCount: dept.memberCount,
        totalTasks: deptTasks.length,
        completedTasks: completed,
        inProgressTasks: inProgress,
        overdueTasks: overdue,
        completionRate: rate,
      };
    });

    // By School Level
    const primaryDepts = new Set(['dept-th-123', 'dept-th-45']);
    const secondaryDepts = new Set(['dept-khtn-thcs', 'dept-khxh-thcs', 'dept-toan-tin']);

    const primaryTasks = tasks.filter((t) => {
      if (primaryDepts.has(t.departmentId)) return true;
      if (t.planId) {
        const p = dbData.plans.find((plan) => plan.id === t.planId);
        return p?.schoolLevel === 'primary';
      }
      return false;
    });

    const secondaryTasks = tasks.filter((t) => {
      if (secondaryDepts.has(t.departmentId)) return true;
      if (t.planId) {
        const p = dbData.plans.find((plan) => plan.id === t.planId);
        return p?.schoolLevel === 'secondary';
      }
      return false;
    });

    const bySchoolLevel = [
      {
        level: 'primary' as const,
        levelName: 'Cấp Tiểu học (Khối 1 - 5)',
        totalTasks: primaryTasks.length,
        completedTasks: primaryTasks.filter((t) => t.status === 'completed').length,
        inProgressTasks: primaryTasks.filter((t) => t.status === 'in_progress' || t.status === 'not_started').length,
        overdueTasks: primaryTasks.filter((t) => t.status === 'overdue').length,
        completionRate: primaryTasks.length > 0 ? Math.round((primaryTasks.filter((t) => t.status === 'completed').length / primaryTasks.length) * 100) : 0,
      },
      {
        level: 'secondary' as const,
        levelName: 'Cấp THCS (Khối 6 - 9)',
        totalTasks: secondaryTasks.length,
        completedTasks: secondaryTasks.filter((t) => t.status === 'completed').length,
        inProgressTasks: secondaryTasks.filter((t) => t.status === 'in_progress' || t.status === 'not_started').length,
        overdueTasks: secondaryTasks.filter((t) => t.status === 'overdue').length,
        completionRate: secondaryTasks.length > 0 ? Math.round((secondaryTasks.filter((t) => t.status === 'completed').length / secondaryTasks.length) * 100) : 0,
      },
      {
        level: 'all' as const,
        levelName: 'Toàn trường / Liên cấp',
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate: overallCompletionRate,
      },
    ];

    res.json({
      summary: {
        totalPlans,
        approvedPlans,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingVerificationTasks,
        needsAdditionTasks,
        overdueTasks,
        overallCompletionRate,
      },
      byIndividual,
      byDepartment,
      bySchoolLevel,
    });
  });

  // ==========================================
  // DOCUMENTS & ARCHIVES (VĂN BẢN & TÀI LIỆU)
  // ==========================================
  app.get('/api/documents', (req: Request, res: Response) => {
    const user = (req as any).currentUser as User | null;
    let list = db.get().documents;

    if (!user) {
      list = list.filter((d) => d.isPublic);
    }

    list.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
    res.json(list);
  });

  app.post('/api/documents', requireRole(['admin', 'principal', 'dean']), (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User;
    const body = req.body;

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      codeNumber: body.codeNumber || `${Math.floor(10 + Math.random() * 90)}/VB-THPT`,
      title: body.title,
      type: body.type || 'directive',
      departmentId: body.departmentId || currentUser.departmentId,
      issuedDate: body.issuedDate || new Date().toISOString().split('T')[0],
      signer: body.signer || currentUser.fullName,
      summary: body.summary || '',
      isPublic: Boolean(body.isPublic),
      file: body.file || {
        id: `att-${Date.now()}`,
        name: `${body.codeNumber || 'Van_ban'}.pdf`,
        size: 350000,
        type: 'application/pdf',
        url: '/docs/default.pdf',
        uploadedAt: new Date().toISOString(),
      },
      relatedPlanId: body.relatedPlanId,
      relatedTaskId: body.relatedTaskId,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };

    db.get().documents.unshift(newDoc);
    db.save();

    db.addAuditLog(currentUser, 'Ban hành văn bản', 'documents', newDoc.id, `Ban hành: ${newDoc.codeNumber} - ${newDoc.title}`, req);
    res.status(201).json(newDoc);
  });

  app.post('/api/documents/:id/download', (req: Request, res: Response) => {
    const doc = db.get().documents.find((d) => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Không tìm thấy tài liệu' });
    doc.downloadCount = (doc.downloadCount || 0) + 1;
    db.save();
    res.json({ success: true, count: doc.downloadCount });
  });

  // ==========================================
  // SYSTEM NOTIFICATIONS
  // ==========================================
  app.get('/api/notifications', (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User | null;
    if (!currentUser) return res.json([]);
    const userNotifs = db.get().notifications.filter((n) => n.userId === currentUser.id);
    res.json(userNotifs);
  });

  app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
    const notif = db.get().notifications.find((n) => n.id === req.params.id);
    if (notif) {
      notif.isRead = true;
      db.save();
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/read-all', (req: Request, res: Response) => {
    const currentUser = (req as any).currentUser as User | null;
    if (!currentUser) return res.status(401).json({ error: 'Chưa đăng nhập' });
    db.get().notifications.forEach((n) => {
      if (n.userId === currentUser.id) n.isRead = true;
    });
    db.save();
    res.json({ success: true });
  });

  // ==========================================
  // GLOBAL & ADVANCED SEARCH (TÌM KIẾM TOÀN HỆ THỐNG CÓ PHÂN QUYỀN)
  // ==========================================
  app.get('/api/search', (req: Request, res: Response) => {
    const q = ((req.query.q as string) || '').toLowerCase().trim();
    const type = (req.query.type as string) || 'all';
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const assigneeId = req.query.assigneeId as string | undefined;
    const departmentId = req.query.departmentId as string | undefined;
    const status = req.query.status as string | undefined;

    const user = (req as any).currentUser as User | null;
    const isPrincipalOrAdmin = user && (user.role === 'principal' || user.role === 'admin');
    const isDean = user && user.role === 'dean';
    const isTeacher = user && user.role === 'teacher';

    const data = db.get();

    // 1. ANNOUNCEMENTS
    let announcements = data.announcements.filter((a) => {
      // Permission check
      if (!user || user.role === 'guest') {
        if (!a.isPublic || a.status !== 'published') return false;
      } else if (!isPrincipalOrAdmin) {
        if (a.authorId !== user.id && a.status === 'draft') return false;
        if (!a.isPublic) {
          const isAudience =
            a.targetAudience === 'all' ||
            (a.targetAudience === 'teachers' && (isTeacher || isDean)) ||
            (a.targetAudience === 'deans' && isDean) ||
            (a.targetAudience === 'departments' && a.targetDepartmentIds?.includes(user.departmentId || '')) ||
            (a.targetAudience === 'users' && a.targetUserIds?.includes(user.id)) ||
            a.authorId === user.id;
          if (!isAudience) return false;
        }
      }

      // Keyword match
      if (q) {
        const match =
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          (a.summary && a.summary.toLowerCase().includes(q)) ||
          a.authorName.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Filter by department
      if (departmentId && departmentId !== 'all') {
        const matchDept = a.targetDepartmentIds?.includes(departmentId);
        if (!matchDept) return false;
      }

      // Filter by status
      if (status && status !== 'all' && a.status !== status) return false;

      // Filter by date
      if (dateFrom && (a.publishedAt || a.createdAt) < dateFrom) return false;
      if (dateTo && (a.publishedAt || a.createdAt) > dateTo + 'T23:59:59Z') return false;

      // Filter by author/assignee
      if (assigneeId && a.authorId !== assigneeId) return false;

      return true;
    });

    // 2. EVENTS
    let events = data.events.filter((e) => {
      // Permission check
      if (!user || user.role === 'guest') {
        if (e.isPublic === false || e.status === 'cancelled') return false;
      }

      if (q) {
        const match =
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.hostName.toLowerCase().includes(q) ||
          (e.content && e.content.toLowerCase().includes(q));
        if (!match) return false;
      }

      if (departmentId && departmentId !== 'all' && e.departmentId !== departmentId) return false;
      if (status && status !== 'all' && e.status !== status) return false;
      if (dateFrom && e.endDate < dateFrom) return false;
      if (dateTo && e.startDate > dateTo) return false;
      if (assigneeId && e.creatorId !== assigneeId && !e.hostName.toLowerCase().includes(assigneeId.toLowerCase())) return false;

      return true;
    });

    // 3. PLANS
    let plans = data.plans.filter((p) => {
      // Permission check
      if (!user || user.role === 'guest') {
        return false;
      }

      if (!isPrincipalOrAdmin) {
        const isMyPlan = p.responsiblePersonId === user.id;
        const isMyDept = p.leadDepartmentId === user.departmentId || p.coDepartmentIds?.includes(user.departmentId || '');
        const isApprovedSchoolWide = p.status === 'approved' || p.status === 'in_progress' || p.status === 'completed';
        if (!isMyPlan && !isMyDept && !isApprovedSchoolWide) return false;
      }

      if (q) {
        const match =
          p.title.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.content && p.content.toLowerCase().includes(q)) ||
          p.responsiblePersonName.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (departmentId && departmentId !== 'all' && p.leadDepartmentId !== departmentId) return false;
      if (status && status !== 'all' && p.status !== status) return false;
      if (dateFrom && p.endDate < dateFrom) return false;
      if (dateTo && p.startDate > dateTo) return false;
      if (assigneeId && p.responsiblePersonId !== assigneeId) return false;

      return true;
    });

    // 4. TASKS
    let tasks = data.tasks.filter((t) => {
      // Permission check
      if (!user || user.role === 'guest') {
        return false;
      }

      if (!isPrincipalOrAdmin) {
        const isAssignee = t.mainAssigneeId === user.id || t.coAssigneeIds?.includes(user.id);
        const isAssigner = t.assignerId === user.id;
        const isDept = user.role === 'dean' && t.departmentId === user.departmentId;
        if (!isAssignee && !isAssigner && !isDept) return false;
      }

      if (q) {
        const match =
          t.title.toLowerCase().includes(q) ||
          t.mainAssigneeName.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.assignerName.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (departmentId && departmentId !== 'all' && t.departmentId !== departmentId) return false;
      if (status && status !== 'all' && t.status !== status) return false;
      if (dateFrom && t.deadline < dateFrom) return false;
      if (dateTo && t.deadline > dateTo) return false;
      if (assigneeId && t.mainAssigneeId !== assigneeId && !t.coAssigneeIds?.includes(assigneeId)) return false;

      return true;
    });

    // 5. REPORTS
    let reports = data.reports.filter((r) => {
      // Permission check
      if (!user || user.role === 'guest') {
        return false;
      }

      if (!isPrincipalOrAdmin) {
        const isAuthor = r.authorId === user.id;
        const isDept = user.role === 'dean' && r.departmentId === user.departmentId;
        if (!isAuthor && !isDept) return false;
      }

      if (q) {
        const match =
          r.title.toLowerCase().includes(q) ||
          r.authorName.toLowerCase().includes(q) ||
          (r.executedContent && r.executedContent.toLowerCase().includes(q)) ||
          (r.achievedResults && r.achievedResults.toLowerCase().includes(q));
        if (!match) return false;
      }

      if (departmentId && departmentId !== 'all' && r.departmentId !== departmentId) return false;
      if (status && status !== 'all' && r.status !== status) return false;
      if (dateFrom && r.createdAt < dateFrom) return false;
      if (dateTo && r.createdAt > dateTo + 'T23:59:59Z') return false;
      if (assigneeId && r.authorId !== assigneeId) return false;

      return true;
    });

    // 6. DOCUMENTS
    let documents = data.documents.filter((d) => {
      // Permission check
      if (!user || user.role === 'guest') {
        if (!d.isPublic) return false;
      }

      if (q) {
        const match =
          d.title.toLowerCase().includes(q) ||
          d.codeNumber.toLowerCase().includes(q) ||
          (d.summary && d.summary.toLowerCase().includes(q)) ||
          d.signer.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (departmentId && departmentId !== 'all' && d.departmentId !== departmentId) return false;
      if (dateFrom && d.issuedDate < dateFrom) return false;
      if (dateTo && d.issuedDate > dateTo) return false;

      return true;
    });

    // Handle type filter
    if (type !== 'all') {
      if (type !== 'announcements') announcements = [];
      if (type !== 'events') events = [];
      if (type !== 'plans') plans = [];
      if (type !== 'tasks') tasks = [];
      if (type !== 'reports') reports = [];
      if (type !== 'documents') documents = [];
    }

    res.json({ announcements, events, plans, tasks, reports, documents });
  });

  // ==========================================
  // FILE UPLOAD SIMULATOR / HANDLER
  // ==========================================
  app.post('/api/files/upload', (req: Request, res: Response) => {
    const { name, size, type, data } = req.body;
    if (!name) return res.status(400).json({ error: 'Thiếu tên tệp' });

    const newAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      size: size || 102400,
      type: type || 'application/pdf',
      url: data || `/docs/${encodeURIComponent(name)}`,
      uploadedAt: new Date().toISOString(),
    };

    res.json(newAttachment);
  });

  // ==========================================
  // VITE / STATIC SERVING
  // ==========================================
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Hệ thống Quản lý Nhà trường] Server đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer();

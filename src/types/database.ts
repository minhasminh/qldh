export type Role = 'admin' | 'principal' | 'dean' | 'teacher' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'locked';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  departmentId?: string;
  departmentName?: string;
  subject?: string; // Môn học phụ trách
  title: string; // e.g. "Hiệu trưởng", "Phó hiệu trưởng", "Tổ trưởng", "Tổ phó", "Giáo viên"
  avatar?: string;
  status: UserStatus;
  createdAt: string;
  password?: string;
  mustChangePassword?: boolean;
}

export interface ExcelUserImportRow {
  fullName: string;
  email: string;
  password?: string;
  departmentName: string;
  departmentId?: string;
  subject?: string;
  roleName: string;
  role?: Role;
  statusName?: string;
  status?: UserStatus;
  phone?: string;
  title?: string;
}

export interface ExcelImportResult {
  total: number;
  successCount: number;
  failedCount: number;
  createdUsers: User[];
  errors: { row: number; email: string; error: string }[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  type: 'management' | 'subject' | 'administrative' | 'youth';
  description: string;
  leaderId?: string;
  memberCount?: number;
}

export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface SchoolYear {
  id: string;
  name: string; // e.g. "2026-2027"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  semesters: Semester[];
}

export interface SchoolGrade {
  id: string;
  name: string; // e.g. "Khối 1", "Khối 6"
  schoolLevel: SchoolLevelType; // 'primary' | 'secondary'
  classesCount: number;
  description?: string;
}

export interface SystemCategory {
  id: string;
  name: string;
  type: 'announcement' | 'document' | 'event' | 'task';
  description?: string;
  color?: string;
}

export interface ApprovalWorkflowConfig {
  planWorkflow: {
    enabled: boolean;
    requiredTiers: 1 | 2;
    blockSelfApproval: boolean;
    requireCommentOnReject: boolean;
    slaHours: number;
  };
  taskVerification: {
    requireProofForCompletion: boolean;
    managerMustVerify: boolean;
  };
  reportWorkflow: {
    deanReviewRequired: boolean;
    principalApprovalRequired: boolean;
  };
}

export interface NotificationConfig {
  enableInApp: boolean;
  notifyOnNewSchedule: boolean;
  notifyOnScheduleChange: boolean;
  notifyOnPlanApproved: boolean;
  notifyOnNewTask: boolean;
  notifyOnTaskDueSoon: boolean;
  notifyOnReportSubmitted: boolean;
  enableEmail: boolean;
  emailSmtpHost?: string;
  emailSender?: string;
  emailMaskedSecret?: string;
  smsMaskedApiKey?: string;
  zaloWebhookUrl?: string;
}

export interface PublicNewsItem {
  id: string;
  title: string;
  category: 'tiểu học' | 'thcs' | 'phong trào' | 'chuyên môn';
  summary: string;
  content: string;
  date: string;
  author: string;
  imageUrl?: string;
}

export interface WebsiteConfig {
  heroTagline?: string;
  heroTitle?: string;
  heroDescription?: string;
  bannerImageUrl?: string;
  bannerImages?: string[]; // Danh sách các ảnh banner đã thêm
  bannerOverlayOpacity?: number; // 0.2 to 0.9 (defaults to 0.65)
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  stat3Value?: string;
  stat3Label?: string;
  stat4Value?: string;
  stat4Label?: string;
  aboutHistoryTitle?: string;
  aboutHistoryParagraph1?: string;
  aboutHistoryParagraph2?: string;
  primaryLevelTitle?: string;
  primaryLevelSubtitle?: string;
  primaryLevelDesc?: string;
  secondaryLevelTitle?: string;
  secondaryLevelSubtitle?: string;
  secondaryLevelDesc?: string;
  officeHours?: string;
  contactNotes?: string;
  mapAddress?: string;
  facebookUrl?: string;
  zaloUrl?: string;
  newsArticles?: PublicNewsItem[];
}

export interface SchoolSettings {
  schoolName: string;
  shortName: string;
  schoolCode: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  principalName: string;
  currentSchoolYearId: string;
  currentSemester: string;
  logoUrl?: string;
  motto: string;
  managementAgency: string; // e.g. "SỞ GIÁO DỤC VÀ ĐÀO TẠO"
  grades?: SchoolGrade[];
  categories?: SystemCategory[];
  notificationConfig?: NotificationConfig;
  approvalWorkflow?: ApprovalWorkflowConfig;
  websiteConfig?: WebsiteConfig;
  isProduction?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  size: number; // bytes
  type: string;
  url: string; // base64 data URI or API URL
  uploadedAt: string;
}

export type AnnouncementCategory = 'general' | 'academic' | 'management' | 'union' | 'urgent';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AnnouncementStatus = 'draft' | 'pending' | 'published' | 'expired' | 'revoked' | 'withdrawn';
export type AudienceType = 'all' | 'principals' | 'deans' | 'teachers' | 'departments' | 'users';

export interface AnnouncementReadRecord {
  id: string;
  announcementId: string;
  userId: string;
  userName: string;
  userRole: Role;
  departmentName?: string;
  readAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  isPublic: boolean;
  targetAudience: AudienceType;
  targetDepartmentIds: string[];
  targetUserIds: string[];
  status: AnnouncementStatus;
  isPinned: boolean;
  pinnedUntil?: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  publishedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  attachments: Attachment[];
  readCount: number;
  readUserIds: string[];
  readRecords?: AnnouncementReadRecord[];
  createdAt: string;
  updatedAt: string;
}

export type EventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';

export interface CalendarEvent {
  id: string;
  title: string;
  content: string;
  purpose: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  location: string;
  hostName: string;
  hostId?: string;
  attendeesDescription: string;
  departmentId?: string;
  creatorId: string;
  creatorName: string;
  approverId?: string;
  status: EventStatus;
  isAllDay: boolean;
  notes?: string;
  relatedPlanId?: string;
  relatedPlanTitle?: string;
  relatedTaskId?: string;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledById?: string;
  cancelledByName?: string;
  attachments: Attachment[];
  isPublic?: boolean;
  createdAt: string;
}

export type PlanType =
  | 'year'
  | 'semester'
  | 'academic'
  | 'department'
  | 'month'
  | 'week'
  | 'event'
  | 'inspection'
  | 'digital_transformation';

// 11 Trạng thái chuẩn hóa theo quy trình phê duyệt trường học 2 cấp
export type PlanStatus =
  | 'draft'               // Bản nháp
  | 'pending_level_1'     // Chờ duyệt cấp 1 (Tổ trưởng/Trưởng bộ phận)
  | 'revision_level_1'    // Cần chỉnh sửa cấp 1
  | 'pending_level_2'     // Chờ duyệt cấp 2 (Ban Giám hiệu)
  | 'revision_level_2'    // Cần chỉnh sửa cấp 2
  | 'approved'            // Đã phê duyệt
  | 'in_progress'         // Đang thực hiện
  | 'completed'           // Hoàn thành
  | 'paused'              // Tạm dừng
  | 'closed'              // Đã kết thúc
  | 'cancelled'           // Đã hủy
  // Tương thích ngược:
  | 'pending'
  | 'needs_revision'
  | 'concluded';

export type SchoolLevelType = 'all' | 'primary' | 'secondary';

export interface PlanVersion {
  version: number;
  modifiedAt: string;
  modifiedById: string;
  modifiedByName: string;
  reason: string;
  snapshotTitle: string;
  changesSummary?: string;
}

export type PlanDecisionAction =
  | 'submit'          // Trình duyệt (khởi tạo luồng)
  | 'approve_level_1' // Duyệt cấp 1
  | 'reject_level_1'  // Trả lại cấp 1
  | 'approve_level_2' // Duyệt cấp 2
  | 'reject_level_2'  // Trả lại cấp 2
  | 'resubmit'        // Nộp lại sau chỉnh sửa
  | 'start'           // Triển khai thực hiện
  | 'complete'        // Báo cáo hoàn thành
  | 'pause'           // Tạm dừng
  | 'resume'          // Tiếp tục
  | 'close'           // Kết thúc kế hoạch
  | 'cancel'          // Hủy bỏ
  | 'version_bump';   // Điều chỉnh nội dung & tăng phiên bản

export interface PlanDecision {
  id: string;
  planId: string;
  tierLevel?: 1 | 2;
  action: PlanDecisionAction;
  actorId: string;
  actorName: string;
  actorRole: Role;
  actorDepartmentId?: string;
  comment?: string;
  timestamp: string;
  fromStatus: PlanStatus;
  toStatus: PlanStatus;
  versionSnapshot?: number;
}

export interface ApprovalWorkflowRule {
  id: string;
  planType: PlanType | 'all';
  name: string;
  description: string;
  scope: 'school_wide' | 'department_only' | 'individual';
  requiredTiers: 1 | 2; // Số cấp duyệt bắt buộc (1 hoặc 2)
  level1Role: Role;     // 'dean' (Tổ trưởng) hoặc 'principal'
  level2Role: Role;     // 'principal' (Ban Giám hiệu)
  allowSelfApproval: boolean;        // Mặc định false: không cho phép người lập tự duyệt
  requireReapprovalOnEdit: boolean;  // Khi sửa nội dung quan trọng: có bắt buộc duyệt lại không
  isDefault?: boolean;
}

export interface Plan {
  id: string;
  code: string; // e.g. "KH-2026-01"
  title: string;
  type: PlanType;
  schoolLevel?: SchoolLevelType; // Cấp học: 'all' (Liên cấp/Toàn trường) | 'primary' (Tiểu học) | 'secondary' (THCS)
  parentPlanId?: string;
  schoolYearId: string;
  basisAndGoals: string;
  content: string;
  startDate: string;
  endDate: string;
  leadDepartmentId: string;
  coDepartmentIds: string[];
  responsiblePersonId: string;
  responsiblePersonName: string;
  expectedTargets: string;
  deliverables?: string; // Sản phẩm đầu ra bắt buộc
  expectedBudget?: number;
  actualBudget?: number; // Kinh phí thực tế đã sử dụng
  budgetSource?: string; // Nguồn kinh phí (ngân sách / xã hội hóa / tự chủ)
  actualOutcome?: string; // Kết quả thực hiện đạt được
  completionRate?: number; // Tỷ lệ hoàn thành (0 - 100%)
  evaluationComment?: string; // Đánh giá nghiệm thu của Ban Giám hiệu
  requiredProofDescription?: string;
  attachments: Attachment[];
  status: PlanStatus;

  // Luồng duyệt 2 cấp
  requiredTiers: 1 | 2;     // 1 cấp (BGH lập) hoặc 2 cấp (Tổ trưởng -> BGH)
  currentTier?: 1 | 2;       // Đang ở cấp duyệt nào

  // Phê duyệt Cấp 1
  level1ApprovedById?: string;
  level1ApprovedByName?: string;
  level1ApprovedAt?: string;
  level1Comment?: string;

  // Phê duyệt Cấp 2 / Phê duyệt cuối cùng
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalComment?: string;

  revisionComment?: string;
  decisionHistory: PlanDecision[];
  versions: PlanVersion[];

  // Hai chiều: Kế hoạch cha, kế hoạch con và nhiệm vụ liên kết
  parentPlan?: {
    id: string;
    code: string;
    title: string;
    type: PlanType;
    status: PlanStatus;
    responsiblePersonName?: string;
  };
  subPlans?: {
    id: string;
    code: string;
    title: string;
    type: PlanType;
    status: PlanStatus;
    responsiblePersonName: string;
    startDate: string;
    endDate: string;
  }[];
  linkedTasks?: Task[];

  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_verification'
  | 'needs_addition'
  | 'completed'
  | 'overdue'
  | 'cancelled';

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

export interface TaskHistoryEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  note?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  planId?: string;
  planTitle?: string;
  assignerId: string;
  assignerName: string;
  mainAssigneeId: string;
  mainAssigneeName: string;
  coAssigneeIds: string[];
  coAssigneeNames?: string[];
  departmentId: string;
  issuedDate: string;
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number; // 0 to 100
  requiredResult: string;
  isProofRequired: boolean;
  proofs: Attachment[];
  guidanceNotes?: string; // Tài liệu hướng dẫn, chỉ đạo thực hiện
  guidanceAttachments?: Attachment[]; // Tệp đính kèm hướng dẫn
  challengesAndProposals?: string; // Người thực hiện giải trình khó khăn và đề xuất hỗ trợ
  completionNote?: string; // Báo cáo kết quả của người thực hiện
  reviewComment?: string; // Nhận xét đánh giá của người giao/quản lý
  verifiedById?: string; // Người xác nhận hoàn thành
  verifiedByName?: string;
  verifiedAt?: string; // Thời điểm xác nhận
  rejectionReason?: string; // Lý do yêu cầu bổ sung
  comments: TaskComment[];
  history: TaskHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type ReportType = 'weekly' | 'monthly' | 'semester' | 'year' | 'plan' | 'task';
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'needs_addition';

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  period: string; // e.g. "Tuần 08", "Tháng 10/2026", "Học kỳ I"
  departmentId?: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  executedContent: string;
  achievedResults: string;
  completionRate: number; // 0 to 100
  difficultiesAndCauses?: string;
  upcomingSolutions?: string;
  proofs: Attachment[];
  status: ReportStatus;
  reviewComment?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 'directive' | 'plan' | 'decision' | 'minutes' | 'form' | 'other';

export interface DocumentItem {
  id: string;
  codeNumber: string; // e.g. "12/KH-THPT"
  title: string;
  type: DocumentType;
  departmentId?: string;
  issuedDate: string;
  signer: string;
  summary: string;
  isPublic: boolean;
  file: Attachment;
  relatedAnnouncementId?: string;
  relatedPlanId?: string;
  relatedTaskId?: string;
  downloadCount: number;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'announcement' | 'schedule' | 'plan' | 'task' | 'report' | 'system';
  targetModule: string;
  targetId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  module: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface DashboardStats {
  unreadAnnouncementsCount: number;
  publishedAnnouncementsCount?: number;
  todayEventsCount: number;
  weekEventsCount: number;
  pendingPlansCount: number;
  pendingPlansLevel1Count?: number;
  pendingPlansLevel2Count?: number;
  inProgressPlansCount?: number;
  ongoingTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  upcomingDueTasksCount?: number;
  taskCompletionRate?: number;
  pendingReportsCount: number;
  reportsNeedAdditionCount?: number;
  totalTeachersCount: number;
  totalDepartmentsCount: number;
  // Dean role stats
  deanDeptPlansCount?: number;
  deanDeptTasksCount?: number;
  deanDeptOverdueTasksCount?: number;
  deanDeptReportsCount?: number;
  deanPendingApprovalPlansCount?: number;
  // Teacher role stats
  myAssignedTasksCount?: number;
  myCoordinatedTasksCount?: number;
  myUpcomingDueTasksCount?: number;
  myCompletedTasksCount?: number;
  myNeedsAdditionReportsCount?: number;
  myCompletionRate?: number;
}

export interface AdvancedSearchParams {
  q?: string;
  type?: 'all' | 'announcements' | 'events' | 'plans' | 'tasks' | 'reports' | 'documents';
  dateFrom?: string;
  dateTo?: string;
  assigneeId?: string;
  departmentId?: string;
  status?: string;
}

export interface TaskIndividualStats {
  userId: string;
  fullName: string;
  title: string;
  departmentId?: string;
  departmentName?: string;
  role: Role;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingVerificationTasks: number;
  needsAdditionTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface TaskDepartmentStats {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  memberCount: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface TaskSchoolLevelStats {
  level: SchoolLevelType;
  levelName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface TaskStatisticsReport {
  summary: {
    totalPlans: number;
    approvedPlans: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingVerificationTasks: number;
    needsAdditionTasks: number;
    overdueTasks: number;
    overallCompletionRate: number;
  };
  byIndividual: TaskIndividualStats[];
  byDepartment: TaskDepartmentStats[];
  bySchoolLevel: TaskSchoolLevelStats[];
}

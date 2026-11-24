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
  Attachment,
  ApprovalWorkflowRule,
  PlanDecision,
  PlanStatus,
  TaskStatisticsReport,
  AdvancedSearchParams,
  ExcelUserImportRow,
  ExcelImportResult,
} from '../types/database.ts';

const TOKEN_KEY = 'school_auth_token';

// Hỗ trợ cấu hình URL backend tùy biến khi frontend tĩnh deploy độc lập trên cPanel
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fullUrl = url.startsWith('/api') && API_BASE ? `${API_BASE}${url}` : url;
  const response = await fetch(fullUrl, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let errorMsg = `Lỗi mạng (HTTP ${response.status})`;
    if (contentType.includes('application/json')) {
      try {
        const errData = await response.json();
        if (errData && errData.error) errorMsg = errData.error;
      } catch {
        // ignore
      }
    } else {
      const text = await response.text();
      if (text.includes('<!doctype') || text.includes('<html')) {
        errorMsg = `Lỗi định tuyến cPanel (HTTP ${response.status}): API '${url}' trả về trang HTML thay vì JSON. Nguyên nhân: .htaccess định tuyến nhầm request API về index.html do chưa khởi chạy backend Node.js hoặc cấu hình reverse proxy chưa trỏ đúng port.`;
      }
    }
    throw new Error(errorMsg);
  }

  if (contentType.includes('text/html')) {
    const text = await response.text();
    if (text.includes('<!doctype') || text.includes('<html')) {
      throw new Error(
        `Lỗi cấu hình cPanel: API '${url}' trả về HTML của trang web thay vì dữ liệu JSON. Nguyên nhân: .htaccess chuyển hướng URL API về index.html do chưa kích hoạt backend hoặc sai URL API.`
      );
    }
  }

  return response.json();
}

export const api = {
  // Auth
  login: (username: string, password?: string) =>
    fetchJson<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getCurrentUser: () => fetchJson<User>('/api/auth/me'),

  getUsers: () => fetchJson<User[]>('/api/users'),

  createUser: (data: Partial<User>) =>
    fetchJson<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id: string, data: Partial<User>) =>
    fetchJson<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  importUsersFromExcel: (rows: ExcelUserImportRow[]) =>
    fetchJson<ExcelImportResult>('/api/users/import-excel', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),

  resetPassword: (id: string, newPassword: string) =>
    fetchJson<{ success: boolean; message: string; username: string; newPassword: string }>(
      `/api/users/${id}/reset-password`,
      {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      }
    ),

  deleteUser: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    }),

  // Departments
  getDepartments: () => fetchJson<Department[]>('/api/departments'),

  createDepartment: (data: Partial<Department>) =>
    fetchJson<Department>('/api/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDepartment: (id: string, data: Partial<Department>) =>
    fetchJson<Department>(`/api/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteDepartment: (id: string) =>
    fetchJson<{ success: boolean; message?: string }>(`/api/departments/${id}`, {
      method: 'DELETE',
    }),

  // Settings & System
  getSettings: () => fetchJson<SchoolSettings>('/api/system/settings'),

  updateSettings: (data: Partial<SchoolSettings>) =>
    fetchJson<SchoolSettings>('/api/system/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Website Trường (Thông tin trang thông tin công khai)
  getWebsiteSettings: () => fetchJson<Partial<SchoolSettings>>('/api/website-settings'),

  updateWebsiteSettings: (data: Partial<SchoolSettings>) =>
    fetchJson<SchoolSettings>('/api/website-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // School Years & Semesters (Cấu hình năm học & học kỳ)
  getSchoolYears: () => fetchJson<SchoolYear[]>('/api/school-years'),

  createSchoolYear: (data: Partial<SchoolYear>) =>
    fetchJson<SchoolYear>('/api/school-years', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSchoolYear: (id: string, data: Partial<SchoolYear>) =>
    fetchJson<SchoolYear>(`/api/school-years/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSchoolYear: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/school-years/${id}`, {
      method: 'DELETE',
    }),

  getAuditLogs: () => fetchJson<AuditLog[]>('/api/system/audit-logs'),

  resetDemoData: () =>
    fetchJson<{ message: string }>('/api/system/reset-demo', {
      method: 'POST',
    }),

  restoreBackup: (data: any) =>
    fetchJson<{ message: string }>('/api/system/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dashboard
  getDashboardStats: () => fetchJson<DashboardStats>('/api/dashboard/stats'),

  // Public Portal (Sanitized & Strictly Public)
  getPublicAnnouncements: () => fetchJson<Announcement[]>('/api/public/announcements'),
  getPublicAnnouncementById: (id: string) => fetchJson<Announcement>(`/api/public/announcements/${id}`),
  getPublicEvents: (params?: { start?: string; end?: string }) => {
    const q = new URLSearchParams();
    if (params?.start) q.set('start', params.start);
    if (params?.end) q.set('end', params.end);
    return fetchJson<CalendarEvent[]>(`/api/public/events?${q.toString()}`);
  },

  // Announcements (Internal & Comprehensive Management)
  getAnnouncements: (params?: { category?: string; status?: string; isPublic?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.category && params.category !== 'all') q.set('category', params.category);
    if (params?.status && params.status !== 'all') q.set('status', params.status);
    if (params?.isPublic !== undefined) q.set('isPublic', String(params.isPublic));
    return fetchJson<Announcement[]>(`/api/announcements?${q.toString()}`);
  },

  getAnnouncementById: (id: string) => fetchJson<Announcement>(`/api/announcements/${id}`),

  createAnnouncement: (data: Partial<Announcement>) =>
    fetchJson<Announcement>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAnnouncement: (id: string, data: Partial<Announcement>) =>
    fetchJson<Announcement>(`/api/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  submitAnnouncement: (id: string) =>
    fetchJson<Announcement>(`/api/announcements/${id}/submit`, {
      method: 'POST',
    }),

  publishAnnouncement: (id: string) =>
    fetchJson<Announcement>(`/api/announcements/${id}/publish`, {
      method: 'POST',
    }),

  revokeAnnouncement: (id: string, reason: string) =>
    fetchJson<Announcement>(`/api/announcements/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  expireAnnouncement: (id: string) =>
    fetchJson<Announcement>(`/api/announcements/${id}/expire`, {
      method: 'POST',
    }),

  togglePinAnnouncement: (id: string) =>
    fetchJson<Announcement>(`/api/announcements/${id}/pin`, {
      method: 'POST',
    }),

  markAnnouncementRead: (id: string) =>
    fetchJson<{ success: boolean; readCount: number }>(`/api/announcements/${id}/read`, {
      method: 'POST',
    }),

  getAnnouncementReaders: (id: string) =>
    fetchJson<{
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
    }>(`/api/announcements/${id}/readers`),

  sendAnnouncementReminder: (id: string) =>
    fetchJson<{ success: boolean; remindedCount: number; message: string }>(
      `/api/announcements/${id}/send-reminder`,
      { method: 'POST' }
    ),

  deleteAnnouncement: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/announcements/${id}`, {
      method: 'DELETE',
    }),

  // Schedule / Events
  getEvents: (params?: { start?: string; end?: string; departmentId?: string }) => {
    const q = new URLSearchParams();
    if (params?.start) q.set('start', params.start);
    if (params?.end) q.set('end', params.end);
    if (params?.departmentId && params.departmentId !== 'all') q.set('departmentId', params.departmentId);
    return fetchJson<CalendarEvent[]>(`/api/events?${q.toString()}`);
  },

  checkScheduleClash: (data: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location?: string;
    hostName?: string;
    excludeId?: string;
  }) =>
    fetchJson<{ hasClash: boolean; clashes: string[] }>('/api/events/check-clash', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createEvent: (data: Partial<CalendarEvent>) =>
    fetchJson<CalendarEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEvent: (id: string, data: Partial<CalendarEvent>) =>
    fetchJson<CalendarEvent>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cancelEvent: (id: string, cancelReason: string) =>
    fetchJson<CalendarEvent>(`/api/events/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancelReason }),
    }),

  deleteEvent: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/events/${id}`, {
      method: 'DELETE',
    }),

  // Plans & Two-Tier Approval Workflow
  getPlans: (params?: { type?: string; schoolYearId?: string; status?: string; departmentId?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.schoolYearId) q.set('schoolYearId', params.schoolYearId);
    if (params?.status) q.set('status', params.status);
    if (params?.departmentId) q.set('departmentId', params.departmentId);
    return fetchJson<Plan[]>(`/api/plans?${q.toString()}`);
  },

  getPlanById: (id: string) => fetchJson<Plan>(`/api/plans/${id}`),

  createPlan: (data: Partial<Plan>) =>
    fetchJson<Plan>('/api/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePlan: (id: string, data: Partial<Plan> & { editReason?: string; requireReapproval?: boolean }) =>
    fetchJson<Plan>(`/api/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Two-Tier Approval Workflow Actions
  submitPlan: (id: string, note?: string) =>
    fetchJson<Plan>(`/api/plans/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),

  approvePlanTier: (id: string, tier: 1 | 2, comment?: string) =>
    fetchJson<Plan>(`/api/plans/${id}/approve-tier`, {
      method: 'POST',
      body: JSON.stringify({ tier, comment }),
    }),

  rejectPlanTier: (id: string, tier: 1 | 2, comment: string) =>
    fetchJson<Plan>(`/api/plans/${id}/reject-tier`, {
      method: 'POST',
      body: JSON.stringify({ tier, comment }),
    }),

  transitionPlanStatus: (id: string, newStatus: PlanStatus, reason?: string) =>
    fetchJson<Plan>(`/api/plans/${id}/transition-status`, {
      method: 'POST',
      body: JSON.stringify({ newStatus, reason }),
    }),

  // Backward compatibility alias
  approvalPlan: (id: string, action: 'approve' | 'reject' | 'pause' | 'complete', comment?: string) =>
    fetchJson<Plan>(`/api/plans/${id}/approval`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    }),

  // Approval Workflow Rules Configuration
  getApprovalRules: () => fetchJson<ApprovalWorkflowRule[]>('/api/approval-rules'),

  updateApprovalRules: (rules: ApprovalWorkflowRule[]) =>
    fetchJson<ApprovalWorkflowRule[]>('/api/approval-rules', {
      method: 'PUT',
      body: JSON.stringify({ rules }),
    }),

  deletePlan: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/plans/${id}`, {
      method: 'DELETE',
    }),

  // Tasks
  getTasks: (params?: { departmentId?: string; status?: string; planId?: string }) => {
    const q = new URLSearchParams();
    if (params?.departmentId) q.set('departmentId', params.departmentId);
    if (params?.status) q.set('status', params.status);
    if (params?.planId) q.set('planId', params.planId);
    return fetchJson<Task[]>(`/api/tasks?${q.toString()}`);
  },

  createTask: (data: Partial<Task>) =>
    fetchJson<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, data: Partial<Task> & { requestVerification?: boolean }) =>
    fetchJson<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),

  addTaskComment: (id: string, content: string, attachments?: Attachment[]) =>
    fetchJson<any>(`/api/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, attachments }),
    }),

  // Reports & Statistics
  getReports: (params?: { type?: string; departmentId?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.departmentId) q.set('departmentId', params.departmentId);
    return fetchJson<Report[]>(`/api/reports?${q.toString()}`);
  },

  getTaskStatistics: (params?: {
    schoolYearId?: string;
    departmentId?: string;
    schoolLevel?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.schoolYearId && params.schoolYearId !== 'all') q.set('schoolYearId', params.schoolYearId);
    if (params?.departmentId && params.departmentId !== 'all') q.set('departmentId', params.departmentId);
    if (params?.schoolLevel && params.schoolLevel !== 'all') q.set('schoolLevel', params.schoolLevel);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return fetchJson<TaskStatisticsReport>(`/api/reports/statistics?${q.toString()}`);
  },

  createReport: (data: Partial<Report>) =>
    fetchJson<Report>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reviewReport: (id: string, action: 'approve' | 'needs_addition', comment?: string) =>
    fetchJson<Report>(`/api/reports/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    }),

  // Documents
  getDocuments: () => fetchJson<DocumentItem[]>('/api/documents'),

  createDocument: (data: Partial<DocumentItem>) =>
    fetchJson<DocumentItem>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  trackDocumentDownload: (id: string) =>
    fetchJson<{ success: boolean; count: number }>(`/api/documents/${id}/download`, {
      method: 'POST',
    }),

  // Notifications
  getNotifications: () => fetchJson<SystemNotification[]>('/api/notifications'),

  markNotificationRead: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    }),

  markAllNotificationsRead: () =>
    fetchJson<{ success: boolean }>('/api/notifications/read-all', {
      method: 'POST',
    }),

  // Global & Advanced Search
  searchGlobal: (params: string | AdvancedSearchParams) => {
    let queryParams: string;
    if (typeof params === 'string') {
      queryParams = `q=${encodeURIComponent(params)}`;
    } else {
      const sp = new URLSearchParams();
      if (params.q) sp.append('q', params.q);
      if (params.type && params.type !== 'all') sp.append('type', params.type);
      if (params.dateFrom) sp.append('dateFrom', params.dateFrom);
      if (params.dateTo) sp.append('dateTo', params.dateTo);
      if (params.assigneeId && params.assigneeId !== 'all') sp.append('assigneeId', params.assigneeId);
      if (params.departmentId && params.departmentId !== 'all') sp.append('departmentId', params.departmentId);
      if (params.status && params.status !== 'all') sp.append('status', params.status);
      queryParams = sp.toString();
    }
    return fetchJson<{
      announcements: Announcement[];
      events: CalendarEvent[];
      plans: Plan[];
      tasks: Task[];
      reports: Report[];
      documents: DocumentItem[];
    }>(`/api/search?${queryParams}`);
  },

  // File Upload
  uploadFile: (fileData: { name: string; size: number; type: string; data?: string }) =>
    fetchJson<Attachment>('/api/files/upload', {
      method: 'POST',
      body: JSON.stringify(fileData),
    }),
};

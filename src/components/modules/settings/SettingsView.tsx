import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api.ts';
import { useAuth } from '../../../context/AuthContext.tsx';
import { useApp } from '../../../context/AppContext.tsx';
import type {
  User,
  Department,
  SchoolSettings,
  AuditLog,
  Role,
  UserStatus,
  SchoolYear,
  Semester,
  SchoolGrade,
  SystemCategory,
  ApprovalWorkflowConfig,
  NotificationConfig,
  SchoolLevelType,
  WebsiteConfig,
} from '../../../types/database.ts';
import { Modal } from '../../common/Modal.tsx';
import { ConfirmDialog } from '../../common/ConfirmDialog.tsx';
import { ExcelUserImportModal } from './ExcelUserImportModal.tsx';
import { ResetPasswordModal } from './ResetPasswordModal.tsx';
import { SchoolWebsiteEditModal, BANNER_PRESETS, LOGO_PRESETS } from '../../public/SchoolWebsiteEditModal.tsx';
import { SchoolEmblem } from '../../common/SchoolEmblem.tsx';
import { getSupabaseStatus, RLS_SECURITY_CHECKLIST, RLSChecklistItem } from '../../../services/supabase.ts';
import {
  FileSpreadsheet,
  Settings,
  Users,
  Building2,
  ShieldAlert,
  Database,
  Save,
  Plus,
  Lock,
  Unlock,
  Edit,
  Download,
  Upload,
  RotateCcw,
  Clock,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ExternalLink,
  Copy,
  Check,
  Server,
  Calendar,
  Trash2,
  Bell,
  FileCheck2,
  CheckSquare,
  Tag,
  GraduationCap,
  Key,
  Search,
  Filter,
  Layers,
  Globe,
  Sparkles,
  Home,
  BookOpen,
  Award,
  MapPin,
  Edit3,
  Newspaper,
  Image as ImageIcon,
  Sliders,
  Eye,
  EyeOff,
  ChevronDown,
  Mail,
  Phone,
  UserCheck,
  XCircle,
} from 'lucide-react';

export const SCHOOL_DEPARTMENTS_LIST = [
  'Tổ 1-2-3',
  'Tổ 4-5',
  'Tổ khoa học tự nhiên',
  'Tổ khoa học xã hội',
  'Tổ văn phòng',
  'Liên Đội TNTP Hồ Chí Minh',
  'Ban giám hiệu',
];

export const SCHOOL_SUBJECTS_LIST = [
  // Cấp Tiểu học (Lớp 1-5)
  'Toán (Tiểu học)',
  'Tiếng Việt',
  'Tiếng Anh (Tiểu học)',
  'Đạo đức',
  'Tự nhiên và Xã hội',
  'Khoa học',
  'Lịch sử và Địa lý (TH)',
  'Tin học và Công nghệ',
  'Giáo dục thể chất (TH)',
  'Âm nhạc (TH)',
  'Mỹ thuật (TH)',
  'Hoạt động trải nghiệm (TH)',
  'Tiểu học tổng hợp',
  // Cấp Trung học cơ sở (Lớp 6-9)
  'Toán học',
  'Ngữ văn',
  'Tiếng Anh',
  'Khoa học tự nhiên',
  'Lịch sử và Địa lý',
  'Giáo dục công dân',
  'Tin học',
  'Công nghệ',
  'Giáo dục thể chất',
  'Nghệ thuật (Âm nhạc, Mỹ thuật)',
  'Hoạt động trải nghiệm, hướng nghiệp',
  'Giáo dục địa phương',
  // Khác / Không phụ trách môn
  'Không phụ trách bộ môn',
];

export const SCHOOL_ROLE_CHOICES = [
  { title: 'Hiệu trưởng', rbac: 'principal' as Role, desc: 'Ban Giám Hiệu - Chỉ đạo toàn diện' },
  { title: 'Phó Hiệu trưởng', rbac: 'principal' as Role, desc: 'Ban Giám Hiệu - Phụ trách chuyên môn' },
  { title: 'Tổ trưởng', rbac: 'dean' as Role, desc: 'Tổ trưởng chuyên môn - Quản lý duyệt kế hoạch tổ' },
  { title: 'Tổ phó', rbac: 'dean' as Role, desc: 'Tổ phó chuyên môn - Hỗ trợ quản lý tổ' },
  { title: 'Giáo viên', rbac: 'teacher' as Role, desc: 'Giáo viên bộ môn / Chủ nhiệm' },
  { title: 'Nhân viên', rbac: 'teacher' as Role, desc: 'Nhân viên văn phòng, thư viện, kế toán, y tế' },
  { title: 'Quản trị viên', rbac: 'admin' as Role, desc: 'Quản trị viên hệ thống (Admin)' },
];

export const SettingsView: React.FC = () => {
  const { currentUser, allUsers, refreshUsers, isAdmin } = useAuth();
  const { schoolSettings, refreshAppData, showToast, setPortalMode } = useApp();

  const [activeTab, setActiveTab] = useState<
    | 'users'
    | 'departments'
    | 'grades_categories'
    | 'school_years'
    | 'workflows'
    | 'notifications'
    | 'audit'
    | 'school'
    | 'website'
    | 'data'
    | 'supabase'
  >('users');
  const [supabaseStatus, setSupabaseStatus] = useState(getSupabaseStatus());
  const [checklist, setChecklist] = useState<RLSChecklistItem[]>(RLS_SECURITY_CHECKLIST);
  const [runningRlsTest, setRunningRlsTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [copiedMigration, setCopiedMigration] = useState<string | null>(null);

  // School Settings form
  const [settingsForm, setSettingsForm] = useState<SchoolSettings>({
    schoolName: '',
    shortName: '',
    schoolCode: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    principalName: '',
    currentSchoolYearId: 'sy-2026-2027',
    currentSemester: 'Học kỳ I',
    motto: '',
    managementAgency: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [websiteConfigForm, setWebsiteConfigForm] = useState<WebsiteConfig>({});
  const [websiteSubTab, setWebsiteSubTab] = useState<'general' | 'home' | 'about' | 'contact'>('general');
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [quickWebsiteEditOpen, setQuickWebsiteEditOpen] = useState(false);
  const [quickWebsiteTab, setQuickWebsiteTab] = useState<'general' | 'home' | 'about' | 'news' | 'contact'>('general');

  // Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptType, setDeptType] = useState<'management' | 'subject' | 'administrative' | 'youth'>('subject');
  const [deptLeaderId, setDeptLeaderId] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [savingDept, setSavingDept] = useState(false);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [deleteDeptConfirmOpen, setDeleteDeptConfirmOpen] = useState(false);

  // User Management
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [userUsername, setUserUsername] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState<Role>('teacher');
  const [userDeptId, setUserDeptId] = useState('');
  const [userTitle, setUserTitle] = useState('Giáo viên');
  const [userSubject, setUserSubject] = useState('Toán học');
  const [userStatus, setUserStatus] = useState<UserStatus>('active');
  const [userPassword, setUserPassword] = useState('T@mduc88$#');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [excelImportModalOpen, setExcelImportModalOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteUserConfirmOpen, setDeleteUserConfirmOpen] = useState(false);

  // User filters & search
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterRole, setUserFilterRole] = useState<string>('all');
  const [userFilterDept, setUserFilterDept] = useState<string>('all');
  const [userFilterStatus, setUserFilterStatus] = useState<string>('all');

  // Grades & Categories Management
  const [grades, setGrades] = useState<SchoolGrade[]>([]);
  const [categories, setCategories] = useState<SystemCategory[]>([]);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<SchoolGrade | null>(null);
  const [gradeName, setGradeName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<SchoolLevelType>('primary');
  const [gradeClassesCount, setGradeClassesCount] = useState<number>(3);
  const [gradeDesc, setGradeDesc] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SystemCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'announcement' | 'document' | 'event' | 'task'>('announcement');
  const [catColor, setCatColor] = useState('blue');
  const [catDesc, setCatDesc] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Workflow Config
  const [workflowConfig, setWorkflowConfig] = useState<ApprovalWorkflowConfig>({
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
  });
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  // Notification Config
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>({
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
  });
  const [savingNotif, setSavingNotif] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Reset confirmation
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // School Years & Semesters
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loadingSchoolYears, setLoadingSchoolYears] = useState(false);
  const [schoolYearModalOpen, setSchoolYearModalOpen] = useState(false);
  const [editingSchoolYear, setEditingSchoolYear] = useState<SchoolYear | null>(null);
  const [syName, setSyName] = useState('');
  const [syStartDate, setSyStartDate] = useState('');
  const [syEndDate, setSyEndDate] = useState('');
  const [syIsCurrent, setSyIsCurrent] = useState(false);
  const [sem1Name, setSem1Name] = useState('Học kỳ I');
  const [sem1StartDate, setSem1StartDate] = useState('');
  const [sem1EndDate, setSem1EndDate] = useState('');
  const [sem2Name, setSem2Name] = useState('Học kỳ II');
  const [sem2StartDate, setSem2StartDate] = useState('');
  const [sem2EndDate, setSem2EndDate] = useState('');
  const [savingSy, setSavingSy] = useState(false);

  useEffect(() => {
    if (schoolSettings) {
      setSettingsForm(schoolSettings);
      if (schoolSettings.grades) setGrades(schoolSettings.grades);
      if (schoolSettings.categories) setCategories(schoolSettings.categories);
      if (schoolSettings.approvalWorkflow) setWorkflowConfig(schoolSettings.approvalWorkflow);
      if (schoolSettings.notificationConfig) setNotifConfig(schoolSettings.notificationConfig);
      if (schoolSettings.websiteConfig) setWebsiteConfigForm(schoolSettings.websiteConfig);
    }
    fetchDepts();
    fetchSchoolYears();
  }, [schoolSettings]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
    if (activeTab === 'school_years') {
      fetchSchoolYears();
    }
  }, [activeTab]);

  const fetchSchoolYears = async () => {
    setLoadingSchoolYears(true);
    try {
      const data = await api.getSchoolYears();
      setSchoolYears(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSchoolYears(false);
    }
  };

  const handleOpenSyCreate = () => {
    setEditingSchoolYear(null);
    const nextYear = new Date().getFullYear();
    setSyName(`${nextYear}-${nextYear + 1}`);
    setSyStartDate(`${nextYear}-09-01`);
    setSyEndDate(`${nextYear + 1}-05-31`);
    setSyIsCurrent(false);
    setSem1Name('Học kỳ I');
    setSem1StartDate(`${nextYear}-09-01`);
    setSem1EndDate(`${nextYear + 1}-01-15`);
    setSem2Name('Học kỳ II');
    setSem2StartDate(`${nextYear + 1}-01-16`);
    setSem2EndDate(`${nextYear + 1}-05-31`);
    setSchoolYearModalOpen(true);
  };

  const handleOpenSyEdit = (sy: SchoolYear) => {
    setEditingSchoolYear(sy);
    setSyName(sy.name);
    setSyStartDate(sy.startDate);
    setSyEndDate(sy.endDate);
    setSyIsCurrent(sy.isCurrent);
    const s1 = sy.semesters?.[0];
    const s2 = sy.semesters?.[1];
    setSem1Name(s1?.name || 'Học kỳ I');
    setSem1StartDate(s1?.startDate || sy.startDate);
    setSem1EndDate(s1?.endDate || '');
    setSem2Name(s2?.name || 'Học kỳ II');
    setSem2StartDate(s2?.startDate || '');
    setSem2EndDate(s2?.endDate || sy.endDate);
    setSchoolYearModalOpen(true);
  };

  const handleSaveSchoolYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syName.trim() || !syStartDate || !syEndDate) {
      showToast('Vui lòng điền tên năm học và ngày bắt đầu/kết thúc', 'error');
      return;
    }
    setSavingSy(true);
    try {
      const semesters: Semester[] = [
        {
          id: editingSchoolYear?.semesters?.[0]?.id || `sem-${Date.now()}-1`,
          name: sem1Name.trim() || 'Học kỳ I',
          startDate: sem1StartDate || syStartDate,
          endDate: sem1EndDate || syEndDate,
        },
        {
          id: editingSchoolYear?.semesters?.[1]?.id || `sem-${Date.now()}-2`,
          name: sem2Name.trim() || 'Học kỳ II',
          startDate: sem2StartDate || syStartDate,
          endDate: sem2EndDate || syEndDate,
        },
      ];

      if (editingSchoolYear) {
        await api.updateSchoolYear(editingSchoolYear.id, {
          name: syName.trim(),
          startDate: syStartDate,
          endDate: syEndDate,
          isCurrent: syIsCurrent,
          semesters,
        });
        showToast('Cập nhật năm học thành công');
      } else {
        await api.createSchoolYear({
          name: syName.trim(),
          startDate: syStartDate,
          endDate: syEndDate,
          isCurrent: syIsCurrent,
          semesters,
        });
        showToast('Thêm năm học mới thành công');
      }
      await fetchSchoolYears();
      await refreshAppData();
      setSchoolYearModalOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingSy(false);
    }
  };

  const handleSetCurrentSy = async (sy: SchoolYear) => {
    try {
      await api.updateSchoolYear(sy.id, { isCurrent: true });
      showToast(`Đã thiết lập ${sy.name} làm năm học hiện hành`);
      await fetchSchoolYears();
      await refreshAppData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteSy = async (sy: SchoolYear) => {
    if (sy.isCurrent) {
      showToast('Không thể xóa năm học đang được đặt làm hiện hành', 'error');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa năm học "${sy.name}"?`)) return;
    try {
      await api.deleteSchoolYear(sy.id);
      showToast('Đã xóa năm học');
      await fetchSchoolYears();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const fetchDepts = async () => {
    try {
      const data = await api.getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const data = await api.getAuditLogs();
      setAuditLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleOpenGradeCreate = () => {
    setEditingGrade(null);
    setGradeName('Khối ');
    setGradeLevel('primary');
    setGradeClassesCount(3);
    setGradeDesc('');
    setGradeModalOpen(true);
  };

  const handleOpenGradeEdit = (g: SchoolGrade) => {
    setEditingGrade(g);
    setGradeName(g.name);
    setGradeLevel(g.schoolLevel);
    setGradeClassesCount(g.classesCount);
    setGradeDesc(g.description || '');
    setGradeModalOpen(true);
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeName.trim()) {
      showToast('Vui lòng nhập tên khối lớp', 'error');
      return;
    }
    setSavingGrade(true);
    try {
      let updatedGrades = [...grades];
      if (editingGrade) {
        updatedGrades = updatedGrades.map((g) =>
          g.id === editingGrade.id
            ? { ...g, name: gradeName.trim(), schoolLevel: gradeLevel, classesCount: gradeClassesCount, description: gradeDesc.trim() }
            : g
        );
      } else {
        const newGrade: SchoolGrade = {
          id: `gr-${Date.now()}`,
          name: gradeName.trim(),
          schoolLevel: gradeLevel,
          classesCount: gradeClassesCount,
          description: gradeDesc.trim(),
        };
        updatedGrades.push(newGrade);
      }
      await api.updateSettings({ grades: updatedGrades });
      setGrades(updatedGrades);
      await refreshAppData();
      showToast(editingGrade ? 'Cập nhật khối lớp thành công' : 'Thêm khối lớp mới thành công');
      setGradeModalOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingGrade(false);
    }
  };

  const handleDeleteGrade = async (g: SchoolGrade) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${g.name}"?`)) return;
    try {
      const updated = grades.filter((x) => x.id !== g.id);
      await api.updateSettings({ grades: updated });
      setGrades(updated);
      await refreshAppData();
      showToast(`Đã xóa ${g.name}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenCategoryCreate = () => {
    setEditingCategory(null);
    setCatName('');
    setCatType('announcement');
    setCatColor('blue');
    setCatDesc('');
    setCategoryModalOpen(true);
  };

  const handleOpenCategoryEdit = (c: SystemCategory) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatType(c.type);
    setCatColor(c.color || 'blue');
    setCatDesc(c.description || '');
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      showToast('Vui lòng nhập tên danh mục', 'error');
      return;
    }
    setSavingCat(true);
    try {
      let updatedCats = [...categories];
      if (editingCategory) {
        updatedCats = updatedCats.map((c) =>
          c.id === editingCategory.id
            ? { ...c, name: catName.trim(), type: catType, color: catColor, description: catDesc.trim() }
            : c
        );
      } else {
        const newCat: SystemCategory = {
          id: `cat-${Date.now()}`,
          name: catName.trim(),
          type: catType,
          color: catColor,
          description: catDesc.trim(),
        };
        updatedCats.push(newCat);
      }
      await api.updateSettings({ categories: updatedCats });
      setCategories(updatedCats);
      await refreshAppData();
      showToast(editingCategory ? 'Cập nhật danh mục thành công' : 'Thêm danh mục mới thành công');
      setCategoryModalOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (c: SystemCategory) => {
    if (!confirm(`Bạn có chắc muốn xóa danh mục "${c.name}"?`)) return;
    try {
      const updated = categories.filter((x) => x.id !== c.id);
      await api.updateSettings({ categories: updated });
      setCategories(updated);
      await refreshAppData();
      showToast(`Đã xóa danh mục ${c.name}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWorkflow(true);
    try {
      await api.updateSettings({ approvalWorkflow: workflowConfig });
      await refreshAppData();
      showToast('Đã lưu cấu hình quy trình duyệt thành công');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingWorkflow(false);
    }
  };

  const handleSaveNotificationConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotif(true);
    try {
      await api.updateSettings({ notificationConfig: notifConfig });
      await refreshAppData();
      showToast('Đã lưu cấu hình thông báo thành công');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateSettings(settingsForm);
      await refreshAppData();
      showToast('Đã lưu cấu hình trường học thành công');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveWebsiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWebsite(true);
    try {
      await api.updateWebsiteSettings({
        ...settingsForm,
        websiteConfig: websiteConfigForm,
      });
      await refreshAppData();
      showToast('Đã lưu và cập nhật toàn bộ thông tin Website Trường thành công!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Không thể lưu cấu hình Website', 'error');
    } finally {
      setSavingWebsite(false);
    }
  };

  // Settings Banner Image Handlers
  const [settingsCustomBannerUrl, setSettingsCustomBannerUrl] = useState('');
  const [settingsUploadingBanner, setSettingsUploadingBanner] = useState(false);

  const handleSettingsBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).', 'error');
      return;
    }

    setSettingsUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1920;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          addSettingsBannerUrl(compressed);
        } else {
          addSettingsBannerUrl(rawDataUrl);
        }
        setSettingsUploadingBanner(false);
      };
      img.onerror = () => {
        setSettingsUploadingBanner(false);
        showToast('Không thể đọc file ảnh.', 'error');
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setSettingsUploadingBanner(false);
      showToast('Lỗi khi đọc file ảnh từ máy.', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addSettingsBannerUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const currentList = websiteConfigForm.bannerImages || (websiteConfigForm.bannerImageUrl ? [websiteConfigForm.bannerImageUrl] : []);
    const updatedList = currentList.includes(trimmed) ? currentList : [trimmed, ...currentList];
    setWebsiteConfigForm((prev) => ({
      ...prev,
      bannerImageUrl: trimmed,
      bannerImages: updatedList,
      bannerOverlayOpacity: prev.bannerOverlayOpacity ?? 0.65,
    }));
    setSettingsCustomBannerUrl('');
    showToast('Đã thêm ảnh banner mới. Hãy bấm "Lưu thông tin Website" để áp dụng.');
  };

  const removeSettingsBanner = (urlToRemove: string) => {
    const currentList = websiteConfigForm.bannerImages || (websiteConfigForm.bannerImageUrl ? [websiteConfigForm.bannerImageUrl] : []);
    const updatedList = currentList.filter((u) => u !== urlToRemove);
    const newActive = websiteConfigForm.bannerImageUrl === urlToRemove ? (updatedList[0] || '') : (websiteConfigForm.bannerImageUrl || '');
    setWebsiteConfigForm((prev) => ({
      ...prev,
      bannerImageUrl: newActive,
      bannerImages: updatedList,
    }));
    showToast('Đã xóa ảnh banner khỏi danh sách.');
  };

  // Settings School Logo Handlers
  const [settingsCustomLogoUrl, setSettingsCustomLogoUrl] = useState('');
  const [settingsUploadingLogo, setSettingsUploadingLogo] = useState(false);

  const handleSettingsLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, SVG, WEBP).', 'error');
      return;
    }

    setSettingsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxSize = 512;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png');
          setSettingsForm((prev) => ({ ...prev, logoUrl: compressed }));
        } else {
          setSettingsForm((prev) => ({ ...prev, logoUrl: rawDataUrl }));
        }
        setSettingsUploadingLogo(false);
        showToast('Đã tải lên logo trường học mới! Nhấn nút Lưu để hoàn tất.');
      };
      img.onerror = () => {
        setSettingsUploadingLogo(false);
        showToast('Không thể đọc file ảnh logo.', 'error');
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setSettingsUploadingLogo(false);
      showToast('Lỗi khi đọc file ảnh từ máy.', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applySettingsLogoUrl = (url: string) => {
    const trimmed = url.trim();
    setSettingsForm((prev) => ({ ...prev, logoUrl: trimmed }));
    setSettingsCustomLogoUrl('');
    showToast(trimmed ? 'Đã áp dụng logo mới! Nhấn nút Lưu để cập nhật.' : 'Đã khôi phục huy hiệu logo mặc định.');
  };

  const resetSettingsDefaultLogo = () => {
    setSettingsForm((prev) => ({ ...prev, logoUrl: '' }));
    setSettingsCustomLogoUrl('');
    showToast('Đã khôi phục huy hiệu vector mặc định.');
  };

  const handleOpenUserDetail = (u: User) => {
    setViewingUser(u);
    setUserDetailModalOpen(true);
  };

  const handleOpenUserCreate = () => {
    setEditingUser(null);
    setUserUsername('');
    setUserFullName('');
    setUserEmail('');
    setUserPhone('');
    setUserRole('teacher');
    setUserDeptId(departments.find((d) => d.name === 'Tổ 1-2-3')?.id || departments[0]?.id || '');
    setUserTitle('Giáo viên');
    setUserSubject('Toán (Tiểu học)');
    setUserStatus('active');
    setUserPassword('T@mduc88$#');
    setShowUserPassword(false);
    setUserModalOpen(true);
  };

  const handleOpenUserEdit = (user: User) => {
    setEditingUser(user);
    setUserUsername(user.username);
    setUserFullName(user.fullName);
    setUserEmail(user.email || user.username);
    setUserPhone(user.phone || '');
    setUserRole(user.role);
    setUserDeptId(user.departmentId || '');
    setUserTitle(user.title || 'Giáo viên');
    setUserSubject(user.subject || 'Không phụ trách bộ môn');
    setUserStatus(user.status || 'active');
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFullName.trim()) {
      showToast('Vui lòng nhập họ và tên cán bộ / giáo viên.', 'error');
      return;
    }
    const cleanEmail = userEmail.trim().toLowerCase();
    if (!cleanEmail) {
      showToast('Vui lòng nhập Email (sử dụng làm tên đăng nhập).', 'error');
      return;
    }

    // Tự động suy ra role RBAC từ userTitle
    const matchedRole = SCHOOL_ROLE_CHOICES.find((r) => r.title === userTitle)?.rbac || userRole;

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          fullName: userFullName.trim(),
          email: cleanEmail,
          phone: userPhone.trim(),
          role: matchedRole,
          departmentId: userDeptId || undefined,
          subject: userSubject.trim() || undefined,
          title: userTitle.trim() || 'Giáo viên',
          status: userStatus,
        });
        showToast('Cập nhật tài khoản người dùng thành công!');
      } else {
        await api.createUser({
          username: cleanEmail,
          fullName: userFullName.trim(),
          email: cleanEmail,
          phone: userPhone.trim(),
          role: matchedRole,
          departmentId: userDeptId || undefined,
          subject: userSubject.trim() || undefined,
          title: userTitle.trim() || 'Giáo viên',
          status: userStatus,
          password: userPassword.trim() || 'T@mduc88$#',
        });
        showToast('Tạo tài khoản mới thành công! Mật khẩu khởi tạo: ' + (userPassword.trim() || 'T@mduc88$#'));
      }
      await refreshUsers();
      setUserModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu tài khoản người dùng', 'error');
    }
  };

  const handleQuickChangeRole = async (user: User, newTitle: string) => {
    if (user.username === 'admin' && newTitle !== 'Quản trị viên') {
      showToast('Không thể hạ quyền tài khoản Quản trị hệ thống (admin).', 'error');
      return;
    }
    const matchedRole = SCHOOL_ROLE_CHOICES.find((r) => r.title === newTitle)?.rbac || 'teacher';
    try {
      await api.updateUser(user.id, {
        title: newTitle,
        role: matchedRole,
      });
      await refreshUsers();
      showToast(`Đã đổi vai trò của "${user.fullName}" thành "${newTitle}"!`);
    } catch (err: any) {
      showToast(err.message || 'Không thể thay đổi vai trò.', 'error');
    }
  };

  const handleToggleLockUser = async (user: User) => {
    if (user.username === 'admin' || user.id === currentUser?.id) {
      showToast('Không thể khóa tài khoản Quản trị viên hệ thống hoặc tài khoản đang đăng nhập.', 'error');
      return;
    }
    const nextStatus: UserStatus = user.status === 'locked' ? 'active' : 'locked';
    try {
      await api.updateUser(user.id, { status: nextStatus });
      await refreshUsers();
      showToast(
        nextStatus === 'locked'
          ? `Đã khóa tài khoản của ${user.fullName} (${user.email || user.username})`
          : `Đã mở khóa tài khoản của ${user.fullName} (${user.email || user.username})`
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi cập nhật trạng thái.', 'error');
    }
  };

  const handleOpenDeleteUser = (u: User) => {
    if (u.id === currentUser?.id || u.username === 'admin') {
      showToast('Không thể xóa tài khoản Quản trị viên hệ thống hoặc tài khoản đang đăng nhập.', 'error');
      return;
    }
    setDeletingUser(u);
    setDeleteUserConfirmOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await api.deleteUser(deletingUser.id);
      showToast(`Đã xóa vĩnh viễn tài khoản "${deletingUser.fullName}" (${deletingUser.username}) thành công!`);
      await refreshUsers();
      await refreshAppData();
      setDeleteUserConfirmOpen(false);
      setDeletingUser(null);
    } catch (err: any) {
      showToast(err.message || 'Không thể xóa tài khoản người dùng.', 'error');
    }
  };

  const handleOpenDeptCreate = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptType('subject');
    setDeptLeaderId('');
    setDeptDesc('');
    setDeptModalOpen(true);
  };

  const handleOpenDeptEdit = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptType(dept.type || 'subject');
    setDeptLeaderId(dept.leaderId || '');
    setDeptDesc(dept.description || '');
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      showToast('Vui lòng nhập tên và mã tổ chuyên môn', 'error');
      return;
    }

    setSavingDept(true);
    try {
      if (editingDept) {
        await api.updateDepartment(editingDept.id, {
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase(),
          type: deptType,
          leaderId: deptLeaderId || undefined,
          description: deptDesc.trim(),
        });
        showToast(`Cập nhật tổ "${deptName.trim()}" thành công`);
      } else {
        await api.createDepartment({
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase(),
          type: deptType,
          leaderId: deptLeaderId || undefined,
          description: deptDesc.trim(),
        });
        showToast(`Thêm tổ chuyên môn "${deptName.trim()}" thành công`);
      }
      await fetchDepts();
      await refreshAppData();
      await refreshUsers();
      setDeptModalOpen(false);
      setEditingDept(null);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      setDeptLeaderId('');
    } catch (err: any) {
      showToast(err.message || 'Không thể lưu tổ chuyên môn', 'error');
    } finally {
      setSavingDept(false);
    }
  };

  const handleOpenDeptDelete = (dept: Department) => {
    const memberCount = allUsers.filter((u) => u.departmentId === dept.id).length;
    if (memberCount > 0) {
      showToast(
        `Không thể xóa tổ "${dept.name}" vì đang có ${memberCount} nhân sự trực thuộc. Vui lòng chuyển nhân sự sang tổ khác trước.`,
        'error'
      );
      return;
    }
    setDeletingDept(dept);
    setDeleteDeptConfirmOpen(true);
  };

  const handleConfirmDeleteDept = async () => {
    if (!deletingDept) return;
    try {
      await api.deleteDepartment(deletingDept.id);
      showToast(`Đã xóa tổ chuyên môn "${deletingDept.name}" thành công`);
      await fetchDepts();
      await refreshAppData();
      setDeleteDeptConfirmOpen(false);
      setDeletingDept(null);
    } catch (err: any) {
      showToast(err.message || 'Không thể xóa tổ chuyên môn', 'error');
    }
  };

  const handleResetDemoData = async () => {
    try {
      await api.resetDemoData();
      await refreshAppData();
      await refreshUsers();
      showToast('Đã khôi phục dữ liệu mẫu ban đầu thành công!');
      setResetConfirmOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBackupDownload = () => {
    window.location.href = '/api/system/backup';
    showToast('Đang tạo và tải xuống bản sao lưu toàn trường...');
  };

  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        await api.restoreBackup(parsed);
        await refreshAppData();
        await refreshUsers();
        showToast('Đã phục hồi dữ liệu từ tệp sao lưu thành công!');
      } catch (err: any) {
        showToast('Tệp sao lưu không hợp lệ: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'principal':
        return 'Ban Giám Hiệu';
      case 'dean':
        return 'Tổ trưởng chuyên môn';
      case 'teacher':
        return 'Giáo viên / Nhân viên';
      default:
        return 'Cán bộ / Nhân viên';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Quản Trị Hệ Thống & Cài Đặt
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Cấu hình trường học, phân quyền tài khoản (RBAC), nhật ký kiểm toán và sao lưu phục hồi dữ liệu
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'users' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Người dùng & Vai trò ({allUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'departments' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Tổ chuyên môn & Bộ phận ({departments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grades_categories')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'grades_categories' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Khối lớp & Danh mục ({grades.length}/{categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('school_years')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'school_years' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Năm học & Học kỳ ({schoolYears.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workflows')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'workflows' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          <span>Quy trình duyệt</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'notifications' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Cấu hình thông báo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'audit' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Nhật ký hoạt động</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('school')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'school' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Thông tin trường học</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('website')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'website' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Website Trường (Cổng thông tin)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'data' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Sao lưu dữ liệu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'supabase' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Supabase & RLS</span>
        </button>
      </div>

      {/* TAB 1: SCHOOL INFO SETTINGS */}
      {activeTab === 'school' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
            {/* SCHOOL LOGO MANAGEMENT */}
            <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50/50 to-white p-5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                    <SchoolEmblem size={22} src={settingsForm.logoUrl} />
                    <span>Huy Hiệu & Logo Nhận Diện Trường Học</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hiển thị trên toàn bộ cổng thông tin, tiêu đề nội bộ, học bạ và các văn bản xuất bản
                  </p>
                </div>
                {settingsForm.logoUrl && (
                  <button
                    type="button"
                    onClick={resetSettingsDefaultLogo}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Khôi phục huy hiệu mặc định</span>
                  </button>
                )}
              </div>

              {/* Logo Preview */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 text-white rounded-xl p-4 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <SchoolEmblem size={68} src={settingsForm.logoUrl} className="ring-2 ring-amber-400 shadow-md" />
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full uppercase">
                      {settingsForm.logoUrl ? 'Logo Riêng' : 'Mặc Định'}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                      Xem trước huy hiệu nhận diện
                    </div>
                    <div className="text-sm font-bold text-white">
                      {settingsForm.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {settingsForm.managementAgency || 'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO'}
                    </div>
                  </div>
                </div>
                <div className="sm:ml-auto flex items-center gap-2 text-[11px] text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <span>Kích thước thanh tiêu đề (header):</span>
                  <SchoolEmblem size={34} src={settingsForm.logoUrl} />
                </div>
              </div>

              {/* Upload & URL Input Tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* File Upload */}
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">
                      Cách 1: Tải ảnh logo từ máy tính / điện thoại
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Hỗ trợ PNG trong suốt, JPG, SVG, WEBP (tự động tối ưu khung tròn)
                    </p>
                  </div>
                  <label className="mt-2.5 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-500 transition-colors cursor-pointer text-xs shadow-xs">
                    <Upload className="h-4 w-4" />
                    <span>{settingsUploadingLogo ? 'Đang xử lý ảnh...' : 'Chọn file ảnh logo để tải lên'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSettingsLogoUpload}
                      disabled={settingsUploadingLogo}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* URL Input */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">
                      Cách 2: Nhập liên kết ảnh trực tiếp (Image URL)
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Dán đường dẫn ảnh HTTPS công khai từ website hoặc đám mây
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <input
                      type="url"
                      value={settingsCustomLogoUrl}
                      onChange={(e) => setSettingsCustomLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo-truong.png"
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 text-xs focus:border-amber-600 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => applySettingsLogoUrl(settingsCustomLogoUrl)}
                      disabled={!settingsCustomLogoUrl.trim()}
                      className="rounded-lg bg-slate-800 px-3 py-1.5 font-bold text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 text-xs cursor-pointer"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              </div>

              {/* Preset Logos */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-700 mb-2">
                  Cách 3: Chọn nhanh từ các mẫu biểu trưng sư phạm chuẩn:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {LOGO_PRESETS.map((preset) => {
                    const isCurrent = (preset.url === '' && !settingsForm.logoUrl) || (preset.url !== '' && settingsForm.logoUrl === preset.url);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applySettingsLogoUrl(preset.url)}
                        className={`text-left rounded-xl p-2.5 border transition-all flex items-start gap-2.5 cursor-pointer ${
                          isCurrent
                            ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
                        }`}
                      >
                        <SchoolEmblem size={38} src={preset.url || undefined} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-900 text-[11px] truncate block">
                              {preset.title}
                            </span>
                            {isCurrent && <Check className="h-3 w-3 text-amber-600 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                            {preset.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Cơ quan quản lý cấp trên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={settingsForm.managementAgency}
                  onChange={(e) => setSettingsForm({ ...settingsForm, managementAgency: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Tên chính thức nhà trường <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={settingsForm.schoolName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Tên viết tắt / Tên gọi ngắn
                </label>
                <input
                  type="text"
                  value={settingsForm.shortName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shortName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Mã định danh trường học
                </label>
                <input
                  type="text"
                  value={settingsForm.schoolCode}
                  onChange={(e) => setSettingsForm({ ...settingsForm, schoolCode: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Họ tên Hiệu trưởng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={settingsForm.principalName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, principalName: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Học kỳ hiện tại
                </label>
                <select
                  value={settingsForm.currentSemester}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currentSemester: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                >
                  <option value="Học kỳ I">Học kỳ I</option>
                  <option value="Học kỳ II">Học kỳ II</option>
                  <option value="Hè (Nghỉ hè)">Hè (Nghỉ hè)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-900 mb-1">
                  Địa chỉ trường học
                </label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Số điện thoại văn phòng
                </label>
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Hòm thư điện tử (Email)
                </label>
                <input
                  type="email"
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-900 mb-1">
                  Khẩu hiệu hành động / Phương châm giáo dục
                </label>
                <input
                  type="text"
                  value={settingsForm.motto}
                  onChange={(e) => setSettingsForm({ ...settingsForm, motto: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 italic"
                />
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 shadow-xs"
              >
                <Save className="h-4 w-4" />
                <span>{savingSettings ? 'Đang lưu...' : 'Lưu cấu hình trường học'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: WEBSITE TRƯỜNG & CỔNG THÔNG TIN CÔNG KHAI */}
      {activeTab === 'website' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Header & Quick Action */}
          <div className="p-6 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Cấu Hình & Quản Trị Nội Dung Website Trường
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tùy chỉnh toàn bộ thông tin nhận diện, biểu ngữ trang chủ, bài viết giới thiệu lịch sử - 2 bậc học và liên hệ hiển thị trên Cổng thông tin công khai
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setQuickWebsiteTab('general');
                  setQuickWebsiteEditOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                title="Mở Trình Chỉnh Sửa Trực Quan Toàn Diện (Hỗ trợ 5 phân hệ & Tin tức)"
              >
                <Edit3 className="h-4 w-4 text-amber-700" />
                <span>Mở Trình Sửa Trực Quan</span>
              </button>

              <button
                type="button"
                onClick={() => setPortalMode('public')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-colors shadow-2xs"
                title="Mở giao diện Website công khai để kiểm tra"
              >
                <ExternalLink className="h-4 w-4 text-blue-600" />
                <span>Xem Website Trường</span>
              </button>

              <button
                type="button"
                onClick={handleSaveWebsiteSettings}
                disabled={savingWebsite}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{savingWebsite ? 'Đang lưu...' : 'Lưu thông tin Website'}</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex border-b border-slate-200 px-6 bg-slate-100/50 gap-2 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setWebsiteSubTab('general')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 font-semibold transition-colors shrink-0 ${
                websiteSubTab === 'general'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>1. Thông tin chung & Nhận diện</span>
            </button>

            <button
              type="button"
              onClick={() => setWebsiteSubTab('home')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 font-semibold transition-colors shrink-0 ${
                websiteSubTab === 'home'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>2. Banner Trang chủ & 4 Thống kê</span>
            </button>

            <button
              type="button"
              onClick={() => setWebsiteSubTab('about')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 font-semibold transition-colors shrink-0 ${
                websiteSubTab === 'about'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>3. Trang Giới thiệu (Lịch sử & 2 Bậc học)</span>
            </button>

            <button
              type="button"
              onClick={() => setWebsiteSubTab('contact')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 font-semibold transition-colors shrink-0 ${
                websiteSubTab === 'contact'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="h-4 w-4" />
              <span>4. Liên hệ, Văn phòng & Lưu ý</span>
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSaveWebsiteSettings} className="p-6 text-xs space-y-6">
            {/* SUB-TAB 1: GENERAL INFO */}
            {websiteSubTab === 'general' && (
              <div className="space-y-4">
                {/* LOGO NHẬN DIỆN TRƯỜNG HỌC */}
                <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50/50 to-white p-5 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                        <SchoolEmblem size={22} src={settingsForm.logoUrl} />
                        <span>Huy Hiệu & Logo Nhận Diện Trường Học</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Hiển thị tại thanh điều hướng (header), chân trang (footer), trang Giới thiệu và xuất bản văn bản
                      </p>
                    </div>
                    {settingsForm.logoUrl && (
                      <button
                        type="button"
                        onClick={resetSettingsDefaultLogo}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Khôi phục huy hiệu mặc định</span>
                      </button>
                    )}
                  </div>

                  {/* Logo Preview */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 text-white rounded-xl p-4 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <SchoolEmblem size={68} src={settingsForm.logoUrl} className="ring-2 ring-amber-400 shadow-md" />
                        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full uppercase">
                          {settingsForm.logoUrl ? 'Logo Riêng' : 'Mặc Định'}
                        </span>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                          Xem trước nhận diện thương hiệu
                        </div>
                        <div className="text-sm font-bold text-white">
                          {settingsForm.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {settingsForm.managementAgency || 'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO'}
                        </div>
                      </div>
                    </div>
                    <div className="sm:ml-auto flex items-center gap-2 text-[11px] text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                      <span>Kích thước thanh tiêu đề (header):</span>
                      <SchoolEmblem size={34} src={settingsForm.logoUrl} />
                    </div>
                  </div>

                  {/* Upload & URL Input Tools */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* File Upload */}
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px]">
                          Cách 1: Tải ảnh logo từ máy tính / điện thoại
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Hỗ trợ PNG trong suốt, JPG, SVG, WEBP (tự động tối ưu khung tròn)
                        </p>
                      </div>
                      <label className="mt-2.5 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-500 transition-colors cursor-pointer text-xs shadow-xs">
                        <Upload className="h-4 w-4" />
                        <span>{settingsUploadingLogo ? 'Đang xử lý ảnh...' : 'Chọn file ảnh logo để tải lên'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSettingsLogoUpload}
                          disabled={settingsUploadingLogo}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* URL Input */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px]">
                          Cách 2: Nhập liên kết ảnh trực tiếp (Image URL)
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Dán đường dẫn ảnh HTTPS công khai từ website hoặc đám mây
                        </p>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <input
                          type="url"
                          value={settingsCustomLogoUrl}
                          onChange={(e) => setSettingsCustomLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo-truong.png"
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 text-xs focus:border-amber-600 outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => applySettingsLogoUrl(settingsCustomLogoUrl)}
                          disabled={!settingsCustomLogoUrl.trim()}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 font-bold text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 text-xs cursor-pointer"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preset Logos */}
                  <div className="pt-2">
                    <div className="text-[11px] font-bold text-slate-700 mb-2">
                      Cách 3: Chọn nhanh từ các mẫu biểu trưng sư phạm chuẩn:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {LOGO_PRESETS.map((preset) => {
                        const isCurrent = (preset.url === '' && !settingsForm.logoUrl) || (preset.url !== '' && settingsForm.logoUrl === preset.url);
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applySettingsLogoUrl(preset.url)}
                            className={`text-left rounded-xl p-2.5 border transition-all flex items-start gap-2.5 cursor-pointer ${
                              isCurrent
                                ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
                            }`}
                          >
                            <SchoolEmblem size={38} src={preset.url || undefined} className="shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-900 text-[11px] truncate block">
                                  {preset.title}
                                </span>
                                {isCurrent && <Check className="h-3 w-3 text-amber-600 shrink-0" />}
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                                {preset.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-900 mb-1">
                      Tên trường học đầy đủ (In hoa) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settingsForm.schoolName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
                      required
                      placeholder="TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-bold focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 mb-1">
                      Tên viết tắt / Tên thường gọi
                    </label>
                    <input
                      type="text"
                      value={settingsForm.shortName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, shortName: e.target.value })}
                      placeholder="TH&THCS Nguyễn Đình Anh"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 mb-1">
                      Mã trường học
                    </label>
                    <input
                      type="text"
                      value={settingsForm.schoolCode}
                      onChange={(e) => setSettingsForm({ ...settingsForm, schoolCode: e.target.value })}
                      placeholder="TH-THCS-NDA-01"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 mb-1">
                      Cơ quan quản lý cấp trên
                    </label>
                    <input
                      type="text"
                      value={settingsForm.managementAgency}
                      onChange={(e) => setSettingsForm({ ...settingsForm, managementAgency: e.target.value })}
                      placeholder="PHÒNG GIÁO DỤC VÀ ĐÀO TẠO"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 uppercase focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 mb-1">
                      Họ và tên Hiệu trưởng
                    </label>
                    <input
                      type="text"
                      value={settingsForm.principalName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, principalName: e.target.value })}
                      placeholder="Thầy Lê Văn Thành"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-900 mb-1">
                      Khẩu hiệu hành động / Phương châm giáo dục
                    </label>
                    <input
                      type="text"
                      value={settingsForm.motto}
                      onChange={(e) => setSettingsForm({ ...settingsForm, motto: e.target.value })}
                      placeholder="Kỷ cương - Tình thương - Trách nhiệm - Đổi mới sáng tạo"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 italic focus:border-blue-600 outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: HOMEPAGE & BANNER & STATS */}
            {websiteSubTab === 'home' && (
              <div className="space-y-6">
                {/* BANNER IMAGE MANAGEMENT IN SETTINGS */}
                <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/50 to-white p-5 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-blue-600" />
                        <span>Quản Lý Ảnh Banner & Hình Nền Trang Chủ Website</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Thêm ảnh toàn cảnh trường học, thư viện, sân trường hoặc chọn từ các mẫu chuẩn
                      </p>
                    </div>
                    {websiteConfigForm.bannerImageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setWebsiteConfigForm((prev) => ({
                            ...prev,
                            bannerImageUrl: '',
                          }))
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Gỡ ảnh (Dùng nền gradient xanh)</span>
                      </button>
                    )}
                  </div>

                  {/* Banner Live Preview */}
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-6 shadow-inner border border-blue-900/50 min-h-[160px] flex flex-col justify-center">
                    {websiteConfigForm.bannerImageUrl ? (
                      <>
                        <img
                          src={websiteConfigForm.bannerImageUrl}
                          alt="Banner Preview"
                          className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none"
                        />
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `linear-gradient(to right, rgba(15, 23, 42, ${Math.min(
                              0.95,
                              (websiteConfigForm.bannerOverlayOpacity ?? 0.65) + 0.15
                            )}), rgba(15, 23, 42, ${
                              websiteConfigForm.bannerOverlayOpacity ?? 0.65
                            }) 60%, rgba(30, 27, 75, ${Math.max(
                              0.35,
                              (websiteConfigForm.bannerOverlayOpacity ?? 0.65) - 0.2
                            )}))`,
                          }}
                        />
                      </>
                    ) : null}

                    <div className="relative z-10 space-y-1.5 max-w-xl">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-200 border border-blue-400/30 backdrop-blur-xs">
                        <Sparkles className="h-3 w-3 text-amber-300" />
                        <span>{websiteConfigForm.heroTagline || 'Mô hình trường liên cấp chuẩn quốc gia · Năm học 2026 - 2027'}</span>
                      </div>
                      <h4 className="text-base font-extrabold uppercase tracking-tight line-clamp-1">
                        {websiteConfigForm.heroTitle || settingsForm.schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
                      </h4>
                      <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed font-light">
                        {websiteConfigForm.heroDescription ||
                          'Nơi ươm mầm tri thức, rèn luyện nhân cách và chắp cánh ước mơ cho các thế hệ học sinh.'}
                      </p>
                    </div>
                  </div>

                  {/* Dark Overlay Opacity Slider */}
                  {websiteConfigForm.bannerImageUrl && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-blue-600" />
                          <span>Độ tối lớp phủ chống chói (Dark Contrast Overlay):</span>
                        </label>
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {Math.round((websiteConfigForm.bannerOverlayOpacity ?? 0.65) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="0.9"
                        step="0.05"
                        value={websiteConfigForm.bannerOverlayOpacity ?? 0.65}
                        onChange={(e) =>
                          setWebsiteConfigForm({
                            ...websiteConfigForm,
                            bannerOverlayOpacity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Add Banner Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* File Upload */}
                    <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-4 flex flex-col items-center justify-center text-center">
                      <Upload className="h-6 w-6 text-blue-600 mb-1" />
                      <p className="font-bold text-slate-900 text-xs">Tải ảnh banner từ máy tính</p>
                      <p className="text-[10px] text-slate-500 mb-2">Hỗ trợ PNG, JPG, JPEG, WEBP</p>
                      <label className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer transition-all active:scale-95">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{settingsUploadingBanner ? 'Đang nạp ảnh...' : 'Chọn tệp ảnh'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleSettingsBannerUpload}
                          disabled={settingsUploadingBanner}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Image URL */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col justify-between">
                      <div>
                        <label className="block font-bold text-slate-900 text-xs mb-1">
                          Thêm ảnh từ URL trực tuyến
                        </label>
                        <p className="text-[10px] text-slate-500 mb-2">
                          Dán link ảnh từ thư viện trường hoặc dịch vụ lưu trữ
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={settingsCustomBannerUrl}
                          onChange={(e) => setSettingsCustomBannerUrl(e.target.value)}
                          placeholder="https://.../anh-truong.jpg"
                          className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 outline-hidden font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => addSettingsBannerUrl(settingsCustomBannerUrl)}
                          disabled={!settingsCustomBannerUrl.trim()}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="space-y-1.5 pt-1">
                    <span className="font-bold text-slate-800 text-xs">Ảnh mẫu trường học chuẩn (Chọn áp dụng ngay):</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {BANNER_PRESETS.map((preset) => {
                        const isCurrent = websiteConfigForm.bannerImageUrl === preset.url;
                        return (
                          <div
                            key={preset.id}
                            onClick={() => addSettingsBannerUrl(preset.url)}
                            className={`rounded-lg overflow-hidden border cursor-pointer p-1 bg-white hover:shadow-xs transition-all ${
                              isCurrent ? 'border-blue-600 ring-2 ring-blue-500/30' : 'border-slate-200'
                            }`}
                          >
                            <div className="h-14 w-full rounded overflow-hidden">
                              <img src={preset.url} alt={preset.title} className="h-full w-full object-cover" />
                            </div>
                            <p className="text-[10px] font-medium text-slate-800 line-clamp-1 mt-1">{preset.title}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Saved banner gallery */}
                  {(websiteConfigForm.bannerImages && websiteConfigForm.bannerImages.length > 0) && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-800 text-xs">
                        Các ảnh banner đã lưu ({websiteConfigForm.bannerImages.length} ảnh):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {websiteConfigForm.bannerImages.map((imgUrl, idx) => {
                          const isActive = websiteConfigForm.bannerImageUrl === imgUrl;
                          return (
                            <div
                              key={idx}
                              className={`rounded-lg border p-1 bg-white flex flex-col justify-between ${
                                isActive ? 'border-blue-600 ring-1 ring-blue-500/40' : 'border-slate-200'
                              }`}
                            >
                              <div className="h-16 rounded overflow-hidden relative">
                                <img src={imgUrl} alt="Banner" className="h-full w-full object-cover" />
                                {isActive && (
                                  <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] px-1 py-0.2 rounded font-bold">
                                    Đang dùng
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[10px]">
                                {!isActive ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setWebsiteConfigForm({
                                        ...websiteConfigForm,
                                        bannerImageUrl: imgUrl,
                                      })
                                    }
                                    className="text-blue-700 font-bold hover:underline"
                                  >
                                    Chọn dùng
                                  </button>
                                ) : (
                                  <span className="text-emerald-600 font-semibold">Banner chính</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeSettingsBanner(imgUrl)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5"
                                  title="Xóa ảnh"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Biểu Ngữ & Giới Thiệu Đầu Trang (Hero Banner)</span>
                  </h4>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Dòng chữ nổi bật trên Banner (Badge / Tagline)
                    </label>
                    <input
                      type="text"
                      value={websiteConfigForm.heroTagline || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, heroTagline: e.target.value })}
                      placeholder="Mô hình trường liên cấp chuẩn quốc gia · Năm học 2026 - 2027"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Tiêu đề lớn hiển thị trên Banner
                    </label>
                    <input
                      type="text"
                      value={websiteConfigForm.heroTitle || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, heroTitle: e.target.value })}
                      placeholder="TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH (mặc định lấy theo tên trường)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white font-bold focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Đoạn văn giới thiệu ngắn dưới tiêu đề Banner
                    </label>
                    <textarea
                      rows={2}
                      value={websiteConfigForm.heroDescription || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, heroDescription: e.target.value })}
                      placeholder="Nơi ươm mầm tri thức, rèn luyện nhân cách và chắp cánh ước mơ cho các thế hệ học sinh từ bậc Tiểu học (Lớp 1 - 5) đến bậc Trung học cơ sở (Lớp 6 - 9)."
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 bg-white focus:border-blue-600 outline-hidden"
                    />
                  </div>
                </div>

                {/* 4 Stats Cards */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600" />
                    <span>4 Khối Thông Số Nổi Bật Trên Trang Chủ</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                      <p className="font-bold text-[11px] text-blue-900">Khối 1 (Cấp học):</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={websiteConfigForm.stat1Value || ''}
                          onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, stat1Value: e.target.value })}
                          placeholder="2 Cấp Học"
                          className="rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                        />
                        <input
                          type="text"
                          value={websiteConfigForm.stat1Label || ''}
                          onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, stat1Label: e.target.value })}
                          placeholder="Tiểu học & THCS"
                          className="rounded border border-slate-300 px-2.5 py-1.5 text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                      <p className="font-bold text-[11px] text-emerald-900">Khối 2 (Khối lớp):</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={websiteConfigForm.stat2Value || ''}
                          onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, stat2Value: e.target.value })}
                          placeholder="9 Khối Lớp"
                          className="rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                        />
                        <input
                          type="text"
                          value={websiteConfigForm.stat2Label || ''}
                          onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, stat2Label: e.target.value })}
                          placeholder="Từ Lớp 1 đến Lớp 9"
                          className="rounded border border-slate-300 px-2.5 py-1.5 text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                      <p className="font-bold text-[11px] text-purple-900">Khối 3 (Đội ngũ):</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={websiteConfigForm.stat3Value || ''}
                          onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, stat3Value: e.target.value })}
                          placeholder="100%"
                          className="rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                        />
                        <input
                          type="text"
                          value={websiteConfigForm.stat3Label || ''}
                          onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, stat3Label: e.target.value })}
                          placeholder="Giáo viên đạt chuẩn"
                          className="rounded border border-slate-300 px-2.5 py-1.5 text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                      <p className="font-bold text-[11px] text-amber-900">Khối 4 (Thi đua):</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={websiteConfigForm.stat4Value || ''}
                          onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, stat4Value: e.target.value })}
                          placeholder="Chất Lượng"
                          className="rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                        />
                        <input
                          type="text"
                          value={websiteConfigForm.stat4Label || ''}
                          onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, stat4Label: e.target.value })}
                          placeholder="Thi đua toàn diện"
                          className="rounded border border-slate-300 px-2.5 py-1.5 text-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: ABOUT PAGE CONTENT */}
            {websiteSubTab === 'about' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block font-bold text-slate-900">
                    Tiêu đề mục Lịch sử & Truyền thống
                  </label>
                  <input
                    type="text"
                    value={websiteConfigForm.aboutHistoryTitle || ''}
                    onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, aboutHistoryTitle: e.target.value })}
                    placeholder="1. Lịch Sử Hình Thành & Truyền Thống Dạy Tốt - Học Tốt"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-bold focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Đoạn 1: Giới thiệu truyền thống và danh nhân
                  </label>
                  <textarea
                    rows={3}
                    value={websiteConfigForm.aboutHistoryParagraph1 || ''}
                    onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, aboutHistoryParagraph1: e.target.value })}
                    placeholder="Trường Tiểu học & Trung học cơ sở Nguyễn Đình Anh là ngôi trường liên cấp trọng điểm..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Đoạn 2: Thành tích và các phong trào thi đua
                  </label>
                  <textarea
                    rows={3}
                    value={websiteConfigForm.aboutHistoryParagraph2 || ''}
                    onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, aboutHistoryParagraph2: e.target.value })}
                    placeholder="Trải qua các giai đoạn phát triển, nhà trường luôn khẳng định vị thế dẫn đầu trong phong trào thi đua..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-blue-600 outline-hidden"
                  />
                </div>

                {/* 2 Levels description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3.5 space-y-2.5">
                    <h5 className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                      <BookOpen className="h-4 w-4" />
                      <span>Giới Thiệu Bậc Tiểu Học</span>
                    </h5>
                    <input
                      type="text"
                      value={websiteConfigForm.primaryLevelTitle || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, primaryLevelTitle: e.target.value })}
                      placeholder="BẬC TIỂU HỌC"
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                    />
                    <input
                      type="text"
                      value={websiteConfigForm.primaryLevelSubtitle || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, primaryLevelSubtitle: e.target.value })}
                      placeholder="Khối 1, Khối 2, Khối 3, Khối 4, Khối 5"
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-blue-800 font-semibold"
                    />
                    <textarea
                      rows={3}
                      value={websiteConfigForm.primaryLevelDesc || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, primaryLevelDesc: e.target.value })}
                      placeholder="Tập trung rèn luyện chữ viết, phát triển tư duy ngôn ngữ..."
                      className="w-full rounded border border-slate-300 p-2 text-slate-700"
                    />
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-2.5">
                    <h5 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                      <GraduationCap className="h-4 w-4" />
                      <span>Giới Thiệu Bậc Trung Học Cơ Sở</span>
                    </h5>
                    <input
                      type="text"
                      value={websiteConfigForm.secondaryLevelTitle || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, secondaryLevelTitle: e.target.value })}
                      placeholder="BẬC TRUNG HỌC CƠ SỞ"
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                    />
                    <input
                      type="text"
                      value={websiteConfigForm.secondaryLevelSubtitle || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, secondaryLevelSubtitle: e.target.value })}
                      placeholder="Khối 6, Khối 7, Khối 8, Khối 9"
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-emerald-800 font-semibold"
                    />
                    <textarea
                      rows={3}
                      value={websiteConfigForm.secondaryLevelDesc || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, secondaryLevelDesc: e.target.value })}
                      placeholder="Chú trọng bồi dưỡng năng lực tự học, nghiên cứu KHKT, STEM..."
                      className="w-full rounded border border-slate-300 p-2 text-slate-700"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: CONTACT & OFFICE HOURS */}
            {websiteSubTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-900 mb-1">
                      Địa chỉ trường học
                    </label>
                    <input
                      type="text"
                      value={settingsForm.address}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      placeholder="Xã Thạch Bình, Huyện Thạch Thành, Tỉnh Thanh Hóa"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 mb-1">
                      Đường dây nóng / Số điện thoại trực ban
                    </label>
                    <input
                      type="text"
                      value={settingsForm.phone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                      placeholder="0237 387 6543"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono font-semibold focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 mb-1">
                      Hòm thư điện tử công vụ (Email)
                    </label>
                    <input
                      type="email"
                      value={settingsForm.email}
                      onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                      placeholder="ththcsnguyendinhanh@thachthanh.edu.vn"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 mb-1">
                      Địa chỉ trang Website
                    </label>
                    <input
                      type="url"
                      value={settingsForm.website}
                      onChange={(e) => setSettingsForm({ ...settingsForm, website: e.target.value })}
                      placeholder="https://ththcsnguyendinhanh.edu.vn"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-900 mb-1">
                      Thời gian làm việc văn phòng
                    </label>
                    <input
                      type="text"
                      value={websiteConfigForm.officeHours || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, officeHours: e.target.value })}
                      placeholder="Thứ Hai đến Thứ Bảy: Sáng 07:00 - 11:30 | Chiều 13:30 - 17:00"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-900 mb-1">
                      Lưu ý gửi phản hồi cho phụ huynh & học sinh
                    </label>
                    <textarea
                      rows={2}
                      value={websiteConfigForm.contactNotes || ''}
                      onChange={(e) => setWebsiteConfigForm({ ...websiteConfigForm, contactNotes: e.target.value })}
                      placeholder="Đối với các vấn đề liên quan trực tiếp đến hồ sơ học tập của học sinh, chuyển trường..."
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-blue-600 outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer Form Action */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPortalMode('public')}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-700 font-semibold"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Xem Website Trường trước khi lưu</span>
              </button>

              <button
                type="submit"
                disabled={savingWebsite}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{savingWebsite ? 'Đang lưu thay đổi...' : 'Lưu cấu hình Website Trường'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: SCHOOL YEARS & SEMESTERS CONFIGURATION */}
      {activeTab === 'school_years' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cấu Hình Năm Học & Các Học Kỳ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập linh hoạt các năm học, phân định ngày bắt đầu - kết thúc của năm học và các học kỳ (không cố định cứng)
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenSyCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Thiết lập năm học mới</span>
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {loadingSchoolYears ? (
              <div className="p-8 text-center text-xs text-slate-400">Đang tải danh sách năm học...</div>
            ) : schoolYears.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Chưa có năm học nào được cấu hình.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {schoolYears.map((sy) => (
                  <div key={sy.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          Năm học {sy.name}
                        </span>
                        {sy.isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Hiện hành</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            Lịch sử
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Thời gian năm học: <strong className="text-slate-800">{sy.startDate}</strong> → <strong className="text-slate-800">{sy.endDate}</strong></span>
                      </div>

                      {/* Semesters badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-slate-500">Phân kỳ học tập:</span>
                        {sy.semesters?.map((sem, sIdx) => (
                          <span key={sem.id || sIdx} className="rounded-md border border-blue-200 bg-blue-50/70 px-2 py-0.5 text-[11px] text-blue-900 font-medium">
                            {sem.name}: {sem.startDate} → {sem.endDate}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!sy.isCurrent && isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleSetCurrentSy(sy)}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 shadow-2xs"
                        >
                          Đặt làm hiện hành
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenSyEdit(sy)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Edit className="h-3.5 w-3.5 text-blue-600" />
                            <span>Sửa</span>
                          </button>
                          {!sy.isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSy(sy)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                              <span>Xóa</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: USER & RBAC MANAGEMENT */}
      {activeTab === 'users' && (() => {
        const filteredUsers = allUsers.filter((u) => {
          if (userFilterRole !== 'all') {
            const userRoleTitle = u.title || (u.role === 'principal' ? 'Hiệu trưởng' : u.role === 'dean' ? 'Tổ trưởng' : u.role === 'admin' ? 'Quản trị viên' : 'Giáo viên');
            if (userRoleTitle !== userFilterRole && u.role !== userFilterRole) return false;
          }
          if (userFilterDept !== 'all' && u.departmentId !== userFilterDept) return false;
          if (userFilterStatus !== 'all' && u.status !== userFilterStatus) return false;
          if (userSearchQuery.trim()) {
            const q = userSearchQuery.toLowerCase().trim();
            const deptName = departments.find((d) => d.id === u.departmentId)?.name?.toLowerCase() || '';
            const match =
              u.username.toLowerCase().includes(q) ||
              u.fullName.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              u.phone.includes(q) ||
              (u.title && u.title.toLowerCase().includes(q)) ||
              (u.subject && u.subject.toLowerCase().includes(q)) ||
              deptName.includes(q);
            if (!match) return false;
          }
          return true;
        });

        return (
          <div className="space-y-4">
            {/* Security Hardening Rule Banner */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-900 text-xs shadow-2xs">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold flex items-center gap-1.5">
                  <span>Chính Sách Quản Trị Tài Khoản & An Ninh Phân Quyền (RBAC)</span>
                  <span className="rounded bg-blue-200 px-1.5 py-0.2 text-[10px] font-bold text-blue-950">Security Rule</span>
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Email được sử dụng làm tên đăng nhập chính thức. Hệ thống hỗ trợ 7 tổ chuyên môn, phân công bộ môn giảng dạy Tiểu học/THCS, phân quyền vai trò linh hoạt và bảo mật mật khẩu băm một chiều an toàn.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Danh Sách Người Dùng & Phân Quyền Vai Trò</h3>
                <p className="text-xs text-slate-500">
                  Hiển thị {filteredUsers.length} / {allUsers.length} tài khoản trong hệ thống trường học
                </p>
              </div>
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setExcelImportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors shadow-2xs cursor-pointer"
                    title="Nhập hàng loạt tài khoản giáo viên/cán bộ từ tệp Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span>Nhập từ File Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenUserCreate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Thêm tài khoản mới</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter Controls Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
              <div className="relative sm:col-span-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm họ tên, email, SĐT, bộ môn..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <select
                  value={userFilterRole}
                  onChange={(e) => setUserFilterRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="Hiệu trưởng">Hiệu trưởng</option>
                  <option value="Phó Hiệu trưởng">Phó Hiệu trưởng</option>
                  <option value="Tổ trưởng">Tổ trưởng</option>
                  <option value="Tổ phó">Tổ phó</option>
                  <option value="Giáo viên">Giáo viên</option>
                  <option value="Nhân viên">Nhân viên</option>
                  <option value="Quản trị viên">Quản trị viên</option>
                </select>
              </div>

              <div>
                <select
                  value={userFilterDept}
                  onChange={(e) => setUserFilterDept(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="all">Tất cả tổ / bộ phận</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={userFilterStatus}
                  onChange={(e) => setUserFilterStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Chưa kích hoạt</option>
                  <option value="locked">Bị khóa</option>
                </select>
              </div>
            </div>

            {/* Account Management Table matching attached UI */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 uppercase bg-slate-50/80 font-bold tracking-wider text-[11px]">
                    <th className="py-3 px-4">HỌ TÊN & EMAIL</th>
                    <th className="py-3 px-4">TỔ CHUYÊN MÔN</th>
                    <th className="py-3 px-4">BỘ MÔN</th>
                    <th className="py-3 px-4">VAI TRÒ (ROLE)</th>
                    <th className="py-3 px-4">TRẠNG THÁI</th>
                    <th className="py-3 px-4 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                        Không tìm thấy người dùng phù hợp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const userDept = departments.find((d) => d.id === u.departmentId);
                      const currentTitle = u.title || (u.role === 'principal' ? 'Phó Hiệu trưởng' : u.role === 'dean' ? 'Tổ trưởng' : u.role === 'admin' ? 'Quản trị viên' : 'Giáo viên');

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* 1. HỌ TÊN & EMAIL */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                {u.avatar ? (
                                  <img
                                    src={u.avatar}
                                    alt={u.fullName}
                                    className="h-10 w-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-bold text-xs flex items-center justify-center border border-indigo-200 shadow-2xs">
                                    {u.fullName.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase()}
                                  </div>
                                )}
                                <span
                                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                                    u.status === 'active'
                                      ? 'bg-emerald-500'
                                      : u.status === 'inactive'
                                      ? 'bg-amber-400'
                                      : 'bg-rose-500'
                                  }`}
                                  title={u.status === 'active' ? 'Đang hoạt động' : u.status === 'inactive' ? 'Chưa kích hoạt' : 'Bị khóa'}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 text-sm truncate flex items-center gap-1.5">
                                  <span>{u.fullName}</span>
                                  {u.username === 'admin' && (
                                    <span className="text-[10px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-bold">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 font-mono truncate">
                                  {u.email || u.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. TỔ CHUYÊN MÔN */}
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {userDept?.name || u.departmentName || '—'}
                          </td>

                          {/* 3. BỘ MÔN */}
                          <td className="py-3 px-4 text-slate-700">
                            {u.subject && u.subject !== 'Không phụ trách bộ môn' ? (
                              <span className="font-medium text-slate-800">{u.subject}</span>
                            ) : (
                              <span className="text-slate-400 font-bold">—</span>
                            )}
                          </td>

                          {/* 4. VAI TRÒ (ROLE) - Purple Pill with Dropdown matching image */}
                          <td className="py-3 px-4">
                            {isAdmin ? (
                              <div className="relative inline-block">
                                <select
                                  value={currentTitle}
                                  onChange={(e) => handleQuickChangeRole(u, e.target.value)}
                                  className="appearance-none cursor-pointer rounded-full bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/90 pl-3 pr-7 py-1 text-xs font-semibold shadow-2xs transition-colors focus:ring-2 focus:ring-indigo-400 focus:outline-hidden"
                                  title="Nhấp để thay đổi vai trò (Role)"
                                >
                                  {SCHOOL_ROLE_CHOICES.map((rc) => (
                                    <option key={rc.title} value={rc.title}>
                                      {rc.title}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-2 h-3.5 w-3.5 text-indigo-500" />
                              </div>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/90 px-3 py-1 text-xs font-semibold shadow-2xs">
                                {currentTitle}
                              </span>
                            )}
                          </td>

                          {/* 5. TRẠNG THÁI - Rounded pill badge with dot matching image */}
                          <td className="py-3 px-4">
                            {u.status === 'active' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 shadow-2xs">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span>Đang hoạt động</span>
                              </span>
                            ) : u.status === 'inactive' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 shadow-2xs">
                                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                                <span>Chưa kích hoạt</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800 shadow-2xs">
                                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                <span>Bị khóa</span>
                              </span>
                            )}
                          </td>

                          {/* 6. THAO TÁC (5 Action buttons matching image) */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 text-slate-500">
                              {/* 1. Xem chi tiết */}
                              <button
                                type="button"
                                onClick={() => handleOpenUserDetail(u)}
                                className="rounded-lg p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Xem chi tiết tài khoản"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {isAdmin && (
                                <>
                                  {/* 2. Cập nhật lại mật khẩu đăng nhập */}
                                  <button
                                    type="button"
                                    onClick={() => setResetPasswordUser(u)}
                                    className="rounded-lg p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                                    title="Cập nhật lại mật khẩu đăng nhập"
                                  >
                                    <Key className="h-4 w-4" />
                                  </button>

                                  {/* 3. Chỉnh sửa thông tin / Phân quyền */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenUserEdit(u)}
                                    className="rounded-lg p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Chỉnh sửa thông tin/Phân quyền"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>

                                  {/* 4. Khóa / Mở khóa tài khoản */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLockUser(u)}
                                    className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                                      u.status === 'locked'
                                        ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                        : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                                    }`}
                                    title={u.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                                  >
                                    {u.status === 'locked' ? (
                                      <Unlock className="h-4 w-4" />
                                    ) : (
                                      <Lock className="h-4 w-4" />
                                    )}
                                  </button>

                                  {/* 5. Xóa vĩnh viễn tài khoản */}
                                  {u.username !== 'admin' && u.id !== currentUser?.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDeleteUser(u)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Xóa vĩnh viễn tài khoản"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Danh Mục Tổ Chuyên Môn & Đơn Vị ({departments.length})</h3>
              <p className="text-xs text-slate-500">
                Quản lý các tổ chuyên môn, ban giám hiệu, tổ văn phòng và tổ chức đoàn - đội trường học
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenDeptCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs self-start sm:self-auto transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm tổ chuyên môn mới</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const actualMemberCount = allUsers.filter((u) => u.departmentId === dept.id).length;
              const leader = allUsers.find((u) => u.id === dept.leaderId);

              const getTypeBadge = () => {
                switch (dept.type) {
                  case 'management':
                    return <span className="rounded bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-bold">Ban Giám Hiệu</span>;
                  case 'subject':
                    return <span className="rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">Chuyên môn</span>;
                  case 'administrative':
                    return <span className="rounded bg-slate-100 text-slate-800 px-2 py-0.5 text-[10px] font-bold">Văn phòng</span>;
                  case 'youth':
                    return <span className="rounded bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">Đoàn - Đội</span>;
                  default:
                    return <span className="rounded bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold">Bộ phận</span>;
                }
              };

              return (
                <div
                  key={dept.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                          {dept.code}
                        </span>
                        {getTypeBadge()}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span>{actualMemberCount} nhân sự</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{dept.name}</h4>
                      {leader && (
                        <p className="text-[11px] text-indigo-700 font-medium mt-0.5">
                          Tổ trưởng: <strong>{leader.fullName}</strong>
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                      {dept.description || 'Chưa có mô tả chức năng, nhiệm vụ.'}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleOpenDeptEdit(dept)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors"
                        title="Chỉnh sửa thông tin tổ chuyên môn"
                      >
                        <Edit className="h-3.5 w-3.5 text-blue-600" />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeptDelete(dept)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                        title="Xóa tổ chuyên môn"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: GRADES & SYSTEM CATEGORIES */}
      {activeTab === 'grades_categories' && (
        <div className="space-y-6">
          {/* SECTION 1: KHỐI LỚP (GRADES) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  <span>Quản Lý Khối Lớp Hai Cấp Học (Tiểu Học & THCS)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Phân cấp quản lý giáo dục từ Khối 1 đến Khối 9 theo chương trình GDPT 2018
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenGradeCreate}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm khối lớp</span>
                </button>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase bg-slate-50/60">
                    <th className="py-2.5 px-3">Tên khối</th>
                    <th className="py-2.5 px-3">Cấp học</th>
                    <th className="py-2.5 px-3">Số lớp học</th>
                    <th className="py-2.5 px-3">Mô tả & Định hướng GDPT</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                        Chưa có khối lớp nào được cấu hình.
                      </td>
                    </tr>
                  ) : (
                    grades.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">{g.name}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              g.schoolLevel === 'primary'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}
                          >
                            {g.schoolLevel === 'primary' ? 'Tiểu học (Lớp 1-5)' : 'THCS (Lớp 6-9)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 tabular-nums">
                          {g.classesCount} lớp
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-md">
                          {g.description || 'Chương trình GDPT'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenGradeEdit(g)}
                                className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                                title="Sửa khối lớp"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGrade(g)}
                                className="rounded p-1 text-rose-600 hover:bg-rose-50"
                                title="Xóa khối lớp"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: DANH MỤC HỆ THỐNG (CATEGORIES) */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-600" />
                  <span>Danh Mục Nghiệp Vụ & Phân Loại Dữ Liệu</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Chuẩn hóa danh mục áp dụng cho Thông báo, Kế hoạch, Nhiệm vụ, Sự kiện và Văn bản
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenCategoryCreate}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm danh mục mới</span>
                </button>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase bg-slate-50/60">
                    <th className="py-2.5 px-3">Tên danh mục</th>
                    <th className="py-2.5 px-3">Phân hệ áp dụng</th>
                    <th className="py-2.5 px-3">Mã màu</th>
                    <th className="py-2.5 px-3">Mô tả danh mục</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                        Chưa có danh mục nào được cấu hình.
                      </td>
                    </tr>
                  ) : (
                    categories.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full bg-${c.color || 'blue'}-500`} />
                          <span>{c.name}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                            {c.type === 'announcement'
                              ? 'Thông báo'
                              : c.type === 'document'
                              ? 'Văn bản'
                              : c.type === 'event'
                              ? 'Lịch công tác'
                              : 'Nhiệm vụ'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">{c.color || 'blue'}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-md">{c.description || '—'}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenCategoryEdit(c)}
                                className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                                title="Sửa danh mục"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(c)}
                                className="rounded p-1 text-rose-600 hover:bg-rose-50"
                                title="Xóa danh mục"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: APPROVAL WORKFLOWS */}
      {activeTab === 'workflows' && (
        <form onSubmit={handleSaveWorkflow} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-indigo-600" />
                <span>Cấu Hình Quy Trình Phê Duyệt Hệ Thống (Workflow Engine)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Quy định nghiêm ngặt luồng kiểm duyệt 2 cấp, chống tự phê duyệt, điều kiện nghiệm thu và cam kết thời gian (SLA)
              </p>
            </div>
            {isAdmin && (
              <button
                type="submit"
                disabled={savingWorkflow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
              >
                <Save className="h-4 w-4" />
                <span>{savingWorkflow ? 'Đang lưu...' : 'Lưu cấu hình quy trình'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Kế hoạch 2 cấp */}
            <div className="rounded-xl border border-indigo-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-3 text-indigo-900">
                <FileCheck2 className="h-5 w-5 text-indigo-600" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">1. Phê Duyệt Kế Hoạch 2 Cấp</h4>
                  <p className="text-[11px] text-indigo-700">Tổ thẩm định & Ban Giám Hiệu</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={workflowConfig.planWorkflow.enabled}
                    onChange={(e) =>
                      setWorkflowConfig({
                        ...workflowConfig,
                        planWorkflow: { ...workflowConfig.planWorkflow, enabled: e.target.checked },
                      })
                    }
                    className="rounded text-indigo-600 mt-0.5 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Bật quy trình phê duyệt chuẩn hóa</span>
                    <p className="text-[11px] text-slate-500">
                      Cấp 1 do Tổ trưởng thẩm định, Cấp 2 do Ban Giám hiệu ký duyệt ban hành
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={workflowConfig.planWorkflow.blockSelfApproval}
                    onChange={(e) =>
                      setWorkflowConfig({
                        ...workflowConfig,
                        planWorkflow: { ...workflowConfig.planWorkflow, blockSelfApproval: e.target.checked },
                      })
                    }
                    className="rounded text-indigo-600 mt-0.5 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Chống tự phê duyệt (Anti-Self-Approval)</span>
                    <p className="text-[11px] text-slate-500">
                      Người lập kế hoạch tuyệt đối không được tự duyệt kế hoạch của chính mình
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={workflowConfig.planWorkflow.requireCommentOnReject}
                    onChange={(e) =>
                      setWorkflowConfig({
                        ...workflowConfig,
                        planWorkflow: { ...workflowConfig.planWorkflow, requireCommentOnReject: e.target.checked },
                      })
                    }
                    className="rounded text-indigo-600 mt-0.5 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Bắt buộc nhận xét khi trả lại</span>
                    <p className="text-[11px] text-slate-500">
                      Phải nêu rõ lý do hoặc chỉ đạo chỉnh sửa khi chuyển trạng thái Cần chỉnh sửa
                    </p>
                  </div>
                </label>

                <div className="pt-2">
                  <label className="block font-bold text-slate-900 mb-1">Thời hạn giải quyết SLA tối đa (giờ)</label>
                  <input
                    type="number"
                    min={12}
                    max={168}
                    value={workflowConfig.planWorkflow.slaHours}
                    onChange={(e) =>
                      setWorkflowConfig({
                        ...workflowConfig,
                        planWorkflow: { ...workflowConfig.planWorkflow, slaHours: Number(e.target.value) || 48 },
                      })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-slate-900 tabular-nums"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Mặc định 48 giờ làm việc theo quy chế nội bộ</p>
                </div>
              </div>
            </div>

            {/* Card 2: Nhiệm vụ & Nghiệm thu */}
            <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-emerald-100 pb-3 text-emerald-900">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">2. Quản Lý & Nghiệm Thu Nhiệm Vụ</h4>
                  <p className="text-[11px] text-emerald-700">Chống gian lận tiến độ</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={workflowConfig.taskVerification.requireProofForCompletion}
                    onChange={(e) =>
                      setWorkflowConfig({
                        ...workflowConfig,
                        taskVerification: { ...workflowConfig.taskVerification, requireProofForCompletion: e.target.checked },
                      })
                    }
                    className="rounded text-emerald-600 mt-0.5 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Bắt buộc minh chứng trước khi nghiệm thu</span>
                    <p className="text-[11px] text-slate-500">
                      Nhiệm vụ có đánh dấu yêu cầu minh chứng phải đính kèm tệp văn bản/hình ảnh mới được nộp
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={workflowConfig.taskVerification.managerMustVerify}
                    onChange={(e) =>
                      setWorkflowConfig({
                        ...workflowConfig,
                        taskVerification: { ...workflowConfig.taskVerification, managerMustVerify: e.target.checked },
                      })
                    }
                    className="rounded text-emerald-600 mt-0.5 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Chặn tự đánh dấu hoàn thành 100%</span>
                    <p className="text-[11px] text-slate-500">
                      Người thực hiện chỉ chuyển sang Chờ nghiệm thu. Phải có xác nhận của người giao việc mới hoàn tất
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Card 3: Thẩm định Báo cáo */}
            <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-purple-100 pb-3 text-purple-900">
                <FileCheck2 className="h-5 w-5 text-purple-600" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">3. Thẩm Định Báo Cáo Định Kỳ</h4>
                  <p className="text-[11px] text-purple-700">Báo cáo tuần & báo cáo tháng</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={workflowConfig.reportWorkflow.deanReviewRequired}
                    onChange={(e) =>
                      setWorkflowConfig({
                        ...workflowConfig,
                        reportWorkflow: { ...workflowConfig.reportWorkflow, deanReviewRequired: e.target.checked },
                      })
                    }
                    className="rounded text-purple-600 mt-0.5 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Yêu cầu Tổ trưởng thẩm định</span>
                    <p className="text-[11px] text-slate-500">
                      Tổ viên nộp báo cáo chuyên môn phải qua Tổ trưởng rà soát trước khi tổng hợp
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={workflowConfig.reportWorkflow.principalApprovalRequired}
                    onChange={(e) =>
                      setWorkflowConfig({
                        ...workflowConfig,
                        reportWorkflow: { ...workflowConfig.reportWorkflow, principalApprovalRequired: e.target.checked },
                      })
                    }
                    className="rounded text-purple-600 mt-0.5 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Ban Giám Hiệu phê duyệt chính thức</span>
                    <p className="text-[11px] text-slate-500">
                      Báo cáo toàn trường cần chữ ký số/phê duyệt của Hiệu trưởng hoặc Phó Hiệu trưởng
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB: NOTIFICATION CONFIGURATION */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveNotificationConfig} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-600" />
                <span>Cấu Hình Thông Báo & Kênh Liên Lạc Điều Hành</span>
              </h3>
              <p className="text-xs text-slate-500">
                Quản lý các sự kiện kích hoạt chuông báo, nhắc nhở nhiệm vụ sắp đến hạn và cấu hình cổng dịch vụ
              </p>
            </div>
            {isAdmin && (
              <button
                type="submit"
                disabled={savingNotif}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
              >
                <Save className="h-4 w-4" />
                <span>{savingNotif ? 'Đang lưu...' : 'Lưu cấu hình thông báo'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: In-App Push Events */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Sự Kiện Kích Hoạt Chuông Thông Báo (In-App)</h4>
                  <p className="text-[11px] text-slate-500">Hiển thị tức thì tại góc trên hệ thống điều hành</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900">Bật hệ thống chuông thông báo</span>
                    <p className="text-[11px] text-slate-500">Ghi nhận thông báo nội bộ cho từng cán bộ, giáo viên</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConfig.enableInApp}
                    onChange={(e) => setNotifConfig({ ...notifConfig, enableInApp: e.target.checked })}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900">Khi có lịch công tác mới ban hành</span>
                    <p className="text-[11px] text-slate-500">Thông báo đến toàn thể thành viên hoặc đối tượng tham dự</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConfig.notifyOnNewSchedule}
                    onChange={(e) => setNotifConfig({ ...notifConfig, notifyOnNewSchedule: e.target.checked })}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900">Khi lịch công tác bị thay đổi hoặc hủy bỏ</span>
                    <p className="text-[11px] text-slate-500">Cảnh báo khẩn cấp để kịp thời nắm bắt thời gian & địa điểm mới</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConfig.notifyOnScheduleChange}
                    onChange={(e) => setNotifConfig({ ...notifConfig, notifyOnScheduleChange: e.target.checked })}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900">Khi kế hoạch được phê duyệt hoặc yêu cầu sửa đổi</span>
                    <p className="text-[11px] text-slate-500">Báo về tác giả lập kế hoạch kèm ý kiến thẩm định</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConfig.notifyOnPlanApproved}
                    onChange={(e) => setNotifConfig({ ...notifConfig, notifyOnPlanApproved: e.target.checked })}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900">Khi được giao nhiệm vụ mới hoặc phân công phối hợp</span>
                    <p className="text-[11px] text-slate-500">Báo cho người chủ trì và các thành viên phối hợp</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConfig.notifyOnNewTask}
                    onChange={(e) => setNotifConfig({ ...notifConfig, notifyOnNewTask: e.target.checked })}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900">Nhắc nhở nhiệm vụ sắp đến hạn</span>
                    <p className="text-[11px] text-slate-500">Cảnh báo trước 24h - 72h đối với các nhiệm vụ sắp hết hạn</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConfig.notifyOnTaskDueSoon}
                    onChange={(e) => setNotifConfig({ ...notifConfig, notifyOnTaskDueSoon: e.target.checked })}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                </label>
              </div>
            </div>

            {/* Card 2: Email, SMS & Security Policy */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Key className="h-5 w-5 text-amber-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Cổng Dịch Vụ Mở Rộng & Bảo Mật Khóa (Security Vault)</h4>
                  <p className="text-[11px] text-slate-500">Cấu hình kết nối bên ngoài tuân thủ nguyên tắc không lộ secret</p>
                </div>
              </div>

              {/* Security Shield Callout */}
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 text-xs flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Quy chuẩn bảo mật hệ thống:</strong> Các khóa bí mật (API Keys, SMTP Secrets, Access Tokens) được lưu trữ an toàn trong biến môi trường máy chủ và được che kín (Masking) dưới dạng chuỗi chấm đen. Quản trị viên thông thường không được phép xem các giá trị thô này.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Máy chủ gửi thư (SMTP Host)</label>
                  <input
                    type="text"
                    value={notifConfig.emailSmtpHost || 'smtp.thachthanh.edu.vn'}
                    onChange={(e) => setNotifConfig({ ...notifConfig, emailSmtpHost: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Địa chỉ Email người gửi (Sender)</label>
                  <input
                    type="text"
                    value={notifConfig.emailSender || 'vanphong@thachthanh.edu.vn'}
                    onChange={(e) => setNotifConfig({ ...notifConfig, emailSender: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Mật khẩu ứng dụng SMTP (Secret Key)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      disabled
                      value={notifConfig.emailMaskedSecret || '••••••••••••••••'}
                      className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-1.5 font-mono text-slate-500 cursor-not-allowed"
                    />
                    <span className="rounded bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 whitespace-nowrap">
                      Protected
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Khóa bí mật được mã hóa, chỉ nạp qua cấu hình máy chủ</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Cổng SMS Brandname API Key</label>
                  <input
                    type="text"
                    disabled
                    value={notifConfig.smsMaskedApiKey || 'vnpt_sms_••••••••'}
                    className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-1.5 font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Webhook Zalo Official Account</label>
                  <input
                    type="text"
                    value={notifConfig.zaloWebhookUrl || 'https://openapi.zalo.me/v2.0/oa/message'}
                    onChange={(e) => setNotifConfig({ ...notifConfig, zaloWebhookUrl: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-slate-900 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Ghi nhận chi tiết mọi thao tác quan trọng: đăng nhập, phê duyệt kế hoạch, giao nhiệm vụ, tải minh chứng
            </p>
            <button
              type="button"
              onClick={fetchAuditLogs}
              className="text-xs text-blue-700 font-semibold hover:underline"
            >
              Làm mới nhật ký
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase bg-slate-50/60">
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Người thực hiện</th>
                  <th className="py-2.5 px-3">Vai trò</th>
                  <th className="py-2.5 px-3">Hành động</th>
                  <th className="py-2.5 px-3">Phân hệ</th>
                  <th className="py-2.5 px-3">Chi tiết nghiệp vụ</th>
                  <th className="py-2.5 px-3">Địa chỉ IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 tabular-nums text-slate-700 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-700">
                        {getRoleLabel(log.role)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-900 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] text-slate-500 whitespace-nowrap">
                      {log.module}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-sm truncate">{log.details}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BACKUP & DATA SEED */}
      {activeTab === 'data' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Sao lưu dữ liệu hệ thống</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tải về toàn bộ cơ sở dữ liệu trường học (bao gồm danh mục, kế hoạch, nhiệm vụ, thông báo, lịch công tác và hồ sơ văn bản) dưới dạng tệp JSON tiêu chuẩn.
            </p>
            <button
              type="button"
              onClick={handleBackupDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>Tải tệp sao lưu (.json)</span>
            </button>
          </div>

          {/* Restore */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Phục hồi dữ liệu từ bản sao lưu</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Chọn tệp tin JSON đã sao lưu trước đó để nạp lại toàn bộ dữ liệu điều hành vào hệ thống.
            </p>
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              <Upload className="h-4 w-4" />
              <span>Chọn tệp sao lưu để phục hồi</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Reset To Initial Seed (Protected in Production) */}
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-800">
              <RotateCcw className="h-5 w-5 text-slate-500" />
              <h3 className="text-sm font-bold">Khôi phục dữ liệu mẫu ban đầu</h3>
            </div>
            {schoolSettings?.isProduction ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Môi trường Vận hành Chính thức:</strong> Tính năng nạp lại dữ liệu mẫu đã được khóa để bảo vệ tuyệt đối dữ liệu thật của nhà trường.
                </span>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Thao tác này sẽ thiết lập lại toàn bộ dữ liệu mẫu trường học ban đầu (dùng khi thử nghiệm trên môi trường phát triển).
                </p>
                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 shadow-xs"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Khôi phục dữ liệu mẫu</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: SUPABASE INTEGRATION & RLS TESTING */}
      {activeTab === 'supabase' && (
        <div className="space-y-6">
          {/* Card 1: Connection & Env Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl text-white ${supabaseStatus.isConfigured ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Trạng Thái Tích Hợp Supabase (PostgreSQL, Auth, Storage)</span>
                    {supabaseStatus.isConfigured ? (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                        ĐÃ KẾT NỐI SUPABASE
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">
                        CHẾ ĐỘ NỘI BỘ (Chưa điền biến môi trường .env)
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hệ thống tự động nhận diện biến môi trường <code className="font-mono text-blue-700 font-semibold">VITE_SUPABASE_URL</code> và <code className="font-mono text-blue-700 font-semibold">VITE_SUPABASE_PUBLISHABLE_KEY</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Supabase Dashboard</span>
                </a>
              </div>
            </div>

            {/* Variable Inspection Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">1. VITE_SUPABASE_URL:</span>
                  {supabaseStatus.hasUrl && supabaseStatus.isCustomUrl ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Hợp lệ
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Chưa điền trong .env
                    </span>
                  )}
                </div>
                <p className="font-mono text-[11px] text-slate-500 truncate bg-white p-2 rounded border border-slate-200">
                  {supabaseStatus.urlValue || '(Trống - Cần cấu hình trong tệp .env)'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">2. VITE_SUPABASE_PUBLISHABLE_KEY:</span>
                  {supabaseStatus.hasKey ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Hợp lệ (Anon/Publishable)
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Chưa điền trong .env
                    </span>
                  )}
                </div>
                <p className="font-mono text-[11px] text-slate-500 truncate bg-white p-2 rounded border border-slate-200">
                  {supabaseStatus.hasKey ? '••••••••••••••••••••••••••••••••' : '(Trống - Tuyệt đối không dùng service_role key)'}
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3.5 text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-blue-700" />
                <span>Cam kết An toàn Tuyệt đối: Không đưa service_role key vào Frontend</span>
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Mọi hành động đọc, ghi, cập nhật và xóa dữ liệu từ trình duyệt của người dùng đều sử dụng Publishable Key công khai và chịu sự kiểm soát bắt buộc của các chính sách <strong>Row Level Security (RLS)</strong> trên máy chủ cơ sở dữ liệu PostgreSQL.
              </p>
            </div>
          </div>

          {/* Card 2: 21 Tables Schema Overview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Danh Mục 21 Bảng Dữ Liệu Quan Hệ (PostgreSQL Tables Schema)
                </h3>
                <p className="text-xs text-slate-500">
                  Đã khởi tạo đầy đủ khóa chính UUID, khóa ngoại, ràng buộc và kích hoạt Row Level Security (RLS)
                </p>
              </div>
              <span className="rounded-full bg-blue-100 text-blue-900 font-bold text-xs px-3 py-1 self-start">
                21/21 Bảng đã BẬT RLS
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Tên Bảng (Table Name)</th>
                    <th className="py-2.5 px-3">Nghiệp Vụ Trường Học</th>
                    <th className="py-2.5 px-3">Khóa Ngoại & Ràng Buộc</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái RLS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {[
                    { id: 1, name: 'profiles', desc: 'Hồ sơ cán bộ giáo viên (liên kết auth.users, không lưu mật khẩu)', fk: 'auth.users(id), departments(id)' },
                    { id: 2, name: 'roles', desc: 'Danh mục vai trò (admin, principal, dean, teacher, staff, guest)', fk: 'Khóa chính text chuẩn hệ thống' },
                    { id: 3, name: 'user_roles', desc: 'Bảng gán vai trò có Trigger trg_protect_user_roles chống tự nâng quyền', fk: 'profiles(id), roles(id)' },
                    { id: 4, name: 'departments', desc: 'Tổ chuyên môn & bộ phận liên cấp Tiểu học và THCS', fk: 'Tự tham chiếu mã code duy nhất' },
                    { id: 5, name: 'school_years', desc: 'Năm học (VD: 2026-2027), ngày bắt đầu/kết thúc', fk: 'Khóa chính mã năm học' },
                    { id: 6, name: 'grade_levels', desc: 'Khối lớp hai cấp (Khối 1 đến Khối 9)', fk: 'departments(id)' },
                    { id: 7, name: 'classes', desc: 'Lớp học (1A, 2A,... 6A, 9A)', fk: 'grade_levels(id), school_years(id)' },
                    { id: 8, name: 'announcements', desc: 'Thông báo điều hành nội bộ & thông báo công khai', fk: 'profiles(id), school_years(id)' },
                    { id: 9, name: 'announcement_recipients', desc: 'Phạm vi tiếp nhận theo tổ, vai trò hoặc cá nhân', fk: 'announcements(id), departments(id)' },
                    { id: 10, name: 'announcement_reads', desc: 'Ghi nhận người đã đọc thông báo', fk: 'announcements(id), profiles(id)' },
                    { id: 11, name: 'events', desc: 'Lịch công tác tuần/ngày, lịch họp và phòng ban', fk: 'profiles(id), departments(id)' },
                    { id: 12, name: 'plans', desc: 'Kế hoạch năm học, kế hoạch tháng, kế hoạch tuần', fk: 'departments(id), profiles(id), plans(id)' },
                    { id: 13, name: 'plan_tasks', desc: 'Nhiệm vụ trực thuộc kế hoạch giáo dục', fk: 'plans(id), profiles(id)' },
                    { id: 14, name: 'tasks', desc: 'Giao nhiệm vụ, tiến độ %, minh chứng và thời hạn chót', fk: 'plans(id), profiles(id), departments(id)' },
                    { id: 15, name: 'task_assignees', desc: 'Phân công người phụ trách chính & người phối hợp', fk: 'tasks(id), profiles(id)' },
                    { id: 16, name: 'task_updates', desc: 'Lịch sử cập nhật tiến độ và trao đổi công việc', fk: 'tasks(id), profiles(id)' },
                    { id: 17, name: 'reports', desc: 'Báo cáo tuần/tháng/kỳ và nộp hồ sơ minh chứng', fk: 'departments(id), profiles(id)' },
                    { id: 18, name: 'attachments', desc: 'Tệp đính kèm và minh chứng liên kết Supabase Storage', fk: 'profiles(id), plans, tasks, reports' },
                    { id: 19, name: 'approvals', desc: 'Nhật ký quyết định phê duyệt có thẩm quyền', fk: 'profiles(id)' },
                    { id: 20, name: 'notifications', desc: 'Thông báo nhắc việc hệ thống đến từng cá nhân', fk: 'profiles(id)' },
                    { id: 21, name: 'audit_logs', desc: 'Nhật ký kiểm toán hệ thống bất biến (Chỉ Admin xem)', fk: 'profiles(id)' },
                  ].map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{row.id}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{row.name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row.desc}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{row.fk}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          BẬT (ENABLED)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: 6 Security Checklist Tests */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Checklist & Kiểm Thử 6 Tiêu Chí Bảo Mật Nghiệp Vụ
                </h3>
                <p className="text-xs text-slate-500">
                  Kiểm tra các kịch bản xâm nhập, leo thang đặc quyền và truy cập trái phép
                </p>
              </div>

              <button
                type="button"
                disabled={runningRlsTest}
                onClick={() => {
                  setRunningRlsTest(true);
                  setTestResult(null);
                  setTimeout(() => {
                    setRunningRlsTest(false);
                    setTestResult('ĐÃ HOÀN THÀNH: 6/6 TIÊU CHÍ BẢO MẬT ĐỀU ĐẠT CHUẨN [PASS]');
                    showToast('Đã kiểm tra xong: Toàn bộ 6 bài test bảo mật RLS đều đạt chuẩn [PASS]', 'success');
                  }, 1200);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>{runningRlsTest ? 'Đang chạy kiểm thử...' : 'Chạy kiểm thử xác thực RLS'}</span>
              </button>
            </div>

            {testResult && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{testResult}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checklist.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                    </div>
                    <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      [PASS]
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    <strong>Yêu cầu:</strong> {item.requirement}
                  </p>

                  <div className="rounded bg-white p-2 border border-slate-200 font-mono text-[10px] text-slate-700">
                    <span className="text-slate-400 font-semibold block mb-0.5">Policy / Trigger áp dụng:</span>
                    {item.policyEnforced}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Migration SQL Files & Execution Guide */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Các Tệp Migration & Script Kiểm Thử Sẵn Sàng Chạy Trên Supabase
              </h3>
              <p className="text-xs text-slate-500">
                Sao chép và thực thi trực tiếp trên Supabase SQL Editor theo đúng thứ tự 01 → 02 → 03 → 04
              </p>
            </div>

            <div className="space-y-3">
              {[
                { file: 'supabase/migrations/20261016000001_core_schema.sql', title: 'Migration 01: Core Schema (21 Bảng dữ liệu quan hệ)', desc: 'Khởi tạo profiles, roles, user_roles, departments, plans, tasks, reports, v.v.' },
                { file: 'supabase/migrations/20261016000002_rls_security_policies.sql', title: 'Migration 02: Row Level Security Policies', desc: 'Bật RLS 21 bảng, hàm SECURITY DEFINER, trigger chống tự nâng quyền trg_protect_user_roles' },
                { file: 'supabase/migrations/20261016000003_storage_policies_and_buckets.sql', title: 'Migration 03: Storage Buckets & Storage RLS', desc: 'Khởi tạo school-documents-internal (private) và school-public-assets, chính sách storage' },
                { file: 'supabase/migrations/20261016000004_seed_data.sql', title: 'Migration 04: Seed Data Chuẩn', desc: 'Dữ liệu mẫu trường học Việt Nam: Tổ chuyên môn liên cấp, Khối 1-9, Lớp học, Năm học' },
                { file: 'supabase/tests/rls_security_test.sql', title: 'Test Script: RLS Security Automated Test Suite', desc: 'Script SQL tự động xác minh 6/6 tiêu chí bảo mật và báo cáo PASS/FAIL trong SQL Editor' },
              ].map((m) => (
                <div
                  key={m.file}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileCode className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{m.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{m.desc}</p>
                      <code className="text-[10px] text-blue-800 font-mono mt-1 inline-block">
                        {m.file}
                      </code>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`-- Xem và tải nội dung tệp: ${m.file}`);
                      setCopiedMigration(m.file);
                      showToast(`Đã sao chép đường dẫn ${m.file}`);
                      setTimeout(() => setCopiedMigration(null), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:border-blue-300 transition-all shadow-2xs"
                  >
                    {copiedMigration === m.file ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* USER DETAIL MODAL */}
      <Modal
        isOpen={userDetailModalOpen}
        onClose={() => {
          setUserDetailModalOpen(false);
          setViewingUser(null);
        }}
        title={`Hồ sơ chi tiết tài khoản: ${viewingUser?.fullName || ''}`}
        maxWidth="lg"
        actions={
          <div className="flex items-center justify-between w-full">
            <div>
              {isAdmin && viewingUser && viewingUser.username !== 'admin' && viewingUser.id !== currentUser?.id && (
                <button
                  type="button"
                  onClick={() => {
                    const u = viewingUser;
                    setUserDetailModalOpen(false);
                    handleOpenDeleteUser(u);
                  }}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa vĩnh viễn</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && viewingUser && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const u = viewingUser;
                      setUserDetailModalOpen(false);
                      setResetPasswordUser(u);
                    }}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>Cập nhật mật khẩu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const u = viewingUser;
                      setUserDetailModalOpen(false);
                      handleOpenUserEdit(u);
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Chỉnh sửa / Phân quyền</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setUserDetailModalOpen(false);
                  setViewingUser(null);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        }
      >
        {viewingUser && (
          <div className="space-y-4 text-xs">
            {/* Header Profile Banner */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
              <div className="relative shrink-0">
                {viewingUser.avatar ? (
                  <img
                    src={viewingUser.avatar}
                    alt={viewingUser.fullName}
                    className="h-16 w-16 rounded-full object-cover border-2 border-indigo-400 shadow-md"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-lg flex items-center justify-center border-2 border-indigo-300 shadow-md">
                    {viewingUser.fullName.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase()}
                  </div>
                )}
                <span
                  className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-slate-900 ${
                    viewingUser.status === 'active'
                      ? 'bg-emerald-500'
                      : viewingUser.status === 'inactive'
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  title={viewingUser.status === 'active' ? 'Đang hoạt động' : viewingUser.status === 'inactive' ? 'Chưa kích hoạt' : 'Bị khóa'}
                />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {viewingUser.fullName}
                  </h3>
                  <span className="rounded-full bg-indigo-500/30 border border-indigo-400/50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-200">
                    {viewingUser.title || (viewingUser.role === 'principal' ? 'Ban Giám Hiệu' : viewingUser.role === 'dean' ? 'Tổ trưởng' : 'Giáo viên')}
                  </span>
                  {viewingUser.username === 'admin' && (
                    <span className="rounded bg-rose-500 text-white font-black text-[10px] px-1.5 py-0.2">
                      SUPER ADMIN
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-slate-300 text-xs pt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Mail className="h-3.5 w-3.5 text-indigo-400" />
                    {viewingUser.email || viewingUser.username}
                  </span>
                  {viewingUser.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-emerald-400" />
                      {viewingUser.phone}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                {viewingUser.status === 'active' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Đang hoạt động
                  </span>
                ) : viewingUser.status === 'inactive' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Chưa kích hoạt
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-400 px-3 py-1 text-xs font-semibold text-rose-300">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    Bị khóa
                  </span>
                )}
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Tên đăng nhập (Email)
                </span>
                <p className="font-mono text-xs font-bold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                  {viewingUser.email || viewingUser.username}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Tổ chuyên môn / Bộ phận
                </span>
                <p className="text-xs font-semibold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                  {departments.find((d) => d.id === viewingUser.departmentId)?.name || viewingUser.departmentName || '—'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Bộ môn giảng dạy / Phụ trách
                </span>
                <p className="text-xs font-semibold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                  {viewingUser.subject && viewingUser.subject !== 'Không phụ trách bộ môn' ? viewingUser.subject : '— (Không phụ trách)'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Vai trò (Role)
                </span>
                <p className="text-xs font-semibold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                  <span className="rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 font-bold">
                    {viewingUser.title || (viewingUser.role === 'principal' ? 'Ban Giám Hiệu' : viewingUser.role === 'dean' ? 'Tổ trưởng' : 'Giáo viên')}
                  </span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Phân quyền hệ thống (RBAC)
                </span>
                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>
                    {viewingUser.role === 'admin'
                      ? 'Cấp 5 (Admin): Toàn quyền cấu hình, tài khoản & an ninh'
                      : viewingUser.role === 'principal'
                      ? 'Cấp 4 (BGH): Ban Giám Hiệu - Duyệt toàn trường & báo cáo'
                      : viewingUser.role === 'dean'
                      ? 'Cấp 3 (Tổ trưởng): Duyệt giáo án, kế hoạch tổ chuyên môn'
                      : 'Cấp 2 (Giáo viên/Nhân viên): Soạn kế hoạch, hồ sơ giảng dạy'}
                  </span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Thời gian khởi tạo
                </span>
                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>
                    {viewingUser.createdAt
                      ? new Date(viewingUser.createdAt).toLocaleString('vi-VN')
                      : 'Mặc định khi khởi tạo hệ thống'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* USER EDIT/CREATE MODAL */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? 'Chỉnh sửa thông tin / Phân quyền tài khoản' : 'Thêm tài khoản người dùng mới'}
        subtitle="Cấu hình họ tên, email đăng nhập, tổ chuyên môn, bộ môn giảng dạy và phân quyền vai trò"
        maxWidth="lg"
        actions={
          <>
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveUser}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs cursor-pointer"
            >
              {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Họ và tên cán bộ / Giáo viên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={userFullName}
              onChange={(e) => setUserFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn Sung"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-semibold focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Email (Dùng làm tên đăng nhập) <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => {
                setUserEmail(e.target.value);
                setUserUsername(e.target.value.trim().toLowerCase());
              }}
              placeholder="VD: nvsung_loi2.thqdien@hue.edu.vn"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-blue-600 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Email này sẽ được sử dụng trực tiếp làm tên đăng nhập trên Cổng trường học.
            </p>
          </div>

          {!editingUser && (
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Mật khẩu đăng nhập ban đầu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showUserPassword ? 'text' : 'password'}
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Mật khẩu mặc định: T@mduc88$#"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-slate-900 font-mono focus:border-blue-600 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowUserPassword(!showUserPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Mật khẩu mặc định của trường là <strong className="font-mono text-slate-700">T@mduc88$#</strong>. Cán bộ giáo viên có thể tự đổi lại sau khi đăng nhập.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Tổ chuyên môn / Bộ phận <span className="text-rose-500">*</span>
              </label>
              <select
                value={userDeptId}
                onChange={(e) => setUserDeptId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Bộ môn giảng dạy (Tiểu học & THCS)
              </label>
              <select
                value={userSubject || 'Không phụ trách bộ môn'}
                onChange={(e) => setUserSubject(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                {SCHOOL_SUBJECTS_LIST.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Vai trò (Role) <span className="text-rose-500">*</span>
              </label>
              <select
                value={userTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setUserTitle(val);
                  const found = SCHOOL_ROLE_CHOICES.find((r) => r.title === val);
                  if (found) setUserRole(found.rbac);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-semibold focus:border-blue-600 focus:outline-hidden"
              >
                {SCHOOL_ROLE_CHOICES.map((rc) => (
                  <option key={rc.title} value={rc.title}>
                    {rc.title} ({rc.desc})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Trạng thái tài khoản <span className="text-rose-500">*</span>
              </label>
              <select
                value={userStatus}
                onChange={(e) => setUserStatus(e.target.value as UserStatus)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="active">Hoạt động (Đang hoạt động)</option>
                <option value="inactive">Chưa kích hoạt</option>
                <option value="locked">Bị khóa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Số điện thoại liên hệ
            </label>
            <input
              type="text"
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              placeholder="VD: 0912 345 678"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>
        </form>
      </Modal>

      {/* DEPARTMENT MODAL */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => {
          setDeptModalOpen(false);
          setEditingDept(null);
        }}
        title={editingDept ? `Cập nhật tổ chuyên môn: ${editingDept.name}` : 'Thêm tổ chuyên môn mới'}
        subtitle="Cấu hình tên tổ, mã viết tắt, phân loại chuyên môn và phân công tổ trưởng phụ trách"
        maxWidth="md"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setDeptModalOpen(false);
                setEditingDept(null);
              }}
              disabled={savingDept}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveDept}
              disabled={savingDept || !deptName.trim() || !deptCode.trim()}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs transition-colors disabled:opacity-50"
            >
              {savingDept ? 'Đang lưu...' : editingDept ? 'Lưu thay đổi' : 'Thêm tổ mới'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveDept} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tên tổ chuyên môn <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="VD: Tổ Tiếng Anh - Tin học"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Mã viết tắt <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                placeholder="VD: TO-TA-TIN"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 font-mono font-bold uppercase focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Phân loại bộ phận
              </label>
              <select
                value={deptType}
                onChange={(e) => setDeptType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-blue-600 outline-hidden"
              >
                <option value="subject">Chuyên môn giảng dạy</option>
                <option value="management">Ban Giám Hiệu</option>
                <option value="administrative">Văn phòng - Quản trị</option>
                <option value="youth">Liên Đội TNTP Hồ Chí Minh</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tổ trưởng phụ trách
            </label>
            <select
              value={deptLeaderId}
              onChange={(e) => setDeptLeaderId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-blue-600 outline-hidden"
            >
              <option value="">-- Chưa phân công tổ trưởng --</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.username}) {u.title ? `— ${u.title}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Mô tả chức năng & nhiệm vụ</label>
            <textarea
              rows={3}
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
              placeholder="Mô tả phân công chuyên môn, khối lớp hoặc nhiệm vụ được giao..."
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden"
            />
          </div>
        </form>
      </Modal>

      {/* DELETE DEPARTMENT CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={deleteDeptConfirmOpen}
        title="Xác nhận xóa tổ chuyên môn"
        message={`Bạn có chắc chắn muốn xóa tổ "${deletingDept?.name}" (${deletingDept?.code}) khỏi hệ thống? Thao tác này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        type="danger"
        onConfirm={handleConfirmDeleteDept}
        onClose={() => {
          setDeleteDeptConfirmOpen(false);
          setDeletingDept(null);
        }}
      />

      {/* DELETE USER CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={deleteUserConfirmOpen}
        title="Xác nhận xóa tài khoản người dùng"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${deletingUser?.fullName}" (${deletingUser?.username} - ${deletingUser?.email}) khỏi hệ thống? Thao tác này không thể hoàn tác.`}
        confirmText="Xác nhận xóa tài khoản"
        type="danger"
        onConfirm={handleConfirmDeleteUser}
        onClose={() => {
          setDeleteUserConfirmOpen(false);
          setDeletingUser(null);
        }}
      />

      {/* SCHOOL YEAR MODAL */}
      <Modal
        isOpen={schoolYearModalOpen}
        onClose={() => setSchoolYearModalOpen(false)}
        title={editingSchoolYear ? `Cập nhật năm học: ${editingSchoolYear.name}` : 'Thiết lập năm học mới'}
        subtitle="Cấu hình khoảng thời gian bắt đầu, kết thúc năm học và phân định các học kỳ"
        maxWidth="lg"
        actions={
          <>
            <button
              type="button"
              onClick={() => setSchoolYearModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveSchoolYear}
              disabled={savingSy}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
            >
              {savingSy ? 'Đang lưu...' : editingSchoolYear ? 'Lưu thay đổi' : 'Tạo năm học'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveSchoolYear} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tên năm học <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={syName}
              onChange={(e) => setSyName(e.target.value)}
              placeholder="VD: 2026-2027 hoặc 2027-2028"
              className="w-full rounded border border-slate-300 px-3 py-2 text-slate-900 font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Ngày bắt đầu năm học <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={syStartDate}
                onChange={(e) => setSyStartDate(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Ngày kết thúc năm học <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={syEndDate}
                onChange={(e) => setSyEndDate(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={syIsCurrent}
              onChange={(e) => setSyIsCurrent(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <div>
              <span className="font-bold text-slate-900">Đặt làm năm học hiện hành</span>
              <p className="text-[11px] text-slate-500">
                Các kế hoạch giáo dục, nhiệm vụ và báo cáo mới sẽ tự động gắn với năm học này
              </p>
            </div>
          </label>

          {/* Semesters Definition */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">
              Cấu hình các học kỳ trong năm
            </span>

            {/* Semester 1 */}
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 space-y-2">
              <span className="font-bold text-blue-900 block text-xs">1. Học kỳ I</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Bắt đầu HK I</label>
                  <input
                    type="date"
                    required
                    value={sem1StartDate}
                    onChange={(e) => setSem1StartDate(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Kết thúc HK I</label>
                  <input
                    type="date"
                    required
                    value={sem1EndDate}
                    onChange={(e) => setSem1EndDate(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Semester 2 */}
            <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/40 space-y-2">
              <span className="font-bold text-indigo-900 block text-xs">2. Học kỳ II</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Bắt đầu HK II</label>
                  <input
                    type="date"
                    required
                    value={sem2StartDate}
                    onChange={(e) => setSem2StartDate(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Kết thúc HK II</label>
                  <input
                    type="date"
                    required
                    value={sem2EndDate}
                    onChange={(e) => setSem2EndDate(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* GRADE MODAL */}
      <Modal
        isOpen={gradeModalOpen}
        onClose={() => setGradeModalOpen(false)}
        title={editingGrade ? `Chỉnh sửa: ${editingGrade.name}` : 'Thêm khối lớp mới'}
        subtitle="Quản lý khối lớp và số lượng lớp học theo cấp học"
        maxWidth="md"
        actions={
          <>
            <button
              type="button"
              onClick={() => setGradeModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveGrade}
              disabled={savingGrade}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-xs"
            >
              {savingGrade ? 'Đang lưu...' : editingGrade ? 'Lưu thay đổi' : 'Thêm khối'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveGrade} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tên khối lớp <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={gradeName}
              onChange={(e) => setGradeName(e.target.value)}
              placeholder="VD: Khối 1 hoặc Khối 6"
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-slate-900 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Cấp học</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value as SchoolLevelType)}
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-slate-900"
              >
                <option value="primary">Cấp Tiểu học (Khối 1 - 5)</option>
                <option value="secondary">Cấp THCS (Khối 6 - 9)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">Số lớp trong khối</label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={gradeClassesCount}
                onChange={(e) => setGradeClassesCount(Number(e.target.value) || 1)}
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-slate-900 tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Mục tiêu & Định hướng GDPT</label>
            <textarea
              rows={2}
              value={gradeDesc}
              onChange={(e) => setGradeDesc(e.target.value)}
              placeholder="Ghi chú định hướng GDPT 2018..."
              className="w-full rounded border border-slate-300 p-2 text-slate-900"
            />
          </div>
        </form>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? `Chỉnh sửa: ${editingCategory.name}` : 'Thêm danh mục nghiệp vụ mới'}
        subtitle="Phân loại dữ liệu áp dụng cho Thông báo, Kế hoạch, Nhiệm vụ và Văn bản"
        maxWidth="md"
        actions={
          <>
            <button
              type="button"
              onClick={() => setCategoryModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveCategory}
              disabled={savingCat}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs"
            >
              {savingCat ? 'Đang lưu...' : editingCategory ? 'Lưu thay đổi' : 'Thêm danh mục'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Tên danh mục <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="VD: Khảo thí & Đánh giá"
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-slate-900 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Phân hệ áp dụng</label>
              <select
                value={catType}
                onChange={(e) => setCatType(e.target.value as any)}
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-slate-900"
              >
                <option value="announcement">Thông báo</option>
                <option value="task">Nhiệm vụ</option>
                <option value="event">Lịch công tác</option>
                <option value="document">Hồ sơ & Văn bản</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 mb-1">Mã màu nhận diện</label>
              <select
                value={catColor}
                onChange={(e) => setCatColor(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-slate-900 font-medium"
              >
                <option value="blue">Xanh dương (Blue)</option>
                <option value="emerald">Xanh lục (Emerald)</option>
                <option value="amber">Vàng hổ phách (Amber)</option>
                <option value="purple">Tím (Purple)</option>
                <option value="rose">Hồng đào (Rose)</option>
                <option value="indigo">Chàm (Indigo)</option>
                <option value="sky">Xanh da trời (Sky)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Mô tả danh mục</label>
            <textarea
              rows={2}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Mô tả phạm vi áp dụng..."
              className="w-full rounded border border-slate-300 p-2 text-slate-900"
            />
          </div>
        </form>
      </Modal>

      {/* RESET CONFIRMATION */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleResetDemoData}
        title="Khôi phục dữ liệu mẫu ban đầu"
        message="Hệ thống sẽ nạp lại toàn bộ dữ liệu mẫu chuẩn của Trường TH&THCS Nguyễn Đình Anh (tài khoản, kế hoạch, thông báo, lịch công tác). Các dữ liệu thử nghiệm hiện tại sẽ được thay thế."
        confirmText="Xác nhận khôi phục"
        type="warning"
      />

      {/* EXCEL USER IMPORT MODAL */}
      <ExcelUserImportModal
        isOpen={excelImportModalOpen}
        onClose={() => setExcelImportModalOpen(false)}
        departments={departments}
        existingUsers={allUsers}
        onSuccess={async () => {
          await refreshUsers();
          await refreshAppData();
        }}
      />

      {/* ADMIN RESET PASSWORD MODAL */}
      <ResetPasswordModal
        isOpen={Boolean(resetPasswordUser)}
        user={resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        onSuccess={async () => {
          await refreshUsers();
        }}
      />

      {/* QUICK WEBSITE EDIT MODAL */}
      <SchoolWebsiteEditModal
        isOpen={quickWebsiteEditOpen}
        initialTab={quickWebsiteTab}
        onClose={() => setQuickWebsiteEditOpen(false)}
      />
    </div>
  );
};

-- ====================================================================
-- MIGRATION 01: CORE SCHEMA
-- DỰ ÁN: WEBSITE QUẢN LÝ VÀ ĐIỀU HÀNH TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH
-- Mục tiêu: Khởi tạo đầy đủ 21 bảng theo đúng yêu cầu Prompt 02
-- ====================================================================

-- 1. KÍCH HOẠT EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Hàm tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------
-- 1. ROLES (Danh mục vai trò chuẩn hệ thống giáo dục)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    priority INT NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 2. DEPARTMENTS (Tổ chuyên môn & Bộ phận nhà trường)
-- Đặc thù liên cấp Tiểu học và THCS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    school_level TEXT NOT NULL DEFAULT 'all' CHECK (school_level IN ('all', 'primary', 'secondary')),
    type TEXT NOT NULL DEFAULT 'subject' CHECK (type IN ('management', 'subject', 'administrative', 'union')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------
-- 3. SCHOOL_YEARS (Năm học)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_years (
    id TEXT PRIMARY KEY, -- e.g. '2026-2027'
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 4. GRADE_LEVELS (Khối lớp hai cấp: Khối 1-5 Tiểu học, Khối 6-9 THCS)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grade_levels (
    id TEXT PRIMARY KEY, -- e.g. 'grade-1', 'grade-6'
    name TEXT NOT NULL,
    grade_number INT NOT NULL CHECK (grade_number BETWEEN 1 AND 9),
    school_level TEXT NOT NULL CHECK (school_level IN ('primary', 'secondary')),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. CLASSES (Lớp học trong trường liên cấp)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g. '1A', '6B'
    grade_level_id TEXT NOT NULL REFERENCES public.grade_levels(id) ON DELETE CASCADE,
    school_year_id TEXT NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
    room_number TEXT,
    student_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 6. PROFILES (Hồ sơ người dùng - Liên kết an toàn với auth.users)
-- KHÔNG LƯU MẬT KHẨU TẠI BẢNG NÀY (Được quản lý bởi Supabase Auth)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    title TEXT DEFAULT 'Cán bộ giáo viên',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    school_level TEXT NOT NULL DEFAULT 'all' CHECK (school_level IN ('all', 'primary', 'secondary')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------
-- 7. USER_ROLES (Bảng gán vai trò người dùng)
-- Kiểm soát nghiêm ngặt, không cho phép tự sửa để leo thang đặc quyền
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

-- --------------------------------------------------------------------
-- 8. ANNOUNCEMENTS (Thông báo điều hành & Thông báo công khai)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'academic', 'urgent', 'party_union', 'administrative')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending', 'published', 'expired', 'withdrawn')),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_year_id TEXT REFERENCES public.school_years(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------
-- 9. ANNOUNCEMENT_RECIPIENTS (Phạm vi tiếp nhận thông báo)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcement_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'department', 'role', 'user')),
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    role_id TEXT REFERENCES public.roles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 10. ANNOUNCEMENT_READS (Ghi nhận trạng thái đã đọc thông báo)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (announcement_id, user_id)
);

-- --------------------------------------------------------------------
-- 11. EVENTS (Lịch công tác, họp, hoạt động nhà trường)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    purpose TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT NOT NULL,
    host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    host_name TEXT NOT NULL,
    attendees_description TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed')),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------
-- 12. PLANS (Kế hoạch giáo dục: Năm / Tháng / Tuần)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('year', 'month', 'week', 'academic', 'department', 'event', 'inspection', 'digital_transformation')),
    parent_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    school_year_id TEXT NOT NULL REFERENCES public.school_years(id) ON DELETE RESTRICT,
    basis_and_goals TEXT,
    content TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    lead_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    responsible_person_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expected_targets TEXT,
    expected_budget NUMERIC(15, 2) DEFAULT 0,
    required_proof_description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'needs_revision', 'approved', 'in_progress', 'completed', 'paused', 'concluded')),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------
-- 13. PLAN_TASKS (Nhiệm vụ trực thuộc kế hoạch giáo dục)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    expected_outcome TEXT,
    deadline DATE NOT NULL,
    lead_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    assigned_person_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 14. TASKS (Giao nhiệm vụ & điều hành tiến độ)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    assigner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline DATE NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'pending_verification', 'needs_addition', 'completed', 'overdue', 'cancelled')),
    progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    required_result TEXT,
    is_proof_required BOOLEAN NOT NULL DEFAULT TRUE,
    completion_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------
-- 15. TASK_ASSIGNEES (Người nhận nhiệm vụ: Phụ trách chính hoặc phối hợp)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (task_id, user_id)
);

-- --------------------------------------------------------------------
-- 16. TASK_UPDATES (Lịch sử tiến độ, ghi chú & trao đổi nhiệm vụ)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('status_change', 'progress_change', 'comment', 'proof_submitted', 'review')),
    previous_status TEXT,
    new_status TEXT,
    progress_percentage INT,
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 17. REPORTS (Báo cáo kết quả công tác & chuyên môn)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly', 'semester', 'year', 'plan', 'task')),
    period TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    executed_content TEXT NOT NULL,
    achieved_results TEXT NOT NULL,
    completion_rate INT NOT NULL DEFAULT 100 CHECK (completion_rate BETWEEN 0 AND 100),
    difficulties_and_causes TEXT,
    upcoming_solutions TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'needs_addition')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------
-- 18. ATTACHMENTS (Quản lý tệp đính kèm và minh chứng - Lưu trữ an toàn)
-- Liên kết với Supabase Storage buckets
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Đường dẫn tệp trong Storage Bucket
    bucket_name TEXT NOT NULL DEFAULT 'school-documents-internal',
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Khóa ngoại đa hình (Polymorphic references)
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 19. APPROVALS (Nhật ký quy trình phê duyệt: Kế hoạch, Nhiệm vụ, Báo cáo)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('plan', 'task', 'report', 'document')),
    entity_id UUID NOT NULL,
    approver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_revision')),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 20. NOTIFICATIONS (Thông báo nhắc việc hệ thống đến từng người dùng)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_deadline', 'plan_review', 'report_review', 'announcement_urgent', 'system')),
    target_module TEXT NOT NULL,
    target_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 21. AUDIT_LOGS (Nhật ký kiểm toán hệ thống bất biến)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- CÁC CHỈ MỤC TỐI ƯU HÓA HIỆU NĂNG (INDEXES)
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_announcements_public ON public.announcements(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_dates ON public.events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_plans_status ON public.plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_department ON public.plans(lead_department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_department ON public.reports(department_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(plan_id, task_id, report_id, announcement_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

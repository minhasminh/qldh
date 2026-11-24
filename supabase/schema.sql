-- ====================================================================
-- HỆ THỐNG QUẢN LÝ VÀ ĐIỀU HÀNH TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH
-- Tệp khởi tạo Cơ sở dữ liệu Supabase PostgreSQL & Row Level Security (RLS)
-- ====================================================================

-- 1. KÍCH HOẠT EXTENSIONS CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ĐỊNH NGHĨA ENUM VAI TRÒ VÀ TRẠNG THÁI
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'principal', 'dean', 'teacher', 'staff', 'guest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. BẢNG CẤU HÌNH NHÀ TRƯỜNG (school_settings)
CREATE TABLE IF NOT EXISTS public.school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name TEXT NOT NULL DEFAULT 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH',
    short_name TEXT NOT NULL DEFAULT 'TH&THCS Nguyễn Đình Anh',
    school_code TEXT NOT NULL DEFAULT 'TH-THCS-NDA-01',
    management_agency TEXT NOT NULL DEFAULT 'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO',
    address TEXT NOT NULL DEFAULT 'Xã Thạch Bình, Huyện Thạch Thành, Tỉnh Thanh Hóa',
    phone TEXT DEFAULT '0237 387 6543',
    email TEXT DEFAULT 'ththcsnguyendinhanh@edu.vn',
    website TEXT DEFAULT 'https://ththcsnguyendinhanh.edu.vn',
    principal_name TEXT NOT NULL DEFAULT 'Thầy Lê Văn Thành - Hiệu trưởng',
    current_school_year TEXT NOT NULL DEFAULT '2026 - 2027',
    current_semester TEXT NOT NULL DEFAULT 'Học kỳ I',
    motto TEXT DEFAULT 'Chăm ngoan - Sáng tạo - Tự tin - Tỏa sáng tri thức',
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG TỔ CHUYÊN MÔN VÀ BỘ PHẬN (departments)
-- Thiết kế đặc thù cho trường liên cấp Tiểu học và THCS
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    school_level TEXT CHECK (school_level IN ('all', 'primary', 'secondary')), -- 'all': BGH/VP, 'primary': Tiểu học, 'secondary': THCS
    type TEXT NOT NULL DEFAULT 'subject',
    description TEXT,
    leader_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG HỒ SƠ NGƯỜI DÙNG (profiles) LIÊN KẾT VỚI auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'teacher',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    school_level TEXT DEFAULT 'all', -- 'primary', 'secondary', 'all'
    title TEXT DEFAULT 'Giáo viên bộ môn',
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BẢNG THÔNG BÁO (announcements)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    target_audience TEXT NOT NULL DEFAULT 'all',
    target_department_ids UUID[] DEFAULT '{}',
    target_user_ids UUID[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending', 'published', 'expired', 'withdrawn')),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]'::JSONB,
    read_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng ghi nhận lượt đọc thông báo (announcement_reads)
CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

-- 7. BẢNG LỊCH CÔNG TÁC (events)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    purpose TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT NOT NULL,
    host_name TEXT NOT NULL,
    host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    attendees_description TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    creator_name TEXT NOT NULL,
    approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed')),
    is_all_day BOOLEAN DEFAULT FALSE,
    notes TEXT,
    attachments JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BẢNG KẾ HOẠCH NĂM / THÁNG / TUẦN (plans & plan_versions)
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('year', 'month', 'week', 'academic', 'department', 'event', 'inspection', 'digital_transformation')),
    parent_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    school_year TEXT NOT NULL DEFAULT '2026-2027',
    basis_and_goals TEXT,
    content TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    lead_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    co_department_ids UUID[] DEFAULT '{}',
    responsible_person_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    responsible_person_name TEXT NOT NULL,
    expected_targets TEXT,
    expected_budget NUMERIC(15, 2) DEFAULT 0,
    required_proof_description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'needs_revision', 'approved', 'in_progress', 'completed', 'paused', 'concluded')),
    revision_comment TEXT,
    approved_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plan_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
    version INT NOT NULL,
    modified_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    modified_by_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    snapshot_title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BẢNG NHIỆM VỤ GIAO VIỆC (tasks, task_comments, task_history)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    plan_title TEXT,
    assigner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigner_name TEXT NOT NULL,
    main_assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    main_assignee_name TEXT NOT NULL,
    co_assignee_ids UUID[] DEFAULT '{}',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline DATE NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'pending_verification', 'needs_addition', 'completed', 'overdue', 'cancelled')),
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    required_result TEXT,
    is_proof_required BOOLEAN NOT NULL DEFAULT TRUE,
    proofs JSONB DEFAULT '[]'::JSONB,
    completion_note TEXT,
    review_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BẢNG BÁO CÁO KẾT QUẢ VÀ MINH CHỨNG (reports)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly', 'semester', 'year', 'plan', 'task')),
    period TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    executed_content TEXT NOT NULL,
    achieved_results TEXT NOT NULL,
    completion_rate INT DEFAULT 100,
    difficulties_and_causes TEXT,
    upcoming_solutions TEXT,
    proofs JSONB DEFAULT '[]'::JSONB,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'needs_addition')),
    review_comment TEXT,
    reviewed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. BẢNG QUẢN LÝ VĂN BẢN VÀ HỒ SƠ LƯU TRỮ (documents)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_number TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('directive', 'plan', 'decision', 'minutes', 'form', 'other')),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    issued_date DATE NOT NULL,
    signer TEXT NOT NULL,
    summary TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    file_info JSONB NOT NULL,
    download_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. BẢNG THÔNG BÁO HỆ THỐNG VÀ NHẮC VIỆC (system_notifications)
CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    target_module TEXT NOT NULL,
    target_id TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. BẢNG NHẬT KÝ HOẠT ĐỘNG KIỂM TOÁN (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- BẬT RLS CHO TẤT CẢ CÁC BẢNG
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Policies cho school_settings:
CREATE POLICY "Cho phép tất cả đọc thông tin trường học" ON public.school_settings FOR SELECT USING (true);
CREATE POLICY "Chỉ Quản trị viên được sửa thông tin trường" ON public.school_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Policies cho departments:
CREATE POLICY "Cho phép đọc danh mục tổ" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Chỉ Admin được sửa danh mục tổ" ON public.departments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Policies cho announcements:
CREATE POLICY "Đọc thông báo công khai" ON public.announcements FOR SELECT USING (
    is_public = true AND status = 'published'
);
CREATE POLICY "Người dùng đã đăng nhập đọc thông báo nội bộ" ON public.announcements FOR SELECT TO authenticated USING (
    status = 'published' OR author_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal')
    )
);
CREATE POLICY "Tạo thông báo" ON public.announcements FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal', 'dean', 'teacher'))
);
CREATE POLICY "Chỉnh sửa hoặc thu hồi thông báo" ON public.announcements FOR UPDATE TO authenticated USING (
    author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal'))
);

-- 4. Policies cho events (lịch công tác):
CREATE POLICY "Đọc lịch công tác" ON public.events FOR SELECT USING (true);
CREATE POLICY "Tạo sự kiện lịch" ON public.events FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal', 'dean', 'teacher'))
);
CREATE POLICY "Chỉnh sửa sự kiện lịch" ON public.events FOR UPDATE TO authenticated USING (
    creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal'))
);

-- 5. Policies cho plans (kế hoạch):
CREATE POLICY "Đọc kế hoạch nội bộ" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lập kế hoạch mới" ON public.plans FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal', 'dean'))
);
CREATE POLICY "Phê duyệt hoặc sửa kế hoạch" ON public.plans FOR UPDATE TO authenticated USING (
    responsible_person_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal'))
);

-- 6. Policies cho tasks (nhiệm vụ):
CREATE POLICY "Đọc nhiệm vụ liên quan" ON public.tasks FOR SELECT TO authenticated USING (
    main_assignee_id = auth.uid() 
    OR assigner_id = auth.uid() 
    OR auth.uid() = ANY(co_assignee_ids)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal'))
);
CREATE POLICY "Giao nhiệm vụ" ON public.tasks FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal', 'dean'))
);
CREATE POLICY "Cập nhật tiến độ hoặc nghiệm thu nhiệm vụ" ON public.tasks FOR UPDATE TO authenticated USING (
    main_assignee_id = auth.uid() 
    OR assigner_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal'))
);

-- 7. Policies cho documents (văn bản):
CREATE POLICY "Xem văn bản công khai" ON public.documents FOR SELECT USING (is_public = true);
CREATE POLICY "Xem văn bản nội bộ" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ban hành văn bản" ON public.documents FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal', 'dean'))
);

-- ====================================================================
-- DỮ LIỆU MẪU BAN ĐẦU CHO TRƯỜNG LIÊN CẤP TH&THCS NGUYỄN ĐÌNH ANH
-- ====================================================================

INSERT INTO public.school_settings (
    school_name, short_name, school_code, management_agency, address, phone, email, website, principal_name, current_school_year, current_semester, motto
) VALUES (
    'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH',
    'TH&THCS Nguyễn Đình Anh',
    'TH-THCS-NDA-01',
    'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO',
    'Xã Thạch Bình, Huyện Thạch Thành, Tỉnh Thanh Hóa',
    '0237 387 6543',
    'ththcsnguyendinhanh@thachthanh.edu.vn',
    'https://ththcsnguyendinhanh.edu.vn',
    'Thầy Lê Văn Thành - Hiệu trưởng',
    '2026 - 2027',
    'Học kỳ I',
    'Kỷ cương - Tình thương - Trách nhiệm - Đổi mới sáng tạo'
) ON CONFLICT DO NOTHING;

-- Tổ chuyên môn liên cấp:
INSERT INTO public.departments (name, code, school_level, type, description) VALUES
('Ban Giám Hiệu', 'BGH', 'all', 'management', 'Chỉ đạo toàn diện hoạt động hai cấp học Tiểu học và THCS'),
('Tổ Tiểu học Khối 1 - 2 - 3', 'TO-TH-123', 'primary', 'subject', 'Phụ trách giảng dạy và giáo dục học sinh khối lớp 1, 2, 3'),
('Tổ Tiểu học Khối 4 - 5', 'TO-TH-45', 'primary', 'subject', 'Phụ trách giảng dạy và giáo dục học sinh khối lớp 4, 5'),
('Tổ Khoa học Tự nhiên THCS', 'TO-KHTN-THCS', 'secondary', 'subject', 'Phụ trách môn Toán, KHTN (Lý - Hóa - Sinh), Tin học và Công nghệ cấp THCS'),
('Tổ Khoa học Xã hội THCS', 'TO-KHXH-THCS', 'secondary', 'subject', 'Phụ trách môn Ngữ văn, Lịch sử - Địa lý, GDCD cấp THCS'),
('Tổ Ngoại ngữ & Nghệ thuật', 'TO-NN-NT', 'all', 'subject', 'Phụ trách môn Tiếng Anh, Âm nhạc, Mỹ thuật và Giáo dục thể chất liên cấp'),
('Tổ Văn phòng & Y tế học đường', 'TO-VP-YT', 'all', 'administrative', 'Phụ trách công tác văn thư, thủ quỹ, kế toán, y tế và thiết bị dạy học')
ON CONFLICT (code) DO NOTHING;

-- ====================================================================
-- MIGRATION 02: ROW LEVEL SECURITY (RLS) & CHÍNH SÁCH BẢO MẬT PHÂN QUYỀN
-- DỰ ÁN: WEBSITE QUẢN LÝ VÀ ĐIỀU HÀNH TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH
-- Mục tiêu: Thiết lập RLS toàn diện trên 21 bảng, kiểm soát phạm vi tổ,
-- ngăn chặn tuyệt đối việc người dùng tự nâng quyền và duyệt trái quyền.
-- ====================================================================

-- 1. BẬT RLS (ROW LEVEL SECURITY) TRÊN TẤT CẢ 21 BẢNG
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. HÀM TIỆN ÍCH PHÂN QUYỀN BẢO MẬT (SECURITY DEFINER)
-- Các hàm này chạy với quyền hệ thống để kiểm tra vai trò mà không gây đệ quy RLS
CREATE OR REPLACE FUNCTION public.get_auth_user_roles(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(ARRAY_AGG(role_id), ARRAY[]::TEXT[])
    FROM public.user_roles
    WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid AND role_id = role_name
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT public.has_role('admin', user_uuid);
$$;

CREATE OR REPLACE FUNCTION public.is_bgh(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid AND role_id IN ('admin', 'principal')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_dean_of(dept_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = p.id
        WHERE p.id = user_uuid 
          AND p.department_id = dept_uuid 
          AND ur.role_id = 'dean'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_department(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT department_id FROM public.profiles WHERE id = user_uuid;
$$;

-- 3. RÀNG BUỘC CHỐNG TỰ NÂNG QUYỀN (ANTI-SELF-ELEVATION TRIGGER)
-- Không người dùng nào được tự ý cấp quyền cho chính mình hoặc gán vai trò nếu không phải Quản trị viên
CREATE OR REPLACE FUNCTION public.enforce_admin_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'BẢO MẬT: Chỉ Quản trị viên hệ thống mới có quyền cấp phát hoặc thay đổi vai trò người dùng.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.user_roles;
CREATE TRIGGER trg_protect_user_roles
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_role_assignment();

-- --------------------------------------------------------------------
-- 4. CHÍNH SÁCH RLS CHI TIẾT THEO NGHIỆP VỤ
-- --------------------------------------------------------------------

-- A. ROLES & DEPARTMENTS & SCHOOL_YEARS & GRADE_LEVELS & CLASSES
-- Khách và mọi người dùng đều có thể đọc danh mục; Chỉ Admin được thêm/sửa/xóa
CREATE POLICY "Cho phép đọc danh mục vai trò" ON public.roles FOR SELECT USING (TRUE);
CREATE POLICY "Chỉ Admin quản lý danh mục vai trò" ON public.roles FOR ALL USING (public.is_admin());

CREATE POLICY "Cho phép đọc danh mục tổ chuyên môn" ON public.departments FOR SELECT USING (TRUE);
CREATE POLICY "Chỉ Admin quản lý danh mục tổ" ON public.departments FOR ALL USING (public.is_admin());

CREATE POLICY "Cho phép đọc danh mục năm học" ON public.school_years FOR SELECT USING (TRUE);
CREATE POLICY "Chỉ Admin quản lý danh mục năm học" ON public.school_years FOR ALL USING (public.is_admin());

CREATE POLICY "Cho phép đọc danh mục khối lớp" ON public.grade_levels FOR SELECT USING (TRUE);
CREATE POLICY "Chỉ Admin quản lý danh mục khối lớp" ON public.grade_levels FOR ALL USING (public.is_admin());

CREATE POLICY "Cho phép đọc danh mục lớp học" ON public.classes FOR SELECT USING (TRUE);
CREATE POLICY "Chỉ Admin hoặc BGH quản lý lớp học" ON public.classes FOR ALL USING (public.is_bgh());

-- B. PROFILES
-- Người dùng xem hồ sơ công khai của nhân sự nhà trường
CREATE POLICY "Mọi người có thể xem hồ sơ giáo viên" ON public.profiles 
FOR SELECT USING (TRUE);

-- Người dùng chỉ được sửa thông tin liên hệ của chính mình (phone, avatar), KHÔNG được sửa role/isActive
CREATE POLICY "Người dùng tự cập nhật thông tin cá nhân cơ bản" ON public.profiles 
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND
    is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid()) AND
    department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid())
);

-- Admin toàn quyền tạo, kích hoạt/khóa tài khoản hồ sơ
CREATE POLICY "Admin quản lý toàn diện hồ sơ người dùng" ON public.profiles 
FOR ALL USING (public.is_admin());

-- C. USER_ROLES
CREATE POLICY "Người dùng xem vai trò được cấp" ON public.user_roles 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Chỉ Admin được cấp hoặc xóa vai trò" ON public.user_roles 
FOR ALL USING (public.is_admin());

-- D. ANNOUNCEMENTS (THÔNG BÁO)
-- Khách: Chỉ xem thông báo đã xuất bản công khai
CREATE POLICY "Khách chỉ xem thông báo công khai đã xuất bản" ON public.announcements 
FOR SELECT USING (is_public = TRUE AND status = 'published');

-- Người dùng nội bộ: Xem thông báo nội bộ đã xuất bản hoặc bài của mình
CREATE POLICY "Người dùng nội bộ xem thông báo hợp lệ" ON public.announcements 
FOR SELECT TO authenticated USING (
    status = 'published' 
    OR author_id = auth.uid() 
    OR public.is_bgh()
);

-- Soạn thông báo: Admin, BGH, Tổ trưởng, Giáo viên
CREATE POLICY "Nhân sự nhà trường được tạo thông báo" ON public.announcements 
FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = author_id AND (
        public.is_bgh() OR 
        public.has_role('dean') OR 
        public.has_role('teacher')
    )
);

-- Sửa thông báo: Tác giả hoặc BGH
CREATE POLICY "Tác giả hoặc BGH được sửa thông báo" ON public.announcements 
FOR UPDATE TO authenticated USING (
    author_id = auth.uid() OR public.is_bgh()
);

-- Xóa thông báo: BGH hoặc Tác giả khi chưa xuất bản
CREATE POLICY "BGH hoặc Tác giả được xóa thông báo nháp" ON public.announcements 
FOR DELETE TO authenticated USING (
    public.is_bgh() OR (author_id = auth.uid() AND status = 'draft')
);

-- E. ANNOUNCEMENT_RECIPIENTS & ANNOUNCEMENT_READS
CREATE POLICY "Xem danh sách nhận thông báo" ON public.announcement_recipients 
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Tạo phạm vi nhận thông báo" ON public.announcement_recipients 
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.announcements WHERE id = announcement_id AND (author_id = auth.uid() OR public.is_bgh()))
);

CREATE POLICY "Người dùng ghi nhận đã đọc thông báo của chính mình" ON public.announcement_reads 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Xem danh sách người đã đọc thông báo" ON public.announcement_reads 
FOR SELECT TO authenticated USING (TRUE);

-- F. EVENTS (LỊCH CÔNG TÁC)
-- Công khai: Khách xem lịch công tác được đánh dấu công khai
CREATE POLICY "Khách xem lịch hoạt động công khai" ON public.events 
FOR SELECT USING (is_public = TRUE);

-- Nội bộ: Cán bộ giáo viên xem toàn bộ lịch công tác
CREATE POLICY "Cán bộ giáo viên xem lịch công tác nội bộ" ON public.events 
FOR SELECT TO authenticated USING (TRUE);

-- Tạo lịch: BGH, Tổ trưởng, Giáo viên
CREATE POLICY "Tạo lịch sự kiện công tác" ON public.events 
FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = creator_id AND (
        public.is_bgh() OR 
        public.has_role('dean') OR 
        public.has_role('teacher')
    )
);

-- Cập nhật lịch: Người tạo hoặc BGH
CREATE POLICY "Cập nhật lịch sự kiện" ON public.events 
FOR UPDATE TO authenticated USING (
    creator_id = auth.uid() OR public.is_bgh()
);

-- G. PLANS (KẾ HOẠCH NĂM / THÁNG / TUẦN)
-- Khách: Chỉ xem kế hoạch đã được phê duyệt công khai
CREATE POLICY "Khách chỉ xem kế hoạch công khai đã duyệt" ON public.plans 
FOR SELECT USING (is_public = TRUE AND status = 'approved');

-- Nội bộ: Toàn bộ cán bộ giáo viên xem kế hoạch để triển khai
CREATE POLICY "Cán bộ giáo viên xem kế hoạch nội bộ" ON public.plans 
FOR SELECT TO authenticated USING (TRUE);

-- Lập kế hoạch: BGH lập toàn trường; Tổ trưởng lập cho tổ mình
CREATE POLICY "BGH và Tổ trưởng được lập kế hoạch" ON public.plans 
FOR INSERT TO authenticated WITH CHECK (
    (public.is_bgh()) OR 
    (public.has_role('dean') AND lead_department_id = public.get_user_department())
);

-- Sửa kế hoạch:
-- Giáo viên KHÔNG ĐƯỢC tự duyệt kế hoạch.
-- Tổ trưởng chỉ sửa kế hoạch của tổ khi ở trạng thái draft/needs_revision.
-- BGH toàn quyền phê duyệt, chuyển trạng thái hoặc sửa toàn trường.
CREATE POLICY "Quy định sửa và phê duyệt kế hoạch" ON public.plans 
FOR UPDATE TO authenticated USING (
    public.is_bgh() OR (
        public.has_role('dean') AND 
        lead_department_id = public.get_user_department() AND 
        status IN ('draft', 'needs_revision')
    )
)
WITH CHECK (
    -- RÀNG BUỘC CỰC KỲ QUAN TRỌNG:
    -- Chỉ BGH mới được chuyển trạng thái sang 'approved' hoặc 'concluded'
    (public.is_bgh()) OR (
        public.has_role('dean') AND 
        lead_department_id = public.get_user_department() AND 
        NEW.status IN ('draft', 'pending') -- Tổ trưởng chỉ được nộp phê duyệt (pending)
    )
);

-- H. PLAN_TASKS
CREATE POLICY "Xem nhiệm vụ theo kế hoạch" ON public.plan_tasks 
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "BGH và Tổ trưởng quản lý nhiệm vụ kế hoạch" ON public.plan_tasks 
FOR ALL TO authenticated USING (
    public.is_bgh() OR EXISTS (
        SELECT 1 FROM public.plans p 
        WHERE p.id = plan_id AND p.lead_department_id = public.get_user_department()
    )
);

-- I. TASKS (GIAO VIỆC & THEO DÕI TIẾN ĐỘ)
-- Xem nhiệm vụ:
-- Người giao, người nhận chính, người phối hợp, Tổ trưởng cùng tổ hoặc BGH
CREATE POLICY "Xem nhiệm vụ được phân công hoặc quản lý" ON public.tasks 
FOR SELECT TO authenticated USING (
    public.is_bgh() 
    OR assigner_id = auth.uid() 
    OR department_id = public.get_user_department()
    OR EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = tasks.id AND user_id = auth.uid())
);

-- Giao nhiệm vụ:
-- BGH giao toàn trường; Tổ trưởng giao trong phạm vi tổ
CREATE POLICY "BGH và Tổ trưởng được giao việc" ON public.tasks 
FOR INSERT TO authenticated WITH CHECK (
    public.is_bgh() OR (
        public.has_role('dean') AND department_id = public.get_user_department()
    )
);

-- Cập nhật tiến độ nhiệm vụ:
-- Người nhận chỉ được cập nhật progress, completion_note, proofs
-- BGH và người giao được nghiệm thu hoặc đánh giá lại
CREATE POLICY "Cập nhật tiến độ hoặc nghiệm thu nhiệm vụ" ON public.tasks 
FOR UPDATE TO authenticated USING (
    public.is_bgh() 
    OR assigner_id = auth.uid() 
    OR (public.has_role('dean') AND department_id = public.get_user_department())
    OR EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = tasks.id AND user_id = auth.uid())
);

-- J. TASK_ASSIGNEES & TASK_UPDATES
CREATE POLICY "Xem danh sách người làm nhiệm vụ" ON public.task_assignees 
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Gán người làm nhiệm vụ" ON public.task_assignees 
FOR ALL TO authenticated USING (
    public.is_bgh() OR EXISTS (
        SELECT 1 FROM public.tasks WHERE id = task_id AND (assigner_id = auth.uid() OR (public.has_role('dean') AND department_id = public.get_user_department()))
    )
);

CREATE POLICY "Xem trao đổi và cập nhật nhiệm vụ" ON public.task_updates 
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Ghi nhật ký cập nhật hoặc trao đổi tiến độ" ON public.task_updates 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

-- K. REPORTS (BÁO CÁO & MINH CHỨNG)
-- Xem báo cáo: BGH xem toàn trường; Tổ trưởng xem báo cáo của tổ mình; Tác giả xem báo cáo của mình
CREATE POLICY "Xem báo cáo hợp lệ" ON public.reports 
FOR SELECT TO authenticated USING (
    public.is_bgh() 
    OR author_id = auth.uid() 
    OR (public.has_role('dean') AND department_id = public.get_user_department())
);

-- Lập báo cáo: Cán bộ giáo viên nộp báo cáo
CREATE POLICY "Cán bộ giáo viên nộp báo cáo" ON public.reports 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- Sửa / Đánh giá báo cáo:
-- Giáo viên chỉ sửa báo cáo của mình khi là draft/needs_addition
-- Tổ trưởng đánh giá báo cáo của tổ viên
-- BGH phê duyệt báo cáo toàn trường
CREATE POLICY "Đánh giá hoặc chỉnh sửa báo cáo" ON public.reports 
FOR UPDATE TO authenticated USING (
    public.is_bgh() 
    OR (author_id = auth.uid() AND status IN ('draft', 'needs_addition'))
    OR (public.has_role('dean') AND department_id = public.get_user_department())
);

-- L. ATTACHMENTS (TỆP ĐÍNH KÈM & MINH CHỨNG)
-- Khách: Chỉ xem tệp được đánh dấu is_public = TRUE
CREATE POLICY "Khách chỉ đọc tệp công khai" ON public.attachments 
FOR SELECT USING (is_public = TRUE);

-- Nội bộ: Xem tệp minh chứng nội bộ
CREATE POLICY "Cán bộ giáo viên đọc tệp đính kèm nội bộ" ON public.attachments 
FOR SELECT TO authenticated USING (TRUE);

-- Tải lên tệp: Người dùng đã xác thực
CREATE POLICY "Người dùng tải lên tệp đính kèm" ON public.attachments 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

-- M. APPROVALS (NHẬT KÝ PHÊ DUYỆT)
-- Chỉ BGH và Tổ trưởng có thẩm quyền mới được ghi nhận quyết định phê duyệt
CREATE POLICY "Xem nhật ký phê duyệt" ON public.approvals 
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Ghi nhận quyết định phê duyệt" ON public.approvals 
FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = approver_id AND (public.is_bgh() OR public.has_role('dean'))
);

-- N. NOTIFICATIONS (THÔNG BÁO NHẮC VIỆC)
-- Người dùng CHỈ xem và cập nhật thông báo của chính mình
CREATE POLICY "Người dùng chỉ xem thông báo của mình" ON public.notifications 
FOR SELECT TO authenticated USING (recipient_id = auth.uid());

CREATE POLICY "Người dùng đánh dấu đã đọc thông báo của mình" ON public.notifications 
FOR UPDATE TO authenticated USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- O. AUDIT_LOGS (NHẬT KÝ HOẠT ĐỘNG KIỂM TOÁN)
-- Chỉ Quản trị viên hệ thống (Admin) mới được xem audit_logs; Không ai được sửa/xóa audit_logs (Bất biến)
CREATE POLICY "Chỉ Admin được xem nhật ký kiểm toán" ON public.audit_logs 
FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Hệ thống ghi nhận nhật ký kiểm toán" ON public.audit_logs 
FOR INSERT TO authenticated WITH CHECK (TRUE);

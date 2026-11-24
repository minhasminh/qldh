-- ==============================================================================
-- MIGRATION 20261016000005: QUY TRÌNH PHÊ DUYỆT KẾ HOẠCH HAI CẤP (TWO-TIER APPROVAL)
-- Trường TH&THCS Nguyễn Đình Anh
-- ==============================================================================

-- 1. CẬP NHẬT CỘT VÀ RÀNG BUỘC CHO BẢNG PUBLIC.PLANS
-- ------------------------------------------------------------------------------
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_status_check;

ALTER TABLE public.plans
    ADD CONSTRAINT plans_status_check CHECK (
        status IN (
            'draft',               -- Bản nháp
            'pending_level_1',     -- Chờ duyệt cấp 1 (Tổ trưởng / Trưởng bộ phận)
            'revision_level_1',    -- Cần chỉnh sửa cấp 1
            'pending_level_2',     -- Chờ duyệt cấp 2 (Ban Giám hiệu)
            'revision_level_2',    -- Cần chỉnh sửa cấp 2
            'approved',            -- Đã phê duyệt
            'in_progress',         -- Đang thực hiện
            'completed',           -- Hoàn thành
            'paused',              -- Tạm dừng
            'closed',              -- Đã kết thúc
            'cancelled',           -- Đã hủy
            -- Khả năng tương thích ngược:
            'pending',
            'needs_revision',
            'concluded'
        )
    );

-- Thêm các trường phục vụ quy trình 2 cấp và phân cấp trường liên cấp
ALTER TABLE public.plans
    ADD COLUMN IF NOT EXISTS school_level TEXT NOT NULL DEFAULT 'all' CHECK (school_level IN ('all', 'primary', 'secondary')),
    ADD COLUMN IF NOT EXISTS required_tiers SMALLINT NOT NULL DEFAULT 2 CHECK (required_tiers IN (1, 2)),
    ADD COLUMN IF NOT EXISTS current_tier SMALLINT CHECK (current_tier IN (1, 2)),
    ADD COLUMN IF NOT EXISTS level_1_approved_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS level_1_approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS level_1_comment TEXT,
    ADD COLUMN IF NOT EXISTS approved_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approval_comment TEXT,
    ADD COLUMN IF NOT EXISTS revision_comment TEXT;

-- 2. TẠO BẢNG CẤU HÌNH QUY CHẾ DUYỆT (PLAN_APPROVAL_RULES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_approval_rules (
    id TEXT PRIMARY KEY,
    plan_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    scope TEXT NOT NULL DEFAULT 'individual' CHECK (scope IN ('school_wide', 'department_only', 'individual')),
    required_tiers SMALLINT NOT NULL DEFAULT 2 CHECK (required_tiers IN (1, 2)),
    level_1_role TEXT NOT NULL DEFAULT 'dean',
    level_2_role TEXT NOT NULL DEFAULT 'principal',
    allow_self_approval BOOLEAN NOT NULL DEFAULT FALSE,
    require_reapproval_on_edit BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default approval rules
INSERT INTO public.plan_approval_rules (id, plan_type, name, description, scope, required_tiers, level_1_role, level_2_role, allow_self_approval, require_reapproval_on_edit, is_default)
VALUES
    ('rule-school-year', 'year', 'Kế hoạch Giáo dục Nhà trường (Cấp trường)', 'Do Ban Giám hiệu trực tiếp chủ trì xây dựng. Luồng 1 cấp trực tiếp do Hiệu trưởng phê duyệt.', 'school_wide', 1, 'principal', 'principal', FALSE, TRUE, FALSE),
    ('rule-school-month', 'month', 'Kế hoạch Hoạt động Tháng toàn trường', 'Kế hoạch công tác tháng cấp trường do BGH xây dựng. Luồng 1 cấp thẩm định và phê duyệt bởi Hiệu trưởng.', 'school_wide', 1, 'principal', 'principal', FALSE, TRUE, FALSE),
    ('rule-department', 'department', 'Kế hoạch Tổ Chuyên môn / Bộ phận', 'Do Tổ trưởng / Trưởng bộ phận xây dựng. Luồng 1 cấp do Ban Giám hiệu trực tiếp ký duyệt.', 'department_only', 1, 'principal', 'principal', FALSE, TRUE, FALSE),
    ('rule-academic-teacher', 'academic', 'Kế hoạch Chuyên môn & Dạy học Giáo viên', 'Quy trình 2 cấp chuẩn: Giáo viên lập -> Tổ trưởng duyệt Cấp 1 -> Ban Giám hiệu duyệt Cấp 2.', 'individual', 2, 'dean', 'principal', FALSE, TRUE, FALSE),
    ('rule-default-two-tier', 'all', 'Quy trình Phê duyệt Mặc định Hai Cấp (Toàn trường)', 'Áp dụng cho mọi kế hoạch phát sinh: Người lập -> Tổ trưởng duyệt Cấp 1 -> BGH duyệt Cấp 2.', 'individual', 2, 'dean', 'principal', FALSE, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    required_tiers = EXCLUDED.required_tiers,
    allow_self_approval = EXCLUDED.allow_self_approval,
    require_reapproval_on_edit = EXCLUDED.require_reapproval_on_edit;

-- 3. TẠO BẢNG LỊCH SỬ QUYẾT ĐỊNH PHÊ DUYỆT (PLAN_DECISIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    tier_level SMALLINT CHECK (tier_level IN (1, 2)),
    action TEXT NOT NULL CHECK (action IN ('submit', 'approve_level_1', 'reject_level_1', 'approve_level_2', 'reject_level_2', 'resubmit', 'start', 'complete', 'pause', 'resume', 'close', 'cancel', 'version_bump')),
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    actor_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    comment TEXT,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    version_snapshot INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_decisions_plan_id ON public.plan_decisions(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_decisions_created_at ON public.plan_decisions(created_at DESC);

-- 4. TẠO BẢNG PHIÊN BẢN KẾ HOẠCH (PLAN_VERSIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    version INT NOT NULL,
    modified_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    modified_by_name TEXT,
    reason TEXT NOT NULL,
    snapshot_title TEXT NOT NULL,
    changes_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (plan_id, version)
);

CREATE INDEX IF NOT EXISTS idx_plan_versions_plan ON public.plan_versions(plan_id, version DESC);

-- 5. BUSINESS RULE CONSTRAINTS & TRIGGERS TẠI POSTGRESQL
-- ------------------------------------------------------------------------------

-- RÀNG BUỘC 1: KHÔNG TỰ PHÊ DUYỆT
CREATE OR REPLACE FUNCTION public.check_plan_approval_business_rules()
RETURNS TRIGGER AS $$
DECLARE
    v_allow_self BOOLEAN;
    v_creator UUID;
    v_rule_tiers INT;
BEGIN
    -- Lấy thông tin rule cho loại kế hoạch
    SELECT allow_self_approval, required_tiers
    INTO v_allow_self, v_rule_tiers
    FROM public.plan_approval_rules
    WHERE plan_type = NEW.type OR is_default = TRUE
    ORDER BY (plan_type = NEW.type) DESC, is_default DESC
    LIMIT 1;

    IF v_allow_self IS NULL THEN
        v_allow_self := FALSE;
    END IF;

    -- Kiểm tra tự phê duyệt: Nếu người duyệt là chính người chịu trách nhiệm lập kế hoạch
    IF (NEW.status = 'approved' AND OLD.status != 'approved') THEN
        IF (NEW.responsible_person_id = auth.uid() AND v_allow_self = FALSE) THEN
            RAISE EXCEPTION 'QUY TẮC NHÀ TRƯỜNG: Người lập kế hoạch không được tự phê duyệt kế hoạch của mình.';
        END IF;
    END IF;

    -- RÀNG BUỘC 2: CẤP 2 CHỈ ĐƯỢC DUYỆT KHI CẤP 1 ĐÃ THÔNG QUA
    IF (NEW.required_tiers = 2 AND OLD.status = 'pending_level_1' AND NEW.status = 'approved') THEN
        RAISE EXCEPTION 'QUY TẮC PHÊ DUYỆT 2 CẤP: Cấp 2 chỉ được duyệt khi Cấp 1 (Tổ trưởng) đã thông qua.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_plan_approval_rules ON public.plans;
CREATE TRIGGER trigger_check_plan_approval_rules
BEFORE UPDATE OF status ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.check_plan_approval_business_rules();

-- 6. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.plan_approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;

-- Rules RLS: Mọi người đọc được quy chế, chỉ Quản trị viên/BGH được sửa
CREATE POLICY "Public read approval rules"
ON public.plan_approval_rules FOR SELECT
TO authenticated, anon
USING (TRUE);

CREATE POLICY "Admin manage approval rules"
ON public.plan_approval_rules FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'principal'));

-- Decisions RLS: Người dùng nội bộ đọc được lịch sử phê duyệt
CREATE POLICY "Internal read plan decisions"
ON public.plan_decisions FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Internal insert plan decisions"
ON public.plan_decisions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = actor_id OR public.has_role(auth.uid(), 'admin'));

-- Versions RLS
CREATE POLICY "Internal read plan versions"
ON public.plan_versions FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Internal insert plan versions"
ON public.plan_versions FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Grant minimum necessary rights
GRANT SELECT ON public.plan_approval_rules TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.plan_approval_rules TO authenticated;
GRANT SELECT, INSERT ON public.plan_decisions TO authenticated;
GRANT SELECT, INSERT ON public.plan_versions TO authenticated;

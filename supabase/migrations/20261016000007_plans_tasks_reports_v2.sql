-- ====================================================================
-- MIGRATION: 20261016000007_plans_tasks_reports_v2.sql
-- Mục đích: Nâng cấp Quản lý Kế hoạch phân cấp hai chiều, Giao việc & Nghiệm thu
-- Tuân thủ chặt chẽ: PROMPT 05 — KẾ HOẠCH NĂM HỌC, THÁNG, TUẦN VÀ QUẢN LÝ NHIỆM VỤ
-- ====================================================================

-- 1. CẬP NHẬT KIỂU KẾ HOẠCH & CỘT CHO BẢNG PLANS
ALTER TABLE public.plans 
  ADD COLUMN IF NOT EXISTS deliverables TEXT,
  ADD COLUMN IF NOT EXISTS actual_outcome TEXT,
  ADD COLUMN IF NOT EXISTS actual_budget NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_source TEXT DEFAULT 'Ngân sách nhà nước',
  ADD COLUMN IF NOT EXISTS completion_rate INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evaluation_comment TEXT;

-- Cập nhật ràng buộc type cho plans để hỗ trợ kế hoạch học kỳ (semester)
ALTER TABLE public.plans 
  DROP CONSTRAINT IF EXISTS plans_type_check;

ALTER TABLE public.plans 
  ADD CONSTRAINT plans_type_check 
  CHECK (type IN ('year', 'semester', 'month', 'week', 'academic', 'department', 'event', 'inspection', 'digital_transformation'));

-- 2. CẬP NHẬT CỘT CHO BẢNG PLAN_TASKS / TASKS
ALTER TABLE public.plan_tasks
  ADD COLUMN IF NOT EXISTS guidance_notes TEXT,
  ADD COLUMN IF NOT EXISTS guidance_attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS challenges_and_proposals TEXT,
  ADD COLUMN IF NOT EXISTS verified_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. RÀNG BUỘC TOÀN VẸN VÀ BẢO VỆ DỮ LIỆU (DATA INTEGRITY TRIGGERS)

-- 3.1. Hạn chế xóa cứng kế hoạch đã được duyệt hoặc đã có kế hoạch con/nhiệm vụ
CREATE OR REPLACE FUNCTION public.check_plan_deletion_guard()
RETURNS TRIGGER AS $$
BEGIN
    -- Chặn xóa kế hoạch đã phê duyệt, đang thực hiện hoặc đã hoàn thành
    IF OLD.status IN ('approved', 'in_progress', 'completed') THEN
        RAISE EXCEPTION 'BẢO MẬT DỮ LIỆU: Kế hoạch đã được phê duyệt hoặc đang triển khai, không được phép xóa cứng. Vui lòng chuyển trạng thái sang Đã hủy.';
    END IF;

    -- Chặn xóa kế hoạch đang chứa kế hoạch con trực thuộc
    IF EXISTS (SELECT 1 FROM public.plans WHERE parent_plan_id = OLD.id) THEN
        RAISE EXCEPTION 'RÀNG BUỘC PHÂN CẤP: Kế hoạch này đang chứa các kế hoạch cấp dưới trực thuộc. Vui lòng xử lý kế hoạch con trước.';
    END IF;

    -- Chặn xóa kế hoạch đã có nhiệm vụ phân công
    IF EXISTS (SELECT 1 FROM public.plan_tasks WHERE plan_id = OLD.id) THEN
        RAISE EXCEPTION 'RÀNG BUỘC NHIỆM VỤ: Kế hoạch này đã có các nhiệm vụ phân công trực thuộc. Không thể xóa kế hoạch đã giao việc.';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_plan_deletion ON public.plans;
CREATE TRIGGER trg_guard_plan_deletion
BEFORE DELETE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.check_plan_deletion_guard();

-- 3.2. Hạn chế xóa cứng nhiệm vụ đã hoàn thành hoặc đã có minh chứng/báo cáo
CREATE OR REPLACE FUNCTION public.check_task_deletion_guard()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('completed', 'pending_verification') THEN
        RAISE EXCEPTION 'BẢO MẬT DỮ LIỆU: Nhiệm vụ đã hoàn thành hoặc đang chờ xác nhận kết quả, không được phép xóa cứng.';
    END IF;

    IF OLD.required_proof_description IS NOT NULL AND OLD.status != 'not_started' THEN
        RAISE EXCEPTION 'BẢO MẬT DỮ LIỆU: Nhiệm vụ đã có tiến độ và minh chứng đính kèm, không thể xóa cứng.';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_task_deletion ON public.plan_tasks;
CREATE TRIGGER trg_guard_task_deletion
BEFORE DELETE ON public.plan_tasks
FOR EACH ROW EXECUTE FUNCTION public.check_task_deletion_guard();

-- 3.3. Quy tắc bắt buộc: Người thực hiện KHÔNG được tự đánh dấu hoàn thành chỉ vì tải tệp lên
CREATE OR REPLACE FUNCTION public.enforce_task_verification_workflow()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu người sửa là người thực hiện (không phải BGH hay người giao việc)
    -- và cố tình chuyển trạng thái sang 'completed' mà không qua duyệt
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        IF NEW.verified_by_id IS NULL THEN
            RAISE EXCEPTION 'QUY TRÌNH NGHIỆM THU: Nhiệm vụ không thể tự động chuyển sang hoàn thành mà phải qua bước gửi báo cáo (chờ xác nhận) và được người quản lý/người giao việc phê duyệt.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_task_verification ON public.plan_tasks;
CREATE TRIGGER trg_enforce_task_verification
BEFORE UPDATE ON public.plan_tasks
FOR EACH ROW EXECUTE FUNCTION public.enforce_task_verification_workflow();

-- 4. VIEW TRUY XUẤT PHÂN CẤP KẾ HOẠCH HAI CHIỀU (TWO-WAY PLAN HIERARCHY VIEW)
CREATE OR REPLACE VIEW public.plan_hierarchy_view AS
SELECT 
    p.id AS plan_id,
    p.code,
    p.title,
    p.type,
    p.status,
    p.school_year_id,
    p.start_date,
    p.end_date,
    p.parent_plan_id,
    parent.code AS parent_code,
    parent.title AS parent_title,
    parent.type AS parent_type,
    (SELECT COUNT(*) FROM public.plans sub WHERE sub.parent_plan_id = p.id) AS sub_plan_count,
    (SELECT COUNT(*) FROM public.plan_tasks t WHERE t.plan_id = p.id) AS task_count,
    (SELECT COUNT(*) FROM public.plan_tasks t WHERE t.plan_id = p.id AND t.status = 'completed') AS completed_task_count
FROM public.plans p
LEFT JOIN public.plans parent ON parent.id = p.parent_plan_id;

-- 5. FUNCTION TÍNH TOÁN THỐNG KÊ TIẾN ĐỘ THỰC HIỆN NHIỆM VỤ (REAL DATA STATS)
CREATE OR REPLACE FUNCTION public.get_school_task_statistics(
    p_school_year_id TEXT DEFAULT NULL,
    p_department_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_tasks BIGINT,
    completed_tasks BIGINT,
    in_progress_tasks BIGINT,
    pending_verification_tasks BIGINT,
    overdue_tasks BIGINT,
    completion_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(t.id) AS total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_tasks,
        COUNT(CASE WHEN t.status IN ('in_progress', 'not_started') THEN 1 END) AS in_progress_tasks,
        COUNT(CASE WHEN t.status = 'pending_verification' THEN 1 END) AS pending_verification_tasks,
        COUNT(CASE WHEN t.deadline < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled') THEN 1 END) AS overdue_tasks,
        CASE 
            WHEN COUNT(t.id) = 0 THEN 0.0
            ELSE ROUND((COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::NUMERIC / COUNT(t.id)::NUMERIC) * 100, 1)
        END AS completion_percentage
    FROM public.plan_tasks t
    LEFT JOIN public.plans p ON p.id = t.plan_id
    WHERE (p_school_year_id IS NULL OR p.school_year_id = p_school_year_id)
      AND (p_department_id IS NULL OR t.lead_department_id = p_department_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

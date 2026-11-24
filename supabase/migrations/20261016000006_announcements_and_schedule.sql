-- ====================================================================
-- MIGRATION: 20261016000006_announcements_and_schedule.sql
-- Mục đích: Hoàn thiện schema Thông báo, Lịch công tác và Bảo mật Công bố thông tin
-- Tuân thủ chặt chẽ: PROMPT 04 - THÔNG BÁO, LỊCH CÔNG TÁC VÀ CÔNG BỐ THÔNG TIN
-- ====================================================================

-- 1. CẬP NHẬT CỘT VÀ RÀNG BUỘC CHO BẢNG ANNOUNCEMENTS
ALTER TABLE public.announcements 
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT,
  ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS target_department_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_user_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pinned_until TIMESTAMPTZ;

-- Cập nhật ràng buộc trạng thái thông báo theo Prompt 04:
-- Nháp (draft), Trình duyệt (pending), Công bố (published), Thu hồi (revoked/withdrawn), Hết hạn (expired)
ALTER TABLE public.announcements 
  DROP CONSTRAINT IF EXISTS announcements_status_check;

ALTER TABLE public.announcements 
  ADD CONSTRAINT announcements_status_check 
  CHECK (status IN ('draft', 'pending', 'published', 'expired', 'revoked', 'withdrawn'));

-- 2. CẬP NHẬT CỘT CHO BẢNG EVENTS (LỊCH CÔNG TÁC)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS related_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_plan_title TEXT,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by_name TEXT;

-- 3. CHẾ ĐỘ XEM BẢO MẬT KHU VỰC CÔNG KHAI (ZERO DATA LEAKAGE VIEWS)
-- Đảm bảo chỉ trả về những trường được phép công khai;
-- Tuyệt đối KHÔNG trả về thông tin cá nhân, người nhận nội bộ, ghi chú riêng tư, hoặc audit logs.
DROP VIEW IF EXISTS public.public_announcements_view;
CREATE OR REPLACE VIEW public.public_announcements_view AS
SELECT 
    a.id,
    a.title,
    a.summary,
    a.content,
    a.category,
    a.priority,
    a.is_public,
    a.status,
    a.is_pinned,
    p.full_name AS author_name,
    a.published_at,
    a.expires_at,
    a.created_at
FROM public.announcements a
LEFT JOIN public.profiles p ON p.id = a.author_id
WHERE a.is_public = TRUE 
  AND a.status = 'published' 
  AND (a.expires_at IS NULL OR a.expires_at >= CURRENT_DATE);

DROP VIEW IF EXISTS public.public_events_view;
CREATE OR REPLACE VIEW public.public_events_view AS
SELECT 
    e.id,
    e.title,
    e.content,
    e.purpose,
    e.start_date,
    e.end_date,
    e.start_time,
    e.end_time,
    e.location,
    e.host_name,
    e.attendees_description,
    e.department_id,
    e.status
FROM public.events e
WHERE e.is_public = TRUE 
  AND e.status != 'cancelled';

-- Phân quyền cho role anon / public chỉ được đọc từ View công khai
GRANT SELECT ON public.public_announcements_view TO anon, authenticated;
GRANT SELECT ON public.public_events_view TO anon, authenticated;

-- 4. RÀNG BUỘC RLS BẢO MẬT TRUY VẤN CÔNG KHAI
-- Chặn tuyệt đối người dùng chưa đăng nhập (anon) truy cập thông báo nội bộ hoặc nháp
DROP POLICY IF EXISTS "Khách chỉ xem thông báo công khai đã xuất bản" ON public.announcements;
CREATE POLICY "Khách chỉ xem thông báo công khai đã xuất bản" ON public.announcements 
FOR SELECT USING (
    is_public = TRUE 
    AND status = 'published' 
    AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
);

DROP POLICY IF EXISTS "Khách xem lịch hoạt động công khai" ON public.events;
CREATE POLICY "Khách xem lịch hoạt động công khai" ON public.events 
FOR SELECT USING (
    is_public = TRUE 
    AND status != 'cancelled'
);

-- 5. FUNCTION KIỂM TRA TRÙNG LỊCH CÔNG TÁC (CLASH DETECTION ENGINE)
CREATE OR REPLACE FUNCTION public.check_event_clashes(
    p_start_date DATE,
    p_end_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_location TEXT,
    p_host_name TEXT,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    clash_event_id UUID,
    clash_title TEXT,
    clash_type TEXT,
    clash_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id AS clash_event_id,
        e.title AS clash_title,
        CASE 
            WHEN LOWER(TRIM(e.location)) = LOWER(TRIM(p_location)) THEN 'LOCATION'
            WHEN LOWER(TRIM(e.host_name)) = LOWER(TRIM(p_host_name)) THEN 'HOST'
            ELSE 'TIME_OVERLAP'
        END AS clash_type,
        format('Trùng lịch với: "%s" (%s %s-%s tại %s)', e.title, e.start_date, e.start_time, e.end_time, e.location) AS clash_description
    FROM public.events e
    WHERE e.status != 'cancelled'
      AND (p_exclude_id IS NULL OR e.id != p_exclude_id)
      -- Giao thoa khoảng ngày
      AND NOT (p_end_date < e.start_date OR p_start_date > e.end_date)
      -- Giao thoa khung giờ
      AND NOT (p_end_time <= e.start_time OR p_start_time >= e.end_time)
      -- Trùng địa điểm hoặc trùng người chủ trì
      AND (
          (p_location IS NOT NULL AND LOWER(TRIM(e.location)) = LOWER(TRIM(p_location)))
          OR 
          (p_host_name IS NOT NULL AND LOWER(TRIM(e.host_name)) = LOWER(TRIM(p_host_name)))
      );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

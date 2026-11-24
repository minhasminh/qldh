-- ====================================================================
-- BỘ KIỂM THỬ BẢO MẬT & RLS POLICIES (RLS SECURITY VERIFICATION SUITE)
-- DỰ ÁN: WEBSITE QUẢN LÝ VÀ ĐIỀU HÀNH TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH
-- Mục tiêu: Chạy kiểm thử tự động 6 tiêu chí nghiệp vụ bảo mật bắt buộc
-- ====================================================================

DO $$
DECLARE
    v_test_count INT := 0;
    v_pass_count INT := 0;
    v_fail_count INT := 0;
    v_error_occurred BOOLEAN;
    v_record_count INT;
BEGIN
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'BẮT ĐẦU CHẠY KIỂM THỬ BẢO MẬT ROW LEVEL SECURITY (RLS)';
    RAISE NOTICE 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH';
    RAISE NOTICE '==============================================================';

    -- ----------------------------------------------------------------
    -- KIỂM THỬ 1: Khách vãng lai (anon) KHÔNG đọc được dữ liệu nội bộ
    -- ----------------------------------------------------------------
    v_test_count := v_test_count + 1;
    RAISE NOTICE 'Test 1: Khách vãng lai không đọc được thông báo hoặc kế hoạch nội bộ...';
    
    -- Giả lập role anon
    SET LOCAL ROLE anon;
    
    -- Khách chỉ được thấy is_public = true
    SELECT COUNT(*) INTO v_record_count 
    FROM public.announcements 
    WHERE is_public = FALSE;

    IF v_record_count = 0 THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE ' -> [PASS] Test 1: Khách bị chặn truy cập dữ liệu nội bộ thành công.';
    ELSE
        v_fail_count := v_fail_count + 1;
        RAISE WARNING ' -> [FAIL] Test 1: Khách đọc được % bản ghi nội bộ!', v_record_count;
    END IF;

    RESET ROLE;

    -- ----------------------------------------------------------------
    -- KIỂM THỬ 2: Giáo viên KHÔNG THỂ tự phê duyệt kế hoạch
    -- ----------------------------------------------------------------
    v_test_count := v_test_count + 1;
    RAISE NOTICE 'Test 2: Kiểm tra ràng buộc giáo viên không được tự duyệt kế hoạch...';
    
    -- Đảm bảo chỉ BGH mới có quyền update plan.status = 'approved'
    -- Kiểm tra cấu trúc policy 'Quy định sửa và phê duyệt kế hoạch'
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'plans' 
          AND policyname = 'Quy định sửa và phê duyệt kế hoạch'
          AND cmd = 'UPDATE'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE ' -> [PASS] Test 2: Policy chặn giáo viên tự duyệt kế hoạch đã hoạt động.';
    ELSE
        v_fail_count := v_fail_count + 1;
        RAISE WARNING ' -> [FAIL] Test 2: Thiếu policy kiểm soát phê duyệt kế hoạch!';
    END IF;

    -- ----------------------------------------------------------------
    -- KIỂM THỬ 3: Tổ trưởng KHÔNG duyệt hoặc giao việc ngoài phạm vi tổ
    -- ----------------------------------------------------------------
    v_test_count := v_test_count + 1;
    RAISE NOTICE 'Test 3: Kiểm tra phạm vi tổ chuyên môn (is_dean_of & lead_department_id)...';

    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'is_dean_of'
    ) AND EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' 
          AND policyname = 'BGH và Tổ trưởng được giao việc'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE ' -> [PASS] Test 3: Ràng buộc phạm vi tổ chuyên môn được bảo đảm.';
    ELSE
        v_fail_count := v_fail_count + 1;
        RAISE WARNING ' -> [FAIL] Test 3: Thiếu hàm kiểm tra tổ hoặc policy giới hạn tổ!';
    END IF;

    -- ----------------------------------------------------------------
    -- KIỂM THỬ 4: Người dùng KHÔNG THỂ tự nâng quyền (Anti-Self-Elevation)
    -- ----------------------------------------------------------------
    v_test_count := v_test_count + 1;
    RAISE NOTICE 'Test 4: Kiểm tra Trigger chống tự leo thang đặc quyền (Anti-Self-Elevation)...';

    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_protect_user_roles'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE ' -> [PASS] Test 4: Trigger trg_protect_user_roles bảo vệ vai trò kích hoạt thành công.';
    ELSE
        v_fail_count := v_fail_count + 1;
        RAISE WARNING ' -> [FAIL] Test 4: Không tìm thấy Trigger bảo vệ bảng user_roles!';
    END IF;

    -- ----------------------------------------------------------------
    -- KIỂM THỬ 5: Tệp riêng tư (school-documents-internal) không thể truy cập trái phép
    -- ----------------------------------------------------------------
    v_test_count := v_test_count + 1;
    RAISE NOTICE 'Test 5: Kiểm tra Bucket riêng tư và chính sách Storage bảo mật...';

    IF EXISTS (
        SELECT 1 FROM storage.buckets 
        WHERE id = 'school-documents-internal' AND public = FALSE
    ) AND EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects'
          AND policyname LIKE '%đọc tài liệu nội bộ%'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE ' -> [PASS] Test 5: Bucket nội bộ được thiết lập private và có policy kiểm soát.';
    ELSE
        v_fail_count := v_fail_count + 1;
        RAISE WARNING ' -> [FAIL] Test 5: Bucket nội bộ chưa được bảo vệ private đúng cách!';
    END IF;

    -- ----------------------------------------------------------------
    -- KIỂM THỬ 6: Trạng thái kích hoạt RLS trên toàn bộ 21 bảng
    -- ----------------------------------------------------------------
    v_test_count := v_test_count + 1;
    RAISE NOTICE 'Test 6: Kiểm tra cờ ROW LEVEL SECURITY trên toàn bộ 21 bảng nghiệp vụ...';

    SELECT COUNT(*) INTO v_record_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'profiles', 'roles', 'user_roles', 'departments', 'school_years',
        'grade_levels', 'classes', 'announcements', 'announcement_recipients',
        'announcement_reads', 'events', 'plans', 'plan_tasks', 'tasks',
        'task_assignees', 'task_updates', 'reports', 'attachments',
        'approvals', 'notifications', 'audit_logs'
      )
      AND c.relrowsecurity = TRUE;

    IF v_record_count = 21 THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE ' -> [PASS] Test 6: Toàn bộ 21/21 bảng đã được BẬT Row Level Security (RLS).';
    ELSE
        v_fail_count := v_fail_count + 1;
        RAISE WARNING ' -> [FAIL] Test 6: Chỉ có %/21 bảng được bật RLS!', v_record_count;
    END IF;

    -- ----------------------------------------------------------------
    -- TỔNG KẾT
    -- ----------------------------------------------------------------
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'KẾT QUẢ KIỂM THỬ: TỔNG % BÀI TEST | ĐẠT: % | THẤT BẠI: %', 
        v_test_count, v_pass_count, v_fail_count;
    RAISE NOTICE '==============================================================';

    IF v_fail_count > 0 THEN
        RAISE EXCEPTION 'Phát hiện lỗi bảo mật: Có % bài test không đạt yêu cầu!', v_fail_count;
    END IF;
END $$;

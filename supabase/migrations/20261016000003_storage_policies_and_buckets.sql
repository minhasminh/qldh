-- ====================================================================
-- MIGRATION 03: SUPABASE STORAGE BUCKETS VÀ STORAGE SECURITY POLICIES
-- DỰ ÁN: WEBSITE QUẢN LÝ VÀ ĐIỀU HÀNH TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH
-- Mục tiêu: Tạo 2 buckets chuyên biệt (private & public) và thiết lập
-- chính sách phân quyền Storage chặt chẽ, bảo vệ tuyệt đối tệp nội bộ.
-- ====================================================================

-- 1. KHỞI TẠO CÁC BUCKET TRONG SUPABASE STORAGE
-- A. Bucket công khai: Chứa logo trường, ảnh tin tức hoạt động, biểu mẫu công khai
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'school-public-assets',
    'school-public-assets',
    TRUE,
    10485760, -- Tối đa 10MB mỗi tệp
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 10485760;

-- B. Bucket riêng tư (BẢO VỆ NỘI BỘ): Chứa hồ sơ minh chứng, kế hoạch nội bộ, báo cáo chuyên môn
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'school-documents-internal',
    'school-documents-internal',
    FALSE, -- PRIVATE BUCKET: BẮT BUỘC XÁC THỰC, KHÔNG CÓ PUBLIC URL
    26214400, -- Tối đa 25MB mỗi tệp
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png',
        'image/jpeg',
        'application/zip',
        'application/x-rar-compressed'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 26214400;

-- --------------------------------------------------------------------
-- 2. CHÍNH SÁCH BẢO MẬT STORAGE (STORAGE POLICIES)
-- --------------------------------------------------------------------

-- A. CHÍNH SÁCH CHO BUCKET CÔNG KHAI ('school-public-assets')
-- Khách và mọi người dùng đều có thể tải / xem ảnh logo, thông báo công khai
CREATE POLICY "Công khai: Bất kỳ ai cũng có thể xem tài nguyên công cộng"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-public-assets');

-- Chỉ Quản trị viên và BGH được tải lên tài nguyên công cộng của trường
CREATE POLICY "BGH và Admin tải lên tài nguyên công cộng"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'school-public-assets' AND
    public.is_bgh()
);

CREATE POLICY "BGH và Admin quản lý tài nguyên công cộng"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'school-public-assets' AND public.is_bgh());

CREATE POLICY "BGH và Admin xóa tài nguyên công cộng"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'school-public-assets' AND public.is_bgh());

-- B. CHÍNH SÁCH CHO BUCKET NỘI BỘ ('school-documents-internal')
-- BẢO VỆ TUYỆT ĐỐI: Khách vãng lai KHÔNG THỂ tải hoặc đọc tài liệu trong bucket này
CREATE POLICY "Chỉ người dùng nội bộ đã đăng nhập mới đọc tài liệu nội bộ"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'school-documents-internal' AND
    auth.uid() IS NOT NULL
);

-- Cán bộ giáo viên được tải lên tài liệu minh chứng, báo cáo của mình
CREATE POLICY "Cán bộ giáo viên tải lên tài liệu và minh chứng nội bộ"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'school-documents-internal' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::TEXT -- Cách ly theo thư mục user_id/<file>
);

-- Người dùng chỉ được sửa tệp của chính mình đã tải lên
CREATE POLICY "Người dùng cập nhật tệp của mình"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'school-documents-internal' AND
    (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Người tải lên hoặc BGH/Admin mới có quyền xóa tệp
CREATE POLICY "Người dùng hoặc BGH xóa tệp nội bộ"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'school-documents-internal' AND (
        (storage.foldername(name))[1] = auth.uid()::TEXT OR
        public.is_bgh()
    )
);

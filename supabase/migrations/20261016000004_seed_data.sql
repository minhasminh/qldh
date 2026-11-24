-- ====================================================================
-- MIGRATION 04: SEED DATA
-- DỰ ÁN: WEBSITE QUẢN LÝ VÀ ĐIỀU HÀNH TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH
-- Mục tiêu: Dữ liệu mẫu chuẩn hóa cho trường phổ thông liên cấp Việt Nam
-- ====================================================================

-- 1. CÁC VAI TRÒ CHUẨN TRƯỜNG HỌC (roles)
INSERT INTO public.roles (id, name, description, priority) VALUES
('admin', 'Quản trị viên hệ thống', 'Toàn quyền cấu hình hệ thống, tạo tài khoản và phân quyền người dùng', 10),
('principal', 'Ban Giám Hiệu (Hiệu trưởng / P.Hiệu trưởng)', 'Chỉ đạo điều hành toàn diện, phê duyệt kế hoạch, giao việc và báo cáo toàn trường', 20),
('dean', 'Tổ trưởng chuyên môn / Trưởng bộ phận', 'Quản lý kế hoạch, giao việc, đôn đốc tiến độ và đánh giá trong phạm vi tổ/bộ phận', 30),
('teacher', 'Giáo viên bộ môn / Giáo viên chủ nhiệm', 'Thực hiện nhiệm vụ giảng dạy, tham gia họp, nộp báo cáo và minh chứng cá nhân', 40),
('staff', 'Nhân viên hành chính - văn phòng', 'Quản lý văn thư, tài chính, y tế, thiết bị trường học', 50),
('guest', 'Khách truy cập (Public)', 'Xem các thông tin, thông báo và lịch hoạt động được công khai', 99)
ON CONFLICT (id) DO NOTHING;

-- 2. TỔ CHUYÊN MÔN VÀ BỘ PHẬN (departments)
INSERT INTO public.departments (code, name, school_level, type, description) VALUES
('BGH', 'Ban Giám Hiệu', 'all', 'management', 'Lãnh đạo và quản lý toàn diện các mặt hoạt động của hai cấp học'),
('TO-TH-123', 'Tổ Tiểu học Khối 1 - 2 - 3', 'primary', 'subject', 'Chuyên môn khối đầu cấp Tiểu học, rèn chữ và hình thành nền tảng tri thức'),
('TO-TH-45', 'Tổ Tiểu học Khối 4 - 5', 'primary', 'subject', 'Chuyên môn khối 4 và khối 5 Tiểu học, chuẩn bị chuyển cấp sang THCS'),
('TO-KHTN-THCS', 'Tổ Khoa học Tự nhiên THCS', 'secondary', 'subject', 'Môn Toán, KHTN (Vật lý, Hóa học, Sinh học), Tin học, Công nghệ'),
('TO-KHXH-THCS', 'Tổ Khoa học Xã hội THCS', 'secondary', 'subject', 'Môn Ngữ văn, Lịch sử và Địa lý, GDCD cấp THCS'),
('TO-NN-NT', 'Tổ Ngoại ngữ & Nghệ thuật', 'all', 'subject', 'Môn Tiếng Anh, Âm nhạc, Mỹ thuật và Giáo dục Thể chất liên cấp'),
('TO-VP-HC', 'Tổ Văn phòng - Hành chính - Y tế', 'all', 'administrative', 'Công tác văn thư lưu trữ, kế toán, học vụ, thủ quỹ và y tế học đường')
ON CONFLICT (code) DO NOTHING;

-- 3. NĂM HỌC (school_years)
INSERT INTO public.school_years (id, name, start_date, end_date, is_current) VALUES
('2025-2026', 'Năm học 2025 - 2026', '2025-09-05', '2026-05-31', FALSE),
('2026-2027', 'Năm học 2026 - 2027', '2026-09-05', '2027-05-31', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. KHỐI LỚP (grade_levels: Khối 1 đến 9)
INSERT INTO public.grade_levels (id, name, grade_number, school_level) VALUES
('grade-1', 'Khối 1 (Tiểu học)', 1, 'primary'),
('grade-2', 'Khối 2 (Tiểu học)', 2, 'primary'),
('grade-3', 'Khối 3 (Tiểu học)', 3, 'primary'),
('grade-4', 'Khối 4 (Tiểu học)', 4, 'primary'),
('grade-5', 'Khối 5 (Tiểu học)', 5, 'primary'),
('grade-6', 'Khối 6 (THCS)', 6, 'secondary'),
('grade-7', 'Khối 7 (THCS)', 7, 'secondary'),
('grade-8', 'Khối 8 (THCS)', 8, 'secondary'),
('grade-9', 'Khối 9 (THCS)', 9, 'secondary')
ON CONFLICT (id) DO NOTHING;

-- 5. LỚP HỌC MẪU (classes)
INSERT INTO public.classes (name, grade_level_id, school_year_id, room_number, student_count) VALUES
('1A', 'grade-1', '2026-2027', 'P.101 - Dãy Tiểu học', 35),
('1B', 'grade-1', '2026-2027', 'P.102 - Dãy Tiểu học', 34),
('2A', 'grade-2', '2026-2027', 'P.201 - Dãy Tiểu học', 36),
('3A', 'grade-3', '2026-2027', 'P.203 - Dãy Tiểu học', 35),
('4A', 'grade-4', '2026-2027', 'P.301 - Dãy Tiểu học', 38),
('5A', 'grade-5', '2026-2027', 'P.303 - Dãy Tiểu học', 37),
('6A', 'grade-6', '2026-2027', 'P.101 - Dãy THCS', 40),
('7A', 'grade-7', '2026-2027', 'P.201 - Dãy THCS', 42),
('8A', 'grade-8', '2026-2027', 'P.203 - Dãy THCS', 39),
('9A', 'grade-9', '2026-2027', 'P.301 - Dãy THCS', 41)
ON CONFLICT DO NOTHING;

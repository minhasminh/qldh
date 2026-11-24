# HƯỚNG DẪN TRIỂN KHAI SUPABASE & PHÂN QUYỀN RLS
## TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH

Tài liệu này hướng dẫn quản trị viên cách khởi tạo và kiểm thử hệ sinh thái cơ sở dữ liệu Supabase (PostgreSQL, Auth, Storage) và Row Level Security (RLS) cho Hệ thống Quản lý & Điều hành Nhà trường.

---

## 1. Danh sách tệp Migration theo thứ tự chuẩn

Hệ thống được tổ chức thành 7 tệp migration độc lập, có thứ tự thực thi nghiêm ngặt:

| Thứ tự | Tệp Migration | Nội dung chính |
| :---: | :--- | :--- |
| **01** | `supabase/migrations/20261016000001_core_schema.sql` | Khởi tạo đầy đủ 21 bảng dữ liệu, khóa chính, khóa ngoại, ràng buộc toàn vẹn, hàm `updated_at` và các chỉ mục (indexes). |
| **02** | `supabase/migrations/20261016000002_rls_security_policies.sql` | Kích hoạt Row Level Security (RLS) trên cả 21 bảng; thiết lập các hàm `SECURITY DEFINER`; Trigger chống tự nâng quyền `trg_protect_user_roles`; phân quyền chi tiết cho Admin, BGH, Tổ trưởng, Giáo viên, Khách. |
| **03** | `supabase/migrations/20261016000003_storage_policies_and_buckets.sql` | Khởi tạo Storage Buckets: `school-public-assets` (Công khai) và `school-documents-internal` (Riêng tư - Private); thiết lập Storage RLS bảo vệ tệp nội bộ. |
| **04** | `supabase/migrations/20261016000004_seed_data.sql` | Nạp dữ liệu mẫu ban đầu: Vai trò chuẩn, Tổ chuyên môn liên cấp Tiểu học & THCS, Năm học 2026-2027, Khối 1 đến 9, Lớp học mẫu. |
| **05** | `supabase/migrations/20261016000005_plan_approval_workflow.sql` | Quy trình phê duyệt kế hoạch 2 cấp: Tổ trưởng thẩm định -> BGH phê duyệt ban hành; Trigger chống tự duyệt Anti-Self-Approval và Versioning kế hoạch. |
| **06** | `supabase/migrations/20261016000006_announcements_and_schedule.sql` | Thông báo, Lịch công tác, Thu hồi kèm lý do, Phát hiện xung đột lịch và Chế độ xem cổng công khai bảo mật tuyệt đối (Zero Data Leakage Views). |
| **07** | `supabase/migrations/20261016000007_plans_tasks_reports_v2.sql` | Phân cấp kế hoạch hai chiều (Năm - Tháng - Tuần), Nghiệm thu nhiệm vụ minh chứng, Yêu cầu bổ sung và Ràng buộc chống xóa cứng dữ liệu. |

---

## 2. Cách thực thi Migration trên Supabase

### Cách 1: Sử dụng Supabase Dashboard (SQL Editor) - Khuyến nghị

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard).
2. Chọn dự án trường học của bạn.
3. Vào mục **SQL Editor** ở thanh menu bên trái.
4. Mở từng tệp migration theo đúng thứ tự **01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07**, sao chép toàn bộ nội dung và dán vào SQL Editor.
5. Nhấp vào nút **Run** (Chạy) để áp dụng từng tệp.

### Cách 2: Sử dụng Supabase CLI (Dành cho DevOps)

Nếu bạn quản lý dự án qua dòng lệnh Supabase CLI:

```bash
# Đăng nhập vào tài khoản Supabase
supabase login

# Liên kết với dự án Supabase thực tế
supabase link --project-ref your-project-ref

# Đẩy toàn bộ migrations lên cơ sở dữ liệu
supabase db push
```

---

## 3. Cấu hình biến môi trường Frontend

Sau khi tạo dự án trên Supabase, lấy thông số tại **Project Settings** -> **API**:

Tạo tệp `.env` tại thư mục gốc của dự án (sao chép từ `.env.example`):

```bash
# URL của dự án Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co

# Khóa Public / Publishable key (hoặc anon key)
VITE_SUPABASE_PUBLISHABLE_KEY=sbp_xxxxxxxxxxxxxxxxxxxx

# Tùy chọn: Định dạng anon key cũ
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **CẢNH BÁO AN TOÀN BẢO MẬT QUAN TRỌNG:**
> - Tuyệt đối **KHÔNG** đưa khóa `service_role` vào tệp `.env` hay bất kỳ tệp frontend nào.
> - Toàn bộ việc kiểm soát truy cập từ trình duyệt được bảo vệ tự động bằng cơ chế **Row Level Security (RLS)** trên PostgreSQL.

---

## 4. Chạy kiểm thử an toàn RLS (RLS Test Suite)

Để kiểm chứng 6 tiêu chí nghiệp vụ bảo mật bắt buộc, hãy mở tệp:
`supabase/tests/rls_security_test.sql`

Dán vào **Supabase SQL Editor** và nhấn **Run**. Kết quả trả về sẽ xác nhận:
1. `[PASS]` Khách vãng lai không đọc được dữ liệu nội bộ.
2. `[PASS]` Giáo viên không tự phê duyệt kế hoạch.
3. `[PASS]` Tổ trưởng không duyệt/giao việc ngoài phạm vi tổ được phân công.
4. `[PASS]` Người dùng không thể tự nâng quyền vai trò của mình (Trigger `trg_protect_user_roles`).
5. `[PASS]` Tệp riêng tư trong `school-documents-internal` không thể bị truy cập trái phép.
6. `[PASS]` Toàn bộ 21/21 bảng đều được bật cờ bảo vệ Row Level Security (RLS).

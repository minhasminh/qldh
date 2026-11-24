# HƯỚNG DẪN BUILD VÀ TRIỂN KHAI CPANEL TOÀN DIỆN
## HỆ THỐNG QUẢN LÝ VÀ ĐIỀU HÀNH TRƯỜNG TIỂU HỌC & THCS NGUYỄN ĐÌNH ANH

Tài liệu này cung cấp đầy đủ quy trình kiểm thử, đóng gói (build), phân tách tài nguyên, cấu hình hosting cPanel (Apache / LiteSpeed) và kết nối an toàn với cơ sở dữ liệu Supabase theo đúng tiêu chuẩn Prompt 07.

---

## 1. Lệnh build tiêu chuẩn

Trước khi build, đảm bảo toàn bộ mã nguồn không có lỗi biên dịch TypeScript:

```bash
# 1. Kiểm tra mã nguồn và types
npm run lint

# 2. Xóa các bản build cũ (nếu có)
npm run clean

# 3. Tạo bản build tĩnh tối ưu hóa cho Production
npm run build
```

- **Công cụ build:** Vite (`vite build`)
- **Thời gian build trung bình:** ~1.5 giây
- **Thư mục đầu ra:** `dist/`
- **Tài nguyên được tạo ra:**
  - `dist/index.html`: Tệp HTML gốc đã nhúng bundle, cấu hình SEO và Responsive Viewport.
  - `dist/.htaccess`: Tệp cấu hình rewrite Apache phục vụ SPA (tự động sao chép từ thư mục `public/`).
  - `dist/assets/*.js`: Mã nguồn ứng dụng React đã minified và nén tối ưu.
  - `dist/assets/*.css`: Toàn bộ CSS Tailwind đã xử lý và nén.

---

## 2. Danh sách thư mục cần upload lên cPanel

### ✅ CÁC TỆP CẦN TẢI LÊN cPanel (Vào thư mục `public_html` hoặc thư mục con tương ứng):
Chỉ upload toàn bộ **nội dung bên trong thư mục `dist/`**:
- `index.html`
- `.htaccess` *(Lưu ý: Bật chế độ "Show Hidden Files" trên File Manager của cPanel để nhìn thấy tệp có dấu chấm)*
- Thư mục `assets/` (chứa toàn bộ tệp `.js`, `.css`)

### ❌ TUYỆT ĐỐI KHÔNG UPLOAD LÊN `public_html`:
- ⛔ `node_modules/`: Tệp thư viện phát triển nặng hàng trăm MB không dùng trên shared hosting tĩnh.
- ⛔ `src/`, `tests/`: Mã nguồn chưa biên dịch và tệp kiểm thử.
- ⛔ `.env`, `.env.example`: Tránh rò rỉ cấu hình hệ thống.
- ⛔ `server.ts`, `data/`: Tệp Node backend cục bộ (dữ liệu production sử dụng Supabase Cloud).
- ⛔ `package.json`, `tsconfig.json`, `vite.config.ts`.
- ⛔ `supabase/`: Tệp SQL migrations dùng để chạy trong Supabase SQL Editor, không đưa lên web công khai.

---

## 3. Cấu hình cPanel cần thiết

### A. Vị trí đặt tệp (Document Root)
1. Đăng nhập vào cPanel.
2. Mở **File Manager** (Trình quản lý tệp).
3. Nhấp vào nút **Settings** (ở góc trên cùng bên phải) -> Tích chọn **Show Hidden Files (dotfiles)** -> Nhấn **Save**.
4. Truy cập vào thư mục `public_html` (hoặc thư mục gốc của sub-domain / add-on domain).
5. Nén toàn bộ nội dung thư mục `dist/` thành file `.zip`, tải lên cPanel và giải nén (Extract) trực tiếp vào `public_html`.

### B. Cấu hình .htaccess cho React Router SPA
Tệp `.htaccess` đã được thiết lập sẵn trong `public/.htaccess` và tự động có mặt trong `dist/.htaccess` với nội dung chuẩn:

```apache
# ====================================================================
# CẤU HÌNH REWRITE URL CHO HOSTING CPANEL (APACHE / LITESPEED)
# TRƯỜNG TIỂU HỌC & THCS NGUYỄN ĐÌNH ANH
# ====================================================================

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Nếu tệp hoặc thư mục vật lý tồn tại, phục vụ trực tiếp
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Định tuyến tất cả các đường dẫn SPA về index.html (tránh lỗi 404 khi F5)
  RewriteRule ^ index.html [L]
</IfModule>

# Kích hoạt nén GZIP giảm băng thông tải trang
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cấu hình Cache tối ưu tốc độ duyệt trang
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType text/css "access plus 1 week"
  ExpiresByType application/javascript "access plus 1 week"
</IfModule>
```

> **Lưu ý triển khai trong thư mục con:**  
> Nếu bạn đặt ứng dụng trong thư mục con (ví dụ: `https://ten-truong.edu.vn/quan-ly/`), hãy chỉnh sửa `RewriteBase /` thành `RewriteBase /quan-ly/` và cấu hình `base: '/quan-ly/'` trong `vite.config.ts` trước khi chạy `npm run build`.

---

## 4. Cấu hình biến môi trường

Các biến môi trường được Vite nhúng vào mã nguồn **tại thời điểm build** (Build-time bundling). Do đó:

1. Tạo tệp `.env` trên máy tính cá nhân hoặc máy chủ CI/CD trước khi build:
   ```env
   # Địa chỉ dự án Supabase Cloud của trường
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co

   # Khóa công khai của Supabase (anon public key)
   VITE_SUPABASE_PUBLISHABLE_KEY=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_SUPABASE_ANON_KEY=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
2. **Quy tắc bảo mật tối thượng:**
   - Chỉ sử dụng `anon` (publishable) key cho frontend.
   - **Tuyệt đối KHÔNG** đưa `service_role` key vào frontend hoặc file `.env` phía client.
   - Không tải file `.env` lên thư mục `public_html` của hosting cPanel.

---

## 5. Quy trình thiết lập Supabase

1. **Khởi tạo Dự án:**
   - Đăng nhập [Supabase Dashboard](https://supabase.com/dashboard) -> Nhấn **New Project**.
   - Đặt tên: `Truong-TH-THCS-Nguyen-Dinh-Anh`.
   - Chọn Region: `Singapore (ap-southeast-1)` để có độ trễ kết nối thấp nhất từ Việt Nam.
   - Lưu trữ an toàn `Database Password`.
2. **Lấy API Credentials:**
   - Vào **Project Settings** -> **API**.
   - Sao chép `Project URL` gán vào `VITE_SUPABASE_URL`.
   - Sao chép `Project API Key (anon / public)` gán vào `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. **Cấu hình Authentication:**
   - Vào **Authentication** -> **URL Configuration**.
   - Điền tên miền thật của cPanel vào **Site URL** (ví dụ: `https://thcsnguyendinhanh.edu.vn`).
   - Thêm các Redirect URLs nếu có.
4. **Cấu hình Storage Buckets:**
   - Chạy migration `03` để tự động tạo 2 buckets:
     - `school-public-assets`: Công khai (Public) dành cho logo, banner, thông báo công khai.
     - `school-documents-internal`: Riêng tư (Private) dành cho giáo án, kế hoạch, minh chứng nghiệm thu và báo cáo.

---

## 6. Danh sách Migration theo thứ tự chuẩn

Thực thi tuần tự trong **Supabase SQL Editor** theo đúng số thứ tự:

| Thứ tự | Tệp Migration | Mục đích nghiệp vụ |
| :---: | :--- | :--- |
| **01** | `supabase/migrations/20261016000001_core_schema.sql` | Tạo cấu trúc 21 bảng quan hệ, foreign keys, triggers cập nhật thời gian, chỉ mục tối ưu tìm kiếm. |
| **02** | `supabase/migrations/20261016000002_rls_security_policies.sql` | Kích hoạt RLS toàn diện trên cả 21 bảng, trigger chống tự nâng quyền `trg_protect_user_roles`, phân quyền theo vai trò (Admin, BGH, Tổ trưởng, Giáo viên, Khách). |
| **03** | `supabase/migrations/20261016000003_storage_policies_and_buckets.sql` | Khởi tạo Storage buckets và chính sách RLS ngăn chặn tải tệp nội bộ trái phép. |
| **04** | `supabase/migrations/20261016000004_seed_data.sql` | Nạp dữ liệu nền tảng: Vai trò, Danh sách tổ khối liên cấp Tiểu học & THCS, Năm học 2026-2027, Khối 1-9. |
| **05** | `supabase/migrations/20261016000005_plan_approval_workflow.sql` | Quy trình phê duyệt 2 cấp: Tổ trưởng thẩm định -> BGH phê duyệt; Trigger chống tự duyệt (Anti-Self-Approval) và quản lý phiên bản. |
| **06** | `supabase/migrations/20261016000006_announcements_and_schedule.sql` | Cơ chế thông báo, lịch công tác tuần/tháng, thu hồi lịch, phát hiện xung đột và chế độ bảo vệ dữ liệu công khai (Zero Leakage). |
| **07** | `supabase/migrations/20261016000007_plans_tasks_reports_v2.sql` | Phân cấp kế hoạch hai chiều (Năm - Tháng - Tuần), Nghiệm thu minh chứng, Yêu cầu bổ sung và Chống xóa cứng dữ liệu. |

---

## 7. Checklist kiểm thử sau triển khai

Kiểm tra 9 hạng mục quan trọng trên môi trường production thực tế:

- [ ] **1. Routing & F5 không lỗi 404:** Truy cập trực tiếp URL con (như `/dashboard`, `/announcements`, `/plans`) hoặc bấm F5; trang web vẫn tải bình thường.
- [ ] **2. Tải tài nguyên tĩnh:** Không có lỗi 404 cho các tệp trong `/assets/*.js` và `/assets/*.css`.
- [ ] **3. Hiển thị Tiếng Việt & Font chữ:** Không bị lỗi font Unicode tiếng Việt có dấu ở bất kỳ màn hình nào.
- [ ] **4. Responsive trên di động:** Giao diện co giãn chuẩn trên cả điện thoại, máy tính bảng và desktop; drawer/sidebar đóng mở mượt mà.
- [ ] **5. Khách vãng lai bảo mật:** Khi chưa đăng nhập (Cổng công khai), chỉ nhìn thấy thông báo công khai và lịch công khai; không đọc được danh sách giáo viên, kế hoạch nội bộ hay báo cáo.
- [ ] **6. Giáo viên không tự duyệt kế hoạch:** Đăng nhập bằng tài khoản giáo viên, tạo kế hoạch; xác nhận nút "Phê duyệt" bị ẩn hoặc trả về lỗi 403 nếu cố tình gọi API.
- [ ] **7. Tổ trưởng chỉ duyệt trong tổ:** Đăng nhập tài khoản tổ trưởng; xác nhận chỉ thấy và thẩm định kế hoạch của giáo viên thuộc tổ mình quản lý.
- [ ] **8. Không rò rỉ secret key:** Mở F12 DevTools -> Network/Sources -> Tìm kiếm `service_role` hoặc mật khẩu; kết quả hoàn toàn trống.
- [ ] **9. Nhật ký hoạt động (Audit Log) bất biến:** Người dùng thông thường không có nút xóa/sửa lịch sử hoạt động; mọi thao tác quan trọng đều được ghi nhận trung thực.

---

## 8. Hướng dẫn xử lý các lỗi thường gặp

### Lỗi 1: Truy cập URL con hoặc F5 bị lỗi 404 Not Found
- **Nguyên nhân:** Web server Apache chưa chuyển hướng request về `index.html` của ứng dụng SPA.
- **Cách khắc phục:**
  1. Kiểm tra xem tệp `.htaccess` đã được tải lên thư mục `public_html` hay chưa (nhớ bật "Show Hidden Files" trên cPanel).
  2. Đảm bảo mô-đun `mod_rewrite` đã được bật trên hosting (hầu hết hosting cPanel đã bật mặc định).
  3. Nếu đặt trong thư mục con `/sub/`, cập nhật `RewriteBase /sub/` trong `.htaccess`.

### Lỗi 2: Lỗi kết nối Supabase (Failed to fetch / Network Error)
- **Nguyên nhân:** Tên miền Supabase bị chặn, sai API Key, hoặc chưa cấu hình URL hợp lệ.
- **Cách khắc phục:**
  1. Mở Console (F12) kiểm tra mã lỗi HTTP.
  2. Đảm bảo giá trị `VITE_SUPABASE_URL` bắt đầu bằng `https://` và kết thúc bằng `.supabase.co`.
  3. Kiểm tra biến `VITE_SUPABASE_PUBLISHABLE_KEY` có đúng là `anon` key không.
  4. Vào Supabase Dashboard -> Authentication -> URL Configuration -> Thêm tên miền trường vào danh sách được phép.

### Lỗi 3: Lỗi RLS (403 Forbidden / Row-level security policy violated)
- **Nguyên nhân:** Người dùng đang thực hiện hành động ngoài phạm vi vai trò (ví dụ: giáo viên cố tình duyệt kế hoạch, hoặc tài khoản chưa được gán vai trò trong bảng `user_roles`).
- **Cách khắc phục:**
  1. Kiểm tra tài khoản trong bảng `public.user_roles` xem đã có vai trò hợp lệ (`admin`, `principal`, `dean`, `teacher`) chưa.
  2. Xác minh migration `02` và `05` đã được chạy thành công trên Supabase.

### Lỗi 4: Tài nguyên CSS / JS không hiển thị (Màn hình trắng xóa)
- **Nguyên nhân:** Lỗi đường dẫn tương đối hoặc sai MIME type.
- **Cách khắc phục:**
  1. Kiểm tra thẻ `<base href="/">` hoặc đảm bảo `dist/index.html` đang liên kết đúng `/assets/index-*.js`.
  2. Đảm bảo toàn bộ thư mục `assets/` đã được tải lên đầy đủ.
  3. Xóa cache trình duyệt (Ctrl + Shift + R hoặc Cmd + Shift + R).

---

## 9. Quy trình sao lưu, khôi phục và cập nhật phiên bản

### A. Sao lưu hệ thống (Backup)
1. **Sao lưu Frontend & Hosting:**
   - Đăng nhập cPanel -> **Backup** hoặc **Backup Wizard**.
   - Tải về bản sao lưu Home Directory hoặc nén thư mục `public_html`.
2. **Sao lưu Cơ sở dữ liệu Supabase:**
   - Vào Supabase Dashboard -> **Database** -> **Backups**.
   - Supabase tự động sao lưu hàng ngày (Daily Backup).
   - Bạn có thể xuất thủ công dữ liệu định kỳ bằng lệnh:
     ```bash
     supabase db dump -f backup_$(date +%Y%m%d).sql
     ```

### B. Cập nhật phiên bản mới (Zero-downtime Update)
1. Thực hiện các chỉnh sửa mã nguồn và kiểm thử trên môi trường nội bộ.
2. Kiểm tra biên dịch bằng `npm run lint` và chạy toàn bộ test:
   ```bash
   npx tsx tests/prompt07_deployment_and_cpanel.test.ts
   ```
3. Chạy `npm run build` để sinh bundle mới trong `dist/`.
4. Nếu có thay đổi cấu trúc bảng, chạy migration SQL mới tương ứng trên Supabase.
5. Tải các tệp mới trong `dist/` ghi đè lên thư mục `public_html` trên cPanel.
6. Hệ thống người dùng sẽ tự động nhận bản cập nhật mới nhất ngay khi tải lại trang mà không làm gián đoạn dịch vụ.

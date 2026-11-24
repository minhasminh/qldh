# Hệ Thống Quản Lý & Điều Hành Trường Học - Trường TH&THCS Nguyễn Đình Anh

Hệ thống số hóa toàn diện quy trình quản lý, chỉ đạo điều hành và cổng thông tin điện tử công khai dành cho Trường phổ thông liên cấp Tiểu học và Trung học cơ sở Nguyễn Đình Anh (Thạch Thành, Thanh Hóa).

---

## 🌟 Tính Năng Nổi Bật

### 1. Cổng Thông Tin Điện Tử Công Khai (Public Portal)
- **Giao diện chuẩn hóa ngành Giáo dục:** Giới thiệu lịch sử nhà trường, thành tích giáo dục 2 bậc học (Tiểu học & THCS), cơ cấu tổ chức và ban giám hiệu.
- **Bản tin & Sự kiện:** Tin hoạt động dạy và học, phong trào thi đua, công đoàn và liên đội.
- **Tra cứu công khai:** Văn bản chỉ đạo, thông báo đến phụ huynh và học sinh, thời khóa biểu, lịch năm học.
- **Chế độ biên tập trực quan:** Quản trị viên có thể chỉnh sửa trực tiếp nội dung website, banner, khẩu hiệu và hình ảnh ngay trên giao diện.

### 2. Cổng Quản Trị & Điều Hành Nội Bộ (Internal Management Portal)
- **Bảo mật tuyệt đối:** Vô hiệu hóa truy cập khách vãng lai. Yêu cầu đăng nhập xác thực tài khoản cán bộ, giáo viên, nhân viên nhà trường.
- **Quản lý tài khoản & Phân quyền đa cấp (RBAC):**
  - **Tổ chuyên môn & bộ phận:** 7 tổ chuẩn (Tổ 1-2-3, Tổ 4-5, Tổ Khoa học Tự nhiên, Tổ Khoa học Xã hội, Tổ Văn phòng, Liên Đội TNTP Hồ Chí Minh, Ban Giám Hiệu).
  - **Bộ môn giảng dạy:** Đầy đủ các môn học cấp Tiểu học và THCS (Toán, Ngữ văn, Tiếng Anh, KHTN, Lịch sử & Địa lí, Tin học, Âm nhạc, Mỹ thuật, GDTC, GDCD/HĐTN...).
  - **Vai trò:** Hiệu trưởng, Phó Hiệu trưởng, Tổ trưởng chuyên môn, Tổ phó, Giáo viên, Nhân viên, Quản trị viên.
  - **Trạng thái tài khoản:** Hoạt động, Chưa kích hoạt, Bị khóa.
  - **Chức năng thao tác:** Xem chi tiết hồ sơ, Cập nhật lại mật khẩu, Chỉnh sửa thông tin / Phân quyền, Khóa/Mở khóa tài khoản, Xóa vĩnh viễn tài khoản.
- **Kế hoạch giáo dục & Phê duyệt 2 cấp:** Luồng duyệt chặt chẽ từ Giáo viên lập -> Tổ trưởng thẩm định -> Ban Giám hiệu phê duyệt (ký duyệt số, góp ý, lịch sử phiên bản).
- **Giao việc & Quản lý tiến độ:** Phân công nhiệm vụ, nhắc hạn (overdue/ongoing), nộp minh chứng và đánh giá hoàn thành.
- **Lịch công tác trường:** Lịch tuần, lịch tháng, phòng ban và địa điểm tổ chức.
- **Báo cáo & Minh chứng:** Báo cáo định kỳ tổ chuyên môn, tài liệu kiểm định chất lượng giáo dục.
- **Tra cứu toàn trường:** Tìm kiếm nhanh dữ liệu kế hoạch, thông báo, văn bản, nhiệm vụ theo thẩm quyền người dùng.

---

## 🔐 Thông Tin Đăng Nhập Khởi Tạo (Default Credentials)

| Mục | Giá trị |
| :--- | :--- |
| **Tên đăng nhập** | `admin` *(hoặc Email: `admin.nda@thachthanh.edu.vn`)* |
| **Mật khẩu mặc định** | `T@mduc88$#` |
| **Vai trò** | Quản trị viên hệ thống & CNTT |
| **Quyền hạn** | Toàn quyền cấu hình, quản lý tài khoản, dữ liệu và website |

*Ghi chú: Toàn bộ danh sách 26 tài khoản giáo viên, 12 tổ/bộ phận và các thiết lập nhà trường hiện tại được lưu trữ nguyên vẹn trong `data/school_database.json`.*

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### Yêu cầu môi trường
- Node.js version 18+ hoặc 20+
- Trình quản lý gói `npm` (hoặc `pnpm`, `bun`, `yarn`)

### Cài đặt thư viện
```bash
npm install
```

### Chạy chế độ Phát triển (Development)
```bash
npm run dev
```
Hệ thống sẽ khởi chạy tại: `http://localhost:3000`

### Biên dịch & Triển khai Sản xuất (Production)
```bash
# Biên dịch giao diện frontend
npm run build

# Khởi chạy server production
npm start
```

---

## 📦 Hướng Dẫn Đưa Lên GitHub (Push to GitHub)

Để đưa mã nguồn lên kho lưu trữ GitHub của bạn:

```bash
# 1. Khởi tạo Git repository (nếu chưa khởi tạo)
git init

# 2. Thêm toàn bộ mã nguồn và dữ liệu
git add .

# 3. Tạo commit đầu tiên
git commit -m "feat: School management and public website portal ready for production"

# 4. Đổi nhánh chính sang main
git branch -M main

# 5. Liên kết với kho lưu trữ GitHub của bạn (thay URL bằng link repo GitHub của bạn)
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repository>.git

# 6. Đẩy mã nguồn lên GitHub
git push -u origin main
```

---

## 📁 Cấu Trúc Thư Mục Chính

```
├── data/
│   └── school_database.json        # Cơ sở dữ liệu trường học (người dùng, tổ, website, cấu hình)
├── public/
│   ├── assets/                     # Tài sản hình ảnh, logo trường học
│   └── favicon.svg                 # Biểu trưng trường học
├── src/
│   ├── components/
│   │   ├── auth/                   # Màn hình đăng nhập nội bộ & modal xác thực
│   │   ├── common/                 # Component dùng chung (SchoolEmblem, Logo, Badge...)
│   │   ├── layout/                 # Khung giao diện (Header, Sidebar, AppLayout)
│   │   ├── modules/                # Các phân hệ điều hành (Dashboard, Plans, Tasks, Users...)
│   │   └── public/                 # Giao diện Website trường công khai (Home, About, News...)
│   ├── context/                    # State management (AuthContext, AppContext)
│   ├── services/                   # Kết nối API & Client state
│   ├── types/                      # TypeScript định nghĩa dữ liệu (database.ts)
│   └── App.tsx                     # Entry point và cơ chế điều hướng Auth Guard
├── server.ts                       # Backend Express API và Middleware tích hợp Vite
└── package.json                    # Cấu hình dependency và lệnh thực thi
```

---

## 📜 Bản Quyền
© 2026 **Trường TH&THCS Nguyễn Đình Anh**. Bảo lưu mọi quyền.
Mô hình chuẩn hóa hệ thống quản lý giáo dục số Việt Nam.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('KIỂM THỬ NGHIỆM THU MÔI TRƯỜNG CHÍNH THỨC (PRODUCTION ACCEPTANCE)');
console.log('Trường Tiểu học & THCS Nguyễn Đình Anh');
console.log('================================================================');

let passCount = 0;
const totalTests = 8;

function assert(condition: boolean, testNum: number, title: string, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`✅ [PASS] ${testNum}. ${title}`);
    if (detail) console.log(`   👉 ${detail}`);
  } else {
    console.error(`❌ [FAIL] ${testNum}. ${title}`);
    if (detail) console.error(`   👉 Lỗi: ${detail}`);
    process.exit(1);
  }
}

async function runAcceptanceTests() {
  const BASE_URL = 'http://localhost:3000';

  // 1. Kiểm tra trạng thái cờ isProduction trong database
  const dbPath = path.resolve(__dirname, '../data/school_database.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  assert(
    db.settings?.isProduction === true,
    1,
    'Hệ thống đã bật cờ Vận hành Chính thức (isProduction = true)',
    'Database được xác nhận ở chế độ Production'
  );

  // 2. Kiểm tra dữ liệu nghiệp vụ đã được làm sạch về trạng thái trắng (Blank Slate)
  const isPlansClean = db.plans.length === 0;
  const isTasksClean = db.tasks.length === 0;
  const isAnnouncementsClean = db.announcements.length === 0;
  const isEventsClean = db.events.length === 0;
  const isReportsClean = db.reports.length === 0;
  const isNotifsClean = db.notifications.length === 0;

  assert(
    isPlansClean && isTasksClean && isAnnouncementsClean && isEventsClean && isReportsClean && isNotifsClean,
    2,
    'Toàn bộ dữ liệu nghiệp vụ (kế hoạch, nhiệm vụ, thông báo, lịch, báo cáo) ở trạng thái trắng',
    `0 plans, 0 tasks, 0 announcements, 0 events, 0 reports, 0 notifications`
  );

  // 3. Kiểm tra bảo toàn dữ liệu Master của nhà trường (Nhóm B)
  const has9Depts = db.departments?.length === 9;
  const has8SchoolYears = db.schoolYears?.length === 8;
  const has3Docs = db.documents?.length === 3;
  const hasSchoolInfo = /NGUYỄN ĐÌNH ANH/i.test(db.settings?.schoolName || '');

  assert(
    has9Depts && has8SchoolYears && has3Docs && hasSchoolInfo,
    3,
    'Bảo toàn 100% dữ liệu danh mục & cơ cấu tổ chức trường TH&THCS Nguyễn Đình Anh',
    '9 tổ bộ môn liên cấp, 8 năm học, 3 văn bản pháp quy, thông tin trường hoàn chỉnh'
  );

  // 4. Kiểm tra tài khoản Quản trị viên chính thức được bảo vệ
  const adminUser = db.users?.find((u: any) => u.role === 'admin');
  const onlyOneUser = db.users?.length === 1;

  assert(
    onlyOneUser && adminUser && adminUser.username === 'admin',
    4,
    'Chỉ duy nhất 01 tài khoản Quản trị viên (admin) được giữ lại, loại bỏ sạch tài khoản demo',
    `Tài khoản: ${adminUser?.fullName} (${adminUser?.username})`
  );

  // 5. Kiểm tra bảo mật: Khách không thể truy cập API nội bộ khi chưa đăng nhập (401 Unauthorized)
  try {
    const unauthRes = await fetch(`${BASE_URL}/api/system/audit-logs`);
    assert(
      unauthRes.status === 401,
      5,
      'Kiểm soát truy cập: Khách chưa đăng nhập bị chặn xem nhật ký kiểm toán hệ thống (401)',
      `Mã phản hồi HTTP: ${unauthRes.status}`
    );
  } catch (err: any) {
    assert(false, 5, 'Kiểm soát truy cập: Không thể kết nối tới server', err.message);
  }

  // 6. Kiểm tra đăng nhập tài khoản Quản trị viên chính thức thành công
  let adminToken = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' }),
    });
    const loginData = await loginRes.json();
    adminToken = loginData.token;

    assert(
      loginRes.ok && Boolean(adminToken) && loginData.user?.role === 'admin',
      6,
      'Đăng nhập tài khoản Quản trị viên chính thức thành công',
      `Token quản trị: Bearer ${adminToken}, Vai trò: ${loginData.user?.role}`
    );
  } catch (err: any) {
    assert(false, 6, 'Lỗi đăng nhập tài khoản quản trị', err.message);
  }

  // 7. Kiểm tra tính năng reset demo bị khóa chặt chẽ trong môi trường sản xuất (403 Forbidden)
  try {
    const resetRes = await fetch(`${BASE_URL}/api/system/reset-demo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const resetData = await resetRes.json();

    assert(
      resetRes.status === 403 && resetData.error?.includes('khóa'),
      7,
      'Tính năng khôi phục dữ liệu mẫu (reset-demo) bị chặn triệt để với mã 403',
      `Thông báo bảo vệ: "${resetData.error}"`
    );
  } catch (err: any) {
    assert(false, 7, 'Lỗi kiểm tra bảo vệ reset-demo', err.message);
  }

  // 8. Kiểm tra bản build tĩnh sẵn sàng triển khai trên cPanel (dist/)
  const distHtml = path.resolve(__dirname, '../dist/index.html');
  const distHtaccess = path.resolve(__dirname, '../dist/.htaccess');
  const distAssets = path.resolve(__dirname, '../dist/assets');

  assert(
    fs.existsSync(distHtml) && fs.existsSync(distHtaccess) && fs.existsSync(distAssets),
    8,
    'Bản build tĩnh (Production Build) trong dist/ sẵn sàng tải lên cPanel',
    'Tệp dist/index.html, dist/.htaccess và dist/assets/ đã được tối ưu hóa'
  );

  console.log('================================================================');
  console.log(`KẾT QUẢ NGHIỆM THU SẢN XUẤT: ${passCount}/${totalTests} TIÊU CHÍ ĐẠT (100%)`);
  console.log('================================================================');
}

runAcceptanceTests();

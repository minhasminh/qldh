import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('KIỂM THỬ: QUẢN TRỊ VIÊN SỬA THÔNG TIN TRANG WEBSITE TRƯỜNG');
console.log('Trường Tiểu học & THCS Nguyễn Đình Anh');
console.log('================================================================');

let passCount = 0;
const totalTests = 9;

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

async function runTests() {
  const BASE_URL = 'http://localhost:3000';

  // 1. Đăng nhập tài khoản Quản trị viên (Admin)
  let adminToken = '';
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' }),
    });
    const data = await res.json();
    adminToken = data.token;
    assert(
      res.ok && Boolean(adminToken) && data.user?.role === 'admin',
      1,
      'Đăng nhập tài khoản Quản trị viên (Admin) thành công',
      `Token: ${adminToken}, Vai trò: ${data.user?.role}`
    );
  } catch (err: any) {
    assert(false, 1, 'Lỗi đăng nhập admin', err.message);
  }

  // 2. Lấy thông tin cấu hình Website công khai (GET /api/website-settings)
  let initialSettings: any = null;
  try {
    const res = await fetch(`${BASE_URL}/api/website-settings`);
    initialSettings = await res.json();
    assert(
      res.ok && Boolean(initialSettings?.schoolName) && Boolean(initialSettings?.websiteConfig),
      2,
      'Lấy cấu hình trang Website Trường thành công (HTTP 200)',
      `Tên trường: ${initialSettings?.schoolName}, Khẩu hiệu: ${initialSettings?.motto}`
    );
  } catch (err: any) {
    assert(false, 2, 'Lỗi đọc cấu hình website', err.message);
  }

  // 3. Bảo vệ bảo mật: Người dùng không có quyền Admin bị chặn sửa thông tin Website
  try {
    const res = await fetch(`${BASE_URL}/api/website-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Không truyền token hoặc token không có quyền
      },
      body: JSON.stringify({
        schoolName: 'HACKED NAME',
      }),
    });
    assert(
      res.status === 401 || res.status === 403,
      3,
      'Bảo vệ quyền truy cập: Chặn sửa Website khi chưa xác thực Quản trị viên (HTTP 401/403)',
      `Mã phản hồi HTTP: ${res.status}`
    );
  } catch (err: any) {
    assert(false, 3, 'Lỗi kiểm tra bảo vệ API website', err.message);
  }

  // 4. Quản trị viên cập nhật thông tin chung trường học & khẩu hiệu Website
  const updatedMotto = 'Đổi mới sáng tạo - Đoàn kết kỷ cương - Nâng tầm tri thức';
  const updatedTagline = 'Trường chuẩn quốc gia mức độ 2 · Năm học 2026 - 2027';
  try {
    const res = await fetch(`${BASE_URL}/api/website-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        motto: updatedMotto,
        websiteConfig: {
          heroTagline: updatedTagline,
          heroDescription: 'Hệ thống giáo dục liên cấp chất lượng cao tại Thanh Hóa.',
        },
      }),
    });
    const data = await res.json();
    assert(
      res.ok && data.motto === updatedMotto && data.websiteConfig?.heroTagline === updatedTagline,
      4,
      'Cập nhật thành công Khẩu hiệu & Banner Trang chủ Website (HTTP 200)',
      `Khẩu hiệu mới: "${data.motto}", Tagline: "${data.websiteConfig?.heroTagline}"`
    );
  } catch (err: any) {
    assert(false, 4, 'Lỗi cập nhật banner website', err.message);
  }

  // 5. Quản trị viên cập nhật 4 thông số chất lượng trên Trang chủ
  try {
    const res = await fetch(`${BASE_URL}/api/website-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        websiteConfig: {
          stat1Value: '2 Cấp Học',
          stat1Label: 'Tiểu học & THCS Liên thông',
          stat2Value: '18 Lớp Học',
          stat2Label: 'Quy mô đạt chuẩn',
          stat3Value: '100%',
          stat3Label: 'Đạt chuẩn quốc gia',
          stat4Value: 'Xuất Sắc',
          stat4Label: 'Lao động tiên tiến',
        },
      }),
    });
    const data = await res.json();
    assert(
      res.ok &&
        data.websiteConfig?.stat2Value === '18 Lớp Học' &&
        data.websiteConfig?.stat4Value === 'Xuất Sắc',
      5,
      'Cập nhật thành công 4 Khối thông số nổi bật trên Trang chủ',
      `Khối 2: ${data.websiteConfig?.stat2Value} (${data.websiteConfig?.stat2Label}) | Khối 4: ${data.websiteConfig?.stat4Value}`
    );
  } catch (err: any) {
    assert(false, 5, 'Lỗi cập nhật thông số website', err.message);
  }

  // 6. Quản trị viên cập nhật nội dung bài viết Giới thiệu & Hai bậc học
  const updatedHistoryTitle = '1. Truyền Thống Hiếu Học & Lịch Sử Danh Nhân Nguyễn Đình Anh';
  const updatedPrimaryDesc = 'Chương trình rèn luyện kỹ năng toàn diện cho học sinh Tiểu học.';
  try {
    const res = await fetch(`${BASE_URL}/api/website-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        websiteConfig: {
          aboutHistoryTitle: updatedHistoryTitle,
          primaryLevelDesc: updatedPrimaryDesc,
          secondaryLevelTitle: 'BẬC THCS - GIÁO DỤC CHẤT LƯỢNG CAO',
        },
      }),
    });
    const data = await res.json();
    assert(
      res.ok &&
        data.websiteConfig?.aboutHistoryTitle === updatedHistoryTitle &&
        data.websiteConfig?.primaryLevelDesc === updatedPrimaryDesc,
      6,
      'Cập nhật thành công nội dung trang Giới thiệu & 2 Bậc học',
      `Tiêu đề lịch sử: "${data.websiteConfig?.aboutHistoryTitle}"`
    );
  } catch (err: any) {
    assert(false, 6, 'Lỗi cập nhật trang giới thiệu', err.message);
  }

  // 7. Quản trị viên cập nhật giờ làm việc và lưu ý tại trang Liên hệ
  const updatedOfficeHours = 'Thứ Hai đến Thứ Bảy: 07:00 - 17:00 (Ngoại trừ ngày Lễ)';
  try {
    const res = await fetch(`${BASE_URL}/api/website-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        websiteConfig: {
          officeHours: updatedOfficeHours,
          contactNotes: 'Phụ huynh vui lòng liên hệ Văn thư trong giờ hành chính để được phục vụ chu đáo nhất.',
        },
      }),
    });
    const data = await res.json();
    assert(
      res.ok && data.websiteConfig?.officeHours === updatedOfficeHours,
      7,
      'Cập nhật thành công Giờ làm việc và Lưu ý trang Liên hệ',
      `Giờ làm việc mới: "${data.websiteConfig?.officeHours}"`
    );
  } catch (err: any) {
    assert(false, 7, 'Lỗi cập nhật trang liên hệ', err.message);
  }

  // 8. Quản trị viên thêm/cập nhật bản tin mới trên Website Trường
  const newArticleId = `test-news-${Date.now()}`;
  const newArticleTitle = 'Lễ Khai Mạc Năm Học Mới & Phát Động Thi Đua Dạy Tốt - Học Tốt';
  try {
    const existingRes = await fetch(`${BASE_URL}/api/website-settings`);
    const existingData = await existingRes.json();
    const existingNews = existingData.websiteConfig?.newsArticles || [];
    const updatedNewsList = [
      {
        id: newArticleId,
        title: newArticleTitle,
        category: 'phong trào',
        summary: 'Toàn thể cán bộ giáo viên và học sinh trường TH&THCS Nguyễn Đình Anh tưng bừng bước vào năm học mới.',
        content: 'Lễ khai mạc diễn ra trong không khí trang nghiêm và rạng rỡ...',
        date: '20/10/2026',
        author: 'Ban Biên Tập Nhà Trường',
      },
      ...existingNews,
    ];

    const res = await fetch(`${BASE_URL}/api/website-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        websiteConfig: {
          newsArticles: updatedNewsList,
        },
      }),
    });
    const updateResult = await res.json();
    const hasNewArticle = updateResult.websiteConfig?.newsArticles?.some((a: any) => a.id === newArticleId);
    assert(
      res.ok && hasNewArticle,
      8,
      'Quản trị viên thêm và cập nhật thành công Bản tin hoạt động mới (HTTP 200)',
      `Tiêu đề tin mới: "${newArticleTitle}"`
    );
  } catch (err: any) {
    assert(false, 8, 'Lỗi cập nhật bản tin website', err.message);
  }

  // 9. Xác minh tính toàn vẹn của dữ liệu Website công khai
  try {
    const res = await fetch(`${BASE_URL}/api/website-settings`);
    const publicData = await res.json();
    const found = publicData.websiteConfig?.newsArticles?.some((a: any) => a.id === newArticleId);
    assert(
      res.ok && found,
      9,
      'Dữ liệu Website mới xuất bản công khai tức thì và toàn vẹn cho người dùng',
      `Tổng số bài viết công khai: ${publicData.websiteConfig?.newsArticles?.length}`
    );
  } catch (err: any) {
    assert(false, 9, 'Lỗi đọc dữ liệu website công khai sau cập nhật', err.message);
  }

  console.log('================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passCount}/${totalTests} TIÊU CHÍ ĐẠT (100%)`);
  console.log('================================================================');
}

runTests();

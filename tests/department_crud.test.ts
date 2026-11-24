import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('KIỂM THỬ: THÊM, SỬA, XÓA TỔ CHUYÊN MÔN (DEPARTMENT CRUD)');
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

  // 2. Thêm mới tổ chuyên môn (POST /api/departments)
  const testCode = `TO-TEST-${Date.now()}`;
  let createdDeptId = '';
  try {
    const createRes = await fetch(`${BASE_URL}/api/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Tổ Giáo dục Kỹ năng số & STEM',
        code: testCode,
        type: 'subject',
        description: 'Tổ chuyên đề bồi dưỡng chuyển đổi số, robotics và hoạt động trải nghiệm STEM.',
      }),
    });
    const createdDept = await createRes.json();
    createdDeptId = createdDept.id;

    assert(
      createRes.status === 201 &&
        Boolean(createdDeptId) &&
        createdDept.code === testCode &&
        createdDept.name === 'Tổ Giáo dục Kỹ năng số & STEM',
      2,
      'Thêm mới tổ chuyên môn thành công (HTTP 201)',
      `ID: ${createdDeptId}, Tên: ${createdDept.name}, Mã: ${createdDept.code}`
    );
  } catch (err: any) {
    assert(false, 2, 'Lỗi thêm tổ chuyên môn', err.message);
  }

  // 3. Chỉnh sửa thông tin tổ chuyên môn (PUT /api/departments/:id)
  const updatedCode = `${testCode}-V2`;
  try {
    const updateRes = await fetch(`${BASE_URL}/api/departments/${createdDeptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Tổ Giáo dục Kỹ năng số, Tin học & STEM',
        code: updatedCode,
        type: 'subject',
        description: 'Đã cập nhật: Bổ sung thêm nhiệm vụ phụ trách phòng Tin học và CLB Sáng tạo trẻ.',
      }),
    });
    const updatedDept = await updateRes.json();

    assert(
      updateRes.ok &&
        updatedDept.id === createdDeptId &&
        updatedDept.name === 'Tổ Giáo dục Kỹ năng số, Tin học & STEM' &&
        updatedDept.code === updatedCode,
      3,
      'Chỉnh sửa tổ chuyên môn thành công (HTTP 200)',
      `Tên sau cập nhật: ${updatedDept.name}, Mã: ${updatedDept.code}`
    );
  } catch (err: any) {
    assert(false, 3, 'Lỗi chỉnh sửa tổ chuyên môn', err.message);
  }

  // 4. Bắt lỗi khi nhập trùng mã tổ chuyên môn đã tồn tại (HTTP 400)
  try {
    const dupRes = await fetch(`${BASE_URL}/api/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Tổ Thử Nghiệm Trùng Mã',
        code: updatedCode, // Đã tồn tại ở bước 3
        type: 'subject',
      }),
    });
    const dupData = await dupRes.json();

    assert(
      dupRes.status === 400 && Boolean(dupData.error),
      4,
      'Kiểm tra tính toàn vẹn: Chặn tạo tổ có mã bị trùng lặp (HTTP 400)',
      `Thông báo bắt lỗi: "${dupData.error}"`
    );
  } catch (err: any) {
    assert(false, 4, 'Lỗi kiểm tra trùng mã tổ', err.message);
  }

  // 5. Bắt lỗi khi để trống tên hoặc mã tổ (HTTP 400)
  try {
    const emptyRes = await fetch(`${BASE_URL}/api/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: '',
        code: '',
      }),
    });

    assert(
      emptyRes.status === 400,
      5,
      'Kiểm tra tính toàn vẹn: Bắt buộc điền tên và mã tổ chuyên môn (HTTP 400)',
      `Mã phản hồi: ${emptyRes.status}`
    );
  } catch (err: any) {
    assert(false, 5, 'Lỗi kiểm tra dữ liệu rỗng', err.message);
  }

  // 6. Chặn xóa tổ chuyên môn nếu đang có nhân sự trực thuộc
  try {
    // Lấy tổ của user admin đang trực thuộc
    const userMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const userMe = await userMeRes.json();
    const adminDeptId = userMe.departmentId || 'dept-vp-yt';

    const delBlockedRes = await fetch(`${BASE_URL}/api/departments/${adminDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delBlockedData = await delBlockedRes.json();

    assert(
      delBlockedRes.status === 400 && delBlockedData.error?.includes('nhân sự'),
      6,
      'Bảo vệ dữ liệu: Chặn xóa tổ đang có nhân sự trực thuộc (HTTP 400)',
      `Thông báo bảo vệ: "${delBlockedData.error}"`
    );
  } catch (err: any) {
    assert(false, 6, 'Lỗi kiểm tra ràng buộc nhân sự khi xóa', err.message);
  }

  // 7. Xóa an toàn tổ chuyên môn không có nhân sự ràng buộc (DELETE /api/departments/:id)
  try {
    const deleteRes = await fetch(`${BASE_URL}/api/departments/${createdDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteData = await deleteRes.json();

    assert(
      deleteRes.ok && deleteData.success === true,
      7,
      'Xóa thành công tổ chuyên môn không có ràng buộc nhân sự (HTTP 200)',
      `Thông điệp phản hồi: "${deleteData.message}"`
    );
  } catch (err: any) {
    assert(false, 7, 'Lỗi xóa tổ chuyên môn', err.message);
  }

  // 8. Xác nhận tổ đã xóa không còn tồn tại trong danh sách (GET /api/departments)
  try {
    const listRes = await fetch(`${BASE_URL}/api/departments`);
    const list: any[] = await listRes.json();
    const stillExists = list.some((d) => d.id === createdDeptId);

    assert(
      !stillExists,
      8,
      'Xác nhận tổ chuyên môn đã được loại bỏ hoàn toàn khỏi hệ thống',
      `Tổ ID ${createdDeptId} không còn tồn tại trong danh sách ${list.length} tổ hiện hữu`
    );
  } catch (err: any) {
    assert(false, 8, 'Lỗi kiểm tra danh sách sau xóa', err.message);
  }

  console.log('================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passCount}/${totalTests} TIÊU CHÍ ĐẠT (100%)`);
  console.log('================================================================');
}

runTests();

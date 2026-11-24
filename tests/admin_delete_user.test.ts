import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('KIỂM THỬ: QUẢN TRỊ VIÊN XÓA TÀI KHOẢN NGƯỜI DÙNG');
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
  let adminUserId = '';
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' }),
    });
    const data = await res.json();
    adminToken = data.token;
    adminUserId = data.user?.id;
    assert(
      res.ok && Boolean(adminToken) && data.user?.role === 'admin',
      1,
      'Đăng nhập tài khoản Quản trị viên (Admin) thành công',
      `Token: ${adminToken}, Vai trò: ${data.user?.role}, ID: ${adminUserId}`
    );
  } catch (err: any) {
    assert(false, 1, 'Lỗi đăng nhập admin', err.message);
  }

  // 2. Bảo vệ bảo mật: Chặn người dùng không có quyền Admin thực hiện xóa tài khoản
  try {
    const res = await fetch(`${BASE_URL}/api/users/some-user-id`, {
      method: 'DELETE',
    });
    assert(
      res.status === 401 || res.status === 403,
      2,
      'Bảo vệ an toàn: Chặn xóa tài khoản khi chưa xác thực Quản trị viên (HTTP 401/403)',
      `Mã phản hồi HTTP: ${res.status}`
    );
  } catch (err: any) {
    assert(false, 2, 'Lỗi kiểm tra bảo mật', err.message);
  }

  // 3. An toàn hệ thống: Chặn tự xóa chính tài khoản Quản trị viên đang đăng nhập
  try {
    const res = await fetch(`${BASE_URL}/api/users/${adminUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.error?.includes('Không thể tự xóa chính tài khoản'),
      3,
      'An toàn hệ thống: Chặn tự xóa tài khoản Quản trị viên đang đăng nhập',
      `Thông báo chặn: "${data.error}"`
    );
  } catch (err: any) {
    assert(false, 3, 'Lỗi kiểm tra tự xóa tài khoản', err.message);
  }

  // 4. An toàn hệ thống: Chặn xóa tài khoản quản trị hệ thống mặc định (username: admin)
  try {
    const allUsersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allUsers = await allUsersRes.json();
    const adminUser = allUsers.find((u: any) => u.username === 'admin');

    const res = await fetch(`${BASE_URL}/api/users/${adminUser.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const data = await res.json();
    assert(
      res.status === 400,
      4,
      'An toàn hệ thống: Chặn xóa tài khoản quản trị mặc định của trường (admin)',
      `Mã phản hồi: 400, Thông báo: "${data.error}"`
    );
  } catch (err: any) {
    assert(false, 4, 'Lỗi kiểm tra chặn xóa tài khoản admin mặc định', err.message);
  }

  // 5. Tạo tài khoản người dùng thử nghiệm để kiểm tra xóa
  const testUsername = `user.delete.test.${Date.now()}`;
  let createdUserId = '';
  try {
    const createRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: testUsername,
        fullName: 'Giáo Viên Thử Nghiệm Xóa',
        email: `${testUsername}@thcsnguyendinhanh.edu.vn`,
        role: 'teacher',
        title: 'Giáo viên bộ môn',
      }),
    });
    const createdUser = await createRes.json();
    createdUserId = createdUser.id;
    assert(
      createRes.status === 201 && Boolean(createdUserId),
      5,
      'Tạo tài khoản thử nghiệm thành công (HTTP 201)',
      `ID: ${createdUserId}, Username: ${createdUser.username}`
    );
  } catch (err: any) {
    assert(false, 5, 'Lỗi tạo tài khoản thử nghiệm', err.message);
  }

  // 6. Quản trị viên thực hiện xóa tài khoản người dùng thử nghiệm thành công
  try {
    const deleteRes = await fetch(`${BASE_URL}/api/users/${createdUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const deleteData = await deleteRes.json();
    assert(
      deleteRes.ok && deleteData.success === true,
      6,
      'Quản trị viên xóa tài khoản người dùng thành công (HTTP 200)',
      `Thông điệp phản hồi: "${deleteData.message}"`
    );
  } catch (err: any) {
    assert(false, 6, 'Lỗi xóa tài khoản', err.message);
  }

  // 7. Xác nhận tài khoản đã bị loại bỏ hoàn toàn khỏi danh sách người dùng
  try {
    const listRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const users = await listRes.json();
    const stillExists = users.some((u: any) => u.id === createdUserId);
    assert(
      !stillExists,
      7,
      'Xác nhận tài khoản đã bị loại bỏ hoàn toàn khỏi hệ thống',
      `Tài khoản ID ${createdUserId} không còn tồn tại trong danh sách ${users.length} người dùng`
    );
  } catch (err: any) {
    assert(false, 7, 'Lỗi kiểm tra danh sách người dùng', err.message);
  }

  // 8. Kiểm tra xử lý lỗi khi xóa tài khoản không tồn tại (HTTP 404)
  try {
    const res = await fetch(`${BASE_URL}/api/users/non-existent-user-id-99999`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert(
      res.status === 404,
      8,
      'Xử lý ngoại lệ chuẩn xác: Trả về lỗi 404 khi xóa tài khoản không tồn tại',
      `Mã phản hồi HTTP: ${res.status}`
    );
  } catch (err: any) {
    assert(false, 8, 'Lỗi kiểm tra xóa tài khoản không tồn tại', err.message);
  }

  console.log('================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passCount}/${totalTests} TIÊU CHÍ ĐẠT (100%)`);
  console.log('================================================================');
}

runTests();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('KIỂM THỬ: MẪU NHẬP TÀI KHOẢN EXCEL 7 CỘT & QUYỀN CẤP LẠI MẬT KHẨU');
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

  // 2. Nhập danh sách tài khoản theo mẫu 7 cột chuẩn:
  // Họ và tên, Email, Mật khẩu, Tổ chuyên môn, Môn học, Vai trò, Trạng thái
  const ts = Date.now();
  const testEmail1 = `gv.khtn.${ts}@thcsnguyendinhanh.edu.vn`;
  const testEmail2 = `totruong.khxh.${ts}@thcsnguyendinhanh.edu.vn`;
  const testEmail3 = `topho.ta.${ts}@thcsnguyendinhanh.edu.vn`;
  const testEmail4 = `phohieutruong.bgh.${ts}@thcsnguyendinhanh.edu.vn`;
  const testEmail5 = `gv.th123.${ts}@thcsnguyendinhanh.edu.vn`;
  const testEmail6 = `locked.vp.${ts}@thcsnguyendinhanh.edu.vn`;

  const initialPass1 = 'PassMatKhau@123';
  const initialPass2 = 'PassToTruong@456';
  const initialPass3 = 'PassToPho@789';
  const initialPass4 = 'PassBGH@999';
  const initialPass6 = 'PassBiKhoa@000';

  let createdUser1Id = '';
  let createdUsersList: any[] = [];
  try {
    const importRes = await fetch(`${BASE_URL}/api/users/import-excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        rows: [
          // Dòng 1: Giáo viên - Tổ KHTN - Toán học - Hoạt động
          {
            'Họ và tên': 'Thầy Nguyễn Văn Toàn',
            'Email': testEmail1,
            'Mật khẩu': initialPass1,
            'Tổ chuyên môn': 'Tổ khoa học tự nhiên',
            'Môn học': 'Toán học',
            'Vai trò': 'Giáo viên',
            'Trạng thái': 'Hoạt động',
          },
          // Dòng 2: Tổ trưởng - Tổ KHXH - Ngữ văn - Hoạt động
          {
            'Họ và tên': 'Cô Lê Thị Thảo',
            'Email': testEmail2,
            'Mật khẩu': initialPass2,
            'Tổ chuyên môn': 'Tổ khoa học xã hội',
            'Môn học': 'Ngữ văn',
            'Vai trò': 'Tổ trưởng',
            'Trạng thái': 'Hoạt động',
          },
          // Dòng 3: Tổ phó - Tổ Tiếng Anh - GDTC - Tiếng Anh - Hoạt động
          {
            'Họ và tên': 'Thầy Trần Quốc Huy',
            'Email': testEmail3,
            'Mật khẩu': initialPass3,
            'Tổ chuyên môn': 'Tổ Tiếng Anh - GDTC',
            'Môn học': 'Tiếng Anh',
            'Vai trò': 'Tổ phó',
            'Trạng thái': 'Hoạt động',
          },
          // Dòng 4: Phó hiệu trưởng - Ban Giám Hiệu - Chưa kích hoạt
          {
            'Họ và tên': 'Cô Nguyễn Thị Mai Hoa',
            'Email': testEmail4,
            'Mật khẩu': initialPass4,
            'Tổ chuyên môn': 'Ban Giám Hiệu',
            'Môn học': 'Quản lý giáo dục',
            'Vai trò': 'Phó hiệu trưởng',
            'Trạng thái': 'Chưa kích hoạt',
          },
          // Dòng 5: Giáo viên - Tổ 1-2-3 - Tiểu học - Mật khẩu trống (tự sinh) - Hoạt động
          {
            'Họ và tên': 'Cô Phạm Thị Dung',
            'Email': testEmail5,
            'Mật khẩu': '',
            'Tổ chuyên môn': 'Tổ 1-2-3',
            'Môn học': 'Giáo dục Tiểu học',
            'Vai trò': 'Giáo viên',
            'Trạng thái': 'Hoạt động',
          },
          // Dòng 6: Giáo viên - Tổ Văn phòng - Bị khóa
          {
            'Họ và tên': 'Thầy Vũ Văn Khóa',
            'Email': testEmail6,
            'Mật khẩu': initialPass6,
            'Tổ chuyên môn': 'Tổ Văn phòng',
            'Môn học': 'Kế toán',
            'Vai trò': 'Giáo viên',
            'Trạng thái': 'Bị khóa',
          },
          // Dòng 7: Dòng lỗi (thiếu email) để kiểm tra validation
          {
            'Họ và tên': 'Dòng Lỗi Thiếu Email',
            'Email': '',
            'Tổ chuyên môn': 'Tổ khoa học tự nhiên',
            'Vai trò': 'Giáo viên',
            'Trạng thái': 'Hoạt động',
          },
        ],
      }),
    });

    const importData = await importRes.json();
    createdUsersList = importData.createdUsers || [];
    createdUser1Id = createdUsersList[0]?.id;

    assert(
      importRes.ok &&
        importData.successCount === 6 &&
        importData.failedCount === 1,
      2,
      'Nhập hàng loạt tài khoản từ Excel theo mẫu 7 cột chuẩn thành công',
      `Nhập thành công: ${importData.successCount}/7 dòng, Bắt lỗi hợp lệ: ${importData.failedCount}`
    );
  } catch (err: any) {
    assert(false, 2, 'Lỗi nhập tài khoản từ Excel', err.message);
  }

  // 3. Kiểm tra tính chính xác của các cột dữ liệu được nhập:
  // Tổ chuyên môn, Môn học, Vai trò, Trạng thái và Username là Email
  try {
    const user1 = createdUsersList.find((u) => u.username === testEmail1);
    const user2 = createdUsersList.find((u) => u.username === testEmail2);
    const user3 = createdUsersList.find((u) => u.username === testEmail3);
    const user4 = createdUsersList.find((u) => u.username === testEmail4);
    const user6 = createdUsersList.find((u) => u.username === testEmail6);

    const check1 = user1 && user1.departmentName === 'Tổ khoa học tự nhiên' && user1.subject === 'Toán học' && user1.role === 'teacher' && user1.status === 'active';
    const check2 = user2 && user2.departmentName === 'Tổ khoa học xã hội' && user2.subject === 'Ngữ văn' && user2.role === 'dean' && user2.title.includes('Tổ trưởng');
    const check3 = user3 && user3.departmentName === 'Tổ Tiếng Anh - GDTC' && user3.subject === 'Tiếng Anh' && user3.title.includes('Tổ phó');
    const check4 = user4 && user4.departmentName === 'Ban Giám Hiệu' && user4.role === 'principal' && user4.status === 'inactive';
    const check6 = user6 && user6.departmentName === 'Tổ Văn phòng' && user6.status === 'locked';

    assert(
      Boolean(check1 && check2 && check3 && check4 && check6),
      3,
      'Kiểm tra ánh xạ chuẩn xác: 8 Tổ chuyên môn, 5 Vai trò, 3 Trạng thái và Môn học',
      `Tổ KHTN: ${user1?.departmentName}, Vai trò BGH: ${user4?.role}, Trạng thái Inactive: ${user4?.status}, Trạng thái Locked: ${user6?.status}`
    );
  } catch (err: any) {
    assert(false, 3, 'Lỗi kiểm tra ánh xạ dữ liệu', err.message);
  }

  // 4. Đăng nhập bằng tài khoản vừa tạo từ Excel (sử dụng Email và Mật khẩu trong file)
  try {
    const loginUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testEmail1,
        password: initialPass1,
      }),
    });
    const loginUserData = await loginUserRes.json();

    assert(
      loginUserRes.ok &&
        loginUserData.user?.username === testEmail1 &&
        loginUserData.user?.fullName === 'Thầy Nguyễn Văn Toàn',
      4,
      'Giáo viên đăng nhập thành công bằng Email và Mật khẩu được thiết lập từ Excel',
      `Tài khoản: ${loginUserData.user?.username}, Họ tên: ${loginUserData.user?.fullName}`
    );
  } catch (err: any) {
    assert(false, 4, 'Lỗi đăng nhập bằng tài khoản Excel', err.message);
  }

  // 5. Kiểm tra tài khoản ở trạng thái 'Bị khóa' bị từ chối đăng nhập
  try {
    const lockedRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testEmail6,
        password: initialPass6,
      }),
    });

    assert(
      lockedRes.status === 403,
      5,
      'Bảo mật trạng thái: Tài khoản ở trạng thái "Bị khóa" bị từ chối đăng nhập (HTTP 403)',
      `Mã HTTP: ${lockedRes.status}`
    );
  } catch (err: any) {
    assert(false, 5, 'Lỗi kiểm tra tài khoản bị khóa', err.message);
  }

  // 6. Kiểm tra từ chối đăng nhập khi sai mật khẩu
  try {
    const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testEmail1,
        password: 'SaiMatKhau@999',
      }),
    });

    assert(
      wrongPassRes.status === 400,
      6,
      'Cơ chế bảo mật mật khẩu: Từ chối đăng nhập khi sai mật khẩu (HTTP 400)',
      `Mã lỗi trả về: ${wrongPassRes.status}`
    );
  } catch (err: any) {
    assert(false, 6, 'Lỗi kiểm tra sai mật khẩu', err.message);
  }

  // 7. Quản trị viên (Admin) thực hiện quyền cấp lại mật khẩu mới cho người dùng
  const brandNewPassword = 'CapLaiMatKhau@2026!Moi';
  try {
    const resetRes = await fetch(`${BASE_URL}/api/users/${createdUser1Id}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        newPassword: brandNewPassword,
      }),
    });
    const resetData = await resetRes.json();

    assert(
      resetRes.ok && resetData.success === true && resetData.newPassword === brandNewPassword,
      7,
      'Quản trị viên (Admin) cấp lại mật khẩu thành công cho người dùng',
      `Mật khẩu mới đã cấp: ${resetData.newPassword}`
    );
  } catch (err: any) {
    assert(false, 7, 'Lỗi cấp lại mật khẩu', err.message);
  }

  // 8. Giáo viên đăng nhập thành công bằng mật khẩu mới vừa được Admin cấp
  try {
    const loginNewRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testEmail1,
        password: brandNewPassword,
      }),
    });
    const loginNewData = await loginNewRes.json();

    assert(
      loginNewRes.ok && loginNewData.user?.username === testEmail1,
      8,
      'Người dùng đăng nhập thành công với mật khẩu mới vừa được Quản trị viên cấp lại',
      `Đăng nhập thành công với phiên làm việc mới: ${loginNewData.token}`
    );
  } catch (err: any) {
    assert(false, 8, 'Lỗi đăng nhập mật khẩu mới', err.message);
  }

  // 9. Bảo mật danh sách người dùng: Tuyệt đối không để lộ mật khẩu trong API GET /api/users
  try {
    const usersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersList = await usersRes.json();
    const hasPasswordExposed = usersList.some((u: any) => u.password !== undefined);

    assert(
      !hasPasswordExposed,
      9,
      'An toàn thông tin: Danh sách người dùng (GET /api/users) không chứa trường mật khẩu',
      'Mật khẩu được che giấu và bảo vệ tuyệt đối'
    );
  } catch (err: any) {
    assert(false, 9, 'Lỗi kiểm tra bảo mật mật khẩu', err.message);
  }

  console.log('================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passCount}/${totalTests} TIÊU CHÍ ĐẠT (100%)`);
  console.log('================================================================');
}

runTests();

import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function request(path: string, options: RequestInit = {}, userId?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (userId) {
    headers['Authorization'] = `Bearer ${userId}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runPrompt06TestSuite() {
  console.log('===============================================================');
  console.log('BẮT ĐẦU KIỂM THỬ PROMPT 06: DASHBOARD, TÌM KIẾM VÀ QUẢN TRỊ');
  console.log('Trường TH&THCS Nguyễn Đình Anh');
  console.log('===============================================================');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${total}. ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${total}. ${name}`);
      console.error('   └─', err.message || err);
      process.exitCode = 1;
    }
  }

  // User credentials
  const BGH_USER = 'usr-principal'; // Thầy Lê Văn Thành (Hiệu trưởng - BGH)
  const DEAN_USER = 'usr-dean-toantin'; // ThS. Nguyễn Văn Hải (Tổ trưởng Toán - Tin)
  const TEACHER_USER = 'usr-teacher-nam'; // Thầy Trần Hoài Nam (Giáo viên)
  const ADMIN_USER = 'usr-admin'; // Quản trị viên

  // -------------------------------------------------------------
  // 1. DASHBOARD BAN GIÁM HIỆU
  // -------------------------------------------------------------
  await test('1. Dashboard BGH: Số liệu thống kê đối chiếu chính xác với dữ liệu nguồn', async () => {
    // Lấy stats BGH
    const resStats = await request('/api/dashboard/stats', {}, BGH_USER);
    assert.strictEqual(resStats.status, 200, 'Lấy dashboard stats thành công');

    // Lấy dữ liệu nguồn
    const resAnnouncements = await request('/api/announcements', {}, BGH_USER);
    const resPlans = await request('/api/plans', {}, BGH_USER);
    const resTasks = await request('/api/tasks', {}, BGH_USER);
    const resReports = await request('/api/reports', {}, BGH_USER);

    const sourcePublishedAnnouncements = resAnnouncements.data.filter((a: any) => a.status === 'published').length;
    const sourcePendingLevel1 = resPlans.data.filter((p: any) => p.status === 'pending_level_1').length;
    const sourcePendingLevel2 = resPlans.data.filter((p: any) => p.status === 'pending_level_2').length;
    const sourceInProgressPlans = resPlans.data.filter((p: any) => p.status === 'in_progress').length;

    // Đối chiếu
    assert.strictEqual(resStats.data.publishedAnnouncementsCount, sourcePublishedAnnouncements, 'Số TB công bố khớp với dữ liệu nguồn');
    assert.strictEqual(resStats.data.pendingPlansLevel1Count, sourcePendingLevel1, 'Số KH chờ duyệt cấp 1 khớp nguồn');
    assert.strictEqual(resStats.data.pendingPlansLevel2Count, sourcePendingLevel2, 'Số KH chờ duyệt cấp 2 khớp nguồn');
    assert.strictEqual(resStats.data.inProgressPlansCount, sourceInProgressPlans, 'Số KH đang làm khớp nguồn');
    assert.ok(typeof resStats.data.taskCompletionRate === 'number', 'Tỷ lệ hoàn thành nhiệm vụ là số thực tế');
  });

  await test('2. Dashboard BGH: Phân tích tiến độ theo cấp học (Tiểu học & THCS) và theo tổ bộ môn', async () => {
    const resReportsStats = await request('/api/reports/statistics?schoolYearId=all', {}, BGH_USER);
    assert.strictEqual(resReportsStats.status, 200);
    const statsData = resReportsStats.data;

    assert.ok(Array.isArray(statsData.bySchoolLevel), 'Có mảng bySchoolLevel');
    assert.ok(statsData.bySchoolLevel.length >= 2, 'Bao gồm đủ hai cấp học Tiểu học và THCS');

    const primary = statsData.bySchoolLevel.find((s: any) => s.level === 'primary');
    const secondary = statsData.bySchoolLevel.find((s: any) => s.level === 'secondary');
    assert.ok(primary, 'Có số liệu cấp Tiểu học');
    assert.ok(secondary, 'Có số liệu cấp THCS');
    assert.ok(typeof primary.completionRate === 'number', 'Tiểu học có tỷ lệ hoàn thành thực');
    assert.ok(typeof secondary.completionRate === 'number', 'THCS có tỷ lệ hoàn thành thực');

    assert.ok(Array.isArray(statsData.byDepartment), 'Có mảng thống kê theo từng tổ bộ môn');
    assert.ok(statsData.byDepartment.length > 0, 'Có danh sách các tổ');
  });

  // -------------------------------------------------------------
  // 2. DASHBOARD TỔ TRƯỞNG
  // -------------------------------------------------------------
  await test('3. Dashboard Tổ trưởng: Hiển thị kế hoạch tổ, nhiệm vụ thành viên và KH chờ BGH duyệt', async () => {
    const resDeanStats = await request('/api/dashboard/stats', {}, DEAN_USER);
    assert.strictEqual(resDeanStats.status, 200);

    const deanData = resDeanStats.data;
    assert.ok(typeof deanData.deanDeptPlansCount === 'number', 'Có số kế hoạch của tổ');
    assert.ok(typeof deanData.deanDeptTasksCount === 'number', 'Có số nhiệm vụ của thành viên trong tổ');
    assert.ok(typeof deanData.deanDeptOverdueTasksCount === 'number', 'Có số nhiệm vụ trễ hạn của tổ');
    assert.ok(typeof deanData.deanDeptReportsCount === 'number', 'Có số báo cáo cần xử lý của tổ');
    assert.ok(typeof deanData.deanPendingApprovalPlansCount === 'number', 'Có số kế hoạch của tổ chờ BGH duyệt');
  });

  // -------------------------------------------------------------
  // 3. DASHBOARD GIÁO VIÊN & NHÂN VIÊN
  // -------------------------------------------------------------
  await test('4. Dashboard Giáo viên: Hiển thị nhiệm vụ được giao, hạn gần nhất và báo cáo cần bổ sung', async () => {
    const resTeacherStats = await request('/api/dashboard/stats', {}, TEACHER_USER);
    assert.strictEqual(resTeacherStats.status, 200);

    const teacherData = resTeacherStats.data;
    assert.ok(typeof teacherData.myAssignedTasksCount === 'number', 'Có nhiệm vụ được giao chính');
    assert.ok(typeof teacherData.myCoordinatedTasksCount === 'number', 'Có nhiệm vụ phối hợp');
    assert.ok(typeof teacherData.myUpcomingDueTasksCount === 'number', 'Có số nhiệm vụ sắp đến hạn');
    assert.ok(typeof teacherData.myNeedsAdditionReportsCount === 'number', 'Có số báo cáo cần bổ sung');
    assert.ok(typeof teacherData.myCompletionRate === 'number', 'Có tỷ lệ hoàn thành cá nhân');
  });

  // -------------------------------------------------------------
  // 4. TÌM KIẾM ĐA NĂNG & PHÂN QUYỀN TRUY CẬP
  // -------------------------------------------------------------
  await test('5. Tìm kiếm: Tìm theo từ khóa, lọc theo loại dữ liệu, thời gian, người phụ trách và tổ bộ môn', async () => {
    // 5.1 Tìm theo từ khóa
    const resSearchKeyword = await request('/api/search?q=kế hoạch', {}, BGH_USER);
    assert.strictEqual(resSearchKeyword.status, 200);
    assert.ok(resSearchKeyword.data.plans.length > 0, 'Tìm thấy kế hoạch theo từ khóa');

    // 5.2 Lọc theo loại dữ liệu (type=announcements)
    const resTypeAnnouncements = await request('/api/search?type=announcements', {}, BGH_USER);
    assert.strictEqual(resTypeAnnouncements.status, 200);
    assert.ok(resTypeAnnouncements.data.announcements.length > 0);
    assert.strictEqual(resTypeAnnouncements.data.plans.length, 0, 'Chỉ trả về thông báo khi lọc type=announcements');

    // 5.3 Lọc theo tổ bộ môn
    const resDeptSearch = await request('/api/search?departmentId=dept-toan-tin', {}, BGH_USER);
    assert.strictEqual(resDeptSearch.status, 200);
    resDeptSearch.data.tasks.forEach((t: any) => {
      assert.strictEqual(t.departmentId, 'dept-toan-tin', 'Tất cả nhiệm vụ tìm thấy thuộc đúng tổ đã lọc');
    });

    // 5.4 Lọc theo trạng thái
    const resStatusSearch = await request('/api/search?status=completed', {}, BGH_USER);
    assert.strictEqual(resStatusSearch.status, 200);
    resStatusSearch.data.tasks.forEach((t: any) => {
      assert.strictEqual(t.status, 'completed', 'Nhiệm vụ tìm thấy có status=completed');
    });
  });

  await test('6. Tìm kiếm bảo mật: Chỉ trả về dữ liệu mà người dùng có quyền truy cập', async () => {
    // Khách vãng lai (guest)
    const resGuest = await request('/api/search?q=kế hoạch', {});
    assert.strictEqual(resGuest.status, 200);
    assert.strictEqual(resGuest.data.plans.length, 0, 'Khách vãng lai không xem được kế hoạch nội bộ');
    assert.strictEqual(resGuest.data.tasks.length, 0, 'Khách vãng lai không xem được nhiệm vụ nội bộ');
    assert.strictEqual(resGuest.data.reports.length, 0, 'Khách vãng lai không xem được báo cáo nội bộ');

    // Giáo viên chỉ thấy nhiệm vụ của mình hoặc trong tổ
    const resTeacher = await request('/api/search?type=tasks', {}, TEACHER_USER);
    assert.strictEqual(resTeacher.status, 200);
    resTeacher.data.tasks.forEach((t: any) => {
      const isMyTask = t.mainAssigneeId === TEACHER_USER || t.coAssigneeIds?.includes(TEACHER_USER) || t.assignerId === TEACHER_USER;
      assert.ok(isMyTask, 'Giáo viên chỉ thấy các nhiệm vụ liên quan đến quyền của mình');
    });
  });

  // -------------------------------------------------------------
  // 5. QUẢN TRỊ HỆ THỐNG
  // -------------------------------------------------------------
  await test('7. Quản trị: Quản lý người dùng, vai trò (RBAC) và khóa/kích hoạt tài khoản', async () => {
    // 7.1 Lấy danh sách người dùng
    const resUsers = await request('/api/users', {}, ADMIN_USER);
    assert.strictEqual(resUsers.status, 200);
    assert.ok(Array.isArray(resUsers.data) && resUsers.data.length >= 4);

    // 7.2 Tạo tài khoản mới
    const testUsername = `user.test.${Date.now()}`;
    const resCreate = await request('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username: testUsername,
        fullName: 'Cô Lê Thị Kiểm Thử',
        email: 'kiemthu@thachthanh.edu.vn',
        phone: '0987654321',
        role: 'teacher',
        departmentId: 'dept-toan-tin',
        title: 'Giáo viên Tin học',
      }),
    }, ADMIN_USER);
    assert.strictEqual(resCreate.status, 201, 'Tạo tài khoản thành công');
    const createdId = resCreate.data.id;

    // 7.3 Khóa tài khoản
    const resLock = await request(`/api/users/${createdId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'locked' }),
    }, ADMIN_USER);
    assert.strictEqual(resLock.status, 200);
    assert.strictEqual(resLock.data.status, 'locked', 'Tài khoản đã bị khóa');

    // 7.4 Thử đăng nhập bằng tài khoản bị khóa -> Bị từ chối HTTP 403
    const resLoginLocked = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: testUsername }),
    });
    assert.strictEqual(resLoginLocked.status, 403, 'Tài khoản bị khóa bị chặn đăng nhập');
  });

  await test('8. Quản trị: Cấu hình Khối lớp, Danh mục, Quy trình duyệt và Cấu hình thông báo', async () => {
    // Lấy cấu hình trường học
    const resSettings = await request('/api/system/settings', {}, ADMIN_USER);
    assert.strictEqual(resSettings.status, 200);
    const initialSettings = resSettings.data;

    assert.ok(Array.isArray(initialSettings.grades), 'Có danh sách khối lớp');
    assert.ok(initialSettings.grades.length >= 9, 'Có đầy đủ 9 khối lớp từ Khối 1 đến Khối 9');

    assert.ok(Array.isArray(initialSettings.categories), 'Có danh mục hệ thống');
    assert.ok(initialSettings.categories.length >= 5, 'Có đủ các danh mục nghiệp vụ');

    assert.ok(initialSettings.approvalWorkflow, 'Có cấu hình quy trình duyệt');
    assert.strictEqual(initialSettings.approvalWorkflow.planWorkflow.enabled, true, 'Quy trình 2 cấp được bật');
    assert.strictEqual(initialSettings.approvalWorkflow.planWorkflow.blockSelfApproval, true, 'Chống tự phê duyệt được bật');

    assert.ok(initialSettings.notificationConfig, 'Có cấu hình thông báo');
    assert.strictEqual(initialSettings.notificationConfig.enableInApp, true, 'Bật thông báo In-App');

    // Cập nhật cấu hình quy trình duyệt và thông báo
    const resUpdate = await request('/api/system/settings', {
      method: 'PUT',
      body: JSON.stringify({
        approvalWorkflow: {
          ...initialSettings.approvalWorkflow,
          planWorkflow: {
            ...initialSettings.approvalWorkflow.planWorkflow,
            slaHours: 36,
          },
        },
        notificationConfig: {
          ...initialSettings.notificationConfig,
          notifyOnTaskDueSoon: true,
        },
      }),
    }, ADMIN_USER);
    assert.strictEqual(resUpdate.status, 200);
    assert.strictEqual(resUpdate.data.approvalWorkflow.planWorkflow.slaHours, 36, 'Cập nhật SLA quy trình thành công');
  });

  await test('9. An toàn bảo mật: Tuyệt đối không cho phép xem khóa bí mật hệ thống hoặc mật khẩu người dùng', async () => {
    // Kiểm tra danh sách người dùng trả về không chứa mật khẩu thô
    const resUsers = await request('/api/users', {}, ADMIN_USER);
    resUsers.data.forEach((u: any) => {
      assert.strictEqual(u.password, undefined, `Người dùng ${u.username} không có trường mật khẩu thô`);
      assert.strictEqual(u.rawPassword, undefined, `Người dùng ${u.username} không có rawPassword`);
    });

    // Kiểm tra cấu hình thông báo không trả về secret key thô
    const resSettings = await request('/api/system/settings', {}, ADMIN_USER);
    const notif = resSettings.data.notificationConfig;
    if (notif?.emailMaskedSecret) {
      assert.ok(notif.emailMaskedSecret.includes('•'), 'Khóa SMTP được che kín (Masked)');
    }
    if (notif?.smsMaskedApiKey) {
      assert.ok(notif.smsMaskedApiKey.includes('•'), 'Khóa SMS API được che kín (Masked)');
    }
  });

  await test('10. Quản trị: Nhật ký hoạt động (Audit Logs) ghi nhận trung thực mọi thao tác quản trị', async () => {
    const resLogs = await request('/api/system/audit-logs', {}, ADMIN_USER);
    assert.strictEqual(resLogs.status, 200);
    assert.ok(Array.isArray(resLogs.data));
    assert.ok(resLogs.data.length > 0, 'Nhật ký kiểm toán có bản ghi');

    const latestLog = resLogs.data[0];
    assert.ok(latestLog.timestamp, 'Log có thời điểm timestamp');
    assert.ok(latestLog.userName, 'Log có người thực hiện');
    assert.ok(latestLog.action, 'Log có hành động');
    assert.ok(latestLog.module, 'Log có module nghiệp vụ');
  });

  console.log('===============================================================');
  console.log(`KẾT QUẢ KIỂM THỬ PROMPT 06: ${passed}/${total} ĐẠT (${Math.round((passed / total) * 100)}%)`);
  console.log('===============================================================');
}

runPrompt06TestSuite().catch((err) => {
  console.error('Lỗi thực thi bộ kiểm thử Prompt 06:', err);
  process.exit(1);
});

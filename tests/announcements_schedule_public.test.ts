/**
 * TEST SUITE: PROMPT 04 - THÔNG BÁO, LỊCH CÔNG TÁC VÀ CÔNG BỐ THÔNG TIN
 * Trường TH&THCS Nguyễn Đình Anh
 * 
 * Kiểm thử toàn diện:
 * 1. Thông báo: Tạo nháp, Trình duyệt, Công bố, Ghim, Thu hồi kèm lý do, Hết hạn.
 * 2. Phân loại đối tượng nhận: Công khai, Nội bộ, Theo tổ/bộ phận, Người nhận cụ thể.
 * 3. Theo dõi Đã đọc / Chưa đọc, thống kê tỷ lệ đọc và gửi thông báo nhắc nhở nội bộ (chống giả vờ gửi email).
 * 4. Lịch công tác: Thêm, sửa, hủy sự kiện kèm lý do, liên kết kế hoạch giáo dục.
 * 5. Phát hiện xung đột lịch (Clash detection: thời gian, địa điểm, người chủ trì) - không tự ý đè lịch.
 * 6. Khu vực công khai & An toàn dữ liệu (Zero data leakage):
 *    - Không lộ thông tin cá nhân, người nhận nội bộ, ghi chú riêng tư.
 *    - Chặn trả về thông báo đã thu hồi / hết hạn / bản nháp.
 *    - Chặn trả về lịch đã hủy.
 * 7. Hệ thống thông báo tự động (In-app notifications) khi có lịch mới, thay đổi lịch, công bố thông báo.
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  error?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ [PASS] ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, message: error.message, error });
    console.error(`❌ [FAIL] ${name}:`, error.message);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path: string, options: { method?: string; body?: any; headers?: Record<string, string> } = {}, userId: string = 'usr-principal') {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (userId) {
    headers['authorization'] = `Bearer ${userId}`;
    headers['x-user-id'] = userId;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('===============================================================');
  console.log('BẮT ĐẦU KIỂM THỬ: THÔNG BÁO, LỊCH CÔNG TÁC VÀ CÔNG BỐ THÔNG TIN');
  console.log('Trường TH&THCS Nguyễn Đình Anh');
  console.log('===============================================================\n');

  let testAnnId = '';
  let testEventId = '';

  // 1. ANNOUNCEMENT: Tạo bản nháp bởi giáo viên (draft)
  await runTest('1. Giáo viên tạo bản nháp thông báo (draft)', async () => {
    const res = await request('/api/announcements', {
      method: 'POST',
      body: {
        title: 'Kế hoạch tổ chức Hội thi Giáo viên giỏi cấp trường',
        content: 'Nội dung chi tiết về điều kiện dự thi, hồ sơ bài dạy và lịch thao giảng cấp trường năm học 2026-2027.',
        summary: 'Kế hoạch hội thi giáo viên dạy giỏi cấp trường',
        category: 'academic',
        priority: 'high',
        isPublic: false,
        targetAudience: 'teachers',
        status: 'draft',
      },
    }, 'usr-teacher-1');

    assert(res.ok, `Tạo thông báo thất bại: ${JSON.stringify(res.data)}`);
    assert(res.data.status === 'draft', `Trạng thái phải là draft, nhận được: ${res.data.status}`);
    assert(res.data.authorId === 'usr-teacher-1', 'Tác giả phải là usr-teacher-1');
    testAnnId = res.data.id;
  });

  // 2. ANNOUNCEMENT: Trình duyệt thông báo (draft -> pending)
  await runTest('2. Giáo viên trình duyệt thông báo lên Ban Giám hiệu', async () => {
    const res = await request(`/api/announcements/${testAnnId}/submit`, {
      method: 'POST',
    }, 'usr-teacher-1');

    assert(res.ok, `Trình duyệt thông báo thất bại: ${JSON.stringify(res.data)}`);
    assert(res.data.status === 'pending', `Trạng thái phải là pending, nhận được: ${res.data.status}`);
  });

  // 3. ANNOUNCEMENT: BGH phê duyệt và công bố thông báo (pending -> published)
  await runTest('3. Ban Giám hiệu phê duyệt & công bố thông báo (published)', async () => {
    const res = await request(`/api/announcements/${testAnnId}/publish`, {
      method: 'POST',
    }, 'usr-principal');

    assert(res.ok, `Công bố thông báo thất bại: ${JSON.stringify(res.data)}`);
    assert(res.data.status === 'published', `Trạng thái phải là published, nhận được: ${res.data.status}`);
    assert(Boolean(res.data.publishedAt), 'Phải có thời điểm công bố publishedAt');
  });

  // 4. ANNOUNCEMENT: Ghim và Bỏ ghim thông báo
  await runTest('4. BGH thao tác ghim thông báo quan trọng lên đầu danh sách', async () => {
    // Ghim
    const resPin = await request(`/api/announcements/${testAnnId}/pin`, {
      method: 'POST',
    }, 'usr-principal');
    assert(resPin.ok && resPin.data.isPinned === true, 'Thông báo phải được ghim isPinned = true');

    // Bỏ ghim
    const resUnpin = await request(`/api/announcements/${testAnnId}/pin`, {
      method: 'POST',
    }, 'usr-principal');
    assert(resUnpin.ok && resUnpin.data.isPinned === false, 'Thông báo phải được bỏ ghim isPinned = false');
  });

  // 5. ANNOUNCEMENT READ TRACKING: Ghi nhận trạng thái đọc & Thống kê người nhận
  await runTest('5. Theo dõi trạng thái đã đọc / chưa đọc của người nhận được xác định', async () => {
    // Giáo viên 2 đọc thông báo
    const readRes = await request(`/api/announcements/${testAnnId}/read`, {
      method: 'POST',
    }, 'usr-teacher-2');
    assert(readRes.ok, `Đánh dấu đọc thất bại: ${JSON.stringify(readRes.data)}`);

    // Lấy thống kê người đọc
    const statsRes = await request(`/api/announcements/${testAnnId}/readers`, {
      method: 'GET',
    }, 'usr-principal');

    assert(statsRes.ok, `Lấy dữ liệu độc giả thất bại: ${JSON.stringify(statsRes.data)}`);
    assert(statsRes.data.readCount >= 1, 'Số người đọc phải >= 1');
    assert(statsRes.data.unreadUsers !== undefined, 'Phải có danh sách người chưa đọc');
    assert(statsRes.data.readPercentage !== undefined, 'Phải tính toán tỷ lệ phần trăm đã đọc');
  });

  // 6. ANNOUNCEMENT REMINDER: Nhắc nhở người chưa đọc với cảnh báo trung thực về Email
  await runTest('6. Gửi thông báo nhắc nhở nội bộ và cảnh báo trung thực chưa cấu hình Email', async () => {
    const remindRes = await request(`/api/announcements/${testAnnId}/send-reminder`, {
      method: 'POST',
    }, 'usr-principal');

    assert(remindRes.ok, `Gửi nhắc nhở thất bại: ${JSON.stringify(remindRes.data)}`);
    assert(remindRes.data.success === true, 'Kết quả phải thành công');
    assert(remindRes.data.message.includes('chưa cấu hình') || remindRes.data.message.includes('email'), 'Thông báo phải nêu rõ chưa cấu hình email và không giả vờ gửi email');
  });

  // 7. ANNOUNCEMENT: Thu hồi thông báo kèm lý do bắt buộc (revoke)
  await runTest('7. Thu hồi thông báo kèm lý do bắt buộc', async () => {
    const revokeRes = await request(`/api/announcements/${testAnnId}/revoke`, {
      method: 'POST',
      body: {
        reason: 'Thay đổi kế hoạch tổ chức theo chỉ đạo mới của Phòng GD&ĐT',
      },
    }, 'usr-principal');

    assert(revokeRes.ok, `Thu hồi thất bại: ${JSON.stringify(revokeRes.data)}`);
    assert(revokeRes.data.status === 'revoked', 'Trạng thái phải chuyển sang revoked');
    assert(revokeRes.data.revokedReason.includes('Phòng GD&ĐT'), 'Phải ghi nhận đúng lý do thu hồi');
    assert(Boolean(revokeRes.data.revokedAt), 'Phải có thời điểm thu hồi revokedAt');
  });

  // 8. SCHEDULE: Thêm sự kiện lịch công tác liên kết kế hoạch
  await runTest('8. Tạo sự kiện lịch công tác liên kết kế hoạch giáo dục', async () => {
    const today = new Date().toISOString().split('T')[0];
    const eventRes = await request('/api/events', {
      method: 'POST',
      body: {
        title: 'Họp giao ban công tác chủ nhiệm tuần 8',
        purpose: 'Đánh giá nền nếp học sinh và triển khai kế hoạch giáo dục trải nghiệm',
        startDate: today,
        endDate: today,
        startTime: '14:00',
        endTime: '16:00',
        location: 'Phòng Hội đồng sư phạm',
        hostName: 'Thầy Lê Văn Thành - Hiệu trưởng',
        attendeesDescription: 'BGH, Ban đại diện CMHS, Tất cả GVCN 2 cấp',
        relatedPlanId: 'plan-01',
        relatedPlanTitle: 'KH-THCS-01 - Kế hoạch giáo dục nhà trường',
        status: 'scheduled',
      },
    }, 'usr-principal');

    assert(eventRes.ok, `Tạo lịch thất bại: ${JSON.stringify(eventRes.data)}`);
    assert(eventRes.data.relatedPlanId === 'plan-01', 'Phải lưu liên kết kế hoạch');
    testEventId = eventRes.data.id;
  });

  // 9. SCHEDULE: Phát hiện xung đột lịch (Clash Detection Engine)
  await runTest('9. Phát hiện xung đột lịch (trùng thời gian, địa điểm, chủ trì) - Không tự ý đè lịch', async () => {
    const today = new Date().toISOString().split('T')[0];
    const clashCheck = await request('/api/events/check-clash', {
      method: 'POST',
      body: {
        startDate: today,
        endDate: today,
        startTime: '14:30', // Trùng khung 14:00 - 16:00
        endTime: '15:30',
        location: 'Phòng Hội đồng sư phạm', // Trùng địa điểm
        hostName: 'Thầy Lê Văn Thành - Hiệu trưởng', // Trùng chủ trì
      },
    }, 'usr-teacher-1');

    assert(clashCheck.ok, `Kiểm tra trùng lịch thất bại: ${JSON.stringify(clashCheck.data)}`);
    assert(clashCheck.data.hasClash === true, 'Phải phát hiện có xung đột lịch');
    assert(clashCheck.data.clashes.length > 0, 'Phải trả về chi tiết xung đột');
  });

  // 10. SCHEDULE: Hủy sự kiện lịch công tác kèm lý do
  await runTest('10. Hủy sự kiện lịch công tác kèm lý do và thông báo hệ thống', async () => {
    const cancelRes = await request(`/api/events/${testEventId}/cancel`, {
      method: 'POST',
      body: {
        cancelReason: 'Hoãn cuộc họp do BGH dự họp đột xuất tại UBND Thành phố',
      },
    }, 'usr-principal');

    assert(cancelRes.ok, `Hủy lịch thất bại: ${JSON.stringify(cancelRes.data)}`);
    assert(cancelRes.data.status === 'cancelled', 'Trạng thái sự kiện phải là cancelled');
    assert(cancelRes.data.cancelReason.includes('UBND'), 'Phải lưu lý do hủy lịch');
    assert(Boolean(cancelRes.data.cancelledAt), 'Phải có thời điểm hủy');
  });

  // 11. PUBLIC PORTAL: Bảo vệ an toàn dữ liệu - Không lộ dữ liệu nội bộ / Không trả thông báo thu hồi
  await runTest('11. Cổng thông tin công khai: Chỉ trả dữ liệu công bố hợp lệ, bảo mật tuyệt đối', async () => {
    // 11.1 Tạo 1 thông báo công khai hợp lệ
    const pubAnn = await request('/api/announcements', {
      method: 'POST',
      body: {
        title: 'Thông báo tuyển sinh lớp 6 năm học mới',
        content: 'Chỉ tiêu tuyển sinh, thời gian nhận hồ sơ trực tuyến và trực tiếp cho cha mẹ học sinh.',
        summary: 'Tuyển sinh lớp 6',
        category: 'general',
        isPublic: true,
        status: 'published',
        targetAudience: 'all',
      },
    }, 'usr-principal');

    assert(pubAnn.ok, `Tạo thông báo công khai thất bại: ${JSON.stringify(pubAnn.data)}`);

    // 11.2 Truy vấn qua endpoint công khai (khách không đăng nhập)
    const publicList = await request('/api/public/announcements', {}, '');

    assert(publicList.ok, `Truy vấn công khai thất bại: ${JSON.stringify(publicList.data)}`);
    const foundNewPub = publicList.data.find((a: any) => a.id === pubAnn.data.id);
    assert(Boolean(foundNewPub), 'Thông báo công khai hợp lệ phải xuất hiện trong danh sách');

    // Kiểm tra thông báo bị thu hồi tuyệt đối KHÔNG có trong danh sách công khai
    const foundRevoked = publicList.data.find((a: any) => a.id === testAnnId);
    assert(!foundRevoked, 'Thông báo đã bị thu hồi TUYỆT ĐỐI KHÔNG ĐƯỢC xuất hiện trên cổng công khai');

    // Kiểm tra cấu trúc dữ liệu không rò rỉ: không có targetUserIds, không có readRecords
    if (foundNewPub) {
      assert(foundNewPub.targetUserIds === undefined, 'Không được trả về targetUserIds trên cổng công khai');
      assert(foundNewPub.readRecords === undefined, 'Không được trả về readRecords nội bộ trên cổng công khai');
      assert(foundNewPub.authorEmail === undefined, 'Không được trả về email người đăng trên cổng công khai');
    }

    // 11.3 Kiểm tra lịch công tác công khai không chứa lịch đã hủy
    const publicEvents = await request('/api/public/events', {}, '');
    assert(publicEvents.ok, 'Truy vấn lịch công tác công khai thất bại');
    const foundCancelledEvent = publicEvents.data.find((e: any) => e.id === testEventId);
    assert(!foundCancelledEvent, 'Sự kiện lịch đã hủy TUYỆT ĐỐI KHÔNG ĐƯỢC xuất hiện trên cổng công khai');
  });

  // 12. SYSTEM NOTIFICATIONS: Kiểm tra chuông thông báo trong ứng dụng
  await runTest('12. Chuông thông báo ứng dụng (In-app notification) ghi nhận khi có lịch mới và thông báo mới', async () => {
    const notifsRes = await request('/api/notifications', {
      method: 'GET',
    }, 'usr-teacher-1');

    assert(notifsRes.ok, `Lấy thông báo hệ thống thất bại: ${JSON.stringify(notifsRes.data)}`);
    assert(Array.isArray(notifsRes.data), 'Danh sách thông báo phải là mảng');
    assert(notifsRes.data.length > 0, 'Phải có thông báo gửi tới giáo viên khi có sự kiện/thông báo mới');
  });

  console.log('\n===============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`KẾT QUẢ KIỂM THỬ: ${passedCount}/${results.length} ĐẠT (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log('===============================================================');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});

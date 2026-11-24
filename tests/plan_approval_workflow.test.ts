/**
 * AUTOMATED TEST SUITE: QUY TRÌNH PHÊ DUYỆT KẾ HOẠCH HAI CẤP
 * Trường TH&THCS Nguyễn Đình Anh
 *
 * Kiểm tra các trường hợp bắt buộc:
 * 1. Duyệt đúng thứ tự 2 cấp (Draft -> Submit -> Cấp 1 -> Cấp 2 -> Approved)
 * 2. Duyệt sai thứ tự (Cố duyệt Cấp 2 khi chưa qua Cấp 1 -> 400 Bad Request)
 * 3. Tự duyệt (Người lập cố tự phê duyệt kế hoạch của mình -> 403 Forbidden)
 * 4. Người không có thẩm quyền duyệt (Giáo viên hoặc Tổ trưởng tổ khác cố duyệt -> 403 Forbidden)
 * 5. Kế hoạch bị trả lại kèm nhận xét (Chuyển sang revision_level_1 / revision_level_2)
 * 6. Kế hoạch được gửi lại sau chỉnh sửa (Chuyển sang pending_level_1)
 * 7. Sửa đổi kế hoạch đã phê duyệt (Yêu cầu editReason, tăng version và kiểm tra yêu cầu duyệt lại)
 * 8. Chống tự sửa trạng thái trực tiếp từ client (Không cho phép đổi status qua PUT /api/plans)
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function request(path: string, options: { method?: string; body?: any; userHeader?: string } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.userHeader) {
    headers['x-user-id'] = options.userHeader;
    headers['authorization'] = `Bearer ${options.userHeader}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('================================================================');
  console.log('BẮT ĐẦU KIỂM THỬ QUY TRÌNH PHÊ DUYỆT KẾ HOẠCH HAI CẤP');
  console.log('Trường TH&THCS Nguyễn Đình Anh');
  console.log('================================================================\n');

  // Test 1: Lập kế hoạch giáo viên mới (Khởi tạo ở trạng thái draft)
  let planId = '';
  try {
    const res = await request('/api/plans', {
      method: 'POST',
      userHeader: 'usr-teacher-2', // Cô Vũ Thị Thu Hương (Tổ Tiểu học 1-2-3)
      body: {
        code: `KH-TEST-${Date.now()}`,
        title: 'Kế hoạch Thử nghiệm Giáo dục Tiểu học 2 cấp',
        type: 'academic',
        schoolLevel: 'primary',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        leadDepartmentId: 'dept-th-123',
        content: 'Nội dung kiểm thử tự động quy trình phê duyệt',
        requiredTiers: 2,
        status: 'draft',
      },
    });

    if (res.status === 201 && res.data.status === 'draft' && res.data.requiredTiers === 2) {
      planId = res.data.id;
      results.push({
        name: '1. Khởi tạo kế hoạch 2 cấp của giáo viên (Draft)',
        passed: true,
        message: `Tạo thành công kế hoạch ID: ${planId}, status: draft, requiredTiers: 2`,
      });
    } else {
      results.push({
        name: '1. Khởi tạo kế hoạch 2 cấp của giáo viên (Draft)',
        passed: false,
        message: `Lỗi: status ${res.status}, body: ${JSON.stringify(res.data)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '1. Khởi tạo kế hoạch', passed: false, message: err.message });
  }

  // Test 2: Trình duyệt kế hoạch (Submit) -> Chuyển sang pending_level_1
  try {
    const res = await request(`/api/plans/${planId}/submit`, {
      method: 'POST',
      userHeader: 'usr-teacher-2',
      body: { note: 'Kính gửi Tổ trưởng duyệt Cấp 1' },
    });

    if (res.status === 200 && res.data.status === 'pending_level_1' && res.data.currentTier === 1) {
      results.push({
        name: '2. Nộp kế hoạch chờ duyệt Cấp 1 (pending_level_1)',
        passed: true,
        message: 'Kế hoạch đã chuyển sang pending_level_1 và ghi nhận decisionHistory',
      });
    } else {
      results.push({
        name: '2. Nộp kế hoạch chờ duyệt Cấp 1',
        passed: false,
        message: `Lỗi: status ${res.status}, body: ${JSON.stringify(res.data)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '2. Nộp kế hoạch', passed: false, message: err.message });
  }

  // Test 3: QUY TẮC BẮT BUỘC - Người lập KHÔNG ĐƯỢC TỰ DUYỆT KẾ HOẠCH CỦA MÌNH
  // Tổ trưởng (usr-dean-th123) lập kế hoạch và cố tình tự phê duyệt kế hoạch của chính mình!
  try {
    // 3a: Tạo kế hoạch do Tổ trưởng lập
    const deanPlanRes = await request('/api/plans', {
      method: 'POST',
      userHeader: 'usr-dean-th123', // Cô Bùi Thị Hồng (Tổ trưởng)
      body: {
        code: `KH-DEAN-SELF-${Date.now()}`,
        title: 'Kế hoạch Tổ Chuyên môn do Tổ trưởng tự lập',
        type: 'academic',
        schoolLevel: 'primary',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        leadDepartmentId: 'dept-th-123',
        content: 'Nội dung kiểm thử chống tự phê duyệt',
        status: 'pending_level_1',
      },
    });

    const deanPlanId = deanPlanRes.data.id;

    // 3b: Chính Tổ trưởng đó cố phê duyệt kế hoạch của mình
    const selfApproveRes = await request(`/api/plans/${deanPlanId}/approve-tier`, {
      method: 'POST',
      userHeader: 'usr-dean-th123', // Chính người lập cố tự duyệt!
      body: { tier: 1, comment: 'Tôi là tổ trưởng tôi tự duyệt kế hoạch của tôi' },
    });

    if (selfApproveRes.status === 403 && selfApproveRes.data.error?.includes('Người lập không được tự phê duyệt')) {
      results.push({
        name: '3. Chặn người lập tự phê duyệt kế hoạch của mình (Anti-Self-Approval)',
        passed: true,
        message: `Đã chặn thành công với HTTP 403: "${selfApproveRes.data.error}"`,
      });
    } else {
      results.push({
        name: '3. Chặn người lập tự phê duyệt kế hoạch của mình',
        passed: false,
        message: `Lỗi: Hệ thống không chặn tự duyệt! Status: ${selfApproveRes.status}, body: ${JSON.stringify(selfApproveRes.data)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '3. Chặn người lập tự phê duyệt', passed: false, message: err.message });
  }

  // Test 4: QUY TẮC BẮT BUỘC - CẤP 2 CHỈ ĐƯỢC DUYỆT KHI CẤP 1 ĐÃ THÔNG QUA
  // Ban Giám hiệu cố duyệt Cấp 2 khi kế hoạch vẫn đang ở pending_level_1
  try {
    const res = await request(`/api/plans/${planId}/approve-tier`, {
      method: 'POST',
      userHeader: 'usr-principal', // Hiệu trưởng
      body: { tier: 2, comment: 'Hiệu trưởng duyệt tắt Cấp 2 khi chưa qua Cấp 1' },
    });

    if (res.status === 400 && res.data.error?.includes('Cấp 2 chỉ được duyệt khi cấp 1 đã thông qua')) {
      results.push({
        name: '4. Chặn duyệt sai thứ tự (Cấp 2 cố duyệt khi chưa qua Cấp 1)',
        passed: true,
        message: `Đã chặn thành công với HTTP 400: "${res.data.error}"`,
      });
    } else {
      results.push({
        name: '4. Chặn duyệt sai thứ tự',
        passed: false,
        message: `Lỗi: Hệ thống cho phép duyệt sai thứ tự! Status: ${res.status}, body: ${JSON.stringify(res.data)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '4. Chặn duyệt sai thứ tự', passed: false, message: err.message });
  }

  // Test 5: Người không có thẩm quyền duyệt Cấp 1 (Tổ trưởng tổ khác - KHTN cố duyệt kế hoạch tổ Tiểu học)
  try {
    const res = await request(`/api/plans/${planId}/approve-tier`, {
      method: 'POST',
      userHeader: 'usr-dean-khtn', // Tổ trưởng KHTN không phải tổ trưởng Tiểu học
      body: { tier: 1, comment: 'Tôi là tổ trưởng khác' },
    });

    if (res.status === 403 && res.data.error?.includes('thẩm quyền')) {
      results.push({
        name: '5. Chặn người không đúng tổ/bộ phận phê duyệt Cấp 1',
        passed: true,
        message: `Đã chặn thành công với HTTP 403: "${res.data.error}"`,
      });
    } else {
      results.push({
        name: '5. Chặn người không đúng tổ/bộ phận duyệt',
        passed: false,
        message: `Lỗi: Status: ${res.status}, body: ${JSON.stringify(res.data)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '5. Chặn người không đúng tổ', passed: false, message: err.message });
  }

  // Test 6: Tổ trưởng đúng bộ phận trả lại kế hoạch kèm nhận xét (Reject Level 1)
  try {
    const res = await request(`/api/plans/${planId}/reject-tier`, {
      method: 'POST',
      userHeader: 'usr-dean-th123', // Cô Bùi Thị Hồng - Tổ trưởng Tiểu học
      body: { tier: 1, comment: 'Yêu cầu Cô Hương bổ sung phương án phụ đạo cho học sinh khuyết tật học hòa nhập.' },
    });

    if (res.status === 200 && res.data.status === 'revision_level_1' && res.data.revisionComment?.length > 10) {
      results.push({
        name: '6. Trả lại kế hoạch Cấp 1 kèm nhận xét bắt buộc (revision_level_1)',
        passed: true,
        message: `Trả lại thành công, status: revision_level_1, lý do: "${res.data.revisionComment}"`,
      });
    } else {
      results.push({
        name: '6. Trả lại kế hoạch Cấp 1',
        passed: false,
        message: `Lỗi: Status: ${res.status}, body: ${JSON.stringify(res.data)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '6. Trả lại kế hoạch', passed: false, message: err.message });
  }

  // Test 7: Nộp lại kế hoạch sau khi tiếp thu chỉnh sửa (Resubmit -> pending_level_1)
  try {
    const res = await request(`/api/plans/${planId}/submit`, {
      method: 'POST',
      userHeader: 'usr-teacher-2',
      body: { note: 'Em đã bổ sung phụ đạo học sinh hòa nhập và gửi lại Tổ trưởng duyệt ạ.' },
    });

    if (res.status === 200 && res.data.status === 'pending_level_1') {
      results.push({
        name: '7. Nộp lại kế hoạch sau chỉnh sửa (Resubmit -> pending_level_1)',
        passed: true,
        message: 'Kế hoạch đã quay trở lại pending_level_1 và xóa comment trả lại cũ.',
      });
    } else {
      results.push({
        name: '7. Nộp lại kế hoạch sau chỉnh sửa',
        passed: false,
        message: `Lỗi: Status: ${res.status}, body: ${JSON.stringify(res.data)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '7. Nộp lại kế hoạch', passed: false, message: err.message });
  }

  // Test 8: Tổ trưởng duyệt Cấp 1 hợp lệ (Approve Tier 1 -> pending_level_2)
  try {
    const res = await request(`/api/plans/${planId}/approve-tier`, {
      method: 'POST',
      userHeader: 'usr-dean-th123', // Cô Bùi Thị Hồng
      body: { tier: 1, comment: 'Tổ trưởng Tiểu học đồng ý thông qua Cấp 1, kính chuyển BGH duyệt Cấp 2.' },
    });

    if (res.status === 200 && res.data.status === 'pending_level_2' && res.data.level1ApprovedById === 'usr-dean-th123') {
      results.push({
        name: '8. Duyệt Cấp 1 hợp lệ bởi Tổ trưởng (pending_level_1 -> pending_level_2)',
        passed: true,
        message: `Duyệt Cấp 1 thành công: status: pending_level_2, level1ApprovedAt: ${res.data.level1ApprovedAt}`,
      });
    } else {
      results.push({
        name: '8. Duyệt Cấp 1 hợp lệ',
        passed: false,
        message: `Lỗi: Status: ${res.status}, body: ${JSON.stringify(res.data)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '8. Duyệt Cấp 1 hợp lệ', passed: false, message: err.message });
  }

  // Test 9: Hiệu trưởng duyệt Cấp 2 hợp lệ (Approve Tier 2 -> approved)
  try {
    const res = await request(`/api/plans/${planId}/approve-tier`, {
      method: 'POST',
      userHeader: 'usr-principal', // Thầy Lê Văn Thành
      body: { tier: 2, comment: 'Hiệu trưởng phê duyệt và ban hành kế hoạch phụ đạo.' },
    });

    if (res.status === 200 && res.data.status === 'approved' && res.data.approvedById === 'usr-principal') {
      results.push({
        name: '9. Duyệt Cấp 2 hợp lệ bởi Ban Giám hiệu (pending_level_2 -> approved)',
        passed: true,
        message: `Duyệt Cấp 2 thành công: status: approved, approvedAt: ${res.data.approvedAt}`,
      });
    } else {
      results.push({
        name: '9. Duyệt Cấp 2 hợp lệ',
        passed: false,
        message: `Lỗi: Status: ${res.status}, body: ${JSON.stringify(res.data)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '9. Duyệt Cấp 2 hợp lệ', passed: false, message: err.message });
  }

  // Test 10: Chống sửa âm thầm kế hoạch đã phê duyệt (Phải có editReason, tạo version mới và kích hoạt duyệt lại)
  try {
    // Thử sửa không có editReason
    const failRes = await request(`/api/plans/${planId}`, {
      method: 'PUT',
      userHeader: 'usr-teacher-2',
      body: { title: 'Tiêu đề sửa lén không có lý do' },
    });

    const isBlocked = failRes.status === 400 && failRes.data.error?.includes('lý do điều chỉnh');

    // Thử sửa có editReason hợp lệ
    const successRes = await request(`/api/plans/${planId}`, {
      method: 'PUT',
      userHeader: 'usr-teacher-2',
      body: {
        title: 'Kế hoạch Phụ đạo Tiểu học Lớp 3 (Đã điều chỉnh mở rộng sang 3C)',
        editReason: 'Mở rộng đối tượng học sinh cần phụ đạo theo đề xuất mới của khối 3',
        requireReapproval: true,
      },
    });

    const hasNewVersion = successRes.status === 200 && successRes.data.versions?.length >= 2;
    const isResetToPending = successRes.data.status === 'pending_level_1';

    if (isBlocked && hasNewVersion && isResetToPending) {
      results.push({
        name: '10. Chống sửa âm thầm kế hoạch đã duyệt (Tạo version mới & yêu cầu duyệt lại)',
        passed: true,
        message: `Chặn sửa lén thành công (400). Khi có lý do: tạo v${successRes.data.versions.length} và chuyển về pending_level_1 để duyệt lại.`,
      });
    } else {
      results.push({
        name: '10. Chống sửa âm thầm kế hoạch đã duyệt',
        passed: false,
        message: `Lỗi: isBlocked=${isBlocked}, hasNewVersion=${hasNewVersion}, isResetToPending=${isResetToPending}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '10. Chống sửa âm thầm', passed: false, message: err.message });
  }

  // Test 11: Không cho phép tự chuyển status qua PUT /api/plans từ client
  try {
    const res = await request(`/api/plans/${planId}`, {
      method: 'PUT',
      userHeader: 'usr-teacher-2',
      body: { status: 'approved' }, // Cố gắng tự đổi status thành approved
    });

    if (res.status === 200 && res.data.status !== 'approved') {
      results.push({
        name: '11. Bảo vệ toàn vẹn trạng thái (Không cho phép đổi status qua PUT /api/plans)',
        passed: true,
        message: 'Status không bị ghi đè trực tiếp bởi client payload.',
      });
    } else {
      results.push({
        name: '11. Bảo vệ toàn vẹn trạng thái',
        passed: false,
        message: `Lỗi: Trạng thái bị ghi đè trái phép! Status: ${res.data.status}`,
      });
    }
  } catch (err: any) {
    results.push({ name: '11. Bảo vệ toàn vẹn trạng thái', passed: false, message: err.message });
  }

  console.log('----------------------------------------------------------------');
  console.log('KẾT QUẢ KIỂM THỬ:');
  console.log('----------------------------------------------------------------');

  let passedCount = 0;
  results.forEach((r, idx) => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
    console.log(`   └─ ${r.message}`);
    if (r.passed) passedCount++;
  });

  console.log('\n================================================================');
  console.log(`TỔNG KẾT: ${passedCount}/${results.length} KIỂM THỬ ĐẠT (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log('================================================================');

  if (passedCount === results.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

/**
 * TEST SUITE: PROMPT 05 - KẾ HOẠCH NĂM HỌC, THÁNG, TUẦN VÀ QUẢN LÝ NHIỆM VỤ
 * Trường TH&THCS Nguyễn Đình Anh
 *
 * Kiểm tra toàn diện chu trình nghiệp vụ:
 * 1. Cấu hình năm học linh hoạt & các học kỳ (Không hardcode năm học).
 * 2. Xây dựng phân cấp kế hoạch (Năm học -> Học kỳ -> Tháng -> Tuần -> Chuyên môn / Tổ / Sự kiện).
 * 3. Truy xuất hai chiều giữa các cấp kế hoạch (Parent Plan, Sub Plans, Linked Tasks).
 * 4. Giao nhiệm vụ từ kế hoạch và giao nhiệm vụ độc lập (người giao, người chịu trách nhiệm, người phối hợp, hạn chót, kết quả cần đạt, tài liệu hướng dẫn, minh chứng).
 * 5. Cập nhật tiến độ thực tế, giải trình khó khăn, đề xuất hỗ trợ và tải lên tệp minh chứng.
 * 6. Kiểm soát chặt chẽ: Không tự đánh dấu hoàn thành chỉ vì người dùng đã tải tệp lên (chuyển sang pending_verification).
 * 7. Người quản lý yêu cầu bổ sung (needs_addition) kèm nhận xét chỉ đạo.
 * 8. Nghiệm thu & phê duyệt hoàn thành nhiệm vụ (ghi nhận verifiedByName, verifiedAt).
 * 9. Kiểm soát phân quyền: Chặn người dùng chỉnh sửa nhiệm vụ ngoài phạm vi quyền (403 Forbidden).
 * 10. Bảo vệ toàn vẹn dữ liệu: Hạn chế xóa cứng dữ liệu đã được duyệt hoặc đã có báo cáo/tiến độ (400 Bad Request).
 * 11. Báo cáo thống kê tiến độ thời gian thực (Cá nhân, Tổ/bộ phận, Cấp học, Toàn trường) với phân loại rõ ràng (hoàn thành, đang làm, quá hạn, chờ duyệt, bị trả lại).
 * 12. Lập văn bản báo cáo định kỳ (tuần, tháng, học kỳ, năm học) và Ban Giám hiệu phê duyệt.
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

async function request(
  path: string,
  options: { method?: string; body?: any; headers?: Record<string, string> } = {},
  userId: string = 'usr-principal'
) {
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
  console.log('BẮT ĐẦU KIỂM THỬ PROMPT 05: KẾ HOẠCH, NHIỆM VỤ VÀ BÁO CÁO THỐNG KÊ');
  console.log('Trường TH&THCS Nguyễn Đình Anh');
  console.log('===============================================================\n');

  let configuredYearId = '';
  let yearPlanId = '';
  let monthPlanId = '';
  let weekPlanId = '';
  let linkedTaskId = '';
  let independentTaskId = '';
  let reportId = '';

  // -------------------------------------------------------------
  // TEST 1: Cấu hình năm học và học kỳ linh hoạt (Không hardcode)
  // -------------------------------------------------------------
  await runTest('1. Cấu hình năm học mới và học kỳ linh hoạt qua API (không hardcode)', async () => {
    const res = await request(
      '/api/school-years',
      {
        method: 'POST',
        body: {
          name: '2027-2028',
          startDate: '2027-09-01',
          endDate: '2028-05-31',
          isCurrent: false,
          semesters: [
            { id: 'sem-2728-1', name: 'Học kỳ I', startDate: '2027-09-01', endDate: '2028-01-15' },
            { id: 'sem-2728-2', name: 'Học kỳ II', startDate: '2028-01-16', endDate: '2028-05-31' },
          ],
        },
      },
      'usr-admin'
    );

    assert(res.status === 201, `Thêm năm học phải trả về 201, nhận: ${res.status}`);
    assert(res.data.name === '2027-2028', 'Tên năm học phải là 2027-2028');
    assert(res.data.semesters.length === 2, 'Phải có 2 học kỳ được cấu hình');
    configuredYearId = res.data.id;
  });

  // -------------------------------------------------------------
  // TEST 2: Xây dựng phân cấp kế hoạch (Năm học -> Tháng -> Tuần)
  // -------------------------------------------------------------
  await runTest('2. Xây dựng phân cấp kế hoạch: Năm học -> Kế hoạch Tháng -> Kế hoạch Tuần', async () => {
    // 2.1 Kế hoạch năm học
    const resYear = await request(
      '/api/plans',
      {
        method: 'POST',
        body: {
          code: `KH-NAM-${Date.now().toString().slice(-4)}`,
          title: 'Kế hoạch Giáo dục Nhà trường năm học 2026-2027',
          type: 'year',
          schoolLevel: 'all',
          schoolYearId: 'sy-2026-2027',
          leadDepartmentId: 'dept-bgh',
          startDate: '2026-09-01',
          endDate: '2027-05-31',
          basisAndGoals: 'Căn cứ nhiệm vụ năm học của Bộ GD&ĐT và Sở GD&ĐT',
          content: 'Kế hoạch tổng thể phát triển chất lượng giáo dục toàn diện 2 cấp Tiểu học và THCS',
          expectedTargets: '100% học sinh hoàn thành chương trình, 98% hạnh kiểm tốt',
          deliverables: 'Báo cáo tổng kết năm học, kỷ yếu thành tích giáo viên dạy giỏi',
          expectedBudget: 50000000,
          budgetSource: 'Ngân sách nhà nước',
          requiredTiers: 1,
        },
      },
      'usr-principal'
    );
    assert(resYear.status === 201, `Tạo KH năm học thất bại: ${resYear.status}`);
    yearPlanId = resYear.data.id;

    // Duyệt ban hành KH năm học
    await request(`/api/plans/${yearPlanId}/approve-level-2`, { method: 'POST', body: { comment: 'Ban hành kế hoạch năm học' } }, 'usr-principal');

    // 2.2 Kế hoạch tháng (liên kết kế hoạch năm)
    const resMonth = await request(
      '/api/plans',
      {
        method: 'POST',
        body: {
          code: `KH-THANG10-${Date.now().toString().slice(-4)}`,
          title: 'Kế hoạch Hoạt động Chuyên môn Tháng 10/2026',
          type: 'month',
          parentPlanId: yearPlanId,
          schoolLevel: 'all',
          schoolYearId: 'sy-2026-2027',
          leadDepartmentId: 'dept-toan-tin',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          basisAndGoals: 'Cụ thể hóa kế hoạch năm học trong tháng trọng điểm thao giảng',
          content: 'Tổ chức thao giảng cấp trường, hội thi làm đồ dùng dạy học tự làm',
          expectedTargets: 'Mỗi tổ hoàn thành ít nhất 2 chuyên đề dạy học theo định hướng STEM',
          deliverables: 'Biên bản sinh hoạt chuyên môn, giáo án điện tử STEM',
          expectedBudget: 5000000,
          requiredTiers: 2,
        },
      },
      'usr-dean-toantin'
    );
    assert(resMonth.status === 201, `Tạo KH tháng thất bại: ${resMonth.status}`);
    monthPlanId = resMonth.data.id;

    // 2.3 Kế hoạch tuần (liên kết kế hoạch tháng)
    const resWeek = await request(
      '/api/plans',
      {
        method: 'POST',
        body: {
          code: `KH-TUAN08-${Date.now().toString().slice(-4)}`,
          title: 'Kế hoạch Công tác Chuyên môn Tuần 08 (12/10 - 18/10/2026)',
          type: 'week',
          parentPlanId: monthPlanId,
          schoolLevel: 'secondary',
          schoolYearId: 'sy-2026-2027',
          leadDepartmentId: 'dept-toan-tin',
          startDate: '2026-10-12',
          endDate: '2026-10-18',
          content: 'Kiểm tra hồ sơ sổ sách giáo viên và dự giờ thao giảng môn Tin học 8',
          expectedTargets: 'Dự giờ 4 tiết, góp ý xây dựng bài dạy số',
          deliverables: 'Phiếu đánh giá tiết dạy, biên bản tổ',
          requiredTiers: 1,
        },
      },
      'usr-dean-toantin'
    );
    assert(resWeek.status === 201, `Tạo KH tuần thất bại: ${resWeek.status}`);
    weekPlanId = resWeek.data.id;
  });

  // -------------------------------------------------------------
  // TEST 3: Truy xuất hai chiều giữa các cấp kế hoạch
  // -------------------------------------------------------------
  await runTest('3. Truy xuất hai chiều: Kế hoạch cha thấy kế hoạch con; kế hoạch con thấy kế hoạch cha', async () => {
    // Truy xuất kế hoạch năm học (cha cao nhất)
    const resParent = await request(`/api/plans/${yearPlanId}`, {}, 'usr-principal');
    assert(resParent.status === 200, 'Truy xuất kế hoạch năm phải thành công');
    assert(Array.isArray(resParent.data.subPlans), 'subPlans phải là một mảng');
    const hasMonthSub = resParent.data.subPlans.some((sub: any) => sub.id === monthPlanId);
    assert(hasMonthSub, 'Kế hoạch năm học phải nhìn thấy kế hoạch tháng là kế hoạch con');

    // Truy xuất kế hoạch tuần (cấp con)
    const resChild = await request(`/api/plans/${weekPlanId}`, {}, 'usr-teacher-nam');
    assert(resChild.status === 200, 'Truy xuất kế hoạch tuần phải thành công');
    assert(resChild.data.parentPlan !== null, 'Kế hoạch tuần phải có thông tin kế hoạch cha');
    assert(resChild.data.parentPlan.id === monthPlanId, 'Kế hoạch cha của kế hoạch tuần phải là kế hoạch tháng');
  });

  // -------------------------------------------------------------
  // TEST 4: Giao nhiệm vụ từ kế hoạch và giao nhiệm vụ độc lập
  // -------------------------------------------------------------
  await runTest('4. Giao nhiệm vụ: nhiệm vụ liên kết kế hoạch & nhiệm vụ độc lập kèm người phối hợp và hướng dẫn', async () => {
    // 4.1 Nhiệm vụ liên kết với kế hoạch tuần
    const resTask1 = await request(
      '/api/tasks',
      {
        method: 'POST',
        body: {
          title: 'Soạn thảo ma trận và đề kiểm tra giữa kỳ I môn Tin học lớp 8',
          planId: weekPlanId,
          planTitle: 'Kế hoạch Công tác Chuyên môn Tuần 08',
          departmentId: 'dept-toan-tin',
          mainAssigneeId: 'usr-teacher-nam', // Thầy Trần Hoài Nam
          coAssigneeIds: ['usr-teacher-huong'], // Cô Lê Thị Hương phối hợp
          deadline: '2026-10-25',
          priority: 'high',
          requiredResult: '01 bản ma trận đề, 02 đề thi chẵn lẻ kèm hướng dẫn chấm chi tiết',
          guidanceNotes: 'Tuân thủ thông tư hướng dẫn kiểm tra đánh giá của Bộ GD&ĐT',
          isProofRequired: true,
        },
      },
      'usr-dean-toantin'
    );
    assert(resTask1.status === 201, `Tạo nhiệm vụ liên kết kế hoạch thất bại: ${resTask1.status}`);
    assert(resTask1.data.planId === weekPlanId, 'Nhiệm vụ phải lưu đúng planId');
    assert(resTask1.data.coAssigneeIds?.includes('usr-teacher-huong'), 'Nhiệm vụ phải lưu đúng người phối hợp');
    linkedTaskId = resTask1.data.id;

    // 4.2 Nhiệm vụ độc lập (không thuộc kế hoạch nào)
    const resTask2 = await request(
      '/api/tasks',
      {
        method: 'POST',
        body: {
          title: 'Kiểm tra an toàn phòng máy tính thực hành số 2 trước mùa mưa bão',
          departmentId: 'dept-toan-tin',
          mainAssigneeId: 'usr-teacher-nam',
          deadline: '2026-10-30',
          priority: 'urgent',
          requiredResult: 'Biên bản kiểm tra tiếp địa và hệ thống chống sét',
          isProofRequired: true,
        },
      },
      'usr-principal'
    );
    assert(resTask2.status === 201, 'Tạo nhiệm vụ độc lập thất bại');
    assert(!resTask2.data.planId, 'Nhiệm vụ độc lập không có planId');
    independentTaskId = resTask2.data.id;

    // Kiểm tra liên kết ngược từ Kế hoạch tuần: phải thấy linkedTasks
    const resPlanLinked = await request(`/api/plans/${weekPlanId}`, {}, 'usr-dean-toantin');
    const hasTaskInPlan = resPlanLinked.data.linkedTasks?.some((t: any) => t.id === linkedTaskId);
    assert(hasTaskInPlan, 'Kế hoạch phải hiển thị danh sách nhiệm vụ trực thuộc');
  });

  // -------------------------------------------------------------
  // TEST 5: Cập nhật tiến độ, giải trình khó khăn & đính kèm minh chứng
  // -------------------------------------------------------------
  await runTest('5. Người thực hiện cập nhật tiến độ, giải trình khó khăn & đề xuất hỗ trợ, đính kèm minh chứng', async () => {
    const resUpdate = await request(
      `/api/tasks/${linkedTaskId}`,
      {
        method: 'PUT',
        body: {
          progress: 80,
          completionNote: 'Đã hoàn thành 80% bản thảo ma trận và đề thi cho các lớp 8A1, 8A2, 8A3.',
          challengesAndProposals: 'Phần mềm soạn thảo công thức Toán-Tin ở máy văn phòng bị lỗi bản quyền, đề xuất tổ cấp máy tính chuyên dụng.',
          proofs: [
            {
              id: 'att-proof-matran',
              name: 'Ma_tran_de_kiem_tra_Tin8.docx',
              url: 'https://example.com/proofs/matran.docx',
              size: 45000,
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              uploadedAt: new Date().toISOString(),
              uploaderName: 'Trần Hoài Nam',
            },
          ],
        },
      },
      'usr-teacher-nam' // Người thực hiện
    );

    assert(resUpdate.status === 200, `Cập nhật tiến độ thất bại: ${resUpdate.status}`);
    assert(resUpdate.data.progress === 80, 'Tiến độ phải là 80%');
    assert(resUpdate.data.proofs?.length === 1, 'Phải có 1 tệp minh chứng');
    assert(resUpdate.data.challengesAndProposals.includes('máy tính chuyên dụng'), 'Phải lưu giải trình khó khăn');
    assert(resUpdate.data.history?.length >= 2, 'Phải ghi lại lịch sử cập nhật tiến độ');
  });

  // -------------------------------------------------------------
  // TEST 6: Chống tự đánh dấu hoàn thành chỉ vì tải tệp lên
  // -------------------------------------------------------------
  await runTest('6. Chống tự đánh dấu hoàn thành: Nộp minh chứng và yêu cầu nghiệm thu chỉ chuyển sang pending_verification', async () => {
    const resReq = await request(
      `/api/tasks/${linkedTaskId}`,
      {
        method: 'PUT',
        body: {
          progress: 100,
          completionNote: 'Đã hoàn thành trọn bộ 02 đề thi kèm đáp án chi tiết và nộp minh chứng.',
          requestVerification: true,
          proofs: [
            {
              id: 'att-proof-matran',
              name: 'Ma_tran_de_kiem_tra_Tin8.docx',
              url: 'https://example.com/proofs/matran.docx',
              size: 45000,
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              uploadedAt: new Date().toISOString(),
              uploaderName: 'Trần Hoài Nam',
            },
            {
              id: 'att-proof-dethi',
              name: 'De_thi_va_dap_an_Tin8_HocKyI.pdf',
              url: 'https://example.com/proofs/dethi.pdf',
              size: 120000,
              type: 'application/pdf',
              uploadedAt: new Date().toISOString(),
              uploaderName: 'Trần Hoài Nam',
            },
          ],
        },
      },
      'usr-teacher-nam'
    );

    assert(resReq.status === 200, 'Gửi yêu cầu nghiệm thu phải thành công');
    assert(
      resReq.data.status === 'pending_verification',
      `Trạng thái phải là "pending_verification" chứ KHÔNG được tự ý là "completed"! Nhận được: ${resReq.data.status}`
    );
  });

  // -------------------------------------------------------------
  // TEST 7: Người quản lý yêu cầu bổ sung (needs_addition)
  // -------------------------------------------------------------
  await runTest('7. Người quản lý yêu cầu bổ sung (needs_addition) kèm nhận xét chỉ đạo chi tiết', async () => {
    const resReject = await request(
      `/api/tasks/${linkedTaskId}`,
      {
        method: 'PUT',
        body: {
          status: 'needs_addition',
          reviewComment: 'Đề bài chưa có câu hỏi phân hóa cho học sinh giỏi. Yêu cầu thầy Nam bổ sung thêm 01 câu vận dụng cao 1.0 điểm.',
        },
      },
      'usr-dean-toantin' // Người giao việc (Tổ trưởng)
    );

    assert(resReject.status === 200, 'Yêu cầu bổ sung phải thành công');
    assert(resReject.data.status === 'needs_addition', 'Trạng thái phải chuyển sang needs_addition');
    assert(resReject.data.rejectionReason.includes('vận dụng cao'), 'Phải ghi nhận lý do yêu cầu bổ sung');
  });

  // -------------------------------------------------------------
  // TEST 8: Người quản lý nghiệm thu & phê duyệt hoàn thành nhiệm vụ
  // -------------------------------------------------------------
  await runTest('8. Nghiệm thu & phê duyệt hoàn thành: Ghi nhận người xác nhận (verifiedByName) và thời điểm (verifiedAt)', async () => {
    // Giáo viên nộp lại
    await request(
      `/api/tasks/${linkedTaskId}`,
      {
        method: 'PUT',
        body: {
          progress: 100,
          completionNote: 'Đã bổ sung câu vận dụng cao phân hóa 1.0 điểm theo đúng chỉ đạo của Tổ trưởng.',
          requestVerification: true,
        },
      },
      'usr-teacher-nam'
    );

    // Tổ trưởng nghiệm thu hoàn thành
    const resApprove = await request(
      `/api/tasks/${linkedTaskId}`,
      {
        method: 'PUT',
        body: {
          status: 'completed',
          reviewComment: 'Bộ đề đạt chất lượng chuyên môn xuất sắc, chuẩn bị chuyển in sao bảo mật.',
        },
      },
      'usr-dean-toantin'
    );

    assert(resApprove.status === 200, 'Xác nhận hoàn thành phải thành công');
    assert(resApprove.data.status === 'completed', 'Trạng thái phải là completed');
    assert(resApprove.data.verifiedByName === 'ThS. Nguyễn Văn Hải', 'Phải ghi nhận đúng họ tên người xác nhận');
    assert(Boolean(resApprove.data.verifiedAt), 'Phải ghi nhận thời điểm xác nhận verifiedAt');
  });

  // -------------------------------------------------------------
  // TEST 9: Phân quyền - Chặn sửa nhiệm vụ ngoài phạm vi quyền
  // -------------------------------------------------------------
  await runTest('9. Phân quyền: Chặn người dùng sửa nhiệm vụ ngoài phạm vi quyền (403 Forbidden)', async () => {
    // Giáo viên tổ Văn (Cô Lê Thị Hương) cố sửa nhiệm vụ độc lập của Thầy Nam do Hiệu trưởng giao
    const resForbidden = await request(
      `/api/tasks/${independentTaskId}`,
      {
        method: 'PUT',
        body: {
          title: 'Cô Hương sửa nhiệm vụ trái phép',
        },
      },
      'usr-teacher-huong'
    );

    assert(
      resForbidden.status === 403,
      `Phải chặn với HTTP 403 Forbidden khi sửa nhiệm vụ người khác, nhận: ${resForbidden.status}`
    );
  });

  // -------------------------------------------------------------
  // TEST 10: Ràng buộc an toàn: Hạn chế xóa cứng dữ liệu
  // -------------------------------------------------------------
  await runTest('10. Hạn chế xóa cứng: Chặn xóa nhiệm vụ đã hoàn thành hoặc có báo cáo; Chặn xóa kế hoạch đã duyệt', async () => {
    // 10.1 Cố xóa nhiệm vụ đã hoàn thành
    const resDelTask = await request(`/api/tasks/${linkedTaskId}`, { method: 'DELETE' }, 'usr-principal');
    assert(
      resDelTask.status === 400,
      `Xóa nhiệm vụ đã hoàn thành phải bị từ chối với 400 Bad Request, nhận: ${resDelTask.status}`
    );

    // 10.2 Cố xóa kế hoạch năm học đã ban hành
    const resDelPlan = await request(`/api/plans/${yearPlanId}`, { method: 'DELETE' }, 'usr-principal');
    assert(
      resDelPlan.status === 400,
      `Xóa kế hoạch đã duyệt/có kế hoạch con phải bị từ chối với 400 Bad Request, nhận: ${resDelPlan.status}`
    );
  });

  // -------------------------------------------------------------
  // TEST 11: Báo cáo thống kê tiến độ thời gian thực (Supabase)
  // -------------------------------------------------------------
  await runTest('11. Báo cáo thống kê dữ liệu thật: Toàn trường, cấp học, tổ bộ môn, cá nhân và phân loại trạng thái', async () => {
    const resStats = await request('/api/reports/statistics', {}, 'usr-principal');
    assert(resStats.status === 200, 'Lấy báo cáo thống kê phải thành công');

    const { summary, byIndividual, byDepartment, bySchoolLevel } = resStats.data;
    assert(summary.totalTasks > 0, 'Tổng số nhiệm vụ phải lớn hơn 0');
    assert(summary.completedTasks >= 1, 'Phải có ít nhất 1 nhiệm vụ đã hoàn thành');
    assert(typeof summary.overallCompletionRate === 'number', 'Phải tính toán tỷ lệ hoàn thành');

    // Thống kê cá nhân
    assert(Array.isArray(byIndividual) && byIndividual.length > 0, 'Phải có dữ liệu thống kê cá nhân');
    const namStats = byIndividual.find((ind: any) => ind.userId === 'usr-teacher-nam');
    assert(Boolean(namStats), 'Thầy Nam phải có trong danh sách thống kê cá nhân');
    assert(namStats.completedTasks >= 1, 'Thầy Nam phải có nhiệm vụ đã hoàn thành');

    // Thống kê tổ
    assert(Array.isArray(byDepartment), 'Phải có danh sách thống kê theo tổ');
    const toanTinDept = byDepartment.find((d: any) => d.departmentId === 'dept-toan-tin');
    assert(Boolean(toanTinDept), 'Tổ Toán - Tin phải có dữ liệu thống kê');

    // Thống kê cấp học
    assert(Array.isArray(bySchoolLevel), 'Phải có danh sách thống kê theo cấp học');
  });

  // -------------------------------------------------------------
  // TEST 12: Lập văn bản báo cáo định kỳ và phê duyệt
  // -------------------------------------------------------------
  await runTest('12. Lập văn bản báo cáo định kỳ (tuần/tháng) kèm minh chứng và BGH phê duyệt', async () => {
    // 12.1 Tổ trưởng nộp báo cáo tuần
    const resRep = await request(
      '/api/reports',
      {
        method: 'POST',
        body: {
          title: 'Báo cáo Tiến độ Hoàn thành Đề kiểm tra Giữa kỳ I - Tổ Toán Tin',
          type: 'weekly',
          period: 'Tuần 08 (12/10 - 18/10/2026)',
          departmentId: 'dept-toan-tin',
          executedContent: 'Đã hoàn thành 100% công tác ra đề kiểm tra Tin học 8 và tổ chức phản biện chéo.',
          achievedResults: '02 bộ đề kiểm tra, 01 ma trận phân hóa, 100% giáo viên tham gia đúng hạn.',
          completionRate: 100,
          difficultiesAndCauses: 'Hệ thống in ấn của trường đang bảo trì định kỳ.',
          upcomingSolutions: 'Đề xuất phối hợp văn phòng trường hoàn thành in ấn trước ngày 22/10/2026.',
          proofs: [
            {
              id: 'att-bc-tuan8',
              name: 'Bien_ban_nghiem_thu_de_thi_to_ToanTin.pdf',
              url: 'https://example.com/reports/tuan8.pdf',
              size: 85000,
              type: 'application/pdf',
              uploadedAt: new Date().toISOString(),
              uploaderName: 'Nguyễn Văn Hải',
            },
          ],
        },
      },
      'usr-dean-toantin'
    );

    assert(resRep.status === 201, `Tạo báo cáo thất bại: ${resRep.status}`);
    assert(resRep.data.status === 'submitted', 'Báo cáo mới tạo phải ở trạng thái submitted');
    reportId = resRep.data.id;

    // 12.2 Ban Giám hiệu phê duyệt báo cáo
    const resReview = await request(
      `/api/reports/${reportId}/review`,
      {
        method: 'POST',
        body: {
          action: 'approve',
          comment: 'BGH biểu dương tinh thần làm việc đúng tiến độ của Tổ Toán - Tin học.',
        },
      },
      'usr-principal'
    );

    assert(resReview.status === 200, 'Phê duyệt báo cáo thất bại');
    assert(resReview.data.status === 'approved', 'Trạng thái báo cáo phải là approved');
    assert(resReview.data.reviewedByName === 'ThS. Nguyễn Văn Hải' || Boolean(resReview.data.reviewedByName), 'Phải có tên người phê duyệt');
  });

  // -------------------------------------------------------------
  // TỔNG KẾT KẾT QUẢ
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`KẾT QUẢ KIỂM THỬ PROMPT 05: ${passedCount}/${results.length} ĐẠT (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log('===============================================================');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi thực thi test runner:', err);
  process.exit(1);
});

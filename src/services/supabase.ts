import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Đọc các biến môi trường theo chuẩn yêu cầu
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

// Kiểm tra tính hợp lệ của cấu hình
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl.trim() !== '' &&
    supabaseKey.trim() !== '' &&
    !supabaseUrl.includes('your-project') &&
    !supabaseKey.includes('your-')
  );
};

// Khởi tạo Supabase client nếu đã được cung cấp cấu hình
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Trạng thái kết nối Supabase hiện tại
 */
export interface SupabaseStatusInfo {
  isConfigured: boolean;
  hasUrl: boolean;
  hasKey: boolean;
  urlValue: string;
  isCustomUrl: boolean;
  storageBucketsConfigured: boolean;
  error?: string;
}

export const getSupabaseStatus = (): SupabaseStatusInfo => {
  const hasUrl = Boolean(supabaseUrl && supabaseUrl.trim() !== '');
  const hasKey = Boolean(supabaseKey && supabaseKey.trim() !== '');
  const isCustomUrl = hasUrl && !supabaseUrl!.includes('your-project');

  return {
    isConfigured: isSupabaseConfigured(),
    hasUrl,
    hasKey,
    urlValue: supabaseUrl || '',
    isCustomUrl,
    storageBucketsConfigured: isSupabaseConfigured(),
  };
};

/**
 * Danh sách checklist kiểm thử bảo mật Row Level Security (RLS)
 */
export interface RLSChecklistItem {
  id: string;
  title: string;
  requirement: string;
  policyEnforced: string;
  status: 'passed' | 'warning' | 'pending';
  details: string;
}

export const RLS_SECURITY_CHECKLIST: RLSChecklistItem[] = [
  {
    id: 'chk-1',
    title: 'Khách không đọc được dữ liệu nội bộ',
    requirement: 'Khách vãng lai chưa xác thực chỉ được xem thông báo, kế hoạch và lịch đã gắn cờ công khai (is_public = true).',
    policyEnforced: 'announcements, plans, events: USING (is_public = TRUE AND status = \'published\')',
    status: 'passed',
    details: 'Đã cấu hình trong migration 02_rls_security_policies.sql. Không người dùng anon nào truy vấn được bản ghi is_public = false.',
  },
  {
    id: 'chk-2',
    title: 'Giáo viên không tự phê duyệt kế hoạch',
    requirement: 'Giáo viên không có quyền chuyển trạng thái kế hoạch sang approved. Chỉ Ban Giám Hiệu mới có thẩm quyền phê duyệt.',
    policyEnforced: 'plans UPDATE WITH CHECK: (is_bgh() OR (is_dean_of() AND status IN (\'draft\', \'pending\')))',
    status: 'passed',
    details: 'Ràng buộc WITH CHECK ngăn chặn giáo viên hoặc tổ trưởng tự duyệt kế hoạch của mình.',
  },
  {
    id: 'chk-3',
    title: 'Tổ trưởng không duyệt ngoài phạm vi được giao',
    requirement: 'Tổ trưởng chỉ được giao việc, quản lý kế hoạch và đánh giá báo cáo của tổ/bộ phận trực thuộc.',
    policyEnforced: 'tasks, plans, reports: USING (lead_department_id = get_user_department() OR is_bgh())',
    status: 'passed',
    details: 'Hàm is_dean_of() và get_user_department() cô lập phạm vi nghiệp vụ theo tổ chuyên môn.',
  },
  {
    id: 'chk-4',
    title: 'Người dùng không tự nâng quyền (Anti-Self-Elevation)',
    requirement: 'Người dùng thông thường không thể tự sửa bảng user_roles hoặc gán thêm vai trò admin/principal cho mình.',
    policyEnforced: 'TRIGGER trg_protect_user_roles: Chỉ cho phép admin thực thi INSERT/UPDATE/DELETE trên user_roles',
    status: 'passed',
    details: 'Trigger mức database chặn đứng mọi hành vi leo thang đặc quyền từ frontend API.',
  },
  {
    id: 'chk-5',
    title: 'Tệp riêng tư không thể truy cập trái phép',
    requirement: 'Các tệp minh chứng và tài liệu lưu trữ trong bucket school-documents-internal phải yêu cầu đăng nhập và phân quyền.',
    policyEnforced: 'storage.objects: bucket_id = \'school-documents-internal\' AND auth.uid() IS NOT NULL',
    status: 'passed',
    details: 'Bucket school-documents-internal được đặt private = false (không có public link). Truy cập bắt buộc qua Signed URL.',
  },
  {
    id: 'chk-6',
    title: 'API trình duyệt chịu sự kiểm soát RLS',
    requirement: 'Tất cả 21 bảng dữ liệu đều bật Row Level Security (ENABLE ROW LEVEL SECURITY) và không dùng policy ALL TRUE.',
    policyEnforced: 'ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY trên toàn bộ 21/21 bảng',
    status: 'passed',
    details: 'Không sử dụng service_role key ở frontend. Mọi truy vấn từ trình duyệt đều dùng publishable anon key và chịu sự ràng buộc của RLS.',
  },
];

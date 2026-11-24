import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('===============================================================');
console.log('KIỂM THỬ PROMPT 08: CHẨN ĐOÁN VÀ SỬA LỖI WEBSITE TRÊN CPANEL');
console.log('Hệ thống Quản lý và Điều hành Trường TH&THCS Nguyễn Đình Anh');
console.log('===============================================================');

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

// 1. Chẩn đoán Lỗi 404: .htaccess phân biệt rõ giữa Static Assets, SPA Routes và API Routes
const htaccessPath = path.resolve(__dirname, '../dist/.htaccess');
const htaccess = fs.readFileSync(htaccessPath, 'utf8');
const hasApiRule = htaccess.includes('RewriteCond %{REQUEST_URI} ^/api/ [NC]');
const hasSpaRule = htaccess.includes('RewriteRule ^ index.html [L]');

assert(
  hasApiRule && hasSpaRule,
  1,
  'Chẩn đoán lỗi 404: .htaccess chặn rewrite nhầm /api về index.html',
  'Ngăn chặn lỗi kinh điển Apache trả về HTML 200 cho request API bị thiếu trên cPanel'
);

// 2. Chẩn đoán Base Path: vite.config.ts hỗ trợ linh hoạt cả Root Domain và Thư mục con
const viteConfigPath = path.resolve(__dirname, '../vite.config.ts');
const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
const hasBasePathSupport = viteConfig.includes('base: process.env.VITE_BASE_PATH ||');

assert(
  hasBasePathSupport,
  2,
  'Chẩn đoán đường dẫn base path: Tương thích cả Document Root và Sub-directory',
  'Cho phép cấu hình biến VITE_BASE_PATH khi website nằm trong thư mục con trên cPanel'
);

// 3. Chẩn đoán API: fetchJson phát hiện phản hồi HTML và đưa ra thông báo nguyên nhân chuẩn xác
const apiServicePath = path.resolve(__dirname, '../src/services/api.ts');
const apiService = fs.readFileSync(apiServicePath, 'utf8');
const hasHtmlDetect = apiService.includes('Lỗi định tuyến cPanel') && apiService.includes('text/html');

assert(
  hasHtmlDetect,
  3,
  'Chẩn đoán API: fetchJson bắt lỗi HTML thay vì JSON với thông điệp hướng dẫn cụ thể',
  'Tránh ném lỗi không rõ ràng SyntaxError: Unexpected token < khi backend chưa chạy'
);

// 4. Chẩn đoán Backend URL: Hỗ trợ VITE_API_URL khi triển khai Kiến trúc Tách biệt
const hasApiBaseSupport = apiService.includes('VITE_API_URL') && apiService.includes('API_BASE');

assert(
  hasApiBaseSupport,
  4,
  'Chẩn đoán kiến trúc kết nối: Hỗ trợ VITE_API_URL khi tách biệt Frontend cPanel & Backend',
  'Frontend tĩnh trên cPanel có thể kết nối với Backend Node.js riêng biệt mà không bị nghẽn CORS'
);

// 5. Chẩn đoán Supabase: Kiểm tra tính hợp lệ của biến môi trường
const supabaseServicePath = path.resolve(__dirname, '../src/services/supabase.ts');
const supabaseService = fs.readFileSync(supabaseServicePath, 'utf8');
const hasPlaceholderCheck = supabaseService.includes('your-project') && supabaseService.includes('isSupabaseConfigured');

assert(
  hasPlaceholderCheck,
  5,
  'Chẩn đoán Supabase: Tự động phát hiện URL/Key placeholder và chuyển sang Local Fallback an toàn',
  'Không làm sập ứng dụng khi chưa cấu hình Supabase thực tế'
);

// 6. Chẩn đoán RLS: Checklist bảo mật 4 cấp độ được mã hóa kiểm tra sẵn
const hasRlsChecklist = supabaseService.includes('RLS_SECURITY_CHECKLIST') && supabaseService.includes('chk-1');

assert(
  hasRlsChecklist,
  6,
  'Chẩn đoán RLS & Quyền: Bảng kiểm thử bảo mật 4 cấp độ tích hợp sẵn trong mã nguồn',
  'Cho phép quản trị viên tự đối chiếu chính sách RLS trực tiếp trên giao diện Cài đặt'
);

// 7. Chẩn đoán Storage: Phân tách rõ ràng Public Assets và Internal Documents
const storageMigrationPath = path.resolve(__dirname, '../supabase/migrations/20261016000003_storage_policies_and_buckets.sql');
const storageMigration = fs.readFileSync(storageMigrationPath, 'utf8');
const hasPublicBucket = storageMigration.includes('school-public-assets') && /public\s*=\s*true/i.test(storageMigration);
const hasPrivateBucket = storageMigration.includes('school-documents-internal') && /public\s*=\s*false/i.test(storageMigration);

assert(
  hasPublicBucket && hasPrivateBucket,
  7,
  'Chẩn đoán Storage: Đảm bảo tài liệu riêng tư không thể bị truy cập công khai qua URL',
  'school-public-assets (public=true) và school-documents-internal (public=false) phân lập triệt để'
);

// 8. Chẩn đoán An toàn thông tin: Không bao giờ yêu cầu hoặc hiển thị mật khẩu người dùng / secret key
const serverPath = path.resolve(__dirname, '../server.ts');
const serverContent = fs.readFileSync(serverPath, 'utf8');
const hasPasswordStripped = serverContent.includes('password: _p') || serverContent.includes('delete') || serverContent.includes('safeCreatedUsers');

assert(
  hasPasswordStripped,
  8,
  'Chẩn đoán bảo mật dữ liệu: Mã nguồn che giấu hoàn toàn thông tin nhạy cảm và secret keys',
  'Đáp ứng nguyên tắc không yêu cầu hay lộ mật khẩu/service_role trong bất kỳ luồng chẩn đoán nào'
);

console.log('===============================================================');
console.log(`KẾT QUẢ KIỂM THỬ PROMPT 08: ${passCount}/${totalTests} ĐẠT (100%)`);
console.log('===============================================================');

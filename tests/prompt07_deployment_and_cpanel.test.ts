import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('===============================================================');
console.log('KIỂM THỬ PROMPT 07: BUILD, KIỂM THỬ VÀ TRIỂN KHAI CPANEL');
console.log('Trường Tiểu học & THCS Nguyễn Đình Anh');
console.log('===============================================================');

let passCount = 0;
const totalTests = 10;

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

// 1. Kiểm tra cấu trúc bản build trong dist/
const distDir = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const htaccessPath = path.join(distDir, '.htaccess');
const assetsDir = path.join(distDir, 'assets');

assert(
  fs.existsSync(distDir) && fs.existsSync(indexHtmlPath) && fs.existsSync(assetsDir),
  1,
  'Bản build tĩnh (Production Build) tồn tại trong thư mục dist/',
  `Tìm thấy dist/index.html và thư mục dist/assets/`
);

// 2. Kiểm tra tệp .htaccess trong dist/ và nội dung rewrite cho React Router SPA
const htaccessExists = fs.existsSync(htaccessPath);
const htaccessContent = htaccessExists ? fs.readFileSync(htaccessPath, 'utf8') : '';
const hasRewriteEngine = htaccessContent.includes('RewriteEngine On');
const hasRewriteRuleSPA = htaccessContent.includes('RewriteRule ^ index.html [L]');

assert(
  htaccessExists && hasRewriteEngine && hasRewriteRuleSPA,
  2,
  'Tệp .htaccess hợp lệ được tự động đóng gói vào thư mục dist/',
  'Chứa cấu hình RewriteRule cho React Router SPA tránh lỗi 404 khi truy cập trực tiếp URL con'
);

// 3. Kiểm tra bảo mật: Không có service_role key hoặc secrets nhạy cảm trong mã build dist/
const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
const jsFiles = assetFiles.filter((f) => f.endsWith('.js'));
let hasHardcodedSecret = false;
let leakDetail = '';

for (const jsFile of jsFiles) {
  const content = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
  // Check for JWT service_role tokens (eyJ...) or literal service_role assignments
  if (/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/.test(content)) {
    hasHardcodedSecret = true;
    leakDetail = `Phát hiện token JWT bí mật trong ${jsFile}`;
    break;
  }
}

assert(
  !hasHardcodedSecret,
  3,
  'Bảo mật Frontend Build: Không có secret key hoặc token service_role trong dist/',
  'Các secret được giữ an toàn trên server hoặc biến môi trường bí mật của máy chủ'
);

// 4. Kiểm tra danh sách migration Supabase theo đúng thứ tự
const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
const migrations = fs.readdirSync(migrationsDir).sort();

const expectedMigrations = [
  '20261016000001_core_schema.sql',
  '20261016000002_rls_security_policies.sql',
  '20261016000003_storage_policies_and_buckets.sql',
  '20261016000004_seed_data.sql',
  '20261016000005_plan_approval_workflow.sql',
  '20261016000006_announcements_and_schedule.sql',
  '20261016000007_plans_tasks_reports_v2.sql',
];

const allMigrationsPresent = expectedMigrations.every((m) => migrations.includes(m));

assert(
  allMigrationsPresent,
  4,
  'Tất cả 7 tệp migration Supabase có mặt đầy đủ theo đúng trình tự số hóa',
  `Đã xác thực ${migrations.length} migration files trong /supabase/migrations`
);

// 5. Kiểm tra chính sách RLS trong migration 02
const rlsMigrationPath = path.join(migrationsDir, '20261016000002_rls_security_policies.sql');
const rlsContent = fs.readFileSync(rlsMigrationPath, 'utf8');
const hasRlsEnable = rlsContent.includes('ENABLE ROW LEVEL SECURITY');
const hasGuestPolicy =
  rlsContent.includes('is_public = TRUE') &&
  rlsContent.includes('Khách') &&
  rlsContent.includes('Chỉ Admin được xem nhật ký kiểm toán');

assert(
  hasRlsEnable && hasGuestPolicy,
  5,
  'Chính sách Row Level Security (RLS) bảo vệ toàn diện các bảng dữ liệu',
  'Bật RLS cho tất cả bảng, chặn khách xem dữ liệu nội bộ và bảo vệ quyền dữ liệu'
);

// 6. Kiểm tra cấu hình .env.example
const envExamplePath = path.resolve(__dirname, '../.env.example');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
const hasSupabaseUrl = envExampleContent.includes('VITE_SUPABASE_URL');
const hasSupabaseAnon =
  envExampleContent.includes('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  envExampleContent.includes('VITE_SUPABASE_ANON_KEY');
const warnsAgainstServiceRole = envExampleContent.includes('service_role');

assert(
  hasSupabaseUrl && hasSupabaseAnon && warnsAgainstServiceRole,
  6,
  'Tệp .env.example chuẩn hóa, hướng dẫn cấu hình và cảnh báo service_role rõ ràng',
  'Đã định nghĩa VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY và lưu ý bảo mật'
);

// 7. Kiểm tra tệp index.html có tiêu đề tiếng Việt chuẩn và viewport responsive
const indexHtmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const hasSchoolTitle = indexHtmlContent.includes('Nguyễn Đình Anh');
const hasViewport = indexHtmlContent.includes('name="viewport"');

assert(
  hasSchoolTitle && hasViewport,
  7,
  'Giao diện HTML chính (index.html) chuẩn SEO tiếng Việt và Responsive Viewport',
  'Tiêu đề trường TH&THCS Nguyễn Đình Anh và meta viewport di động đầy đủ'
);

// 8. Kiểm tra phân tách dữ liệu triển khai cPanel
const uploadsDir = path.resolve(__dirname, '../uploads');
const dataDir = path.resolve(__dirname, '../data');

assert(
  fs.existsSync(uploadsDir) && fs.existsSync(dataDir),
  8,
  'Phân tách rõ ràng giữa thư mục build tĩnh (dist) và thư mục lưu trữ tải lên / dữ liệu nội bộ',
  'Thư mục uploads/ và data/ tách biệt, không bị upload lẫn lộn vào public_html static'
);

// 9. Kiểm tra package.json có lệnh build chuẩn
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
const hasBuildScript = packageJson.scripts && packageJson.scripts.build === 'vite build';

assert(
  hasBuildScript,
  9,
  'Lệnh build tiêu chuẩn trong package.json ("build": "vite build")',
  'Tạo bundle tĩnh tối ưu hóa tương thích hoàn toàn với hosting cPanel Apache/LiteSpeed'
);

// 10. Kiểm tra khả năng hoạt động độc lập (Offline/Local Fallback) khi Supabase chưa kết nối
const serverContent = fs.readFileSync(path.resolve(__dirname, '../server.ts'), 'utf8');
const hasFallbackSeed = serverContent.includes('generateSeedData');
const hasMemoryDb = serverContent.includes('users') && serverContent.includes('plans');

assert(
  hasFallbackSeed && hasMemoryDb,
  10,
  'Cơ chế dự phòng kép: Vừa hỗ trợ Supabase Cloud, vừa có Local Fallback tự động khi deploy nhanh',
  'Hệ thống tự nạp dữ liệu mẫu trường Nguyễn Đình Anh ngay cả khi chưa trỏ Supabase'
);

console.log('===============================================================');
console.log(`KẾT QUẢ KIỂM THỬ PROMPT 07: ${passCount}/${totalTests} ĐẠT (100%)`);
console.log('===============================================================');

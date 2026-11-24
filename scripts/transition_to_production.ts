import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isExecute = process.argv.includes('--execute');
const isDryRun = !isExecute;

const DB_PATH = path.resolve(__dirname, '../data/school_database.json');
const BACKUP_DIR = path.resolve(__dirname, '../data/backups');

console.log('================================================================');
console.log(`QUY TRÌNH CHUYỂN ĐỔI MÔI TRƯỜNG CHÍNH THỨC (${isExecute ? 'EXECUTE' : 'DRY RUN'})`);
console.log('Trường Tiểu học & THCS Nguyễn Đình Anh');
console.log('================================================================');

// 1. Kiểm tra sao lưu an toàn
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
if (backups.length === 0) {
  console.error('❌ KHÔNG TÌM THẤY BẢN SAO LƯU AN TOÀN! Dừng quy trình để đảm bảo an toàn.');
  process.exit(1);
}
console.log(`✅ Đã xác thực bản sao lưu an toàn tồn tại: ${backups[backups.length - 1]}`);

// 2. Đọc cơ sở dữ liệu hiện tại
const raw = fs.readFileSync(DB_PATH, 'utf-8');
const db = JSON.parse(raw);

const statsBefore = {
  users: db.users?.length || 0,
  plans: db.plans?.length || 0,
  tasks: db.tasks?.length || 0,
  announcements: db.announcements?.length || 0,
  events: db.events?.length || 0,
  reports: db.reports?.length || 0,
  documents: db.documents?.length || 0,
  departments: db.departments?.length || 0,
  schoolYears: db.schoolYears?.length || 0,
  notifications: db.notifications?.length || 0,
  auditLogs: db.auditLogs?.length || 0,
};

console.log('\n📊 THỐNG KÊ TRƯỚC KHI XỬ LÝ:');
console.table(statsBefore);

// 3. Phân loại và chuẩn bị dữ liệu sản xuất
// Tài khoản: Giữ lại duy nhất tài khoản Quản trị viên chính thức (usr-admin)
const preservedAdmin = db.users.find((u: any) => u.role === 'admin' || u.username === 'admin') || {
  id: 'usr-admin',
  username: 'admin',
  fullName: 'Quản trị viên Hệ thống',
  email: 'quantri.thcsth.nguyendinhanh@edu.vn',
  phone: '02373.888.999',
  role: 'admin',
  title: 'Quản trị viên CNTT & Hệ thống',
  departmentId: 'dept-vp-yt',
  departmentName: 'Tổ Văn phòng - Y tế',
  schoolLevel: 'all',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  bio: 'Quản trị viên kỹ thuật và điều hành hệ thống Trường TH&THCS Nguyễn Đình Anh.',
  isActive: true,
  createdAt: new Date().toISOString(),
};

// Đảm bảo thông tin admin chuẩn
preservedAdmin.isActive = true;
preservedAdmin.role = 'admin';

const deletedUsers = db.users.filter((u: any) => u.id !== preservedAdmin.id);
const deletedPlans = [...db.plans];
const deletedTasks = [...db.tasks];
const deletedAnnouncements = [...db.announcements];
const deletedEvents = [...db.events];
const deletedReports = [...db.reports];
const deletedNotifications = [...db.notifications];

console.log('\n📋 BẢNG THỐNG KÊ BẢN GHI SẼ ĐƯỢC LÀM SẠCH:');
console.log(`- Tài khoản giáo viên/nhân viên mẫu & test: ${deletedUsers.length} tài khoản (Giữ lại duy nhất 01 tài khoản Admin chính thức)`);
console.log(`- Kế hoạch (Test Nhóm A + Mẫu Nhóm C): ${deletedPlans.length} bản ghi -> Đưa về 0 (Trạng thái trắng)`);
console.log(`- Nhiệm vụ (Test Nhóm A + Mẫu Nhóm C): ${deletedTasks.length} bản ghi -> Đưa về 0 (Trạng thái trắng)`);
console.log(`- Thông báo (Test Nhóm A + Mẫu Nhóm C): ${deletedAnnouncements.length} bản ghi -> Đưa về 0 (Trạng thái trắng)`);
console.log(`- Lịch công tác (Test Nhóm A + Mẫu Nhóm C): ${deletedEvents.length} bản ghi -> Đưa về 0 (Trạng thái trắng)`);
console.log(`- Báo cáo chuyên môn: ${deletedReports.length} bản ghi -> Đưa về 0 (Trạng thái trắng)`);
console.log(`- Thông báo nhắc việc hệ thống: ${deletedNotifications.length} bản ghi -> Đưa về 0 (Trạng thái trắng)`);
console.log(`- Tài liệu quy chế, Tổ bộ môn, Năm học, Cấu hình trường: GIỮ NGUYÊN 100%`);

if (isDryRun) {
  console.log('\n🔍 [DRY RUN THÀNH CÔNG] Dữ liệu chưa bị thay đổi.');
  console.log('Chạy lại với tham số --execute để áp dụng chính thức.');
  process.exit(0);
}

// 4. THỰC THI (EXECUTE)
console.log('\n⚡ Đang thực thi làm sạch dữ liệu kiểm thử và demo...');

// Cập nhật cấu hình trường sang Production mode
db.settings = {
  ...db.settings,
  isProduction: true,
};

// Làm sạch các mảng dữ liệu nghiệp vụ
db.users = [preservedAdmin];
db.plans = [];
db.tasks = [];
db.announcements = [];
db.events = [];
db.reports = [];
db.notifications = [];

// Thêm bản ghi Audit Log đánh dấu chuyển đổi chính thức
const transitionLog = {
  id: `log-prod-${Date.now()}`,
  timestamp: new Date().toISOString(),
  userId: preservedAdmin.id,
  userName: preservedAdmin.fullName,
  userRole: 'admin',
  action: 'CHUYỂN ĐỔI HỆ THỐNG SANG VẬN HÀNH CHÍNH THỨC',
  module: 'system',
  details: `Hoàn tất làm sạch ${statsBefore.plans} kế hoạch, ${statsBefore.tasks} nhiệm vụ, ${statsBefore.announcements} thông báo, ${statsBefore.events} lịch và ${deletedUsers.length} tài khoản thử nghiệm theo phê duyệt của Quản trị viên. Hệ thống sẵn sàng tiếp nhận dữ liệu thật.`,
  ip: '127.0.0.1',
};

db.auditLogs = [
  transitionLog,
  ...(db.auditLogs || []).filter((l: any) => l.action && !l.details?.includes('1792') && !l.userName?.includes('Kiểm Thử')),
];

// Ghi file database sản xuất
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

const statsAfter = {
  users: db.users.length,
  plans: db.plans.length,
  tasks: db.tasks.length,
  announcements: db.announcements.length,
  events: db.events.length,
  reports: db.reports.length,
  documents: db.documents.length,
  departments: db.departments.length,
  schoolYears: db.schoolYears.length,
  notifications: db.notifications.length,
  auditLogs: db.auditLogs.length,
};

console.log('\n✅ [EXECUTE HOÀN TẤT] THỐNG KÊ SAU KHI LÀM SẠCH:');
console.table(statsAfter);
console.log('🎉 Hệ thống đã được đưa về trạng thái trắng chuẩn sản xuất thành công!');

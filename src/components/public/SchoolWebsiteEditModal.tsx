import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import type { SchoolSettings, WebsiteConfig, PublicNewsItem } from '../../types/database.ts';
import {
  X,
  Save,
  Globe,
  Home,
  BookOpen,
  MapPin,
  Sparkles,
  Building2,
  GraduationCap,
  Award,
  Newspaper,
  Plus,
  Trash2,
  Edit2,
  Check,
  Calendar,
  User,
  Clock,
  Phone,
  Mail,
  Upload,
  Image as ImageIcon,
  Sliders,
  Eye,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { SchoolEmblem } from '../common/SchoolEmblem.tsx';

export type WebsiteTab = 'general' | 'home' | 'about' | 'news' | 'contact';

export const BANNER_PRESETS = [
  {
    id: 'preset-campus',
    title: 'Khuôn viên trường học xanh & hiện đại',
    url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80',
    description: 'Toàn cảnh trường khang trang với hàng cây xanh mát và kiến trúc sư phạm chuẩn quốc gia',
  },
  {
    id: 'preset-library',
    title: 'Thư viện thông minh & không gian tự học',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1920&q=80',
    description: 'Không gian sách hiện đại truyền cảm hứng đam mê học tập và nghiên cứu',
  },
  {
    id: 'preset-stem',
    title: 'Lớp học công nghệ STEM & sáng tạo',
    url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1920&q=80',
    description: 'Phương pháp giáo dục đổi mới, tương tác tích cực giữa thầy cô và học trò',
  },
  {
    id: 'preset-yard',
    title: 'Sân trường & cột cờ trang nghiêm',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1920&q=80',
    description: 'Nơi diễn ra lễ chào cờ đầu tuần và các hoạt động sinh hoạt tập thể ý nghĩa',
  },
  {
    id: 'preset-activities',
    title: 'Hoạt động trải nghiệm & phong trào học đường',
    url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1920&q=80',
    description: 'Phát triển toàn diện năng khiếu, kỹ năng sống và thể chất cho học sinh liên cấp',
  },
];

export const LOGO_PRESETS = [
  {
    id: 'logo-default',
    title: 'Huy hiệu Mặc định Nhà trường',
    url: '',
    description: 'Huy hiệu vector sư phạm: Khiên xanh, cành nguyệt quế, ngọn đuốc & sách mở chuẩn quốc gia',
  },
  {
    id: 'logo-torch',
    title: 'Ngọn Đuốc & Sách Mở Sư Phạm',
    url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=400&q=80',
    description: 'Biểu trưng thắp sáng ngọn lửa hiếu học và nuôi dưỡng ước mơ',
  },
  {
    id: 'logo-stem',
    title: 'Sáng Tạo Khoa Học & Công Nghệ',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80',
    description: 'Mô hình giáo dục liên thông đổi mới, rèn luyện kỹ năng thời đại số',
  },
  {
    id: 'logo-lotus',
    title: 'Búp Sen Vàng Tri Thức',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&q=80',
    description: 'Biểu tượng tinh hoa văn hóa và truyền thống tôn sư trọng đạo',
  },
];

interface SchoolWebsiteEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: WebsiteTab;
}

export const SchoolWebsiteEditModal: React.FC<SchoolWebsiteEditModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
}) => {
  const { schoolSettings, refreshAppData, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<WebsiteTab>(initialTab);
  const [saving, setSaving] = useState(false);

  // General fields
  const [schoolName, setSchoolName] = useState('');
  const [shortName, setShortName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [managementAgency, setManagementAgency] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [motto, setMotto] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Logo management state
  const [logoUrl, setLogoUrl] = useState('');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Website Config fields
  const [websiteConfig, setWebsiteConfig] = useState<WebsiteConfig>({});

  // Banner management state
  const [customBannerUrl, setCustomBannerUrl] = useState('');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // News editing state
  const [newsList, setNewsList] = useState<PublicNewsItem[]>([]);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState<'tiểu học' | 'thcs' | 'phong trào' | 'chuyên môn'>('phong trào');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsDate, setNewsDate] = useState('');
  const [newsAuthor, setNewsAuthor] = useState('');
  const [isAddingNews, setIsAddingNews] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (schoolSettings) {
      setSchoolName(schoolSettings.schoolName || '');
      setShortName(schoolSettings.shortName || '');
      setSchoolCode(schoolSettings.schoolCode || '');
      setManagementAgency(schoolSettings.managementAgency || '');
      setPrincipalName(schoolSettings.principalName || '');
      setMotto(schoolSettings.motto || '');
      setAddress(schoolSettings.address || '');
      setPhone(schoolSettings.phone || '');
      setEmail(schoolSettings.email || '');
      setWebsite(schoolSettings.website || '');
      setLogoUrl(schoolSettings.logoUrl || '');
      const config = schoolSettings.websiteConfig || {};
      setWebsiteConfig(config);
      setNewsList(config.newsArticles || []);
    }
  }, [schoolSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      showToast('Tên trường không được để trống.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<SchoolSettings> = {
        schoolName: schoolName.trim(),
        shortName: shortName.trim(),
        schoolCode: schoolCode.trim(),
        managementAgency: managementAgency.trim(),
        principalName: principalName.trim(),
        motto: motto.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        logoUrl: logoUrl.trim(),
        websiteConfig: {
          ...websiteConfig,
          newsArticles: newsList,
        },
      };

      await api.updateWebsiteSettings(payload);
      await refreshAppData();
      showToast('Đã lưu và cập nhật toàn bộ thông tin Website Trường thành công!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Không thể lưu thông tin Website.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateConfigField = (field: keyof WebsiteConfig, value: any) => {
    setWebsiteConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Logo Management handlers
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, SVG, WEBP).', 'error');
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxSize = 512;
        let width = img.width;
        let height = img.height;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png');
          setLogoUrl(compressed);
        } else {
          setLogoUrl(rawDataUrl);
        }
        setIsUploadingLogo(false);
        showToast('Đã tải và áp dụng logo trường học mới!');
      };
      img.onerror = () => {
        setIsUploadingLogo(false);
        showToast('Không thể đọc file ảnh logo.', 'error');
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setIsUploadingLogo(false);
      showToast('Lỗi khi đọc file ảnh từ thiết bị.', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyLogoUrl = (url: string) => {
    const trimmed = url.trim();
    setLogoUrl(trimmed);
    setCustomLogoUrl('');
    showToast(trimmed ? 'Đã áp dụng logo mới cho trường!' : 'Đã khôi phục huy hiệu logo mặc định.');
  };

  const handleResetDefaultLogo = () => {
    setLogoUrl('');
    setCustomLogoUrl('');
    showToast('Đã chuyển về huy hiệu vector trường mặc định.');
  };

  // Banner Management handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).', 'error');
      return;
    }

    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1920;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          handleAddBannerUrl(compressedDataUrl);
        } else {
          handleAddBannerUrl(rawDataUrl);
        }
        setIsUploadingBanner(false);
      };
      img.onerror = () => {
        setIsUploadingBanner(false);
        showToast('Không thể giải mã tệp ảnh. Vui lòng thử lại với ảnh khác.', 'error');
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setIsUploadingBanner(false);
      showToast('Lỗi khi đọc file ảnh từ thiết bị.', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddBannerUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      showToast('Vui lòng nhập đường dẫn URL ảnh hoặc chọn tệp tải lên.', 'error');
      return;
    }
    const currentList = websiteConfig.bannerImages || (websiteConfig.bannerImageUrl ? [websiteConfig.bannerImageUrl] : []);
    const updatedList = currentList.includes(trimmed) ? currentList : [trimmed, ...currentList];
    setWebsiteConfig((prev) => ({
      ...prev,
      bannerImageUrl: trimmed,
      bannerImages: updatedList,
      bannerOverlayOpacity: prev.bannerOverlayOpacity ?? 0.65,
    }));
    setCustomBannerUrl('');
    showToast('Đã thêm và kích hoạt ảnh banner mới!');
  };

  const handleSelectActiveBanner = (url: string) => {
    setWebsiteConfig((prev) => ({
      ...prev,
      bannerImageUrl: url,
    }));
    showToast('Đã chọn làm ảnh banner chính của trang chủ!');
  };

  const handleRemoveBanner = (urlToRemove: string) => {
    const currentList = websiteConfig.bannerImages || (websiteConfig.bannerImageUrl ? [websiteConfig.bannerImageUrl] : []);
    const updatedList = currentList.filter((u) => u !== urlToRemove);
    const newActive = websiteConfig.bannerImageUrl === urlToRemove ? (updatedList[0] || '') : (websiteConfig.bannerImageUrl || '');
    setWebsiteConfig((prev) => ({
      ...prev,
      bannerImageUrl: newActive,
      bannerImages: updatedList,
    }));
    showToast('Đã xóa ảnh banner khỏi danh sách.');
  };

  const handleRemoveAllBanners = () => {
    setWebsiteConfig((prev) => ({
      ...prev,
      bannerImageUrl: '',
    }));
    showToast('Đã gỡ ảnh banner (trang chủ sẽ hiển thị nền gradient xanh mặc định).');
  };

  // News management handlers
  const handleOpenAddNews = () => {
    setEditingNewsId(null);
    setNewsTitle('');
    setNewsCategory('phong trào');
    setNewsSummary('');
    setNewsContent('');
    setNewsDate(new Date().toLocaleDateString('vi-VN'));
    setNewsAuthor('Ban Biên Tập');
    setIsAddingNews(true);
  };

  const handleOpenEditNews = (item: PublicNewsItem) => {
    setEditingNewsId(item.id);
    setNewsTitle(item.title);
    setNewsCategory(item.category);
    setNewsSummary(item.summary);
    setNewsContent(item.content);
    setNewsDate(item.date);
    setNewsAuthor(item.author);
    setIsAddingNews(true);
  };

  const handleSaveNewsItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsSummary.trim()) {
      showToast('Vui lòng điền đầy đủ tiêu đề và tóm tắt bài viết.', 'error');
      return;
    }

    if (editingNewsId) {
      setNewsList((prev) =>
        prev.map((n) =>
          n.id === editingNewsId
            ? {
                ...n,
                title: newsTitle.trim(),
                category: newsCategory,
                summary: newsSummary.trim(),
                content: newsContent.trim() || newsSummary.trim(),
                date: newsDate.trim() || new Date().toLocaleDateString('vi-VN'),
                author: newsAuthor.trim() || 'Ban Biên Tập',
              }
            : n
        )
      );
      showToast('Đã cập nhật bài viết thành công. Hãy bấm "Lưu thông tin Website" để áp dụng.');
    } else {
      const newItem: PublicNewsItem = {
        id: `news-${Date.now()}`,
        title: newsTitle.trim(),
        category: newsCategory,
        summary: newsSummary.trim(),
        content: newsContent.trim() || newsSummary.trim(),
        date: newsDate.trim() || new Date().toLocaleDateString('vi-VN'),
        author: newsAuthor.trim() || 'Ban Biên Tập',
      };
      setNewsList((prev) => [newItem, ...prev]);
      showToast('Đã thêm bài viết mới vào danh sách. Hãy bấm "Lưu thông tin Website" để lưu.');
    }

    setIsAddingNews(false);
    setEditingNewsId(null);
  };

  const handleDeleteNewsItem = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa bài viết tin tức này?')) {
      setNewsList((prev) => prev.filter((n) => n.id !== id));
      showToast('Đã xóa bài viết khỏi danh sách.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Chỉnh Sửa Thông Tin Website Trường
              </h2>
              <p className="text-xs text-slate-500">
                Quản trị viên cấu hình nội dung hiển thị trực tiếp trên Cổng thông tin công khai
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-100/60 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>1. Thông tin chung & Pháp lý</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'home'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="h-4 w-4" />
            <span>2. Trang chủ & Banner & Thống kê</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'about'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>3. Trang Giới thiệu & 2 Bậc học</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'news'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Newspaper className="h-4 w-4" />
            <span>4. Tin tức & Bản tin ({newsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'contact'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>5. Liên hệ & Giờ làm việc</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 text-xs space-y-5">
          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50/60 border border-blue-200 p-3.5 text-blue-900 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Thông tin định danh của trường hiển thị ở đầu trang (header), chân trang (footer) và toàn bộ các văn bản xuất bản công khai.
                </p>
              </div>

              {/* LOGO MANAGEMENT SECTION */}
              <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50/50 to-white p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                      <SchoolEmblem size={22} src={logoUrl} />
                      <span>Huy Hiệu & Logo Nhận Diện Trường Học</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Hiển thị tại thanh điều hướng (header), chân trang (footer), trang Giới thiệu và thẻ văn bản xuất bản
                    </p>
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleResetDefaultLogo}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Khôi phục huy hiệu mặc định</span>
                    </button>
                  )}
                </div>

                {/* Logo Live Interactive Preview */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 text-white rounded-xl p-4 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <SchoolEmblem size={68} src={logoUrl} className="ring-2 ring-amber-400 shadow-md" />
                      <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full uppercase">
                        {logoUrl ? 'Logo Riêng' : 'Mặc Định'}
                      </span>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                        Xem trước nhận diện thương hiệu
                      </div>
                      <div className="text-sm font-bold text-white">
                        {schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {managementAgency || 'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO'}
                      </div>
                    </div>
                  </div>
                  <div className="sm:ml-auto flex items-center gap-2 text-[11px] text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                    <span>Kích thước nhỏ (header):</span>
                    <SchoolEmblem size={34} src={logoUrl} />
                  </div>
                </div>

                {/* Upload & URL Input Tools */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* File Upload */}
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">
                        Cách 1: Tải ảnh logo từ máy tính / điện thoại
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Hỗ trợ PNG trong suốt, JPG, SVG, WEBP (tự động tối ưu khung tròn)
                      </p>
                    </div>
                    <label className="mt-2.5 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-500 transition-colors cursor-pointer text-xs shadow-xs">
                      <Upload className="h-4 w-4" />
                      <span>{isUploadingLogo ? 'Đang xử lý ảnh...' : 'Chọn file ảnh logo để tải lên'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* URL Input */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">
                        Cách 2: Nhập liên kết ảnh trực tiếp (Image URL)
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Dán đường dẫn ảnh HTTPS công khai từ website hoặc đám mây
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <input
                        type="url"
                        value={customLogoUrl}
                        onChange={(e) => setCustomLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo-truong.png"
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 text-xs focus:border-amber-600 outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyLogoUrl(customLogoUrl)}
                        disabled={!customLogoUrl.trim()}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 font-bold text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 text-xs cursor-pointer"
                      >
                        Áp dụng
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preset Logos */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Cách 3: Chọn từ các mẫu biểu trưng sư phạm chuẩn:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {LOGO_PRESETS.map((preset) => {
                      const isCurrent = (preset.url === '' && !logoUrl) || (preset.url !== '' && logoUrl === preset.url);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyLogoUrl(preset.url)}
                          className={`text-left rounded-xl p-2.5 border transition-all flex items-start gap-2.5 cursor-pointer ${
                            isCurrent
                              ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
                          }`}
                        >
                          <SchoolEmblem size={38} src={preset.url || undefined} className="shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-900 text-[11px] truncate block">
                                {preset.title}
                              </span>
                              {isCurrent && <Check className="h-3 w-3 text-amber-600 shrink-0" />}
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                              {preset.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-900 mb-1">
                    Tên trường học đầy đủ (In hoa) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    required
                    placeholder="TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-bold focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Tên viết tắt / Tên thường gọi
                  </label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="TH&THCS Nguyễn Đình Anh"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Mã định danh trường học
                  </label>
                  <input
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    placeholder="TH-THCS-NDA-01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Cơ quan quản lý cấp trên
                  </label>
                  <input
                    type="text"
                    value={managementAgency}
                    onChange={(e) => setManagementAgency(e.target.value)}
                    placeholder="PHÒNG GIÁO DỤC VÀ ĐÀO TẠO"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 uppercase focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Họ và tên Hiệu trưởng
                  </label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder="Thầy Lê Văn Thành"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-900 mb-1">
                    Khẩu hiệu hành động / Phương châm giáo dục
                  </label>
                  <input
                    type="text"
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="Kỷ cương - Tình thương - Trách nhiệm - Đổi mới sáng tạo"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 italic focus:border-blue-600 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HOMEPAGE, BANNER & STATS */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* BANNER IMAGE MANAGEMENT SECTION */}
              <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/50 to-white p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-blue-600" />
                      <span>Quản Lý Ảnh Banner & Hình Nền Trang Chủ Website</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thêm ảnh thực tế khuôn viên trường học, hoạt động ngoại khóa hoặc chọn ảnh mẫu chuẩn quốc gia
                    </p>
                  </div>
                  {websiteConfig.bannerImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAllBanners}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Gỡ ảnh (Dùng nền xanh gradient)</span>
                    </button>
                  )}
                </div>

                {/* Banner Live Preview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-slate-500" />
                      <span>Xem trước hiển thị thực tế trên Trang chủ:</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {websiteConfig.bannerImageUrl ? 'Đang dùng ảnh nền tùy chỉnh' : 'Đang dùng nền gradient mặc định'}
                    </span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-6 shadow-inner border border-blue-900/50 min-h-[170px] flex flex-col justify-center">
                    {websiteConfig.bannerImageUrl ? (
                      <>
                        <img
                          src={websiteConfig.bannerImageUrl}
                          alt="Banner Preview"
                          className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none"
                        />
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `linear-gradient(to right, rgba(15, 23, 42, ${Math.min(
                              0.95,
                              (websiteConfig.bannerOverlayOpacity ?? 0.65) + 0.15
                            )}), rgba(15, 23, 42, ${
                              websiteConfig.bannerOverlayOpacity ?? 0.65
                            }) 60%, rgba(30, 27, 75, ${Math.max(
                              0.35,
                              (websiteConfig.bannerOverlayOpacity ?? 0.65) - 0.2
                            )}))`,
                          }}
                        />
                      </>
                    ) : null}

                    <div className="relative z-10 space-y-2 max-w-xl">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-blue-200 border border-blue-400/30 backdrop-blur-xs">
                        <Sparkles className="h-3 w-3 text-amber-300" />
                        <span>{websiteConfig.heroTagline || 'Mô hình trường liên cấp chuẩn quốc gia · Năm học 2026 - 2027'}</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-extrabold uppercase tracking-tight line-clamp-1">
                        {websiteConfig.heroTitle || schoolName || 'TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH'}
                      </h4>
                      <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed font-light">
                        {websiteConfig.heroDescription ||
                          'Nơi ươm mầm tri thức, rèn luyện nhân cách và chắp cánh ước mơ cho các thế hệ học sinh.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dark Overlay Opacity Slider */}
                {websiteConfig.bannerImageUrl && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-blue-600" />
                        <span>Độ tối lớp phủ chống chói (Dark Contrast Overlay):</span>
                      </label>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {Math.round((websiteConfig.bannerOverlayOpacity ?? 0.65) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="0.9"
                      step="0.05"
                      value={websiteConfig.bannerOverlayOpacity ?? 0.65}
                      onChange={(e) => updateConfigField('bannerOverlayOpacity', parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">
                      Kéo tăng độ tối nếu ảnh chụp sân trường hoặc lớp học có nền sáng/nhiều chi tiết, đảm bảo chữ màu trắng luôn đạt chuẩn tương phản cao WCAG AA.
                    </p>
                  </div>
                )}

                {/* Add Banner Options: Upload & URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Option 1: File Upload */}
                  <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-4 flex flex-col items-center justify-center text-center hover:bg-blue-50 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="font-bold text-slate-900 text-xs">Tải ảnh banner từ thiết bị</p>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Hỗ trợ tệp PNG, JPG, JPEG, WEBP (Tự động nén tối ưu hiển thị)
                    </p>
                    <label className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-all active:scale-95">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploadingBanner ? 'Đang nạp ảnh...' : 'Chọn tệp ảnh từ máy'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleFileUpload}
                        disabled={isUploadingBanner}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Option 2: Image URL */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Globe className="h-4 w-4 text-slate-600" />
                        <label className="font-bold text-slate-900 text-xs">Thêm ảnh từ liên kết trực tuyến (URL)</label>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Dán đường dẫn ảnh từ Google Photos, Imgur, CDN hoặc website trường
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={customBannerUrl}
                        onChange={(e) => setCustomBannerUrl(e.target.value)}
                        placeholder="https://.../anh-truong-hoc.jpg"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 outline-hidden font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddBannerUrl(customBannerUrl)}
                        disabled={!customBannerUrl.trim()}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Thêm</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner Presets Library */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Bộ sưu tập ảnh mẫu chuẩn trường học (Nhấp để áp dụng ngay):</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {BANNER_PRESETS.map((preset) => {
                      const isCurrent = websiteConfig.bannerImageUrl === preset.url;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => handleAddBannerUrl(preset.url)}
                          className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all hover:shadow-md ${
                            isCurrent
                              ? 'border-blue-600 ring-2 ring-blue-500/40 shadow-xs'
                              : 'border-slate-200 hover:border-blue-400'
                          }`}
                        >
                          <div className="h-20 w-full overflow-hidden bg-slate-900">
                            <img
                              src={preset.url}
                              alt={preset.title}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          {isCurrent && (
                            <div className="absolute top-1.5 right-1.5 rounded-full bg-blue-600 text-white p-0.5 shadow-xs">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <div className="p-2 bg-white">
                            <p className="font-semibold text-[11px] text-slate-800 line-clamp-1 leading-snug">
                              {preset.title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Saved Banner Gallery */}
                {(websiteConfig.bannerImages && websiteConfig.bannerImages.length > 0) && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-800 text-xs">
                      Danh sách ảnh banner đã lưu ({websiteConfig.bannerImages.length} ảnh):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {websiteConfig.bannerImages.map((imgUrl, idx) => {
                        const isActive = websiteConfig.bannerImageUrl === imgUrl;
                        return (
                          <div
                            key={idx}
                            className={`relative rounded-xl overflow-hidden border p-1 bg-white flex flex-col justify-between ${
                              isActive ? 'border-blue-600 ring-2 ring-blue-500/30 shadow-xs' : 'border-slate-200'
                            }`}
                          >
                            <div className="relative h-20 rounded-lg overflow-hidden bg-slate-100">
                              <img src={imgUrl} alt={`Banner ${idx + 1}`} className="h-full w-full object-cover" />
                              {isActive && (
                                <span className="absolute top-1 left-1 rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                                  Đang chọn
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-1">
                              {!isActive ? (
                                <button
                                  type="button"
                                  onClick={() => handleSelectActiveBanner(imgUrl)}
                                  className="text-[10px] font-bold text-blue-700 hover:underline px-1 py-0.5"
                                >
                                  Đặt làm chính
                                </button>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-600 px-1">Đang dùng</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveBanner(imgUrl)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Xóa ảnh khỏi danh sách"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* HERO TEXT CONFIGURATION */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Nội Dung Văn Bản Trên Banner (Tiêu Đề & Khẩu Hiệu)</span>
                </h3>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Dòng chữ phụ trên Banner (Tagline / Badge)
                  </label>
                  <input
                    type="text"
                    value={websiteConfig.heroTagline || ''}
                    onChange={(e) => updateConfigField('heroTagline', e.target.value)}
                    placeholder="Mô hình trường liên cấp chuẩn quốc gia · Năm học 2026 - 2027"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Tiêu đề chính hiển thị trên Banner
                  </label>
                  <input
                    type="text"
                    value={websiteConfig.heroTitle || ''}
                    onChange={(e) => updateConfigField('heroTitle', e.target.value)}
                    placeholder="TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH (để trống sẽ lấy theo tên trường)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white font-bold focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Đoạn văn giới thiệu ngắn dưới tiêu đề Banner
                  </label>
                  <textarea
                    rows={2}
                    value={websiteConfig.heroDescription || ''}
                    onChange={(e) => updateConfigField('heroDescription', e.target.value)}
                    placeholder="Nơi ươm mầm tri thức, rèn luyện nhân cách và chắp cánh ước mơ cho các thế hệ học sinh từ bậc Tiểu học (Lớp 1 - 5) đến bậc Trung học cơ sở (Lớp 6 - 9)."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 bg-white focus:border-blue-600 outline-hidden"
                  />
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                  <Award className="h-4 w-4 text-blue-600" />
                  <span>4 Khối Thông Số Nổi Bật Trên Trang Chủ</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                    <p className="font-bold text-[11px] text-blue-900">Khối thông số 1 (Cấp học):</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={websiteConfig.stat1Value || ''}
                        onChange={(e) => updateConfigField('stat1Value', e.target.value)}
                        placeholder="2 Cấp Học"
                        className="rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                      />
                      <input
                        type="text"
                        value={websiteConfig.stat1Label || ''}
                        onChange={(e) => updateConfigField('stat1Label', e.target.value)}
                        placeholder="Tiểu học & THCS"
                        className="rounded border border-slate-300 px-2.5 py-1.5 text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                    <p className="font-bold text-[11px] text-emerald-900">Khối thông số 2 (Khối lớp):</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={websiteConfig.stat2Value || ''}
                        onChange={(e) => updateConfigField('stat2Value', e.target.value)}
                        placeholder="9 Khối Lớp"
                        className="rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                      />
                      <input
                        type="text"
                        value={websiteConfig.stat2Label || ''}
                        onChange={(e) => updateConfigField('stat2Label', e.target.value)}
                        placeholder="Từ Lớp 1 đến Lớp 9"
                        className="rounded border border-slate-300 px-2.5 py-1.5 text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                    <p className="font-bold text-[11px] text-purple-900">Khối thông số 3 (Đội ngũ):</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={websiteConfig.stat3Value || ''}
                        onChange={(e) => updateConfigField('stat3Value', e.target.value)}
                        placeholder="100%"
                        className="rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                      />
                      <input
                        type="text"
                        value={websiteConfig.stat3Label || ''}
                        onChange={(e) => updateConfigField('stat3Label', e.target.value)}
                        placeholder="Giáo viên đạt chuẩn"
                        className="rounded border border-slate-300 px-2.5 py-1.5 text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                    <p className="font-bold text-[11px] text-amber-900">Khối thông số 4 (Thi đua):</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={websiteConfig.stat4Value || ''}
                        onChange={(e) => updateConfigField('stat4Value', e.target.value)}
                        placeholder="Chất Lượng"
                        className="rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                      />
                      <input
                        type="text"
                        value={websiteConfig.stat4Label || ''}
                        onChange={(e) => updateConfigField('stat4Label', e.target.value)}
                        placeholder="Thi đua toàn diện"
                        className="rounded border border-slate-300 px-2.5 py-1.5 text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ABOUT PAGE CONTENT */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block font-bold text-slate-900">
                  Tiêu đề mục Lịch sử & Truyền thống
                </label>
                <input
                  type="text"
                  value={websiteConfig.aboutHistoryTitle || ''}
                  onChange={(e) => updateConfigField('aboutHistoryTitle', e.target.value)}
                  placeholder="1. Lịch Sử Hình Thành & Truyền Thống Dạy Tốt - Học Tốt"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-bold focus:border-blue-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Đoạn 1: Giới thiệu ngôi trường và danh nhân
                </label>
                <textarea
                  rows={3}
                  value={websiteConfig.aboutHistoryParagraph1 || ''}
                  onChange={(e) => updateConfigField('aboutHistoryParagraph1', e.target.value)}
                  placeholder="Trường Tiểu học & Trung học cơ sở Nguyễn Đình Anh là ngôi trường liên cấp trọng điểm..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-blue-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Đoạn 2: Thành tích và phong trào thi đua
                </label>
                <textarea
                  rows={3}
                  value={websiteConfig.aboutHistoryParagraph2 || ''}
                  onChange={(e) => updateConfigField('aboutHistoryParagraph2', e.target.value)}
                  placeholder="Trải qua các giai đoạn phát triển, nhà trường luôn khẳng định vị thế dẫn đầu trong phong trào thi đua..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-blue-600 outline-hidden"
                />
              </div>

              {/* 2 Levels description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3.5 space-y-2.5">
                  <h4 className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                    <BookOpen className="h-4 w-4" />
                    <span>Giới Thiệu Bậc Tiểu Học</span>
                  </h4>
                  <input
                    type="text"
                    value={websiteConfig.primaryLevelTitle || ''}
                    onChange={(e) => updateConfigField('primaryLevelTitle', e.target.value)}
                    placeholder="BẬC TIỂU HỌC"
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                  />
                  <input
                    type="text"
                    value={websiteConfig.primaryLevelSubtitle || ''}
                    onChange={(e) => updateConfigField('primaryLevelSubtitle', e.target.value)}
                    placeholder="Khối 1, Khối 2, Khối 3, Khối 4, Khối 5"
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-blue-800 font-semibold"
                  />
                  <textarea
                    rows={3}
                    value={websiteConfig.primaryLevelDesc || ''}
                    onChange={(e) => updateConfigField('primaryLevelDesc', e.target.value)}
                    placeholder="Tập trung rèn luyện chữ viết, phát triển tư duy ngôn ngữ..."
                    className="w-full rounded border border-slate-300 p-2 text-slate-700"
                  />
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-2.5">
                  <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                    <GraduationCap className="h-4 w-4" />
                    <span>Giới Thiệu Bậc Trung Học Cơ Sở</span>
                  </h4>
                  <input
                    type="text"
                    value={websiteConfig.secondaryLevelTitle || ''}
                    onChange={(e) => updateConfigField('secondaryLevelTitle', e.target.value)}
                    placeholder="BẬC TRUNG HỌC CƠ SỞ"
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-bold"
                  />
                  <input
                    type="text"
                    value={websiteConfig.secondaryLevelSubtitle || ''}
                    onChange={(e) => updateConfigField('secondaryLevelSubtitle', e.target.value)}
                    placeholder="Khối 6, Khối 7, Khối 8, Khối 9"
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-emerald-800 font-semibold"
                  />
                  <textarea
                    rows={3}
                    value={websiteConfig.secondaryLevelDesc || ''}
                    onChange={(e) => updateConfigField('secondaryLevelDesc', e.target.value)}
                    placeholder="Chú trọng bồi dưỡng năng lực tự học, nghiên cứu KHKT, STEM..."
                    className="w-full rounded border border-slate-300 p-2 text-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NEWS & ARTICLES MANAGEMENT */}
          {activeTab === 'news' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-blue-600" />
                    <span>Quản Lý Tin Tức & Bản Tin Hoạt Động Website</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Các bài viết hiển thị công khai trên mục "Tin tức & Hoạt động" và trang chủ
                  </p>
                </div>
                {!isAddingNews && (
                  <button
                    type="button"
                    onClick={handleOpenAddNews}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm bài viết mới</span>
                  </button>
                )}
              </div>

              {/* Sub-form to Add or Edit a single article */}
              {isAddingNews ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <span className="font-bold text-blue-900 text-xs">
                      {editingNewsId ? 'Chỉnh sửa bài viết tin tức' : 'Thêm bài viết tin tức mới'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNews(false)}
                      className="text-slate-500 hover:text-slate-800 text-xs"
                    >
                      Đóng
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block font-bold text-slate-900 mb-1">
                        Tiêu đề bài viết <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newsTitle}
                        onChange={(e) => setNewsTitle(e.target.value)}
                        required
                        placeholder="VD: Khai mạc Hội khỏe Phù Đổng cấp trường năm học 2026 - 2027"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-900 mb-1">Chủ đề / Chuyên mục</label>
                        <select
                          value={newsCategory}
                          onChange={(e) => setNewsCategory(e.target.value as any)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white"
                        >
                          <option value="tiểu học">Bậc Tiểu học</option>
                          <option value="thcs">Bậc THCS</option>
                          <option value="phong trào">Phong trào & Đội</option>
                          <option value="chuyên môn">Chuyên môn & Khảo thí</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-900 mb-1">Ngày xuất bản</label>
                        <input
                          type="text"
                          value={newsDate}
                          onChange={(e) => setNewsDate(e.target.value)}
                          placeholder="VD: 15/10/2026"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-900 mb-1">Tác giả / Nguồn</label>
                        <input
                          type="text"
                          value={newsAuthor}
                          onChange={(e) => setNewsAuthor(e.target.value)}
                          placeholder="VD: Ban Biên Tập Nhà Trường"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-900 mb-1">
                        Tóm tắt bài viết (Hiển thị ngoài danh sách) <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={newsSummary}
                        onChange={(e) => setNewsSummary(e.target.value)}
                        required
                        placeholder="Tóm tắt ngắn gọn nội dung sự kiện, hoạt động..."
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-900 mb-1">Nội dung chi tiết bài viết</label>
                      <textarea
                        rows={5}
                        value={newsContent}
                        onChange={(e) => setNewsContent(e.target.value)}
                        placeholder="Nội dung đầy đủ của bài viết..."
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingNews(false)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewsItem}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 shadow-xs"
                      >
                        {editingNewsId ? 'Cập nhật vào danh sách' : 'Thêm vào danh sách'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* News Articles Table */}
              <div className="space-y-2">
                {newsList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                    Chưa có bài viết tin tức nào. Bấm "+ Thêm bài viết mới" để tạo bài viết.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
                    {newsList.map((item) => (
                      <div key={item.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                              {item.category}
                            </span>
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{item.date}</span>
                            </span>
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{item.author}</span>
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{item.summary}</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditNews(item)}
                            className="rounded p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            title="Sửa bài viết"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNewsItem(item.id)}
                            className="rounded p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa bài viết"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CONTACT & OFFICE INFO */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-900 mb-1">
                    Địa chỉ trụ sở trường học
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Xã Thạch Bình, Huyện Thạch Thành, Tỉnh Thanh Hóa"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Đường dây nóng / Số điện thoại trực ban
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0237 387 6543"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono font-semibold focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Hòm thư điện tử công vụ (Email)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ththcsnguyendinhanh@thachthanh.edu.vn"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Địa chỉ trang Website
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://ththcsnguyendinhanh.edu.vn"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Thời gian làm việc văn phòng
                  </label>
                  <input
                    type="text"
                    value={websiteConfig.officeHours || ''}
                    onChange={(e) => updateConfigField('officeHours', e.target.value)}
                    placeholder="Thứ Hai đến Thứ Bảy: Sáng 07:00 - 11:30 | Chiều 13:30 - 17:00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-900 mb-1">
                    Lưu ý gửi phản hồi cho phụ huynh & học sinh
                  </label>
                  <textarea
                    rows={2}
                    value={websiteConfig.contactNotes || ''}
                    onChange={(e) => updateConfigField('contactNotes', e.target.value)}
                    placeholder="Đối với các vấn đề liên quan trực tiếp đến hồ sơ học tập của học sinh, chuyển trường..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-blue-600 outline-hidden"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-900 mb-1">
                    Địa chỉ hiển thị trên Bản đồ / Chỉ đường
                  </label>
                  <input
                    type="text"
                    value={websiteConfig.mapAddress || ''}
                    onChange={(e) => updateConfigField('mapAddress', e.target.value)}
                    placeholder="Xã Thạch Bình, Huyện Thạch Thành, Tỉnh Thanh Hóa"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-[11px] text-slate-500">
              Mọi thay đổi sẽ cập nhật tức thì trên toàn bộ trang chủ, giới thiệu, tin tức và liên hệ.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Đang lưu thay đổi...' : 'Lưu thông tin Website'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

# Tài Liệu Thiết Kế Hệ Thống Quản Lý Đội Bóng BMFC

Hệ thống quản lý nội bộ dành riêng cho đội bóng phủi BMFC, hỗ trợ Ban điều hành (Admin) điểm danh ra sân, chốt kết quả trận đấu, tự động tính toán quỹ phạt và theo dõi tình trạng đóng tiền của thành viên. Hệ thống được tối ưu hóa giao diện di động (Mobile-First) giúp Admin dễ dàng thao tác trực tiếp ngay tại sân bóng.

---

## I. TỔNG QUAN KIẾN TRÚC & CÔNG NGHỆ

* **Frontend:** ReactJS + TypeScript + Tailwind CSS (Vite build tool).
* **Backend & Database:** Supabase (PostgreSQL + Supabase Auth).
* **Cơ chế bảo mật:** Row Level Security (RLS) - Cho phép xem công khai không cần login, chỉ cho phép Thêm/Sửa/Xóa khi đã qua phân quyền (Authenticated Admin).

---

## II. THIẾT KẾ BACKEND (SUPABASE DATABASE & SECURITY)

### 1. Sơ đồ các bảng dữ liệu (Database Schema)

#### Bảng `bmfc_user` (Có sẵn)
Lưu thông tin định danh cơ bản của thành viên (Được liên kết với hệ thống Auth).
* `id` (UUID, Primary Key)
* `name` (TEXT)

#### Bảng `bmfc_settings`
Lưu cấu hình các định mức phạt và tiền quỹ do Admin thiết lập.
```sql
CREATE TABLE bmfc_settings (
    key TEXT PRIMARY KEY, -- 'penalty_forgot', 'penalty_no_show', 'penalty_missed_week', 'penalty_loss', 'monthly_fee'
    value NUMERIC NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE bmfc_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE, -- Mỗi ngày tối đa phát sinh 1 trận đấu/buổi tập
    status TEXT DEFAULT 'pending', -- 'pending' | 'organized' | 'cancelled'
    result TEXT DEFAULT NULL, -- 'win' | 'loss' | 'draw'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE bmfc_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES bmfc_matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES bmfc_user(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'present' | 'absent' | 'forgot' | 'no_show'
    UNIQUE(match_id, user_id)
);
CREATE TABLE bmfc_finances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES bmfc_user(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'monthly' (Quỹ tháng) | 'penalty' (Tiền phạt)
    reason TEXT NOT NULL, -- Chi tiết lý do phạt để minh bạch dữ liệu
    amount NUMERIC NOT NULL,
    date DATE NOT NULL, -- Ngày phát sinh khoản tiền
    is_paid BOOLEAN DEFAULT FALSE, -- Trạng thái đóng tiền
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

2. Quy tắc Nghiệp vụ tự động (Business Rules Logic)
Khi Admin chuyển trạng thái trận đấu thành MatchStatus.ORGANIZED (Lên trận) và chọn kết quả trận đấu, hệ thống tự động quét bảng điểm danh ngày hôm đó và tính phạt:

Quên điểm danh (AttendanceStatus.FORGOT): Cộng phạt penalty_forgot.

Điểm danh nhưng bùng (AttendanceStatus.NO_SHOW): Cộng phạt penalty_no_show.

Thua trận (MatchResult.LOSS): Tất cả thành viên có mặt ra sân đá (present) bị cộng phạt penalty_loss.

Hòa trận (MatchResult.DRAW): Áp dụng luật đặc biệt - Hòa phạt như thua. Tất cả thành viên có mặt ra sân đá (present) dính phạt bằng định mức của penalty_loss.

Lưu ý cập nhật: Trước khi chèn bản ghi phạt mới, hệ thống sẽ thực hiện xóa các bản ghi phạt cũ cùng ngày của trận đấu đó để tránh trường hợp Admin chốt sổ/chỉnh sửa lại kết quả làm nhân đôi số tiền phạt.

3. Phân quyền & Bảo mật (Row Level Security - RLS)
Để đảm bảo thành viên thông thường truy cập app chỉ được xem thông tin công khai mà không thể giả mạo gói tin sửa điểm danh hay xóa quỹ phạt, RLS được thiết lập như sau:
-- Kích hoạt tính năng bảo mật tầng dòng cho toàn bộ bảng liên quan
ALTER TABLE bmfc_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmfc_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmfc_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmfc_settings ENABLE ROW LEVEL SECURITY;

-- Quyền SELECT: Cho phép tất cả mọi người (Bao gồm Guest công khai)
CREATE POLICY "Public Read" ON bmfc_matches FOR SELECT USING (true);
CREATE POLICY "Public Read" ON bmfc_attendance FOR SELECT USING (true);
CREATE POLICY "Public Read" ON bmfc_finances FOR SELECT USING (true);
CREATE POLICY "Public Read" ON bmfc_settings FOR SELECT USING (true);

-- Quyền CUD (Create/Update/Delete): Chỉ chấp nhận tài khoản đã qua bộ Auth thành công
CREATE POLICY "Admin Write" ON bmfc_matches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write" ON bmfc_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write" ON bmfc_finances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write" ON bmfc_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

III. THIẾT KẾ FONTEND (REACT + TYPESCRIPT + TAILWIND)
1. Cấu trúc thư mục mã nguồn (Folder Structure)
src/
├── components/          # Các UI Components dùng chung độc lập
├── hooks/               # Các custom hooks hệ thống
│   └── useAuth.ts       # Hook lắng nghe trạng thái session đăng nhập toàn cục
├── services/            # Tầng giao tiếp mạng / API với Supabase
│   └── footballService.ts # Xử lý lấy/lưu điểm danh, chốt số tiền phạt
├── utils/               # Khởi tạo thư viện cấu hình chung
│   └── supabase.ts      # Cấu hình Supabase Client ban đầu
├── views/               # Các trang giao diện chức năng chính
│   ├── FootballManager.tsx # Trang quản lý tổng hợp (Giao diện chính)
│   └── Login.tsx        # Giao diện màn hình đăng nhập Admin tông Dark Mode
├── types.ts             # Lưu trữ tập trung các Enum và Interface định nghĩa dữ liệu
├── App.tsx
└── main.tsx

2. Định nghĩa Kiểu dữ liệu chuẩn hóa (types.ts)
Toàn bộ các trạng thái nghiệp vụ bắt buộc phải ép kiểu chặt qua Enum để tránh sai lệch chuỗi ký tự trong quá trình gõ mã nguồn:
export enum AttendanceStatus {
  PRESENT = "present",
  ABSENT = "absent",
  FORGOT = "forgot",
  NO_SHOW = "no_show",
}

export enum MatchStatus {
  PENDING = "pending",
  ORGANIZED = "organized",
  CANCELLED = "cancelled",
}

export enum MatchResult {
  WIN = "win",
  LOSS = "loss",
  DRAW = "draw",
}

export interface Match {
  id: string;
  date: string;
  status: MatchStatus;
  result: MatchResult | null;
  created_at?: string;
}

export interface PlayerAttendance {
  id: string; 
  name: string;
  status: AttendanceStatus;
}

export interface PenaltySettings {
  [key: string]: number;
}

3. Các Phân Hệ Giao Diện (UI Modules)
Hệ thống thiết kế theo kiến trúc Mobile-First App dạng Tabs điều hướng đặt ở đáy màn hình (Thumb-Zone) giúp tối ưu trải nghiệm cầm nắm một tay ngoài đời thực:

Phân hệ Điểm Danh Hàng Ngày (Tab: daily):

Hiển thị thanh công cụ chốt trạng thái trận đấu nhanh hôm nay (Chờ đá / Lên trận / Hủy buổi).

Tự động kích hoạt hiển thị bộ nút kết quả (Thắng / Thua / Hòa) khi chọn trạng thái "Lên trận".

Danh sách thẻ thành viên kèm cụm 4 nút bấm tương ứng nhanh cho từng trạng thái điểm danh cá nhân.

Phân hệ Tài Chính Quỹ Đội (Tab: finance):

Bảng thống kê tổng hợp trạng thái hoàn thành nghĩa vụ quỹ tháng của từng cá nhân.

Hiển thị chi tiết số dư nợ phạt lũy kế dựa trên dữ liệu đồng bộ thời gian thực từ backend.

Tích hợp nút "Thu tiền" nhanh để Admin xóa nợ trực tiếp khi thành viên nộp tiền mặt trên sân bóng.

Phân hệ Cấu Hình Hệ Thống (Tab: settings):

Biểu mẫu nhập liệu (Form) cho phép Admin chủ động thay đổi linh hoạt định mức tiền phạt (Tiền quỹ, quên điểm danh, bùng trận, phạt thua, phạt hòa).

Phân hệ Xác Thực Quản Trị (Login.tsx):

Giao diện đăng nhập chuẩn hóa, kế thừa phong cách tối (Dark Mode - màu nền slate-900 kết hợp sắc xanh cỏ đặc trưng emerald-500) tạo tính đồng bộ thương hiệu thể thao phủi chuyên nghiệp.
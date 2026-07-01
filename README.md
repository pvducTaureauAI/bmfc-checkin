# Tài Liệu Hệ Thống Quản Lý Đội Bóng BMFC

Hệ thống quản lý nội bộ cho đội bóng phủi BMFC, dùng để điểm danh, chốt kết quả buổi đá, tự động tính quỹ phạt và theo dõi tình trạng đóng tiền của thành viên. Giao diện được tối ưu theo hướng mobile-first để Admin thao tác nhanh ngay tại sân.

---

## I. Kiến Trúc Và Công Nghệ

- Frontend: ReactJS + TypeScript + Tailwind CSS, build bằng Vite.
- Backend và cơ sở dữ liệu: Supabase (PostgreSQL + Supabase Auth).
- Bảo mật: Row Level Security, cho phép xem công khai nhưng chỉ tài khoản đã đăng nhập mới được sửa dữ liệu.

---

## II. Thiết Kế Backend

### 1. Các bảng dữ liệu chính

#### Bảng `bmfc_user`

Lưu thông tin thành viên.

- `id` (UUID, khóa chính)
- `name` (TEXT)

#### Bảng `bmfc_attendance`

Lưu điểm danh theo ngày, không còn bảng `matches` riêng.

- `id` (UUID, khóa chính)
- `date` (DATE) - ngày điểm danh
- `user_id` (UUID) - thành viên
- `status` (TEXT) - `present`, `absent`, `late`, `forgot`, `no_show`
- `match_result` (TEXT) - `win`, `loss`, `draw`, hoặc `null`
- `UNIQUE(date, user_id)`

#### Bảng `bmfc_finances`

Lưu các khoản quỹ và tiền phạt.

- `id` (UUID, khóa chính)
- `user_id` (UUID)
- `type` (TEXT) - `monthly` hoặc `penalty`
- `reason` (TEXT)
- `amount` (NUMERIC)
- `date` (DATE)
- `is_paid` (BOOLEAN)
- `created_at` (TIMESTAMP WITH TIME ZONE)

#### Bảng `bmfc_settings`

Lưu cấu hình mức phạt.

```sql
CREATE TABLE bmfc_settings (
    key TEXT PRIMARY KEY,
    value NUMERIC NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Luật nghiệp vụ tự động

Khi Admin chọn kết quả buổi đá cho một ngày, hệ thống sẽ quét điểm danh của ngày đó và tự động tạo tiền phạt:

- Quên điểm danh (`forgot`): cộng `penalty_forgot`.
- Điểm danh nhưng bùng (`no_show`): cộng `penalty_no_show`.
- Đi muộn (`late`): cộng `penalty_late`.
- Thua buổi (`loss`): các thành viên có mặt ra sân bị cộng `penalty_loss`.
- Hòa buổi (`draw`): xử lý như thua, áp dụng `penalty_loss`.

Trước khi ghi phạt mới, hệ thống sẽ xóa các bản ghi phạt cũ cùng ngày để tránh cộng dồn khi Admin sửa lại kết quả.

### 3. Phân quyền và bảo mật

```sql
ALTER TABLE bmfc_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmfc_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmfc_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read" ON bmfc_attendance FOR SELECT USING (true);
CREATE POLICY "Public Read" ON bmfc_finances FOR SELECT USING (true);
CREATE POLICY "Public Read" ON bmfc_settings FOR SELECT USING (true);

CREATE POLICY "Admin Write" ON bmfc_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write" ON bmfc_finances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write" ON bmfc_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## III. Thiết Kế Frontend

### 1. Cấu trúc mã nguồn

```text
src/
├── components/          # Component dùng chung
├── hooks/               # Custom hooks
├── utils/               # Khởi tạo Supabase client
├── pages/               # Các trang giao diện
├── common/              # Enum và kiểu dữ liệu dùng chung
├── footballService.ts   # Xử lý đọc/ghi điểm danh và tiền phạt
├── App.tsx
└── main.tsx
```

### 2. Kiểu dữ liệu chính

```ts
export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  FORGOT = 'forgot',
  NO_SHOW = 'no_show',
}

export enum MatchResult {
  WIN = 'win',
  LOSS = 'loss',
  DRAW = 'draw',
}

export interface PlayerAttendance {
  id: string
  name: string
  status: AttendanceStatus
}

export interface PenaltySettings {
  [key: string]: number
}
```

### 3. Các phân hệ giao diện

#### Điểm danh hàng ngày

- Có bộ lọc thời gian dạng modal cho mobile.
- Cho phép chọn theo ngày, tuần hoặc tháng.
- Không còn phần trạng thái trận riêng và không còn bảng `matches`.
- Khi Admin đổi trạng thái điểm danh, dữ liệu được lưu ngay.
- Kết quả buổi đá được lưu vào từng bản ghi điểm danh để phục vụ tính phạt.

#### Tài chính quỹ đội

- Hiển thị tình trạng quỹ tháng và tổng nợ phạt.
- Có nút thu tiền nhanh cho Admin.
- Dữ liệu có thể lọc theo ngày, tuần, tháng.

#### Cấu hình hệ thống

- Admin chỉnh được các mức phạt trong app.
- Đã bổ sung mức phạt đi muộn `20.000đ`.

#### Đăng nhập quản trị

- Giao diện nền tối, màu slate-900 kết hợp emerald-500.
- Admin đăng nhập xong sẽ vào thẳng trang chính.
- Có avatar, email và nút đăng xuất ở header.

---

## IV. Ghi Chú Vận Hành

- Người dùng chưa đăng nhập chỉ xem dữ liệu.
- Admin mới được sửa điểm danh, thu tiền và cập nhật cấu hình.
- Nếu thay đổi kết quả buổi đá, hệ thống sẽ tự tính lại các khoản phạt của ngày đó.

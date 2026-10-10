# ĐẶC TẢ TRANG HỒ SƠ CÁ NHÂN & ĐIỂM RÈN LUYỆN (PAGE PROFILE SPEC)
> **Trang:** `ProfilePage`  
> **Tuyến đường (Route):** `/profile`  
> **Dự án:** DH26NHE  
> **Trọng tâm:** Thống kê Điểm rèn luyện, Lịch sử minh chứng & Xuất dữ liệu

---

## 1. Mục tiêu & Luồng hoạt động của Trang

Trang Cá nhân cho phép sinh viên lớp **DH26NHE**:
1. Xem thông tin cá nhân và định danh sinh viên được xác thực từ Google Auth.
2. Tra cứu tổng quan **Điểm Rèn Luyện (ĐRL)** của từng học kỳ, bao gồm điểm điều kiện, điểm thưởng và các tiêu chí đã đạt.
3. Theo dõi toàn bộ lịch sử các hoạt động đã nộp minh chứng với bộ lọc trạng thái (Đã duyệt, Đang chờ, Từ chối).
4. Xem lại chi tiết tệp đính kèm và lý do phản hồi từ Ban Cán Sự nếu bị từ chối.
5. Xuất lưu trữ minh chứng về máy cá nhân dưới dạng tệp nén ZIP.

---

## 2. Bố cục Giao diện (Page Structure)

Trang được thiết kế dạng thẻ dọc cuộn mượt mà (`max-w-2xl mx-auto p-4 md:p-6 space-y-4`):

```
┌────────────────────────────────────────────────────────┐
│  [← Quay lại phòng]                                    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. PROFILE HEADER CARD                           │  │
│  │    Avatar | Họ và Tên | MSSV | Lớp DH26NHE       │  │
│  │    Email sinh viên | Badge Vai trò (Sinh viên)   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 2. SCORE SUMMARY CARD (Bộ tính điểm ĐRL)         │  │
│  │    • Điểm tổng kết: [ 95 / 100 ]                 │  │
│  │    • Điểm cộng tích lũy: +24 ĐRL                 │  │
│  │    • Hoạt động đã duyệt: 6 hoạt động             │  │
│  │    • Checklist Tiêu chí đạt:                     │  │
│  │      [x] CLB học thuật   [x] GPA > 2.5           │  │
│  │      [ ] NCKH            [ ] Cán bộ Lớp/Đoàn     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 3. FILTER TABS & SEARCH BAR                      │  │
│  │    [Tất cả (8)] [Đã duyệt (6)] [Đang chờ (1)]    │  │
│  │    [Từ chối (1)] | [🔍 Tìm hoạt động...]         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 4. ACTIVITY HISTORY FEED (Danh sách minh chứng)  │  │
│  │    • Post Card 1 (Tiêu đề, Điểm, Status, Album)  │  │
│  │    • Post Card 2 (Lý do từ chối nếu có)          │  │
│  │    • ...                                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 5. EXPORT ACTIONS (Xuất tệp ZIP minh chứng)      │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Đặc tả Logic Tính Điểm Rèn Luyện (`drlCalculator.ts`)

Logic ĐRL được chuẩn hóa dựa trên quy định xét điểm của Trường ĐH Nông Lâm TP.HCM:

### 3.1 Bảng tiêu chí cốt lõi
Hệ thống đối soát danh sách các hoạt động **đã được phê duyệt (`status === 'approved'`)** của sinh viên với 5 tiêu chí:
1. **CLB học thuật (`hasClub`):** Tham gia CLB học thuật, đội nhóm chuyên môn.
2. **Nghiên cứu khoa học (`hasResearch`):** Tham gia NCKH cấp khoa/trường có minh chứng rõ ràng.
3. **Cán bộ Lớp / Đoàn / Hội (`hasOfficer`):** Ban cán sự lớp, ban chấp hành Đoàn, Hội hoàn thành tốt nhiệm vụ.
4. **Thành tích đặc biệt (`hasSpecial`):** Đạt giải thưởng thi đấu học thuật, phong trào cấp trường trở lên.
5. **Học lực GPA (`hasGpa`):** Điểm trung bình học kỳ ≥ 2.5 (hệ 4).

### 3.2 Thuật toán phân cấp điểm điều kiện (`calculateConditionalScore`)
- Đếm số tiêu chí lớn sinh viên đạt được:
  `mainCount = (hasClub ? 1 : 0) + (hasResearch ? 1 : 0) + (hasOfficer ? 1 : 0)`
- **Điểm điều kiện:**
  - Nếu `mainCount >= 2`: **100 điểm** (Xuất sắc).
  - Nếu `mainCount >= 1` hoặc `hasSpecial`: **95 điểm** (Tốt).
  - Mặc định: **90 điểm** (Khá).
- **Điểm tổng kết cuối cùng:** Giới hạn tối đa là 100 điểm (`Math.min(conditionalScore, 100)`).

```typescript
export interface DrlScoreResult {
  finalScore: number;
  conditionalScore: number;
  metConditions: string[];
  totalBonusPoints: number;
  approvedCount: number;
}
```

---

## 4. Đặc tả Thẻ Hoạt động Lịch sử (`ActivityPostCard`)

Mỗi hồ sơ minh chứng trong danh sách lịch sử hiển thị đầy đủ thông tin:
- **Header:**
  - Avatar gradient + Tên sinh viên + Ngày nộp (định dạng `dd/mm/yyyy hh:mm`).
  - Badge trạng thái:
    - `approved`: Xanh lá `Đã duyệt` + Icon 2 dấu tích.
    - `pending`: Vàng cam `Chờ duyệt` + Icon đồng hồ.
    - `rejected`: Đỏ `Từ chối` + Icon dấu X.
  - Viên thuốc điểm: `+X ĐRL`.
- **Tiêu đề:** Tên hoạt động in đậm rõ ràng.
- **Ghi chú sinh viên:** Mô tả khi nộp (hỗ trợ thu gọn/mở rộng nếu quá 3 dòng).
- **Phản hồi của Ban Cán Sự (Review Note):** Nếu hồ sơ bị từ chối, hiển thị khung màu đỏ pastel cảnh báo kèm nội dung lý do cán sự từ chối để sinh viên nắm rõ.
- **Thư viện minh chứng:**
  - Ảnh: Hiển thị lưới album ảnh Telegram, click để mở `TelegramMediaViewer` với đầy đủ tính năng phóng to, thu nhỏ, trượt ảnh.
  - PDF: Hiển thị thẻ file PDF kèm nút mở tab mới xem trực tiếp.

---

## 5. Cơ chế Bộ nhớ đệm Tốc độ cao (`LocalForage Cache`)

Để trang Profile mở **ngay lập tức trong 0.1 giây** mà không cần đợi Firebase fetch qua mạng:
1. Khi truy cập: Đọc trước dữ liệu từ IndexedDB thông qua `localforage` theo khóa `profile_${userId}_${semester}`.
2. Nếu có cache: Hiển thị ngay lên màn hình cùng các chỉ số ĐRL đã tính toán.
3. Chạy truy vấn ngầm từ Firestore `submissionService.fetchUserSubmissions(user.email, semester)`.
4. Khi có dữ liệu mới: Cập nhật lại UI và ghi đè cache IndexedDB.
5. Khi người dùng nộp mới hoặc thu hồi minh chứng: Tự động xóa cache của học kỳ đó (`clearUserCache`) để đảm bảo số liệu luôn chính xác.

---

## 6. Tính năng Xuất Minh chứng (`Export to ZIP`)

Cho phép sinh viên tải về toàn bộ file ảnh/tài liệu của các hoạt động đã chọn hoặc tất cả các hoạt động trong kỳ:
- Sử dụng thư viện `jszip` và `file-saver` hoàn toàn ở Client-side (không cần server backend).
- Gom các file về máy theo cấu trúc thư mục nén:
  ```
  DH26NHE_[MSSV]_[HocKy]/
  ├── 01_[TenHoatDong]/
  │   ├── minh_chung_1.jpg
  │   └── thong_tin.txt
  └── 02_[TenHoatDong]/
      └── minh_chung_1.pdf
  ```
- Hiển thị tiến trình tải trực quan (`Đang tải 3/10 tệp...`) bằng Toast.

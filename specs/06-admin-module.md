# ĐẶC TẢ TRỌN GÓI QUẢN TRỊ VIÊN ADMIN (ADMIN MODULE SPEC)
> **Phân hệ:** `AdminPage` & Các trang Admin liên quan  
> **Tuyến đường (Routes):** `/admin/*` (`/admin`, `/admin/activity-management`, `/admin/activity/:submissionId`, `/admin/statistics`, `/admin/drl-management`)  
> **Dự án:** DH26NHE  
> **Bảo vệ quyền truy cập:** `AdminRoute` (Kiểm tra Custom Claim `admin === true`)

---

## 1. Tổng quan Phân hệ Quản trị (Admin Architecture)

Gói Admin dành riêng cho Ban Cán Sự lớp và Quản trị viên để quản lý toàn bộ chu trình hoạt động, duyệt minh chứng và tổng kết điểm rèn luyện của lớp **DH26NHE**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ADMIN MODULE ARCHITECTURE                       │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 1. AUTH GATEWAY (AdminRoute Guard)                                 │ │
│ │    Kiểm tra currentUser.isAdmin === true (Token Claim)             │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                   │                                    │
│         ┌─────────────────────────┴─────────────────────────┐          │
│         ▼                                                   ▼          │
│ ┌───────────────────────────────────┐ ┌──────────────────────────────┐ │
│ │ 2. QUẢN LÝ ROOMS & MINH CHỨNG     │ │ 3. QUẢN LÝ HỒ SƠ SINH VIÊN   │ │
│ │                                   │ │    VÀ ĐIỂM RÈN LUYỆN         │ │
│ │ • Quản lý Định nghĩa Phòng (CRUD) │ │ • Thống kê Tổng thể cả lớp   │ │
│ │   Tạo phòng mới, sửa điểm, đổi    │ │   (Centralized Statistics)   │ │
│ │   mô tả, đồng bộ Realtime RTDB    │ │ • Soi Hồ sơ Chi tiết         │ │
│ │                                   │ │   (StudentDetailModal)       │ │
│ │ • Hàng đợi Duyệt Minh chứng       │ │   Xem lịch sử, duyệt chéo    │ │
│ │   Feed View & Table View          │ │ • Bảng Điểm Rèn Luyện (ĐRL)  │ │
│ │   Phân trang cursor (20/lần)      │ │   Nhập/Xuất JSON & Excel     │ │
│ │                                   │ │ • Khóa nộp bài lớp           │ │
│ │ • Trang Soi bài Chi tiết          │ │   (System Upload Lock)       │ │
│ │   (/admin/activity/:id)           │ │                              │ │
│ │   So sánh thông tin + Media zoom  │ │                              │ │
│ │   Duyệt / Từ chối (Bắt buộc lý do)│ │                              │ │
│ │   Chuyển tiếp hồ sơ kế tiếp       │ │                              │ │
│ └───────────────────────────────────┘ └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Kiểm soát Quyền truy cập (`AdminRoute`)

Mọi tuyến đường trong `/admin/*` đều được bảo vệ nghiêm ngặt:
- Nếu chưa đăng nhập: Tự động điều hướng về `/login`.
- Nếu đã đăng nhập nhưng không có claim `admin: true`:
  - Hiển thị thông báo Toast lỗi: *"Bạn không có quyền truy cập khu vực quản trị viên!"*.
  - Điều hướng người dùng về trang `/rooms`.
- Thành phần `AdminRoute.tsx`:
  ```typescript
  export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, loading } = useAuth();
    if (loading) return <PageLoader text="ĐANG KIỂM TRA QUYỀN HẠN..." />;
    if (!currentUser || !currentUser.isAdmin) {
      return <Navigate to="/rooms" replace />;
    }
    return <>{children}</>;
  };
  ```

---

## 3. Quản lý Phòng Hoạt động (Admin Room Management)

### 3.1 Khởi tạo và Quản lý Phòng (`ActivityDefinitionManager`)
Cán sự có thể cấu hình các phòng hoạt động cho từng học kỳ:
- **Thêm phòng mới (`AddActivityForm`):**
  - Tên hoạt động (vd: *"Tiếp sức mùa thi 2026"*).
  - Điểm quy định (vd: `5`, `10`).
  - Nội dung hướng dẫn / mô tả thể lệ.
  - Ảnh minh họa (URL).
  - Học kỳ áp dụng (vd: `HK1N1`).
- **Cơ chế ghi dữ liệu Realtime:**
  1. Tạo mã định danh phòng: `ACT-${Date.now()}`.
  2. Ghi trực tiếp vào RTDB node `activities/${semester}/${roomId}`.
  3. Đồng bộ song song vào RTDB node `notifications/${roomId}` để phát tín hiệu thông báo cho toàn bộ app.
- **Chỉnh sửa / Xóa phòng:**
  - Sửa tên, điểm, mô tả: Tự động cập nhật đồng bộ các node RTDB.
  - Xóa phòng: Hộp thoại cảnh báo xác nhận nguy hiểm.

---

## 4. Hàng đợi Duyệt Minh chứng (Submissions Review Queue)

Nằm tại `/admin/activity-management`, nơi ban cán sự xử lý minh chứng nộp về:

### 4.1 Thanh công cụ Điều khiển cố định (`ActivityToolbar`)
- **Bộ lọc Học kỳ:** Chuyển đổi giữa các học kỳ của lớp `DH26NHE`.
- **Thanh tìm kiếm tức thì:** Tìm theo tên sinh viên, MSSV hoặc tên hoạt động.
- **Thẻ trạng thái kèm số lượng đếm thực tế (Server Count Aggregation):**
  - `Đang chờ` (pending) — Số lượng lấy từ `getCountFromServer()`
  - `Phê duyệt` (approved)
  - `Không phê duyệt` (rejected)
- **Bộ chuyển đổi chế độ xem (View Mode):**
  - **Feed View:** Chế độ xem dạng thẻ mạng xã hội Telegram trực quan, hiển thị ảnh xem trước lớn.
  - **Table View:** Chế độ xem dạng bảng dữ liệu gọn gàng để kiểm soát hàng loạt.

### 4.2 Thao tác Hàng loạt (Bulk Actions)
- Chọn nhiều dòng thông qua checkbox (hoặc nút "Chọn tất cả").
- **Duyệt hàng loạt:** Chuyển trạng thái các hồ sơ đã chọn sang `approved` cùng lúc qua `writeBatch()`.
- **Từ chối hàng loạt:** Mở modal nhập lý do chung và chuyển sang `rejected`.
- **Xóa hàng loạt:** Xóa vĩnh viễn dữ liệu và xóa file tương ứng trong Firebase Storage.

---

## 5. Trang Soi Minh chứng Chi tiết (`/admin/activity/:submissionId`)

Giao diện chia 2 cột tối ưu hóa tốc độ duyệt bài của Ban Cán Sự:

### 5.1 Cột Trái: Thông tin Hồ sơ & Thao tác Duyệt (`ActivityDetails` & `ActivityActionFooter`)
- **Header:** Nút Back, huy hiệu tiến trình (`Hồ sơ 3 / 25`), và 2 nút điều hướng nhanh **Trước (Prev)** / **Tiếp (Next)** (hỗ trợ phím tắt mũi tên bàn phím).
- **Thông tin sinh viên:** Họ tên, email, MSSV, thời gian gửi.
- **Thông tin hoạt động:** Tên phòng, số điểm sẽ cộng (`+5 ĐRL`).
- **Ghi chú của sinh viên:** Lời nhắn lúc nộp.
- **Ô nhập Phản hồi / Lý do từ chối:**
  - Nếu bấm **Phê duyệt:** Cập nhật `status = 'approved'`, tự động nhảy ngay sang hồ sơ kế tiếp.
  - Nếu bấm **Từ chối:** Bắt buộc nhập lý do từ chối (vd: *"Ảnh mờ không rõ mặt"*, *"Thiếu chữ ký xác nhận"*), cập nhật `status = 'rejected'`, lưu lý do vào trường `reviewNote`.

### 5.2 Cột Phải: Trình xem Minh chứng Toàn diện (`EvidencePreview`)
- Hiển thị danh sách ảnh toàn màn hình với độ phân giải gốc.
- Hỗ trợ cuộn phóng to, xoay ảnh, xem trước tệp tài liệu PDF đính kèm mà không cần tải về máy.
- Tự động tải trước (prefetch) ảnh của hồ sơ tiếp theo trong hàng đợi để chuyển trang tức thì.

---

## 6. Quản lý Hồ sơ Sinh viên & Điểm Rèn Luyện (User & DRL Management)

### 6.1 Thống kê Tổng thể Sinh viên (`CentralizedStatisticsTab`)
- Tuyến đường: `/admin/statistics`.
- Danh sách toàn bộ sinh viên trong lớp `DH26NHE` kèm các chỉ số:
  - MSSV, Họ và tên, Email.
  - Tổng số hoạt động đã nộp.
  - Số hoạt động đã duyệt.
  - Tổng điểm thưởng đạt được.
  - Điểm tổng kết ĐRL ước tính.
- Nhấp vào bất kỳ sinh viên nào sẽ kích hoạt **`StudentDetailModal`**.

### 6.2 Thanh tra Hồ sơ Sinh viên (`StudentDetailModal`)
- Modal phóng to toàn màn hình kiểu Telegram.
- Xem toàn bộ hành trình nộp minh chứng của **một sinh viên cụ thể** trong học kỳ được chọn.
- Lọc theo trạng thái của riêng sinh viên đó (Tất cả, Đã duyệt, Đang chờ, Từ chối).
- Tích hợp `TelegramMediaViewer` để cán sự kiểm tra lại các minh chứng cũ của sinh viên mà không cần rời khỏi trang thống kê.

### 6.3 Quản trị Bảng Điểm Rèn Luyện (`DrlManagementTab`)
- Tuyến đường: `/admin/drl-management`.
- Xem bảng điểm ĐRL chính thức.
- **Xuất dữ liệu:** Xuất bảng điểm lớp ra định dạng file Excel (`.xlsx`) hoặc JSON chuẩn phục vụ báo cáo khoa/trường.
- **Nhập dữ liệu:** Cho phép tải lên file JSON cập nhật điểm hàng loạt.

### 6.4 Khóa nộp bài Hệ thống (`System Upload Lock`)
- Cấu hình qua RTDB node `system_config/upload_lock`.
- Cán sự có thể bật **Khóa cổng nộp bài** khi hết hạn học kỳ.
- Hỗ trợ danh sách trắng (Whitelist): Cán sự có thể cấp quyền đặc cách cho một số sinh viên nộp bù qua email.

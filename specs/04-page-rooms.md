# ĐẶC TẢ TRANG PHÒNG HOẠT ĐỘNG & MINH CHỨNG (PAGE ROOMS SPEC)
> **Trang:** `RoomPage`  
> **Tuyến đường (Routes):** `/rooms`, `/rooms/:semester`, `/rooms/:semester/:roomId`  
> **Dự án:** DH26NHE  
> **Phong cách chủ đạo:** Telegram Web Z/K Interface

---

## 1. Bố cục & Trải nghiệm đa thiết bị (Responsive Layout)

Trang Phòng hoạt động được thiết kế theo bố cục chia đôi (Split-view) chuyên nghiệp:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ROOMS PAGE ARCHITECTURE                         │
│                                                                        │
│ ┌───────────────────────────┐ ┌──────────────────────────────────────┐ │
│ │        SIDEBAR            │ │             ROOM CONTENT             │ │
│ │  (Danh sách phòng)        │ │  (Khu vực nội dung & Chat)           │ │
│ │                           │ │                                      │ │
│ │ • Bộ chọn Học kỳ (HK1N1)  │ │ • Floating Header (Avatar, Title,    │ │
│ │ • Ô tìm kiếm hoạt động    │ │   Số người nộp, Điểm, Menu ⋮)       │ │
│ │ • Danh sách phòng real-time│ │ • 2 Segmented Tabs:                  │ │
│ │ • Badge trạng thái bài nộp│ │   [ Thông báo ]   |   [ Minh chứng ] │ │
│ │   (Đã duyệt / Chờ duyệt)  │ │                                      │ │
│ │                           │ │ ── Tab Thông báo ─────────────────── │ │
│ │                           │ │   Mô tả chi tiết, ảnh bìa, hướng dẫn │ │
│ │                           │ │                                      │ │
│ │                           │ │ ── Tab Minh chứng (Telegram Feed) ── │ │
│ │                           │ │   • Chat Doodle Wallpaper            │ │
│ │                           │ │   • Date Dividers ("Hôm nay",...)    │ │
│ │                           │ │   • Gom nhóm tin theo người nộp     │ │
│ │                           │ │   • Album ảnh / Thẻ tài liệu PDF    │ │
│ │                           │ │   • Optimistic upload & Thu hồi      │ │
│ │                           │ │   • Capsule Chat Composer ở đáy      │ │
│ └───────────────────────────┘ └──────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

- **Màn hình Desktop (≥ 768px):**
  - Cột Sidebar cố định bên trái (`w-72` hoặc `w-80`), cuộn độc lập.
  - Khu vực Room Content chiếm toàn bộ phần còn lại (`flex-1`).
- **Màn hình Mobile (< 768px):**
  - Chế độ 1 cột toàn màn hình (`100dvh`).
  - Khi chưa chọn phòng: hiển thị toàn màn hình Sidebar danh sách phòng.
  - Khi đã chọn phòng: hiển thị toàn màn hình Room Content với nút **Quay lại (ArrowLeft)** ở góc trái header để quay về danh sách.

---

## 2. Đặc tả Thành phần Sidebar (`RoomSidebar`)

### 2.1 Bộ chọn Học kỳ (Semester Dropdown)
- Cho phép chọn học kỳ (mặc định: `HK1N1` hoặc học kỳ mới nhất).
- Khi thay đổi: cập nhật tham số trên URL (`/rooms/:semester`), kích hoạt tải lại danh sách phòng từ RTDB `activities/${semester}`.

### 2.2 Danh sách Phòng Hoạt động Realtime
- Lắng nghe realtime từ RTDB đường dẫn `activities/${semester}` bằng `onValue()`.
- Mỗi mục trong danh sách phòng hiển thị:
  - Avatar phòng: màu nền gradient sinh tự động từ tên phòng, chữ cái viết tắt.
  - Tên phòng / hoạt động (cắt gọn nếu quá dài).
  - Điểm quy định: badge nhỏ (vd: `+5 ĐRL`).
  - **Badge trạng thái của sinh viên hiện tại:**
    - Truy vấn Firestore `users/${semester}/submissions` theo `email === user.email`.
    - **Chưa nộp:** Không hiện badge.
    - **Chờ duyệt (`pending`):** Badge vàng icon đồng hồ `Chờ duyệt`.
    - **Đã duyệt (`approved`):** Badge xanh lá `+5đ Đã duyệt`.
    - **Từ chối (`rejected`):** Badge đỏ `Từ chối`.

---

## 3. Đặc tả Nội dung Phòng (`RoomContent`)

### 3.1 Header Phòng chuẩn Telegram
- Nút quay lại (chỉ hiện trên Mobile).
- Avatar lớn bo tròn `rounded-full` với gradient động.
- Tiêu đề hoạt động (`font-semibold text-[16px]`).
- Dòng trạng thái phụ: `X sinh viên đã nộp · +Y điểm`.
- **Nút menu 3 chấm (⋮):**
  - **Bảng xếp hạng (Leaderboard):** Bật widget xếp hạng điểm của lớp trong học kỳ.
  - **Chia sẻ phòng:** Copy link trực tiếp (`window.location.origin/rooms/${semester}/${roomId}`) vào clipboard, hiển thị toast xác nhận *"Đã copy!"*.

### 3.2 Bộ chuyển đổi Tab (Segmented Pill Tabs)
Viền bo con nhộng 2 tab nằm ngay dưới Header:
1. **Tab 1: Thông báo (`InfoTab`):**
   - Hiển thị bài viết chi tiết về quy định, thể lệ của hoạt động do cán sự đăng.
   - Ảnh bìa minh họa (nếu có): hỗ trợ bấm mở xem ảnh lớn.
   - Thẻ điểm thưởng & thời hạn.
   - Nút kêu gọi hành động (CTA): *"Nộp minh chứng ngay"* ➔ Tự động kích hoạt chuyển sang Tab Minh chứng.
2. **Tab 2: Minh chứng (`ChatTab`):**
   - Phòng chat thời gian thực hiển thị dòng minh chứng của toàn bộ thành viên lớp đã nộp vào phòng này.

---

## 4. Đặc tả Chi tiết Tab Minh chứng (`ChatTab` - Telegram Style)

### 4.1 Khung cảnh Chat (Telegram Chat Scene)
- Nền trang trí hoa văn Telegram Doodle (`TelegramChatPattern`) với độ mờ tinh tế (3.5% Light Mode, 6% Dark Mode).
- Mặt nạ cuộn mềm (Scroll mask gradient) ở mép trên và dưới giúp tin nhắn trôi mượt mà không bị cụt mép.
- **Phân cách ngày (Date Dividers):** Sticky badge nổi bo tròn giữa màn hình với nền `bg-black/35 backdrop-blur-md text-white text-[11px]` hiển thị "Hôm nay", "Hôm qua", hoặc "dd/mm/yyyy".
- **Gom cụm tin nhắn (Clustering):** Các tin nhắn liên tiếp của cùng 1 sinh viên trong cùng 1 ngày được gom chung một cụm, chỉ hiện Avatar và Tên ở tin nhắn đầu tiên.

### 4.2 Bong bóng minh chứng (Message Bubble & Media Collage)
Mỗi tin nhắn minh chứng bao gồm:
1. **Header:** Tên sinh viên, MSSV rút gọn, thời gian gửi.
2. **Nội dung ghi chú:** Lời nhắn hoặc mô tả minh chứng do sinh viên nhập.
3. **Hiển thị tệp đính kèm (Media Grid):**
   - **1 ảnh:** Khung ảnh lớn tỉ lệ tiêu chuẩn, bo góc 16px, bấm vào để mở Lightbox phóng to.
   - **2 ảnh:** Lưới 2 cột cân xứng.
   - **3 ảnh trở lên:** Album lưới chuẩn Telegram Web Z với 1 ảnh lớn chính và các ảnh phụ xếp cạnh, ảnh cuối hiện số lượng còn lại (`+N`).
   - **Tài liệu PDF / DOCX:** Thẻ tài liệu chuyên dụng có icon màu nhận diện (đỏ cho PDF, xanh cho DOCX), tên file, dung lượng MB và nút *"Xem tài liệu"*.
4. **Trạng thái duyệt bài:**
   - Đang chờ: Icon đồng hồ vàng nhỏ góc tin nhắn.
   - Đã duyệt: Icon 2 dấu tích xanh `✓✓` kèm điểm cộng.
   - Không duyệt: Icon cảnh báo đỏ kèm ghi chú lý do từ chối của cán bộ.
5. **Tính năng Thu hồi minh chứng (Recall Evidence):**
   - Sinh viên có thể thu hồi bài nộp của chính mình khi bài còn ở trạng thái `pending`.
   - Bấm nút Thùng rác ➔ Hộp thoại xác nhận Telegram ➔ Chạy hiệu ứng hạt nổ tan biến (Particle Poof Effect) ➔ Gọi `submissionService.revokeSubmission()` để xóa sạch cả Firestore document và file trong Storage.

### 4.3 Trình soạn thảo & Tải lên đáy màn hình (`ChatUploadForm`)
Thanh nhập liệu dạng viên nang nổi (Floating Translucent Capsule) bọc kính mờ `backdrop-blur-xl`:
- **Nút Kẹp giấy (Paperclip):** Bấm mở menu popover với 3 tùy chọn:
  - 🖼 **Ảnh minh chứng:** Mở thư viện ảnh thiết bị (JPG, PNG).
  - 📷 **Chụp ảnh:** Mở trực tiếp camera chụp ảnh minh chứng.
  - 📁 **Tệp tin / Tài liệu:** Mở bộ chọn file PDF, Word.
- **Hỗ trợ Kéo-Thả (Drag & Drop):** Kéo thả tệp trực tiếp vào cửa sổ chat để kích hoạt tải lên.
- **Hỗ trợ Dán từ Clipboard (Paste Ctrl+V):** Dán ảnh chụp màn hình trực tiếp từ clipboard máy tính.
- **Hộp thoại xem trước trước khi gửi (Telegram Attachment Modal):**
  - Mở modal toàn màn hình xem trước danh sách các file đã chọn.
  - Cho phép xóa bớt từng file hoặc bấm "Thêm file".
  - Ô nhập ghi chú / mô tả cho minh chứng (tùy chọn).
  - Nút **"Gửi (N tệp)"** màu xanh Telegram.
- **Tải lên tức thì (Optimistic UI):**
  - Ngay khi bấm Gửi, modal đóng lập tức.
  - Một bong bóng tin nhắn tạm (`_optimistic: true`) xuất hiện ngay dưới đáy phòng chat kèm spinner xoay tròn để người dùng không phải chờ đợi khoá giao diện.
  - Quá trình upload file lên Storage và tạo Firestore doc diễn ra ngầm. Khi hoàn tất, tin nhắn tự động chuyển thành tin nhắn chính thức.
- **Chặn nộp trùng lặp:** Trước khi upload, kiểm tra nếu sinh viên đã có bài nộp đang chờ hoặc đã duyệt cho phòng này thì thông báo nhắc nhở ngay lập tức.

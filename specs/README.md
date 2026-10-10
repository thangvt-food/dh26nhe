# BỘ ĐẶC TẢ KỸ THUẬT & CHUẨN HOÁ HỆ THỐNG DH26NHE
> **Dự án:** Chuyển giao và chuẩn hóa nền tảng từ **DH23VT** sang **DH26NHE**  
> **Phạm vi:** Client-side Web App (React 19 + TypeScript + Tailwind CSS v4 + Firebase SDK v12)  
> **3 Trang Cốt Lõi:** **Login**, **Rooms**, **Profile** + **Trọn gói Admin**
> **github repo: /data/Projects/DH23NHE/specs/README.md**
---

## 1. Giới thiệu dự án & Tôn chỉ chuyển giao

Dự án **DH26NHE** được chuẩn hóa từ mã nguồn `DH23VT` nhằm xây dựng một hệ thống quản lý sinh viên, điểm rèn luyện (ĐRL) và nộp minh chứng hoạt động hiện đại, tốc độ cao và ổn định dài lâu.

### Các cải tiến trọng yếu:
1. **Loại bỏ 100% Key Tiếng Việt:** Toàn bộ cơ sở dữ liệu (Firestore, RTDB, Storage metadata), API payloads và TypeScript types đều được quy chuẩn hóa về **English `camelCase`**. Không còn tình trạng lỗi ký tự có dấu hay khoảng trắng gây crash query hoặc sai lệch encoding.
2. **Client-side First (Tạm hoãn Backend/Server):** Chưa clone phần Go server và Google Apps Script; toàn bộ hoạt động giao tiếp trực tiếp qua Firebase Client SDK v12 modular, giảm thiểu độ phức tạp và chi phí vận hành.
3. **Giữ vững giao diện Telegram Web Z/K:** Trải nghiệm chat minh chứng, album ảnh, thanh soạn thảo con nhộng và theme Dark Mode được kế thừa hoàn hảo.

---

## 2. Bản đồ Bộ tài liệu Đặc tả (`specs/`)

| Thứ tự | Tên tệp đặc tả | Nội dung chính |
| :---: | :--- | :--- |
| **00** | [`00-working-rules.md`](file:///data/Projects/DH23NHE/specs/00-working-rules.md) | **Quy tắc làm việc bất di bất dịch:** Zero Vietnamese Keys, Dark Mode Parity 100%, Service-First, Atomic Cleanups, Definition of Done. |
| **01** | [`01-architecture-and-standards.md`](file:///data/Projects/DH23NHE/specs/01-architecture-and-standards.md) | **Kiến trúc & Công nghệ:** React 19, TypeScript, Vite, Tailwind v4, cấu trúc thư mục, biến môi trường `.env`, khởi tạo Firebase v12. |
| **02** | [`02-database-schemas-and-normalization.md`](file:///data/Projects/DH23NHE/specs/02-database-schemas-and-normalization.md) | **Data Contract & Schema:** Bảng ánh xạ trường cũ ➔ mới, TypeScript interfaces (`ActivitySubmission`, `RoomDefinition`, `StudentDrlProfile`), Adapter tương thích ngược. |
| **03** | [`03-page-login-and-auth.md`](file:///data/Projects/DH23NHE/specs/03-page-login-and-auth.md) | **Trang Đăng nhập (Page 1):** Luồng Google OAuth popup + redirect fallback, phát hiện In-App WebView, kiểm tra Custom Claim `admin === true`. |
| **04** | [`04-page-rooms.md`](file:///data/Projects/DH23NHE/specs/04-page-rooms.md) | **Trang Phòng Hoạt động (Page 2):** Split-view, bộ chọn học kỳ, Sidebar real-time, 2 Tabs (Thông báo & Minh chứng Telegram), upload optimistic, thu hồi minh chứng. |
| **05** | [`05-page-profile.md`](file:///data/Projects/DH23NHE/specs/05-page-profile.md) | **Trang Hồ sơ Cá nhân (Page 3):** Thẻ thông tin sinh viên, công cụ tính ĐRL 5 tiêu chí chuẩn Nông Lâm, lịch sử nộp bài, bộ đệm IndexedDB mở trong 0.1s, xuất file ZIP. |
| **06** | [`06-admin-module.md`](file:///data/Projects/DH23NHE/specs/06-admin-module.md) | **Trọn gói Quản trị Admin:** `AdminRoute` bảo vệ, CRUD phòng hoạt động, Hàng đợi duyệt minh chứng (Feed/Table view), Trang soi bài chi tiết, Modal thanh tra sinh viên `StudentDetailModal`, khóa nộp bài. |
| **07** | [`07-shared-core-logic-and-dependencies.md`](file:///data/Projects/DH23NHE/specs/07-shared-core-logic-and-dependencies.md) | **Core Logic Tách rút:** Pipeline tải lên nhiều tệp, thuật toán Levenshtein đo tương đồng tên hoạt động, Bảng xếp hạng học kỳ, Trình xem ảnh TelegramMediaViewer. |

---

## 3. Lộ trình triển khai khuyến nghị (Implementation Roadmap)

```
[ Phase 1: Setup Dự án ] 
   ├── Khởi tạo repository `DH26NHE` bằng Vite + React 19 + TypeScript
   ├── Cấu hình Tailwind CSS v4, Lucide React, Framer Motion
   └── Cấu hình Firebase SDK v12 modular (`src/firebase.ts`)
         │
[ Phase 2: Xác thực & Đăng nhập ]
   ├── Triển khai `authService.ts` & `AuthContext.tsx`
   ├── Triển khai hook `useInAppBrowser.ts`
   └── Hoàn thiện giao diện `LoginPage` (Route `/login` & `/`)
         │
[ Phase 3: Core Logic & Phòng hoạt động ]
   ├── Tách rút `uploadService.ts` & `storageService.ts`
   ├── Triển khai `RoomSidebar` (Realtime RTDB listener)
   ├── Triển khai `ChatTab` (Telegram message feed & album ảnh)
   ├── Triển khai `ChatUploadForm` (Modal xem trước & upload ngầm)
   └── Hoàn thiện `RoomView` (Route `/rooms`, `/rooms/:semester/:roomId`)
         │
[ Phase 4: Hồ sơ Cá nhân & Điểm Rèn Luyện ]
   ├── Triển khai `drlCalculator.ts` (Thuật toán Levenshtein & 5 tiêu chí)
   ├── Triển khai `localforage.ts` (Cache IndexedDB)
   ├── Triển khai `ScoreSummary` & `ActivityHistory`
   └── Hoàn thiện `ProfileView` (Route `/profile`)
         │
[ Phase 5: Trọn gói Quản trị Admin ]
   ├── Thiết lập `AdminRoute.tsx`
   ├── Xây dựng `ActivityDefinitionManager` (Tạo/sửa phòng realtime)
   ├── Xây dựng `ActivityManagementTab` (Hàng đợi Feed/Table view)
   ├── Xây dựng `ActivityDetailPage` (Soi bài chi tiết & duyệt/từ chối)
   └── Xây dựng `StudentDetailModal` (Thanh tra hồ sơ sinh viên)
         │
[ Phase 6: Nghiệm thu & Kiểm thử ]
   ├── Kiểm tra không còn sót key tiếng Việt trong code & database
   ├── Kiểm tra Dark Mode Parity 100%
   └── Chạy `pnpm build` nghiệm thu không còn lỗi TypeScript
```

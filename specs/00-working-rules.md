# BỘ QUY TẮC LÀM VIỆC & PHÁT TRIỂN HỆ THỐNG DH26NHE
> **Tài liệu chuẩn hóa dành cho Kỹ sư và AI Agents**  
> **Phiên bản:** 1.0 (Chuẩn hóa từ core DH23VT sang DH26NHE)  
> **Trạng thái:** Bắt buộc tuân thủ (Mandatory)

---

## 1. Mục tiêu & Tôn chỉ dự án

1. **Chuẩn hóa toàn diện core logic:** Tách và chuẩn hóa 3 trang cốt lõi (**Login**, **Rooms**, **Profile**) cùng trọn gói tính năng **Admin** tương ứng từ dự án `DH23VT` sang `DH26NHE`.
2. **Loại bỏ 100% key-value Tiếng Việt:** Tuyệt đối không dùng tiếng Việt có dấu hoặc có khoảng trắng trong database keys (Firestore, RTDB, Storage metadata), API payloads, state keys. Toàn bộ schema dữ liệu phải viết bằng **English `camelCase`**. UI nhãn hiển thị cho người dùng vẫn giữ nguyên tiếng Việt thân thiện.
3. **Hiện đại hóa kiến trúc:**
   - Client-side first: Sử dụng React 19 + TypeScript / Strict ESM, Vite, Tailwind CSS v4.
   - Không clone phần backend/server (Go backend / GAS) trong giai đoạn này; chỉ tập trung web client kết nối trực tiếp Firebase Client SDK v12 modular.
   - Tối ưu hóa chi phí đọc Firestore (cursor pagination, server-side count aggregation).
4. **Giữ vững trải nghiệm giao diện:** Thiết kế Telegram Web Z/K aesthetic (frosted glassmorphism, floating headers, round capsules, chat message clustering, smooth spring transitions, full dark mode parity).

---

## 2. Quy tắc cốt lõi bất di bất dịch (Immutable Rules)

### Quy tắc 1: Zero Vietnamese Keys in Data & Code
- **TUYỆT ĐỐI KHÔNG** đặt tên trường dữ liệu Firestore/RTDB/State bằng tiếng Việt (ví dụ cấm: `'Tên hoạt động'`, `'Điểm cộng'`, `'Status': 'Phê duyệt'`, `'Thời gian'`, `'File upload'`).
- **BẮT BUỘC** chuyển đổi sang tiếng Anh chuẩn:
  - `'Tên hoạt động'` ➔ `activityName` / `title`
  - `'Điểm cộng'` ➔ `bonusPoints` / `points`
  - `'Status': 'Đang chờ' | 'Phê duyệt' | 'Không phê duyệt'` ➔ `status: 'pending' | 'approved' | 'rejected'`
  - `'File upload'` / `'File uploads'` ➔ `fileUrl` / `fileUrls`
  - `'Thời gian'` ➔ `submittedAt` (ISO 8601 string hoặc timestamp millisecond)
  - `'Họ và tên'` ➔ `fullName`
  - `'MSSV'` ➔ `studentId`
  - `'Chi tiết'` / `'Ghi chú'` ➔ `reviewNote` / `notes`
- Chỉ hiển thị tiếng Việt trên tầng giao diện người dùng (UI Labels / Tooltips / Buttons / Messages).

### Quy tắc 2: Read Before Edit & Scope Discipline
- Luôn kiểm tra, đọc kỹ component liên quan trước khi triển khai hoặc chỉnh sửa.
- Không tự ý thêm thư viện lạ ngoài stack quy định.
- Chỉ làm đúng và đủ phạm vi 3 trang (Login, Rooms, Profile) + gói Admin đi kèm và core logic tương ứng. Không lan man sang các tính năng khác chưa yêu cầu.

### Quy tắc 3: Dark Mode Parity 100%
Mọi component và modal phải hỗ trợ song song Light Mode & Dark Mode.
Bảng mã màu chuẩn của hệ thống:
| Thành phần | Light Mode | Dark Mode |
| :--- | :--- | :--- |
| **App Background** | `#f3f2f1` hoặc `#e7ebf0` | `#18191c` hoặc `#313338` |
| **Card / Surface** | `#ffffff` | `#212121` hoặc `#2b2d31` |
| **Card Elevate / Modal** | `#ffffff` (shadow-2xl) | `#1e1f22` (border `#3f4147`) |
| **Borders** | `rgba(0,0,0,0.08)` hoặc `#dadce0` | `rgba(255,255,255,0.08)` hoặc `#3f4147` |
| **Text Primary** | `#000000` hoặc `#1f1f1f` | `#ffffff` hoặc `#e8eaed` |
| **Text Secondary** | `#707579` | `#9aa0a6` hoặc `#aaaaaa` |
| **Telegram Accent Blue** | `#3390ec` (hover: `#2883df`) | `#3390ec` (accent: `#4fc3f7`) |
| **Success Badge** | `#4fae4e` | `#81c784` (bg: `#4fae4e`/15) |
| **Warning Badge** | `#f5a623` | `#fcd34d` (bg: `#f5a623`/15) |
| **Danger Badge** | `#e53935` | `#ef9a9a` (bg: `#e53935`/15) |

### Quy tắc 4: Service-First & Layer Separation
Mã nguồn phải tuân thủ nghiêm ngặt mô hình 4 tầng:
```
[ UI Components / Views ]
         ↓ (gọi hooks)
[ Custom Hooks (useRoomData, useUserActivities, useAuth) ]
         ↓ (gọi services)
[ Services Layer (roomService, uploadService, authService, adminService) ]
         ↓ (truy vấn SDK)
[ Firebase SDK v12 Modular (Auth, Firestore, RTDB, Storage) ]
```
- **Không bao giờ** gọi trực tiếp `getDocs()`, `setDoc()`, `ref()` ngay trong UI Component. Mọi truy vấn mạng, database, storage đều phải đóng gói bên trong `services/`.
- Hooks chỉ chịu trách nhiệm quản lý lifecycle, local state, caching và phân phối dữ liệu cho View.

### Quy tắc 5: Bảo toàn tính toàn vẹn Storage & Atomic Cleanups
- Khi người dùng nộp nhiều file: nếu ghi Firestore thất bại, service **bắt buộc** phải xóa dọn sạch các file vừa tải lên Storage (`Promise.allSettled(urls.map(deleteFile))`) để tránh tạo file rác mồ côi (orphan files).
- Khi người dùng hoặc admin xóa/thu hồi minh chứng: phải xóa đồng thời cả Firestore document VÀ toàn bộ file trong Firebase Storage.

### Quy tắc 6: Tối ưu chi phí Firestore (Pagination & Aggregation)
- Tuyệt đối không query `getDocs(collection(...))` không giới hạn trên tập dữ liệu submissions.
- Mọi danh sách lớn phải dùng phân trang con trỏ (Cursor-based Pagination) với `limit(20)` và `startAfter(lastDocSnapshot)`.
- Khi tính tổng số lượng hồ sơ (pending/approved/rejected): dùng `getCountFromServer(query(...))` thay vì fetch toàn bộ doc về đếm `docs.length`.

---

## 3. Quy ước đặt tên (Naming Conventions)

| Đối tượng | Quy tắc | Ví dụ |
| :--- | :--- | :--- |
| **React Components** | `PascalCase` | `RoomView.tsx`, `ChatMessage.tsx`, `ProfileHeader.tsx` |
| **Custom Hooks** | `camelCase` bắt đầu bằng `use` | `useRoomData.ts`, `useUserActivities.ts`, `useAuth.ts` |
| **Services** | `camelCase` kết thúc bằng `Service` | `roomService.ts`, `uploadService.ts`, `drlService.ts` |
| **Database Collections** | `snake_case` hoặc `camelCase` | `submissions`, `activities`, `user_devices` |
| **Database Fields (Keys)** | `camelCase` tiếng Anh chuẩn | `activityName`, `bonusPoints`, `fileUrls`, `submittedAt` |
| **Status Enum Values** | Lowercase string | `'pending'`, `'approved'`, `'rejected'` |
| **Constants** | `UPPER_SNAKE_CASE` | `MAX_UPLOAD_SIZE`, `ALLOWED_MIME_TYPES`, `DEFAULT_SEMESTER` |
| **Types / Interfaces** | `PascalCase` | `ActivitySubmission`, `RoomDefinition`, `UserProfile` |

---

## 4. Danh sách kiểm tra nghiệm thu (Definition of Done - DoD)

Trước khi coi một module là hoàn thành, module đó phải thỏa mãn:
1. [ ] Không chứa bất kỳ key tiếng Việt nào trong request/response/database/state.
2. [ ] UI giữ nguyên bố cục thân thiện, hỗ trợ đầy đủ responsive Mobile/Tablet/Desktop.
3. [ ] Hoạt động mượt mà ở cả Light Mode và Dark Mode.
4. [ ] Xử lý đầy đủ 3 trạng thái: Loading (Skeleton/Spinner), Empty state, Error state.
5. [ ] Có xác thực dữ liệu đầu vào (Zod hoặc validation helper) trước khi gửi lên Firebase.
6. [ ] Build dự án (`pnpm build`) không có lỗi biên dịch TypeScript/ESLint.

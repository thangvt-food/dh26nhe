# Session Log — Polish UI Rooms + Upload (11/10/2026)

> Tổng hợp các thao tác thành công, lỗi đã gặp và hướng xử lý trong session.
> Nghiệm thu cuối: `pnpm test` **75/75 pass** · `pnpm build` pass.

## 1. Toast chuyển lên top-center cho dễ chú ý
- **Làm:** `ToastHost` từ bottom → top-center, rơi spring từ trên, viền trái màu theo loại
  (xanh/cam/đỏ), icon + chữ lớn hơn, z-index cao nhất không bị modal đè.
- `NetworkStatusIndicator` dời xuống `top-16` để khỏi đè toast.

## 2. Bubble chat port sát bản gốc
- Đuôi tin nhắn SVG + góc cắt nhóm (`rounded-br/bl-[4px]`), bong bóng own dark `#2b5278`.
- Tên người gửi nằm trong bubble (tin đến, đầu cụm); tin own bỏ dòng tên thừa.
- Album đủ 5 kiểu gốc (1/2/3/4/5+), overlay zoom, overlay "Đang tải lên...".
- Footer pills: trạng thái có icon + `+N điểm` + giờ kèm ✓/✓✓ + nút **"Thu hồi" có nhãn**.
- `ChatTab` tính `isFirstInGroup/isLastInGroup` theo email liên tiếp trong nhóm ngày.

## 3. Nền phòng chat
- Port nguyên pattern SVG 13 doodles (`#386b94`/14% light, `#9bbdd4`/8% dark), bỏ lớp gradient phủ làm mờ.
- Nền vùng chat dark `#18191c`; mask cuộn chỉ fade đáy; padding `px-2/sm:px-4`,
  cụm `py-2.5 space-y-2`; divider semibold + shadow; loading/empty đúng mẫu gốc.

## 4. Gộp 2 nhánh RTDB → 1 (`activities/`)
- **Phát hiện:** `activities/HK1N1/{id}` và `notifications/{id}` mirror 1:1 (do `createRoom` ghi 2 nơi).
- **Chốt:** giữ `activities/{semester}/{roomId}` duy nhất (realtime rẻ, fan-out tức thì);
  Firestore giữ cho submissions. Xóa mirror ở `create/update/deleteRoom`.
- **Migrate data thật:** chép `imageUrl` từ tin mirror về phòng → `database:remove /notifications`
  (root còn `{"activities": true}`) → sửa `database.rules.json` → redeploy rules.
- `notificationService` + Worker broadcast chuyển sang đọc/ghi `activities/`
  (map phòng → view tin qua `roomToNotification`).

## 5. Avatar sidebar lấy ảnh phòng
- Phòng có `imageUrl` → hiện ảnh bo tròn (giữ viền chọn + chấm trạng thái);
  không ảnh → gradient chữ cái như cũ.

## 6. Xoá phòng cascade + dialog an tâm
- `adminService.countRoomSubmissions` (count server-side Tổng/Chờ/Duyệt/Từ chối).
- `adminService.deleteRoomWithSubmissions`: quét cursor 400/batch → xoá docs theo batch →
  xoá file Storage → xoá node phòng, có progress từng bước.
- `useRoomDeletion` + `DeleteRoomDialog`: hiện số liệu, cảnh báo đỏ, checkbox
  "Tôi đã hiểu" mới mở nút Xoá, progress khi chạy, màn hình kết quả (N hồ sơ + M tệp).
- Nối vào cả Quản lý phòng và Đăng tin.

## 7. Gộp UI Phòng & Thông báo thành 1 màn
- `RoomManager`: toolbar chung (đếm, sort, search, Bảng/Thẻ, nhập JSON, THÊM) +
  bảng chỉnh nhanh + thẻ xem trước + form ảnh (upload file, giữ/gỡ ảnh cũ) +
  nhập JSON + mẫu + xoá cascade.
- Xoá 5 files rời rạc cũ; sidebar còn 2 sections; `/admin/notifications` redirect
  về `/admin/rooms`; Welcome cập nhật links.

## 8. Audit toast + lỗi UI toàn web
- Fix: `xs:` (breakpoint không tồn tại) → `sm:`; dead code bubble; search 2 nguồn → 1.
- Bổ sung toast: đăng nhập, đăng xuất, xuất Excel thống kê.
- Nâng cấp copy: nêu hệ quả mỗi hành động (VD: duyệt → điểm ghi nhận ngay;
  xoá → mất cả tệp Storage, không hoàn tác; khoá cổng → bài cũ giữ nguyên).

## 9. Upload % kiểu Telegram + hàng đợi
- `storageService.uploadFileWithProgress` (`uploadBytesResumable`); `uploadBatch`
  báo % tổng theo bytes (có trọng số); nhiều đợt gửi song song, mỗi bubble % riêng.
- Bubble: vòng % trên ảnh + thanh % mảnh + "Đang tải lên… NN%"; composer không khoá
  khi đợt khác đang chạy (modal dùng trạng thái `sending` riêng).

## 10. Giữ blob preview (khỏi tải lại ảnh)
- `mergeChatItems`: bản thật về → nâng cấp status/id nhưng GIỮ blob; hỏng → gỡ + báo lỗi;
  mở lại tab mới fetch Firebase. Thu hồi giữa lúc đang tải → tự dọn doc vừa tạo.
- File PDF giữ blob vẫn mở được; slot rỗng lấy URL thật.

## 11. Fix lỗi "upload ảnh chỉ hiện icon file"
- **Nguyên nhân gốc:** `isImageFile()` đoán loại bằng đuôi URL, URL blob không đuôi
  → ảnh preview xếp nhầm vào nhóm tài liệu (lỗi bị che trước đây vì upload xong
  swap sang URL Firebase có đuôi).
- **Fix:** gắn MIME theo từng file (`fileTypes` song song `fileUrls`) + hàm
  `splitMedia(urls, types)`; blob cho mọi loại file; bỏ filter thừa ở viewer.

## Lỗi đã gặp & hướng xử lý
| # | Lỗi | Hướng xử lý |
|---|-----|-------------|
| 1 | `uv_cwd` ENOENT khi deploy (đứng trong thư mục đã xoá) | `cd` về root rồi chạy lại |
| 2 | `database:set` bị abort (đòi confirm) | Thêm `--force` |
| 3 | Storage chưa bật trên project mới | Console → Storage → Get Started |
| 4 | pnpm `ignored builds` (firebase/esbuild) | `allowBuilds` trong `pnpm-workspace.yaml` |
| 5 | Test bắt bug thật: `isImageFile` với URL `?token=` | Strip query trước khi match regex |
| 6 | Render 2 ảnh sau upload (optimistic vs thật lệch key) | `clientKey` chung + merge quyết định |
| 7 | TS: `EllipsisV`/`Thumbtack` không tồn tại | `EllipsisVertical`/`Pin` |
| 8 | TS: thiếu field `clientKey` trong type | Bổ sung `submission.types.ts` |
| 9 | Test file vỡ ngoặc 2 lần (edit thay nhầm dòng `it(`) | Đọc file kiểm tra sau mỗi edit, vá lại |
| 10 | Edit xoá nhầm biến còn dùng (ChatMessage) | Khôi phục ngay + build kiểm tra |
| 11 | Edit báo fail nhưng đã áp dụng (xảy ra 2 lần) | Verify bằng `grep`/`read`, không edit mù |
| 12 | Chưa có `serviceAccountKey.json` của dh26nhe | Chờ user cung cấp (đã có file ở root — xem mục Pending) |

## Pending (cần user)
- [x] ~~Chạy `pnpm set-admin aczaao12@gmail.com`~~ — **ĐÃ XONG** (`admin=true` cho
  `aczaao12@gmail.com`, uid `WkKYW4VPHtXYNpTQ6ymFqUwOKye2`). User đăng xuất →
  đăng nhập lại để nhận claim mới.
- [ ] Deploy `storage.rules` (`firebase deploy --only storage --project dh26nhe`) sau khi
  bật Storage Get Started.
- [ ] Deploy Worker API (`workers/api/`) khi cần email relay / FCM push.

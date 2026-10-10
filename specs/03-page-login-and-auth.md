# ĐẶC TẢ TRANG ĐĂNG NHẬP & XÁC THỰC (PAGE LOGIN & AUTH SPEC)
> **Trang:** `LoginPage`  
> **Tuyến đường (Routes):** `/` (khi chưa đăng nhập), `/login`  
> **Dự án:** DH26NHE

---

## 1. Mục tiêu & Luồng hoạt động tổng thể (Auth Lifecycle)

Trang Đăng nhập phục vụ nhận diện danh tính sinh viên và ban cán sự lớp **DH26NHE** thông qua tài khoản Google Workspace sinh viên trường (`@st.hcmuaf.edu.vn`).

```
[ Người dùng truy cập trang Web ]
               │
               ▼
   [ Kiểm tra In-App Browser? ]
        ├── Có ──► Hiển thị Banner cảnh báo mở bằng Chrome/Safari
        └── Không ──► Hiển thị Form Đăng nhập Google
               │
               ▼
[ Nhấn nút "Tiếp tục với Google" ]
               │
     ┌─────────┴─────────┐
     ▼                   ▼
[ Thử Popup ]    [ Bị chặn COOP? ] ──► Chuyển sang signInWithRedirect()
     │
     ▼
[ Xác thực thành công từ Google ]
               │
               ▼
[ Lấy ID Token Claims từ Firebase ]
               │
     ┌─────────┴──────────────────────────┐
     ▼                                    ▼
[ Claim `admin === true` ]      [ Sinh viên thông thường ]
     │                                    │
     ▼                                    ▼
 `user.isAdmin = true`            `user.isAdmin = false`
     │                                    │
     ▼                                    ▼
Chuyển hướng đến `/rooms`        Chuyển hướng đến `/rooms`
(Có thanh công cụ Admin)          (Giao diện thành viên)
```

---

## 2. Các yêu cầu kỹ thuật cốt lõi (Functional Requirements)

### 2.1 Cơ chế Đăng nhập Google (OAuth 2.0)
- Gọi `signInWithPopup(auth, googleProvider)`.
- **Xử lý chặn COOP (Cross-Origin-Opener-Policy):** Nếu popup bị chặn hoặc người dùng dùng môi trường bảo mật cao (lỗi `auth/popup-blocked`, `auth/cancelled-popup-request`), hệ thống tự động fallback sang `signInWithRedirect(auth, googleProvider)`.
- Khi app khởi chạy, tự động đón kết quả chuyển hướng bằng `getRedirectResult(auth)`.
- **Phiên đăng nhập bền vững:** Thiết lập `setPersistence(auth, browserLocalPersistence)` để giữ trạng thái đăng nhập qua các lần đóng/mở tab.

### 2.2 Phát hiện Trình duyệt In-App (In-App Browser Detection)
- Các trình duyệt WebView nhúng trong app bên thứ 3 (Facebook, Messenger, Zalo, TikTok, Instagram, Telegram) thường xuyên chặn popup Google Auth hoặc chặn cookie phân quyền.
- **Hook `useInAppBrowser`:** Quét chuỗi `navigator.userAgent`:
  ```typescript
  const rules = [
    /FBAN|FBAV/i,       // Facebook
    /Instagram/i,       // Instagram
    /Line/i,            // Line
    /Zalo/i,            // Zalo
    /TikTok/i,          // TikTok
    /MicroMessenger/i,  // WeChat
  ];
  ```
- **Hành vi khi phát hiện:**
  - Vô hiệu hóa nút đăng nhập Google (`disabled={isInAppBrowser}`).
  - Hiển thị banner cảnh báo màu vàng/cam nổi bật: *"Bạn đang mở web trong ứng dụng (Zalo/Facebook). Vui lòng nhấn vào biểu tượng ⋮ hoặc chia sẻ để mở bằng Chrome/Safari nhằm đăng nhập an toàn."*

### 2.3 Ràng buộc Email Sinh viên & Phân quyền Admin
- Hệ thống hiển thị lưu ý sinh viên sử dụng đúng tài khoản `@st.hcmuaf.edu.vn`.
- Sau khi có `user`:
  ```typescript
  const tokenResult = await user.getIdTokenResult(true);
  user.isAdmin = Boolean(tokenResult.claims.admin);
  ```
- Nếu `user.isAdmin === true`: mở quyền truy cập các route `/admin/*`.

---

## 3. Đặc tả `AuthService` & `AuthContext`

### 3.1 `authService.ts`
```typescript
import {
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  getRedirectResult,
  updateProfile,
  User
} from 'firebase/auth';
import { auth } from '@/firebase';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export interface ExtendedUser extends User {
  isAdmin?: boolean;
}

export const authService = {
  async loginWithGoogle(): Promise<any> {
    try {
      return await signInWithPopup(auth, provider);
    } catch (error: any) {
      const isCoopError =
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.message?.includes('Cross-Origin-Opener-Policy');

      if (isCoopError) {
        console.warn('[AuthService] Fallback to signInWithRedirect due to COOP');
        return await signInWithRedirect(auth, provider);
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  subscribeToAuthChanges(callback: (user: ExtendedUser | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }

      const extUser = firebaseUser as ExtendedUser;
      try {
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        extUser.isAdmin = Boolean(idTokenResult.claims.admin);
      } catch (err) {
        console.warn('[AuthService] Failed to read custom claims:', err);
        extUser.isAdmin = false;
      }
      callback(extUser);
    });
  },

  async handleRedirectResult(): Promise<void> {
    try {
      await getRedirectResult(auth);
    } catch (err) {
      console.warn('[AuthService] Redirect result error:', err);
    }
  }
};
```

### 3.2 `AuthContext.tsx`
Cung cấp state toàn cục cho toàn ứng dụng:
- `currentUser: ExtendedUser | null`
- `loading: boolean`
- `isAdmin: boolean`
- `login: () => Promise<void>`
- `logout: () => Promise<void>`

---

## 4. Đặc tả Giao diện & Trải nghiệm (UI/UX)

- **Bố cục chính:** Căn giữa màn hình (`min-h-screen flex items-center justify-center`).
- **Hiệu ứng nền (Atmospheric Blobs):** 2 khối gradient mờ trôi nhẹ phía sau:
  - Khối tím/xanh trên: `w-[500px] h-[500px] bg-violet-200/50 dark:bg-violet-900/20 rounded-full blur-3xl`
  - Khối lam dưới: `w-[600px] h-[600px] bg-blue-100/60 dark:bg-blue-900/20 rounded-full blur-3xl`
- **Hộp đăng nhập (Card):**
  - Bo góc `rounded-3xl`, bóng đổ mềm mại (`shadow-xl`), viền kính mờ (`backdrop-blur-xl border border-black/5 dark:border-white/10`).
  - Logo thương hiệu: **DH26NHE** với phong cách chữ đậm, hiện đại.
  - Tiêu đề: *"Chào mừng bạn quay lại!"*.
  - Phụ đề: *"Hệ thống quản lý sinh viên dành riêng cho lớp DH26NHE"*.
- **Nút "Tiếp tục với Google":**
  - Nút bấm toàn chiều rộng, bo tròn `rounded-2xl`, hiển thị icon Google 4 màu sắc nét.
  - Hover: đổ bóng nhẹ và nâng nổi 1px. Active: co nhẹ (`active:scale-[0.98]`).
- **Khối thông tin sinh viên:**
  - Hộp bo góc nền tím pastel nhẹ (`bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40`).
  - Icon thông tin (`Info` từ Lucide) cùng thông điệp: *"Nhớ dùng Email sinh viên (@st.hcmuaf.edu.vn) để hệ thống nhận diện đúng bạn nhé!"*.
- **Footer:** Liên kết chính sách bảo mật và điều khoản dịch vụ.

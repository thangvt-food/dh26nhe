# KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ CHUẨN HOÁ — DH26NHE
> **Tài liệu đặc tả kiến trúc kỹ thuật Client-side**  
> **Dự án đích:** DH26NHE (Chuyển giao từ nền tảng DH23VT)

---

## 1. Tổng quan hệ thống & Phạm vi triển khai

Hệ thống **DH26NHE** là ứng dụng web quản lý sinh viên, điểm rèn luyện (ĐRL) và tương tác hoạt động lớp học theo phong cách Telegram Web hiện đại.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRÌNH DUYỆT NGƯỜI DÙNG                          │
│                                                                        │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────────────┐  │
│  │  Login Page  │      │  Rooms Page  │      │     Profile Page     │  │
│  │  (Auth Flow) │      │  (Telegram)  │      │     (ĐRL & Stats)    │  │
│  └──────────────┘      └──────────────┘      └──────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                 Admin Module (Trọn gói quản trị)                 │  │
│  │   • Quản lý Rooms/Hoạt động    • Duyệt/Từ chối minh chứng        │  │
│  │   • Thống kê sinh viên         • Hồ sơ chi tiết (Student Detail) │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Firebase Web SDK v12 (Modular)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FIREBASE CLOUD SERVICES                         │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  Firebase Auth   │  │ Cloud Firestore  │  │ Realtime Database    │  │
│  │  (Google OAuth,  │  │ (Submissions,    │  │ (Live Rooms, Status, │  │
│  │   Custom Claims) │  │  User Profiles)  │  │  Upload Locks)       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Firebase Cloud Storage (Minh chứng ảnh, PDF, tài liệu sinh viên)│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

> [!NOTE]
> **Quy định về Backend/Server:**
> Toàn bộ logic giai đoạn này chạy **Client-side** trên trình duyệt thông qua Firebase Client SDK trực tiếp. Phần Go server microservice và Google Apps Script (GAS) **không clone và không viết spec** lúc này (để lại làm sau).

---

## 2. Công nghệ chủ đạo (Tech Stack)

| Hạng mục | Công nghệ | Phiên bản | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Framework** | React | 19.x | Hỗ trợ Actions, Transitions, Suspense hiện đại |
| **Language** | TypeScript / Strict ESM | 5.x | Type safety, types cho Firebase data models |
| **Bundler & Tooling** | Vite | 7.x | Hot Module Replacement, build tối ưu |
| **Styling** | Tailwind CSS | 4.x | Cấu hình `@theme`, class tiện ích, modern color palette |
| **Animations** | Framer Motion & GSAP | 12.x | Telegram spring animations, lightbox zoom, poof effect |
| **UI Primitives** | Radix UI | Latest | Dialog, Dropdown, Accordion vô hình trợ năng |
| **Iconography** | Lucide React | Latest | Biểu tượng thống nhất, hiện đại, nhẹ |
| **Icons bổ trợ** | FontAwesome SVG | 6.x | Chỉ dùng cho một số icon nhận diện đặc biệt |
| **Local Storage / Caching** | LocalForage | 1.10.x | Cache dữ liệu hoạt động vào IndexedDB để load tức thì |
| **BaaS (Backend-as-a-Service)**| Firebase SDK | 12.x Modular | Auth, Firestore, RTDB, Storage |

---

## 3. Cấu trúc thư mục chuẩn hóa (Project Structure)

```
DH26NHE/
├── public/                     # Tài nguyên tĩnh (favicon, manifest, sound assets)
├── specs/                      # Thư mục đặc tả kỹ thuật và rules
├── src/
│   ├── app/                    # Global app configuration, css
│   │   ├── globals.css         # Tailwind v4 theme, fonts, root css variables
│   │   └── routes.tsx          # Định tuyến React Router v7
│   ├── components/             # Reusable UI Components
│   │   ├── ui/                 # Atomic design: Button, Input, Modal, Dialog, Badge, Textarea
│   │   ├── shared/             # Shared business widgets
│   │   │   ├── AdminRoute.tsx          # Route guard kiểm tra quyền Admin
│   │   │   ├── TelegramMediaViewer.tsx # Trình xem ảnh/file full screen
│   │   │   ├── TelegramChatPattern.tsx # Nền hoa văn doodle Telegram
│   │   │   ├── BrowserWarningBanner.tsx# Cảnh báo trình duyệt In-App
│   │   │   ├── Toast.tsx               # Toast thông báo
│   │   │   ├── ConfirmationModal.tsx   # Hộp thoại xác nhận tác vụ
│   │   │   ├── NetworkStatusIndicator.tsx # Trạng thái online/offline
│   │   │   └── ErrorBoundary.tsx       # Bắt lỗi crash UI
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── BottomNavBar.tsx
│   │       └── FloatingActions.tsx
│   ├── contexts/               # React Context Providers
│   │   ├── AuthContext.tsx     # Context tài khoản, role, auth state
│   │   └── ThemeContext.tsx    # Context Light / Dark mode
│   ├── hooks/                  # Custom React Hooks
│   │   ├── useAuth.ts          # Hook lấy current user & auth actions
│   │   ├── useDevice.ts        # Hook nhận diện thiết bị & responsive
│   │   ├── useInAppBrowser.ts  # Hook phát hiện WebView mạng xã hội
│   │   ├── useActivities.ts    # Hook load danh sách hoạt động
│   │   └── usePageTracking.ts  # Hook theo dõi page view
│   ├── pages/                  # 3 Core Pages + Admin Module
│   │   ├── LoginPage/          # [PAGE 1] Đăng nhập & Xác thực
│   │   │   ├── LoginView.tsx
│   │   │   └── components/
│   │   ├── RoomPage/           # [PAGE 2] Danh sách & Phòng chat minh chứng
│   │   │   ├── RoomView.tsx
│   │   │   ├── components/
│   │   │   │   ├── RoomSidebar.tsx
│   │   │   │   ├── RoomContent.tsx
│   │   │   │   ├── InfoTab.tsx
│   │   │   │   ├── ChatTab.tsx
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   ├── SenderGroupContainer.tsx
│   │   │   │   ├── ChatUploadForm.tsx
│   │   │   │   └── RankingWidget.tsx
│   │   │   └── hooks/
│   │   │       ├── useRoomData.ts
│   │   │       └── useSubmissionCount.ts
│   │   ├── ProfilePage/        # [PAGE 3] Cá nhân & Hồ sơ ĐRL
│   │   │   ├── ProfileView.tsx
│   │   │   ├── components/
│   │   │   │   ├── ProfileHeader.tsx
│   │   │   │   ├── ScoreSummary.tsx
│   │   │   │   ├── ActivityHistory.tsx
│   │   │   │   └── ActivityPostCard.tsx
│   │   │   └── hooks/
│   │   │       ├── useUserActivities.ts
│   │   │       └── useActivityFiltering.ts
│   │   └── AdminPage/          # [ADMIN] Quản trị Rooms, Duyệt bài, Thống kê
│   │       ├── AdminView.tsx
│   │       ├── context/AdminContext.tsx
│   │       ├── components/
│   │       │   ├── AdminLayout.tsx
│   │       │   ├── AdminHeader.tsx
│   │       │   ├── AdminSidebar.tsx
│   │       │   ├── ActivityManagementTab.tsx
│   │       │   ├── ActivityDetailPage.tsx
│   │       │   ├── StudentDetailModal.tsx
│   │       │   ├── CentralizedStatisticsTab.tsx
│   │       │   └── DrlManagementTab.tsx
│   │       └── hooks/
│   │           ├── useAdminActivities.ts
│   │           └── useStudentActivities.ts
│   ├── services/               # API & Firebase Data Services
│   │   ├── authService.ts      # Đăng nhập, đăng xuất, claims
│   │   ├── roomService.ts      # Lấy danh sách room, realtime sync
│   │   ├── submissionService.ts# Nộp minh chứng, thu hồi, duyệt, từ chối
│   │   ├── drlService.ts       # Tính toán điểm rèn luyện, thống kê
│   │   ├── storageService.ts   # Tải file lên Firebase Storage, dọn file
│   │   └── adminService.ts     # Các tác vụ hàng loạt, phân quyền
│   ├── types/                  # TypeScript Data Models & Schemas
│   │   ├── auth.types.ts
│   │   ├── room.types.ts
│   │   ├── submission.types.ts
│   │   └── drl.types.ts
│   ├── utils/                  # Hàm tiện ích dùng chung
│   │   ├── drlCalculator.ts    # Logic tính điểm điều kiện và điểm cuối
│   │   ├── localforage.ts      # Quản lý IndexedDB cache
│   │   ├── stringUtils.ts      # Levenshtein distance, similarity match
│   │   ├── formatters.ts       # Format ngày tháng, số điểm
│   │   └── cn.ts               # clsx + twMerge helper
│   ├── firebase.ts             # Khởi tạo Firebase SDK v12 modular
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── firebase.json
├── firestore.rules
├── database.rules.json
├── storage.rules
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 4. Biến môi trường chuẩn hóa (`.env.example`)

Dự án sử dụng tiền tố `VITE_` chuẩn cho Vite:

```env
# Firebase Web App Config
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=dh26nhe.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://dh26nhe-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=dh26nhe
VITE_FIREBASE_STORAGE_BUCKET=dh26nhe.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Hệ thống cấu hình lớp
VITE_DEFAULT_CLASS_NAME=DH26NHE
VITE_DEFAULT_SEMESTER=HK1N1
VITE_STUDENT_EMAIL_DOMAIN=@st.hcmuaf.edu.vn

# Optional Webhook Thông báo (Discord)
VITE_WEBHOOK_SUBMISSION_NOTIFY=
```

---

## 5. Khởi tạo Firebase SDK v12 chuẩn hóa (`src/firebase.ts`)

```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Auth with Local Persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[Firebase Auth] Persistence error:', err);
});

// Firestore with Multi-Tab IndexedDB Cache & Fallback
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  console.warn('[Firestore] Fallback to memory cache:', e);
  dbInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
}
export const db = dbInstance;

// Realtime Database & Storage
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
```

# BẢN ĐẶC TẢ SCHEMA DỮ LIỆU & CHUẨN HOÁ TIẾNG ANH (DATA CONTRACT)
> **Dự án:** DH26NHE  
> **Nguyên tắc:** 100% English Keys, Strongly Typed, Zero Accented Keys, CamelCase

---

## 1. Bảng đối chiếu chuyển đổi (Mapping Table: DH23VT ➔ DH26NHE)

Dưới đây là bảng đối chiếu chi tiết từng trường dữ liệu cũ (dễ gây lỗi encoding, lỗi query do khoảng trắng và ký tự có dấu) sang trường dữ liệu chuẩn hóa mới:

| Thực thể | Trường cũ (DH23VT - Bị loại bỏ) | Trường mới (DH26NHE - Chuẩn hóa) | Kiểu dữ liệu | Ý nghĩa |
| :--- | :--- | :--- | :--- | :--- |
| **Submission** | `doc.id` (ngẫu nhiên) | `id` / `submissionId` | `string` | Định danh tài liệu minh chứng |
| | `'Tên hoạt động'` | `activityName` | `string` | Tên của hoạt động nộp minh chứng |
| | `'Điểm cộng'` | `bonusPoints` | `number` | Số điểm rèn luyện cộng thêm |
| | `'File upload'` (string đơn) | `fileUrl` | `string` | Link URL tệp đầu tiên (hỗ trợ hiển thị nhanh) |
| | `'File uploads'` / `FileUrls` | `fileUrls` | `string[]` | Danh sách toàn bộ URL minh chứng |
| | `Status`: `'Đang chờ'` | `status`: `'pending'` | `'pending'` | Chờ ban cán sự duyệt |
| | `Status`: `'Phê duyệt'` | `status`: `'approved'` | `'approved'` | Đã được duyệt cộng điểm |
| | `Status`: `'Không phê duyệt'` | `status`: `'rejected'` | `'rejected'` | Bị từ chối |
| | `'Thời gian'` / `'Thời gian nộp'` | `submittedAt` | `number` (epoch ms) / `string` (ISO) | Thời điểm gửi minh chứng |
| | `'Name'` / `'Họ và tên'` / `'Họ tên'` | `fullName` | `string` | Họ và tên đầy đủ của sinh viên |
| | `Email` | `email` | `string` | Email sinh viên (`@st.hcmuaf.edu.vn`) |
| | `photoURL` | `photoUrl` | `string` | Link ảnh đại diện Google Auth |
| | `'MSSV'` | `studentId` | `string` | Mã số sinh viên (tách từ prefix email) |
| | `'Chi tiết'` / `'Ghi chú'` / `'Lý do'` | `reviewNote` | `string` | Ghi chú hoặc lý do từ chối của cán bộ |
| | (Không có) | `reviewedAt` | `number \| null` | Thời điểm duyệt bài |
| | (Không có) | `reviewedBy` | `string \| null` | Email cán bộ duyệt |
| | `'Lớp'` | `className` | `string` | Mã lớp cố định (`"DH26NHE"`) |
| | (Không có) | `semester` | `string` | Mã học kỳ (vd: `"HK1N1"`, `"HK1N4"`) |
| **Room / Hoạt động** | `item[key].points` (lồng phức tạp) | `points` | `number` | Điểm chuẩn của phòng hoạt động |
| | `name` / `keys[0]` | `name` / `title` | `string` | Tên phòng hoạt động |
| | `description` / `body` | `description` | `string` | Thể lệ, nội dung chi tiết |
| | `imageUrl` | `imageUrl` | `string` | Ảnh bìa đại diện của phòng |
| | `adminId` | `createdBy` | `string` | Người khởi tạo (Ban Cán Sự / Admin) |
| | `notificationId` | `notificationId` | `string \| null` | Liên kết sang thông báo RTDB |
| | (Decode từ push id) | `createdAt` | `number` | Thời gian tạo phòng |
| **Hồ sơ ĐRL** | `'MSSV'` | `studentId` | `string` | Mã số sinh viên |
| | `'Họ và tên'` | `fullName` | `string` | Tên sinh viên |
| | `'Điểm'` / `'Điểm cuối'` | `finalScore` | `number` | Điểm rèn luyện cuối cùng (tối đa 100) |
| | `'Điểm điều kiện'` | `conditionalScore` | `number` | Điểm điều kiện (90, 95, 100) |

---

## 2. Đặc tả Typescript Interfaces

### 2.1 Minh chứng hoạt động (`ActivitySubmission`)
Đường dẫn Firestore: `/users/{semester}/submissions/{submissionId}`

```typescript
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface ActivitySubmission {
  id: string;                      // Firestore Doc ID
  activityId?: string;             // ID của phòng hoạt động (nếu có)
  activityName: string;            // Tên hoạt động (vd: "Tham gia tiếp sức mùa thi")
  bonusPoints: number;             // Điểm cộng (vd: 5)
  fileUrl: string;                 // URL tệp chính
  fileUrls: string[];              // Danh sách tất cả file (ảnh, PDF, DOCX)
  status: SubmissionStatus;        // Trạng thái chuẩn tiếng Anh
  submittedAt: number;             // Timestamp miligiây (Date.now())
  
  // Thông tin sinh viên
  studentId: string;               // VD: "26129001"
  email: string;                   // VD: "26129001@st.hcmuaf.edu.vn"
  fullName: string;                // VD: "Nguyễn Văn A"
  photoUrl?: string;               // URL avatar Google
  className: string;               // "DH26NHE"
  semester: string;                // "HK1N1"
  
  // Thông tin kiểm duyệt (Admin review)
  reviewNote?: string;             // Ghi chú khi từ chối hoặc duyệt
  reviewedAt?: number | null;      // Thời điểm phê duyệt
  reviewedBy?: string | null;      // Email admin duyệt
}
```

### 2.2 Định nghĩa Phòng / Hoạt động (`RoomDefinition`)
Đường dẫn RTDB: `/activities/{semester}/{roomId}`  
Đường dẫn Firestore đồng bộ: `/activities/{roomId}`

```typescript
export interface RoomDefinition {
  id: string;                      // ID phòng (vd: "ACT-1718000000000")
  name: string;                    // Tên phòng hoạt động
  points: number;                  // Số điểm quy định (vd: 5, 10)
  description: string;             // Nội dung thông báo / hướng dẫn nộp
  imageUrl?: string;               // URL ảnh bìa minh họa phòng
  semester: string;                // Học kỳ áp dụng (vd: "HK1N1")
  createdBy: string;               // "Ban Cán Sự" hoặc email admin
  createdAt: number;               // Timestamp tạo
  updatedAt: number;               // Timestamp cập nhật gần nhất
  notificationId?: string | null;  // ID node notifications tương ứng
  isActive?: boolean;              // Cho phép nộp minh chứng hay đã đóng
}
```

### 2.3 Bản tin thông báo (`BroadcastNotification`)
Đường dẫn RTDB: `/notifications/{notificationId}`

```typescript
export interface BroadcastNotification {
  id: string;                      // Notification ID
  activityId?: string;             // Liên kết đến phòng chat (nếu có)
  title: string;                   // Tiêu đề thông báo
  body: string;                    // Nội dung thông báo
  imageUrl?: string;               // Ảnh đính kèm thông báo
  points?: number;                 // Số điểm liên quan
  semester: string;                // Học kỳ
  senderName: string;              // "Ban Cán Sự"
  timestamp: number;               // Thời gian phát hành
}
```

### 2.4 Hồ sơ Điểm Rèn Luyện (`StudentDrlProfile`)
Đường dẫn RTDB: `/drl/{semester}/{studentId}`

```typescript
export interface MetCriteriaItem {
  id: string;                      // "academic_club" | "scientific_research" | "class_officer" | "special_achievement" | "gpa"
  label: string;                   // "Tham gia CLB học thuật", "Nghiên cứu khoa học", ...
  matchedActivityName: string;     // Tên hoạt động thỏa mãn
  points: number;                  // Điểm hoạt động
}

export interface StudentDrlProfile {
  studentId: string;               // MSSV
  email: string;                   // Email sinh viên
  fullName: string;                // Họ và tên
  className: string;               // "DH26NHE"
  semester: string;                // Học kỳ
  totalSubmissions: number;        // Tổng số hoạt động đã nộp
  approvedSubmissions: number;     // Số hoạt động đã duyệt
  totalBonusPoints: number;        // Tổng điểm cộng thô
  conditionalScore: number;        // Điểm điều kiện (90, 95, 100)
  finalScore: number;              // Điểm chốt sổ (Max 100)
  metCriteria: MetCriteriaItem[];  // Danh sách các tiêu chí đạt
  updatedAt: number;
}
```

---

## 3. Lớp chuyển đổi tương thích (Data Adapter Layer)

Để quá trình chuyển đổi giữa core cũ và mới không bị văng lỗi khi gặp dữ liệu lai tạp, hệ thống cung cấp hàm adapter chuẩn hóa `normalizeSubmission()`:

```typescript
// src/utils/adapters.ts
import { ActivitySubmission, SubmissionStatus } from '@/types/submission.types';

export function normalizeSubmission(docId: string, raw: any, semester: string): ActivitySubmission {
  // 1. Chuẩn hóa Status
  let status: SubmissionStatus = 'pending';
  const rawStatus = raw.status || raw.Status || raw['Trạng thái'];
  if (rawStatus === 'Phê duyệt' || rawStatus === 'approved') status = 'approved';
  else if (rawStatus === 'Không phê duyệt' || rawStatus === 'rejected') status = 'rejected';

  // 2. Chuẩn hóa File URLs
  let fileUrls: string[] = [];
  if (Array.isArray(raw.fileUrls)) fileUrls = raw.fileUrls;
  else if (Array.isArray(raw['File uploads'])) fileUrls = raw['File uploads'];
  else if (Array.isArray(raw.FileUrls)) fileUrls = raw.FileUrls;
  else if (raw.fileUrl) fileUrls = [raw.fileUrl];
  else if (raw['File upload']) fileUrls = [raw['File upload']];
  else if (raw['Link minh chứng']) fileUrls = [raw['Link minh chứng']];
  fileUrls = fileUrls.filter(Boolean);

  // 3. Chuẩn hóa Thời gian
  let submittedAt = Date.now();
  const rawTime = raw.submittedAt || raw['Thời gian'] || raw.createdAt || raw.Timestamp;
  if (rawTime) {
    if (typeof rawTime.toMillis === 'function') submittedAt = rawTime.toMillis();
    else if (typeof rawTime.toDate === 'function') submittedAt = rawTime.toDate().getTime();
    else if (typeof rawTime === 'number') submittedAt = rawTime;
    else if (new Date(rawTime).getTime()) submittedAt = new Date(rawTime).getTime();
  }

  // 4. Chuẩn hóa Thông tin sinh viên
  const email = raw.email || raw.Email || '';
  const studentId = raw.studentId || raw.MSSV || (email ? email.split('@')[0] : '');
  const fullName = raw.fullName || raw.Name || raw['Họ và tên'] || raw['Họ tên'] || (studentId || 'Sinh viên');

  return {
    id: docId,
    activityId: raw.activityId || raw.roomId || undefined,
    activityName: raw.activityName || raw['Tên hoạt động'] || 'Hoạt động',
    bonusPoints: Number(raw.bonusPoints ?? raw['Điểm cộng'] ?? raw.points ?? 0),
    fileUrl: fileUrls[0] || '',
    fileUrls,
    status,
    submittedAt,
    studentId,
    email,
    fullName,
    photoUrl: raw.photoUrl || raw.photoURL || '',
    className: raw.className || raw['Lớp'] || 'DH26NHE',
    semester: raw.semester || semester,
    reviewNote: raw.reviewNote || raw['Chi tiết'] || raw['Ghi chú'] || raw.rejectionReason || '',
    reviewedAt: raw.reviewedAt || null,
    reviewedBy: raw.reviewedBy || null,
  };
}
```

---

## 4. Cấu trúc thư mục Firebase Storage

Quy chuẩn đường dẫn lưu trữ file trên Firebase Cloud Storage:

```
storage-bucket/
└── submissions/
    └── {semester}/
        └── {studentId}/
            ├── submission_{timestamp}_0.jpg
            ├── submission_{timestamp}_1.png
            └── submission_{timestamp}_2.pdf
```

- **Quy tắc đặt tên file:** `submission_${Date.now()}_${index}.${ext}` (đã khử ký tự đặc biệt, dấu cách, tiếng Việt).
- **Loại file cho phép (MIME Types):**
  - Ảnh: `image/jpeg`, `image/png`, `image/webp`
  - Tài liệu: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- **Kích thước tối đa:** 10MB/file, tối đa 10 files/lần nộp.

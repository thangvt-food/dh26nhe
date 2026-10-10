# ĐẶC TẢ CORE LOGIC DÙNG CHUNG & CÁC DEPENDENCY TÁCH RÚT
> **Tài liệu:** Trích xuất Core Logic từ các trang khác (Upload, Dashboard, Home)  
> **Dự án:** DH26NHE

---

## 1. Danh mục Core Logic cần Tách rút

Khi triển khai 3 trang cơ bản (**Login**, **Rooms**, **Profile**) cùng trọn gói **Admin**, hệ thống sử dụng các khối logic dùng chung được tách rút từ các phân hệ cũ:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SHARED CORE LOGIC & SERVICES MAP                     │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 1. PIPELINE TẢI LÊN & QUẢN LÝ MINH CHỨNG (Từ UploadPage)           │ │
│ │    • uploadPipeline: Validate, sanitize tên file, batch upload    │ │
│ │    • checkDuplicateSubmission: Kiểm tra nộp trùng trước khi tải   │ │
│ │    • revokeEvidence: Thu hồi minh chứng & dọn file sạch sẽ         │ │
│ │    • uploadLockService: Lắng nghe trạng thái khóa cổng nộp         │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 2. BỘ TÍNH ĐIỂM & ĐỐI SOÁT TIÊU CHÍ ĐRL (Từ Dashboard & utils.js) │ │
│ │    • calculateConditionalScore: Đối soát 5 tiêu chí điều kiện      │ │
│ │    • calculateSimilarity & Levenshtein: Khớp tên hoạt động mềm     │ │
│ │    • calculateFinalScore: Chốt điểm tối đa 100                    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 3. BẢNG XẾP HẠNG & TỔNG HỢP ĐIỂM LỚP (Từ HomePage & hooks)        │ │
│ │    • RankingWidget & useRanking: Xếp hạng top điểm rèn luyện       │ │
│ │    • ScoreSummary: Card tổng kết trực quan chỉ số cá nhân          │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 4. TIỆN ÍCH TRÌNH CHIẾU & GIAO DIỆN TELEGRAM DÙNG CHUNG            │ │
│ │    • TelegramMediaViewer: Lightbox xem ảnh full, zoom, vuốt        │ │
│ │    • TelegramChatPattern: Nền hoa văn chat Telegram nhẹ            │ │
│ │    • localforage cache: Bộ đệm IndexedDB mở trang tức thì         │ │
│ │    • Toast & ConfirmationModal: Hệ thống thông báo và hộp thoại    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Đặc tả Chi tiết: Pipeline Tải lên Minh chứng (`uploadPipeline.ts`)

Được trích xuất và tinh chỉnh từ `src/pages/UploadPage/services/uploadService.js`:

```typescript
// src/services/uploadService.ts
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref as rtdbRef, onValue } from 'firebase/database';
import { db, storage, rtdb } from '@/firebase';
import { clearUserCache } from '@/utils/localforage';
import { ActivitySubmission } from '@/types/submission.types';

export const uploadService = {
  /**
   * 1. Kiểm tra nộp trùng lặp (Phòng ngừa sinh viên spam nhiều lần)
   */
  async checkDuplicate(email: string, semester: string, activityName: string): Promise<boolean> {
    const q = query(
      collection(db, 'users', semester, 'submissions'),
      where('email', '==', email),
      where('activityName', '==', activityName)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  },

  /**
   * 2. Tải lên hàng loạt tệp và ghi dữ liệu Firestore nguyên tử (Atomic)
   */
  async uploadBatch({
    user,
    semester,
    activityId,
    activityName,
    bonusPoints,
    files,
    notes = '',
  }: {
    user: any;
    semester: string;
    activityId?: string;
    activityName: string;
    bonusPoints: number;
    files: File[];
    notes?: string;
  }): Promise<{ id: string; fileUrls: string[] }> {
    if (!files.length) throw new Error('Không có tệp nào được chọn.');

    const timestamp = Date.now();
    const uploadedUrls: string[] = [];
    const studentId = user.email.split('@')[0];

    try {
      // Tải song song từng file lên Storage
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop() || 'dat';
        const safeFileName = `sub_${timestamp}_${i}.${ext}`;
        const filePath = `submissions/${semester}/${studentId}/${safeFileName}`;

        const fileRef = storageRef(storage, filePath);
        const metadata = { contentType: file.type || 'application/octet-stream' };
        await uploadBytes(fileRef, file, metadata);
        const downloadUrl = await getDownloadURL(fileRef);
        uploadedUrls.push(downloadUrl);
      }

      // Tạo tài liệu Firestore với schema chuẩn tiếng Anh
      const newSubmission: Omit<ActivitySubmission, 'id'> = {
        activityId,
        activityName,
        bonusPoints,
        fileUrl: uploadedUrls[0],
        fileUrls: uploadedUrls,
        status: 'pending',
        submittedAt: timestamp,
        studentId,
        email: user.email,
        fullName: user.displayName || studentId,
        photoUrl: user.photoURL || '',
        className: 'DH26NHE',
        semester,
        reviewNote: notes,
        reviewedAt: null,
        reviewedBy: null,
      };

      const docRef = await addDoc(
        collection(db, 'users', semester, 'submissions'),
        newSubmission
      );

      // Xóa cache IndexedDB của sinh viên để cập nhật mới
      await clearUserCache(user.uid, semester);

      return { id: docRef.id, fileUrls: uploadedUrls };
    } catch (error) {
      // DỌN SẠCH FILE NẾU GẶP LỖI (Tránh orphan files trong Storage)
      await Promise.allSettled(
        uploadedUrls.map(url => {
          const orphanRef = storageRef(storage, url);
          return deleteObject(orphanRef);
        })
      );
      throw error;
    }
  },

  /**
   * 3. Thu hồi minh chứng (Xóa vĩnh viễn cả Firestore doc lẫn tệp Storage)
   */
  async revokeSubmission(
    user: any,
    semester: string,
    submissionId: string,
    fileUrls: string[]
  ): Promise<void> {
    if (submissionId) {
      await deleteDoc(doc(db, 'users', semester, 'submissions', submissionId));
    }
    // Xóa toàn bộ file trong Storage
    await Promise.allSettled(
      fileUrls.map(url => {
        try {
          const targetRef = storageRef(storage, url);
          return deleteObject(targetRef);
        } catch {
          return Promise.resolve();
        }
      })
    );
    await clearUserCache(user.uid, semester);
  },

  /**
   * 4. Lắng nghe trạng thái khóa cổng nộp
   */
  subscribeUploadLock(onData: (lockConfig: any) => void) {
    const lockRef = rtdbRef(rtdb, 'system_config/upload_lock');
    return onValue(lockRef, (snapshot) => {
      onData(snapshot.val() || { isLocked: false, whitelist: {} });
    });
  }
};
```

---

## 3. Đặc tả Chi tiết: Bộ tính Điểm Rèn Luyện (`drlCalculator.ts`)

Được trích xuất và tinh chỉnh từ `src/utils.js`:

```typescript
// src/utils/drlCalculator.ts
import { ActivitySubmission } from '@/types/submission.types';

// Thuật toán Levenshtein đo độ tương đồng xâu chuỗi
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

export function calculateSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  if (longer.length === 0) return 1.0;
  return (longer.length - levenshteinDistance(a.toLowerCase(), b.toLowerCase())) / longer.length;
}

export function matchActivityCriteria(activityNames: string[], targetKeyword: string, threshold = 0.75): boolean {
  const targetLower = targetKeyword.toLowerCase();
  return activityNames.some(name => {
    if (!name) return false;
    const nameLower = name.toLowerCase();
    if (nameLower.includes(targetLower)) return true;
    return calculateSimilarity(nameLower, targetLower) >= threshold;
  });
}

export function evaluateStudentDrl(approvedSubmissions: ActivitySubmission[]) {
  const names = approvedSubmissions.map(s => s.activityName);

  const hasClub = matchActivityCriteria(names, "CLB học thuật");
  const hasResearch = matchActivityCriteria(names, "Nghiên cứu khoa học");
  const hasOfficer = matchActivityCriteria(names, "Cán bộ");
  const hasSpecial = matchActivityCriteria(names, "Thành tích đặc biệt");
  const hasGpa = matchActivityCriteria(names, "học tập trung bình") || matchActivityCriteria(names, "GPA");

  const metConditions: string[] = [];
  if (hasClub) metConditions.push("Tham gia CLB học thuật");
  if (hasResearch) metConditions.push("Nghiên cứu khoa học");
  if (hasOfficer) metConditions.push("Cán bộ Lớp / Đoàn / Hội");
  if (hasSpecial) metConditions.push("Thành tích đặc biệt");
  if (hasGpa) metConditions.push("Học tập (GPA ≥ 2.5)");

  const mainCriteriaCount = (hasClub ? 1 : 0) + (hasResearch ? 1 : 0) + (hasOfficer ? 1 : 0);

  let conditionalScore = 90;
  if (mainCriteriaCount >= 2) {
    conditionalScore = 100;
  } else if (mainCriteriaCount >= 1 || hasSpecial) {
    conditionalScore = 95;
  }

  const totalBonusPoints = approvedSubmissions.reduce((sum, s) => sum + (s.bonusPoints || 0), 0);
  const finalScore = Math.min(conditionalScore, 100);

  return {
    finalScore,
    conditionalScore,
    totalBonusPoints,
    approvedCount: approvedSubmissions.length,
    metConditions,
  };
}
```

---

## 4. Đặc tả Chi tiết: Bảng Xếp hạng Học kỳ (`RankingWidget`)

Trích xuất từ `src/pages/RoomPage/components/RankingWidget.jsx`:
- **Nguồn dữ liệu:** Lắng nghe RTDB node `drl/${semester}` hoặc tính toán từ Firestore.
- **Top 3 vinh danh (Podium):** Hiển thị Top 1 (vương miện vàng), Top 2 (bạc), Top 3 (đồng) kèm ảnh đại diện tròn và điểm số.
- **Vị trí của tôi (My Rank):** Ghim cố định ở chân modal để sinh viên biết vị trí xếp hạng của bản thân so với cả lớp.

---

## 5. Đặc tả Chi tiết: Trình xem Ảnh & Media Telegram (`TelegramMediaViewer`)

Trích xuất từ `src/components/shared/TelegramMediaViewer.jsx`:
- **Cơ chế hoạt động:** Portal gắn trực tiếp vào `document.body` để không bị đè bởi navbar hay header.
- **Tính năng cao cấp:**
  - Hỗ trợ vuốt chạm cảm ứng (Touch swipe left/right) trên điện thoại.
  - Phím mũi tên `←` / `→` trên bàn phím để chuyển ảnh tiếp theo/trước đó.
  - Phím `Esc` để đóng trình xem.
  - Thanh cuộn thu nhỏ (Thumbnail carousel) ở đáy màn hình.
  - Nút phóng to / thu nhỏ (Zoom in/out) và nút tải ảnh về máy.

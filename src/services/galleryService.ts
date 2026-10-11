import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { normalizeSubmission } from '@/utils/adapters';
import type { ActivitySubmission } from '@/types/submission.types';

/**
 * Gallery service — hoạt động ĐÃ DUYỆT của 1 sinh viên, dùng cho Phòng trưng bày
 * công khai (không cần đăng nhập).
 *
 * Query bắt buộc có where('status','==','approved') để khớp Firestore rule
 * `resource.data.status == 'approved'` (đọc public chỉ dành cho bài đã duyệt)
 * và composite index (email ASC, status ASC, submittedAt DESC).
 */
export const galleryService = {
  async fetchApproved(email: string, semester: string): Promise<ActivitySubmission[]> {
    try {
      const q = query(
        collection(db, 'users', semester, 'submissions'),
        where('email', '==', email),
        where('status', '==', 'approved'),
        orderBy('submittedAt', 'desc'),
        limit(200),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => normalizeSubmission(d.id, d.data(), semester));
    } catch {
      // Không khớp rule/index → trả rỗng (gallery hiển thị trạng thái trống)
      return [];
    }
  },
};

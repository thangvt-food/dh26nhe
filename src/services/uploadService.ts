import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { ref as rtdbRef, onValue } from 'firebase/database';
import { db, rtdb, APP_CONFIG } from '@/firebase';
import { clearUserCache } from '@/utils/localforage';
import { getFileExtension } from '@/utils/stringUtils';
import { storageService } from './storageService';
import type { ActivitySubmission } from '@/types/submission.types';
import type { ExtendedUser } from '@/types/auth.types';

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
export const MAX_FILES_PER_SUBMISSION = 10;
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export function validateFiles(files: File[]): string | null {
  if (files.length === 0) return 'Không có tệp nào được chọn.';
  if (files.length > MAX_FILES_PER_SUBMISSION)
    return `Tối đa ${MAX_FILES_PER_SUBMISSION} tệp mỗi lần nộp.`;
  for (const f of files) {
    if (f.size > MAX_UPLOAD_SIZE) return `Tệp "${f.name}" vượt quá 10MB.`;
  }
  return null;
}

export const uploadService = {
  async checkDuplicate(email: string, semester: string, activityName: string): Promise<boolean> {
    const q = query(
      collection(db, 'users', semester, 'submissions'),
      where('email', '==', email),
      where('activityName', '==', activityName),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  },

  async uploadBatch(args: {
    user: ExtendedUser;
    semester: string;
    activityId?: string;
    activityName: string;
    bonusPoints: number;
    files: File[];
    notes?: string;
    clientKey?: string;
    /** Báo tiến trình tổng (0 → 1) tính theo bytes trên toàn bộ files. */
    onProgress?: (fraction: number) => void;
  }): Promise<{ id: string; fileUrls: string[] }> {
    const { user, semester, activityId, activityName, bonusPoints, files, notes = '', clientKey, onProgress } = args;
    const validationError = validateFiles(files);
    if (validationError) throw new Error(validationError);
    if (!user.email) throw new Error('Thiếu email người dùng.');

    const timestamp = Date.now();
    const uploadedUrls: string[] = [];
    const studentId = user.email.split('@')[0];

    try {
      // Tải từng file qua storageService (Firebase Storage).
      // filePath giữ định dạng submissions/{semester}/{studentId}/ để trích ngữ cảnh.
      // Tiến trình tổng = bytes đã gửi / tổng bytes toàn bộ files.
      const totals = files.map((f) => f.size || 1);
      const sent = files.map(() => 0);
      const grand = totals.reduce((a, b) => a + b, 0) || 1;
      const report = () => onProgress?.(sent.reduce((a, b) => a + b, 0) / grand);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = getFileExtension(file.name);
        const filePath = `submissions/${semester}/${studentId}/submission_${timestamp}_${i}.${ext}`;
        const downloadUrl = await storageService.uploadFileWithProgress(filePath, file, (s) => {
          sent[i] = s;
          report();
        });
        uploadedUrls.push(downloadUrl);
      }
      report();

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
        className: APP_CONFIG.defaultClassName,
        semester,
        reviewNote: notes,
        reviewedAt: null,
        reviewedBy: null,
        clientKey,
      };

      const docRef = await addDoc(collection(db, 'users', semester, 'submissions'), newSubmission);
      await clearUserCache(user.uid, semester);
      return { id: docRef.id, fileUrls: uploadedUrls };
    } catch (error) {
      // DỌN SẠCH FILE NẾU GẶP LỖI (tránh orphan files trên Storage).
      await storageService.deleteFilesByUrls(uploadedUrls);
      throw error;
    }
  },

  async revokeSubmission(
    user: ExtendedUser,
    semester: string,
    submissionId: string,
    fileUrls: string[],
  ): Promise<void> {
    if (submissionId) {
      await deleteDoc(doc(db, 'users', semester, 'submissions', submissionId));
    }
    // Xóa toàn bộ file minh chứng trong Storage.
    await storageService.deleteFilesByUrls(fileUrls);
    await clearUserCache(user.uid, semester);
  },

  subscribeUploadLock(onData: (lockConfig: { isLocked: boolean; whitelist: Record<string, boolean> }) => void) {
    const lockRef = rtdbRef(rtdb, 'system_config/upload_lock');
    return onValue(lockRef, (snapshot) => {
      onData(snapshot.val() || { isLocked: false, whitelist: {} });
    });
  },
};

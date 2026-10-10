import { collection, getDocs, query, where, limit, startAfter, getCountFromServer, writeBatch, doc } from 'firebase/firestore';
import { ref as rtdbRef, get as rtdbGet, set as rtdbSet } from 'firebase/database';
import { db, rtdb } from '@/firebase';
import { normalizeSubmission } from '@/utils/adapters';
import { storageService } from './storageService';
import { submissionService, roomService } from './submissionService';
import type { ActivitySubmission, RoomDefinition } from '@/types/submission.types';

export interface RoomSubmissionCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export const adminService = {
  async fetchAllActivitiesForStats(semester: string) {
    const snap = await getDocs(collection(db, 'users', semester, 'submissions'));
    return snap.docs.map((d) => normalizeSubmission(d.id, d.data(), semester));
  },

  async fetchStudentActivities(semester: string, email: string) {
    const q = query(collection(db, 'users', semester, 'submissions'), where('email', '==', email));
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeSubmission(d.id, d.data(), semester));
  },

  /** Xoá vĩnh viễn hồ sơ + toàn bộ file Storage (atomic cleanup). */
  async deleteSubmissionWithFiles(semester: string, submissionId: string, fileUrls: string[]) {
    await submissionService.deleteSubmission(semester, submissionId);
    await storageService.deleteFilesByUrls(fileUrls);
  },

  /** Đếm minh chứng của 1 phòng theo tên hoạt động (server-side aggregation). */
  async countRoomSubmissions(semester: string, activityName: string): Promise<RoomSubmissionCounts> {
    const col = collection(db, 'users', semester, 'submissions');
    const count = async (status?: string): Promise<number> => {
      try {
        const clauses = [where('activityName', '==', activityName)];
        if (status) clauses.push(where('status', '==', status));
        const snap = await getCountFromServer(query(col, ...clauses));
        return snap.data().count;
      } catch {
        return 0;
      }
    };
    const [total, pending, approved, rejected] = await Promise.all([
      count(),
      count('pending'),
      count('approved'),
      count('rejected'),
    ]);
    return { total, pending, approved, rejected };
  },

  /**
   * Xoá phòng + TOÀN BỘ minh chứng dẫn từ phòng (docs Firestore + file Storage).
   * Dùng khi admin xoá phòng để không còn hồ sơ mồ côi.
   */
  async deleteRoomWithSubmissions(
    semester: string,
    room: RoomDefinition,
    onProgress?: (message: string) => void,
  ): Promise<{ docs: number; files: number }> {
    const col = collection(db, 'users', semester, 'submissions');

    // 1. Quét toàn bộ submissions của phòng (cursor loop, 400/batch).
    onProgress?.('Đang tải danh sách minh chứng...');
    const all: ActivitySubmission[] = [];
    let cursor: unknown = null;
    for (;;) {
      const q =
        cursor === null
          ? query(col, where('activityName', '==', room.name), limit(400))
          : query(col, where('activityName', '==', room.name), startAfter(cursor), limit(400));
      const snap = await getDocs(q);
      if (snap.empty) break;
      for (const d of snap.docs) all.push(normalizeSubmission(d.id, d.data(), semester));
      onProgress?.(`Đã tải ${all.length} minh chứng...`);
      if (snap.docs.length < 400) break;
      cursor = snap.docs[snap.docs.length - 1];
    }

    // 2. Xoá docs Firestore theo batch (tối đa 400/batch).
    if (all.length > 0) {
      onProgress?.(`Đang xoá ${all.length} hồ sơ minh chứng...`);
      for (let i = 0; i < all.length; i += 400) {
        const batch = writeBatch(db);
        for (const item of all.slice(i, i + 400)) {
          batch.delete(doc(db, 'users', semester, 'submissions', item.id));
        }
        await batch.commit();
      }
    }

    // 3. Xoá toàn bộ file Storage đính kèm.
    const fileUrls = all.flatMap((item) => item.fileUrls).filter(Boolean);
    if (fileUrls.length > 0) {
      onProgress?.(`Đang xoá ${fileUrls.length} tệp đính kèm...`);
      await storageService.deleteFilesByUrls(fileUrls);
    }

    // 4. Xoá node phòng.
    onProgress?.('Đang xoá phòng...');
    await roomService.deleteRoom(semester, room.id);

    return { docs: all.length, files: fileUrls.length };
  },

  async getUploadLock(): Promise<{ isLocked: boolean; whitelist: Record<string, boolean> }> {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, 'system_config/upload_lock'));
      return snap.val() ?? { isLocked: false, whitelist: {} };
    } catch {
      return { isLocked: false, whitelist: {} };
    }
  },

  async setUploadLock(config: { isLocked: boolean; whitelist: Record<string, boolean> }) {
    await rtdbSet(rtdbRef(rtdb, 'system_config/upload_lock'), config);
  },

  sanitizeEmailForWhitelist(email: string): string {
    return email.toLowerCase().replace(/\./g, '_dot_').replace(/@/g, '_at_');
  },
};

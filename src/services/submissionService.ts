import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { ref as rtdbRef, onValue, set as rtdbSet, update as rtdbUpdate, remove as rtdbRemove } from 'firebase/database';
import { db, rtdb } from '@/firebase';
import { normalizeSubmission, normalizeRoom } from '@/utils/adapters';
import type { ActivitySubmission, RoomDefinition, SubmissionStatus } from '@/types/submission.types';

const PAGE_SIZE = 20;

function submissionsCol(semester: string) {
  return collection(db, 'users', semester, 'submissions');
}

/** Truy vấn danh sách nộp bài của 1 sinh viên (có cache IndexedDB ở tầng hook). */
export const submissionService = {
  async fetchUserSubmissions(email: string, semester: string): Promise<ActivitySubmission[]> {
    try {
      const q = query(
        submissionsCol(semester),
        where('email', '==', email),
        orderBy('submittedAt', 'desc'),
        limit(200),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => normalizeSubmission(d.id, d.data(), semester));
    } catch {
      const q = query(submissionsCol(semester), where('email', '==', email), limit(200));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => normalizeSubmission(d.id, d.data(), semester))
        .sort((a, b) => b.submittedAt - a.submittedAt);
    }
  },

  async fetchRoomSubmissions(semester: string, activityName: string): Promise<ActivitySubmission[]> {
    try {
      const q = query(
        submissionsCol(semester),
        where('activityName', '==', activityName),
        orderBy('submittedAt', 'asc'),
        limit(200),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => normalizeSubmission(d.id, d.data(), semester));
    } catch {
      const q = query(submissionsCol(semester), where('activityName', '==', activityName), limit(200));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => normalizeSubmission(d.id, d.data(), semester))
        .sort((a, b) => a.submittedAt - b.submittedAt);
    }
  },

  subscribeRoomSubmissions(
    semester: string,
    activityName: string,
    onData: (items: ActivitySubmission[]) => void,
  ) {
    const q = query(submissionsCol(semester), where('activityName', '==', activityName), limit(200));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => normalizeSubmission(d.id, d.data(), semester))
          .sort((a, b) => a.submittedAt - b.submittedAt);
        onData(items);
      },
      () => onData([]),
    );
  },

  async fetchSubmissionById(semester: string, submissionId: string): Promise<ActivitySubmission | null> {
    const snap = await getDoc(doc(db, 'users', semester, 'submissions', submissionId));
    if (!snap.exists()) return null;
    return normalizeSubmission(snap.id, snap.data(), semester);
  },

  /** Phân trang cursor cho hàng đợi admin. */
  async fetchAdminPage(args: {
    semester: string;
    status?: SubmissionStatus | 'all';
    cursor?: QueryDocumentSnapshot<DocumentData> | null;
    pageSize?: number;
  }): Promise<{ items: ActivitySubmission[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    const { semester, status = 'all', cursor = null, pageSize = PAGE_SIZE } = args;
    const clauses = [];
    if (status !== 'all') clauses.push(where('status', '==', status));
    let q;
    try {
      q = query(
        submissionsCol(semester),
        ...clauses,
        orderBy('submittedAt', 'desc'),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(pageSize),
      );
    } catch {
      q = query(submissionsCol(semester), ...clauses, ...(cursor ? [startAfter(cursor)] : []), limit(pageSize));
    }
    const snap = await getDocs(q);
    return {
      items: snap.docs.map((d) => normalizeSubmission(d.id, d.data(), semester)),
      lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    };
  },

  /** Đếm server-side aggregation, tiết kiệm chi phí đọc. */
  async countByStatus(semester: string): Promise<Record<SubmissionStatus, number>> {
    const result: Record<SubmissionStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    await Promise.all(
      (Object.keys(result) as SubmissionStatus[]).map(async (status) => {
        try {
          const snap = await getCountFromServer(
            query(submissionsCol(semester), where('status', '==', status)),
          );
          result[status] = snap.data().count;
        } catch {
          result[status] = 0;
        }
      }),
    );
    return result;
  },

  async approveSubmission(semester: string, submissionId: string, reviewerEmail: string): Promise<void> {    await updateDoc(doc(db, 'users', semester, 'submissions', submissionId), {
      status: 'approved',
      reviewedAt: Date.now(),
      reviewedBy: reviewerEmail,
    });
  },

  async rejectSubmission(
    semester: string,
    submissionId: string,
    reviewerEmail: string,
    reviewNote: string,
  ): Promise<void> {
    if (!reviewNote.trim()) throw new Error('Vui lòng nhập lý do từ chối.');
    await updateDoc(doc(db, 'users', semester, 'submissions', submissionId), {
      status: 'rejected',
      reviewNote,
      reviewedAt: Date.now(),
      reviewedBy: reviewerEmail,
    });
  },

  async updateSubmissionFields(
    semester: string,
    submissionId: string,
    patch: { activityName?: string; bonusPoints?: number },
  ): Promise<void> {
    await updateDoc(doc(db, 'users', semester, 'submissions', submissionId), patch);
  },

  async bulkUpdateStatus(
    semester: string,
    submissionIds: string[],
    status: SubmissionStatus,
    reviewerEmail: string,
    reviewNote = '',
  ): Promise<void> {
    const batch = writeBatch(db);
    for (const id of submissionIds) {
      batch.update(doc(db, 'users', semester, 'submissions', id), {
        status,
        reviewNote,
        reviewedAt: Date.now(),
        reviewedBy: reviewerEmail,
      });
    }
    await batch.commit();
  },

  async deleteSubmission(semester: string, submissionId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', semester, 'submissions', submissionId));
  },
};

export const roomService = {
  subscribeRooms(semester: string, onData: (rooms: RoomDefinition[]) => void) {
    const roomsRef = rtdbRef(rtdb, `activities/${semester}`);
    return onValue(roomsRef, (snapshot) => {
      const val = snapshot.val() as Record<string, unknown> | null;
      if (!val) {
        onData([]);
        return;
      }
      const rooms = Object.entries(val).map(([id, raw]) =>
        normalizeRoom(id, (raw as Record<string, unknown>) ?? {}, semester),
      );
      rooms.sort((a, b) => b.createdAt - a.createdAt);
      onData(rooms);
    });
  },

  async createRoom(semester: string, input: { name: string; points: number; description: string; imageUrl?: string; createdBy: string }): Promise<string> {
    const roomId = `ACT-${Date.now()}`;
    const now = Date.now();
    // Nhánh duy nhất: activities/{semester}/{roomId} (không mirror notifications/).
    const payload = {
      name: input.name,
      points: input.points,
      description: input.description,
      imageUrl: input.imageUrl ?? '',
      semester,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      notificationId: null,
      isActive: true,
    };
    await rtdbSet(rtdbRef(rtdb, `activities/${semester}/${roomId}`), payload);
    return roomId;
  },

  async updateRoom(semester: string, roomId: string, patch: Partial<RoomDefinition>): Promise<void> {
    await rtdbUpdate(rtdbRef(rtdb, `activities/${semester}/${roomId}`), {
      ...patch,
      updatedAt: Date.now(),
    });
  },

  async deleteRoom(semester: string, roomId: string): Promise<void> {
    await rtdbRemove(rtdbRef(rtdb, `activities/${semester}/${roomId}`));
  },
};

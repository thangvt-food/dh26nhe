import { onValue, ref as rtdbRef, set as rtdbSet } from 'firebase/database';
import { rtdb, DEFAULT_SEMESTERS } from '@/firebase';

/**
 * Semester service — danh sách học kỳ ĐỘNG do admin đặt.
 * Lưu tại RTDB `system_config/semesters` (rule: mọi user đọc, admin ghi).
 * Chưa có config / lỗi mạng → fallback DEFAULT_SEMESTERS.
 */

const NODE = 'system_config/semesters';

function normalize(val: unknown): string[] {
  if (Array.isArray(val)) {
    const list = val.map(String).filter(Boolean);
    return list.length > 0 ? list : [...DEFAULT_SEMESTERS];
  }
  if (val && typeof val === 'object') {
    const list = Object.values(val as Record<string, unknown>).map(String).filter(Boolean);
    return list.length > 0 ? list : [...DEFAULT_SEMESTERS];
  }
  return [...DEFAULT_SEMESTERS];
}

export const semesterService = {
  /** Theo dõi realtime danh sách học kỳ. Trả về hàm unsubscribe. */
  subscribeSemesters(onData: (semesters: string[]) => void): () => void {
    return onValue(
      rtdbRef(rtdb, NODE),
      (snap) => onData(normalize(snap.val())),
      () => onData([...DEFAULT_SEMESTERS]),
    );
  },

  /** Admin ghi danh sách học kỳ (uppercase, bỏ trùng, không cho trống). */
  async setSemesters(list: string[]): Promise<void> {
    const clean = [...new Set(list.map((s) => s.trim().toUpperCase()).filter(Boolean))];
    if (clean.length === 0) throw new Error('Danh sách học kỳ không được để trống.');
    await rtdbSet(rtdbRef(rtdb, NODE), clean);
  },
};

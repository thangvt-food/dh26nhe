import { useState } from 'react';
import { adminService, type RoomSubmissionCounts } from '@/services/adminService';
import type { RoomDefinition } from '@/types/submission.types';

export type DeletePhase = 'idle' | 'confirm' | 'deleting' | 'done';

/** Luồng xoá phòng an toàn: đếm trước → xác nhận → xoá cascade → báo kết quả. */
export function useRoomDeletion() {
  const [target, setTarget] = useState<RoomDefinition | null>(null);
  const [counts, setCounts] = useState<RoomSubmissionCounts | null>(null);
  const [counting, setCounting] = useState(false);
  const [phase, setPhase] = useState<DeletePhase>('idle');
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<{ docs: number; files: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openDelete = async (room: RoomDefinition, semester: string) => {
    setTarget({ ...room, semester });
    setCounts(null);
    setResult(null);
    setError(null);
    setProgress('');
    setPhase('confirm');
    setCounting(true);
    try {
      const c = await adminService.countRoomSubmissions(semester, room.name);
      setCounts(c);
    } catch {
      setCounts({ total: 0, pending: 0, approved: 0, rejected: 0 });
    } finally {
      setCounting(false);
    }
  };

  const confirmDelete = async () => {
    if (!target || phase === 'deleting') return;
    setPhase('deleting');
    setError(null);
    try {
      const r = await adminService.deleteRoomWithSubmissions(target.semester, target, setProgress);
      setResult(r);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xoá phòng thất bại.');
      setPhase('confirm');
    }
  };

  const close = () => {
    setTarget(null);
    setCounts(null);
    setResult(null);
    setError(null);
    setProgress('');
    setPhase('idle');
  };

  return { target, counts, counting, phase, progress, result, error, openDelete, confirmDelete, close };
}

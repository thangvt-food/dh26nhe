import { useEffect, useState } from 'react';
import { submissionService } from '@/services/submissionService';

/** Đếm số lượt nộp / đã duyệt / chờ / từ chối cho 1 phòng (theo activityName). */
export function useSubmissionCount(semester: string, activityName: string | undefined) {
  const [counts, setCounts] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activityName) {
      setCounts({ total: 0, approved: 0, pending: 0, rejected: 0 });
      return;
    }
    setLoading(true);
    let cancelled = false;
    submissionService
      .fetchRoomSubmissions(semester, activityName)
      .then((items) => {
        if (cancelled) return;
        setCounts({
          total: items.length,
          approved: items.filter((i) => i.status === 'approved').length,
          pending: items.filter((i) => i.status === 'pending').length,
          rejected: items.filter((i) => i.status === 'rejected').length,
        });
      })
      .catch(() => {
        if (!cancelled) setCounts({ total: 0, approved: 0, pending: 0, rejected: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [semester, activityName]);

  return { ...counts, loading };
}

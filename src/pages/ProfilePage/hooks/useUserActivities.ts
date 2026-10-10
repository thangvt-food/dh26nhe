import { useCallback, useEffect, useState } from 'react';
import { submissionService } from '@/services/submissionService';
import { getUserActivitiesCache, setUserActivitiesCache } from '@/utils/localforage';
import { evaluateStudentDrl } from '@/utils/drlCalculator';
import type { ActivitySubmission } from '@/types/submission.types';
import type { ExtendedUser } from '@/types/auth.types';

export function useUserActivities(user: ExtendedUser | null, semester: string) {
  const [items, setItems] = useState<ActivitySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserActivities = useCallback(
    async (forceRefresh = false) => {
      if (!user?.email) {
        setItems([]);
        setLoading(false);
        return;
      }
      setError(null);
      if (!forceRefresh) {
        const cached = await getUserActivitiesCache(user.uid, semester);
        if (cached) {
          setItems(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setLoading(true);
      }
      try {
        const fresh = await submissionService.fetchUserSubmissions(user.email, semester);
        setItems(fresh);
        await setUserActivitiesCache(user.uid, semester, fresh);
      } catch (err) {
        if (items.length === 0) {
          setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.uid, user?.email, semester],
  );

  useEffect(() => {
    void fetchUserActivities(false);
  }, [fetchUserActivities]);

  const approved = items.filter((i) => i.status === 'approved');
  const score = evaluateStudentDrl(approved);

  return {
    userData: items,
    loading,
    error,
    totalActivities: items.length,
    totalBonusPoints: score.totalBonusPoints,
    finalScore: score.finalScore,
    conditionalScore: score.conditionalScore,
    metConditions: score.metConditions,
    approvedCount: score.approvedCount,
    fetchUserActivities,
  };
}

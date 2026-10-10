import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { normalizeSubmission } from '@/utils/adapters';
import type { ActivitySubmission, SubmissionStatus } from '@/types/submission.types';

/** Trạng thái nộp của user hiện tại theo từng activityName (cho badge sidebar). */
export function useMySubmissionStatus(email: string | null | undefined, semester: string) {
  const [statuses, setStatuses] = useState<Record<string, { status: SubmissionStatus; points: number }>>({});

  useEffect(() => {
    if (!email) {
      setStatuses({});
      return;
    }
    const q = query(collection(db, 'users', semester, 'submissions'), where('email', '==', email));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map: Record<string, { status: SubmissionStatus; points: number }> = {};
        for (const d of snap.docs) {
          const item: ActivitySubmission = normalizeSubmission(d.id, d.data(), semester);
          map[item.activityName] = { status: item.status, points: item.bonusPoints };
        }
        setStatuses(map);
      },
      () => setStatuses({}),
    );
    return unsub;
  }, [email, semester]);

  return statuses;
}

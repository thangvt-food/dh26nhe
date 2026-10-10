import { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import type { ActivitySubmission } from '@/types/submission.types';

export function useStudentActivities(semester: string, email: string | null, enabled: boolean) {
  const [items, setItems] = useState<ActivitySubmission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !email) {
      setItems([]);
      return;
    }
    setLoading(true);
    adminService
      .fetchStudentActivities(semester, email)
      .then((data) => setItems(data.sort((a, b) => b.submittedAt - a.submittedAt)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [semester, email, enabled]);

  return { items, loading };
}

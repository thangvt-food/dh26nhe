import { useCallback, useEffect, useState } from 'react';
import { submissionService } from '@/services/submissionService';
import type { ActivitySubmission, SubmissionStatus } from '@/types/submission.types';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export function useAdminActivities(semester: string, status: SubmissionStatus | 'all') {
  const [items, setItems] = useState<ActivitySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts] = useState<Record<SubmissionStatus, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    try {
      const [page, c] = await Promise.all([
        submissionService.fetchAdminPage({ semester, status, pageSize: 20 }),
        submissionService.countByStatus(semester),
      ]);
      setItems(page.items);
      setCursor(page.lastDoc);
      setHasMore(page.items.length === 20);
      setCounts(c);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [semester, status]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const page = await submissionService.fetchAdminPage({ semester, status, cursor, pageSize: 20 });
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.lastDoc);
      setHasMore(page.items.length === 20);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, cursor, semester, status]);

  return { items, loading, loadingMore, hasMore, counts, loadMore, refresh: loadFirst, setItems };
}

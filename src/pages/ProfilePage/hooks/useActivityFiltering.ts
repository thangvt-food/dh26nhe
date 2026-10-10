import { useMemo, useState } from 'react';
import type { ActivitySubmission, SubmissionStatus } from '@/types/submission.types';

export type FilterStatus = 'all' | SubmissionStatus;
export type SortMode = 'newest' | 'oldest';

export function useActivityFiltering(userData: ActivitySubmission[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortMode>('newest');

  const filteredUserData = useMemo(() => {
    const k = searchTerm.trim().toLowerCase();
    let out = userData.filter((item) => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (k && !item.activityName.toLowerCase().includes(k)) return false;
      return true;
    });
    out = [...out].sort((a, b) =>
      sortBy === 'newest' ? b.submittedAt - a.submittedAt : a.submittedAt - b.submittedAt,
    );
    return out;
  }, [userData, searchTerm, filterStatus, sortBy]);

  const counts = useMemo(
    () => ({
      all: userData.length,
      approved: userData.filter((i) => i.status === 'approved').length,
      pending: userData.filter((i) => i.status === 'pending').length,
      rejected: userData.filter((i) => i.status === 'rejected').length,
    }),
    [userData],
  );

  return { searchTerm, setSearchTerm, filterStatus, setFilterStatus, sortBy, setSortBy, filteredUserData, counts };
}

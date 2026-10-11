import { useEffect, useMemo, useState } from 'react';
import { galleryService } from '@/services/galleryService';
import type { ActivitySubmission } from '@/types/submission.types';

/**
 * Dữ liệu Phòng trưng bày: gộp hoạt động ĐÃ DUYỆT của 1 sinh viên qua tất cả
 * các học kỳ đang hiển thị, sắp mới nhất → cũ nhất.
 * Phân trang 10 bài/trang bằng cách cắt mảng (dữ liệu đã load sẵn → chuyển
 * trang âm thầm, không chớp layout).
 */
export function useGallery(email: string | null, semesters: string[]) {
  const [all, setAll] = useState<ActivitySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  const semesterKey = semesters.join(',');

  useEffect(() => {
    if (!email) {
      setAll([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setVisibleCount(10);
    (async () => {
      const results = await Promise.all(
        semesterKey
          .split(',')
          .filter(Boolean)
          .map((s) => galleryService.fetchApproved(email, s)),
      );
      if (cancelled) return;
      const approved = results.flat().sort((a, b) => b.submittedAt - a.submittedAt);
      setAll(approved);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [email, semesterKey]);

  const items = useMemo(() => all.slice(0, visibleCount), [all, visibleCount]);

  const loadMore = () => setVisibleCount((c) => Math.min(c + 10, all.length));

  return {
    items,
    total: all.length,
    loading,
    hasMore: visibleCount < all.length,
    loadMore,
  };
}

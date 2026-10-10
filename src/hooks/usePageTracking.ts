import { useEffect } from 'react';

/** Hook theo dõi page view (giữ interface để gắn analytics sau). */
export function usePageTracking(page: string) {
  useEffect(() => {
    document.title = `DH26NHE — ${page}`;
  }, [page ]);
}

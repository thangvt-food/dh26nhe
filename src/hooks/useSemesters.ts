import { useEffect, useState } from 'react';
import { semesterService } from '@/services/semesterService';
import { DEFAULT_SEMESTERS } from '@/firebase';

/** Danh sách học kỳ động (admin đặt trong RTDB), fallback mặc định 4 năm × 3 HK. */
export function useSemesters(): string[] {
  const [semesters, setSemesters] = useState<string[]>([...DEFAULT_SEMESTERS]);
  useEffect(() => semesterService.subscribeSemesters(setSemesters), []);
  return semesters;
}

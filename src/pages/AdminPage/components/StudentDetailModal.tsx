import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useStudentActivities } from '../hooks/useStudentActivities';
import { TelegramMediaViewer } from '@/components/shared/TelegramMediaViewer';
import { formatDateTime } from '@/utils/formatters';
import { isImageFile } from '@/utils/stringUtils';
import { getAvatarGradient, getInitials, cn, studentIdFromEmail } from '@/utils/cn';

interface Props {
  email: string | null;
  semester: string;
  onClose: () => void;
}

export function StudentDetailModal({ email, semester, onClose }: Props) {
  const open = email !== null;
  const { items, loading } = useStudentActivities(semester, email, open);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [keyword, setKeyword] = useState('');
  const [viewer, setViewer] = useState<{ images: string[]; index: number; title: string } | null>(null);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== 'all' && i.status !== filter) return false;
      if (k && !i.activityName.toLowerCase().includes(k)) return false;
      return true;
    });
  }, [items, filter, keyword]);

  const stats = useMemo(
    () => ({
      approved: items.filter((i) => i.status === 'approved').length,
      pending: items.filter((i) => i.status === 'pending').length,
      rejected: items.filter((i) => i.status === 'rejected').length,
      points: items.filter((i) => i.status === 'approved').reduce((n, i) => n + i.bonusPoints, 0),
    }),
    [items],
  );

  const studentName = items[0]?.fullName ?? email ?? '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1800] bg-black/55 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90dvh] rounded-3xl bg-white dark:bg-[#17212b] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className={cn('w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold', getAvatarGradient(email ?? ''))}>
                  {getInitials(studentName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-black dark:text-white truncate">{studentName}</p>
                  <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6] truncate">
                    {email} · MSSV {studentIdFromEmail(email ?? '')} · {semester} · +{stats.points} ĐRL
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="Đóng">
                  <X size={19} />
                </button>
              </div>
              <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar">
                {(['all', 'approved', 'pending', 'rejected'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap',
                      filter === f ? 'bg-[#3390ec] text-white' : 'bg-black/5 dark:bg-white/10 text-[#707579] dark:text-[#9aa0a6]',
                    )}
                  >
                    {f === 'all' ? `Tất cả (${items.length})` : f === 'approved' ? `Đã duyệt (${stats.approved})` : f === 'pending' ? `Chờ duyệt (${stats.pending})` : `Từ chối (${stats.rejected})`}
                  </button>
                ))}
              </div>
              <div className="relative mt-2.5">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707579]" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm hoạt động của sinh viên..."
                  className="w-full rounded-full bg-black/5 dark:bg-white/10 pl-9 pr-3 py-2 text-[13px] outline-none text-black dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {loading ? (
                <p className="text-center text-[13px] text-[#707579] py-10">Đang tải hồ sơ...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[13px] text-[#707579] py-10">Không có minh chứng nào.</p>
              ) : (
                filtered.map((item) => {
                  const images = item.fileUrls.filter((u) => isImageFile(u));
                  return (
                    <div key={item.id} className="rounded-2xl bg-black/[0.03] dark:bg-white/5 p-3.5">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-[13.5px] font-bold text-black dark:text-white flex-1">{item.activityName}</p>
                        <span className="text-[12px] font-extrabold text-[#3390ec]">+{item.bonusPoints}</span>
                      </div>
                      <p className="text-[11.5px] text-[#707579] dark:text-[#9aa0a6] mb-2">{formatDateTime(item.submittedAt)} · {item.status}</p>
                      {images.length > 0 && (
                        <div className="grid grid-cols-4 gap-1.5">
                          {images.slice(0, 4).map((src, i) => (
                            <button key={src + i} onClick={() => setViewer({ images, index: i, title: item.activityName })} className="h-16 rounded-xl overflow-hidden">
                              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      {item.status === 'rejected' && item.reviewNote && (
                        <p className="mt-2 text-[12px] text-[#e53935]">Lý do: {item.reviewNote}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Search, X } from 'lucide-react';
import { drlService, type RankEntry } from '@/services/drlService';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarGradient, getInitials, cn } from '@/utils/cn';

export function RankingWidget({ semester }: { semester: string }) {
  const [open, setOpen] = useState(false);
  const [ranks, setRanks] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('open-ranking', onOpen);
    return () => window.removeEventListener('open-ranking', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    drlService
      .fetchSemesterSubmissions(semester)
      .then((all) => setRanks(drlService.computeRanking(all)))
      .catch(() => setRanks([]))
      .finally(() => setLoading(false));
  }, [open, semester]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return ranks;
    return ranks.filter(
      (r) => r.fullName.toLowerCase().includes(k) || r.email.toLowerCase().includes(k),
    );
  }, [ranks, keyword]);

  const myRank = ranks.find((r) => r.email === currentUser?.email);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1500] bg-black/45"
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[1501] w-full max-w-sm bg-white dark:bg-[#17212b] border-l border-black/10 dark:border-white/10 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Crown size={19} className="text-[#f5a623]" />
                <h2 className="text-[16px] font-bold text-black dark:text-white flex-1">
                  Bảng xếp hạng · {semester}
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Đóng bảng xếp hạng"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707579]" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm sinh viên..."
                  className="w-full rounded-full bg-black/5 dark:bg-white/10 pl-9 pr-3 py-2 text-[13px] outline-none text-black dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {loading ? (
                <p className="text-center text-[13px] text-[#707579] py-10">Đang tính điểm...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[13px] text-[#707579] py-10">Chưa có dữ liệu xếp hạng.</p>
              ) : (
                filtered.slice(0, 50).map((r) => (
                  <div
                    key={r.email}
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-2xl',
                      r.email === currentUser?.email
                        ? 'bg-[#3390ec]/10 dark:bg-[#3390ec]/15'
                        : 'hover:bg-black/5 dark:hover:bg-white/5',
                    )}
                  >
                    <span
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-[12.5px] font-extrabold shrink-0',
                        r.rank === 1 && 'bg-[#f5a623] text-white',
                        r.rank === 2 && 'bg-black/10 dark:bg-white/15 text-black dark:text-white',
                        r.rank === 3 && 'bg-[#b0713a] text-white',
                        r.rank > 3 && 'bg-black/5 dark:bg-white/10 text-[#707579] dark:text-[#9aa0a6]',
                      )}
                    >
                      {r.rank}
                    </span>
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[12px] font-bold shrink-0',
                        getAvatarGradient(r.email),
                      )}
                    >
                      {getInitials(r.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-black dark:text-white truncate">
                        {r.fullName}
                      </p>
                      <p className="text-[11.5px] text-[#707579] dark:text-[#9aa0a6] truncate">
                        {r.activityCount} hoạt động
                      </p>
                    </div>
                    <span className="text-[13.5px] font-extrabold text-[#3390ec]">+{r.score}</span>
                  </div>
                ))
              )}
            </div>

            {myRank && (
              <div className="p-3 border-t border-black/5 dark:border-white/10">
                <div className="rounded-2xl bg-gradient-to-r from-[#3390ec] to-[#4fc3f7] text-white p-3 flex items-center gap-3">
                  <span className="text-[13px] font-bold">Hạng {myRank.rank}</span>
                  <span className="flex-1 text-[13px] font-medium truncate">{myRank.fullName} (bạn)</span>
                  <span className="text-[14px] font-extrabold">+{myRank.score}</span>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function openRanking() {
  window.dispatchEvent(new Event('open-ranking'));
}

import { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Circle, RefreshCw, Search, Trophy } from 'lucide-react';
import { DEFAULT_SEMESTERS } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useSemesters } from '@/hooks/useSemesters';
import { useUserActivities } from '@/pages/ProfilePage/hooks/useUserActivities';
import { ScoreSummary } from '@/pages/ProfilePage/components/ScoreSummary';
import { RankingWidget, openRanking } from '@/pages/RoomPage/components/RankingWidget';
import { FloatingHomeButton } from '@/components/shared/FloatingHomeButton';
import { cn } from '@/utils/cn';

export function DrlView() {
  const { currentUser } = useAuth();
  const semesters = useSemesters();
  const [semester, setSemester] = useState<string>(DEFAULT_SEMESTERS[0]);
  const [keyword, setKeyword] = useState('');
  usePageTracking('drl');

  const {
    userData,
    loading,
    error,
    totalActivities,
    totalBonusPoints,
    finalScore,
    conditionalScore,
    metConditions,
    approvedCount,
    fetchUserActivities,
  } = useUserActivities(currentUser, semester);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return userData;
    return userData.filter((s) => s.activityName.toLowerCase().includes(k));
  }, [userData, keyword]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#e7ebf0] dark:bg-[#0e1621] flex items-center justify-center px-4">
        <p className="text-[13.5px] font-medium text-[#707579] dark:text-[#9aa0a6]">
          Vui lòng đăng nhập để xem điểm rèn luyện.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e7ebf0] dark:bg-[#0e1621] pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
        <div className="flex items-center gap-2">
          <h1 className="text-[18px] font-extrabold text-black dark:text-white flex-1">
            Điểm rèn luyện
          </h1>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="h-9 px-3 text-[12px] font-bold text-[#3390ec] bg-[#3390ec]/10 rounded-xl outline-none cursor-pointer"
            aria-label="Chọn học kỳ"
          >
            {semesters.map((s) => (
              <option key={s} value={s} className="text-black text-[12px]">
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              setRefreshing(true);
              await fetchUserActivities(true);
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 text-[#707579] dark:text-[#9aa0a6] hover:text-[#3390ec]"
            title="Tải lại"
            aria-label="Tải lại dữ liệu"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-[#e53935]/10 text-[#e53935] text-[13px] font-medium">
            {error}
          </div>
        )}

        <ScoreSummary
          finalScore={finalScore}
          conditionalScore={conditionalScore}
          totalBonusPoints={totalBonusPoints}
          approvedCount={approvedCount}
          totalActivities={totalActivities}
          metConditions={metConditions}
          loading={loading}
          semester={semester}
        />

        <button
          onClick={openRanking}
          className="w-full p-4 rounded-3xl bg-gradient-to-r from-[#f5a623]/15 to-[#3390ec]/10 border border-[#f5a623]/25 flex items-center gap-3 text-left active:scale-[0.99] transition"
        >
          <div className="p-2.5 rounded-2xl bg-[#f5a623]/15 text-[#f5a623] shrink-0">
            <Trophy size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[14px] text-black dark:text-white">Bảng xếp hạng lớp</h3>
            <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6]">Xem thứ hạng điểm rèn luyện · {semester}</p>
          </div>
        </button>

        <div className="bg-white dark:bg-[#212121] rounded-3xl border border-black/5 dark:border-white/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-[#3390ec]" />
            <h2 className="text-[15px] font-bold text-black dark:text-white flex-1">
              Minh chứng đã ghi nhận
            </h2>
            <span className="text-[11.5px] font-bold text-[#707579] dark:text-[#9aa0a6]">
              {filtered.length} mục
            </span>
          </div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707579]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm hoạt động..."
              className="h-10 w-full pl-9 pr-3 rounded-xl bg-black/5 dark:bg-white/5 text-[13px] text-black dark:text-white placeholder:text-[#707579]/60 outline-none"
            />
          </div>
          {loading && filtered.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[13px] text-[#707579] dark:text-[#9aa0a6] py-8">
              Chưa có minh chứng nào trong học kỳ này.
            </p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {filtered.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 p-3 rounded-2xl bg-black/[0.02] dark:bg-white/5">
                  {s.status === 'approved' ? (
                    <CheckCircle2 size={17} className="text-[#4fae4e] shrink-0" />
                  ) : s.status === 'pending' ? (
                    <Circle size={17} className="text-[#f5a623] shrink-0" />
                  ) : (
                    <Circle size={17} className="text-[#e53935] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-black dark:text-white truncate">
                      {s.activityName}
                    </p>
                    <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6]">
                      {new Date(s.submittedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <span className={cn('text-[13px] font-extrabold shrink-0', s.status === 'approved' ? 'text-[#4fae4e]' : 'text-[#707579] dark:text-[#9aa0a6]')}>
                    +{s.bonusPoints}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <RankingWidget semester={semester} />
      <FloatingHomeButton />
    </div>
  );
}

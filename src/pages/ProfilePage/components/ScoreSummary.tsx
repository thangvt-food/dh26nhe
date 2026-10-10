import { Award, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  finalScore: number;
  conditionalScore: number;
  totalBonusPoints: number;
  approvedCount: number;
  totalActivities: number;
  metConditions: string[];
  loading: boolean;
  semester: string;
}

const ALL_CRITERIA = [
  'Tham gia CLB học thuật',
  'Nghiên cứu khoa học',
  'Cán bộ Lớp / Đoàn / Hội',
  'Thành tích đặc biệt',
  'Học tập (GPA ≥ 2.5)',
];

export function ScoreSummary({
  finalScore,
  conditionalScore,
  totalBonusPoints,
  approvedCount,
  totalActivities,
  metConditions,
  loading,
  semester,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-3xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 p-5 animate-pulse">
        <div className="h-5 rounded bg-black/10 dark:bg-white/10 w-1/2 mb-3" />
        <div className="h-10 rounded bg-black/10 dark:bg-white/10 w-3/4" />
      </div>
    );
  }
  return (
    <div className="rounded-3xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <Award size={17} className="text-[#f5a623]" />
        <h3 className="text-[14.5px] font-bold text-black dark:text-white">
          Điểm rèn luyện · {semester}
        </h3>
      </div>
      <div className="flex items-end gap-2 my-3">
        <span className="text-[42px] leading-none font-extrabold text-black dark:text-white">
          {finalScore}
        </span>
        <span className="text-[15px] text-[#707579] dark:text-[#9aa0a6] mb-1">/ 100</span>
        <span className="ml-auto text-[12.5px] font-semibold text-[#3390ec]">
          Điều kiện: {conditionalScore}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4 text-center">
        <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-2.5">
          <p className="text-[16px] font-extrabold text-[#3390ec]">+{totalBonusPoints}</p>
          <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6]">Điểm cộng tích luỹ</p>
        </div>
        <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-2.5">
          <p className="text-[16px] font-extrabold text-[#4fae4e]">
            {approvedCount}/{totalActivities}
          </p>
          <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6]">Hoạt động đã duyệt</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {ALL_CRITERIA.map((c) => {
          const met = metConditions.includes(c);
          return (
            <div key={c} className="flex items-center gap-2 text-[13px]">
              {met ? (
                <CheckCircle2 size={16} className="text-[#4fae4e] shrink-0" />
              ) : (
                <Circle size={16} className="text-[#707579]/40 shrink-0" />
              )}
              <span className={cn(met ? 'text-black dark:text-white font-medium' : 'text-[#707579] dark:text-[#9aa0a6]')}>
                {c}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

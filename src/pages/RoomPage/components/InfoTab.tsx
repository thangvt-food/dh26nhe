import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  FileText,
  Bell,
  CalendarDays,
  Pin,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { submissionService } from '@/services/submissionService';
import { useSubmissionCount } from '../hooks/useSubmissionCount';
import { TelegramChatPattern } from '@/components/shared/TelegramChatPattern';
import { RichText } from '@/components/shared/RichText';
import { TelegramMediaViewer } from '@/components/shared/TelegramMediaViewer';
import { getAvatarGradient, getInitials, cn } from '@/utils/cn';
import type { ActivitySubmission, RoomDefinition, SubmissionStatus } from '@/types/submission.types';

interface Props {
  semester: string;
  activity: RoomDefinition;
  onSwitchToChat: () => void;
}

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; badge: string; icon: typeof CheckCircle2; desc: string }
> = {
  approved: {
    label: 'Đã phê duyệt',
    badge: 'bg-[#4fae4e]/10 text-[#4fae4e] border-[#4fae4e]/30',
    icon: CheckCircle2,
    desc: 'Minh chứng đã được Ban Cán Sự kiểm duyệt thành công. Điểm cộng đã được ghi nhận.',
  },
  pending: {
    label: 'Đang chờ duyệt',
    badge: 'bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/30',
    icon: Clock,
    desc: 'Minh chứng đã nộp và đang trong hàng đợi kiểm tra của Ban Cán Sự.',
  },
  rejected: {
    label: 'Từ chối / Cần nộp lại',
    badge: 'bg-[#e53935]/10 text-[#e53935] border-[#e53935]/30',
    icon: XCircle,
    desc: 'Minh chứng chưa đạt yêu cầu hoặc thiếu thông tin. Bạn có thể thu hồi và nộp lại trong tab Minh chứng.',
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

export function InfoTab({ semester, activity, onSwitchToChat }: Props) {
  const { currentUser: user } = useAuth();
  const [submission, setSubmission] = useState<ActivitySubmission | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const { total, approved, pending, rejected } = useSubmissionCount(semester, activity?.name);

  useEffect(() => {
    if (!user?.email || !activity?.name || !semester) {
      setSubmission(null);
      return;
    }
    let cancelled = false;
    setLoadingSubmission(true);
    submissionService
      .fetchUserSubmissions(user.email, semester)
      .then((items) => {
        if (!cancelled) setSubmission(items.find((i) => i.activityName === activity.name) ?? null);
      })
      .catch(() => {
        if (!cancelled) setSubmission(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSubmission(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.email, activity?.name, semester]);

  if (!activity) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#707579] dark:text-[#9aa0a6] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-[#212121] flex items-center justify-center shadow">
          <Bell className="h-8 w-8 opacity-40 text-[#3390ec]" />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-semibold text-black dark:text-white">Chọn một hoạt động</p>
          <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6] mt-1">
            Để xem thông tin và hướng dẫn chi tiết
          </p>
        </div>
      </div>
    );
  }

  const statusInfo = submission ? STATUS_CONFIG[submission.status] : null;
  const StatusIcon = statusInfo?.icon;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  const stats = [
    { label: 'Tổng đã nộp', value: total, bg: 'bg-[#3390ec]/10', text: 'text-[#3390ec] dark:text-[#4fc3f7]', border: 'border-[#3390ec]/20' },
    { label: 'Đã phê duyệt', value: approved, bg: 'bg-[#4fae4e]/10', text: 'text-[#4fae4e]', border: 'border-[#4fae4e]/20' },
    { label: 'Chờ xét duyệt', value: pending, bg: 'bg-[#f5a623]/10', text: 'text-[#f5a623]', border: 'border-[#f5a623]/20' },
    { label: 'Cần bổ sung', value: rejected, bg: 'bg-[#e53935]/10', text: 'text-[#e53935]', border: 'border-[#e53935]/20' },
  ];

  return (
    <div className="relative flex flex-col h-full min-h-0 w-full overflow-hidden">
      <TelegramChatPattern />
      <div className="flex-1 min-h-0 overflow-y-auto z-10">
        <div className="p-3 sm:p-5 max-w-3xl mx-auto space-y-3 sm:space-y-4 pb-20">
          {/* 1. Hero Card */}
          <motion.div
            {...fadeUp}
            className="relative rounded-[22px] bg-white/95 dark:bg-[#212121]/95 backdrop-blur-md p-4 sm:p-5 shadow border border-black/5 dark:border-white/10 overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#3390ec]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-[17px] font-bold shrink-0 shadow-sm select-none',
                    getAvatarGradient(activity.name),
                  )}
                >
                  {getInitials(activity.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-[#3390ec] dark:text-[#4fc3f7] uppercase tracking-wider">
                      Hoạt động rèn luyện
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#3390ec]/10 text-[#3390ec] dark:text-[#4fc3f7] px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      +{activity.points} điểm
                    </span>
                  </div>
                  <h1 className="text-[16px] sm:text-[18px] font-bold text-black dark:text-white leading-snug mt-0.5">
                    {activity.name}
                  </h1>
                  <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6] font-mono mt-0.5">
                    Mã hoạt động: {activity.id}
                  </p>
                </div>
              </div>
              {onSwitchToChat && (
                <button
                  type="button"
                  onClick={onSwitchToChat}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3390ec] hover:bg-[#2883df] active:scale-[0.98] text-white text-[13px] font-semibold shadow transition-all cursor-pointer self-start sm:self-center shrink-0"
                >
                  <span>{submission ? 'Xem minh chứng' : 'Nộp minh chứng'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>

          {/* 2. Personal Status Card */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.05 }}
            className="rounded-[22px] bg-white/95 dark:bg-[#212121]/95 backdrop-blur-md p-4 sm:p-5 shadow border border-black/5 dark:border-white/10"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-black/5 dark:border-white/5 mb-3.5">
              <div className="w-7 h-7 rounded-lg bg-[#3390ec]/10 text-[#3390ec] dark:text-[#4fc3f7] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-[#707579] dark:text-[#9aa0a6] uppercase tracking-wider">
                Trạng thái của bạn
              </span>
            </div>

            {loadingSubmission ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#3390ec]" />
                <span className="text-[12px] text-[#707579] dark:text-[#9aa0a6]">
                  Đang kiểm tra kết quả nộp...
                </span>
              </div>
            ) : submission && statusInfo && StatusIcon ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className={cn('px-3 py-1 rounded-full text-[12.5px] font-semibold border inline-flex items-center gap-1.5', statusInfo.badge)}>
                    <StatusIcon className="w-4 h-4 shrink-0" />
                    <span>{statusInfo.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-[#707579] dark:text-[#9aa0a6]">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>
                      Nộp ngày:{' '}
                      {new Date(submission.submittedAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-[12.5px] text-black/70 dark:text-white/70 leading-relaxed">
                  {statusInfo.desc}
                </p>
                {submission.fileUrls?.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {submission.fileUrls.map((url, i) => (
                      <a
                        key={url + i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#3390ec] dark:text-[#4fc3f7] hover:underline bg-[#3390ec]/10 px-3 py-1.5 rounded-xl border border-[#3390ec]/20 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span>{submission.fileUrls.length > 1 ? `Minh chứng tệp ${i + 1}` : 'Mở xem minh chứng'}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f5a623]/10 text-[#f5a623] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-semibold text-black dark:text-white">
                      Chưa nộp minh chứng
                    </h4>
                    <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6] mt-0.5">
                      Hãy nộp ảnh hoặc tài liệu để nhận +{activity.points} điểm rèn luyện.
                    </p>
                  </div>
                </div>
                {onSwitchToChat && (
                  <button
                    type="button"
                    onClick={onSwitchToChat}
                    className="text-[12.5px] font-semibold text-[#3390ec] dark:text-[#4fc3f7] hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Chuyển sang Chat nộp bài</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* 3. Pinned Announcement */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="rounded-[22px] bg-white/95 dark:bg-[#212121]/95 backdrop-blur-md shadow border border-black/5 dark:border-white/10 overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-3.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#3390ec]/10 text-[#3390ec] dark:text-[#4fc3f7] flex items-center justify-center">
                  <Pin className="w-4 h-4 rotate-45" />
                </div>
                <span className="text-[11px] font-bold text-[#707579] dark:text-[#9aa0a6] uppercase tracking-wider">
                  Thông báo từ Ban Cán Sự
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#707579] dark:text-[#9aa0a6]">
                <CalendarDays className="w-3 h-3" />
                <span>
                  {new Date(activity.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </span>
            </div>
            <div className="p-4 sm:p-5">
              {activity?.description ? (
                <div className="space-y-3">
                  <span className="text-[14px] font-bold text-black dark:text-white">
                    {activity?.name}
                  </span>
                  <RichText text={activity?.description ?? ''} className="text-[13px] text-black/80 dark:text-white/80" />
                  {activity?.imageUrl && (
                    <div className="pt-2">
                      <button onClick={() => setViewerOpen(true)} className="block w-full">
                        <img
                          src={activity?.imageUrl}
                          alt=""
                          className="w-full rounded-2xl border border-black/5 dark:border-white/10 object-cover max-h-80"
                        />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-[12.5px] text-[#707579] dark:text-[#9aa0a6] flex flex-col items-center gap-2">
                  <Bell className="w-6 h-6 opacity-30 text-[#3390ec]" />
                  <p>Chưa có thông báo hoặc hướng dẫn riêng cho hoạt động này.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* 4. Stats & Progress */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.15 }}
            className="rounded-[22px] bg-white/95 dark:bg-[#212121]/95 backdrop-blur-md p-4 sm:p-5 shadow border border-black/5 dark:border-white/10 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#3390ec]/10 text-[#3390ec] dark:text-[#4fc3f7] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-[#707579] dark:text-[#9aa0a6] uppercase tracking-wider">
                  Tiến độ tham gia phòng
                </span>
              </div>
              <span className="text-[12px] font-semibold text-[#3390ec] dark:text-[#4fc3f7]">
                Tỷ lệ duyệt: {approvalRate}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3390ec] to-[#4fae4e] transition-all duration-500"
                style={{ width: `${Math.min(approvalRate, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className={cn('flex flex-col items-center justify-center p-3 rounded-2xl border transition-all select-none', s.bg, s.border)}
                >
                  <span className={cn('text-[22px] font-bold tabular-nums tracking-tight', s.text)}>
                    {s.value}
                  </span>
                  <span className={cn('text-[11px] font-semibold mt-0.5', s.text)}>{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 5. Guidelines */}
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.2 }}
            className="rounded-[22px] bg-white/95 dark:bg-[#212121]/95 backdrop-blur-md p-4 sm:p-5 shadow border border-black/5 dark:border-white/10 space-y-3"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/5">
              <div className="w-7 h-7 rounded-lg bg-[#3390ec]/10 text-[#3390ec] dark:text-[#4fc3f7] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-[#707579] dark:text-[#9aa0a6] uppercase tracking-wider">
                Quy định minh chứng
              </span>
            </div>
            <div className="space-y-2.5 pt-1">
              {[
                { title: 'Định dạng được chấp nhận:', desc: 'Hình ảnh (JPG, PNG, WEBP), Tài liệu (PDF, DOCX).' },
                { title: 'Dung lượng & số lượng:', desc: 'Tối đa 10MB mỗi tệp và tối đa 10 tệp minh chứng cho mỗi đợt nộp.' },
                { title: 'Quy trình kiểm duyệt:', desc: 'Ban Cán Sự Lớp sẽ trực tiếp xem xét minh chứng và xác nhận điểm rèn luyện.' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-[12.5px] text-black/70 dark:text-white/70">
                  <div className="w-5 h-5 rounded-full bg-[#4fae4e]/15 text-[#4fae4e] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="leading-relaxed">
                    <strong className="text-black dark:text-white font-semibold">{item.title}</strong>{' '}
                    <span>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Points summary strip */}
          <div className="rounded-[22px] bg-[#3390ec] text-white p-4 flex items-center gap-3 shadow">
            <Award size={22} className="shrink-0" />
            <p className="text-[13px] leading-relaxed">
              Hoàn thành hoạt động này để nhận <strong>+{activity.points} điểm rèn luyện</strong> sau khi
              được Ban Cán Sự phê duyệt.
            </p>
          </div>
        </div>
      </div>

      {activity?.imageUrl && (
        <TelegramMediaViewer
          isOpen={viewerOpen}
          images={[activity.imageUrl]}
          currentIndex={0}
          title={activity.name}
          onClose={() => setViewerOpen(false)}
          onNavigate={() => undefined}
        />
      )}
    </div>
  );
}

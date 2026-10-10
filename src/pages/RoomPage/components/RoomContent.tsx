import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, MessageSquare, ArrowLeft, Share2, Trophy, MoreVertical, Check } from 'lucide-react';
import { getAvatarGradient, getInitials, cn } from '@/utils/cn';
import { openRanking } from './RankingWidget';
import { useSubmissionCount } from '../hooks/useSubmissionCount';
import { InfoTab } from './InfoTab';
import { ChatTab } from './ChatTab';
import type { RoomDefinition } from '@/types/submission.types';

interface Props {
  semester: string;
  activity: RoomDefinition;
  onBack?: () => void;
  showBack?: boolean;
}

export function RoomContent({ semester, activity, onBack, showBack }: Props) {
  const [activeTab, setActiveTab] = useState<'info' | 'chat'>('info');
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { total: submissionCount } = useSubmissionCount(semester, activity?.name);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleShare = () => {
    const url = `${window.location.origin}/rooms/${semester}/${activity.id}`;
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(done);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      done();
    }
  };

  const handleOpenRanking = () => {
    setMenuOpen(false);
    openRanking();
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#e7ebf0] dark:bg-[#18191c]">
      {/* ── Telegram Floating Rounded MiddleHeader ── */}
      <header className="shrink-0 p-2 sm:p-3 pb-1.5 z-20 select-none">
        <div className="rounded-[1.375rem] sm:rounded-3xl bg-white dark:bg-[#212121] shadow-sm border border-black/5 dark:border-white/10 p-2 sm:p-2.5 flex flex-col gap-2 transition-all">
          {/* Top Row: Back + Avatar + Room Title + 3-Dots Menu Button */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {showBack && onBack && (
              <button
                onClick={onBack}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#707579] dark:text-[#aaaaaa] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all shrink-0 md:hidden"
                aria-label="Quay lại danh sách phòng"
                title="Quay lại"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
              </button>
            )}

            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  'w-[42px] h-[42px] rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[14px] font-bold shrink-0 select-none',
                  getAvatarGradient(activity.name),
                )}
              >
                {getInitials(activity.name)}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-[15.5px] sm:text-[16.5px] font-semibold text-black dark:text-white truncate leading-snug tracking-tight">
                  {activity.name}
                </h2>
                <p className="text-[12px] sm:text-[12.5px] text-[#707579] dark:text-[#aaaaaa] truncate font-normal leading-tight mt-0.5 flex items-center gap-1.5">
                  <span>{submissionCount} người đã nộp</span>
                  <span className="opacity-60">·</span>
                  <span className="text-[#3390ec] dark:text-[#4fc3f7] font-semibold">
                    +{activity.points} điểm
                  </span>
                </p>
              </div>
            </div>

            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all active:scale-95',
                  menuOpen
                    ? 'bg-[#3390ec]/15 text-[#3390ec]'
                    : 'text-[#707579] dark:text-[#aaaaaa] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10',
                )}
                title="Tùy chọn phòng"
                aria-label="Tùy chọn"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4, transition: { duration: 0.1 } }}
                    transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                    className="absolute right-0 top-full mt-1.5 z-50 min-w-[190px] bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 rounded-2xl shadow-xl py-1.5 overflow-hidden origin-top-right"
                  >
                    <button
                      onClick={handleOpenRanking}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Trophy className="w-4 h-4 text-[#f5a623] shrink-0" />
                      <span>Bảng xếp hạng</span>
                    </button>
                    <button
                      onClick={() => {
                        handleShare();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-[#3390ec] shrink-0" />
                      <span>Chia sẻ phòng</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {copied && (
                <span className="absolute -bottom-8 right-0 text-[11px] font-medium text-white bg-[#3390ec] px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1 z-30">
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                  Đã copy!
                </span>
              )}
            </div>
          </div>

          {/* Bottom Row: 1/2 Segmented Pill Tabs */}
          <div className="grid grid-cols-2 p-1 bg-black/5 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/5">
            <button
              onClick={() => setActiveTab('info')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-[12.5px] font-semibold transition-all duration-150',
                activeTab === 'info'
                  ? 'bg-[#3390ec] text-white shadow'
                  : 'text-[#707579] dark:text-[#9aa0a6] hover:text-black dark:hover:text-white',
              )}
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>Thông báo</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-[12.5px] font-semibold transition-all duration-150',
                activeTab === 'chat'
                  ? 'bg-[#3390ec] text-white shadow'
                  : 'text-[#707579] dark:text-[#9aa0a6] hover:text-black dark:hover:text-white',
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Minh chứng</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Tab Stage ── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full">
        {activeTab === 'info' ? (
          <InfoTab semester={semester} activity={activity} onSwitchToChat={() => setActiveTab('chat')} />
        ) : (
          <ChatTab semester={semester} activity={activity} />
        )}
      </div>
    </div>
  );
}

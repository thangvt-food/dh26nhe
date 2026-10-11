import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CalendarDays, ChevronDown, DoorOpen, Pencil, Trash2, BadgeCheck } from 'lucide-react';
import { getAvatarGradient, getInitials, cn } from '@/utils/cn';
import { RichText } from '@/components/shared/RichText';
import type { BroadcastNotification } from '@/types/submission.types';

interface Props {
  item: BroadcastNotification;
  index: number;
  semester: string;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDate(ts: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Thẻ thông báo kiểu channel post. */
export function NotificationCard({ item, index, semester, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const long = item.body.length > 180;

  return (
    <div className="bg-white dark:bg-[#1e1f22] rounded-2xl border border-[#dadce0] dark:border-[#3f4147] p-3.5 md:p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[13px] font-bold shrink-0',
              getAvatarGradient(item.senderName),
            )}
          >
            {getInitials(item.senderName)}
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[13px] font-semibold text-black dark:text-white truncate">
              {item.senderName}
              <BadgeCheck size={14} className="text-[#3390ec] shrink-0" />
              <span className="text-[11px] font-normal text-[#a2acb4]">#{index + 1}</span>
            </p>
            <p className="flex items-center gap-1 text-[11.5px] text-[#707579] dark:text-[#9aa0a6]">
              <CalendarDays size={11} /> {formatDate(item.timestamp)}
            </p>
          </div>
        </div>
        {item.points !== undefined && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e8f3fb] dark:bg-[#3390ec]/15 text-[#3390ec] text-[12px] font-bold shrink-0">
            <Award size={13} /> +{item.points} pts
          </span>
        )}
      </div>

      {item.imageUrl && (
        <div className="h-44 sm:h-60 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
          <img src={item.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="space-y-1.5">
        <h3 className="text-[14px] font-bold text-black dark:text-white">{item.title}</h3>
        <div className={cn('overflow-hidden transition-all', !expanded && long && 'max-h-[4.6em]')}>
          <RichText text={item.body} />
        </div>
        {long && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[12.5px] font-semibold text-[#3390ec]"
          >
            {expanded ? 'Thu gọn' : 'Xem thêm'}
            <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        {item.activityId ? (
          <Link
            to={`/rooms/${semester}/${item.activityId}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3390ec] hover:underline"
          >
            <DoorOpen size={14} /> Mở phòng nộp
          </Link>
        ) : (
          <span className="text-[11.5px] text-[#a2acb4]">Tin thông báo chung</span>
        )}
        <div className="flex gap-1.5 sm:ml-auto">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#3390ec] hover:bg-[#e8f3fb] dark:hover:bg-[#3390ec]/15"
          >
            <Pencil size={13} /> Sửa
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#e53935] hover:bg-[#ffebee] dark:hover:bg-[#e53935]/15"
          >
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { CheckCheck, Clock, XCircle, ChevronDown } from 'lucide-react';
import { TelegramMediaViewer } from '@/components/shared/TelegramMediaViewer';
import { formatDateTime } from '@/utils/formatters';
import { isImageFile } from '@/utils/stringUtils';
import { getAvatarGradient, getInitials, cn } from '@/utils/cn';
import type { ActivitySubmission } from '@/types/submission.types';

function StatusBadge({ status }: { status: ActivitySubmission['status'] }) {
  if (status === 'approved')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4fae4e]/15 text-[#4fae4e] text-[11.5px] font-bold">
        <CheckCheck size={13} /> Đã duyệt
      </span>
    );
  if (status === 'pending')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f5a623]/15 text-[#f5a623] text-[11.5px] font-bold">
        <Clock size={13} /> Chờ duyệt
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e53935]/15 text-[#e53935] text-[11.5px] font-bold">
      <XCircle size={13} /> Từ chối
    </span>
  );
}

export function ActivityPostCard({ item }: { item: ActivitySubmission }) {
  const [expanded, setExpanded] = useState(false);
  const [viewer, setViewer] = useState<{ images: string[]; index: number } | null>(null);
  const images = item.fileUrls.filter((u) => isImageFile(u));
  const longNote = (item.reviewNote ?? '').length > 120;

  return (
    <article className="rounded-3xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 shadow-sm p-4">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className={cn(
            'w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[13px] font-bold shrink-0',
            getAvatarGradient(item.email),
          )}
        >
          {getInitials(item.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-black dark:text-white truncate">
            {item.fullName}
          </p>
          <p className="text-[11.5px] text-[#707579] dark:text-[#9aa0a6]">
            {formatDateTime(item.submittedAt)}
          </p>
        </div>
        <StatusBadge status={item.status} />
        <span className="px-2 py-1 rounded-full bg-[#3390ec]/10 text-[#3390ec] text-[11.5px] font-extrabold">
          +{item.bonusPoints}
        </span>
      </div>

      <h4 className="text-[14.5px] font-bold text-black dark:text-white mb-1">{item.activityName}</h4>

      {item.reviewNote && item.status === 'rejected' && (
        <div className="mb-2 rounded-2xl bg-[#e53935]/10 border border-[#e53935]/20 px-3 py-2">
          <p className={cn('text-[12.5px] text-[#e53935] leading-relaxed', !expanded && longNote && 'line-clamp-3')}>
            Phản hồi của Ban Cán Sự: {item.reviewNote}
          </p>
          {longNote && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#e53935] mt-1"
            >
              {expanded ? 'Thu gọn' : 'Xem thêm'} <ChevronDown size={13} className={cn(expanded && 'rotate-180')} />
            </button>
          )}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
          {images.slice(0, 3).map((src, i) => (
            <button
              key={src + i}
              onClick={() => setViewer({ images, index: i })}
              className="relative h-24"
            >
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
              {i === 2 && images.length > 3 && (
                <span className="absolute inset-0 bg-black/55 text-white font-bold flex items-center justify-center">
                  +{images.length - 3}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {viewer && (
        <TelegramMediaViewer
          isOpen
          images={viewer.images}
          currentIndex={viewer.index}
          title={item.activityName}
          onClose={() => setViewer(null)}
          onNavigate={(index) => setViewer((v) => (v ? { ...v, index } : v))}
        />
      )}
    </article>
  );
}

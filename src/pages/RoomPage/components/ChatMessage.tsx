import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  X,
  ZoomIn,
  Loader2,
  Check,
  CheckCheck,
  Download,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { formatTime } from '@/utils/formatters';
import { isPdfFile, splitMedia } from '@/utils/stringUtils';
import { getAvatarGradient, getInitials, cn } from '@/utils/cn';
import type { ActivitySubmission } from '@/types/submission.types';

interface Props {
  message: ActivitySubmission & { _optimistic?: boolean; _uploadDone?: boolean; notes?: string; progress?: number; fileTypes?: string[] };
  currentUserEmail: string | null | undefined;
  onRecall: (submission: ActivitySubmission) => void;
  isRevoking: boolean;
  hideAvatar?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onOpenViewer: (images: string[], index: number) => void;
}

const STATUS_META: Record<
  ActivitySubmission['status'],
  { badge: string; icon: typeof Clock; label: string }
> = {
  pending: {
    badge: 'bg-[#fff3e0] dark:bg-[#ffa726]/15 text-[#e65100] dark:text-[#ffb74d] border border-[#ffcc80]/40',
    icon: Clock,
    label: 'Đang chờ',
  },
  approved: {
    badge: 'bg-[#e8f5e9] dark:bg-[#66bb6a]/15 text-[#2e7d32] dark:text-[#81c784] border border-[#a5d6a7]/40',
    icon: Check,
    label: 'Đã duyệt',
  },
  rejected: {
    badge: 'bg-[#fce4ec] dark:bg-[#ef5350]/15 text-[#c62828] dark:text-[#ef9a9a] border border-[#ef9a9a]/40',
    icon: AlertCircle,
    label: 'Từ chối',
  },
};

export function ChatMessage({
  message,
  currentUserEmail,
  onRecall,
  isRevoking,
  hideAvatar = false,
  isFirstInGroup = true,
  isLastInGroup = true,
  onOpenViewer,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const isOwn = currentUserEmail != null && message.email === currentUserEmail;
  const timeStr = formatTime(message.submittedAt);
  const msg = message as unknown as { notes?: string; fileTypes?: string[] };
  const caption = msg.notes ?? '';
  const hasCaption = caption.trim().length > 0;
  // Tách ảnh/tài liệu theo MIME đi kèm (đúng cả blob preview) thay vì đoán đuôi URL.
  const { images, docs } = splitMedia(message.fileUrls, msg.fileTypes);
  const meta = STATUS_META[message.status];
  const StatusIcon = meta.icon;
  const canRecall =
    isOwn && message.status !== 'approved' && !(message._optimistic && !message._uploadDone);
  // Tiến trình upload (0 → 1). null = không ở trạng thái đang tải.
  const progress =
    message._optimistic && !message._uploadDone && typeof message.progress === 'number'
      ? Math.min(1, Math.max(0, message.progress))
      : null;
  const progressPct = progress === null ? 0 : Math.round(progress * 100);

  const renderGallery = () => {
    if (!isOwn || images.length === 0) return null;
    const zoomOverlay = (
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center pointer-events-none">
        <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
    const uploadingOverlay = message._optimistic && !message._uploadDone && (
      <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-2 text-white">
        <Loader2 className="h-7 w-7 animate-spin text-white" />
        <span className="text-[11px] font-medium drop-shadow-md">Đang tải lên...</span>
      </div>
    );

    if (images.length === 1) {
      return (
        <div
          onClick={() => onOpenViewer(images, 0)}
          className="relative group cursor-pointer overflow-hidden max-h-[360px] sm:max-h-[380px] w-full flex items-center justify-center bg-black/5 dark:bg-black/30"
        >
          <img
            src={images[0]}
            alt="Minh chứng"
            loading="lazy"
            className="w-full max-h-[360px] sm:max-h-[380px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 flex items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-md rounded-full p-2.5 text-white shadow-lg">
              <ZoomIn className="h-5 w-5" />
            </div>
          </div>
                      {uploadingOverlay && progress === null && uploadingOverlay}
                      {progress !== null && (
                        <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-2 text-white">
                          <div className="relative w-14 h-14">
                            <svg viewBox="0 0 64 64" className="w-14 h-14 -rotate-90">
                              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
                              <circle
                                cx="32"
                                cy="32"
                                r="26"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 26}
                                strokeDashoffset={2 * Math.PI * 26 * (1 - progress)}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold">
                              {progressPct}%
                            </span>
                          </div>
                          <span className="text-[11px] font-medium drop-shadow-md">Đang tải lên...</span>
                        </div>
                      )}
          {!hasCaption && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-md text-white text-[10.5px] font-medium flex items-center gap-1 shadow-sm select-none">
              <span>{timeStr}</span>
              <CheckCheck className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      );
    }

    if (images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-[2px]">
          {images.map((src, i) => (
            <div
              key={src + i}
              onClick={() => onOpenViewer(images, i)}
              className="relative group cursor-pointer overflow-hidden h-[180px] sm:h-[200px] bg-black/5 dark:bg-black/30"
            >
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" draggable={false} />
              {zoomOverlay}
            </div>
          ))}
        </div>
      );
    }

    if (images.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-[2px]">
          <div
            onClick={() => onOpenViewer(images, 0)}
            className="col-span-2 relative group cursor-pointer overflow-hidden h-[190px] bg-black/5 dark:bg-black/30"
          >
            <img src={images[0]} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" draggable={false} />
            {zoomOverlay}
          </div>
          {images.slice(1, 3).map((src, i) => (
            <div
              key={src + i}
              onClick={() => onOpenViewer(images, i + 1)}
              className="col-span-1 relative group cursor-pointer overflow-hidden h-[130px] bg-black/5 dark:bg-black/30"
            >
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" draggable={false} />
              {zoomOverlay}
            </div>
          ))}
        </div>
      );
    }

    if (images.length === 4) {
      return (
        <div className="grid grid-cols-2 gap-[2px]">
          {images.map((src, i) => (
            <div
              key={src + i}
              onClick={() => onOpenViewer(images, i)}
              className="relative group cursor-pointer overflow-hidden h-[140px] sm:h-[150px] bg-black/5 dark:bg-black/30"
            >
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" draggable={false} />
              {zoomOverlay}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-6 gap-[2px]">
        {images.slice(0, 2).map((src, i) => (
          <div
            key={src + i}
            onClick={() => onOpenViewer(images, i)}
            className="col-span-3 relative group cursor-pointer overflow-hidden h-[150px] bg-black/5 dark:bg-black/30"
          >
            <img src={src} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" draggable={false} />
            {zoomOverlay}
          </div>
        ))}
        {images.slice(2, 5).map((src, i) => {
          const actualIdx = i + 2;
          const isLastVisible = actualIdx === 4 && images.length > 5;
          return (
            <div
              key={src + i}
              onClick={() => onOpenViewer(images, actualIdx)}
              className="col-span-2 relative group cursor-pointer overflow-hidden h-[115px] bg-black/5 dark:bg-black/30"
            >
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" draggable={false} />
              {isLastVisible ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-[18px]">
                  +{images.length - 4}
                </div>
              ) : (
                zoomOverlay
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      layout
      className={cn(
        hideAvatar
          ? cn('relative flex items-end w-full py-0.5', isOwn ? 'justify-end' : 'justify-start')
          : cn('relative flex items-end gap-2 px-3 sm:px-4 py-1.5', isOwn && 'flex-row-reverse'),
        isRevoking && 'pointer-events-none',
      )}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.8,
        filter: 'blur(8px)',
        height: 0,
        paddingTop: 0,
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0,
        overflow: 'hidden',
        transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
      }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {!hideAvatar && (
        <motion.div
          animate={{ opacity: isRevoking ? 0 : 1, scale: isRevoking ? 0.6 : 1 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0 mb-0.5"
        >
          {message.photoUrl && !imgError ? (
            <img
              src={message.photoUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover border border-black/5 dark:border-white/10"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className={cn(
                'h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[13px] font-bold select-none border border-black/5 dark:border-white/10',
                getAvatarGradient(message.email || message.fullName),
              )}
            >
              {getInitials(message.fullName || message.email?.split('@')[0] || '?')}
            </div>
          )}
        </motion.div>
      )}

      <div className={cn('relative min-w-[120px]', hideAvatar ? 'max-w-[92%] sm:max-w-[78%]' : 'max-w-[88%] sm:max-w-[72%]')}>
        <motion.div
          animate={{ opacity: isRevoking ? 0 : 1, scale: isRevoking ? 0.8 : 1, filter: isRevoking ? 'blur(10px)' : 'blur(0px)' }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className={cn(
            'relative shadow flex flex-col select-text',
            isOwn
              ? cn('bg-[#3390ec] dark:bg-[#2b5278] text-white rounded-[18px]', isLastInGroup ? 'rounded-br-[4px]' : 'rounded-br-[12px]')
              : cn('bg-white dark:bg-[#212121] border border-black/[0.04] dark:border-white/[0.06] text-[#111827] dark:text-[#f3f4f6] rounded-[18px]', isLastInGroup ? 'rounded-bl-[4px]' : 'rounded-bl-[12px]'),
          )}
        >
          {isLastInGroup &&
            (isOwn ? (
              <svg className="absolute -right-[6px] bottom-0 w-[9px] h-[16px] text-[#3390ec] dark:text-[#2b5278] fill-current pointer-events-none" viewBox="0 0 9 16">
                <path d="M0 0v16h3c3 0 5-2 5-6 0-3-2-6-5-10H0z" />
              </svg>
            ) : (
              <svg className="absolute -left-[6px] bottom-0 w-[9px] h-[16px] text-white dark:text-[#212121] fill-current pointer-events-none" viewBox="0 0 9 16">
                <path d="M9 0v16H6C3 16 1 14 1 10c0-3 2-6 5-10h3z" />
              </svg>
            ))}

          {!isOwn && isFirstInGroup && (
            <div className="px-3 pt-2 pb-0.5 flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-[#3390ec] dark:text-[#4fc3f7] truncate leading-tight">
                {message.fullName}
              </span>
            </div>
          )}

          {!isOwn && (
            <div className="px-3 py-1">
              <p className="text-[13.5px] leading-snug break-words text-[#1f1f1f] dark:text-[#f3f4f6]">
                Đã nộp minh chứng
              </p>
            </div>
          )}

          {isOwn && (
            <>
              {hasCaption && (
                <div className="px-3 pt-2 pb-1">
                  <p className="text-[13.5px] leading-snug break-words whitespace-pre-wrap text-white/95">
                    {caption}
                  </p>
                </div>
              )}

              {images.length > 0 && (
                <>
                  <div className="relative rounded-2xl overflow-hidden my-0.5 bg-black/5 dark:bg-black/20">
                    {renderGallery()}
                  </div>
                  {progress !== null && (
                    <div className="mx-1 mb-1" title={`Đang tải lên ${progressPct}%`}>
                      <div className="h-1 rounded-full bg-white/25 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white transition-[width] duration-150"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {docs.length > 0 && (
                <div className="flex flex-col gap-1.5 my-1 px-1">
                  {docs.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-2xl transition-all group bg-white/15 hover:bg-white/25 text-white"
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-[11px]',
                          isPdfFile(url) ? 'bg-[#e53935]/25 text-[#ff8a80]' : 'bg-white/20 text-white',
                        )}
                      >
                        {isPdfFile(url) ? 'PDF' : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold truncate leading-tight">
                          {isPdfFile(url) ? 'Tài liệu minh chứng.pdf' : 'Tệp minh chứng'}
                        </p>
                        <p className="text-[11px] mt-0.5 text-white/70">Xem tài liệu</p>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-1 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 active:scale-95', meta.badge)}>
                <StatusIcon className="w-3 h-3" />
                <span>{meta.label}</span>
              </span>
              {message.bonusPoints > 0 && (
                <span
                  className={cn(
                    'text-[10.5px] font-bold px-2 py-0.5 rounded-full',
                    isOwn ? 'bg-white/20 text-white' : 'bg-[#3390ec]/10 text-[#3390ec] dark:text-[#4fc3f7]',
                  )}
                >
                  +{message.bonusPoints} điểm
                </span>
              )}
              {message._optimistic && !message._uploadDone && (
                <span className={cn('text-[10.5px] flex items-center gap-1', isOwn ? 'text-white/80' : 'text-[#707579]')}>
                  {progress === null ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Đang tải...</span>
                    </>
                  ) : (
                    <span>Đang tải lên… {progressPct}%</span>
                  )}
                </span>
              )}
              {message._uploadDone && (
                <span className={cn('text-[10.5px] flex items-center gap-1', isOwn ? 'text-white/80' : 'text-[#4fae4e]')}>
                  <Check className="w-3 h-3" />
                  <span>Đã tải lên</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto select-none">
              {canRecall && (
                <button
                  type="button"
                  disabled={isRevoking}
                  onClick={() => onRecall(message)}
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-medium transition-colors rounded-md px-1.5 py-0.5 active:scale-95 disabled:opacity-40',
                    isOwn ? 'text-white/70 hover:text-white hover:bg-white/15' : 'text-[#707579] hover:bg-black/5',
                  )}
                  title="Thu hồi minh chứng này"
                >
                  <X className="h-3 w-3" />
                  <span>Thu hồi</span>
                </button>
              )}
              <span className={cn('text-[11px] font-normal flex items-center gap-1', isOwn ? 'text-white/80' : 'text-[#707579] dark:text-[#9aa0a6]')}>
                <span>{timeStr}</span>
                {isOwn &&
                  (message._uploadDone ? (
                    <CheckCheck className="w-3.5 h-3.5 text-white/90" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-white/75" />
                  ))}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

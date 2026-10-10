import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ExternalLink, Coins, CalendarDays, IdCard } from 'lucide-react';
import { TelegramMediaViewer } from '@/components/shared/TelegramMediaViewer';
import { formatDateTime } from '@/utils/formatters';
import { isImageFile } from '@/utils/stringUtils';
import { getAvatarGradient, getInitials, cn, studentIdFromEmail } from '@/utils/cn';
import type { ActivitySubmission } from '@/types/submission.types';

interface Props {
  item: ActivitySubmission;
  semester: string;
  statusFilter: string;
  selected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: (note: string) => void;
  onDelete: () => void;
  busy: boolean;
}

const STATUS_PILL: Record<ActivitySubmission['status'], string> = {
  approved: 'bg-[#eeffde] dark:bg-[#4fae4e]/15 text-[#3b873e] dark:text-[#81c784]',
  pending: 'bg-[#fff3e0] dark:bg-[#f5a623]/15 text-[#d08a31] dark:text-[#f5a623]',
  rejected: 'bg-[#ffebee] dark:bg-[#e53935]/15 text-[#e53935]',
};

const STATUS_LABEL: Record<ActivitySubmission['status'], string> = {
  approved: 'Đã duyệt',
  pending: 'Chờ duyệt',
  rejected: 'Từ chối',
};

export const QUICK_REJECTION_REASONS = [
  'Ảnh mờ, không nhìn rõ',
  'Thiếu minh chứng',
  'Sai hoạt động',
  'Thiếu thông tin xác nhận',
  'Nộp trùng minh chứng',
];

/** Thẻ feed duyệt bài kiểu Telegram channel post. */
export function ActivityFeedCard({
  item,
  semester,
  statusFilter,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onDelete,
  busy,
}: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState('');
  const [viewer, setViewer] = useState<{ images: string[]; index: number } | null>(null);
  const images = item.fileUrls.filter((u) => isImageFile(u));
  const mssv = item.studentId || studentIdFromEmail(item.email);

  const submitReject = () => {
    if (!note.trim()) return;
    onReject(note.trim());
    setRejectOpen(false);
    setNote('');
  };

  return (
    <article
      className={cn(
        'bg-white dark:bg-[#1e1f22] border rounded-2xl overflow-hidden',
        selected ? 'border-[#3390ec]/50 shadow' : 'border-[#dadce0] dark:border-[#3f4147]',
      )}
    >
      <div className="flex items-start gap-2.5 p-3.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 w-4 h-4 accent-[#3390ec] shrink-0"
          aria-label={`Chọn hồ sơ ${item.fullName}`}
        />
        <div
          className={cn(
            'w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[13px] font-bold shrink-0',
            getAvatarGradient(item.email),
          )}
        >
          {getInitials(item.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-black dark:text-white truncate">{item.fullName}</p>
          <p className="text-[11.5px] text-[#707579] dark:text-[#9aa0a6] truncate">
            {item.email} · {formatDateTime(item.submittedAt)}
          </p>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-[11.5px] font-bold shrink-0', STATUS_PILL[item.status])}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      <div className="px-3.5 pb-3 space-y-2.5">
        <h2 className="text-[14.5px] font-bold text-black dark:text-white leading-snug">{item.activityName}</h2>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e8f3fb] dark:bg-[#3390ec]/15 text-[#3390ec] text-[11px] font-bold">
            <Coins size={11} /> +{item.bonusPoints} ĐRL
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff3e0] dark:bg-[#f5a623]/15 text-[#d08a31] dark:text-[#f5a623] text-[11px] font-semibold">
            <CalendarDays size={11} /> {semester}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#707579] dark:text-[#9aa0a6] text-[11px] font-semibold">
            <IdCard size={11} /> {mssv}
          </span>
        </div>

        {images.length > 0 && (
          <div className="rounded-xl overflow-hidden bg-[#0c1017] p-1.5">
            {images.length === 1 && (
              <button onClick={() => setViewer({ images, index: 0 })} className="block w-full">
                <img src={images[0]} alt="" loading="lazy" className="w-full max-h-[380px] object-contain rounded-lg" />
              </button>
            )}
            {images.length === 2 && (
              <div className="grid grid-cols-2 gap-1.5">
                {images.map((src, i) => (
                  <button key={src + i} onClick={() => setViewer({ images, index: i })}>
                    <img src={src} alt="" loading="lazy" className="w-full h-44 object-cover rounded-lg" />
                  </button>
                ))}
              </div>
            )}
            {images.length >= 3 && (
              <div className="grid grid-cols-3 gap-1.5" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                {images.slice(0, 3).map((src, i) => (
                  <button key={src + i} onClick={() => setViewer({ images, index: i })} className="relative h-32">
                    <img src={src} alt="" loading="lazy" className="w-full h-full object-cover rounded-lg" />
                    {i === 2 && images.length > 3 && (
                      <span className="absolute inset-0 rounded-lg bg-black/60 text-white font-bold flex items-center justify-center">
                        +{images.length - 3}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {item.status === 'rejected' && item.reviewNote && (
          <div className="border-l-2 border-[#e53935] bg-[#ffebee]/60 dark:bg-[#e53935]/10 rounded-r-xl px-3 py-2 text-[12.5px] text-[#c62828] dark:text-[#ef9a9a]">
            Lý do từ chối: {item.reviewNote}
          </div>
        )}

        {rejectOpen && (
          <div className="rounded-xl bg-black/[0.03] dark:bg-white/5 p-3 space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập lý do từ chối (bắt buộc)..."
              rows={2}
              className="w-full rounded-lg bg-white dark:bg-[#1e1f22] border border-black/10 dark:border-white/10 px-2.5 py-2 text-[13px] outline-none text-black dark:text-white resize-y"
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REJECTION_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setNote(r)}
                  className="px-2.5 py-1 rounded-full bg-white dark:bg-[#1e1f22] border border-black/10 dark:border-white/10 text-[11.5px] text-[#707579] dark:text-[#9aa0a6] hover:border-[#e53935] hover:text-[#e53935]"
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectOpen(false)} className="px-3 py-1.5 text-[12px] text-[#707579]">
                Huỷ
              </button>
              <button
                onClick={submitReject}
                disabled={busy || !note.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-[#e53935] text-white text-[12px] font-bold disabled:opacity-50"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#fafbfc] dark:bg-white/5 border-t border-black/5 dark:border-white/5">
        {item.status === 'approved' ? (
          <span className="flex items-center gap-1 px-3.5 h-[35px] rounded-xl bg-[#4fae4e]/15 text-[#4fae4e] text-[12.5px] font-bold">
            <Check size={14} /> Đã duyệt
          </span>
        ) : (
          <button
            onClick={onApprove}
            disabled={busy}
            className="flex items-center gap-1 px-3.5 h-[35px] rounded-xl bg-[#00c73e] hover:opacity-90 text-white text-[12.5px] font-bold disabled:opacity-60"
          >
            <Check size={14} /> Duyệt
          </button>
        )}
        {item.status !== 'rejected' && (
          <button
            onClick={() => setRejectOpen((v) => !v)}
            disabled={busy}
            className="flex items-center gap-1 px-3.5 h-[35px] rounded-xl border border-[#e53935]/40 text-[#e53935] text-[12.5px] font-bold hover:bg-[#ffebee] dark:hover:bg-[#e53935]/10 disabled:opacity-60"
          >
            <X size={14} /> Từ chối
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={busy}
          className="px-3 h-[35px] rounded-xl text-[12.5px] font-semibold text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60"
        >
          Xoá
        </button>
        <div className="flex-1" />
        <Link
          to={`/admin/activity/${item.id}?semester=${semester}&status=${statusFilter}`}
          className="flex items-center gap-1 px-3 h-[35px] rounded-xl text-[12.5px] font-semibold text-[#3390ec] hover:bg-[#e8f3fb] dark:hover:bg-[#3390ec]/15"
        >
          <ExternalLink size={14} /> Soi bài
        </Link>
      </div>

      {viewer && (
        <TelegramMediaViewer
          isOpen
          images={viewer.images}
          currentIndex={viewer.index}
          title={item.activityName}
          onClose={() => setViewer(null)}
          onNavigate={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
        />
      )}
    </article>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCheck, XCircle, Loader2 } from 'lucide-react';
import { submissionService } from '@/services/submissionService';
import { useAuth } from '@/contexts/AuthContext';
import { TelegramMediaViewer } from '@/components/shared/TelegramMediaViewer';
import { toast } from '@/components/shared/Toast';
import { formatDateTime } from '@/utils/formatters';
import { isImageFile } from '@/utils/stringUtils';
import type { ActivitySubmission } from '@/types/submission.types';

export function ActivityDetailPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const [searchParams] = useSearchParams();
  const semester = searchParams.get('semester') ?? 'HK1N1';
  const statusFilter = searchParams.get('status') ?? 'pending';
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [queue, setQueue] = useState<ActivitySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewer, setViewer] = useState<{ images: string[]; index: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    submissionService
      .fetchAdminPage({
        semester,
        status: statusFilter === 'all' ? 'all' : (statusFilter as 'pending' | 'approved' | 'rejected'),
        pageSize: 50,
      })
      .then((page) => {
        setQueue(page.items);
        const current = page.items.find((i) => i.id === submissionId);
        setNote(current?.reviewNote ?? '');
      })
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  }, [semester, statusFilter, submissionId]);

  const index = useMemo(() => queue.findIndex((i) => i.id === submissionId), [queue, submissionId]);
  const current = index >= 0 ? queue[index] : null;

  const goTo = (nextIdx: number) => {
    const target = queue[nextIdx];
    if (!target) return;
    navigate(`/admin/activity/${target.id}?semester=${semester}&status=${statusFilter}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (viewer) return;
      if (e.key === 'ArrowLeft') goTo(index - 1);
      if (e.key === 'ArrowRight') goTo(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, queue, viewer]);

  const handleApprove = async () => {
    if (!current || !currentUser?.email) return;
    setSaving(true);
    try {
      await submissionService.approveSubmission(semester, current.id, currentUser.email);
      toast('Đã phê duyệt. Điểm cộng ghi nhận cho sinh viên, chuyển sang hồ sơ kế tiếp.', 'success');
      goTo(index + 1);
    } catch {
      toast('Phê duyệt thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!current || !currentUser?.email) return;
    if (!note.trim()) {
      toast('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    setSaving(true);
    try {
      await submissionService.rejectSubmission(semester, current.id, currentUser.email, note.trim());
      toast('Đã từ chối kèm lý do. Sinh viên thấy lý do để nộp lại cho đúng.', 'success');
      goTo(index + 1);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Từ chối thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e7ebf0] dark:bg-[#0e1621]">
        <Loader2 className="animate-spin text-[#3390ec]" size={30} />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#e7ebf0] dark:bg-[#0e1621] p-6 text-center">
        <p className="font-semibold text-black dark:text-white">Không tìm thấy hồ sơ</p>
        <button onClick={() => navigate('/admin/activity-management')} className="px-4 py-2 rounded-xl bg-[#3390ec] text-white text-[13.5px] font-semibold">
          Về hàng đợi
        </button>
      </div>
    );
  }

  const images = current.fileUrls.filter((u) => isImageFile(u));
  const docs = current.fileUrls.filter((u) => !isImageFile(u));

  return (
    <div className="min-h-screen bg-[#e7ebf0] dark:bg-[#0e1621]">
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 dark:bg-[#17212b]/85 border-b border-black/5 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
          <button onClick={() => navigate('/admin/activity-management')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="Quay lại">
            <ArrowLeft size={19} />
          </button>
          <span className="text-[13.5px] font-semibold text-black dark:text-white">
            Hồ sơ {index + 1} / {queue.length}
          </span>
          <div className="flex-1" />
          <button onClick={() => goTo(index - 1)} disabled={index <= 0} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40" aria-label="Hồ sơ trước">
            <ChevronLeft size={19} />
          </button>
          <button onClick={() => goTo(index + 1)} disabled={index >= queue.length - 1} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40" aria-label="Hồ sơ tiếp">
            <ChevronRight size={19} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 grid md:grid-cols-[380px_1fr] gap-4 pb-10">
        <div className="space-y-3">
          <div className="rounded-3xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 p-5">
            <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6] mb-1">Sinh viên</p>
            <p className="text-[16px] font-bold text-black dark:text-white">{current.fullName}</p>
            <p className="text-[13px] text-[#707579] dark:text-[#9aa0a6]">{current.email}</p>
            <p className="text-[13px] text-[#707579] dark:text-[#9aa0a6]">MSSV: {current.studentId}</p>
            <p className="text-[13px] text-[#707579] dark:text-[#9aa0a6]">Nộp lúc: {formatDateTime(current.submittedAt)}</p>
            <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10">
              <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6] mb-1">Hoạt động</p>
              <p className="text-[14.5px] font-bold text-black dark:text-white">{current.activityName}</p>
              <span className="inline-block mt-1 px-2.5 py-1 rounded-full bg-[#3390ec]/10 text-[#3390ec] text-[12px] font-extrabold">
                +{current.bonusPoints} ĐRL
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 p-5">
            <label className="text-[13px] font-semibold text-black dark:text-white">
              Phản hồi / Lý do từ chối
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder='vd: "Ảnh mờ không rõ mặt"...'
                className="mt-2 w-full rounded-xl bg-black/5 dark:bg-white/10 px-3 py-2.5 text-[13.5px] outline-none text-black dark:text-white resize-y"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={handleApprove} disabled={saving} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#4fae4e] hover:opacity-90 text-white text-[13.5px] font-bold disabled:opacity-60">
                <CheckCheck size={16} /> Phê duyệt
              </button>
              <button onClick={handleReject} disabled={saving} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#e53935] hover:opacity-90 text-white text-[13.5px] font-bold disabled:opacity-60">
                <XCircle size={16} /> Từ chối
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 p-4">
          <h3 className="text-[14px] font-bold text-black dark:text-white mb-3">
            Minh chứng ({current.fileUrls.length} tệp)
          </h3>
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              {images.map((src, i) => (
                <button key={src + i} onClick={() => setViewer({ images, index: i })}>
                  <img src={src} alt="" loading="lazy" className="rounded-2xl w-full max-h-[420px] object-contain bg-black/5 dark:bg-white/5" />
                </button>
              ))}
            </div>
          )}
          {docs.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="block mb-2 rounded-2xl bg-black/5 dark:bg-white/10 p-3 text-[13px] text-[#3390ec] font-semibold hover:underline">
              Xem tài liệu đính kèm
            </a>
          ))}
          {current.fileUrls.length === 0 && (
            <p className="text-[13px] text-[#707579]">Hồ sơ không có tệp đính kèm.</p>
          )}
        </div>
      </div>

      {viewer && (
        <TelegramMediaViewer
          isOpen
          images={viewer.images}
          currentIndex={viewer.index}
          title={current.activityName}
          onClose={() => setViewer(null)}
          onNavigate={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
        />
      )}
    </div>
  );
}

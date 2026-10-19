import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ImagePlus } from 'lucide-react';
import { submissionService } from '@/services/submissionService';
import { uploadService } from '@/services/uploadService';
import { apiService } from '@/services/apiService';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from './ChatMessage';
import { ChatUploadForm } from './ChatUploadForm';
import { mergeChatItems, type ChatItem } from './chatMerge';
import { TelegramChatPattern } from '@/components/shared/TelegramChatPattern';
import { TelegramMediaViewer } from '@/components/shared/TelegramMediaViewer';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { toast } from '@/components/shared/Toast';
import { formatDateLabel } from '@/utils/formatters';
import type { RoomDefinition } from '@/types/submission.types';

interface Props {
  semester: string;
  activity: RoomDefinition;
}

function dateKeyOf(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function ChatTab({ semester, activity }: Props) {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Số upload đang chạy song song (hàng đợi kiểu Messenger/Telegram).
  const [activeUploads, setActiveUploads] = useState(0);
  const uploading = activeUploads > 0;
  const [uploadLocked, setUploadLocked] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ChatItem | null>(null);
  const [viewer, setViewer] = useState<{ images: string[]; index: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // tempId đã bị user thu hồi khi upload còn chạy → upload xong phải dọn doc vừa tạo.
  const cancelledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    const unsub = submissionService.subscribeRoomSubmissions(semester, activity.name, (data) => {
      // Gộp bằng helper dùng chung (giữ blob preview, khử trùng lặp).
      setItems((prev) => mergeChatItems(prev, data));
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    });
    return unsub;
  }, [semester, activity.name]);

  useEffect(() => {
    const unsub = uploadService.subscribeUploadLock((lock) => {
      const email = currentUser?.email ?? '';
      const whitelisted = email ? Boolean(lock.whitelist[email]) : false;
      setUploadLocked(lock.isLocked && !whitelisted && !currentUser?.isAdmin);
    });
    return unsub;
  }, [currentUser?.email, currentUser?.isAdmin]);

  const handleBatchUpload = async ({
    files,
    previewUrls,
    fileTypes,
    description,
  }: {
    files: File[];
    previewUrls: string[];
    fileTypes: string[];
    description: string;
  }) => {
    if (!currentUser?.email) return;
    const duplicate = await uploadService
      .checkDuplicate(currentUser.email, semester, activity.name)
      .catch(() => false);
      if (duplicate) {
        toast('Bạn đã nộp minh chứng cho hoạt động này rồi. Mở lại tin của bạn để xem hoặc thu hồi khi còn chờ duyệt.', 'error');
        return;
      }
      const tempId = `optimistic-${Date.now()}`;
      const optimistic: ChatItem = {
        id: tempId,
        clientKey: tempId,
      activityId: activity.id,
      activityName: activity.name,
      bonusPoints: activity.points,
      fileUrl: previewUrls[0] ?? '',
      fileUrls: previewUrls,
      fileTypes,
      status: 'pending',
      submittedAt: Date.now(),
      studentId: currentUser.email.split('@')[0],
      email: currentUser.email,
      fullName: currentUser.displayName ?? 'Bạn',
      photoUrl: currentUser.photoURL ?? '',
      className: 'DH26NHE',
      semester,
      notes: description,
      _optimistic: true,
      _uploadDone: false,
      progress: 0,
    };
    setItems((prev) => [...prev, optimistic]);
    setActiveUploads((n) => n + 1);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    try {
      const result = await uploadService.uploadBatch({
        user: currentUser,
        semester,
        activityId: activity.id,
        activityName: activity.name,
        bonusPoints: activity.points,
        files,
        notes: description,
        clientKey: tempId,
        onProgress: (fraction) => {
          setItems((prev) => prev.map((p) => (p.id === tempId ? { ...p, progress: fraction } : p)));
        },
      });
        // User đã thu hồi khi upload còn chạy → dọn ngay doc vừa tạo, tránh mồ côi.
        if (cancelledRef.current.has(tempId)) {
          cancelledRef.current.delete(tempId);
          await uploadService.revokeSubmission(currentUser, semester, result.id, result.fileUrls);
          return;
        }
        // Đánh dấu tải xong nhưng GIỮ NGUYÊN blob preview (không swap sang URL
        // Firebase để khỏi tải lại ảnh). Merge sẽ nâng cấp status/id khi có bản thật.
        setItems((prev) =>
          prev.map((p) =>
            p.id === tempId ? { ...p, _uploadDone: true, realId: result.id } : p,
          ),
        );
        toast('Đã nộp minh chứng — đang chờ Ban Cán Sự duyệt. Bạn vẫn thu hồi được khi bài còn ở trạng thái chờ.', 'success');
      // Gửi email xác nhận qua Worker (fire-and-forget, không chặn UI).
      void apiService.notifyUpload({
        email: currentUser.email,
        subject: `[DH26NHE] Xác nhận nộp minh chứng: ${activity.name}`,
        body: `Chào ${currentUser.displayName || 'bạn'},\n\nHệ thống xác nhận bạn đã nộp minh chứng cho hoạt động "${activity.name}".\n\nTrân trọng,\nBan Cán Sự.`,
        fileUrl: result.fileUrls[0] ?? '',
        fileName: `minh_chung_${activity.name}`,
        userName: currentUser.displayName || currentUser.email.split('@')[0],
      });
      // Báo Discord có minh chứng mới (fire-and-forget, không chặn UI).
      void apiService.notifySubmission({
        activityName: activity.name,
        userName: currentUser.displayName || currentUser.email.split('@')[0],
        email: currentUser.email,
        semester,
        fileName: files.map((f) => f.name).join(', '),
        fileUrl: result.fileUrls[0] ?? '',
        note: description,
      });
    } catch (err) {
      setItems((prev) => prev.filter((p) => p.id !== tempId));
      toast(err instanceof Error ? err.message : 'Tải lên thất bại.', 'error');
    } finally {
      setActiveUploads((n) => Math.max(0, n - 1));
    }
  };

  const groups = useMemo(() => {
    const out: { dateLabel: string; key: string; messages: ChatItem[] }[] = [];
    let current: { dateLabel: string; key: string; messages: ChatItem[] } | null = null;
    for (const m of items) {
      const key = dateKeyOf(m.submittedAt);
      if (!current || current.key !== key) {
        current = { dateLabel: formatDateLabel(m.submittedAt), key, messages: [] };
        out.push(current);
      }
      current.messages.push(m);
    }
    return out;
  }, [items]);

  const confirmRecall = async () => {
    if (!confirmTarget || !currentUser) return;
    const target = confirmTarget as ChatItem;
    setConfirmTarget(null);
    // Thu hồi khi upload còn chạy: chỉ gỡ bubble + đánh dấu huỷ, upload xong tự dọn doc.
    if (target._optimistic && !target._uploadDone && !target.realId) {
      cancelledRef.current.add(target.id);
      setItems((prev) => prev.filter((p) => p.id !== target.id));
      toast('Đã thu hồi minh chứng đang tải lên.', 'success');
      return;
    }
    const docId = target.realId ?? target.id;
    setRevokingId(target.id);
    await new Promise((r) => setTimeout(r, 650));
    try {
      await uploadService.revokeSubmission(currentUser, semester, docId, target.fileUrls);
      setItems((prev) => prev.filter((p) => p.id !== target.id));
      toast(
        `Đã thu hồi minh chứng và xoá sạch ${target.fileUrls.length} tệp đính kèm khỏi kho. Bạn có thể nộp lại bản khác.`,
        'success',
      );
    } catch {
      toast('Thu hồi thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full">
      <div className="flex flex-col h-full min-h-0 w-full overflow-hidden bg-[#e7ebf0] dark:bg-[#18191c] relative flex-1">
        <TelegramChatPattern />
        <div
          className="absolute inset-0 overflow-y-auto overflow-x-hidden px-2 sm:px-4 z-10 pb-[3.875rem] sm:pb-[4.125rem]"
          style={{
            maskImage:
              'linear-gradient(to bottom, #000 0%, #000 calc(100% - 3.5rem), rgba(0,0,0,0.914) calc(100% - 2.8rem), rgba(0,0,0,0.666) calc(100% - 2.1rem), rgba(0,0,0,0.334) calc(100% - 1.4rem), rgba(0,0,0,0.086) calc(100% - 0.7rem), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, #000 0%, #000 calc(100% - 3.5rem), rgba(0,0,0,0.914) calc(100% - 2.8rem), rgba(0,0,0,0.666) calc(100% - 2.1rem), rgba(0,0,0,0.334) calc(100% - 1.4rem), rgba(0,0,0,0.086) calc(100% - 0.7rem), transparent 100%)',
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-full bg-white/80 dark:bg-white/10 flex items-center justify-center shadow-sm">
                <Loader2 size={20} className="animate-spin text-[#3390ec]" />
              </div>
              <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6]">Đang tải...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[260px] h-full text-[#707579] dark:text-[#9aa0a6] gap-3 p-6">
              <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-white/10 shadow-sm flex items-center justify-center">
                <ImagePlus size={24} className="text-[#3390ec] opacity-80" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-black dark:text-white">Chưa có minh chứng</p>
                <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6] mt-0.5">Hãy là người đầu tiên tải lên!</p>
              </div>
            </div>
          ) : (
            <div className="py-2.5 space-y-2">
              {groups.map((g) => (
                <div key={g.key}>
                  <div className="flex justify-center py-2.5 sticky top-2 z-20 pointer-events-none">
                    <span className="text-[11px] font-semibold text-white bg-black/35 dark:bg-white/15 backdrop-blur-md px-3 py-0.5 rounded-full shadow">
                      {g.dateLabel}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {g.messages.map((m, idx) => {
                      const prev = g.messages[idx - 1];
                      const next = g.messages[idx + 1];
                      const grouped = Boolean(prev && prev.email === m.email);
                      const isFirstInGroup = !grouped;
                      const isLastInGroup = !next || next.email !== m.email;
                      return (
                        <div key={m.id} className={revokingId === m.id ? 'animate-poof' : ''}>
                          <ChatMessage
                            message={m}
                            currentUserEmail={currentUser?.email}
                            onRecall={setConfirmTarget}
                            isRevoking={revokingId === m.id}
                            hideAvatar={grouped}
                            isFirstInGroup={isFirstInGroup}
                            isLastInGroup={isLastInGroup}
                            onOpenViewer={(images, index) => setViewer({ images, index })}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatUploadForm
        onUpload={handleBatchUpload}
        uploading={uploading}
        disabled={uploadLocked || activity.isActive === false}
        disabledReason={
          activity.isActive === false
            ? 'Phòng đã đóng — không thể nộp thêm.'
            : 'Cổng nộp bài đang tạm khoá.'
        }
      />

      {viewer && (
        <TelegramMediaViewer
          isOpen
          images={viewer.images}
          currentIndex={viewer.index}
          title={activity.name}
          onClose={() => setViewer(null)}
          onNavigate={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
        />
      )}

      <ConfirmationModal
        isOpen={confirmTarget !== null}
        title="Thu hồi minh chứng?"
        message="Minh chứng sẽ bị xoá vĩnh viễn khỏi hệ thống cùng toàn bộ tệp đính kèm. Bạn có chắc chắn?"
        confirmLabel="Thu hồi"
        danger
        onConfirm={confirmRecall}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}

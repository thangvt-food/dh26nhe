import { useMemo, useRef, useState } from 'react';
import { Hourglass, Check, X, Table2, Layers, Search, Loader2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminActivities } from '../hooks/useAdminActivities';
import { submissionService } from '@/services/submissionService';
import { adminService } from '@/services/adminService';
import { ActivityFeedCard, QUICK_REJECTION_REASONS } from './ActivityFeedCard';
import { ActivityTable } from './ActivityTable';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { toast } from '@/components/shared/Toast';
import { cn } from '@/utils/cn';
import type { SubmissionStatus } from '@/types/submission.types';

const TABS: { id: SubmissionStatus; label: string; icon: typeof Check }[] = [
  { id: 'pending', label: 'Chờ duyệt', icon: Hourglass },
  { id: 'approved', label: 'Đã duyệt', icon: Check },
  { id: 'rejected', label: 'Từ chối', icon: X },
];

/** Hàng đợi duyệt minh chứng: toolbar sticky + Feed/Table + bulk actions. */
export function ActivityManagementTab() {
  const { semester } = useAdmin();
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<SubmissionStatus>('pending');
  const [viewMode, setViewMode] = useState<'feed' | 'table'>(() =>
    localStorage.getItem('admin_activity_view_mode') === 'table' ? 'table' : 'feed',
  );
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const originals = useRef<Map<string, { activityName: string; bonusPoints: number }>>(new Map());
  const [rejectIds, setRejectIds] = useState<string[] | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const { items, loading, loadingMore, hasMore, counts, loadMore, setItems } =
    useAdminActivities(semester, status);

  const keyword = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!keyword) return items;
    return items.filter(
      (i) =>
        i.fullName.toLowerCase().includes(keyword) ||
        i.email.toLowerCase().includes(keyword) ||
        i.studentId.toLowerCase().includes(keyword) ||
        i.activityName.toLowerCase().includes(keyword),
    );
  }, [items, keyword]);

  const reviewer = currentUser?.email ?? '';

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const doApprove = async (ids: string[]) => {
    if (!reviewer || ids.length === 0) return;
    setBusy(true);
    try {
      await submissionService.bulkUpdateStatus(semester, ids, 'approved', reviewer);
      setItems((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, status: 'approved' as const } : p)));
      setSelected(new Set());
      toast(`Đã duyệt ${ids.length} hồ sơ. Điểm cộng được ghi nhận cho sinh viên ngay.`, 'success');
    } catch {
      toast('Duyệt thất bại.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!rejectIds || !reviewer) return;
    if (!rejectNote.trim()) {
      toast('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }
    setBusy(true);
    try {
      await submissionService.bulkUpdateStatus(semester, rejectIds, 'rejected', reviewer, rejectNote.trim());
      setItems((prev) =>
        prev.map((p) =>
          rejectIds.includes(p.id) ? { ...p, status: 'rejected' as const, reviewNote: rejectNote.trim() } : p,
        ),
      );
      setSelected(new Set());
      setRejectIds(null);
      setRejectNote('');
      toast('Đã từ chối kèm lý do. Sinh viên thấy lý do để nộp lại cho đúng.', 'success');
    } catch {
      toast('Từ chối thất bại.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!deleteIds) return;
    setBusy(true);
    try {
      await Promise.all(
        deleteIds.map(async (id) => {
          const item = items.find((i) => i.id === id);
          await adminService.deleteSubmissionWithFiles(semester, id, item?.fileUrls ?? []);
        }),
      );
      setItems((prev) => prev.filter((p) => !deleteIds.includes(p.id)));
      setSelected(new Set());
      setDeleteIds(null);
      toast('Đã xoá hồ sơ cùng toàn bộ tệp Storage đính kèm. Không thể hoàn tác.', 'success');
    } catch {
      toast('Xoá thất bại.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleFieldChange = (id: string, field: 'activityName' | 'bonusPoints', value: string | number) => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (!originals.current.has(id)) {
          originals.current.set(id, { activityName: p.activityName, bonusPoints: p.bonusPoints });
        }
        return { ...p, [field]: value };
      }),
    );
    setDirtyIds((prev) => new Set(prev).add(id));
  };

  const handleSaveRow = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setBusy(true);
    try {
      await submissionService.updateSubmissionFields(semester, id, {
        activityName: item.activityName,
        bonusPoints: item.bonusPoints,
      });
      originals.current.delete(id);
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast('Đã lưu sửa đổi tên/điểm. Áp dụng ngay cho hồ sơ này.', 'success');
    } catch {
      toast('Lưu thất bại.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelRow = (id: string) => {
    const orig = originals.current.get(id);
    if (orig) {
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...orig } : p)));
      originals.current.delete(id);
    }
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      {/* ── Sticky toolbar ── */}
      <div className="sticky top-[57px] md:top-[61px] z-30 bg-[#f4f4f5]/95 dark:bg-[#2b2d31]/95 backdrop-blur-md border-b border-[#dadce0] dark:border-[#3f4147] -mx-4 md:-mx-6 px-4 md:px-6 py-2">
        <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-3 bg-black/5 dark:bg-white/5 rounded-2xl p-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setStatus(id);
                  setSelected(new Set());
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12.5px] font-bold transition-colors',
                  status === id ? 'bg-[#3390ec] text-white shadow' : 'text-[#707579] dark:text-[#9aa0a6]',
                )}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10.5px] font-extrabold',
                    status === id ? 'bg-white/25 text-white' : 'bg-black/5 dark:bg-white/10 text-[#707579]',
                  )}
                >
                  {counts[id]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a2acb4] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên, MSSV, email, hoạt động..."
                className="w-full h-9 pl-9 pr-8 rounded-full bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] text-[12.5px] outline-none text-black dark:text-white placeholder:text-[#a2acb4]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#a2acb4]"
                  aria-label="Xoá tìm kiếm"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex rounded-full bg-black/5 dark:bg-white/5 p-0.5 shrink-0">
              <button
                onClick={() => {
                  setViewMode('table');
                  localStorage.setItem('admin_activity_view_mode', 'table');
                }}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold',
                  viewMode === 'table' ? 'bg-white dark:bg-[#1e1f22] text-[#3390ec] shadow' : 'text-[#707579] dark:text-[#9aa0a6]',
                )}
                title="Xem dạng bảng"
              >
                <Table2 size={13} /> <span className="hidden sm:inline">Bảng</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('feed');
                  localStorage.setItem('admin_activity_view_mode', 'feed');
                }}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold',
                  viewMode === 'feed' ? 'bg-[#3390ec] text-white shadow' : 'text-[#707579] dark:text-[#9aa0a6]',
                )}
                title="Xem dạng thẻ"
              >
                <Layers size={13} /> <span className="hidden sm:inline">Bảng tin</span>
              </button>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#e8f3fb] dark:bg-[#3390ec]/10 border border-[#3390ec]/30 px-3 py-2">
              <span className="text-[12.5px] font-bold text-[#3390ec]">Đã chọn {selected.size}</span>
              <div className="flex-1" />
              <button
                onClick={() => doApprove([...selected])}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-[#00c73e] text-white text-[12px] font-bold disabled:opacity-60"
              >
                Duyệt đã chọn
              </button>
              <button
                onClick={() => {
                  setRejectNote('');
                  setRejectIds([...selected]);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#e53935]/40 text-[#e53935] text-[12px] font-bold"
              >
                Từ chối
              </button>
              <button
                onClick={() => setDeleteIds([...selected])}
                className="px-3 py-1.5 rounded-lg bg-[#ffebee] dark:bg-[#e53935]/15 text-[#e53935] text-[12px] font-bold"
              >
                Xóa
              </button>
              <button onClick={() => setSelected(new Set())} className="p-1.5 text-[#707579]" aria-label="Bỏ chọn">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="pt-3">
        {loading ? (
          <div className="space-y-3 max-w-[680px] mx-auto">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] p-4 animate-pulse">
                <div className="h-4 rounded bg-black/10 dark:bg-white/10 w-1/2 mb-2" />
                <div className="h-32 rounded-xl bg-black/10 dark:bg-white/10" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] rounded-2xl">
            <p className="text-[14px] font-semibold text-black dark:text-white">Không có hồ sơ nào</p>
            <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6] mt-1">Hàng đợi đang trống.</p>
          </div>
        ) : viewMode === 'feed' ? (
          <div className="max-w-[680px] mx-auto flex flex-col gap-4">
            {filtered.map((item) => (
              <ActivityFeedCard
                key={item.id}
                item={item}
                semester={semester}
                statusFilter={status}
                selected={selected.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onApprove={() => doApprove([item.id])}
                onReject={(note) => void doRejectWithNote([item.id], note)}
                onDelete={() => setDeleteIds([item.id])}
                busy={busy}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] rounded-2xl overflow-hidden">
            <ActivityTable
              items={filtered}
              semester={semester}
              statusFilter={status}
              selectedIds={selected}
              dirtyIds={dirtyIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={() => {
                if (allSelected) setSelected(new Set());
                else setSelected(new Set(filtered.map((i) => i.id)));
              }}
              allSelected={allSelected}
              onFieldChange={handleFieldChange}
              onSaveRow={handleSaveRow}
              onCancelRow={handleCancelRow}
              onApprove={(id) => doApprove([id])}
              onReject={(id) => {
                setRejectNote('');
                setRejectIds([id]);
              }}
              onDelete={(id) => setDeleteIds([id])}
            />
          </div>
        )}

        {hasMore && !loading && filtered.length > 0 && (
          <button
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="mt-3 w-full max-w-[680px] mx-auto flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] text-[13px] font-semibold text-[#3390ec] disabled:opacity-60"
          >
            {loadingMore && <Loader2 size={15} className="animate-spin" />}
            Tải thêm (20 hồ sơ / lần)
          </button>
        )}
      </div>

      {/* Modal từ chối (dùng cho table + bulk) */}
      {rejectIds !== null && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55" onClick={() => !busy && setRejectIds(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] p-5 shadow-2xl">
            <h3 className="text-[15px] font-bold text-black dark:text-white mb-1">
              Từ chối {rejectIds.length} hồ sơ?
            </h3>
            <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6] mb-2">Lý do bắt buộc (hiển thị cho sinh viên):</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              placeholder="VD: Ảnh mờ không rõ mặt..."
              className="w-full rounded-xl bg-black/5 dark:bg-white/10 px-3 py-2.5 text-[13px] outline-none text-black dark:text-white resize-y mb-2"
            />
            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_REJECTION_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRejectNote(r)}
                  className="px-2.5 py-1 rounded-full border border-black/10 dark:border-white/10 text-[11.5px] text-[#707579] dark:text-[#9aa0a6] hover:border-[#e53935] hover:text-[#e53935]"
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectIds(null)} className="px-4 py-2 text-[13px] text-[#707579]">
                Huỷ
              </button>
              <button
                onClick={doReject}
                disabled={busy || !rejectNote.trim()}
                className="px-4 py-2 rounded-xl bg-[#e53935] text-white text-[13px] font-bold disabled:opacity-60"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteIds !== null}
        title="Xoá vĩnh viễn?"
        message={`${deleteIds?.length ?? 0} hồ sơ cùng toàn bộ tệp Storage sẽ bị xoá vĩnh viễn.`}
        confirmLabel="Xoá vĩnh viễn"
        danger
        onConfirm={doDelete}
        onCancel={() => setDeleteIds(null)}
      />
    </div>
  );

  async function doRejectWithNote(ids: string[], note: string) {
    if (!reviewer) return;
    setBusy(true);
    try {
      await submissionService.bulkUpdateStatus(semester, ids, 'rejected', reviewer, note);
      setItems((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, status: 'rejected' as const, reviewNote: note } : p)));
      setSelected(new Set());
      toast('Đã từ chối kèm lý do. Sinh viên thấy lý do để nộp lại cho đúng.', 'success');
    } catch {
      toast('Từ chối thất bại.', 'error');
    } finally {
      setBusy(false);
    }
  }
}

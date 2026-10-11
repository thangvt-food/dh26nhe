import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Check, Eye, EyeOff, Info, Loader2, Plus, RotateCcw, Search, X } from 'lucide-react';
import { DEFAULT_SEMESTERS } from '@/firebase';
import { useSemesters } from '@/hooks/useSemesters';
import { semesterService } from '@/services/semesterService';
import { toast } from '@/components/shared/Toast';
import { cn } from '@/utils/cn';

/**
 * Trang cấu hình học kỳ (admin): chọn học kỳ NÀO được hiển thị trong toàn app.
 * - Danh mục = mặc định (4 năm × 3 HK) + các kỳ tùy chỉnh admin đã thêm.
 * - Lưu tại RTDB `system_config/semesters` = danh sách kỳ ĐANG hiển thị (theo thứ tự).
 * - Checkbox bật/tắt; kỳ chưa đến chỉ cần tắt mắt là ẩn khỏi mọi select.
 */
export function SemesterConfigTab() {
  const semesters = useSemesters();
  const [checked, setChecked] = useState<Set<string>>(() => new Set(semesters));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('');

  // Danh mục: mặc định trước (đúng thứ tự), sau đó là kỳ tùy chỉnh admin đã thêm
  const catalog = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const id of [...DEFAULT_SEMESTERS, ...semesters]) {
      if (!seen.has(id)) {
        seen.add(id);
        list.push(id);
      }
    }
    return list;
  }, [semesters]);

  // Đồng bộ khi danh sách realtime thay đổi (nếu chưa có chỉnh sửa đang dở)
  useEffect(() => {
    if (!dirty) setChecked(new Set(semesters));
  }, [semesters, dirty]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDirty(true);
  };

  const addCustom = () => {
    const v = draft.trim().toUpperCase();
    if (!v) return;
    if (catalog.includes(v)) {
      if (!checked.has(v)) {
        toggle(v);
        setDraft('');
      } else {
        toast(`Học kỳ ${v} đã có trong danh mục.`, 'info');
      }
      return;
    }
    // Kỳ tùy chỉnh: thêm vào catalog (append cuối) + bật hiển thị
    catalog.push(v);
    setChecked((prev) => new Set(prev).add(v));
    setDraft('');
    setDirty(true);
    toast(`Đã thêm học kỳ tùy chỉnh ${v}.`, 'success');
  };

  const handleSave = async () => {
    const ordered = catalog.filter((id) => checked.has(id));
    if (ordered.length === 0) {
      toast('Phải hiển thị ít nhất 1 học kỳ.', 'error');
      return;
    }
    setSaving(true);
    try {
      await semesterService.setSemesters(ordered);
      setDirty(false);
      toast(`Đã lưu ${ordered.length} học kỳ hiển thị. Toàn app cập nhật ngay (realtime).`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Lưu thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setChecked(new Set(semesters));
    setDirty(false);
  };

  const quickShowAll = () => {
    setChecked(new Set(catalog));
    setDirty(true);
  };

  const filtered = catalog.filter((id) => id.toLowerCase().includes(filter.trim().toLowerCase()));
  const visibleCount = catalog.filter((id) => checked.has(id)).length;

  const btnBase =
    'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-bold transition-colors disabled:opacity-50';

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-[17px] font-bold text-black dark:text-white">
          <CalendarRange size={20} className="text-[#3390ec]" />
          Cấu hình học kỳ hiển thị
        </h2>
        <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6] mt-1">
          Chọn học kỳ nào xuất hiện trong các ô chọn của toàn app (Phòng, Hồ sơ, ĐRL, Admin).
          Các kỳ chưa đến thì tắt đi — bật lên khi cần.
        </p>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e8f3fb] dark:bg-[#3390ec]/15 text-[#3390ec] text-[12px] font-bold">
          <Eye size={13} /> {visibleCount} kỳ đang hiển thị / {catalog.length} kỳ trong danh mục
        </span>
        <button onClick={quickShowAll} className={cn(btnBase, 'bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/15')}>
          <Eye size={14} /> Bật tất cả
        </button>
        <button onClick={handleReset} disabled={!dirty} className={cn(btnBase, 'bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/15')}>
          <RotateCcw size={14} /> Hoàn tác
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className={cn(btnBase, 'bg-[#3390ec] hover:bg-[#2883dc] text-white ml-auto shadow-sm')}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          LƯU CẤU HÌNH
        </button>
      </div>

      {/* Add custom */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a2acb4] pointer-events-none" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            placeholder="Thêm học kỳ tùy chỉnh (VD: HK4N1, HÈN1)…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] text-[13px] outline-none text-black dark:text-white focus:border-[#3390ec] focus:ring-2 focus:ring-[#3390ec]/15 uppercase"
          />
        </div>
        <button onClick={addCustom} className={cn(btnBase, 'bg-[#3390ec] hover:bg-[#2883dc] text-white')}>
          Thêm
        </button>
      </div>

      {/* Grid config */}
      <div className="bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#dadce0] dark:border-[#3f4147] bg-[#fafbfc] dark:bg-white/5">
          <div className="relative flex-1 max-w-[240px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a2acb4] pointer-events-none" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Lọc học kỳ…"
              className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-white dark:bg-white/5 border border-[#dadce0] dark:border-[#3f4147] text-[12px] outline-none text-black dark:text-white"
            />
          </div>
          <span className="ml-auto text-[11px] text-[#a2acb4]">Bật = hiển thị trong app</span>
        </div>
        <div className="p-2.5 grid sm:grid-cols-2 gap-1.5">
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-[13px] text-[#707579] dark:text-[#9aa0a6] py-8">
              Không có học kỳ nào khớp bộ lọc.
            </p>
          )}
          {filtered.map((id) => {
            const on = checked.has(id);
            const isDefault = DEFAULT_SEMESTERS.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all active:scale-[0.98]',
                  on
                    ? 'bg-[#e8f3fb] dark:bg-[#3390ec]/15 border-[#3390ec]/40'
                    : 'bg-white dark:bg-transparent border-[#dadce0] dark:border-[#3f4147] hover:bg-black/[0.03] dark:hover:bg-white/5',
                )}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                    on ? 'bg-[#3390ec] border-[#3390ec] text-white' : 'border-[#c4c7cc] dark:border-white/25 text-transparent',
                  )}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={cn('block text-[13.5px] font-bold', on ? 'text-[#1a73e8] dark:text-[#8ab4f8]' : 'text-black dark:text-[#e8eaed]')}>
                    {id}
                  </span>
                  <span className="block text-[10.5px] text-[#a2acb4]">
                    {isDefault ? 'Học kỳ mặc định' : 'Học kỳ tùy chỉnh'}
                  </span>
                </span>
                <span className={cn('shrink-0', on ? 'text-[#3390ec]' : 'text-[#c4c7cc] dark:text-white/25')}>
                  {on ? <Eye size={16} /> : <EyeOff size={16} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#707579] dark:text-[#9aa0a6] mb-2">
          Xem trước ô chọn học kỳ của người dùng
        </p>
        <select className="w-full h-10 px-3 rounded-xl bg-black/5 dark:bg-white/10 text-[13.5px] font-semibold text-black dark:text-white outline-none">
          {catalog.filter((id) => checked.has(id)).map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
        <div className="flex items-start gap-1.5 mt-2.5 text-[11.5px] text-[#707579] dark:text-[#9aa0a6]">
          <Info size={13} className="shrink-0 mt-px" />
          <span>
            Lưu ý: tắt một học kỳ không xóa dữ liệu phòng/minh chứng của kỳ đó — chỉ ẩn khỏi danh sách chọn.
            Bật lại là thấy ngay.
          </span>
        </div>
      </div>
    </div>
  );
}

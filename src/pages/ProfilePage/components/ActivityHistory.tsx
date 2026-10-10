import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Inbox,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  X,
  RotateCw,
  ListChecks,
  Download,
  Award,
  FileText,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { roomService } from '@/services/submissionService';
import { SEMESTERS } from '@/firebase';
import { toast } from '@/components/shared/Toast';
import { cn } from '@/utils/cn';
import type { ActivitySubmission, SubmissionStatus } from '@/types/submission.types';

interface Props {
  semester: string;
  setSemester: (s: string) => void;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  sortBy: 'newest' | 'oldest';
  setSortBy: (s: 'newest' | 'oldest') => void;
  filteredUserData: ActivitySubmission[];
  isExporting: boolean;
  exportProgress: string;
  onExportZip: (selected: ActivitySubmission[]) => void;
  fetchUserActivities: (force?: boolean) => Promise<void>;
}

const STATUS_META: Record<SubmissionStatus, { label: string; text: string; bg: string; dot: string; Icon: typeof CheckCircle }> = {
  approved: { label: 'Đã duyệt', text: 'text-[#4fae4e]', bg: 'bg-[#4fae4e]/15', dot: '#4fae4e', Icon: CheckCircle },
  rejected: { label: 'Từ chối', text: 'text-[#e53935]', bg: 'bg-[#e53935]/15', dot: '#e53935', Icon: XCircle },
  pending: { label: 'Đang chờ', text: 'text-[#f5a623]', bg: 'bg-[#f5a623]/15', dot: '#f5a623', Icon: Clock },
};

function dateLabelOf(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff <= 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  if (diff < 7) return `${diff} ngày trước`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function TimelineItem({
  item,
  index,
  isSelectionMode,
  isSelected,
  onToggle,
  onNavigate,
}: {
  item: ActivitySubmission;
  index: number;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const meta = STATUS_META[item.status];
  const StatusIcon = meta.Icon;
  const timeStr = new Date(item.submittedAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCardClick = () => {
    if (isSelectionMode) onToggle();
    else onNavigate();
  };

  return (
    <div className="relative flex group" style={{ animation: 'timeline-in 0.4s ease-out both', animationDelay: `${index * 60}ms` }}>
      <div className="w-[46px] relative flex justify-center shrink-0">
        <div className="absolute right-0 top-[18px] w-[16px] h-px bg-black/10 dark:bg-white/10 group-hover:bg-[#3390ec]/30 transition-all duration-300" />
        <div
          className="relative mt-[10px] z-10 flex items-center justify-center transition-all duration-300 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
        >
          <div
            className="w-[11px] h-[11px] rounded-full transition-all duration-300 group-hover:scale-[1.8]"
            style={{
              backgroundColor: meta.dot,
              boxShadow: `0 0 0 3px white, 0 0 0 5px ${meta.dot}22`,
              animation: item.status === 'pending' ? 'dot-pulse 2s ease-in-out infinite' : 'none',
            }}
          />
        </div>
      </div>

      <div
        className={cn(
          'flex-1 min-w-0 rounded-xl border transition-all duration-300 px-4 py-3 cursor-pointer',
          isSelected
            ? 'bg-[#3390ec]/10 border-[#3390ec]/30 shadow'
            : 'bg-white dark:bg-[#212121] border-transparent hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/5 hover:-translate-y-[1px] hover:shadow',
        )}
        onClick={handleCardClick}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold leading-none', meta.text, meta.bg)}>
                <StatusIcon size={10} />
                {meta.label}
              </span>
              <span className="text-[10px] text-black/20 dark:text-white/20 font-mono">#{item.id.slice(-4)}</span>
              <span className="text-[10px] text-[#707579] dark:text-[#9aa0a6] flex items-center gap-0.5">
                <Clock size={9} />
                {timeStr}
              </span>
            </div>
            <h3 className="text-[14px] font-semibold text-black dark:text-white break-words mt-1 leading-snug">
              {item.activityName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-[11px] text-[#707579] dark:text-[#9aa0a6]">
                <FileText size={11} />
                Hồ sơ minh chứng · {item.fileUrls.length} tệp
              </span>
              {!isSelectionMode && (
                <span className="text-[10px] text-[#3390ec] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                  <ExternalLink size={9} />
                  Mở phòng
                </span>
              )}
            </div>
            {item.status === 'rejected' && item.reviewNote && (
              <p className="mt-1.5 text-[12px] text-[#e53935] bg-[#e53935]/10 rounded-lg px-2 py-1">
                Lý do: {item.reviewNote}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="inline-flex items-center gap-0.5 text-[13px] font-extrabold leading-none px-2 py-1 rounded-lg text-[#b8860b] bg-gradient-to-br from-[#fff8e1] to-[#ffecb3] dark:from-[#f5a623]/20 dark:to-[#f5a623]/10 dark:text-[#f5a623]">
              <Award size={12} />
              +{item.bonusPoints}
            </span>
            {isSelectionMode && (
              <div
                className="w-[18px] h-[18px] rounded border-2 transition-all flex items-center justify-center shrink-0"
                style={{
                  borderColor: isSelected ? '#3390ec' : '#ccc',
                  backgroundColor: isSelected ? '#3390ec' : 'transparent',
                }}
              >
                {isSelected && <div className="w-[6px] h-[6px] rounded-sm bg-white" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActivityHistory({
  semester,
  setSemester,
  loading,
  error,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  filteredUserData,
  isExporting,
  exportProgress,
  onExportZip,
  fetchUserActivities,
}: Props) {
  const navigate = useNavigate();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nameToId, setNameToId] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = roomService.subscribeRooms(semester, (rooms) => {
      const map: Record<string, string> = {};
      rooms.forEach((r) => {
        map[r.name] = r.id;
      });
      setNameToId(map);
    });
    return unsub;
  }, [semester]);

  const groupedData = useMemo(() => {
    const groups = new Map<string, { date: Date | null; label: string; items: ActivitySubmission[] }>();
    for (const item of filteredUserData) {
      const d = new Date(item.submittedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!groups.has(key)) groups.set(key, { date: d, label: dateLabelOf(item.submittedAt), items: [] });
      groups.get(key)!.items.push(item);
    }
    return [...groups.values()].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
  }, [filteredUserData]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = filteredUserData.length > 0 && selectedIds.size === filteredUserData.length;

  const handleExport = () => {
    const selected = filteredUserData.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) {
      toast('Chưa chọn hoạt động nào để xuất.', 'error');
      return;
    }
    onExportZip(selected);
  };

  const handleNavigate = (item: ActivitySubmission) => {
    const roomId = nameToId[item.activityName];
    if (roomId) navigate(`/rooms/${semester}/${roomId}`);
    else toast('Không tìm thấy phòng của hoạt động này.', 'info');
  };

  return (
    <div className="bg-white dark:bg-[#212121] rounded-2xl overflow-hidden border border-black/5 dark:border-white/10">
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#3390ec]" />
            <h2 className="text-[17px] font-bold text-black dark:text-white">Lịch sử hoạt động</h2>
          </div>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="h-6 px-2 text-[10px] font-bold text-[#3390ec] bg-[#3390ec]/10 rounded-full border-0 outline-none cursor-pointer"
            aria-label="Chọn học kỳ"
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s} className="text-black text-[12px]">
                {s}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-[#e53935]/10 text-[#e53935] rounded-xl text-[13px] font-medium flex items-center gap-2">
            <XCircle size={16} /> {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={async () => {
              setIsRefreshing(true);
              await fetchUserActivities(true);
              setIsRefreshing(false);
            }}
            disabled={isRefreshing}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-[#707579] dark:text-[#9aa0a6] hover:text-[#3390ec] hover:bg-[#3390ec]/10 transition-colors shrink-0"
            title="Tải lại"
            aria-label="Tải lại dữ liệu"
          >
            <RotateCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {!isSelectionMode ? (
            <button
              onClick={() => setIsSelectionMode(true)}
              className="h-9 px-4 bg-[#3390ec] text-white rounded-xl hover:bg-[#2883df] transition-colors flex items-center gap-2 text-xs font-bold shrink-0"
            >
              <ListChecks size={15} />
              Xuất hồ sơ
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (allSelected) setSelectedIds(new Set());
                  else setSelectedIds(new Set(filteredUserData.map((i) => i.id)));
                }}
                className="h-9 px-3 rounded-xl text-xs font-bold text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
              >
                {allSelected ? 'Bỏ chọn hết' : 'Chọn hết'}
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || selectedIds.size === 0}
                className={cn(
                  'h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0',
                  isExporting || selectedIds.size === 0
                    ? 'text-[#707579] dark:text-[#9aa0a6] cursor-not-allowed'
                    : 'bg-[#3390ec] text-white hover:bg-[#2883df]',
                )}
              >
                <Download size={15} className={isExporting ? 'animate-spin' : ''} />
                {isExporting ? exportProgress || 'Đang xuất...' : `ZIP (${selectedIds.size})`}
              </button>
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                aria-label="Thoát chế độ chọn"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full ml-auto pb-1">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707579] dark:text-[#9aa0a6] pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..."
              className="h-9 w-full pl-9 pr-7 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-xs font-medium text-black dark:text-white placeholder:text-[#707579]/60 outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black/10 dark:bg-white/15 text-[#707579] flex items-center justify-center"
                aria-label="Xoá tìm kiếm"
              >
                <X size={10} />
              </button>
            )}
          </div>
          <div className="flex items-center px-1 py-1 rounded-xl bg-black/5 dark:bg-white/5 shrink-0">
            <Filter size={12} className="text-[#3390ec] shrink-0 ml-2" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="h-7 border-0 bg-transparent px-1.5 shadow-none text-[11px] font-medium text-[#707579] dark:text-[#9aa0a6] outline-none cursor-pointer"
              aria-label="Sắp xếp"
            >
              <option value="newest" className="text-black">Mới nhất</option>
              <option value="oldest" className="text-black">Cũ nhất</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-3">
        {loading && filteredUserData.length === 0 ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-0 pl-[46px]">
                <div className="relative w-[46px] flex justify-center shrink-0">
                  <div className="w-[8px] h-[8px] rounded-full mt-[14px] bg-black/10 dark:bg-white/10" />
                </div>
                <div className="flex-1">
                  <div className="h-[72px] w-full rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredUserData.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
              <Inbox className="h-7 w-7 text-[#707579]/40" />
            </div>
            <p className="text-[#707579] dark:text-[#9aa0a6] font-medium text-sm">
              {searchTerm ? 'Không tìm thấy hoạt động nào.' : 'Chưa có hoạt động nào.'}
            </p>
            {!searchTerm && (
              <p className="text-[#707579]/60 dark:text-[#9aa0a6]/60 text-xs mt-1">
                Hãy tham gia hoạt động để tích lũy điểm
              </p>
            )}
          </div>
        ) : (
          <div className="relative pl-0">
            <div
              className="absolute left-[22px] top-[10px] bottom-[10px] w-[2px] bg-gradient-to-b from-[#3390ec]/40 via-black/10 dark:via-white/10 to-transparent rounded-full"
              style={{ animation: 'line-grow 0.8s ease-out forwards' }}
            />
            <div className="space-y-7">
              {groupedData.map((group, groupIdx) => {
                const isToday = group.label === 'Hôm nay';
                return (
                  <div key={group.label + groupIdx} style={{ animation: 'timeline-in 0.5s ease-out both', animationDelay: `${groupIdx * 100}ms` }}>
                    <div className="flex items-center mb-3">
                      <div className="w-[46px] flex justify-center shrink-0">
                        <div
                          className={cn(
                            'relative flex items-center justify-center z-10 w-[14px] h-[14px] rounded-full',
                            isToday ? 'bg-[#3390ec]' : 'bg-black/20 dark:bg-white/20',
                          )}
                          style={isToday ? { animation: 'date-pulse 3s ease-in-out infinite' } : undefined}
                        >
                          <div className="w-[4px] h-[4px] rounded-full bg-white" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className={cn('text-[11px] font-extrabold uppercase tracking-[0.12em]', isToday ? 'text-[#3390ec]' : 'text-[#707579] dark:text-[#9aa0a6]')}>
                          {group.label}
                        </span>
                        <span className="text-[10px] text-[#707579]/60 ml-1">· {group.items.length} hoạt động</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {group.items.map((item, idx) => (
                        <TimelineItem
                          key={item.id}
                          item={item}
                          index={idx}
                          isSelectionMode={isSelectionMode}
                          isSelected={selectedIds.has(item.id)}
                          onToggle={() => toggleOne(item.id)}
                          onNavigate={() => handleNavigate(item)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

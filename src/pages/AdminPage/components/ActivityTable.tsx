import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EllipsisVertical, Save, Undo, Check, X, Trash2, ExternalLink } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';
import { getAvatarGradient, getInitials, cn } from '@/utils/cn';
import type { ActivitySubmission } from '@/types/submission.types';

interface Props {
  items: ActivitySubmission[];
  semester: string;
  statusFilter: string;
  selectedIds: Set<string>;
  dirtyIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  onFieldChange: (id: string, field: 'activityName' | 'bonusPoints', value: string | number) => void;
  onSaveRow: (id: string) => void;
  onCancelRow: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_BADGE: Record<ActivitySubmission['status'], string> = {
  approved: 'bg-[#eeffde] dark:bg-[#4fae4e]/15 text-[#3b873e] dark:text-[#81c784]',
  pending: 'bg-[#fff3e0] dark:bg-[#f5a623]/15 text-[#d08a31] dark:text-[#f5a623]',
  rejected: 'bg-[#ffebee] dark:bg-[#e53935]/15 text-[#e53935]',
};

const STATUS_LABEL: Record<ActivitySubmission['status'], string> = {
  approved: 'Đã duyệt',
  pending: 'Chờ duyệt',
  rejected: 'Từ chối',
};

export function ActivityTable({
  items,
  semester,
  statusFilter,
  selectedIds,
  dirtyIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  onFieldChange,
  onSaveRow,
  onCancelRow,
  onApprove,
  onReject,
  onDelete,
}: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-[12.5px]">
        <thead>
          <tr className="text-left text-[#707579] dark:text-[#9aa0a6] bg-[#fafbfc] dark:bg-white/5 border-b border-[#dadce0] dark:border-[#3f4147]">
            <th className="p-3 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="w-4 h-4 accent-[#3390ec]"
                aria-label="Chọn tất cả"
              />
            </th>
            <th className="p-3">Thời gian</th>
            <th className="p-3">Sinh viên</th>
            <th className="p-3">Hoạt động</th>
            <th className="p-3">Điểm</th>
            <th className="p-3">Minh chứng</th>
            <th className="p-3">Trạng thái</th>
            <th className="p-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const dirty = dirtyIds.has(item.id);
            return (
              <tr
                key={item.id}
                className={cn(
                  'border-b border-black/5 dark:border-white/5 text-black dark:text-white',
                  selectedIds.has(item.id) && 'bg-[#eef6fc] dark:bg-[#3390ec]/10',
                  dirty && 'bg-[#fffbea] dark:bg-[#f5a623]/5',
                )}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleSelect(item.id)}
                    className="w-4 h-4 accent-[#3390ec]"
                    aria-label="Chọn"
                  />
                </td>
                <td className="p-3 whitespace-nowrap text-[#707579] dark:text-[#9aa0a6]">
                  {formatDateTime(item.submittedAt)}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[11px] font-bold shrink-0',
                        getAvatarGradient(item.email),
                      )}
                    >
                      {getInitials(item.fullName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold truncate max-w-[140px]">{item.fullName}</span>
                      <span className="block text-[11px] text-[#707579] dark:text-[#9aa0a6] truncate max-w-[140px]">
                        {item.email}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="p-3 min-w-[180px]">
                  <input
                    value={item.activityName}
                    onChange={(e) => onFieldChange(item.id, 'activityName', e.target.value)}
                    className="w-full rounded-lg bg-transparent border border-transparent hover:border-black/10 focus:border-[#3390ec] focus:bg-black/[0.02] dark:focus:bg-white/5 px-2 py-1.5 outline-none"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    value={item.bonusPoints}
                    onChange={(e) => onFieldChange(item.id, 'bonusPoints', Number(e.target.value))}
                    className="w-16 rounded-lg bg-transparent border border-transparent hover:border-black/10 focus:border-[#3390ec] px-2 py-1.5 outline-none font-bold text-[#3390ec]"
                  />
                </td>
                <td className="p-3">
                  {item.fileUrl ? (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-full bg-[#e8f3fb] dark:bg-[#3390ec]/15 text-[#3390ec] text-[11.5px] font-semibold hover:underline whitespace-nowrap"
                    >
                      {item.fileUrls.length} tệp
                    </a>
                  ) : (
                    <span className="text-[#a2acb4]">—</span>
                  )}
                </td>
                <td className="p-3">
                  <span className={cn('px-2.5 py-1 rounded-full text-[11.5px] font-bold whitespace-nowrap', STATUS_BADGE[item.status])}>
                    {STATUS_LABEL[item.status]}
                  </span>
                  {dirty && <span className="block text-[10.5px] text-[#d08a31] mt-0.5">Chưa lưu</span>}
                </td>
                <td className="p-3 text-right">
                  {dirty ? (
                    <span className="inline-flex gap-1">
                      <button
                        onClick={() => onSaveRow(item.id)}
                        className="p-2 rounded-lg bg-[#00c73e] text-white"
                        title="Lưu"
                        aria-label="Lưu thay đổi"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => onCancelRow(item.id)}
                        className="p-2 rounded-lg text-[#707579] hover:bg-black/5"
                        title="Huỷ"
                        aria-label="Huỷ thay đổi"
                      >
                        <Undo size={14} />
                      </button>
                    </span>
                  ) : (
                    <span className="relative inline-block">
                      <button
                        onClick={() => setMenuId(menuId === item.id ? null : item.id)}
                        className="p-2 rounded-lg text-[#707579] hover:bg-black/5 dark:hover:bg-white/10"
                        aria-label="Mở menu thao tác"
                      >
                        <EllipsisVertical size={15} />
                      </button>
                      {menuId === item.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />
                          <span className="absolute right-0 top-full z-50 block w-44 rounded-xl bg-white dark:bg-[#1e1f22] border border-black/10 dark:border-white/10 shadow-2xl p-1 text-left">
                            <Link
                              to={`/admin/activity/${item.id}?semester=${semester}&status=${statusFilter}`}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] hover:bg-black/5 dark:hover:bg-white/10"
                            >
                              <ExternalLink size={13} /> Xem chi tiết
                            </Link>
                            <button
                              onClick={() => {
                                onApprove(item.id);
                                setMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] hover:bg-black/5 dark:hover:bg-white/10"
                            >
                              <Check size={13} className="text-[#00c73e]" /> Duyệt
                            </button>
                            <button
                              onClick={() => {
                                onReject(item.id);
                                setMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] hover:bg-black/5 dark:hover:bg-white/10"
                            >
                              <X size={13} className="text-[#e53935]" /> Từ chối
                            </button>
                            <button
                              onClick={() => {
                                onDelete(item.id);
                                setMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-[#e53935] hover:bg-[#ffebee] dark:hover:bg-[#e53935]/10"
                            >
                              <Trash2 size={13} /> Xóa
                            </button>
                          </span>
                        </>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, CheckCircle2, X } from 'lucide-react';
import type { DeletePhase } from '../hooks/useRoomDeletion';
import type { RoomSubmissionCounts } from '@/services/adminService';
import type { RoomDefinition } from '@/types/submission.types';
import { cn } from '@/utils/cn';

interface Props {
  room: RoomDefinition | null;
  counts: RoomSubmissionCounts | null;
  counting: boolean;
  phase: DeletePhase;
  progress: string;
  result: { docs: number; files: number } | null;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Dialog xác nhận xoá phòng: hiện số minh chứng liên quan + tiến trình + kết quả. */
export function DeleteRoomDialog({
  room,
  counts,
  counting,
  phase,
  progress,
  result,
  error,
  onConfirm,
  onClose,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const open = room !== null && phase !== 'idle';

  const handleClose = () => {
    setAcknowledged(false);
    onClose();
  };

  const tiles = counts
    ? [
        { label: 'Tổng minh chứng', value: counts.total, cls: 'text-black dark:text-white' },
        { label: 'Chờ duyệt', value: counts.pending, cls: 'text-[#f5a623]' },
        { label: 'Đã duyệt', value: counts.approved, cls: 'text-[#4fae4e]' },
        { label: 'Từ chối', value: counts.rejected, cls: 'text-[#e53935]' },
      ]
    : [];

  return (
    <AnimatePresence>
      {open && room && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
          onClick={() => phase === 'confirm' && handleClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1e1f22] border border-black/10 dark:border-white/10 shadow-2xl p-5"
          >
            {phase === 'done' && result ? (
              <>
                <div className="flex flex-col items-center text-center py-2">
                  <span className="w-12 h-12 rounded-full bg-[#4fae4e]/15 text-[#4fae4e] flex items-center justify-center mb-3">
                    <CheckCircle2 size={26} />
                  </span>
                  <h3 className="text-[16px] font-bold text-black dark:text-white">Đã xoá phòng “{room.name}”</h3>
                  <p className="text-[13px] text-[#707579] dark:text-[#9aa0a6] mt-1.5 leading-relaxed">
                    Đã dọn sạch {result.docs} hồ sơ minh chứng và {result.files} tệp đính kèm trong Storage.
                    Không còn dữ liệu mồ côi.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="mt-4 w-full py-2.5 rounded-xl bg-[#3390ec] hover:bg-[#2883df] text-white text-[14px] font-bold"
                >
                  Đóng
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-full bg-[#e53935]/10 text-[#e53935] flex items-center justify-center shrink-0">
                    {phase === 'deleting' ? <Loader2 size={20} className="animate-spin" /> : <AlertTriangle size={20} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15.5px] font-bold text-black dark:text-white">
                      Xoá phòng “{room.name}”?
                    </h3>
                    <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6] mt-0.5">
                      Học kỳ {room.semester} · +{room.points} điểm
                    </p>
                  </div>
                  {phase === 'confirm' && (
                    <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-black/5" aria-label="Đóng">
                      <X size={17} />
                    </button>
                  )}
                </div>

                {counting ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-[#707579]">
                    <Loader2 size={17} className="animate-spin text-[#3390ec]" />
                    Đang đếm minh chứng liên quan...
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 mt-4 text-center">
                    {tiles.map((t) => (
                      <div key={t.label} className="rounded-xl bg-black/5 dark:bg-white/5 py-2 px-1">
                        <p className={cn('text-[17px] font-extrabold leading-none', t.cls)}>{t.value}</p>
                        <p className="text-[10px] text-[#707579] dark:text-[#9aa0a6] mt-1 leading-tight">{t.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 rounded-2xl bg-[#e53935]/10 border border-[#e53935]/20 px-3.5 py-2.5 text-[12.5px] text-[#c62828] dark:text-[#ef9a9a] leading-relaxed">
                  Xoá phòng sẽ <strong>xoá vĩnh viễn</strong> toàn bộ minh chứng trên
                  (hồ sơ Firestore + tệp trong Storage) cùng node phòng. Hành động không thể hoàn tác.
                </div>

                {error && (
                  <p className="mt-2 text-[12.5px] text-[#e53935]">Lỗi: {error}</p>
                )}

                {phase === 'deleting' ? (
                  <p className="mt-3 text-center text-[13px] font-medium text-[#3390ec]">
                    {progress || 'Đang xoá...'}
                  </p>
                ) : (
                  <>
                    <label className="mt-3 flex items-start gap-2.5 cursor-pointer text-[13px] text-black dark:text-white">
                      <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#e53935]"
                      />
                      Tôi đã hiểu và vẫn muốn xoá toàn bộ dữ liệu trên.
                    </label>
                    <div className="flex gap-2 justify-end mt-4">
                      <button
                        onClick={handleClose}
                        className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#707579] hover:bg-black/5"
                      >
                        Huỷ bỏ
                      </button>
                      <button
                        onClick={onConfirm}
                        disabled={!acknowledged || counting}
                        className="px-5 py-2.5 rounded-xl bg-[#e53935] hover:bg-[#d32f2f] text-white text-[13px] font-bold disabled:opacity-40"
                      >
                        Xoá toàn bộ
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

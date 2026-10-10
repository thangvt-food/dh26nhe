import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1e1f22] border border-black/5 dark:border-white/10 shadow-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={
                  danger
                    ? 'w-10 h-10 rounded-full bg-[#e53935]/10 text-[#e53935] flex items-center justify-center'
                    : 'w-10 h-10 rounded-full bg-[#3390ec]/10 text-[#3390ec] flex items-center justify-center'
                }
              >
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-semibold text-[16px] text-black dark:text-white">{title}</h3>
            </div>
            <p className="text-[13.5px] text-[#707579] dark:text-[#aaaaaa] leading-relaxed mb-5 ml-[52px]">
              {message}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl text-[14px] font-medium text-[#707579] dark:text-[#aaaaaa] hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={
                  danger
                    ? 'px-4 py-2.5 rounded-xl text-[14px] font-semibold bg-[#e53935] hover:bg-[#d32f2f] text-white transition'
                    : 'px-4 py-2.5 rounded-xl text-[14px] font-semibold bg-[#3390ec] hover:bg-[#2883df] text-white transition'
                }
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

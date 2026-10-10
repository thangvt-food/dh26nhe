import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ToastData {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let toastPush: ((t: Omit<ToastData, 'id'>) => void) | null = null;

export function toast(message: string, type: ToastData['type'] = 'info') {
  toastPush?.({ message, type });
}

export function ToastHost() {
  const [items, setItems] = useState<ToastData[]>([]);

  useEffect(() => {
    toastPush = ({ message, type }) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-2), { id, message, type }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
    };
    return () => {
      toastPush = null;
    };
  }, []);

  return (
    <div className="fixed top-3 md:top-4 left-1/2 -translate-x-1/2 z-[4000] flex flex-col gap-2 items-center w-[calc(100%-2rem)] max-w-md pointer-events-none">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 350 }}
            className={cn(
              'pointer-events-auto flex items-center gap-2.5 pl-3 pr-2 py-3 rounded-2xl shadow-2xl border-l-4 backdrop-blur-xl text-[13.5px] font-medium w-full',
              'bg-white/97 border-black/10 text-[#1f1f1f] dark:bg-[#212121]/97 dark:border-white/10 dark:text-white',
              t.type === 'success' && 'border-l-[#4fae4e]',
              t.type === 'error' && 'border-l-[#e53935]',
              t.type === 'info' && 'border-l-[#3390ec]',
            )}
          >
            {t.type === 'success' ? (
              <CheckCircle2 size={20} className="text-[#4fae4e] shrink-0" />
            ) : t.type === 'error' ? (
              <AlertCircle size={20} className="text-[#e53935] shrink-0" />
            ) : (
              <Info size={20} className="text-[#3390ec] shrink-0" />
            )}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              aria-label="Đóng thông báo"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

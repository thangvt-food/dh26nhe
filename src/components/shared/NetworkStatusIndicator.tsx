import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function NetworkStatusIndicator() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[3000] flex items-center gap-2 px-4 py-2 rounded-full bg-[#e53935] text-white text-[13px] font-medium shadow-xl"
        >
          <WifiOff size={15} />
          Mất kết nối mạng — đang chờ kết nối lại...
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Nút "Trang chủ" nổi, glassmorphism, căn giữa đáy màn hình.
 * - Rất dễ thấy nhưng có phản hồi nhấn rõ ràng.
 * - Chặn nhấn liên tục (800ms) để tránh thao tác nhầm lặp lại.
 * - `raised`: nâng cao hơn khi trang có BottomNavBar (mobile).
 */
export function FloatingHomeButton({ raised = false }: { raised?: boolean }) {
  const navigate = useNavigate();
  const lastClick = useRef(0);
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    const now = Date.now();
    if (now - lastClick.current < 800) return;
    lastClick.current = now;
    navigate('/');
  };

  return (
    <div
      className={cn('fixed inset-x-0 z-[1200] flex justify-center pointer-events-none', raised ? 'bottom-[76px] md:bottom-6' : 'bottom-5')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        onClick={handleClick}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        className={cn(
          'pointer-events-auto flex items-center gap-2 pl-2.5 pr-4 h-11 rounded-full select-none',
          'bg-white/70 dark:bg-[#17212b]/70 backdrop-blur-xl',
          'border border-white/60 dark:border-white/15',
          'shadow-[0_10px_32px_rgba(15,35,60,0.18)] dark:shadow-[0_10px_32px_rgba(0,0,0,0.55)]',
          'text-[13.5px] font-bold text-[#3390ec] dark:text-[#4fc3f7]',
          'transition-all duration-150 active:scale-90 hover:shadow-[0_14px_38px_rgba(15,35,60,0.24)]',
          pressed && 'scale-90',
        )}
        aria-label="Về trang chủ"
      >
        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#3390ec] to-[#4fc3f7] text-white flex items-center justify-center shrink-0 shadow-sm">
          <Home size={14} strokeWidth={2.5} />
        </span>
        Trang chủ
      </button>
    </div>
  );
}

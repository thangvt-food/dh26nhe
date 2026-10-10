import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface Props {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  title?: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/** Lightbox xem ảnh minh chứng kiểu Telegram: zoom, vuốt, phím tắt, thumbnail strip. */
export function TelegramMediaViewer({ isOpen, images, currentIndex, title, onClose, onNavigate }: Props) {
  const [zoom, setZoom] = useState(1);
  const [touchX, setTouchX] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setZoom(1);
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate((currentIndex - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') onNavigate((currentIndex + 1) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  const handleDownload = useCallback(async () => {
    const url = images[currentIndex];
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `minh_chung_${currentIndex + 1}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch {
      window.open(url, '_blank');
    }
  }, [images, currentIndex]);

  if (!isOpen || images.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-sm flex flex-col"
        onClick={onClose}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10" aria-label="Đóng">
            <X size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold truncate">{title ?? 'Minh chứng'}</p>
            <p className="text-[12px] text-white/60">
              Ảnh {currentIndex + 1} / {images.length}
            </p>
          </div>
          <button
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Phóng to"
          >
            <ZoomIn size={19} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Thu nhỏ"
          >
            <ZoomOut size={19} />
          </button>
          <button onClick={handleDownload} className="p-2 rounded-full hover:bg-white/10" aria-label="Tải ảnh">
            <Download size={19} />
          </button>
        </div>

        <div
          className="flex-1 relative flex items-center justify-center overflow-hidden px-12"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (dx > 50) onNavigate((currentIndex - 1 + images.length) % images.length);
            else if (dx < -50) onNavigate((currentIndex + 1) % images.length);
            setTouchX(null);
          }}
        >
          {images.length > 1 && (
            <button
              onClick={() => onNavigate((currentIndex - 1 + images.length) % images.length)}
              className="absolute left-3 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Ảnh trước"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <motion.img
            key={images[currentIndex]}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            src={images[currentIndex]}
            alt={`Minh chứng ${currentIndex + 1}`}
            style={{ transform: `scale(${zoom})` }}
            onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
            className="max-h-full max-w-full object-contain rounded-lg cursor-zoom-in transition-transform"
            draggable={false}
          />
          {images.length > 1 && (
            <button
              onClick={() => onNavigate((currentIndex + 1) % images.length)}
              className="absolute right-3 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Ảnh tiếp"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div
            className="flex gap-2 justify-center px-4 py-3 overflow-x-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((src, i) => (
              <button
                key={src + i}
                onClick={() => onNavigate(i)}
                className={
                  i === currentIndex
                    ? 'w-14 h-14 rounded-lg overflow-hidden ring-2 ring-[#3390ec] shrink-0'
                    : 'w-14 h-14 rounded-lg overflow-hidden opacity-50 hover:opacity-90 shrink-0'
                }
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

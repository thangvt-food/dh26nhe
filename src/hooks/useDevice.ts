import { useEffect, useState } from 'react';

export function useDevice() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const onResize = () => {
      setWidth(window.innerWidth);
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return { isMobile, width };
}

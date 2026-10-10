import { useEffect, useState } from 'react';

const IN_APP_RULES = [
  /FBAN|FBAV/i,
  /Instagram/i,
  /Line/i,
  /Zalo/i,
  /TikTok/i,
  /MicroMessenger/i,
  /Pinterest/i,
  /Snapchat/i,
  /Viber/i,
  /WeChat/i,
  /\bwv\b/i,
];

/** Phát hiện WebView nhúng (Facebook/Zalo/TikTok/...) chặn popup Google Auth. */
export function useInAppBrowser(): boolean {
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || (navigator as unknown as { vendor?: string }).vendor || '';
    setIsInApp(IN_APP_RULES.some((re) => re.test(ua)));
  }, []);

  return isInApp;
}

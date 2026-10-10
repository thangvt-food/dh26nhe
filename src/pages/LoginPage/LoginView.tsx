import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInAppBrowser } from '@/hooks/useInAppBrowser';
import { usePageTracking } from '@/hooks/usePageTracking';
import { BrowserWarningBanner } from '@/components/shared/BrowserWarningBanner';
import { toast } from '@/components/shared/Toast';
import { APP_CONFIG } from '@/firebase';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.6 0 10.2 0 12s.5 3.4 1.4 4.9l3.8-2.5z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.4 6.7l3.8 2.9c1-2.9 3.7-4.9 6.8-4.9z" />
    </svg>
  );
}

export function LoginView() {
  const { currentUser, loading, login } = useAuth();
  const isInAppBrowser = useInAppBrowser();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  usePageTracking('login');

  useEffect(() => {
    if (!loading && currentUser) navigate('/rooms', { replace: true });
  }, [loading, currentUser, navigate]);

  const handleGoogleLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await login();
      toast('Đăng nhập thành công. Chào mừng bạn quay lại!', 'success');
      navigate('/rooms', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.';
      toast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e7ebf0] dark:bg-[#0e1621]">
        <div className="w-10 h-10 rounded-full border-4 border-[#3390ec]/20 border-t-[#3390ec] animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#e7ebf0] dark:bg-[#0e1621] p-4">
      <div
        aria-hidden
        className="absolute w-[500px] h-[500px] rounded-full blur-3xl bg-violet-200/50 dark:bg-violet-900/20 animate-float -top-32 -left-32"
      />
      <div
        aria-hidden
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl bg-blue-100/60 dark:bg-blue-900/20 animate-float top-1/3 -right-40"
      />

      <div className="relative w-full max-w-[480px] rounded-3xl p-8 md:p-12 shadow-xl backdrop-blur-xl bg-white/85 dark:bg-[#17212b]/85 border border-black/5 dark:border-white/10 animate-slide-up">
        <div className="text-center mb-6">
          <div className="font-extrabold text-[28px] tracking-tight text-black dark:text-white">
            DH<span className="text-[#3390ec]">26</span>NHE
          </div>
          <h1 className="mt-2 text-[20px] font-bold text-black dark:text-white">
            Chào mừng bạn quay lại!
          </h1>
          <p className="mt-1 text-[13.5px] text-[#707579] dark:text-[#9aa0a6]">
            Hệ thống quản lý sinh viên dành riêng cho lớp {APP_CONFIG.defaultClassName}
          </p>
        </div>

        {isInAppBrowser && (
          <BrowserWarningBanner message="Bạn đang mở web trong ứng dụng (Zalo/Facebook/Messenger). Vui lòng nhấn vào biểu tượng ⋮ hoặc Chia sẻ để mở bằng Chrome/Safari nhằm đăng nhập an toàn." />
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isInAppBrowser || busy}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#212121] px-4 py-3.5 text-[15px] font-semibold text-black dark:text-white shadow-sm hover:shadow-md hover:-translate-y-px active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none"
          >
            <GoogleIcon />
            {busy ? 'Đang đăng nhập...' : 'Tiếp tục với Google'}
          </button>

          <div className="flex gap-3 p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40">
            <Info size={16} className="text-violet-600 dark:text-violet-300 shrink-0 mt-0.5" />
            <p className="text-[13px] leading-relaxed text-violet-900/80 dark:text-violet-200/80">
              Nhớ dùng Email sinh viên ({APP_CONFIG.studentEmailDomain}) để hệ thống nhận diện đúng
              bạn nhé!
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-[12.5px] text-[#707579] dark:text-[#9aa0a6]">
          <span>Chính sách bảo mật</span>
          <span className="mx-2">·</span>
          <span>Điều khoản dịch vụ</span>
        </div>
      </div>
    </div>
  );
}

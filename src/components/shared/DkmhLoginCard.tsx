import { useState } from 'react';
import { KeyRound, Loader2, Lock, LogIn, ShieldCheck, User, Eye, EyeOff } from 'lucide-react';
import { loginDkmh, type DkmhAuth } from '@/services/dkmhService';
import { toast } from '@/components/shared/Toast';
import { cn } from '@/utils/cn';

interface Props {
  onSuccess?: (auth: DkmhAuth) => void;
  compact?: boolean;
}

export function DkmhLoginCard({ onSuccess, compact = false }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập MSSV và mật khẩu');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const auth = await loginDkmh(username.trim(), password);
      toast(`Đăng nhập DKMH thành công. Chào ${auth.name || auth.username}!`, 'success');
      onSuccess?.(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-[#3390ec]/10 text-[#3390ec] shrink-0">
          <KeyRound size={20} />
        </div>
        <div>
          <h3 className="font-bold text-[15px] text-black dark:text-white">Đăng nhập cổng DKMH</h3>
          <p className="text-[12px] text-[#707579] dark:text-[#9aa0a6]">
            Nhập MSSV để mở khóa TKB, điểm & lịch thi
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-[#e53935]/10 border border-[#e53935]/20 text-[#e53935] text-[12.5px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#707579] dark:text-[#9aa0a6] uppercase tracking-wider">
              Mã số sinh viên
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ví dụ: 23126xxx"
                autoComplete="username"
                className="w-full pl-10 pr-3 py-2.5 bg-black/5 dark:bg-white/5 border-0 rounded-xl text-[13.5px] font-medium text-black dark:text-white placeholder:text-[#707579]/60 outline-none focus:ring-2 focus:ring-[#3390ec]/40"
              />
              <User size={16} className="text-[#3390ec] absolute left-3.5 top-3" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#707579] dark:text-[#9aa0a6] uppercase tracking-wider">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu cổng DKMH"
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 bg-black/5 dark:bg-white/5 border-0 rounded-xl text-[13.5px] font-medium text-black dark:text-white placeholder:text-[#707579]/60 outline-none focus:ring-2 focus:ring-[#3390ec]/40"
              />
              <Lock size={16} className="text-[#3390ec] absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#707579] dark:text-[#9aa0a6] hover:text-black dark:hover:text-white"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#707579] dark:text-[#9aa0a6] flex-1">
            <ShieldCheck size={15} className="text-[#4fae4e] shrink-0" />
            <span>Lưu tài khoản trên máy này — tự đăng nhập lại khi hết phiên.</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-6 rounded-xl bg-[#3390ec] hover:bg-[#2883df] text-white font-bold text-[13.5px] shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 transition active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang kết nối...</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Đăng nhập ngay</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

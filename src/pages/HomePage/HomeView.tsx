import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  CalendarClock,
  Images,
  LayoutGrid,
  LogOut,
  Moon,
  Search,
  ShieldCheck,
  Signal,
  Sun,
  User,
  Wifi,
  BatteryFull,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useUserActivities } from '@/pages/ProfilePage/hooks/useUserActivities';
import { APP_CONFIG } from '@/firebase';
import { getAvatarGradient, getInitials, cn } from '@/utils/cn';
import { toast } from '@/components/shared/Toast';
import { dkmhApiEnabled, ensureDkmhSession, fetchDkmhApi } from '@/services/dkmhService';

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function parseVnDate(dateStr?: string): Date {
  if (!dateStr) return new Date(NaN);
  const parts = dateStr.split('/');
  if (parts.length !== 3) return new Date(NaN);
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

interface OsApp {
  id: string;
  name: string;
  desc: string;
  to: string;
  icon: typeof LayoutGrid;
  gradient: string;
  glow: string;
  badge?: string;
}

export function HomeView() {
  const { currentUser, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  usePageTracking('home');
  const now = useNow();

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [opening, setOpening] = useState<OsApp | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [nextClass, setNextClass] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);

  const semester = APP_CONFIG.defaultSemester;
  const { finalScore, approvedCount, loading: drlLoading } = useUserActivities(currentUser, semester);

  useEffect(() => {
    let cancelled = false;
    async function loadToday() {
      if (!dkmhApiEnabled()) return;
      if (!(await ensureDkmhSession())) return;
      try {
        const res = (await fetchDkmhApi('/api/dkmh/tkb')) as {
          data?: { ds_tuan_tkb?: Array<{ ngay_bat_dau?: string; ngay_ket_thuc?: string; ds_thoi_khoa_bieu?: Array<{ thu_kieu_so?: number; tiet_bat_dau?: number; so_tiet?: number; ten_mon?: string; is_nghi_day?: boolean }> }> };
        };
        const weeks = res.data?.ds_tuan_tkb || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const week = weeks.find((w) => {
          const s = parseVnDate(w.ngay_bat_dau);
          const e = parseVnDate(w.ngay_ket_thuc);
          return !isNaN(s.getTime()) && !isNaN(e.getTime()) && today >= s && today <= e;
        });
        if (!week || cancelled) return;
        const dow = new Date().getDay();
        const thuKieuSo = dow === 0 ? 8 : dow + 1;
        const list = (week.ds_thoi_khoa_bieu || [])
          .filter((c) => c.thu_kieu_so === thuKieuSo && !c.is_nghi_day)
          .sort((a, b) => (a.tiet_bat_dau ?? 0) - (b.tiet_bat_dau ?? 0));
        setTodayCount(list.length);
        setNextClass(list[0]?.ten_mon ?? null);
      } catch {
        /* im lặng — widget TKB chỉ là tiện ích phụ */
      }
    }
    void loadToday();
    return () => {
      cancelled = true;
    };
  }, []);

  const apps: OsApp[] = useMemo(
    () => [
      {
        id: 'rooms',
        name: 'Phòng',
        desc: 'Hoạt động lớp',
        to: '/rooms',
        icon: LayoutGrid,
        gradient: 'from-[#3390ec] to-[#4fc3f7]',
        glow: 'shadow-[#3390ec]/30',
        badge: undefined,
      },
      {
        id: 'tkb',
        name: 'TKB',
        desc: 'Thời khóa biểu',
        to: '/tkb',
        icon: CalendarClock,
        gradient: 'from-[#34ab60] to-[#4ade80]',
        glow: 'shadow-[#34ab60]/30',
        badge: todayCount !== null ? (todayCount > 0 ? `${todayCount} tiết` : 'Nghỉ') : undefined,
      },
      {
        id: 'drl',
        name: 'DRL',
        desc: 'Điểm rèn luyện',
        to: '/drl',
        icon: Award,
        gradient: 'from-[#f5a623] to-[#f97316]',
        glow: 'shadow-[#f5a623]/30',
        badge: !drlLoading ? `${finalScore}đ` : undefined,
      },
      {
        id: 'gallery',
        name: 'Kỷ niệm',
        desc: 'Phòng trưng bày',
        to: '/gallery',
        icon: Images,
        gradient: 'from-[#ec4899] to-[#f97316]',
        glow: 'shadow-[#ec4899]/30',
        badge: undefined,
      },
      {
        id: 'profile',
        name: 'Hồ sơ',
        desc: 'Cá nhân',
        to: '/profile',
        icon: User,
        gradient: 'from-[#8b5cf6] to-[#d946ef]',
        glow: 'shadow-[#8b5cf6]/30',
        badge: undefined,
      },
      ...(isAdmin
        ? [
            {
              id: 'admin',
              name: 'Admin',
              desc: 'Quản trị',
              to: '/admin',
              icon: ShieldCheck,
              gradient: 'from-[#e53935] to-[#f43f5e]',
              glow: 'shadow-[#e53935]/30',
              badge: undefined,
            } as OsApp,
          ]
        : []),
    ],
    [todayCount, finalScore, drlLoading, isAdmin],
  );

  const filtered = apps.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()));

  const openApp = (app: OsApp) => {
    if (editing) {
      setEditing(false);
      return;
    }
    setOpening(app);
    setTimeout(() => navigate(app.to), 320);
  };

  const startPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      setEditing(true);
      navigator.vibrate?.(30);
    }, 550);
  };

  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast('Đã đăng xuất an toàn. Hẹn gặp lại bạn!', 'success');
      navigate('/login');
    } catch {
      toast('Đăng xuất thất bại. Vui lòng thử lại.', 'error');
    }
  };

  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const secs = now.getSeconds();
  const mins = now.getMinutes() + secs / 60;
  const hours = (now.getHours() % 12) + mins / 60;
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div
      className="min-h-[100dvh] bg-[#e7ebf0] dark:bg-[#0e1621] flex justify-center"
      onClick={() => editing && setEditing(false)}
    >
      <div className="w-full max-w-[430px] min-h-[100dvh] relative overflow-hidden bg-gradient-to-b from-[#dbeafe] via-[#e7ebf0] to-[#e7ebf0] dark:from-[#0b1220] dark:via-[#0e1621] dark:to-[#0e1621] sm:my-4 sm:min-h-[calc(100dvh-2rem)] sm:rounded-[2.5rem] sm:border sm:border-black/10 sm:dark:border-white/10 sm:shadow-2xl flex flex-col">
        <div aria-hidden className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#3390ec]/20 blur-3xl" />
        <div aria-hidden className="absolute top-40 -right-24 w-72 h-72 rounded-full bg-[#8b5cf6]/15 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between px-6 pt-4 text-[12px] font-semibold text-black dark:text-white">
          <span>{timeStr}</span>
          <div className="w-24 h-6 rounded-full bg-black dark:bg-white/10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20" />
          </div>
          <div className="flex items-center gap-1.5">
            <Signal size={13} />
            <Wifi size={13} />
            <BatteryFull size={15} />
          </div>
        </div>

        <div className="relative z-10 px-5 pt-3 flex items-center gap-3">
          <div
            className={cn(
              'w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[15px] font-bold shrink-0',
              getAvatarGradient(currentUser?.email ?? 'u'),
            )}
          >
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(currentUser?.displayName || currentUser?.email || '?')
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6] capitalize">{dateStr}</p>
            <h1 className="text-[16px] font-extrabold text-black dark:text-white truncate">
              Chào, {(currentUser?.displayName || currentUser?.email?.split('@')[0] || 'bạn').split(' ').slice(-2).join(' ')}
            </h1>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTheme();
            }}
            className="p-2.5 rounded-full bg-white/70 dark:bg-white/10 text-[#707579] dark:text-[#9aa0a6]"
            aria-label="Đổi giao diện"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleLogout();
            }}
            className="p-2.5 rounded-full bg-white/70 dark:bg-white/10 text-[#707579] dark:text-[#9aa0a6]"
            aria-label="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        </div>

        <div className="relative z-10 px-5 pt-4">
          <div className="rounded-[1.75rem] bg-white/80 dark:bg-white/[0.07] backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 shadow-lg overflow-hidden">
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="4" className="text-black dark:text-white" />
                  {Array.from({ length: 12 }, (_, i) => {
                    const a = (i * 30 * Math.PI) / 180;
                    const x1 = 50 + 40 * Math.sin(a);
                    const y1 = 50 - 40 * Math.cos(a);
                    const x2 = 50 + 44 * Math.sin(a);
                    const y2 = 50 - 44 * Math.cos(a);
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity="0.4" strokeWidth={i % 3 === 0 ? 3 : 1.5} className="text-black dark:text-white" />;
                  })}
                  <line x1="50" y1="50" x2={50 + 22 * Math.sin((hours * 30 * Math.PI) / 180)} y2={50 - 22 * Math.cos((hours * 30 * Math.PI) / 180)} stroke="#3390ec" strokeWidth="5" strokeLinecap="round" />
                  <line x1="50" y1="50" x2={50 + 32 * Math.sin((mins * 6 * Math.PI) / 180)} y2={50 - 32 * Math.cos((mins * 6 * Math.PI) / 180)} stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" className="text-black dark:text-white" />
                  <line
                    x1={50 - 9 * Math.sin((secs * 6 * Math.PI) / 180)}
                    y1={50 + 9 * Math.cos((secs * 6 * Math.PI) / 180)}
                    x2={50 + 36 * Math.sin((secs * 6 * Math.PI) / 180)}
                    y2={50 - 36 * Math.cos((secs * 6 * Math.PI) / 180)}
                    stroke="#e53935"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="50" cy="50" r="3.5" fill="#e53935" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[44px] leading-none font-extrabold tracking-tight text-black dark:text-white tabular-nums">
                  {timeStr}
                </p>
                <p className="text-[12.5px] font-medium text-[#707579] dark:text-[#9aa0a6] mt-1 capitalize">{dateStr}</p>
                <p className="text-[12px] font-semibold text-[#3390ec] mt-1">
                  {todayCount !== null
                    ? todayCount > 0
                      ? `${todayCount} tiết hôm nay${nextClass ? ` · ${nextClass}` : ''}`
                      : 'Hôm nay được nghỉ'
                    : `DRL ${semester}: ${drlLoading ? '…' : `${finalScore}đ · ${approvedCount} HĐ`}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-5 pt-4" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707579]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm ứng dụng..."
              className="w-full h-11 pl-11 pr-9 rounded-2xl bg-white/80 dark:bg-white/[0.07] backdrop-blur-xl border border-black/5 dark:border-white/10 text-[13.5px] text-black dark:text-white placeholder:text-[#707579]/70 outline-none focus:ring-2 focus:ring-[#3390ec]/40"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/10 dark:bg-white/15" aria-label="Xóa tìm kiếm">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10 px-5 pt-4 flex-1">
          {editing && (
            <p className="text-center text-[11.5px] font-semibold text-[#707579] dark:text-[#9aa0a6] mb-2">
              Nhấn giữ để sắp xếp · Chạm để mở
            </p>
          )}
          <div className={cn('grid gap-4', filtered.length > 4 ? 'grid-cols-4' : 'grid-cols-4')}>
            {filtered.map((app) => (
              <motion.button
                key={app.id}
                whileTap={{ scale: 0.85 }}
                animate={editing ? { rotate: [0, -2.5, 2.5, 0] } : { rotate: 0 }}
                transition={editing ? { repeat: Infinity, duration: 0.4 } : { duration: 0.15 }}
                onClick={(e) => {
                  e.stopPropagation();
                  openApp(app);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEditing(true);
                }}
                onTouchStart={startPress}
                onTouchEnd={cancelPress}
                onTouchMove={cancelPress}
                onMouseDown={startPress}
                onMouseUp={cancelPress}
                onMouseLeave={cancelPress}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span className="relative">
                  <span className={cn('w-16 h-16 rounded-[1.15rem] bg-gradient-to-br flex items-center justify-center text-white shadow-lg active:scale-95 transition', app.gradient, app.glow)}>
                    <app.icon size={26} strokeWidth={2.2} />
                  </span>
                  {app.badge && (
                    <span className="absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full bg-[#e53935] text-white text-[9.5px] font-extrabold shadow whitespace-nowrap">
                      {app.badge}
                    </span>
                  )}
                  {editing && (
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#e53935] text-white flex items-center justify-center shadow">
                      <X size={12} />
                    </span>
                  )}
                </span>
                <span className="text-[11.5px] font-semibold text-black dark:text-white">{app.name}</span>
              </motion.button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-[13px] text-[#707579] dark:text-[#9aa0a6] py-8">
              Không tìm thấy ứng dụng “{query}”.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={() => navigate('/tkb')}
              className="p-3.5 rounded-3xl bg-white/80 dark:bg-white/[0.07] backdrop-blur-xl border border-black/5 dark:border-white/10 text-left active:scale-[0.98] transition"
            >
              <CalendarClock size={18} className="text-[#34ab60]" />
              <p className="text-[12.5px] font-bold text-black dark:text-white mt-1.5">Hôm nay</p>
              <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6] truncate">
                {todayCount !== null ? (todayCount > 0 ? `${todayCount} tiết · ${nextClass ?? ''}` : 'Không có tiết học') : 'Chưa liên kết DKMH'}
              </p>
            </button>
            <button
              onClick={() => navigate('/drl')}
              className="p-3.5 rounded-3xl bg-white/80 dark:bg-white/[0.07] backdrop-blur-xl border border-black/5 dark:border-white/10 text-left active:scale-[0.98] transition"
            >
              <Award size={18} className="text-[#f5a623]" />
              <p className="text-[12.5px] font-bold text-black dark:text-white mt-1.5">Điểm rèn luyện</p>
              <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6]">
                {drlLoading ? 'Đang tính…' : `${finalScore}/100 · ${approvedCount} hoạt động`}
              </p>
            </button>
          </div>
        </div>

        <div className="relative z-10 px-5 pb-2 pt-4">
          <div className="rounded-[1.75rem] bg-white/70 dark:bg-white/[0.06] backdrop-blur-2xl border border-black/5 dark:border-white/10 px-4 py-3 flex items-center justify-around shadow-lg">
            {apps.slice(0, 4).map((app) => (
              <button
                key={app.id}
                onClick={() => openApp(app)}
                className="flex flex-col items-center gap-1 p-1 active:scale-90 transition"
                aria-label={app.name}
              >
                <span className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow', app.gradient)}>
                  <app.icon size={22} />
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-32 h-[5px] rounded-full bg-black/70 dark:bg-white/70" />
          </div>
        </div>

        <AnimatePresence>
          {opening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className={cn('w-20 h-20 rounded-[1.4rem] bg-gradient-to-br flex items-center justify-center text-white shadow-2xl', opening.gradient)}
              >
                <opening.icon size={36} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

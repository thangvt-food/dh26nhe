import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  EllipsisVertical,
  LayoutGrid,
  List,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  User,
  Users,
  X,
} from 'lucide-react';
import { usePageTracking } from '@/hooks/usePageTracking';
import { DkmhLoginCard } from '@/components/shared/DkmhLoginCard';
import { FloatingHomeButton } from '@/components/shared/FloatingHomeButton';
import {
  SESSION_EXPIRED_MESSAGE,
  WORKER_MISSING_MESSAGE,
  clearDkmhAuth,
  dkmhApiEnabled,
  ensureDkmhSession,
  fetchDkmhApi,
  getDkmhAuth,
  getExportIcsHref,
} from '@/services/dkmhService';
import { toast } from '@/components/shared/Toast';
import { cn } from '@/utils/cn';

/** Palette Google Calendar — rõ, sạch, không lòe loẹt */
const GCAL_COLORS = [
  { hex: '#039BE5', fg: '#ffffff' }, // peacock
  { hex: '#3F51B5', fg: '#ffffff' }, // blueberry
  { hex: '#0B8043', fg: '#ffffff' }, // basil
  { hex: '#33B679', fg: '#0b3d24' }, // sage
  { hex: '#8E24AA', fg: '#ffffff' }, // grape
  { hex: '#E67C73', fg: '#4a100c' }, // flamingo
  { hex: '#F4511E', fg: '#ffffff' }, // tangerine
  { hex: '#F09000', fg: '#3c2a00' }, // banana (đậm hóa cho đủ tương phản)
];

const TIME_SLOT_HOURS: Record<number, { start: string; end: string }> = {
  1: { start: '07:00', end: '07:45' },
  2: { start: '07:50', end: '08:35' },
  3: { start: '08:40', end: '09:25' },
  4: { start: '09:35', end: '10:20' },
  5: { start: '10:25', end: '11:10' },
  6: { start: '11:15', end: '12:00' },
  7: { start: '12:45', end: '13:30' },
  8: { start: '13:35', end: '14:20' },
  9: { start: '14:25', end: '15:10' },
  10: { start: '15:20', end: '16:05' },
  11: { start: '16:10', end: '16:55' },
  12: { start: '17:00', end: '17:45' },
  13: { start: '17:45', end: '18:30' },
  14: { start: '18:35', end: '19:20' },
  15: { start: '19:25', end: '20:10' },
};

type TkbViewMode = 'grid' | 'cards';
const VIEW_KEY = 'dh26nhe-tkb-view';

interface TkbClass {
  ma_mon?: string;
  ten_mon?: string;
  ten_mon_eg?: string;
  ma_phong?: string;
  ten_giang_vien?: string;
  ma_lop?: string;
  ten_lop?: string;
  ma_nhom?: string;
  so_tin_chi?: number;
  thu_kieu_so?: number;
  tiet_bat_dau?: number;
  so_tiet?: number;
  ngay_hoc?: string;
  is_nghi_day?: boolean;
  is_day_bu?: boolean;
}

interface TkbWeek {
  thong_tin_tuan?: string;
  ngay_bat_dau?: string;
  ngay_ket_thuc?: string;
  ds_thoi_khoa_bieu?: TkbClass[];
}

function parseVnDate(dateStr?: string): Date {
  if (!dateStr) return new Date(NaN);
  const parts = dateStr.split('/');
  if (parts.length !== 3) return new Date(NaN);
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
}

const DAYS = [
  { num: 2, short: 'T2', label: 'Thứ Hai' },
  { num: 3, short: 'T3', label: 'Thứ Ba' },
  { num: 4, short: 'T4', label: 'Thứ Tư' },
  { num: 5, short: 'T5', label: 'Thứ Năm' },
  { num: 6, short: 'T6', label: 'Thứ Sáu' },
  { num: 7, short: 'T7', label: 'Thứ Bảy' },
  { num: 8, short: 'CN', label: 'Chủ Nhật' },
];

const todayDayNum = () => {
  const dow = new Date().getDay();
  return dow === 0 ? 8 : dow + 1;
};

const SLOT_HEIGHT = 52;

export function TkbView() {
  usePageTracking('tkb');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [locked, setLocked] = useState(() => !getDkmhAuth()?.token);
  const [exportHref, setExportHref] = useState(getExportIcsHref());
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedClass, setSelectedClass] = useState<TkbClass | null>(null);
  const [hocKyList, setHocKyList] = useState<Array<{ hoc_ky: number; ten_hoc_ky: string }>>([]);
  const [hocKy, setHocKy] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<TkbViewMode>(() => {
    const v = localStorage.getItem(VIEW_KEY);
    return v === 'cards' ? 'cards' : 'grid';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const hocKyRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, viewMode);
  }, [viewMode]);

  const loadTkb = async (hk?: number) => {
    if (!dkmhApiEnabled()) {
      setLoading(false);
      setAuthError(WORKER_MISSING_MESSAGE);
      return;
    }
    if (!getDkmhAuth()?.token) {
      // Token bị reset → thử auto re-login từ credentials đã lưu trên máy
      const restored = await ensureDkmhSession();
      if (!restored) {
        setLoading(false);
        setLocked(true);
        return;
      }
    }
    const target = typeof hk === 'number' ? hk : (hocKyRef.current ?? undefined);
    setLoading(true);
    setAuthError('');
    try {
      const result = (await fetchDkmhApi('/api/dkmh/tkb', target ? { hoc_ky: target } : {})) as {
        data?: Record<string, unknown>;
        error?: string;
      };
      if (result.data) {
        setData(result.data);
        setLocked(false);
        const chosen = (result.data.hoc_ky_da_chon as number | undefined) ?? target ?? null;
        setHocKy(chosen);
        hocKyRef.current = chosen;
        setHocKyList((result.data.ds_hoc_ky as typeof hocKyList) || []);
        setExportHref(getExportIcsHref(chosen ?? undefined));
        const weeks = (result.data.ds_tuan_tkb as TkbWeek[]) || [];
        const now = new Date();
        const weekIndex = weeks.findIndex((w) => {
          const start = parseVnDate(w.ngay_bat_dau);
          const end = parseVnDate(w.ngay_ket_thuc);
          end.setHours(23, 59, 59);
          return now >= start && now <= end;
        });
        setCurrentWeek(weekIndex !== -1 ? weekIndex : 0);
      } else if (result.error) {
        setAuthError(result.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu';
      setAuthError(msg);
      if (msg === SESSION_EXPIRED_MESSAGE) setLocked(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTkb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekList = ((data?.ds_tuan_tkb as TkbWeek[]) || []) as TkbWeek[];
  const activeWeekObj = weekList[currentWeek] || null;
  const weekClasses: TkbClass[] = activeWeekObj?.ds_thoi_khoa_bieu || [];
  const timeSlots = (data?.ds_tiet_trong_ngay as Array<{ tiet?: number; gio_bat_dau?: string; gio_ket_thuc?: string }>) || [];
  const activeClasses = weekClasses.filter((c) => !c.is_nghi_day);

  const slotTimeMap = useMemo(() => {
    const map: Record<number, { start: string; end: string }> = { ...TIME_SLOT_HOURS };
    for (const s of timeSlots) {
      if (s?.tiet && (s.gio_bat_dau || s.gio_ket_thuc)) {
        map[s.tiet] = { start: s.gio_bat_dau || '', end: s.gio_ket_thuc || '' };
      }
    }
    return map;
  }, [timeSlots]);
  const slotCount = timeSlots.length || 15;

  const getClassesForDay = (day: number) =>
    weekClasses.filter((item) => item.thu_kieu_so === day).sort((a, b) => (a.tiet_bat_dau ?? 0) - (b.tiet_bat_dau ?? 0));

  const isCurrentDay = (day: number) => todayDayNum() === day;

  const dayDates = useMemo(() => {
    if (!activeWeekObj?.ngay_bat_dau) return {} as Record<number, string>;
    const startDate = parseVnDate(activeWeekObj.ngay_bat_dau);
    const map: Record<number, string> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      map[i + 2] = `${d.getDate()}/${d.getMonth() + 1}`;
    }
    return map;
  }, [activeWeekObj]);

  const subjectColorIndex = useMemo(() => {
    const map: Record<string, number> = {};
    let counter = 0;
    weekClasses.forEach((c) => {
      if (c.ma_mon && !(c.ma_mon in map)) {
        map[c.ma_mon] = counter % GCAL_COLORS.length;
        counter++;
      }
    });
    return map;
  }, [weekClasses]);

  const getColor = (maMon?: string) => GCAL_COLORS[subjectColorIndex[maMon ?? ''] ?? 0];

  const weekLabel = useMemo(() => {
    const tuanMatch = activeWeekObj?.thong_tin_tuan?.match(/Tuần\s*\d+/i);
    const s = dayDates[2];
    const e = dayDates[8];
    const range = s && e ? `${s} – ${e}` : '';
    return [tuanMatch?.[0], range].filter(Boolean).join(' · ');
  }, [activeWeekObj, dayDates]);

  const jumpToThisWeek = () => {
    const now = new Date();
    const idx = weekList.findIndex((w) => {
      const start = parseVnDate(w.ngay_bat_dau);
      const end = parseVnDate(w.ngay_ket_thuc);
      end.setHours(23, 59, 59);
      return now >= start && now <= end;
    });
    if (idx !== -1) setCurrentWeek(idx);
  };

  const handleLogoutDkmh = () => {
    clearDkmhAuth();
    setLocked(true);
    setData(null);
    setAuthError('');
    toast('Đã đăng xuất DKMH trên máy này.', 'info');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0e1621] pb-20 md:pb-8">
      {/* Header GCal */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#212121] border-b border-[#dadce0] dark:border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-1.5 px-3 md:px-6 h-14">
            <h1 className="text-[19px] font-medium text-[#3c4043] dark:text-white mr-auto tracking-tight">
              Lịch học
            </h1>
            {/* Chế độ xem */}
            <div className="flex items-center rounded-full border border-[#dadce0] dark:border-white/20 overflow-hidden mr-1" role="group" aria-label="Chế độ hiển thị">
              <button
                onClick={() => setViewMode('grid')}
                title="Xem cột tuần"
                aria-label="Xem cột tuần"
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-[#e8f0fe] dark:bg-[#1a73e8]/30 text-[#1a73e8] dark:text-[#8ab4f8]'
                    : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10',
                )}
              >
                <LayoutGrid size={17} />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                title="Xem danh sách thẻ"
                aria-label="Xem danh sách thẻ"
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'cards'
                    ? 'bg-[#e8f0fe] dark:bg-[#1a73e8]/30 text-[#1a73e8] dark:text-[#8ab4f8]'
                    : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10',
                )}
              >
                <List size={17} />
              </button>
            </div>
            <button
              onClick={() => void loadTkb()}
              disabled={loading}
              className="p-2 rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
              title="Làm mới"
              aria-label="Làm mới"
            >
              <RefreshCw size={19} className={loading ? 'animate-spin' : ''} />
            </button>
            {/* Menu tùy chọn: học kỳ / xuất .ics / đăng xuất */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Tùy chọn khác"
              title="Tùy chọn khác"
            >
              <EllipsisVertical size={19} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-3 top-12 z-50 w-64 max-h-[70vh] overflow-y-auto rounded-xl bg-white dark:bg-[#2b2d31] border border-[#dadce0] dark:border-white/10 shadow-xl py-1.5">
                  <p className="px-4 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-[#5f6368] dark:text-[#9aa0a6]">
                    Học kỳ
                  </p>
                  {hocKyList.length === 0 && (
                    <p className="px-4 py-1.5 text-[13px] text-[#80868b] dark:text-[#6b7280]">Đang tải học kỳ…</p>
                  )}
                  {hocKyList.map((h) => (
                    <button
                      key={h.hoc_ky}
                      onClick={() => {
                        setMenuOpen(false);
                        void loadTkb(h.hoc_ky);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left text-[13.5px] text-[#3c4043] dark:text-[#e8eaed] hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Check size={15} className={cn('shrink-0', hocKy === h.hoc_ky ? 'text-[#1a73e8]' : 'opacity-0')} />
                      <span className="truncate">{h.ten_hoc_ky}</span>
                    </button>
                  ))}
                  <div className="my-1.5 border-t border-[#dadce0]/70 dark:border-white/10" />
                  <a
                    href={exportHref}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-medium text-[#3c4043] dark:text-[#e8eaed] hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <Download size={17} className="text-[#5f6368] dark:text-[#9aa0a6]" />
                    Xuất Calendar (.ics)
                  </a>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void loadTkb();
                    }}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13.5px] font-medium text-[#3c4043] dark:text-[#e8eaed] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={17} className="animate-spin text-[#1a73e8]" /> : <RefreshCw size={17} className="text-[#5f6368] dark:text-[#9aa0a6]" />}
                    Làm mới
                  </button>
                  {!locked && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogoutDkmh();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13.5px] font-medium text-[#c5221f] dark:text-[#f28b82] hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <LogOut size={17} />
                      Đăng xuất DKMH
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Week nav */}
          <div className="flex items-center gap-1 px-3 md:px-6 pb-2">
            <button
              onClick={() => setCurrentWeek((p) => Math.max(0, p - 1))}
              disabled={currentWeek === 0}
              className="p-2 rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
              aria-label="Tuần trước"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-[15px] font-medium text-[#3c4043] dark:text-white tabular-nums">
              {weekLabel || '—'}
            </span>
            <button
              onClick={() => setCurrentWeek((p) => Math.min(weekList.length - 1, p + 1))}
              disabled={currentWeek >= weekList.length - 1}
              className="p-2 rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
              aria-label="Tuần tiếp theo"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={jumpToThisWeek}
              className="ml-2 h-8 px-3.5 rounded-full border border-[#dadce0] dark:border-white/20 text-[13px] font-medium text-[#3c4043] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1.5"
            >
              <CalendarCheck size={15} className="text-[#1a73e8]" />
              Hôm nay
            </button>
            <span className="ml-auto text-[12px] text-[#5f6368] dark:text-[#9aa0a6] hidden sm:block">
              {activeClasses.length} buổi trong tuần
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        {authError && !data ? (
          <div className="p-4 md:p-6">
            <div className="p-4 rounded-xl bg-[#fce8e6] dark:bg-[#e53935]/15 text-[#c5221f] dark:text-[#f28b82] text-[13.5px] font-medium mb-4">
              {authError}
            </div>
            <DkmhLoginCard
              compact
              onSuccess={() => {
                setLocked(false);
                void loadTkb();
              }}
            />
          </div>
        ) : locked ? (
          <div className="p-4 md:p-6 max-w-lg">
            <DkmhLoginCard
              compact
              onSuccess={() => {
                setLocked(false);
                void loadTkb();
              }}
            />
          </div>
        ) : loading ? (
          <div className="p-4 md:p-6 space-y-3">
            <div className="h-12 rounded-full bg-black/5 dark:bg-white/5 animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          /* ── GRID: lưới cột đủ 7 ngày, vừa khít 1 màn hình không cuộn ngang ── */
          <div className="md:p-6">
            {/* Day header sticky */}
            <div className="grid grid-cols-[34px_repeat(7,1fr)] md:grid-cols-[64px_repeat(7,minmax(0,1fr))] sticky top-[100px] z-20 bg-white dark:bg-[#212121] border-b border-[#dadce0] dark:border-white/10">
              <div className="flex items-end justify-center pb-2 pt-3">
                <span className="text-[9.5px] md:text-[11px] font-medium uppercase tracking-wide text-[#5f6368] dark:text-[#9aa0a6]">Tiết</span>
              </div>
              {DAYS.map(({ num, short, label }) => {
                const dateNum = dayDates[num]?.split('/')[0] ?? '';
                const today = isCurrentDay(num);
                return (
                  <div key={num} className="flex flex-col items-center py-2 border-l border-[#dadce0] dark:border-white/10 min-w-0">
                    <span className={cn('text-[9.5px] md:text-[11px] font-medium uppercase tracking-wide', today ? 'text-[#1a73e8] dark:text-[#8ab4f8]' : 'text-[#5f6368] dark:text-[#9aa0a6]')}>
                      <span className="md:hidden">{short}</span>
                      <span className="hidden md:inline">{label}</span>
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 md:mt-1 w-6 h-6 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[11px] md:text-[15px] font-medium tabular-nums',
                        today ? 'bg-[#1a73e8] text-white' : 'text-[#202124] dark:text-[#e8eaed]',
                      )}
                    >
                      {dateNum}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid body */}
            <div className="grid grid-cols-[34px_repeat(7,1fr)] md:grid-cols-[64px_repeat(7,minmax(0,1fr))] relative">
              {/* Time column sticky-left */}
              <div className="sticky left-0 z-10 bg-white dark:bg-[#212121] border-r border-[#dadce0] dark:border-white/10">
                {Array.from({ length: slotCount }, (_, i) => i + 1).map((slot) => (
                  <div
                    key={slot}
                    style={{ height: `${SLOT_HEIGHT}px` }}
                    className="flex flex-col items-center justify-center border-b border-[#dadce0]/50 dark:border-white/5"
                  >
                    <span className="text-[9.5px] md:text-[11px] font-semibold text-[#3c4043] dark:text-[#9aa0a6]">{slot}</span>
                    <span className="text-[7.5px] md:text-[9px] text-[#80868b] dark:text-[#6b7280] tabular-nums leading-tight">{slotTimeMap[slot]?.start ?? ''}</span>
                  </div>
                ))}
              </div>
              {DAYS.map(({ num }) => {
                const dayClasses = getClassesForDay(num);
                const today = isCurrentDay(num);
                return (
                  <div
                    key={num}
                    className={cn(
                      'relative border-r border-[#dadce0] dark:border-white/10 last:border-r-0 min-w-0',
                      today && 'bg-[#1a73e8]/[0.03] dark:bg-[#8ab4f8]/[0.05]',
                    )}
                    style={{
                      height: `${slotCount * SLOT_HEIGHT}px`,
                      backgroundImage: 'linear-gradient(to bottom, rgba(128,134,139,0.18) 1px, transparent 1px)',
                      backgroundSize: `100% ${SLOT_HEIGHT}px`,
                    }}
                  >
                    {dayClasses.map((item, idx) => {
                      const color = getColor(item.ma_mon);
                      const start = item.tiet_bat_dau ?? 1;
                      const duration = item.so_tiet ?? 1;
                      const isNghi = !!item.is_nghi_day;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedClass(item)}
                          style={{
                            top: `${(start - 1) * SLOT_HEIGHT + 2}px`,
                            height: `${duration * SLOT_HEIGHT - 5}px`,
                            left: '1px',
                            right: '1px',
                            backgroundColor: isNghi ? undefined : color.hex,
                            color: isNghi ? '#5f6368' : color.fg,
                          }}
                          className={cn(
                            'absolute rounded md:rounded-lg px-0.5 md:px-2 py-0.5 md:py-1 text-left overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border',
                            isNghi
                              ? 'bg-black/[0.06] dark:bg-white/10 border-[#dadce0] dark:border-white/20'
                              : 'border-black/10',
                          )}
                          title={`${item.ten_mon} — Tiết ${start}–${start + duration - 1}, ${item.ma_phong ?? ''}`}
                        >
                          <p className={cn('text-[9px] md:text-[11.5px] font-semibold leading-[1.15] line-clamp-2', isNghi && 'line-through')}>
                            {item.ten_mon}
                          </p>
                          <p className="text-[8px] md:text-[10px] font-medium leading-tight mt-0.5 opacity-90 truncate">
                            {slotTimeMap[start]?.start ?? ''}
                            {item.ma_phong ? ` · ${item.ma_phong}` : ''}
                            {isNghi && ' · NGHỈ'}
                            {!isNghi && !!item.is_day_bu && ' · BÙ'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── CARDS: danh sách thẻ theo ngày (GCal Schedule) ── */
          <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
            {DAYS.map(({ num, label }) => {
              const dayClasses = getClassesForDay(num);
              const today = isCurrentDay(num);
              return (
                <div key={num}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-[13.5px] font-medium text-[#3c4043] dark:text-[#e8eaed]">{label}</span>
                    {dayDates[num] && <span className="text-[13px] text-[#5f6368] dark:text-[#9aa0a6] tabular-nums">{dayDates[num]}</span>}
                    {today && (
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[#1a73e8] dark:text-[#8ab4f8]">Hôm nay</span>
                    )}
                    <span className="ml-auto text-[12px] text-[#5f6368] dark:text-[#9aa0a6]">
                      {dayClasses.filter((c) => !c.is_nghi_day).length} buổi
                    </span>
                  </div>
                  {dayClasses.length === 0 ? (
                    <p className="text-[12.5px] text-[#80868b] dark:text-[#6b7280] py-1.5">Không có tiết học</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {dayClasses.map((item, idx) => {
                        const color = getColor(item.ma_mon);
                        const start = item.tiet_bat_dau ?? 1;
                        const duration = item.so_tiet ?? 1;
                        const startInfo = slotTimeMap[start];
                        const endInfo = slotTimeMap[start + duration - 1];
                        const isNghi = !!item.is_nghi_day;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedClass(item)}
                            className={cn(
                              'w-full text-left rounded-xl bg-white dark:bg-[#212121] border border-[#dadce0] dark:border-white/10 shadow-sm overflow-hidden flex active:scale-[0.99] transition',
                              isNghi && 'opacity-80',
                            )}
                          >
                            <span className="w-1.5 shrink-0" style={{ backgroundColor: isNghi ? '#9aa0a6' : color.hex }} />
                            <span className="flex-1 px-3.5 py-3 min-w-0">
                              <span className="flex items-start justify-between gap-2">
                                <span className={cn('text-[14px] font-semibold text-[#202124] dark:text-white leading-snug', isNghi && 'line-through decoration-[#9aa0a6]')}>
                                  {item.ten_mon}
                                </span>
                                {isNghi && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f1f3f4] dark:bg-white/10 text-[#5f6368] dark:text-[#9aa0a6] shrink-0">
                                    NGHỈ
                                  </span>
                                )}
                                {!isNghi && !!item.is_day_bu && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#feefc3] dark:bg-[#f9ab00]/25 text-[#7c5a00] dark:text-[#fdd663] shrink-0">
                                    HỌC BÙ
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-1.5 mt-1 text-[12.5px] font-medium tabular-nums" style={{ color: isNghi ? '#5f6368' : color.hex }}>
                                <Clock size={12} />
                                {startInfo?.start ?? '--'} – {endInfo?.end ?? '--'} · Tiết {start}-{start + duration - 1}
                              </span>
                              <span className="flex items-center gap-2.5 mt-1 text-[12px] text-[#5f6368] dark:text-[#9aa0a6]">
                                {item.ma_phong && (
                                  <span className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    {item.ma_phong}
                                  </span>
                                )}
                                {item.ten_giang_vien && <span className="truncate">{item.ten_giang_vien}</span>}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal — bottom sheet mobile / dialog desktop (GCal style) */}
      {selectedClass && (
        <div
          className="fixed inset-0 z-[1500] flex items-end sm:items-center justify-center sm:p-4 bg-black/50"
          onClick={() => setSelectedClass(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-[#212121] sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: getColor(selectedClass.ma_mon).hex }} />
                  <div className="min-w-0">
                    <h3 className="text-[19px] font-semibold text-[#202124] dark:text-white leading-snug">
                      {selectedClass.ten_mon}
                    </h3>
                    {selectedClass.ten_mon_eg && (
                      <p className="text-[12.5px] text-[#5f6368] dark:text-[#9aa0a6] italic mt-0.5">{selectedClass.ten_mon_eg}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="p-2 -mr-1 rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Đóng"
                >
                  <X size={19} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(() => {
                  const start = selectedClass.tiet_bat_dau ?? 1;
                  const duration = selectedClass.so_tiet ?? 1;
                  const isNghi = !!selectedClass.is_nghi_day;
                  return (
                    <>
                      <span className="text-[12px] font-bold px-2 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/10 text-[#3c4043] dark:text-[#e8eaed]">
                        Tiết {start} – {start + duration - 1}
                      </span>
                      {isNghi && <span className="text-[12px] font-bold px-2 py-0.5 rounded-md bg-[#fce8e6] dark:bg-[#e53935]/20 text-[#c5221f] dark:text-[#f28b82]">Được nghỉ</span>}
                      {!isNghi && !!selectedClass.is_day_bu && <span className="text-[12px] font-bold px-2 py-0.5 rounded-md bg-[#feefc3] dark:bg-[#f9ab00]/25 text-[#7c5a00] dark:text-[#fdd663]">Học bù</span>}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="px-5 pb-5 space-y-3.5 border-t border-[#dadce0]/60 dark:border-white/10 pt-4">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-[#5f6368] dark:text-[#9aa0a6] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-[#202124] dark:text-[#e8eaed]">
                    {(() => {
                      const start = selectedClass.tiet_bat_dau ?? 1;
                      const duration = selectedClass.so_tiet ?? 1;
                      return `${slotTimeMap[start]?.start ?? '--'} – ${slotTimeMap[start + duration - 1]?.end ?? '--'}`;
                    })()}
                  </p>
                  <p className="text-[11.5px] text-[#5f6368] dark:text-[#9aa0a6]">
                    {DAYS.find((d) => d.num === selectedClass.thu_kieu_so)?.label}
                    {selectedClass.ngay_hoc ? ` · ${selectedClass.ngay_hoc.slice(0, 10).split('-').reverse().join('/')}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-[#5f6368] dark:text-[#9aa0a6] shrink-0" />
                <p className="text-[13.5px] font-medium text-[#202124] dark:text-[#e8eaed]">
                  {selectedClass.ma_phong || 'Chưa có phòng'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <User size={18} className="text-[#5f6368] dark:text-[#9aa0a6] shrink-0" />
                <p className="text-[13.5px] font-medium text-[#202124] dark:text-[#e8eaed] truncate">
                  {selectedClass.ten_giang_vien || 'Chưa phân công'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-[#5f6368] dark:text-[#9aa0a6] shrink-0" />
                <p className="text-[13.5px] font-medium text-[#202124] dark:text-[#e8eaed]">
                  {selectedClass.ma_mon} · {selectedClass.so_tin_chi} tín chỉ
                  {selectedClass.ma_nhom ? ` · Nhóm ${selectedClass.ma_nhom}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Users size={18} className="text-[#5f6368] dark:text-[#9aa0a6] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-[#202124] dark:text-[#e8eaed] truncate">{selectedClass.ma_lop}</p>
                  {selectedClass.ten_lop && <p className="text-[11.5px] text-[#5f6368] dark:text-[#9aa0a6] truncate">{selectedClass.ten_lop}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <FloatingHomeButton />
    </div>
  );
}

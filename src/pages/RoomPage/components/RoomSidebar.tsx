import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2,
  MessageSquare,
  User,
  Settings,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ExternalLink,
  Plus,
  Home,
} from 'lucide-react';
import { SEMESTERS } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from '@/components/shared/Toast';
import { getAvatarGradient, getInitials, cn } from '@/utils/cn';
import type { RoomDefinition, SubmissionStatus } from '@/types/submission.types';

interface Props {
  semester: string;
  onSemesterChange: (semester: string) => void;
  activities: RoomDefinition[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  loading: boolean;
  onClose?: () => void;
  submissionStatuses?: Record<string, { status: SubmissionStatus; points: number }>;
  isMobile?: boolean;
}

function formatTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  if (d.getFullYear() !== now.getFullYear()) return `${dd}/${mm}/${d.getFullYear()}`;
  return `${dd}/${mm}`;
}

const STATUS_TEXT: Record<SubmissionStatus, string> = {
  approved: 'Đã duyệt',
  pending: 'Đang chờ duyệt',
  rejected: 'Từ chối duyệt',
};

function StatusDot({ status }: { status: SubmissionStatus }) {
  const cls =
    status === 'approved'
      ? 'bg-[#34ab60]'
      : status === 'pending'
        ? 'bg-[#f88235]'
        : 'bg-[#ff516a]';
  const Icon = status === 'approved' ? CheckCircle2 : status === 'pending' ? Clock : XCircle;
  const title = status === 'approved' ? 'Đã phê duyệt' : status === 'pending' ? 'Đang chờ duyệt' : 'Không phê duyệt';
  return (
    <span
      className={cn(
        'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center ring-2 ring-white dark:ring-[#17212b]',
        cls,
      )}
      title={title}
    >
      <Icon className="w-3 h-3" />
    </span>
  );
}

export function RoomSidebar({
  semester,
  onSemesterChange,
  activities,
  selectedRoomId,
  onSelectRoom,
  loading,
  onClose,
  submissionStatuses = {},
  isMobile = false,
}: Props) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const term = searchTerm.trim().toLowerCase();
  const filteredActivities = term
    ? activities.filter((a) => a.name.toLowerCase().includes(term))
    : activities;

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await logout();
      navigate('/login');
    } catch {
      toast('Đăng xuất thất bại.', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden bg-white dark:bg-[#17212b] sm:border-r border-black/5 dark:border-white/10">
      {/* Header: brand + suggest + semester pill */}
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 shrink-0">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className={cn(
              'font-extrabold text-[#3390ec] tracking-tight hover:opacity-80 transition-opacity',
              isMobile ? 'text-[22.5px]' : 'text-[25.5px]',
            )}
            style={{ fontFamily: "'Segoe UI', 'Roboto', system-ui, sans-serif", fontWeight: 800, letterSpacing: '-0.3px' }}
            title="Về trang chủ"
          >
            DH26NHE
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className="flex items-center justify-center w-7 h-7 rounded-full text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Về trang chủ"
              title="Về trang chủ"
            >
              <Home className="h-4 w-4" />
            </Link>
            <div className="relative group">
              <button
                onClick={() => toast('Tính năng đề xuất hoạt động đang phát triển.', 'info')}
                className="flex items-center justify-center w-7 h-7 rounded-full text-[#3390ec] bg-[#3390ec]/10 hover:bg-[#3390ec] hover:text-white transition-all"
                aria-label="Đề xuất hoạt động mới"
              >
                <Plus className="h-4 w-4" />
              </button>
              <div className="hidden sm:block absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-black/80 text-white text-[10px] font-medium rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Đề xuất hoạt động mới
              </div>
            </div>
            <select
              value={semester}
              onChange={(e) => onSemesterChange(e.target.value)}
              className="flex items-center h-8 min-w-[52px] px-2 text-[12px] font-bold text-[#3390ec] bg-[#3390ec]/10 rounded-full border-none outline-none cursor-pointer"
              aria-label="Chọn học kỳ"
            >
              {SEMESTERS.map((s) => (
                <option key={s} value={s} className="text-black">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-1.5 pb-1.5 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#3390ec] pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm hoạt động..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-7 pr-3 text-[12px] border-2 border-[#3390ec]/15 bg-black/[0.02] dark:bg-white/5 rounded-full focus:outline-none focus:border-[#3390ec] placeholder:text-[#707579] dark:placeholder:text-[#9aa0a6] text-black dark:text-white transition-colors"
          />
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-[#707579]" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-[#707579] dark:text-[#9aa0a6] text-[12px] text-center px-4">
            <MessageSquare className="h-5 w-5" />
            <span>{searchTerm ? 'Không tìm thấy hoạt động' : 'Chưa có hoạt động'}</span>
          </div>
        ) : (
          <div className="px-2 py-1 space-y-0.5">
            {filteredActivities.map((activity) => {
              const selected = selectedRoomId === activity.id;
              const sub = submissionStatuses[activity.name];
              return (
                <button
                  key={activity.id}
                  onClick={() => {
                    onSelectRoom(activity.id);
                    onClose?.();
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 rounded-xl group',
                    selected
                      ? 'bg-[#3390ec] text-white shadow'
                      : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10',
                  )}
                >
                  <div className="relative shrink-0">
                    {activity.imageUrl ? (
                      <img
                        src={activity.imageUrl}
                        alt=""
                        loading="lazy"
                        className={cn(
                          'w-11 h-11 rounded-full object-cover select-none',
                          selected && 'ring-2 ring-white/40',
                        )}
                      />
                    ) : (
                      <div
                        className={cn(
                          'w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[13px] font-bold select-none',
                          selected && 'ring-2 ring-white/40',
                          getAvatarGradient(activity.name),
                        )}
                      >
                        {getInitials(activity.name)}
                      </div>
                    )}
                    {sub && <StatusDot status={sub.status} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1.5">
                      <span
                        className={cn(
                          'truncate text-[13.5px] leading-tight',
                          selected ? 'text-white font-semibold' : 'font-medium text-black dark:text-white',
                        )}
                      >
                        {activity.name}
                      </span>
                      <span
                        className={cn(
                          'text-[10.5px] shrink-0 font-normal',
                          selected ? 'text-white/80' : 'text-[#707579] dark:text-[#9aa0a6]',
                        )}
                      >
                        {formatTime(activity.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span
                        className={cn(
                          'text-[11.5px] truncate',
                          selected
                            ? 'text-white/85'
                            : !sub
                              ? 'text-[#707579] dark:text-[#9aa0a6]'
                              : sub.status === 'approved'
                                ? 'text-[#4fae4e] font-medium'
                                : sub.status === 'pending'
                                  ? 'text-[#f5a623] font-medium'
                                  : 'text-[#e53935] font-medium',
                        )}
                      >
                        {!sub ? 'Chưa nộp' : STATUS_TEXT[sub.status]}
                      </span>
                      <span
                        className={cn(
                          'text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap',
                          selected
                            ? 'bg-white text-[#3390ec]'
                            : 'bg-black/5 dark:bg-white/10 text-[#3390ec] dark:text-[#4fc3f7]',
                        )}
                      >
                        +{activity.points}đ
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* User footer menu */}
      {currentUser && (
        <div className="border-t border-black/5 dark:border-white/10 shrink-0 relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <div className="h-7 w-7 rounded-full bg-[#3390ec]/10 flex items-center justify-center shrink-0 overflow-hidden">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-3.5 w-3.5 text-[#3390ec]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-black dark:text-white truncate">
                {currentUser.displayName || 'Người dùng'}
              </p>
              <p className="text-[11px] text-[#707579] dark:text-[#9aa0a6] truncate">{currentUser.email}</p>
            </div>
            <Settings className="h-3.5 w-3.5 text-[#707579] dark:text-[#9aa0a6] shrink-0" />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-[#1e1f22] rounded-xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#3390ec]/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-[#3390ec]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-black dark:text-white truncate">
                      {currentUser.displayName || 'Người dùng'}
                    </p>
                    <p className="text-[10px] text-[#707579] dark:text-[#9aa0a6] truncate">{currentUser.email}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  navigate('/profile');
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                <User className="h-4 w-4 text-[#3390ec]" />
                <span className="text-[13px] font-medium text-black dark:text-white">Thông tin cá nhân</span>
                <ExternalLink className="h-3 w-3 text-[#707579] ml-auto" />
              </button>

              <div className="border-t border-black/5 dark:border-white/10 px-4 py-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="h-3.5 w-3.5 text-[#707579]" />
                  <span className="text-[11px] font-semibold text-[#707579] dark:text-[#9aa0a6] uppercase tracking-wider">
                    Giao diện
                  </span>
                </div>
                <div className="flex gap-1">
                  {(
                    [
                      { id: 'light', icon: Sun, label: 'Sáng' },
                      { id: 'dark', icon: Moon, label: 'Tối' },
                      { id: 'system', icon: Monitor, label: 'Tự động' },
                    ] as const
                  ).map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex-1 justify-center',
                        mode === id
                          ? 'bg-[#3390ec]/10 text-[#3390ec]'
                          : 'text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-black/5 dark:border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#e53935]/10"
                >
                  <LogOut className="h-4 w-4 text-[#e53935]" />
                  <span className="text-[13px] font-medium text-[#e53935]">Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

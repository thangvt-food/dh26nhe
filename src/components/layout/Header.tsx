import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Award, CalendarClock, Home, LayoutGrid, User, ShieldCheck, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from '@/components/shared/Toast';
import { cn } from '@/utils/cn';

export function Header() {
  const { currentUser, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast('Đã đăng xuất an toàn. Hẹn gặp lại bạn!', 'success');
      navigate('/login');
    } catch {
      toast('Đăng xuất thất bại. Vui lòng thử lại.', 'error');
    }
  };

  const navItem = (to: string, label: string, active: boolean) => (
    <Link
      key={to}
      to={to}
      className={cn(
        'px-3.5 py-2 rounded-full text-[13.5px] font-medium transition',
        active
          ? 'bg-[#3390ec]/10 text-[#3390ec]'
          : 'text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10',
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-[#17212b]/80 border-b border-black/5 dark:border-white/10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
        <Link to="/rooms" className="font-extrabold tracking-tight text-[17px] text-black dark:text-white mr-2">
          DH<span className="text-[#3390ec]">26</span>NHE
        </Link>
        {currentUser && (
          <nav className="hidden sm:flex items-center gap-1">
            {navItem('/', 'Trang chủ', location.pathname === '/')}
            {navItem('/rooms', 'Phòng hoạt động', location.pathname.startsWith('/rooms'))}
            {navItem('/tkb', 'TKB', location.pathname.startsWith('/tkb'))}
            {navItem('/drl', 'ĐRL', location.pathname.startsWith('/drl'))}
            {navItem('/profile', 'Hồ sơ', location.pathname.startsWith('/profile'))}
            {isAdmin && navItem('/admin', 'Quản trị', location.pathname.startsWith('/admin'))}
          </nav>
        )}
        <div className="flex-1" />
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Đổi giao diện"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {currentUser && (
          <button
            onClick={handleLogout}
            className="p-2 rounded-full text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
}

export function BottomNavBar() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const items = [
    { to: '/', label: 'Trang chủ', icon: Home },
    { to: '/rooms', label: 'Phòng', icon: LayoutGrid },
    { to: '/tkb', label: 'TKB', icon: CalendarClock },
    { to: '/drl', label: 'ĐRL', icon: Award },
    { to: '/profile', label: 'Hồ sơ', icon: User },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl bg-white/90 dark:bg-[#17212b]/90 border-t border-black/5 dark:border-white/10">
      <div className="flex">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium',
                active ? 'text-[#3390ec]' : 'text-[#707579] dark:text-[#9aa0a6]',
              )}
            >
              <Icon size={21} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

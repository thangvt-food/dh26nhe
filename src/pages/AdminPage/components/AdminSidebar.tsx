import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ListChecks,
  LayoutGrid,
  PieChart,
  Star,
  Home,
  X,
  BadgeCheck,
  CalendarRange,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS: {
  title: string;
  items: { label: string; to: string; icon: typeof Home; end?: boolean }[];
}[] = [
  {
    title: 'Quản lý',
    items: [
      { label: 'Duyệt minh chứng', to: '/admin/activity-management', icon: ListChecks },
      { label: 'Phòng & Thông báo', to: '/admin/rooms', icon: LayoutGrid },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { label: 'Thống kê tập trung', to: '/admin/statistics', icon: PieChart },
      { label: 'Quản lý ĐRL', to: '/admin/drl-management', icon: Star },
      { label: 'Cấu hình học kỳ', to: '/admin/semesters', icon: CalendarRange },
    ],
  },
];

/** Sidebar admin 260px: sections + active pill + footer về trang người dùng. */
export function AdminSidebar({ isOpen, onClose }: Props) {
  const location = useLocation();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'flex flex-col w-[260px] shrink-0 bg-white dark:bg-[#1e1f22] border-r border-[#dadce0] dark:border-[#3f4147]',
          'fixed md:sticky top-0 inset-y-0 left-0 h-screen z-50 md:z-auto transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="h-14 flex items-center gap-2 px-4 bg-[#f8f9fa] dark:bg-white/5 border-b border-[#dadce0] dark:border-[#3f4147] shrink-0">
          <div className="w-[26px] h-[26px] rounded-md bg-[#e8f3fb] dark:bg-[#3390ec]/15 text-[#3390ec] flex items-center justify-center shrink-0">
            <BadgeCheck size={16} />
          </div>
          <span className="flex-1 text-[13.5px] font-bold text-black dark:text-white truncate">
            Dashboard Admin
          </span>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md text-[#707579] hover:bg-black/5"
            aria-label="Đóng menu"
          >
            <X size={17} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-1">
              <div className="px-4 pt-2 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a2acb4]">
                  {section.title}
                </span>
              </div>
              <ul className="px-2">
                {section.items.map(({ label, to, icon: Icon }) => (
                  <li key={to} className="mx-0 my-[1px]">
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-[10px] transition-colors',
                          isActive
                            ? 'bg-[#e8f3fb] dark:bg-[#3390ec]/15 text-[#3390ec] dark:text-[#4fc3f7] font-semibold'
                            : 'text-black dark:text-[#e8eaed] hover:bg-[#f4f4f5] dark:hover:bg-white/5',
                        )
                      }
                    >
                      <Icon size={14} className="w-[18px] shrink-0" />
                      <span className="truncate">{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 bg-[#f8f9fa] dark:bg-white/5 border-t border-[#dadce0] dark:border-[#3f4147] shrink-0">
          <NavLink
            to="/rooms"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] bg-[#3390ec] hover:bg-[#2982dc] text-white text-[12px] font-semibold transition-colors"
          >
            <Home size={14} />
            Về trang người dùng
          </NavLink>
        </div>
      </aside>
    </>
  );
}

import { Link } from 'react-router-dom';
import { Menu, BadgeCheck, Home } from 'lucide-react';
import { SEMESTERS } from '@/firebase';
import { useAdmin } from '../context/AdminContext';

/** Header admin: brand + semester picker, frosted sticky. */
export function AdminHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { semester, setSemester } = useAdmin();

  return (
    <header className="sticky top-0 z-[35] bg-white/95 dark:bg-[#1e1f22]/95 backdrop-blur-md border-b border-[#dadce0] dark:border-[#3f4147]">
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 md:py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="md:hidden w-9 h-9 rounded-md border border-[#dadce0] dark:border-[#3f4147] flex items-center justify-center text-[#707579] dark:text-[#9aa0a6]"
            aria-label="Mở menu quản trị"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3390ec] to-[#005a9e] text-white flex items-center justify-center text-[15px] font-extrabold shrink-0">
              A
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-bold tracking-[0.14em] text-[#3390ec] uppercase leading-none">
                Platform
              </span>
              <h1 className="flex items-center gap-1 text-[15px] font-bold text-black dark:text-[#e8eaed] leading-tight truncate">
                DH26<span className="text-[#3390ec]">NHE</span>
                <span className="font-extrabold">
                  Admin
                </span>
                <BadgeCheck size={15} className="text-[#3390ec] shrink-0" />
              </h1>
            </div>
          </div>
          <div className="hidden lg:block w-px h-6 bg-[#dadce0] dark:bg-[#3f4147]" />
          <div className="hidden lg:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#707579] dark:text-[#9aa0a6] leading-none">
              Quản trị hệ thống
            </p>
            <p className="text-[11px] text-[#a2acb4] mt-0.5">Version 1.0 (DH26NHE Suite)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="w-9 h-9 rounded-lg border border-[#dadce0] dark:border-[#3f4147] flex items-center justify-center text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Về trang chủ"
            title="Về trang chủ"
          >
            <Home size={17} />
          </Link>
          <div className="flex items-center gap-2 bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] rounded-lg shadow-sm px-2.5 py-1.5">
            <label htmlFor="admin-semester" className="text-[11px] font-semibold text-[#707579] dark:text-[#9aa0a6]">
              Học kỳ:
            </label>
            <select
              id="admin-semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-7 text-[12px] font-semibold bg-[#faf9f8] dark:bg-white/5 rounded-md px-1.5 outline-none text-black dark:text-white cursor-pointer"
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
    </header>
  );
}

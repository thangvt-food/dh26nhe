import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Home, Settings2 } from 'lucide-react';
import { useSemesters } from '@/hooks/useSemesters';
import { useAdmin } from '../context/AdminContext';

/** Header admin: brand + semester picker (động) + link cấu hình học kỳ. */
export function AdminHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { semester, setSemester } = useAdmin();
  const semesters = useSemesters();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-[35] bg-white/95 dark:bg-[#1e1f22]/95 backdrop-blur-md border-b border-[#dadce0] dark:border-[#3f4147]">
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-14">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Mở menu quản trị"
          >
            <Menu size={19} />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3390ec] to-[#005a9e] text-white flex items-center justify-center text-[15px] font-extrabold shrink-0">
            A
          </div>
          <h1 className="flex items-center gap-1.5 text-[16px] font-extrabold text-black dark:text-[#e8eaed] tracking-tight truncate">
            DH26NHE
            <span className="px-1.5 py-0.5 rounded-md bg-[#3390ec]/10 text-[#3390ec] text-[10px] font-bold uppercase tracking-wider">
              Admin
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            to="/"
            className="p-2 rounded-lg text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Về trang chủ"
            title="Về trang chủ"
          >
            <Home size={18} />
          </Link>
          <div className="relative flex items-center gap-1">
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-9 pl-3 pr-1.5 rounded-lg border border-[#dadce0] dark:border-[#3f4147] bg-white dark:bg-[#1e1f22] text-[12.5px] font-semibold outline-none text-black dark:text-white cursor-pointer max-w-[104px]"
              title="Học kỳ đang quản trị"
            >
              {semesters.map((s) => (
                <option key={s} value={s} className="text-black">
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={() => navigate('/admin/semesters')}
              className="p-2 rounded-lg text-[#707579] dark:text-[#9aa0a6] hover:text-[#3390ec] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Cấu hình học kỳ hiển thị"
              title="Cấu hình học kỳ hiển thị"
            >
              <Settings2 size={17} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

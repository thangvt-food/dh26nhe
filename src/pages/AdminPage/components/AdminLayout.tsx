import { useCallback, useState, type ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { cn } from '@/utils/cn';

/** Shell admin clone từ DH23VT: sidebar 260px + header sticky + content wrapper. */
export function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleToggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex min-h-screen bg-[#f4f4f5] dark:bg-[#2b2d31] overflow-x-clip">
      <AdminSidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminHeader onToggleSidebar={handleToggleSidebar} />
        <div className="flex-1 w-full px-4 md:px-6 pb-10 md:pb-12 pt-4">
          <div className={cn('w-full max-w-[1600px] mx-auto')}>{children}</div>
        </div>
      </main>
    </div>
  );
}

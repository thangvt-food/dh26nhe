import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

function PageLoader({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e7ebf0] dark:bg-[#0e1621]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#3390ec]/20 border-t-[#3390ec] animate-spin" />
        <p className="text-xs tracking-widest text-[#707579] dark:text-[#9aa0a6]">{text}</p>
      </div>
    </div>
  );
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <PageLoader text="ĐANG KIỂM TRA QUYỀN HẠN..." />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!currentUser.isAdmin) return <Navigate to="/rooms" replace />;
  return <>{children}</>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <PageLoader text="ĐANG TẢI..." />;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

import { User as UserIcon } from 'lucide-react';
import { APP_CONFIG } from '@/firebase';
import type { ExtendedUser } from '@/types/auth.types';
import { studentIdFromEmail } from '@/utils/cn';

export function ProfileHeader({ user }: { user: ExtendedUser }) {
  const studentId = user.email ? studentIdFromEmail(user.email) : '';
  return (
    <div className="flex items-center gap-4">
      {user.photoURL ? (
        <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full object-cover" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-[#3390ec]/10 text-[#3390ec] flex items-center justify-center">
          <UserIcon size={28} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-[17px] font-bold text-black dark:text-white truncate">
          {user.displayName || 'Sinh viên'}
        </h2>
        <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6] truncate">
          MSSV: {studentId} · Lớp {APP_CONFIG.defaultClassName}
        </p>
        <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6] truncate">{user.email}</p>
        <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-[#3390ec]/10 text-[#3390ec] text-[11.5px] font-semibold">
          {user.isAdmin ? 'Ban Cán Sự' : 'Sinh viên'}
        </span>
      </div>
    </div>
  );
}

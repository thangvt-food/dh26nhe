import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ListChecks,
  Bell,
  Star,
  DoorOpen,
  Pin,
  Eye,
  ArrowRight,
  BadgeCheck,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '../context/AdminContext';
import { roomService, submissionService } from '@/services/submissionService';
import { studentIdFromEmail } from '@/utils/cn';

/** Trang chào admin: hero + 4 stat cards + ghim + lối tắt. */
export function AdminWelcome() {
  const { currentUser } = useAuth();
  const { semester } = useAdmin();
  const [roomCount, setRoomCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = roomService.subscribeRooms(semester, (rooms) => {
      setRoomCount(rooms.length);
      setLoading(false);
    });
    submissionService
      .countByStatus(semester)
      .then((c) => setPendingCount(c.pending))
      .catch(() => setPendingCount(0));
    return unsub;
  }, [semester]);

  const displayName = currentUser?.displayName || studentIdFromEmail(currentUser?.email ?? '') || 'Admin';

  const stats = [
    {
      to: '/admin/activity-management',
      title: 'Duyệt minh chứng',
      big: loading ? '…' : String(pendingCount),
      small: `Chờ duyệt · ${semester}`,
      icon: ListChecks,
      iconBg: 'bg-[#e8f3fb] text-[#2481cc]',
    },
    {
      to: '/admin/rooms',
      title: 'Phòng hoạt động',
      big: loading ? '…' : String(roomCount),
      small: `Đang mở · ${semester}`,
      icon: DoorOpen,
      iconBg: 'bg-[#fff4ea] text-[#d83b01]',
    },
    {
      to: '/admin/rooms',
      title: 'Truyền tin',
      big: 'Broadcast',
      small: 'Thông báo toàn lớp',
      icon: Bell,
      iconBg: 'bg-[#fff4ea] text-[#d83b01]',
    },
    {
      to: '/admin/drl-management',
      title: 'Điểm rèn luyện',
      big: 'ĐRL',
      small: 'Tra cứu & xuất bảng điểm',
      icon: Star,
      iconBg: 'bg-[#ebf8ee] text-[#2e7d32]',
    },
  ];

  const shortcuts = [
    { to: '/admin/activity-management', name: 'Duyệt minh chứng', sub: 'Hàng đợi chờ xử lý', icon: ListChecks },
    { to: '/admin/rooms', name: 'Đăng thông báo', sub: 'Gửi tin tới cả lớp', icon: Bell },
    { to: '/admin/statistics', name: 'Thống kê', sub: 'Tổng quan cả lớp', icon: Eye },
    { to: '/admin/drl-management', name: 'Bảng ĐRL', sub: 'Xuất Excel/JSON', icon: Star },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1200px] mx-auto">
      <section className="relative overflow-hidden bg-white dark:bg-[#1e1f22] border border-[#e6e8eb] dark:border-[#3f4147] rounded-2xl shadow-md">
        <div className="h-1 bg-gradient-to-r from-[#2481cc] via-[#2aabee] to-[#5c2d91]" />
        <div className="flex flex-col md:flex-row md:items-center gap-4 p-5 md:p-7">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div className="w-[58px] h-[58px] rounded-full bg-gradient-to-br from-[#2481cc] to-[#2aabee] text-white flex items-center justify-center text-[22px] font-extrabold shrink-0 overflow-hidden">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[17px] font-bold text-black dark:text-white">
                DH26NHE Portal <BadgeCheck size={17} className="text-[#3390ec]" />
              </p>
              <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6]">@dh26nhe_admin</p>
              <p className="text-[13px] text-black/70 dark:text-white/70 mt-1">
                Chào mừng {displayName} quay lại khu vực quản trị.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e1f7cb] dark:bg-[#4fae4e]/15 text-[#3b873e] dark:text-[#81c784] text-[11.5px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Hệ thống trực tuyến
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#eff6fc] dark:bg-[#3390ec]/15 text-[#2481cc] dark:text-[#4fc3f7] text-[11.5px] font-semibold">
                  Học kỳ: {semester}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#f4f5f7] dark:bg-white/10 text-[#707579] dark:text-[#9aa0a6] text-[11.5px] font-semibold">
                  Admin Suite
                </span>
              </div>
            </div>
          </div>
          <div className="flex md:flex-col gap-2 shrink-0">
            <Link
              to="/admin/activity-management"
              className="px-4 py-2 rounded-full bg-[#2481cc] hover:bg-[#1c6ba8] text-white text-[12.5px] font-semibold text-center transition-colors"
            >
              Quản lý hoạt động
            </Link>
            <Link
              to="/admin/rooms"
              className="px-4 py-2 rounded-full bg-[#f4f5f7] dark:bg-white/10 hover:bg-[#e8f3fb] dark:hover:bg-[#3390ec]/15 text-black dark:text-white text-[12.5px] font-semibold text-center transition-colors"
            >
              Phát thông báo
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {stats.map(({ to, title, big, small, icon: Icon, iconBg }) => (
          <Link
            key={to + title}
            to={to}
            className="flex items-center gap-3 bg-white dark:bg-[#1e1f22] border border-[#e6e8eb] dark:border-[#3f4147] rounded-[14px] p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              {loading && (title === 'Duyệt minh chứng' || title === 'Phòng hoạt động') ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Icon size={20} />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-[#707579] dark:text-[#9aa0a6] uppercase tracking-wide">
                {title}
              </span>
              <span className="block text-[19px] font-extrabold text-black dark:text-white leading-tight">
                {big}
              </span>
              <span className="block text-[11.5px] text-[#a2acb4] truncate">{small}</span>
            </span>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.2fr] gap-3.5">
        <section className="bg-white dark:bg-[#1e1f22] border border-[#e6e8eb] dark:border-[#3f4147] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#f4f5f7] dark:bg-white/5">
            <span className="flex items-center gap-2 text-[13px] font-bold text-black dark:text-white">
              <Pin size={15} className="text-[#3390ec]" /> Ghim thông báo vận hành
            </span>
            <span className="text-[11px] text-[#a2acb4]">v1.0</span>
          </div>
          <div className="p-4 text-[13px] text-black/70 dark:text-white/70 leading-relaxed">
            <p>
              Khu vực quản trị theo phong cách Telegram: duyệt minh chứng, quản lý phòng hoạt động,
              đăng thông báo và tổng kết điểm rèn luyện — tất cả realtime.
            </p>
            <p className="mt-2 pl-3 border-l-2 border-[#3390ec]">
              Mẹo: hồ sơ vi phạm hiển thị lý do từ chối để sinh viên nộp lại đúng yêu cầu.
            </p>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-black/5 dark:border-white/10 text-[11.5px] text-[#a2acb4]">
            <span className="flex items-center gap-1.5">
              <Eye size={13} /> DH26NHE Management Suite
            </span>
            <span>Bảo mật Firebase Rules</span>
          </div>
        </section>

        <section className="bg-white dark:bg-[#1e1f22] border border-[#e6e8eb] dark:border-[#3f4147] rounded-2xl p-4">
          <h3 className="text-[13.5px] font-bold text-black dark:text-white mb-2">Lối tắt thao tác nhanh</h3>
          <div className="space-y-1">
            {shortcuts.map(({ to, name, sub, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#e8f3fb] dark:hover:bg-[#3390ec]/10 transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-[#3390ec]/10 text-[#3390ec] flex items-center justify-center shrink-0">
                  <Icon size={16} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-semibold text-black dark:text-white">{name}</span>
                  <span className="block text-[11px] text-[#a2acb4]">{sub}</span>
                </span>
                <ArrowRight size={15} className="text-[#a2acb4] group-hover:text-[#3390ec] group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Loader2,
  X,
  ArrowUpDown,
  Search,
  Table2,
  Layers,
  Image as ImageIcon,
  Send,
} from 'lucide-react';
import { roomService } from '@/services/submissionService';
import { notificationService, roomToNotification } from '@/services/notificationService';
import { useRoomData } from '@/pages/RoomPage/hooks/useRoomData';
import { useAuth } from '@/contexts/AuthContext';
import { useRoomDeletion } from '../hooks/useRoomDeletion';
import { DeleteRoomDialog } from './DeleteRoomDialog';
import { NotificationCard } from './NotificationCard';
import { toast } from '@/components/shared/Toast';
import { getAvatarGradient, getInitials, cn } from '@/utils/cn';
import type { RoomDefinition, BroadcastNotification } from '@/types/submission.types';

const POINT_CHIPS = [0, 5, 10, 15];

/**
 * Quản lý Phòng & Thông báo (gộp 1 màn — 1 nhánh RTDB activities/).
 * Bảng chỉnh nhanh + thẻ xem trước + form ảnh + nhập JSON + xoá cascade.
 */
export function RoomManager({ semester }: { semester: string }) {
  const { rooms, roomsLoading } = useRoomData();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'cards'>(() =>
    localStorage.getItem('admin_rooms_view_mode') === 'cards' ? 'cards' : 'table',
  );
  const [sortAsc, setSortAsc] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoomDefinition | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const deletion = useRoomDeletion();
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [points, setPoints] = useState('5');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setPoints('5');
    setDescription('');
    setImageFile(null);
    setPreviewUrl('');
    setModalOpen(true);
  };

  const openEdit = (room: RoomDefinition) => {
    setEditing(room);
    setName(room.name);
    setPoints(String(room.points));
    setDescription(room.description);
    setImageFile(null);
    setPreviewUrl(room.imageUrl ?? '');
    setModalOpen(true);
  };

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    const list = k
      ? rooms.filter((r) => r.name.toLowerCase().includes(k) || r.description.toLowerCase().includes(k))
      : rooms;
    return [...list].sort((a, b) => (sortAsc ? a.createdAt - b.createdAt : b.createdAt - a.createdAt));
  }, [rooms, search, sortAsc]);

  const cards: BroadcastNotification[] = useMemo(() => filtered.map(roomToNotification), [filtered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !name.trim()) {
      toast('Vui lòng nhập tên phòng / tiêu đề.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        // Giữ ảnh cũ nếu không chọn ảnh mới (previewUrl trùng imageUrl cũ + không có file).
        const keepOldImage = !imageFile && previewUrl === (editing.imageUrl ?? '');
        await notificationService.updateNotification(
          editing.id,
          {
            title: name.trim(),
            body: description,
            points: Number(points) || 0,
            semester,
            ...(keepOldImage ? {} : { imageUrl: previewUrl.startsWith('blob:') ? '' : previewUrl }),
          },
          imageFile,
        );
        toast('Đã lưu thay đổi. Nội dung hiển thị lại tức thì cho toàn lớp (realtime).', 'success');
      } else {
        await notificationService.postNotification(
          currentUser,
          { title: name.trim(), body: description, points: Number(points) || 0, semester },
          imageFile,
        );
        toast('Đã đăng phòng / thông báo. Sinh viên thấy ngay ở sidebar và có thể nộp bài.', 'success');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Lưu thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast('Vui lòng chọn file JSON.', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = JSON.parse(await importFile.text()) as {
        name: string;
        points?: number;
        description?: string;
        imageUrl?: string;
      }[];
      if (!Array.isArray(data)) throw new Error('File JSON phải là mảng các phòng.');
      let count = 0;
      for (const item of data) {
        if (!item.name) continue;
        await roomService.createRoom(semester, {
          name: String(item.name),
          points: Number(item.points) || 5,
          description: String(item.description ?? ''),
          imageUrl: String(item.imageUrl ?? ''),
          createdBy: currentUser?.email ?? 'Ban Cán Sự',
        });
        count += 1;
      }
      toast(`Đã nhập ${count} phòng từ JSON. Kiểm tra lại điểm từng phòng trước khi mở nộp.`, 'success');
      setImportOpen(false);
      setImportFile(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Nhập JSON thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob(
      [JSON.stringify([{ name: 'Tên hoạt động mẫu', points: 5, description: 'Thể lệ...', imageUrl: '' }], null, 2)],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mau_phong_hoat_dong.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const labelCls = 'block text-[12.5px] font-semibold text-black dark:text-white mb-1.5';
  const inputCls =
    'w-full rounded-xl bg-black/5 dark:bg-white/10 px-3 py-2.5 text-[13.5px] outline-none text-black dark:text-white focus:border-[#3390ec]/50 focus:ring-2 focus:ring-[#3390ec]/15 border border-transparent';

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[13.5px] font-bold text-black dark:text-white">
          {rooms.length} phòng · {semester}
        </span>
        <button
          onClick={() => setSortAsc((v) => !v)}
          className="p-2 rounded-lg text-[#707579] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
          title={sortAsc ? 'Cũ nhất trước' : 'Mới nhất trước'}
        >
          <ArrowUpDown size={15} />
        </button>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a2acb4] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm phòng / thông báo..."
            className="w-full h-9 pl-9 pr-3 rounded-full bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] text-[12.5px] outline-none text-black dark:text-white placeholder:text-[#a2acb4]"
          />
        </div>
        <div className="flex rounded-full bg-black/5 dark:bg-white/5 p-0.5 shrink-0">
          <button
            onClick={() => {
              setView('table');
              localStorage.setItem('admin_rooms_view_mode', 'table');
            }}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold',
              view === 'table' ? 'bg-white dark:bg-[#1e1f22] text-[#3390ec] shadow' : 'text-[#707579] dark:text-[#9aa0a6]',
            )}
            title="Xem dạng bảng"
          >
            <Table2 size={13} /> <span className="hidden sm:inline">Bảng</span>
          </button>
          <button
            onClick={() => {
              setView('cards');
              localStorage.setItem('admin_rooms_view_mode', 'cards');
            }}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold',
              view === 'cards' ? 'bg-[#3390ec] text-white shadow' : 'text-[#707579] dark:text-[#9aa0a6]',
            )}
            title="Xem dạng thẻ"
          >
            <Layers size={13} /> <span className="hidden sm:inline">Thẻ</span>
          </button>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#dadce0] dark:border-[#3f4147] text-[12.5px] font-bold text-black dark:text-white hover:bg-[#f4f4f5] dark:hover:bg-white/5"
        >
          <Upload size={14} /> NHẬP JSON
        </button>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3390ec] hover:bg-[#2982dc] text-white text-[12.5px] font-bold"
        >
          <Plus size={15} /> THÊM
        </button>
      </div>

      {/* Content */}
      {roomsLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-[#3390ec]" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] rounded-2xl">
          <p className="text-[14px] font-semibold text-black dark:text-white">
            {search ? 'Không tìm thấy phòng nào.' : 'Chưa có phòng nào'}
          </p>
          {!search && (
            <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6] mt-1">
              Bấm THÊM để đăng phòng / thông báo đầu tiên cho {semester}.
            </p>
          )}
        </div>
      ) : view === 'table' ? (
        <div className="bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="text-left text-[#707579] dark:text-[#9aa0a6] border-b border-[#dadce0] dark:border-[#3f4147] bg-[#fafbfc] dark:bg-white/5">
                <th className="p-3">Phòng / Thông báo</th>
                <th className="p-3 w-24">Điểm</th>
                <th className="p-3 w-28 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((room) => (
                <tr key={room.id} className="border-b border-black/5 dark:border-white/5 last:border-0 text-black dark:text-white">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      {room.imageUrl ? (
                        <img src={room.imageUrl} alt="" loading="lazy" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      ) : (
                        <span
                          className={cn(
                            'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-[13px] font-bold shrink-0',
                            getAvatarGradient(room.name),
                          )}
                        >
                          {getInitials(room.name)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block font-semibold truncate">{room.name}</span>
                        <span className="block text-[11.5px] text-[#a2acb4] truncate max-w-[320px]">
                          {room.description || 'Chưa có nội dung thể lệ.'}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="p-3 font-bold text-[#3390ec] whitespace-nowrap">{room.points} pts</td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => openEdit(room)}
                        className="p-2 rounded-lg text-[#3390ec] hover:bg-[#e8f3fb] dark:hover:bg-[#3390ec]/15"
                        aria-label="Sửa"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => void deletion.openDelete(room, semester)}
                        className="p-2 rounded-lg text-[#e53935] hover:bg-[#ffebee] dark:hover:bg-[#e53935]/15"
                        aria-label="Xoá phòng"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="max-w-[680px] mx-auto flex flex-col gap-3">
          {cards.map((item, i) => (
            <NotificationCard
              key={item.id}
              item={item}
              index={i}
              semester={semester}
              onEdit={() => {
                const room = filtered.find((r) => r.id === item.id);
                if (room) openEdit(room);
              }}
              onDelete={() => {
                const room = filtered.find((r) => r.id === item.id);
                if (room) void deletion.openDelete(room, semester);
              }}
            />
          ))}
        </div>
      )}

      {/* Modal thêm/sửa */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-sm flex items-center justify-center md:p-4"
            onClick={() => !saving && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-[100dvh] md:h-auto md:max-h-[90dvh] md:max-w-2xl bg-white dark:bg-[#1e1f22] md:rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-black/5 dark:border-white/10 shrink-0">
                <h3 className="flex-1 text-[15.5px] font-bold text-black dark:text-white">
                  {editing ? 'Chỉnh sửa phòng / thông báo' : 'Đăng phòng / thông báo mới'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#e8f3fb] dark:bg-[#3390ec]/15 text-[#3390ec] text-[11px] font-bold">
                  {semester}
                </span>
                <button
                  onClick={() => !saving && setModalOpen(false)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
              <form
                onSubmit={handleSubmit}
                className="overflow-y-auto flex-1 p-4 space-y-4"
              >
                <div className="grid md:grid-cols-12 gap-4">
                  <label className={`${labelCls} md:col-span-8`}>
                    Tên phòng / tiêu đề <span className="text-[#e53935]">*</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="VD: Tiếp sức mùa thi 2026"
                      required
                      className={inputCls}
                    />
                  </label>
                  <div className="md:col-span-4">
                    <label className={labelCls}>
                      Điểm ĐRL
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={points}
                        onChange={(e) => setPoints(e.target.value)}
                        className={inputCls}
                      />
                    </label>
                    <div className="flex gap-1.5 mt-2">
                      {POINT_CHIPS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPoints(String(p))}
                          className={
                            Number(points) === p
                              ? 'px-2.5 py-1 rounded-full bg-[#3390ec] text-white text-[11.5px] font-bold'
                              : 'px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-[#707579] dark:text-[#9aa0a6] text-[11.5px] font-semibold'
                          }
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <label className={labelCls}>
                  Thể lệ / nội dung thông báo
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Hướng dẫn nộp minh chứng, thời gian, địa điểm..."
                    rows={5}
                    className={`${inputCls} resize-y min-h-[120px]`}
                  />
                </label>
                <div>
                  <span className={labelCls}>Ảnh bìa / minh hoạ</span>
                  <input
                    ref={imgRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                  {previewUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-black/5 dark:border-white/10">
                      <img src={previewUrl} alt="" className="w-full max-h-56 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setPreviewUrl('');
                          if (imgRef.current) imgRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                        aria-label="Gỡ ảnh"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imgRef.current?.click()}
                      className="w-full min-h-[120px] rounded-2xl border-2 border-dashed border-[#dadce0] dark:border-[#3f4147] flex flex-col items-center justify-center gap-2 text-[#a2acb4] hover:border-[#3390ec] hover:text-[#3390ec] transition-colors"
                    >
                      <ImageIcon size={24} />
                      <span className="text-[12.5px] font-medium">Bấm để chọn ảnh (JPG/PNG)</span>
                    </button>
                  )}
                </div>
                <div className="flex gap-2 justify-end sticky bottom-0 bg-white dark:bg-[#1e1f22] py-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-[#707579] hover:bg-black/5"
                  >
                    HỦY BỎ
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#3390ec] hover:bg-[#2982dc] text-white text-[13.5px] font-bold disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                    {editing ? 'LƯU THAY ĐỔI' : 'ĐĂNG NGAY'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal nhập JSON */}
      <AnimatePresence>
        {importOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1500] bg-black/55 flex items-center justify-center p-4"
            onClick={() => !saving && setImportOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1e1f22] border border-[#dadce0] dark:border-[#3f4147] shadow-2xl p-5"
            >
              <h3 className="text-[15.5px] font-bold text-black dark:text-white mb-1">Nhập phòng từ JSON</h3>
              <p className="text-[12.5px] text-[#707579] dark:text-[#9aa0a6] mb-3">
                File mảng [{'{ }'}name, points, description, imageUrl{'}'}] cho {semester}.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-[#dadce0] dark:border-[#3f4147] py-6 text-[13px] font-medium text-[#707579] dark:text-[#9aa0a6] hover:border-[#3390ec] hover:text-[#3390ec]"
              >
                {importFile ? importFile.name : 'Bấm để chọn file .json'}
              </button>
              <button
                onClick={downloadTemplate}
                className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3390ec] hover:underline"
              >
                <Download size={14} /> Tải file mẫu
              </button>
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => setImportOpen(false)} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#707579]">
                  Huỷ
                </button>
                <button
                  onClick={handleImport}
                  disabled={saving || !importFile}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#3390ec] text-white text-[13px] font-bold disabled:opacity-60"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />} NHẬP
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteRoomDialog
        room={deletion.target}
        counts={deletion.counts}
        counting={deletion.counting}
        phase={deletion.phase}
        progress={deletion.progress}
        result={deletion.result}
        error={deletion.error}
        onConfirm={() => void deletion.confirmDelete()}
        onClose={deletion.close}
      />
    </div>
  );
}

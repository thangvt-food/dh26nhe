import { useEffect, useState } from 'react';
import { Download, Upload, Lock, Unlock, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { drlService } from '@/services/drlService';
import { adminService } from '@/services/adminService';
import { useAdmin } from '../context/AdminContext';
import { toast } from '@/components/shared/Toast';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

export function DrlManagementTab() {
  const { semester } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ email: string; fullName: string; totalPoints: number; finalScore: number; activityCount: number }[]>([]);
  const [lockLoading, setLockLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await drlService.fetchSemesterSubmissions(semester);
      const ranks = drlService.computeRanking(all);
      setRows(
        ranks.map((r) => ({
          email: r.email,
          fullName: r.fullName,
          totalPoints: r.score,
          finalScore: Math.min(90 + Math.min(r.activityCount, 2) * 5, 100),
          activityCount: r.activityCount,
        })),
      );
      const lock = await adminService.getUploadLock();
      setIsLocked(lock.isLocked);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester]);

  const handleExport = (format: 'xlsx' | 'json') => {
    const data = rows.map((r, i) => ({
      STT: i + 1,
      studentId: r.email.split('@')[0],
      fullName: r.fullName,
      email: r.email,
      totalBonusPoints: r.totalPoints,
      finalScore: r.finalScore,
      semester,
    }));
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `DH26NHE_${semester}_drl.json`;
      a.click();
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, semester);
      XLSX.writeFile(wb, `DH26NHE_${semester}_drl.xlsx`);
    }
    toast('Đã xuất bảng điểm. Dùng được ngay cho báo cáo khoa.', 'success');
  };

  const handleToggleLock = async () => {
    setLockLoading(true);
    try {
      const current = await adminService.getUploadLock();
      await adminService.setUploadLock({ ...current, isLocked: !current.isLocked });
      setIsLocked(!current.isLocked);
      toast(!current.isLocked ? 'Đã khoá cổng nộp bài. Bài đã nộp vẫn được giữ nguyên.' : 'Đã mở cổng nộp bài. Sinh viên nộp lại bình thường.', 'success');
    } catch {
      toast('Đổi trạng thái khoá thất bại.', 'error');
    } finally {
      setLockLoading(false);
      setConfirmLock(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 p-3">
          <p className="text-[20px] font-extrabold text-black dark:text-white">{rows.length}</p>
          <p className="text-[11.5px] text-[#707579] dark:text-[#9aa0a6]">Sinh viên</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 p-3">
          <p className="text-[20px] font-extrabold text-[#3390ec]">
            {rows.length > 0 ? Math.round(rows.reduce((n, r) => n + r.finalScore, 0) / rows.length) : 0}
          </p>
          <p className="text-[11.5px] text-[#707579] dark:text-[#9aa0a6]">ĐRL trung bình</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10 p-3">
          <p className="text-[20px] font-extrabold text-[#4fae4e]">
            {rows.length > 0 ? Math.max(...rows.map((r) => r.finalScore)) : 0}
          </p>
          <p className="text-[11.5px] text-[#707579] dark:text-[#9aa0a6]">ĐRL cao nhất</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => handleExport('xlsx')} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#4fae4e] text-white text-[13px] font-semibold">
          <Download size={15} /> Xuất Excel
        </button>
        <button onClick={() => handleExport('json')} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#212121] border border-black/10 dark:border-white/10 text-[13px] font-semibold text-black dark:text-white">
          <Upload size={15} /> Xuất JSON
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setConfirmLock(true)}
          disabled={lockLoading}
          className={
            isLocked
              ? 'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#e53935]/10 text-[#e53935] border border-[#e53935]/20 text-[13px] font-semibold disabled:opacity-60'
              : 'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20 text-[13px] font-semibold disabled:opacity-60'
          }
        >
          {lockLoading ? <Loader2 size={15} className="animate-spin" /> : isLocked ? <Lock size={15} /> : <Unlock size={15} />}
          {isLocked ? 'Đang khoá nộp bài' : 'Đang mở nộp bài'}
        </button>
      </div>

      {loading ? (
        <p className="text-center text-[13px] text-[#707579] py-10">Đang tải bảng điểm...</p>
      ) : (
        <div className="rounded-2xl overflow-x-auto bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10">
          <table className="w-full text-[12.5px] min-w-[560px]">
            <thead>
              <tr className="text-left text-[#707579] dark:text-[#9aa0a6] border-b border-black/5 dark:border-white/10">
                <th className="p-3">STT</th>
                <th className="p-3">Họ tên</th>
                <th className="p-3">MSSV</th>
                <th className="p-3 text-center">Điểm cộng</th>
                <th className="p-3 text-center">ĐRL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.email} className="border-b border-black/5 dark:border-white/5 text-black dark:text-white">
                  <td className="p-3 text-[#707579]">{i + 1}</td>
                  <td className="p-3 font-semibold">{r.fullName}</td>
                  <td className="p-3 font-mono text-[12px]">{r.email.split('@')[0]}</td>
                  <td className="p-3 text-center font-bold text-[#3390ec]">+{r.totalPoints}</td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-1 rounded-full bg-[#4fae4e]/15 text-[#4fae4e] font-bold">{r.finalScore}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-center text-[13px] text-[#707579] py-8">Chưa có dữ liệu.</p>}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmLock}
        title={isLocked ? 'Mở cổng nộp bài?' : 'Khoá cổng nộp bài?'}
        message={isLocked ? 'Sinh viên sẽ nộp minh chứng trở lại.' : 'Sinh viên sẽ không thể nộp minh chứng mới cho đến khi mở lại.'}
        confirmLabel={isLocked ? 'Mở cổng' : 'Khoá cổng'}
        danger={!isLocked}
        onConfirm={handleToggleLock}
        onCancel={() => setConfirmLock(false)}
      />
    </div>
  );
}

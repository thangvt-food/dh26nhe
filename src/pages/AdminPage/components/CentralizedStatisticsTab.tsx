import { useEffect, useMemo, useState } from 'react';
import { Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { drlService } from '@/services/drlService';
import { toast } from '@/components/shared/Toast';
import { useAdmin } from '../context/AdminContext';

export function CentralizedStatisticsTab() {
  const { semester, setSearchTerm, openStudentModal } = useAdmin();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ email: string; fullName: string; totalPoints: number; finalScore: number; activityCount: number }[]>([]);

  useEffect(() => {
    setLoading(true);
    drlService
      .fetchSemesterSubmissions(semester)
      .then((all) => {
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
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [semester]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) => r.fullName.toLowerCase().includes(k) || r.email.toLowerCase().includes(k));
  }, [rows, keyword]);

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast('Chưa có dữ liệu thống kê để xuất.', 'error');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((r, i) => ({
        STT: i + 1,
        MSSV: r.email.split('@')[0],
        HoVaTen: r.fullName,
        Email: r.email,
        TongDiem: r.totalPoints,
        DiemDRL: r.finalScore,
        SoHoatDong: r.activityCount,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, semester);
    XLSX.writeFile(wb, `DH26NHE_${semester}_statistics.xlsx`);
    toast(`Đã xuất Excel thống kê ${filtered.length} sinh viên — dùng được ngay cho báo cáo.`, 'success');
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707579]" />
          <input
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setSearchTerm(e.target.value);
            }}
            placeholder="Tìm sinh viên (tên / MSSV / email)..."
            className="w-full rounded-xl bg-white dark:bg-[#212121] border border-black/10 dark:border-white/10 pl-9 pr-3 py-2.5 text-[13px] outline-none text-black dark:text-white"
          />
        </div>
        <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#4fae4e] text-white text-[13px] font-semibold">
          <Download size={15} /> Excel
        </button>
      </div>

      {loading ? (
        <p className="text-center text-[13px] text-[#707579] py-10">Đang tổng hợp thống kê...</p>
      ) : (
        <div className="rounded-2xl overflow-x-auto bg-white dark:bg-[#212121] border border-black/5 dark:border-white/10">
          <table className="w-full text-[12.5px] min-w-[620px]">
            <thead>
              <tr className="text-left text-[#707579] dark:text-[#9aa0a6] border-b border-black/5 dark:border-white/10">
                <th className="p-3">STT</th>
                <th className="p-3">Học viên</th>
                <th className="p-3 text-center">Hoạt động</th>
                <th className="p-3 text-center">Tổng điểm</th>
                <th className="p-3 text-center">ĐRL ước tính</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.email}
                  onClick={() => openStudentModal(r.email, semester)}
                  className="border-b border-black/5 dark:border-white/5 text-black dark:text-white hover:bg-[#3390ec]/5 cursor-pointer"
                >
                  <td className="p-3 text-[#707579]">{i + 1}</td>
                  <td className="p-3">
                    <p className="font-semibold">{r.fullName}</p>
                    <p className="text-[11.5px] text-[#707579] dark:text-[#9aa0a6]">{r.email}</p>
                  </td>
                  <td className="p-3 text-center">{r.activityCount}</td>
                  <td className="p-3 text-center font-bold text-[#3390ec]">+{r.totalPoints}</td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-1 rounded-full bg-[#4fae4e]/15 text-[#4fae4e] font-bold">{r.finalScore}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-[13px] text-[#707579] py-8">Chưa có dữ liệu.</p>
          )}
        </div>
      )}
    </div>
  );
}

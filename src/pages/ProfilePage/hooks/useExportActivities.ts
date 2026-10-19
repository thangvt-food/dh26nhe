import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from '@/components/shared/Toast';
import { storageService } from '@/services/storageService';
import { studentIdFromEmail } from '@/utils/cn';
import type { ActivitySubmission } from '@/types/submission.types';
import type { ExtendedUser } from '@/types/auth.types';

function safeFolderName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 60) || 'HoatDong';
}

function extFromStorageUrl(url: string): string {
  const match = url.match(/\/o\/([^?]+)/);
  if (!match) return 'bin';
  const path = decodeURIComponent(match[1]);
  const ext = path.includes('.') ? path.split('.').pop() ?? '' : '';
  return /^[a-z0-9]{1,5}$/i.test(ext) ? ext.toLowerCase() : 'bin';
}

export function useExportActivities(user: ExtendedUser | null, semester: string) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const handleExportToZip = async (selected: ActivitySubmission[]) => {
    if (!user?.email) return;
    if (selected.length === 0) {
      toast('Chưa chọn hoạt động nào để xuất.', 'error');
      return;
    }
    setIsExporting(true);
    try {
      const studentId = studentIdFromEmail(user.email);
      const rootName = `DH26NHE_${studentId}_${semester}`;

      // Dựng cây thư mục 1 lần, dùng chung cho nén server (Worker) lẫn nén client.
      const entries: Array<{ url?: string; text?: string; name: string }> = [];
      selected.forEach((submission, idx) => {
        const folder = `${rootName}/${String(idx + 1).padStart(2, '0')}_${safeFolderName(submission.activityName)}`;
        entries.push({
          name: `${folder}/thong_tin.txt`,
          text: [
            `Hoat dong: ${submission.activityName}`,
            `Diem: +${submission.bonusPoints}`,
            `Trang thai: ${submission.status}`,
            `Ngay nop: ${new Date(submission.submittedAt).toLocaleString('vi-VN')}`,
            submission.reviewNote ? `Phan hoi: ${submission.reviewNote}` : '',
          ].join('\n'),
        });
        submission.fileUrls.forEach((url, fi) => {
          entries.push({ url, name: `${folder}/minh_chung_${fi + 1}.${extFromStorageUrl(url)}` });
        });
      });

      // Ưu tiên nén server-side; lỗi/chưa cấu hình Worker thì fallback nén client.
      setExportProgress('Đang nén tệp trên server...');
      const server = await storageService
        .fetchEvidenceZip(entries, `${rootName}.zip`)
        .catch(() => null);
      if (server) {
        saveAs(server.blob, `${rootName}.zip`);
        toast(
          server.skipped > 0
            ? `Đã xuất ZIP ${selected.length} hoạt động (${server.skipped} tệp lỗi bị bỏ qua).`
            : `Đã xuất ZIP ${selected.length} hoạt động. File nằm trong thư mục tải về của bạn.`,
          server.skipped > 0 ? 'info' : 'success',
        );
        return;
      }

      const zip = new JSZip();
      let done = 0;
      const fileEntries = entries.filter((e) => e.url);
      const totalFiles = fileEntries.length || 1;
      for (const entry of entries) {
        if (entry.text !== undefined) {
          zip.file(entry.name, entry.text);
          continue;
        }
        try {
          setExportProgress(`Đang tải ${done + 1}/${totalFiles} tệp...`);
          const blob = await storageService.fetchEvidenceBlob(entry.url as string);
          zip.file(entry.name, blob);
        } catch {
          zip.file(`${entry.name}.loi_tai.txt`, `Khong tai duoc: ${entry.url}`);
        }
        done += 1;
      }
      setExportProgress('Đang nén tệp...');
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${rootName}.zip`);
      toast(`Đã xuất ZIP ${selected.length} hoạt động. File nằm trong thư mục tải về của bạn.`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Xuất ZIP thất bại.', 'error');
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  return { isExporting, exportProgress, handleExportToZip };
}

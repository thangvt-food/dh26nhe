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
      const zip = new JSZip();
      const studentId = studentIdFromEmail(user.email);
      const root = zip.folder(`DH26NHE_${studentId}_${semester}`);
      if (!root) throw new Error('Không tạo được thư mục nén.');

      let done = 0;
      const totalFiles = selected.reduce((n, s) => n + s.fileUrls.length, 0) || 1;
      for (const [idx, submission] of selected.entries()) {
        const folder = root.folder(`${String(idx + 1).padStart(2, '0')}_${safeFolderName(submission.activityName)}`);
        if (!folder) continue;
        folder.file(
          'thong_tin.txt',
          [
            `Hoat dong: ${submission.activityName}`,
            `Diem: +${submission.bonusPoints}`,
            `Trang thai: ${submission.status}`,
            `Ngay nop: ${new Date(submission.submittedAt).toLocaleString('vi-VN')}`,
            submission.reviewNote ? `Phan hoi: ${submission.reviewNote}` : '',
          ].join('\n'),
        );
        for (const [fi, url] of submission.fileUrls.entries()) {
          try {
            setExportProgress(`Đang tải ${done + 1}/${totalFiles} tệp...`);
            const blob = await storageService.fetchEvidenceBlob(url);
            const ext = blob.type.includes('pdf') ? 'pdf' : blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : blob.type.includes('zip') ? 'zip' : blob.type.includes('document') || blob.type.includes('word') ? 'docx' : blob.type.includes('sheet') || blob.type.includes('excel') ? 'xlsx' : 'jpg';
            folder.file(`minh_chung_${fi + 1}.${ext}`, blob);
          } catch {
            folder.file(`loi_tai_${fi + 1}.txt`, `Khong tai duoc: ${url}`);
          }
          done += 1;
        }
      }
      setExportProgress('Đang nén tệp...');
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `DH26NHE_${studentId}_${semester}.zip`);
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

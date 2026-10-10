import { ref as storageRef, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/firebase';

/** Tầng thao tác file minh chứng trên Firebase Storage. */
export const storageService = {
  async uploadFile(path: string, file: File): Promise<string> {
    return this.uploadFileWithProgress(path, file);
  },

  /** Tải lên có báo tiến trình (bytes đã gửi / tổng) cho vòng % kiểu Telegram. */
  async uploadFileWithProgress(
    path: string,
    file: File,
    onProgress?: (sentBytes: number, totalBytes: number) => void,
  ): Promise<string> {
    const fileRef = storageRef(storage, path);
    if (!onProgress) {
      await uploadBytes(fileRef, file, {
        contentType: file.type || 'application/octet-stream',
      });
      return await getDownloadURL(fileRef);
    }
    const task = uploadBytesResumable(fileRef, file, {
      contentType: file.type || 'application/octet-stream',
    });
    await new Promise<void>((resolve, reject) => {
      task.on(
        'state_changed',
        (snapshot) => onProgress(snapshot.bytesTransferred, snapshot.totalBytes),
        (error) => reject(error),
        () => resolve(),
      );
    });
    return await getDownloadURL(task.snapshot.ref);
  },

  async deleteFileByUrl(url: string): Promise<void> {
    if (!url) return;
    const targetRef = storageRef(storage, url);
    await deleteObject(targetRef);
  },

  async deleteFilesByUrls(urls: string[]): Promise<void> {
    await Promise.allSettled(
      urls.filter(Boolean).map((url) =>
        this.deleteFileByUrl(url).catch(() => undefined),
      ),
    );
  },

  /** Chuẩn hoá record lai tạp (VN/EN keys) thành danh sách URL minh chứng. */
  getEvidenceFiles(record: Record<string, unknown>): string[] {
    const r = record as Record<string, any>;
    if (Array.isArray(r.fileUrls)) return r.fileUrls.filter(Boolean).map(String);
    if (Array.isArray(r['File uploads'])) return r['File uploads'].filter(Boolean).map(String);
    if (typeof r.fileUrl === 'string' && r.fileUrl) return [r.fileUrl];
    if (typeof r['File upload'] === 'string' && r['File upload']) return [r['File upload']];
    return [];
  },
};

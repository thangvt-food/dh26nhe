import { ref as storageRef, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, storage } from '@/firebase';

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

  /**
   * Tải blob minh chứng cho export ZIP.
   * GET firebasestorage trên response thật không trả ACAO → fetch trực tiếp từ
   * browser bị CORS chặn. Khi Worker đã cấu hình (VITE_API_URL), đi qua proxy
   * /api/storage/fetch (server-to-server không có CORS, whitelist bucket DH26NHE).
   */
  async fetchEvidenceBlob(url: string): Promise<Blob> {
    const base = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
    if (base) {
      const token = (await auth.currentUser?.getIdToken()) ?? null;
      const res = await fetch(`${base}/api/storage/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Tải file thất bại (HTTP ${res.status}).`);
      }
      return await res.blob();
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Tải file thất bại (HTTP ${res.status}).`);
    return await res.blob();
  },

  /**
   * Nén minh chứng server-side qua Worker → Blob .zip (thay GAS download-zip).
   * Trả null khi Worker chưa cấu hình (caller fallback nén client bằng JSZip).
   */
  async fetchEvidenceZip(
    files: Array<{ url?: string; text?: string; name: string }>,
    archiveName: string,
  ): Promise<{ blob: Blob; skipped: number } | null> {
    const base = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
    if (!base) return null;
    const token = (await auth.currentUser?.getIdToken()) ?? null;
    const res = await fetch(`${base}/api/storage/zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ files, archiveName }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Nén file thất bại (HTTP ${res.status}).`);
    }
    return { blob: await res.blob(), skipped: Number(res.headers.get('X-Zip-Skipped') || 0) };
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

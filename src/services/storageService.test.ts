import { afterEach, describe, expect, it, vi } from 'vitest';

const deleteObjectMock = vi.fn(async () => undefined);
const uploadBytesMock = vi.fn(async () => undefined);
const getDownloadURLMock = vi.fn(async () => 'https://firebasestorage.googleapis.com/v0/b/x/o/f.jpg');

vi.mock('@/firebase', () => ({ storage: {} }));

vi.mock('firebase/storage', () => ({
  ref: vi.fn((_storage: unknown, path: string) => ({ path })),
  uploadBytes: (...args: unknown[]) =>
    (uploadBytesMock as (...a: unknown[]) => Promise<void>)(...args),
  uploadBytesResumable: vi.fn((_ref: unknown, file: File) => ({
    on: (
      _event: string,
      next?: (snap: { bytesTransferred: number; totalBytes: number }) => void,
      _error?: (e: Error) => void,
      complete?: () => void,
    ) => {
      const total = (file as File).size || 100;
      next?.({ bytesTransferred: Math.floor(total / 2), totalBytes: total });
      next?.({ bytesTransferred: total, totalBytes: total });
      complete?.();
    },
    snapshot: { ref: { path: 'done' } },
  })),
  getDownloadURL: (...args: unknown[]) =>
    (getDownloadURLMock as (...a: unknown[]) => Promise<string>)(...args),
  deleteObject: (...args: unknown[]) =>
    (deleteObjectMock as (...a: unknown[]) => Promise<void>)(...args),
}));

import { storageService } from './storageService';

afterEach(() => {
  deleteObjectMock.mockClear();
  uploadBytesMock.mockClear();
});

describe('storageService (Firebase Storage)', () => {
  it('uploadFile tải lên và trả về download URL', async () => {
    const file = new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' });
    const url = await storageService.uploadFile('submissions/HK1N1/s1/f.jpg', file);
    expect(uploadBytesMock).toHaveBeenCalledTimes(1);
    expect(url).toContain('firebasestorage.googleapis.com');
  });

  it('uploadFileWithProgress báo tiến trình rồi trả URL', async () => {
    const file = new File([new Uint8Array(100)], 'p.jpg', { type: 'image/jpeg' });
    const seen: [number, number][] = [];
    const url = await storageService.uploadFileWithProgress('submissions/HK1N1/s1/p.jpg', file, (s, t) =>
      seen.push([s, t]),
    );
    expect(url).toContain('firebasestorage.googleapis.com');
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1][0]).toBe(seen[seen.length - 1][1]);
  });

  it('deleteFileByUrl xoá object tương ứng', async () => {
    await storageService.deleteFileByUrl('https://firebasestorage.googleapis.com/v0/b/x/o/old.jpg');
    expect(deleteObjectMock).toHaveBeenCalledTimes(1);
  });

  it('deleteFilesByUrls bỏ qua URL rỗng và không ném lỗi', async () => {
    await storageService.deleteFilesByUrls(['', 'https://firebasestorage.googleapis.com/x']);
    expect(deleteObjectMock).toHaveBeenCalledTimes(1);
  });

  it('getEvidenceFiles đọc mọi biến thể key cũ/mới', () => {
    expect(storageService.getEvidenceFiles({ fileUrls: ['a'] })).toEqual(['a']);
    expect(storageService.getEvidenceFiles({ 'File uploads': ['b'] })).toEqual(['b']);
    expect(storageService.getEvidenceFiles({ fileUrl: 'c' })).toEqual(['c']);
    expect(storageService.getEvidenceFiles({ 'File upload': 'd' })).toEqual(['d']);
    expect(storageService.getEvidenceFiles({})).toEqual([]);
  });
});

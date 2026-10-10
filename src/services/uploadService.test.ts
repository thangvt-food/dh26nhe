import { describe, expect, it, vi } from 'vitest';

// Mock tầng Firebase để test pure validation không khởi tạo SDK thật.
vi.mock('@/firebase', () => ({
  db: {},
  storage: {},
  rtdb: {},
  APP_CONFIG: { defaultClassName: 'DH26NHE', defaultSemester: 'HK1N1' },
  SEMESTERS: ['HK1N1'],
}));

const uploadWithProgressMock = vi.fn(
  async (
    _path: string,
    file: File,
    onProgress?: (sent: number, total: number) => void,
  ): Promise<string> => {
    const total = file.size || 100;
    onProgress?.(Math.floor(total / 2), total);
    onProgress?.(total, total);
    return `https://example.com/${file.name}`;
  },
);

vi.mock('./storageService', () => ({
  storageService: {
    uploadFile: vi.fn(async () => 'https://example.com/f'),
    uploadFileWithProgress: (...args: unknown[]) =>
      (uploadWithProgressMock as (...a: unknown[]) => Promise<string>)(...args),
    deleteFilesByUrls: vi.fn(async () => undefined),
    deleteFileByUrl: vi.fn(async () => undefined),
    getEvidenceFiles: vi.fn(() => []),
  },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args: unknown[]) => ({ path: args.join('/') })),
  addDoc: vi.fn(async () => ({ id: 'doc-1' })),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
  deleteDoc: vi.fn(async () => undefined),
  doc: vi.fn(),
  updateDoc: vi.fn(async () => undefined),
  writeBatch: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getCountFromServer: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  onValue: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  push: vi.fn(),
  get: vi.fn(),
}));

vi.mock('@/utils/localforage', () => ({
  clearUserCache: vi.fn(async () => undefined),
  setUserActivitiesCache: vi.fn(async () => undefined),
  getUserActivitiesCache: vi.fn(async () => null),
  clearAllCaches: vi.fn(async () => undefined),
}));

import { validateFiles, uploadService, MAX_FILES_PER_SUBMISSION, MAX_UPLOAD_SIZE } from './uploadService';

function makeFile(name: string, size: number, type = 'image/jpeg'): File {
  const bytes = new Uint8Array(Math.min(size, 1024));
  const file = new File([bytes], name, { type });
  // Ghi đè size để test file lớn mà không tốn RAM.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateFiles — kiểm tra tệp trước khi tải lên', () => {
  it('báo lỗi khi không có tệp nào', () => {
    expect(validateFiles([])).toBe('Không có tệp nào được chọn.');
  });

  it(`báo lỗi khi vượt quá ${MAX_FILES_PER_SUBMISSION} tệp`, () => {
    const files = Array.from({ length: MAX_FILES_PER_SUBMISSION + 1 }, (_, i) =>
      makeFile(`a${i}.jpg`, 100),
    );
    expect(validateFiles(files)).toContain('Tối đa');
  });

  it('báo lỗi khi tệp vượt quá 10MB', () => {
    const files = [makeFile('lon.jpg', MAX_UPLOAD_SIZE + 1)];
    expect(validateFiles(files)).toContain('vượt quá 10MB');
  });

  it('chấp nhận đúng giới hạn 10MB', () => {
    const files = [makeFile('vua.jpg', MAX_UPLOAD_SIZE)];
    expect(validateFiles(files)).toBeNull();
  });

  it('chấp nhận danh sách tệp hợp lệ', () => {
    const files = [makeFile('a.jpg', 5000), makeFile('b.pdf', 8000, 'application/pdf')];
    expect(validateFiles(files)).toBeNull();
  });
});

describe('uploadBatch — tiến trình tổng theo bytes', () => {
  const user = {
    email: '26129001@st.hcmuaf.edu.vn',
    uid: 'uid-1',
    displayName: 'Test User',
    photoURL: '',
  } as never;

  it('báo % tăng dần và kết thúc ở 1', async () => {
    const seen: number[] = [];
    const result = await uploadService.uploadBatch({
      user,
      semester: 'HK1N1',
      activityName: 'Hoạt động X',
      bonusPoints: 5,
      files: [makeFile('a.jpg', 100), makeFile('b.jpg', 300)],
      onProgress: (f) => seen.push(f),
    });
    expect(result.id).toBe('doc-1');
    expect(result.fileUrls).toHaveLength(2);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]).toBe(1);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    }
  });

  it('dọn file đã tải khi ghi Firestore thất bại', async () => {
    const { storageService } = await import('./storageService');
    const { addDoc } = await import('firebase/firestore');
    (addDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('firestore down'));
    await expect(
      uploadService.uploadBatch({
        user,
        semester: 'HK1N1',
        activityName: 'Hoạt động Y',
        bonusPoints: 5,
        files: [makeFile('c.jpg', 100)],
      }),
    ).rejects.toThrow('firestore down');
    expect(storageService.deleteFilesByUrls).toHaveBeenCalled();
  });
});

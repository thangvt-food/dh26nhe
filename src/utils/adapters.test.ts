import { describe, expect, it } from 'vitest';
import { normalizeSubmission, normalizeRoom } from './adapters';

describe('normalizeSubmission — ánh xạ trạng thái', () => {
  it("'Phê duyệt' → approved", () => {
    expect(normalizeSubmission('id1', { Status: 'Phê duyệt' }, 'HK1N1').status).toBe('approved');
  });

  it("'approved' → approved", () => {
    expect(normalizeSubmission('id1', { status: 'approved' }, 'HK1N1').status).toBe('approved');
  });

  it("'Không phê duyệt' → rejected", () => {
    expect(normalizeSubmission('id1', { Status: 'Không phê duyệt' }, 'HK1N1').status).toBe('rejected');
  });

  it('thiếu trạng thái → pending', () => {
    expect(normalizeSubmission('id1', {}, 'HK1N1').status).toBe('pending');
  });
});

describe('normalizeSubmission — chuẩn hoá file URLs', () => {
  it('ưu tiên mảng fileUrls chuẩn', () => {
    const out = normalizeSubmission('id1', { fileUrls: ['a', 'b'] }, 'HK1N1');
    expect(out.fileUrls).toEqual(['a', 'b']);
    expect(out.fileUrl).toBe('a');
  });

  it("đọc key cũ 'File uploads'", () => {
    const out = normalizeSubmission('id1', { 'File uploads': ['x', 'y'] }, 'HK1N1');
    expect(out.fileUrls).toEqual(['x', 'y']);
  });

  it("gom string 'File upload' thành mảng", () => {
    const out = normalizeSubmission('id1', { 'File upload': 'single-url' }, 'HK1N1');
    expect(out.fileUrls).toEqual(['single-url']);
    expect(out.fileUrl).toBe('single-url');
  });

  it('lọc bỏ URL rỗng', () => {
    const out = normalizeSubmission('id1', { fileUrls: ['a', '', null] }, 'HK1N1');
    expect(out.fileUrls).toEqual(['a']);
  });
});

describe('normalizeSubmission — chuẩn hoá thời gian', () => {
  it('giữ nguyên epoch ms', () => {
    expect(normalizeSubmission('id1', { submittedAt: 1718000000000 }, 'HK1N1').submittedAt).toBe(
      1718000000000,
    );
  });

  it('đọc Firestore Timestamp (toMillis)', () => {
    const out = normalizeSubmission('id1', { submittedAt: { toMillis: () => 123456 } }, 'HK1N1');
    expect(out.submittedAt).toBe(123456);
  });

  it('đọc dạng { seconds }', () => {
    const out = normalizeSubmission('id1', { submittedAt: { seconds: 1000 } }, 'HK1N1');
    expect(out.submittedAt).toBe(1000000);
  });

  it('đọc chuỗi ISO', () => {
    const out = normalizeSubmission('id1', { submittedAt: '2024-06-10T00:00:00.000Z' }, 'HK1N1');
    expect(out.submittedAt).toBe(new Date('2024-06-10T00:00:00.000Z').getTime());
  });
});

describe('normalizeSubmission — thông tin sinh viên & mặc định', () => {
  it('tách studentId từ email', () => {
    const out = normalizeSubmission('id1', { email: '26129001@st.hcmuaf.edu.vn' }, 'HK1N1');
    expect(out.studentId).toBe('26129001');
    expect(out.semester).toBe('HK1N1');
    expect(out.className).toBe('DH26NHE');
  });

  it("đọc key cũ 'Tên hoạt động' / 'Điểm cộng' / 'Chi tiết'", () => {
    const out = normalizeSubmission(
      'id1',
      { 'Tên hoạt động': 'Tiếp sức mùa thi', 'Điểm cộng': '5', 'Chi tiết': 'Ảnh mờ' },
      'HK1N1',
    );
    expect(out.activityName).toBe('Tiếp sức mùa thi');
    expect(out.bonusPoints).toBe(5);
    expect(out.reviewNote).toBe('Ảnh mờ');
  });

  it('giữ lại clientKey để khử trùng lặp optimistic UI', () => {
    expect(normalizeSubmission('id1', { clientKey: 'optimistic-123' }, 'HK1N1').clientKey).toBe(
      'optimistic-123',
    );
    expect(normalizeSubmission('id1', {}, 'HK1N1').clientKey).toBeUndefined();
  });

  it('kết quả KHÔNG chứa key tiếng Việt', () => {
    const out = normalizeSubmission(
      'id1',
      { 'Tên hoạt động': 'X', 'Điểm cộng': 3, 'File upload': 'u', Status: 'Phê duyệt' },
      'HK1N1',
    );
    for (const key of Object.keys(out)) {
      expect(key).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
    }
  });
});

describe('normalizeRoom', () => {
  it('chuẩn hoá phòng với giá trị mặc định', () => {
    const room = normalizeRoom('ACT-1', { name: 'Tiếp sức mùa thi', points: 5 }, 'HK1N1');
    expect(room.id).toBe('ACT-1');
    expect(room.semester).toBe('HK1N1');
    expect(room.createdBy).toBe('Ban Cán Sự');
    expect(room.isActive).toBe(true);
  });
});

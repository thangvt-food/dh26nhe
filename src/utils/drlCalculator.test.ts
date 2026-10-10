import { describe, expect, it } from 'vitest';
import {
  calculateSimilarity,
  matchActivityCriteria,
  calculateConditionalScore,
  evaluateStudentDrl,
} from './drlCalculator';
import type { ActivitySubmission } from '@/types/submission.types';

function makeSubmission(overrides: Partial<ActivitySubmission> = {}): ActivitySubmission {
  return {
    id: 'test-id',
    activityName: 'Hoạt động test',
    bonusPoints: 5,
    fileUrl: 'https://example.com/a.jpg',
    fileUrls: ['https://example.com/a.jpg'],
    status: 'approved',
    submittedAt: Date.now(),
    studentId: '26129001',
    email: '26129001@st.hcmuaf.edu.vn',
    fullName: 'Nguyễn Văn A',
    className: 'DH26NHE',
    semester: 'HK1N1',
    ...overrides,
  };
}

describe('calculateSimilarity', () => {
  it('trả về 1 với 2 chuỗi giống nhau', () => {
    expect(calculateSimilarity('hello', 'hello')).toBe(1);
  });

  it('trả về 1.0 với 2 chuỗi rỗng', () => {
    expect(calculateSimilarity('', '')).toBe(1.0);
  });

  it('không phân biệt hoa thường', () => {
    expect(calculateSimilarity('CLB Học Thuật', 'clb học thuật')).toBe(1);
  });

  it('trả về 0..1 với chuỗi khác nhau', () => {
    const sim = calculateSimilarity('tiếp sức mùa thi', 'hiến máu nhân đạo');
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThan(1);
  });
});

describe('matchActivityCriteria', () => {
  it('khớp khi tên chứa từ khoá', () => {
    expect(matchActivityCriteria(['Tham gia CLB học thuật cấp trường'], 'clb học thuật')).toBe(true);
  });

  it('không khớp danh sách rỗng', () => {
    expect(matchActivityCriteria([], 'clb học thuật')).toBe(false);
  });

  it('bỏ qua tên rỗng', () => {
    expect(matchActivityCriteria(['', 'Hoạt động tình nguyện'], 'nckh')).toBe(false);
  });
});

describe('calculateConditionalScore', () => {
  it('đạt 2 tiêu chí chính → 100 điểm', () => {
    const subs = [
      makeSubmission({ activityName: 'Tham gia CLB học thuật cấp trường' }),
      makeSubmission({ activityName: 'Nghiên cứu khoa học sinh viên' }),
    ];
    const { conditionalScore, metConditions } = calculateConditionalScore(subs);
    expect(conditionalScore).toBe(100);
    expect(metConditions).toContain('Tham gia CLB học thuật');
    expect(metConditions).toContain('Nghiên cứu khoa học');
  });

  it('đạt 1 tiêu chí chính → 95 điểm', () => {
    const subs = [makeSubmission({ activityName: 'Tham gia CLB học thuật' })];
    expect(calculateConditionalScore(subs).conditionalScore).toBe(95);
  });

  it('có thành tích đặc biệt → 95 điểm', () => {
    const subs = [makeSubmission({ activityName: 'Đạt giải Thành tích đặc biệt cấp trường' })];
    const { conditionalScore, metConditions } = calculateConditionalScore(subs);
    expect(conditionalScore).toBe(95);
    expect(metConditions).toContain('Thành tích đặc biệt');
  });

  it('không đạt gì → 90 điểm mặc định', () => {
    const subs = [makeSubmission({ activityName: 'Tham gia tiếp sức mùa thi' })];
    const { conditionalScore, metConditions } = calculateConditionalScore(subs);
    expect(conditionalScore).toBe(90);
    expect(metConditions).toHaveLength(0);
  });
});

describe('evaluateStudentDrl', () => {
  it('cộng dồn điểm thưởng và chốt tối đa 100', () => {
    const subs = [
      makeSubmission({ activityName: 'CLB học thuật', bonusPoints: 5 }),
      makeSubmission({ activityName: 'Nghiên cứu khoa học', bonusPoints: 10 }),
      makeSubmission({ activityName: 'Cán bộ lớp', bonusPoints: 5 }),
    ];
    const result = evaluateStudentDrl(subs);
    expect(result.totalBonusPoints).toBe(20);
    expect(result.approvedCount).toBe(3);
    expect(result.finalScore).toBeLessThanOrEqual(100);
    expect(result.conditionalScore).toBe(100);
  });

  it('danh sách rỗng → 90 điểm, 0 điểm thưởng', () => {
    const result = evaluateStudentDrl([]);
    expect(result.finalScore).toBe(90);
    expect(result.totalBonusPoints).toBe(0);
    expect(result.approvedCount).toBe(0);
  });
});

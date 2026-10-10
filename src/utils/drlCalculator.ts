import type { ActivitySubmission } from '@/types/submission.types';
import type { DrlScoreResult } from '@/types/drl.types';

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, j) =>
    Array.from({ length: a.length + 1 }, (_, i) => (j === 0 ? i : i === 0 ? j : 0)),
  );
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }
  return matrix[b.length][a.length];
}

export function calculateSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  if (longer.length === 0) return 1.0;
  return (
    (longer.length - levenshteinDistance(a.toLowerCase(), b.toLowerCase())) / longer.length
  );
}

export function matchActivityCriteria(
  activityNames: string[],
  targetKeyword: string,
  threshold = 0.75,
): boolean {
  const targetLower = targetKeyword.toLowerCase();
  return activityNames.some((name) => {
    if (!name) return false;
    const nameLower = name.toLowerCase();
    if (nameLower.includes(targetLower)) return true;
    return calculateSimilarity(nameLower, targetLower) >= threshold;
  });
}

export function calculateConditionalScore(
  approvedSubmissions: ActivitySubmission[],
): { conditionalScore: number; metConditions: string[] } {
  const names = approvedSubmissions.map((s) => s.activityName);

  const hasClub = matchActivityCriteria(names, 'câu lạc bộ học thuật') || matchActivityCriteria(names, 'clb học thuật');
  const hasResearch = matchActivityCriteria(names, 'nghiên cứu khoa học');
  const hasOfficer =
    matchActivityCriteria(names, 'cán bộ') || matchActivityCriteria(names, 'ban cán sự');
  const hasSpecial =
    matchActivityCriteria(names, 'thành tích đặc biệt') || matchActivityCriteria(names, 'giải thưởng');
  const hasGpa =
    matchActivityCriteria(names, 'học tập trung bình') || matchActivityCriteria(names, 'gpa');

  const metConditions: string[] = [];
  if (hasClub) metConditions.push('Tham gia CLB học thuật');
  if (hasResearch) metConditions.push('Nghiên cứu khoa học');
  if (hasOfficer) metConditions.push('Cán bộ Lớp / Đoàn / Hội');
  if (hasSpecial) metConditions.push('Thành tích đặc biệt');
  if (hasGpa) metConditions.push('Học tập (GPA ≥ 2.5)');

  const mainCriteriaCount = (hasClub ? 1 : 0) + (hasResearch ? 1 : 0) + (hasOfficer ? 1 : 0);

  let conditionalScore = 90;
  if (mainCriteriaCount >= 2) {
    conditionalScore = 100;
  } else if (mainCriteriaCount >= 1 || hasSpecial) {
    conditionalScore = 95;
  }

  return { conditionalScore, metConditions };
}

export function evaluateStudentDrl(
  approvedSubmissions: ActivitySubmission[],
): DrlScoreResult {
  const { conditionalScore, metConditions } = calculateConditionalScore(approvedSubmissions);
  const totalBonusPoints = approvedSubmissions.reduce((sum, s) => sum + (s.bonusPoints || 0), 0);
  const finalScore = Math.min(conditionalScore, 100);
  return {
    finalScore,
    conditionalScore,
    metConditions,
    totalBonusPoints,
    approvedCount: approvedSubmissions.length,
  };
}

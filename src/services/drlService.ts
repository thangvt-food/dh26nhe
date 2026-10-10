import { getDocs, collection } from 'firebase/firestore';
import { ref as rtdbRef, get as rtdbGet } from 'firebase/database';
import { db, rtdb } from '@/firebase';
import { normalizeSubmission } from '@/utils/adapters';
import { evaluateStudentDrl } from '@/utils/drlCalculator';
import type { ActivitySubmission, StudentDrlProfile } from '@/types/submission.types';

export interface RankEntry {
  rank: number;
  email: string;
  fullName: string;
  score: number;
  activityCount: number;
}

export const drlService = {
  async fetchSemesterSubmissions(semester: string): Promise<ActivitySubmission[]> {
    const snap = await getDocs(collection(db, 'users', semester, 'submissions'));
    return snap.docs.map((d) => normalizeSubmission(d.id, d.data(), semester));
  },

  computeRanking(all: ActivitySubmission[]): RankEntry[] {
    const approved = all.filter((s) => s.status === 'approved');
    const groups = new Map<string, { fullName: string; score: number; activityCount: number }>();
    for (const s of approved) {
      const g = groups.get(s.email) ?? { fullName: s.fullName, score: 0, activityCount: 0 };
      g.score += s.bonusPoints || 0;
      g.activityCount += 1;
      if (!g.fullName) g.fullName = s.fullName;
      groups.set(s.email, g);
    }
    return [...groups.entries()]
      .map(([email, g], i) => ({ rank: i + 1, email, ...g }))
      .sort((a, b) => b.score - a.score)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  },

  buildStudentProfile(args: {
    email: string;
    fullName: string;
    studentId: string;
    className: string;
    semester: string;
    submissions: ActivitySubmission[];
  }): StudentDrlProfile {
    const approved = args.submissions.filter((s) => s.status === 'approved');
    const result = evaluateStudentDrl(approved);
    return {
      studentId: args.studentId,
      email: args.email,
      fullName: args.fullName,
      className: args.className,
      semester: args.semester,
      totalSubmissions: args.submissions.length,
      approvedSubmissions: approved.length,
      totalBonusPoints: result.totalBonusPoints,
      conditionalScore: result.conditionalScore,
      finalScore: result.finalScore,
      metCriteria: [],
      updatedAt: Date.now(),
    };
  },

  async fetchRtdbDrl(semester: string): Promise<Record<string, unknown>[]> {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `drl/${semester}`));
      const val = snap.val() as Record<string, unknown> | null;
      if (!val) return [];
      return Object.values(val) as Record<string, unknown>[];
    } catch {
      return [];
    }
  },
};

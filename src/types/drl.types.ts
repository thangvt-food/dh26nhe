export type { SubmissionStatus, ActivitySubmission, MetCriteriaItem, StudentDrlProfile } from './submission.types';
export type { RoomDefinition, BroadcastNotification, UploadLockConfig } from './submission.types';

export interface DrlScoreResult {
  finalScore: number;
  conditionalScore: number;
  metConditions: string[];
  totalBonusPoints: number;
  approvedCount: number;
}

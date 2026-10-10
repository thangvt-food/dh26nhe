export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface ActivitySubmission {
  id: string;
  activityId?: string;
  activityName: string;
  bonusPoints: number;
  fileUrl: string;
  fileUrls: string[];
  status: SubmissionStatus;
  submittedAt: number;

  studentId: string;
  email: string;
  fullName: string;
  photoUrl?: string;
  className: string;
  semester: string;

  reviewNote?: string;
  reviewedAt?: number | null;
  reviewedBy?: string | null;

  clientKey?: string;
}

export interface RoomDefinition {
  id: string;
  name: string;
  points: number;
  description: string;
  imageUrl?: string;
  semester: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  notificationId?: string | null;
  isActive?: boolean;
}

export interface BroadcastNotification {
  id: string;
  activityId?: string;
  title: string;
  body: string;
  imageUrl?: string;
  points?: number;
  semester: string;
  senderName: string;
  timestamp: number;
}

export interface MetCriteriaItem {
  id: 'academic_club' | 'scientific_research' | 'class_officer' | 'special_achievement' | 'gpa';
  label: string;
  matchedActivityName: string;
  points: number;
}

export interface StudentDrlProfile {
  studentId: string;
  email: string;
  fullName: string;
  className: string;
  semester: string;
  totalSubmissions: number;
  approvedSubmissions: number;
  totalBonusPoints: number;
  conditionalScore: number;
  finalScore: number;
  metCriteria: MetCriteriaItem[];
  updatedAt: number;
}

export interface UploadLockConfig {
  isLocked: boolean;
  whitelist: Record<string, boolean>;
}

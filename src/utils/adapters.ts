import type { ActivitySubmission, SubmissionStatus } from '@/types/submission.types';

/**
 * Chuẩn hoá dữ liệu lai tạp (VN keys cũ + EN keys mới) về schema DH26NHE.
 * Không bao giờ trả về key tiếng Việt.
 */
export function normalizeSubmission(
  docId: string,
  raw: Record<string, unknown>,
  semester: string,
): ActivitySubmission {
  const r = raw as Record<string, any>;

  let status: SubmissionStatus = 'pending';
  const rawStatus = r.status ?? r.Status ?? r['Trạng thái'];
  if (rawStatus === 'Phê duyệt' || rawStatus === 'approved') status = 'approved';
  else if (rawStatus === 'Không phê duyệt' || rawStatus === 'Không duyệt' || rawStatus === 'rejected')
    status = 'rejected';

  let fileUrls: string[] = [];
  if (Array.isArray(r.fileUrls)) fileUrls = r.fileUrls;
  else if (Array.isArray(r['File uploads'])) fileUrls = r['File uploads'];
  else if (Array.isArray(r.FileUrls)) fileUrls = r.FileUrls;
  else if (typeof r.fileUrl === 'string' && r.fileUrl) fileUrls = [r.fileUrl];
  else if (typeof r['File upload'] === 'string' && r['File upload']) fileUrls = [r['File upload']];
  else if (typeof r['Link minh chứng'] === 'string' && r['Link minh chứng'])
    fileUrls = [r['Link minh chứng']];
  fileUrls = fileUrls.filter(Boolean).map(String);

  let submittedAt = Date.now();
  const rawTime = r.submittedAt ?? r['Thời gian'] ?? r.createdAt ?? r.Timestamp ?? r.timestamp;
  if (rawTime) {
    if (typeof (rawTime as any)?.toMillis === 'function') submittedAt = (rawTime as any).toMillis();
    else if (typeof (rawTime as any)?.toDate === 'function')
      submittedAt = (rawTime as any).toDate().getTime();
    else if (typeof (rawTime as any)?.seconds === 'number')
      submittedAt = (rawTime as any).seconds * 1000;
    else if (typeof rawTime === 'number') submittedAt = rawTime;
    else {
      const parsed = new Date(rawTime as string).getTime();
      if (!Number.isNaN(parsed)) submittedAt = parsed;
    }
  }

  const email: string = String(r.email ?? r.Email ?? '');
  const studentId: string = String(
    r.studentId ?? r.MSSV ?? (email ? email.split('@')[0] : ''),
  );
  const fullName: string = String(
    r.fullName ?? r.Name ?? r['Họ và tên'] ?? r['Họ tên'] ?? (studentId || 'Sinh viên'),
  );

  return {
    id: docId,
    activityId: r.activityId ?? r.roomId ?? undefined,
    activityName: String(r.activityName ?? r['Tên hoạt động'] ?? 'Hoạt động'),
    bonusPoints: Number(r.bonusPoints ?? r['Điểm cộng'] ?? r.points ?? 0),
    fileUrl: fileUrls[0] || '',
    fileUrls,
    status,
    submittedAt,
    studentId,
    email,
    fullName,
    photoUrl: String(r.photoUrl ?? r.photoURL ?? ''),
    className: String(r.className ?? r['Lớp'] ?? 'DH26NHE'),
    semester: String(r.semester ?? semester),
    reviewNote: String(r.reviewNote ?? r['Chi tiết'] ?? r['Ghi chú'] ?? r.rejectionReason ?? ''),
    reviewedAt: (r.reviewedAt as number | null) ?? null,
    reviewedBy: (r.reviewedBy as string | null) ?? null,
    clientKey: r.clientKey ? String(r.clientKey) : undefined,
  };
}

export function normalizeRoom(roomId: string, raw: Record<string, unknown>, semester: string) {
  const r = raw as Record<string, any>;
  return {
    id: roomId,
    name: String(r.name ?? r.title ?? 'Hoạt động'),
    points: Number(r.points ?? 0),
    description: String(r.description ?? r.body ?? ''),
    imageUrl: r.imageUrl ? String(r.imageUrl) : undefined,
    semester: String(r.semester ?? semester),
    createdBy: String(r.createdBy ?? r.adminId ?? 'Ban Cán Sự'),
    createdAt: Number(r.createdAt ?? Date.now()),
    updatedAt: Number(r.updatedAt ?? r.createdAt ?? Date.now()),
    notificationId: (r.notificationId as string | null) ?? null,
    isActive: r.isActive !== false,
  };
}

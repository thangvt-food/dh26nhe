import type { ActivitySubmission } from '@/types/submission.types';

export type ChatItem = ActivitySubmission & {
  _optimistic?: boolean;
  _uploadDone?: boolean;
  notes?: string;
  realId?: string;
  progress?: number;
  /** MIME type song song với fileUrls (để nhận diện blob preview không đuôi file). */
  fileTypes?: string[];
};

/**
 * Gộp tin realtime với bubble optimistic.
 * - Bubble tạm CHƯA có bản thật → giữ nguyên (hiển thị blob preview).
 * - Bubble tạm ĐÃ có bản thật (khớp clientKey/id) → nâng cấp: lấy trạng thái
 *   (status, điểm, id thật) từ server nhưng GIỮ nguyên blob preview để không
 *   phải tải lại ảnh từ Firebase trong phiên hiện tại.
 * - File phi-ảnh (preview rỗng) thì lấy URL thật để link tài liệu bấm được.
 * - Item cũ không phải optimistic → thay bằng dữ liệu tươi.
 */
export function mergeChatItems(prev: ChatItem[], data: ActivitySubmission[]): ChatItem[] {
  const dataByClientKey = new Map<string, ActivitySubmission>();
  for (const d of data) {
    if (d.clientKey) dataByClientKey.set(d.clientKey, d);
  }
  const dataIds = new Set(data.map((d) => d.id));
  const consumedRealIds = new Set<string>();
  const merged: ChatItem[] = [];
  const kept: ChatItem[] = [];

  for (const p of prev) {
    if (!p._optimistic) continue;
    const real =
      (p.clientKey && dataByClientKey.get(p.clientKey)) ||
      (dataIds.has(p.id) ? data.find((d) => d.id === p.id) : undefined);
    if (!real) {
      kept.push(p);
      continue;
    }
    consumedRealIds.add(real.id);
    const fileUrls = p.fileUrls.map((u, i) =>
      u && u.startsWith('blob:') ? u : (real.fileUrls[i] ?? u),
    );
    merged.push({
      ...real,
      id: real.id,
      fileUrl: fileUrls[0] || real.fileUrl,
      fileUrls,
      // Giữ MIME đã biết từ lúc chọn file (real doc không lưu MIME).
      fileTypes: p.fileTypes,
      notes: p.notes,
      _optimistic: false,
      _uploadDone: true,
      progress: 1,
      realId: real.id,
    });
  }

  const rest = data.filter((d) => !consumedRealIds.has(d.id));
  return [...rest, ...merged, ...kept].sort((a, b) => a.submittedAt - b.submittedAt);
}

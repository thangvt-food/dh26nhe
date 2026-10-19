import { auth } from '@/firebase';

/**
 * Client gọi Cloudflare Worker API (port Go server).
 * VITE_API_URL để trống → mọi hàm trả về null/bỏ qua (pure client-side).
 */
function apiBase(): string {
  const v = import.meta.env.VITE_API_URL as string | undefined;
  return (v ?? '').replace(/\/$/, '');
}

async function userToken(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

export const apiService = {
  get baseUrl(): string {
    return apiBase();
  },

  get enabled(): boolean {
    return apiBase().length > 0;
  },

  /** Gửi email xác nhận nộp bài qua Worker → GAS. Fire-and-forget, không ném lỗi. */
  async notifyUpload(args: {
    email: string;
    subject: string;
    body: string;
    fileUrl?: string;
    fileName?: string;
    userName?: string;
  }): Promise<boolean> {
    const base = apiBase();
    if (!base) return false;
    const token = await userToken();
    if (!token) return false;
    try {
      const res = await fetch(`${base}/send-email-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(args),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Báo Discord có minh chứng mới qua Worker. Fire-and-forget, không ném lỗi. */
  async notifySubmission(args: {
    activityName: string;
    userName?: string;
    email?: string;
    semester?: string;
    fileName?: string;
    fileUrl?: string;
    note?: string;
  }): Promise<boolean> {
    const base = apiBase();
    if (!base) return false;
    const token = await userToken();
    if (!token) return false;
    try {
      const res = await fetch(`${base}/api/notify-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(args),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Đăng tin + push FCM qua Worker (admin). Ném lỗi để caller toast. */
  async broadcastNotification(args: {
    title: string;
    body: string;
    imageUrl?: string;
    semester?: string;
    activityId?: string;
    points?: number;
    writeRtdb?: boolean;
  }): Promise<{ notificationId: string; pushed: number }> {
    const base = apiBase();
    if (!base) throw new Error('Worker API chưa được cấu hình.');
    const token = await userToken();
    if (!token) throw new Error('Chưa đăng nhập.');
    const res = await fetch(`${base}/api/notifications/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Broadcast thất bại (HTTP ${res.status}).`);
    }
    return (await res.json()) as { notificationId: string; pushed: number };
  },
};

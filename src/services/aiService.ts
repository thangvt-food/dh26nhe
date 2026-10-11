import { auth } from '@/firebase';

/**
 * AI service — biên tập thông báo qua Worker proxy (Groq).
 * Key GROQ_API_KEY nằm ở secret của Worker, KHÔNG bao giờ nằm ở client.
 * Worker yêu cầu Bearer Firebase ID Token (mọi user đăng nhập được gọi).
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

export interface AiFormatResult {
  title: string;
  body: string;
  score?: number;
}

export const aiService = {
  get enabled(): boolean {
    return apiBase().length > 0;
  },

  /** Gửi nội dung thô (đã thay URL bằng [URL_X]) → nhận { title, body, score }. */
  async formatNotification(text: string): Promise<AiFormatResult> {
    const base = apiBase();
    if (!base) throw new Error('Worker API chưa được cấu hình.');
    const token = await userToken();
    if (!token) throw new Error('Chưa đăng nhập.');
    const res = await fetch(`${base}/api/ai/format`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
    });
    const data = (await res.json().catch(() => null)) as
      | { error?: string; title?: string; body?: string; score?: number }
      | null;
    if (!res.ok) throw new Error(data?.error ?? `AI lỗi (HTTP ${res.status}).`);
    return { title: data?.title ?? '', body: data?.body ?? '', score: data?.score };
  },
};

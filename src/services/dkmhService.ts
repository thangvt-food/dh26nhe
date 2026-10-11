/**
 * Client gọi DKMH proxy trên Worker API (port từ dkmh-vercel lib/dkmh-client.ts).
 * Token DKMH (MSSV login) lưu ở localStorage máy người dùng, KHÔNG qua Firebase.
 * Credentials (MSSV + mật khẩu mã hóa base64) cũng lưu trên máy để TỘ ĐỘNG
 * đăng nhập lại khi access/refresh token đều hết hạn — user không cần nhập lại.
 * Yêu cầu VITE_API_URL trỏ tới worker đã deploy; để trống = TKB bị khóa với
 * thông báo cấu hình (app Firebase client-side vẫn chạy bình thường).
 */

export interface DkmhAuth {
  token: string;
  username: string;
  name?: string;
  refreshToken?: string;
}

export const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.';
export const WORKER_MISSING_MESSAGE =
  'Worker API chưa được cấu hình (VITE_API_URL). Không tải được dữ liệu DKMH.';

const TOKEN_KEY = 'dkmh_token';
const REFRESH_KEY = 'dkmh_refresh';
const USER_KEY = 'dkmh_user';
const NAME_KEY = 'dkmh_name';
const PASS_KEY = 'dkmh_pass'; // base64 của mật khẩu — phục vụ auto re-login

function apiBase(): string {
  const v = import.meta.env.VITE_API_URL as string | undefined;
  return (v ?? '').replace(/\/$/, '');
}

export function dkmhApiEnabled(): boolean {
  return apiBase().length > 0;
}

function encodeUtf8(s: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}

function decodeUtf8(s: string): string {
  const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function getDkmhAuth(): DkmhAuth | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USER_KEY);
  if (!token || !username) return null;
  return {
    token,
    username,
    name: localStorage.getItem(NAME_KEY) || undefined,
    refreshToken: localStorage.getItem(REFRESH_KEY) || undefined,
  };
}

export function setDkmhAuth(auth: DkmhAuth) {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USER_KEY, auth.username);
  if (auth.name) localStorage.setItem(NAME_KEY, auth.name);
  if (auth.refreshToken) localStorage.setItem(REFRESH_KEY, auth.refreshToken);
}

/** Có credentials đã lưu trên máy không (đủ điều kiện auto re-login). */
function hasStoredCredentials(): boolean {
  return Boolean(localStorage.getItem(USER_KEY) && localStorage.getItem(PASS_KEY));
}

export function clearDkmhAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(PASS_KEY);
}

async function readError(res: Response, fallback: string): Promise<Error> {
  const data = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
  const err = new Error(data?.error ?? fallback);
  (err as { code?: string }).code = data?.code;
  return err;
}

async function requestLogin(username: string, password: string) {
  const res = await fetch(`${apiBase()}/api/dkmh/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  });
  if (!res.ok) throw await readError(res, 'Đăng nhập DKMH thất bại.');
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; name?: string };
  if (!data.access_token) throw new Error('Đăng nhập DKMH thất bại.');
  return data;
}

export async function loginDkmh(username: string, password: string): Promise<DkmhAuth> {
  if (!apiBase()) throw new Error(WORKER_MISSING_MESSAGE);
  const data = await requestLogin(username, password);
  const auth: DkmhAuth = {
    token: data.access_token as string,
    username: username.trim(),
    name: data.name,
    refreshToken: data.refresh_token,
  };
  setDkmhAuth(auth);
  // Lưu credentials để auto re-login khi token bị reset (base64, chỉ trên máy này)
  try {
    localStorage.setItem(PASS_KEY, encodeUtf8(password));
  } catch {
    /* ignore */
  }
  return auth;
}

/** Đăng nhập lại âm thầm bằng credentials đã lưu. Trả về null nếu không thể. */
async function autoRelogin(): Promise<DkmhAuth | null> {
  if (!apiBase() || !hasStoredCredentials()) return null;
  try {
    const username = localStorage.getItem(USER_KEY) as string;
    const password = decodeUtf8(localStorage.getItem(PASS_KEY) as string);
    const data = await requestLogin(username, password);
    const auth: DkmhAuth = {
      token: data.access_token as string,
      username,
      name: data.name,
      refreshToken: data.refresh_token,
    };
    setDkmhAuth(auth);
    return auth;
  } catch {
    return null;
  }
}

/** Đảm bảo có phiên DKMH: token còn → dùng; mất → auto re-login từ credentials đã lưu. */
export async function ensureDkmhSession(): Promise<DkmhAuth | null> {
  const current = getDkmhAuth();
  if (current?.token) return current;
  return autoRelogin();
}

async function refreshDkmhToken(): Promise<string> {
  const base = apiBase();
  const auth = getDkmhAuth();
  if (!auth?.refreshToken) throw new Error(SESSION_EXPIRED_MESSAGE);
  const res = await fetch(`${base}/api/dkmh/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: auth.refreshToken }),
  });
  if (!res.ok) throw new Error(SESSION_EXPIRED_MESSAGE);
  const data = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!data.access_token) throw new Error(SESSION_EXPIRED_MESSAGE);
  setDkmhAuth({ ...auth, token: data.access_token, refreshToken: data.refresh_token || auth.refreshToken });
  return data.access_token;
}

/** 401 + TOKEN_EXPIRED? */
async function isTokenExpired(res: Response): Promise<boolean> {
  if (res.status !== 401) return false;
  const err = (await res.json().catch(() => null)) as { code?: string } | null;
  return err?.code === 'TOKEN_EXPIRED';
}

async function postWithRefresh(path: string, body: Record<string, unknown>): Promise<unknown> {
  const base = apiBase();
  if (!base) throw new Error(WORKER_MISSING_MESSAGE);
  // Token bị reset/thiếu → thử auto re-login ngay từ credentials đã lưu
  let auth = getDkmhAuth();
  if (!auth?.token) auth = await autoRelogin();
  if (!auth?.token) throw new Error('Vui lòng đăng nhập (nhập MSSV + mật khẩu).');

  const send = (token: string) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, token }),
    });

  let res = await send(auth.token);

  // Hết hạn access token → refresh; refresh hỏng → đăng nhập lại bằng credentials
  for (let attempt = 0; attempt < 2 && (await isTokenExpired(res)); attempt++) {
    try {
      const fresh = await refreshDkmhToken();
      res = await send(fresh);
      continue;
    } catch {
      /* refresh_token cũng hết hạn → thử auto re-login */
    }
    const reAuth = await autoRelogin();
    if (!reAuth) {
      clearDkmhAuth();
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
    res = await send(reAuth.token);
  }

  if (await isTokenExpired(res)) {
    clearDkmhAuth();
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }
  if (!res.ok) throw await readError(res, 'Không tải được dữ liệu DKMH.');
  return res.json();
}

export type DkmhEndpoint = '/api/dkmh/grades' | '/api/dkmh/tkb' | '/api/dkmh/exam';

export async function fetchDkmhApi(path: DkmhEndpoint, extra: Record<string, unknown> = {}) {
  return postWithRefresh(path, extra);
}

/** Link xuất ICS kèm token (thẻ <a> không gửi header được). */
export function getExportIcsHref(hocKy?: number): string {
  const base = apiBase();
  const auth = getDkmhAuth();
  const prefix = base ? `${base}/api/dkmh/tkb/export-ics` : '/api/dkmh/tkb/export-ics';
  if (!auth?.token) return prefix;
  let href = `${prefix}?token=${encodeURIComponent(auth.token)}`;
  if (hocKy) href += `&hoc_ky=${hocKy}`;
  return href;
}

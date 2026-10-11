/**
 * DH26NHE API Worker — port từ Go server gốc (server/main.go + handlers/).
 *
 * Phạm vi port (đúng phần app mới dùng):
 *   GET  /health | /ping                       — kiểm tra trạng thái
 *   GET  /api/config                           — config công khai
 *   POST /send-email-upload                    — relay email qua GAS (user đăng nhập)
 *   POST /api/notifications/broadcast          — ghi RTDB notifications + push FCM (admin)
 *   POST /api/notifications/send-to-user       — push FCM tới 1 user (admin)
 *   POST /api/dkmh/login                       — đăng nhập DKMH (MSSV + mật khẩu) → access/refresh token
 *   POST /api/dkmh/refresh                     — cấp lại access token bằng refresh_token
 *   POST /api/dkmh/tkb                         — thời khóa biểu theo học kỳ (Bearer DKMH token)
 *   POST /api/dkmh/grades                      — bảng điểm (Bearer DKMH token)
 *   POST /api/dkmh/exam                        — lịch thi (Bearer DKMH token)
 *   GET  /api/dkmh/tkb/export-ics              — xuất TKB dạng .ics (?token=&hoc_ky=)
 *
 * KHÔNG port (ngoài phạm vi 3 trang + admin): Drive export, news scrape,
 * quiz GCN, reports, suggestions, posts — client gọi Firebase trực tiếp.
 *
 * Auth: Bearer Firebase ID Token (admin endpoints yêu cầu claim admin === true),
 * hoặc header X-API-Key khớp secret API_KEY.
 *
 * Deploy:
 *   1. npx wrangler login
 *   2. (tuỳ chọn FCM) npx wrangler secret put FCM_SERVICE_ACCOUNT_JSON  (dán service account JSON)
 *      (tuỳ chọn)     npx wrangler secret put API_KEY
 *      (tuỳ chọn)     npx wrangler secret put GAS_WEB_APP_URL
 *   3. npx wrangler deploy   (trong thư mục workers/api/)
 *   4. Client: VITE_API_URL=https://dh26nhe-api.<sub>.workers.dev (để trống = chạy pure client-side)
 */

interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_URL: string;
  DEFAULT_CLASS_NAME?: string;
  DEFAULT_SEMESTER?: string;
  GAS_WEB_APP_URL?: string;
  API_KEY?: string;
  FCM_SERVICE_ACCOUNT_JSON?: string;
  GROQ_API_KEY?: string;
}

interface TokenClaims {
  sub?: string;
  name?: string;
  admin?: boolean;
  [k: string]: unknown;
}

const GOOGLE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbzdjZ3NCgwQY6ByHc1J7-hBgM69bwORXxzZ91j-pKKcnqii0UsIG7D34u21xzt13EJ6/exec';

let jwksCache: { keys: Array<{ kid?: string; [k: string]: unknown }>; fetchedAt: number } | null = null;

/* ── helpers ─────────────────────────────── */

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----(BEGIN|END)[^-]*-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/* ── Firebase ID Token verify (WebCrypto, không cần Admin SDK) ── */

async function verifyFirebaseIdToken(token: string, projectId: string): Promise<TokenClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('bad token format');
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0]))) as { kid?: string; alg?: string };
  if (header.alg !== 'RS256' || !header.kid) throw new Error('bad token header');

  if (!jwksCache || Date.now() - jwksCache.fetchedAt > 3600_000) {
    const res = await fetch(GOOGLE_JWKS_URL);
    if (!res.ok) throw new Error('jwks fetch failed');
    const body = (await res.json()) as { keys: Array<{ kid?: string; [k: string]: unknown }> };
    jwksCache = { keys: body.keys, fetchedAt: Date.now() };
  }
  const jwk = jwksCache.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('unknown signing key');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk as JsonWebKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), data);
  if (!valid) throw new Error('bad token signature');

  const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1]))) as TokenClaims;
  const now = Math.floor(Date.now() / 1000);
  if (claims.aud !== projectId) throw new Error('bad audience');
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('bad issuer');
  if (typeof claims.exp !== 'number' || claims.exp < now) throw new Error('token expired');
  if (!claims.sub) throw new Error('no subject');
  return claims;
}

function bearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

async function requireUser(req: Request, env: Env): Promise<TokenClaims> {
  const token = bearerToken(req);
  if (!token) throw json({ error: 'Missing or invalid Authorization header' }, 401);
  try {
    return await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
  } catch {
    throw json({ error: 'Invalid or expired token' }, 401);
  }
}

async function requireAdmin(req: Request, env: Env): Promise<TokenClaims> {
  const apiKey = req.headers.get('X-API-Key');
  if (apiKey && env.API_KEY && apiKey === env.API_KEY) {
    return { sub: 'api-key', name: 'API', admin: true };
  }
  const claims = await requireUser(req, env);
  if (claims.admin !== true) throw json({ error: 'Admin privileges required' }, 403);
  return claims;
}

/* ── RTDB REST (dùng token của caller — rules cho admin write) ── */

function rtdbUrl(env: Env, path: string, token: string): string {
  const base = env.FIREBASE_DATABASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\/+/, '');
  return `${base}/${clean}.json?auth=${encodeURIComponent(token)}`;
}

async function rtdbGet<T>(env: Env, path: string, token: string): Promise<T | null> {
  const res = await fetch(rtdbUrl(env, path, token));
  if (!res.ok) throw new Error(`RTDB GET failed: ${res.status}`);
  return (await res.json()) as T | null;
}

async function rtdbPut(env: Env, path: string, token: string, value: unknown): Promise<void> {
  const res = await fetch(rtdbUrl(env, path, token), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`RTDB PUT failed: ${res.status}`);
}

async function rtdbDelete(env: Env, path: string, token: string): Promise<void> {
  const res = await fetch(rtdbUrl(env, path, token), { method: 'DELETE' });
  if (!res.ok) throw new Error(`RTDB DELETE failed: ${res.status}`);
}

// Firebase push-ID generator (tương thích thứ tự thời gian của RTDB push).
const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
function generatePushId(): string {
  let now = Date.now();
  const timeStampChars = new Array(8);
  for (let i = 7; i >= 0; i--) {
    timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
    now = Math.floor(now / 64);
  }
  let id = timeStampChars.join('');
  for (let i = 0; i < 12; i++) {
    id += PUSH_CHARS.charAt(Math.floor(Math.random() * 64));
  }
  return id;
}

/* ── FCM HTTP v1 (cần secret FCM_SERVICE_ACCOUNT_JSON) ── */

interface ServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id?: string;
  project_id: string;
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getFcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: sa.private_key_id ?? '' })));
  const payload = b64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`)));
  const assertion = `${header}.${payload}.${b64urlEncode(sig)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(assertion)}`,
  });
  if (!res.ok) throw new Error(`OAuth token exchange failed: ${res.status}`);
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error('No access token returned');
  return body.access_token;
}

function isInvalidFcmError(message: string): boolean {
  const lower = (message || '').toLowerCase();
  return (
    lower.includes('registration-token-not-registered') ||
    lower.includes('unregistered') ||
    lower.includes('not-a-registered-token') ||
    lower.includes('invalidregistration')
  );
}

interface FcmSendResult {
  success: number;
  failure: number;
  invalidTokens: string[];
}

async function sendFcmToTokens(
  env: Env,
  accessToken: string,
  tokens: string[],
  args: { title: string; body: string; imageUrl?: string; data?: Record<string, string> },
): Promise<FcmSendResult> {
  const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON as string) as ServiceAccount;
  const result: FcmSendResult = { success: 0, failure: 0, invalidTokens: [] };
  for (const token of tokens) {
    try {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title: args.title,
                body: args.body,
                ...(args.imageUrl ? { image: args.imageUrl } : {}),
              },
              data: args.data ?? {},
              android: { priority: 'high', notification: { sound: 'default' } },
            },
          }),
        },
      );
      if (res.ok) {
        result.success += 1;
      } else {
        result.failure += 1;
        const text = await res.text().catch(() => '');
        if (isInvalidFcmError(text)) result.invalidTokens.push(token);
      }
    } catch {
      result.failure += 1;
    }
  }
  return result;
}

async function cleanupInvalidTokens(env: Env, callerToken: string, invalidTokens: string[]): Promise<void> {
  if (invalidTokens.length === 0) return;
  const invalid = new Set(invalidTokens);
  const docs = await rtdbGet<Record<string, { tokens?: { token: string }[] }>>(env, 'fcmTokens', callerToken);
  if (!docs) return;
  for (const [uid, doc] of Object.entries(docs)) {
    const tokens = doc?.tokens ?? [];
    const kept = tokens.filter((t) => t?.token && !invalid.has(t.token));
    if (kept.length !== tokens.length) {
      if (kept.length === 0) await rtdbDelete(env, `fcmTokens/${uid}`, callerToken).catch(() => undefined);
      else await rtdbPut(env, `fcmTokens/${uid}`, callerToken, { tokens: kept }).catch(() => undefined);
    }
  }
}

async function collectAllTokens(env: Env, callerToken: string): Promise<string[]> {
  const docs = await rtdbGet<Record<string, { tokens?: { token: string }[] }>>(env, 'fcmTokens', callerToken);
  if (!docs) return [];
  const out: string[] = [];
  for (const doc of Object.values(docs)) {
    for (const t of doc?.tokens ?? []) {
      if (t?.token) out.push(t.token);
    }
  }
  return out;
}

/* ── DKMH proxy (port từ dkmh-vercel: lib/dkmh.ts + lib/ics.ts) ──
 * Client (app TKB) đăng nhập bằng MSSV/mật khẩu DKMH, nhận access/refresh
 * token lưu ở localStorage máy người dùng; worker chỉ relay sang
 * https://dkmh.hcmuaf.edu.vn nên không giữ mật khẩu/mã token nào.
 */

const DKMH_BASE = 'https://dkmh.hcmuaf.edu.vn';
const DKMH_TOKEN_EXPIRED = 'DKMH_TOKEN_EXPIRED';

interface DkmhHocKy {
  hoc_ky: number;
  ten_hoc_ky: string;
  ngay_bat_dau_hk?: string;
  ngay_ket_thuc_hk?: string;
}

function dkmhHeaders(token: string, contentType: string): Record<string, string> {
  return {
    accept: 'application/json, text/plain, */*',
    authorization: `Bearer ${token}`,
    'content-type': contentType,
    Referer: 'https://dkmh.hcmuaf.edu.vn/',
  };
}

async function dkmhFetch(path: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    return await fetch(`${DKMH_BASE}${path}`, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function dkmhLogin(username: string, password: string) {
  const u = username.trim();
  if (!u || !password) return null;
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', u);
  params.append('password', password);
  try {
    const res = await dkmhFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data?.access_token ? data : null;
  } catch {
    return null;
  }
}

async function dkmhRefreshToken(refreshToken: string) {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken.trim());
  const res = await dkmhFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data?.access_token ? data : null;
}

/** POST JSON kèm Bearer token. DKMH trả 401 → token hết hạn. */
async function dkmhPost(path: string, token: string, body: unknown): Promise<unknown> {
  const res = await dkmhFetch(path, {
    method: 'POST',
    headers: dkmhHeaders(token, 'application/json'),
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error(DKMH_TOKEN_EXPIRED);
  if (!res.ok) throw new Error(`DKMH request failed: ${res.status}`);
  return res.json();
}

function parseVnDateKey(dateStr?: string): number {
  if (!dateStr) return NaN;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return NaN;
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).setHours(0, 0, 0, 0);
}

async function dkmhHocKyList(token: string): Promise<DkmhHocKy[]> {
  const data = (await dkmhPost('/api/sch/w-locdshockytkbuser', token, {
    filter: { is_tieng_anh: null },
    additional: { paging: { limit: 100, page: 1 }, ordering: [{ name: 'hoc_ky', order_type: 1 }] },
  })) as { data?: { ds_hoc_ky?: DkmhHocKy[] } };
  return data?.data?.ds_hoc_ky ?? [];
}

function pickCurrentHocKy(list: DkmhHocKy[]): number | null {
  if (list.length === 0) return null;
  const now = new Date().setHours(0, 0, 0, 0);
  for (const hk of list) {
    const s = parseVnDateKey(hk.ngay_bat_dau_hk);
    const e = parseVnDateKey(hk.ngay_ket_thuc_hk);
    if (!isNaN(s) && !isNaN(e) && now >= s && now <= e) return hk.hoc_ky;
  }
  return Math.max(...list.map((h) => h.hoc_ky));
}

async function dkmhFetchTkb(token: string, hocKy?: number): Promise<unknown> {
  let dsHocKy: DkmhHocKy[] = [];
  try {
    dsHocKy = await dkmhHocKyList(token);
  } catch {
    // Không lấy được danh sách học kỳ → dùng hocKy truyền vào / fallback.
  }
  const chosen = hocKy ?? pickCurrentHocKy(dsHocKy) ?? 20261;
  const body = (await dkmhPost('/api/sch/w-locdstkbtuanusertheohocky', token, {
    filter: { hoc_ky: chosen, ten_hoc_ky: '' },
    additional: { paging: { limit: 100, page: 1 }, ordering: [{ name: null, order_type: null }] },
  })) as { data?: Record<string, unknown> };
  // DKMH bọc sẵn { data: {...}, result, code } — tách lớp để client đọc trực tiếp các trường.
  const inner = (body?.data ?? body) as Record<string, unknown>;
  return { ...inner, hoc_ky_da_chon: chosen, ds_hoc_ky: dsHocKy };
}

async function dkmhFetchGrades(token: string): Promise<unknown> {
  const res = await dkmhFetch('/api/srm/w-locdsdiemsinhvien?hien_thi_mon_theo_hkdk=false', {
    method: 'POST',
    headers: dkmhHeaders(token, 'text/plain'),
    body: '',
  });
  if (res.status === 401) throw new Error(DKMH_TOKEN_EXPIRED);
  if (!res.ok) throw new Error(`DKMH request failed: ${res.status}`);
  const body = (await res.json()) as { data?: unknown };
  return body?.data ?? body;
}

async function dkmhFetchExam(token: string): Promise<unknown> {
  const body = (await dkmhPost('/api/epm/w-locdslichthisvtheohocky', token, {
    filter: { hoc_ky: 20252, is_giua_ky: false },
    additional: { paging: { limit: 100, page: 1 }, ordering: [{ name: null, order_type: null }] },
  })) as { data?: unknown };
  return body?.data ?? body;
}

/** Lấy Bearer DKMH token từ header Authorization hoặc body.token. */
function extractDkmhToken(req: Request, body: { token?: unknown }): string | null {
  const auth = req.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer (.+)$/i);
  if (m) return m[1].trim() || null;
  return typeof body.token === 'string' && body.token.trim() ? body.token.trim() : null;
}

function generateTkbIcs(inputData: unknown): string {
  const data = (inputData as { data?: Record<string, unknown> })?.data ?? (inputData as Record<string, unknown>);
  const dsTiet = (data?.ds_tiet_trong_ngay ?? []) as Array<{ tiet?: number; gio_bat_dau?: string; gio_ket_thuc?: string }>;
  const dsTuan = (data?.ds_tuan_tkb ?? []) as Array<{
    ds_thoi_khoa_bieu?: Array<{
      is_nghi_day?: boolean;
      ngay_hoc?: string;
      tiet_bat_dau?: number;
      so_tiet?: number;
      id_tkb?: string | number;
      ten_mon?: string;
      ma_phong?: string;
      ten_giang_vien?: string;
      ma_lop?: string;
    }>;
  }>;
  const timeMap: Record<number, { start?: string; end?: string }> = {};
  for (const s of dsTiet) {
    if (s?.tiet) timeMap[s.tiet] = { start: s.gio_bat_dau, end: s.gio_ket_thuc };
  }
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DH26NHE//TKB Export//VN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Thoi Khoa Bieu DKMH',
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
  ];
  for (const week of dsTuan) {
    for (const item of week.ds_thoi_khoa_bieu ?? []) {
      if (item.is_nghi_day || !item.ngay_hoc) continue;
      const dateStr = item.ngay_hoc.split('T')[0].replace(/-/g, '');
      const startTiet = item.tiet_bat_dau ?? 0;
      const endTiet = startTiet + (item.so_tiet ?? 0) - 1;
      const startInfo = timeMap[startTiet];
      const endInfo = timeMap[endTiet];
      if (!startInfo?.start || !endInfo?.end) continue;
      const startTime = `${startInfo.start.replace(':', '')}00`;
      const endTime = `${endInfo.end.replace(':', '')}00`;
      const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${item.id_tkb ?? `${startTiet}-${endTiet}`}_${dateStr}@hcmuaf.edu.vn`);
      lines.push(`DTSTAMP:${stamp}Z`);
      lines.push(`DTSTART;TZID=Asia/Ho_Chi_Minh:${dateStr}T${startTime}`);
      lines.push(`DTEND;TZID=Asia/Ho_Chi_Minh:${dateStr}T${endTime}`);
      lines.push(`SUMMARY:${item.ten_mon ?? ''}`);
      lines.push(`LOCATION:${item.ma_phong ?? ''}`);
      lines.push(
        `DESCRIPTION:GV: ${item.ten_giang_vien ?? ''}\\nLop: ${item.ma_lop ?? ''}\\nTiet: ${startTiet} - ${endTiet}`,
      );
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-PT30M');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Nhac lich hoc: ${item.ten_mon ?? ''}`);
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/* ── AI (Groq) — biên tập thông báo theo format chung (port từ NotificationPostForm) ── */

function buildAiFormatPrompt(cleanBody: string): string {
  return `Biên tập nội dung sau thành thông báo phòng hoạt động chuyên nghiệp. Giữ nguyên các placeholder [URL_X].

Viết lại bằng Markdown gọn gàng:
- **In đậm** cho thông tin quan trọng.
- Mỗi ý một dòng. Dùng - cho danh sách. Viết hoa chữ cái đầu mỗi mục.
- Có thể mở đầu bằng "# " cho tiêu đề phần.
- Sửa lỗi chính tả. KHÔNG thêm thông tin mới.
- Tiêu đề dưới 60 ký tự.
- Điểm: 10 (trực tiếp), 5 (online), 15 (đặc biệt).

QUAN TRỌNG: Body dùng newline thực (không dùng \\n). Trả về JSON thuần:
{"title":"...","body":"...","score":5}

Nội dung: [${cleanBody}]`;
}

function parseAiJson(content: string): { title?: string; body?: string; score?: number } | null {
  let c = content.trim();
  c = c.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (c.startsWith('```json')) c = c.replace(/^```json/, '').replace(/```$/, '').trim();
  else if (c.startsWith('```')) c = c.replace(/^```/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(c) as { title?: string; body?: string; score?: number };
  } catch {
    const titleMatch = c.match(/"title"\s*:\s*"([^"]*)"/);
    const bodyMatch = c.match(/"body"\s*:\s*"([\s\S]*?)"/);
    const scoreMatch = c.match(/"score"\s*:\s*(\d+)/);
    if (!titleMatch && !bodyMatch) return null;
    return {
      title: titleMatch?.[1] ?? '',
      body: (bodyMatch?.[1] ?? '').replace(/\\n/g, '\n'),
      score: scoreMatch ? Number(scoreMatch[1]) : undefined,
    };
  }
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/* ── router ──────────────────────────────── */

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (req.method === 'GET' && (path === '/health' || path === '/ping')) {
      return path === '/ping'
        ? new Response('pong', { headers: corsHeaders() })
        : json({ status: 'ok' });
    }

    if (req.method === 'GET' && path === '/api/config') {
      return json({
        projectId: env.FIREBASE_PROJECT_ID,
        className: env.DEFAULT_CLASS_NAME ?? 'DH26NHE',
        defaultSemester: env.DEFAULT_SEMESTER ?? 'HK1N1',
      });
    }

    // POST /send-email-upload — relay sang GAS (giống Go handler).
    if (req.method === 'POST' && path === '/send-email-upload') {
      try {
        await requireUser(req, env);
      } catch (e) {
        return e as Response;
      }
      let body: { email?: string; subject?: string; body?: string; fileUrl?: string; fileName?: string; userName?: string };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return json({ error: 'Invalid JSON body' }, 400);
      }
      if (!body.email || !body.subject) {
        return json({ error: 'Thiếu email hoặc subject.' }, 400);
      }
      const gasUrl = env.GAS_WEB_APP_URL || DEFAULT_GAS_URL;
      const form = new URLSearchParams();
      form.set('action', 'send_email');
      form.set('email', body.email);
      form.set('subject', body.subject);
      form.set('body', body.body ?? '');
      form.set('fileUrl', body.fileUrl ?? '');
      form.set('fileName', body.fileName ?? '');
      form.set('userName', body.userName ?? '');
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          },
          body: form.toString(),
        });
        if (res.status !== 200 && res.status !== 302) {
          return json({ error: `Failed to delegate email to GAS: ${res.status}` }, 500);
        }
      } catch (err) {
        return json({ error: `Failed to delegate email to GAS: ${err instanceof Error ? err.message : 'unknown'}` }, 500);
      }
      return json({ message: 'Email request sent to GAS' });
    }

    // POST /api/notifications/broadcast — ghi RTDB + push FCM (admin).
    if (req.method === 'POST' && path === '/api/notifications/broadcast') {
      let claims: TokenClaims;
      try {
        claims = await requireAdmin(req, env);
      } catch (e) {
        return e as Response;
      }
      const callerToken = bearerToken(req) as string;
      let body: { title?: string; body?: string; imageUrl?: string; semester?: string; activityId?: string; points?: number; writeRtdb?: boolean };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return json({ error: 'Invalid request body' }, 400);
      }
      if (!body.title || !body.body) return json({ error: 'Invalid request body' }, 400);

      const adminName = typeof claims.name === 'string' && claims.name ? claims.name : 'Admin';
      const notifId = generatePushId();
      const semester = body.semester || env.DEFAULT_SEMESTER || 'HK1N1';
      // Ghi vào nhánh duy nhất activities/{semester}/{id} (dạng phòng hoạt động).
      const roomData: Record<string, unknown> = {
        name: body.title,
        points: body.points !== undefined ? Number(body.points) || 0 : 5,
        description: body.body,
        imageUrl: body.imageUrl ?? '',
        semester,
        createdBy: adminName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notificationId: null,
        isActive: true,
      };

      if (body.writeRtdb !== false) {
        try {
          await rtdbPut(env, `activities/${semester}/${notifId}`, callerToken, roomData);
        } catch {
          return json({ error: 'Failed to save notification' }, 500);
        }
      }

      // FCM multicast (bỏ qua nếu chưa cấu hình secret).
      let pushed = 0;
      if (env.FCM_SERVICE_ACCOUNT_JSON) {
        try {
          const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount;
          const accessToken = await getFcmAccessToken(sa);
          const tokens = await collectAllTokens(env, callerToken);
          if (tokens.length > 0) {
            const data: Record<string, string> = { notificationId: notifId, type: 'notification' };
            if (body.semester) data.semester = body.semester;
            if (body.activityId) data.activityId = body.activityId;
            const result = await sendFcmToTokens(env, accessToken, tokens, {
              title: body.title,
              body: body.body,
              imageUrl: body.imageUrl,
              data,
            });
            pushed = result.success;
            await cleanupInvalidTokens(env, callerToken, result.invalidTokens);
          }
        } catch {
          // Push thất bại không làm fail request (tin đã lưu RTDB).
        }
      }

      return json({ success: true, notificationId: notifId, pushed });
    }

    // POST /api/notifications/send-to-user — push FCM tới 1 user (admin).
    if (req.method === 'POST' && path === '/api/notifications/send-to-user') {
      try {
        await requireAdmin(req, env);
      } catch (e) {
        return e as Response;
      }
      const callerToken = bearerToken(req) as string;
      let body: { uid?: string; title?: string; body?: string; semester?: string; imageUrl?: string };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return json({ error: 'Invalid request body' }, 400);
      }
      if (!body.uid || !body.title || !body.body) return json({ error: 'Invalid request body' }, 400);
      if (!env.FCM_SERVICE_ACCOUNT_JSON) {
        return json({ error: 'FCM chưa được cấu hình trên Worker.' }, 503);
      }
      try {
        const doc = await rtdbGet<{ tokens?: { token: string }[] }>(env, `fcmTokens/${body.uid}`, callerToken);
        const tokens = (doc?.tokens ?? []).map((t) => t?.token).filter(Boolean) as string[];
        if (tokens.length === 0) return json({ error: 'User has no registered devices' }, 404);
        const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount;
        const accessToken = await getFcmAccessToken(sa);
        const data: Record<string, string> = { type: 'test' };
        if (body.semester) data.semester = body.semester;
        const result = await sendFcmToTokens(env, accessToken, tokens, {
          title: body.title,
          body: body.body,
          imageUrl: body.imageUrl,
          data,
        });
        await cleanupInvalidTokens(env, callerToken, result.invalidTokens);
        return json({ success: true, sent: tokens.length, ok: result.success, failed: result.failure });
      } catch {
        return json({ error: 'Failed to send notification' }, 500);
      }
    }

    // ── DKMH proxy (public, token nằm ở client) ──
    if (req.method === 'POST' && path === '/api/dkmh/login') {
      const body = await readJsonBody(req);
      const username = typeof body.username === 'string' ? body.username : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!username.trim() || !password) return json({ error: 'Thiếu MSSV/mật khẩu.' }, 400);
      try {
        const data = await dkmhLogin(username, password);
        if (!data) return json({ error: 'Đăng nhập DKMH thất bại.' }, 401);
        return json(data);
      } catch {
        return json({ error: 'Đăng nhập DKMH thất bại.' }, 401);
      }
    }

    if (req.method === 'POST' && path === '/api/dkmh/refresh') {
      const body = await readJsonBody(req);
      const refreshToken = typeof body.refresh_token === 'string' ? body.refresh_token : '';
      if (!refreshToken.trim()) {
        return json({ error: 'Thiếu refresh_token, vui lòng đăng nhập lại.' }, 401);
      }
      try {
        const data = await dkmhRefreshToken(refreshToken);
        if (!data) return json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.' }, 401);
        return json(data);
      } catch {
        return json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.' }, 401);
      }
    }

    if (req.method === 'POST' && path === '/api/dkmh/tkb') {
      const body = await readJsonBody(req);
      const token = extractDkmhToken(req, body);
      if (!token) return json({ error: 'Vui lòng đăng nhập (nhập MSSV + mật khẩu) để xem TKB.' }, 401);
      const rawHocKy = body.hoc_ky ?? body.hocKy;
      const hocKy = typeof rawHocKy === 'number' && Number.isFinite(rawHocKy) ? rawHocKy : undefined;
      try {
        return json({ data: await dkmhFetchTkb(token, hocKy) });
      } catch (err) {
        if (err instanceof Error && err.message === DKMH_TOKEN_EXPIRED) {
          return json({ error: 'Token DKMH hết hạn.', code: 'TOKEN_EXPIRED' }, 401);
        }
        return json({ error: 'Không thể lấy dữ liệu thời khóa biểu.' }, 500);
      }
    }

    if (req.method === 'POST' && path === '/api/dkmh/grades') {
      const body = await readJsonBody(req);
      const token = extractDkmhToken(req, body);
      if (!token) return json({ error: 'Vui lòng đăng nhập (nhập MSSV + mật khẩu) để xem điểm.' }, 401);
      try {
        return json({ data: await dkmhFetchGrades(token) });
      } catch (err) {
        if (err instanceof Error && err.message === DKMH_TOKEN_EXPIRED) {
          return json({ error: 'Token DKMH hết hạn.', code: 'TOKEN_EXPIRED' }, 401);
        }
        return json({ error: 'Không thể lấy dữ liệu điểm.' }, 500);
      }
    }

    if (req.method === 'POST' && path === '/api/dkmh/exam') {
      const body = await readJsonBody(req);
      const token = extractDkmhToken(req, body);
      if (!token) return json({ error: 'Vui lòng đăng nhập (nhập MSSV + mật khẩu) để xem lịch thi.' }, 401);
      try {
        return json({ data: await dkmhFetchExam(token) });
      } catch (err) {
        if (err instanceof Error && err.message === DKMH_TOKEN_EXPIRED) {
          return json({ error: 'Token DKMH hết hạn.', code: 'TOKEN_EXPIRED' }, 401);
        }
        return json({ error: 'Không thể lấy dữ liệu lịch thi.' }, 500);
      }
    }

    if (req.method === 'GET' && path === '/api/dkmh/tkb/export-ics') {
      const token = url.searchParams.get('token')?.trim();
      if (!token) return json({ error: 'Vui lòng đăng nhập để xuất TKB.' }, 401);
      const hocKyParam = Number(url.searchParams.get('hoc_ky'));
      const hocKy = Number.isFinite(hocKyParam) && hocKyParam > 0 ? hocKyParam : undefined;
      try {
        const data = await dkmhFetchTkb(token, hocKy);
        const icsText = generateTkbIcs(data);
        return new Response(icsText, {
          headers: {
            'Content-Type': 'text/calendar',
            'Content-Disposition': 'attachment; filename=tkb_hcmuaf.ics',
            ...corsHeaders(),
          },
        });
      } catch (err) {
        if (err instanceof Error && err.message === DKMH_TOKEN_EXPIRED) {
          return json({ error: 'Token DKMH hết hạn.', code: 'TOKEN_EXPIRED' }, 401);
        }
        return json({ error: 'Không thể tạo file export.' }, 500);
      }
    }

    // POST /api/ai/format — biên tập nội dung thông báo bằng Groq (user đăng nhập Firebase).
    if (req.method === 'POST' && path === '/api/ai/format') {
      try {
        await requireUser(req, env);
      } catch (e) {
        return e as Response;
      }
      if (!env.GROQ_API_KEY) {
        return json({ error: 'AI chưa được cấu hình trên Worker (GROQ_API_KEY).' }, 503);
      }
      const body = await readJsonBody(req);
      const text = typeof body.text === 'string' ? body.text : '';
      if (!text.trim()) return json({ error: 'Thiếu nội dung cần biên tập.' }, 400);
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
          body: JSON.stringify({
            // groq/compound-mini đã bị Groq loại bỏ (404) — dùng gpt-oss-120b + JSON mode
            model: 'openai/gpt-oss-120b',
            max_tokens: 8192,
            reasoning_effort: 'low',
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: buildAiFormatPrompt(text) }],
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          const detail = errText.slice(0, 200);
          return json({ error: `Groq API lỗi (HTTP ${res.status})${detail ? `: ${detail}` : ''}` }, 502);
        }
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const parsed = parseAiJson(data.choices?.[0]?.message?.content ?? '');
        if (!parsed) return json({ error: 'AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.' }, 502);
        return json({ title: parsed.title ?? '', body: parsed.body ?? '', score: parsed.score });
      } catch {
        return json({ error: 'Không gọi được AI. Vui lòng thử lại sau.' }, 502);
      }
    }

    return json({ error: 'Not found.' }, 404);
  },
};

import { beforeAll, describe, expect, it, vi } from 'vitest';
import worker from './worker';

const ENV = {
  FIREBASE_PROJECT_ID: 'dh26nhe',
  FIREBASE_DATABASE_URL: 'https://dh26nhe-default-rtdb.asia-southeast1.firebasedatabase.app',
  DEFAULT_CLASS_NAME: 'DH26NHE',
  DEFAULT_SEMESTER: 'HK1N1',
  GAS_WEB_APP_URL: 'https://gas.example/exec',
  DISCORD_WEBHOOK_URL: 'https://discord.example/webhook',
};

function b64url(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlBytes(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let privateKey: CryptoKey;
let publicJwk: JsonWebKey & { kid?: string };

async function makeToken(claims: Record<string, unknown>): Promise<string> {
  const header = b64url({ alg: 'RS256', typ: 'JWT', kid: 'test-kid' });
  const payload = b64url(claims);
  const data = `${header}.${payload}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, privateKey, new TextEncoder().encode(data)),
  );
  return `${data}.${b64urlBytes(sig)}`;
}

function validClaims(extra: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    aud: 'dh26nhe',
    iss: 'https://securetoken.google.com/dh26nhe',
    exp: now + 3600,
    iat: now,
    sub: 'uid-admin-1',
    name: 'Test Admin',
    admin: true,
    ...extra,
  };
}

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function mockFetchRouter() {
  fetchMock.mockImplementation(async (input: unknown) => {
    const url = String(input);
    if (url.includes('googleapis.com/service_accounts')) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 });
    }
    if (url === 'https://gas.example/exec') {
      return new Response('ok', { status: 200 });
    }
    if (url === 'https://discord.example/webhook') {
      return new Response(null, { status: 204 });
    }
    if (url.startsWith('https://firebasestorage.googleapis.com/v0/b/dh26nhe.firebasestorage.app/o/')) {
      return new Response('evidence-bytes', { status: 200 });
    }
    if (url.includes('firebasedatabase.app')) {
      return new Response(JSON.stringify({}), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  });
}

beforeAll(async () => {
  const kp = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  privateKey = kp.privateKey;
  publicJwk = (await crypto.subtle.exportKey('jwk', kp.publicKey)) as JsonWebKey & { kid?: string };
  publicJwk.kid = 'test-kid';
  mockFetchRouter();
});

function req(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

describe('API Worker — public routes', () => {
  it('GET /health → {status:ok}', async () => {
    const res = await worker.fetch(req('/health'), ENV);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('GET /ping → pong', async () => {
    const res = await worker.fetch(req('/ping'), ENV);
    expect(await res.text()).toBe('pong');
  });

  it('OPTIONS trả CORS 204', async () => {
    const res = await worker.fetch(req('/api/config', { method: 'OPTIONS' }), ENV);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('GET /api/config trả config công khai', async () => {
    const res = await worker.fetch(req('/api/config'), ENV);
    const data = (await res.json()) as Record<string, string>;
    expect(data.projectId).toBe('dh26nhe');
    expect(data.className).toBe('DH26NHE');
  });

  it('route lạ → 404', async () => {
    const res = await worker.fetch(req('/khong-co'), ENV);
    expect(res.status).toBe(404);
  });
});

describe('API Worker — send-email-upload', () => {
  it('thiếu token → 401', async () => {
    const res = await worker.fetch(
      req('/send-email-upload', { method: 'POST', body: JSON.stringify({ email: 'a@x.com' }) }),
      ENV,
    );
    expect(res.status).toBe(401);
  });

  it('token hợp lệ → relay sang GAS dạng form', async () => {
    const token = await makeToken(validClaims());
    fetchMock.mockClear();
    const res = await worker.fetch(
      req('/send-email-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: 's@st.hcmuaf.edu.vn', subject: 'Chào', body: 'Nội dung' }),
      }),
      ENV,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'Email request sent to GAS' });
    const gasCall = fetchMock.mock.calls.find((c) => String(c[0]) === 'https://gas.example/exec');
    expect(gasCall).toBeDefined();
    expect(String((gasCall as unknown[])[1] && ((gasCall as unknown[])[1] as RequestInit).body)).toContain(
      'action=send_email',
    );
  });
});

describe('API Worker — notify-submission', () => {
  it('thiếu token → 401', async () => {
    const res = await worker.fetch(
      req('/api/notify-submission', {
        method: 'POST',
        body: JSON.stringify({ activityName: 'Hoạt động A' }),
      }),
      ENV,
    );
    expect(res.status).toBe(401);
  });

  it('token hợp lệ → gửi embed tới Discord', async () => {
    const token = await makeToken(validClaims());
    fetchMock.mockClear();
    const res = await worker.fetch(
      req('/api/notify-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activityName: 'Hoạt động A', userName: 'An', email: 'a@x.com' }),
      }),
      ENV,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const discordCall = fetchMock.mock.calls.find((c) => String(c[0]) === 'https://discord.example/webhook');
    expect(discordCall).toBeDefined();
    expect(String((discordCall as unknown[])[1] && ((discordCall as unknown[])[1] as RequestInit).body)).toContain(
      'Hoạt động A',
    );
  });

  it('chưa cấu hình webhook → skip, không gọi Discord', async () => {
    const token = await makeToken(validClaims());
    fetchMock.mockClear();
    const res = await worker.fetch(
      req('/api/notify-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activityName: 'Hoạt động B' }),
      }),
      { ...ENV, DISCORD_WEBHOOK_URL: undefined },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      skipped: true,
      reason: 'Discord webhook chưa được cấu hình.',
    });
    expect(fetchMock.mock.calls.some((c) => String(c[0]) === 'https://discord.example/webhook')).toBe(false);
  });
});

describe('API Worker — broadcast', () => {
  it('thiếu admin claim → 403', async () => {
    const token = await makeToken(validClaims({ admin: false }));
    const res = await worker.fetch(
      req('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'T', body: 'B' }),
      }),
      ENV,
    );
    expect(res.status).toBe(403);
  });

  it('admin → ghi RTDB, trả notificationId (chưa cấu hình FCM thì pushed=0)', async () => {
    const token = await makeToken(validClaims());
    fetchMock.mockClear();
    const res = await worker.fetch(
      req('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Tin mới', body: 'Nội dung', semester: 'HK1N1' }),
      }),
      ENV,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean; notificationId: string; pushed: number };
    expect(data.success).toBe(true);
    expect(data.notificationId).toHaveLength(20);
    expect(data.pushed).toBe(0);
    const putCall = fetchMock.mock.calls.find(
      (c) => String(c[0]).includes('/activities/HK1N1/') && (c[1] as RequestInit)?.method === 'PUT',
    );
    expect(putCall).toBeDefined();
  });

  it('send-to-user khi chưa cấu hình FCM → 503', async () => {
    const token = await makeToken(validClaims());
    const res = await worker.fetch(
      req('/api/notifications/send-to-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: 'u1', title: 'T', body: 'B' }),
      }),
      ENV,
    );
    expect(res.status).toBe(503);
  });
});

describe('API Worker — storage zip', () => {
  it('thiếu token → 401', async () => {
    const res = await worker.fetch(
      req('/api/storage/zip', {
        method: 'POST',
        body: JSON.stringify({ files: [{ url: 'https://x', name: 'a.txt' }] }),
      }),
      ENV,
    );
    expect(res.status).toBe(401);
  });

  it('token hợp lệ → trả file ZIP (PK header) gồm cả entry text', async () => {
    const token = await makeToken(validClaims());
    fetchMock.mockClear();
    const res = await worker.fetch(
      req('/api/storage/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          files: [
            {
              url: 'https://firebasestorage.googleapis.com/v0/b/dh26nhe.firebasestorage.app/o/a.png?alt=media',
              name: 'root/a.png',
            },
            { name: 'root/thong_tin.txt', text: 'hello' },
          ],
          archiveName: 'DH26NHE_test.zip',
        }),
      }),
      ENV,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
    expect(res.headers.get('Content-Disposition')).toContain('DH26NHE_test.zip');
    expect(res.headers.get('X-Zip-Skipped')).toBe('0');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });

  it('URL ngoài bucket DH26NHE → 400', async () => {
    const token = await makeToken(validClaims());
    const res = await worker.fetch(
      req('/api/storage/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ files: [{ url: 'https://evil.example/o/a.png', name: 'a.png' }] }),
      }),
      ENV,
    );
    expect(res.status).toBe(400);
  });
});

import { describe, expect, it } from 'vitest';
import { mergeChatItems, type ChatItem } from './chatMerge';
import type { ActivitySubmission } from '@/types/submission.types';

function realDoc(overrides: Partial<ActivitySubmission> = {}): ActivitySubmission {
  return {
    id: 'doc-1',
    activityName: 'Hoạt động X',
    bonusPoints: 5,
    fileUrl: 'https://firebase.example.com/a.jpg',
    fileUrls: ['https://firebase.example.com/a.jpg'],
    status: 'pending',
    submittedAt: 1000,
    studentId: 's1',
    email: 's1@x.com',
    fullName: 'SV 1',
    className: 'DH26NHE',
    semester: 'HK1N1',
    clientKey: 'optimistic-1',
    ...overrides,
  };
}

function optimistic(overrides: Partial<ChatItem> = {}): ChatItem {
  return {
    ...realDoc({ id: 'optimistic-1', fileUrl: 'blob:preview', fileUrls: ['blob:preview'] }),
    _optimistic: true,
    _uploadDone: false,
    progress: 0.5,
    fileTypes: ['image/jpeg'],
    ...overrides,
  };
}

describe('mergeChatItems — cache blob preview', () => {
  it('giữ bubble tạm khi chưa có bản thật', () => {
    const out = mergeChatItems([optimistic()], []);
    expect(out).toHaveLength(1);
    expect(out[0].fileUrls).toEqual(['blob:preview']);
    expect(out[0]._optimistic).toBe(true);
  });

  it('bản thật về thì GIỮ blob, lấy status/id mới', () => {
    const real = realDoc({ status: 'approved' });
    const out = mergeChatItems([optimistic()], [real]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('doc-1');
    expect(out[0].status).toBe('approved');
    expect(out[0].fileUrls).toEqual(['blob:preview']);
    expect(out[0]._optimistic).toBe(false);
    expect(out[0].realId).toBe('doc-1');
    expect(out[0].fileTypes).toEqual(['image/jpeg']);
  });

  it('slot tài liệu rỗng thì lấy URL thật để bấm được', () => {
    const opt = optimistic({ fileUrls: ['blob:img', ''], fileUrl: 'blob:img' });
    const real = realDoc({ fileUrls: ['https://firebase.example.com/a.jpg', 'https://firebase.example.com/b.pdf'] });
    const out = mergeChatItems([opt], [real]);
    expect(out[0].fileUrls).toEqual(['blob:img', 'https://firebase.example.com/b.pdf']);
  });

  it('không bao giờ render 2 bản cùng lúc', () => {
    const out = mergeChatItems([optimistic()], [realDoc()]);
    const ids = out.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('item cũ không-optimistic bị thay bằng dữ liệu tươi', () => {
    const stale = { ...realDoc({ id: 'doc-9', status: 'pending' as const }), _optimistic: false };
    const fresh = realDoc({ id: 'doc-9', status: 'approved' as const });
    const out = mergeChatItems([stale], [fresh]);
    expect(out).toHaveLength(1);
    expect(out[0].status).toBe('approved');
  });
});

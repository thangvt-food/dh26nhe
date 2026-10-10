import { describe, expect, it } from 'vitest';
import { roomToNotification } from './notificationService';
import type { RoomDefinition } from '@/types/submission.types';

const room: RoomDefinition = {
  id: 'ACT-1',
  name: 'Tiếp sức mùa thi',
  points: 5,
  description: 'Thể lệ chi tiết',
  imageUrl: 'https://example.com/cover.jpg',
  semester: 'HK1N1',
  createdBy: 'aczaao12@gmail.com',
  createdAt: 1791648243069,
  updatedAt: 1791648243069,
  notificationId: null,
  isActive: true,
};

describe('roomToNotification — map phòng → view thông báo', () => {
  it('ánh xạ đúng các trường', () => {
    const n = roomToNotification(room);
    expect(n.id).toBe('ACT-1');
    expect(n.activityId).toBe('ACT-1');
    expect(n.title).toBe('Tiếp sức mùa thi');
    expect(n.body).toBe('Thể lệ chi tiết');
    expect(n.points).toBe(5);
    expect(n.semester).toBe('HK1N1');
    expect(n.senderName).toBe('aczaao12@gmail.com');
    expect(n.timestamp).toBe(1791648243069);
  });
});

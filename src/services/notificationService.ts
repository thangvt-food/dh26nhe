import { rtdb } from '@/firebase';
import { roomService } from './submissionService';
import { storageService } from './storageService';
import { sanitizeFileName } from '@/utils/stringUtils';
import type { BroadcastNotification, RoomDefinition } from '@/types/submission.types';
import type { ExtendedUser } from '@/types/auth.types';

/**
 * Core thông báo — DUY NHẤT 1 nhánh RTDB: `activities/{semester}/{roomId}`.
 * Mỗi phòng hoạt động đồng thời là một bản tin (title=name, body=description).
 * Nhánh `notifications/` mirror cũ đã khai tử.
 */
export interface NotificationInput {
  title: string;
  body: string;
  imageUrl?: string;
  points?: number;
  semester: string;
  activityId?: string | null;
}

/** Map phòng → view thông báo (pure, có test). */
export function roomToNotification(room: RoomDefinition): BroadcastNotification {
  return {
    id: room.id,
    activityId: room.id,
    title: room.name,
    body: room.description,
    imageUrl: room.imageUrl,
    points: room.points,
    semester: room.semester,
    senderName: room.createdBy,
    timestamp: room.createdAt,
  };
}

export const notificationService = {
  subscribeNotifications(semester: string, onData: (items: BroadcastNotification[]) => void) {
    return roomService.subscribeRooms(semester, (rooms) => {
      onData(rooms.map(roomToNotification));
    });
  },

  async postNotification(user: ExtendedUser, input: NotificationInput, imageFile?: File | null): Promise<string> {
    let imageUrl = input.imageUrl ?? '';
    if (imageFile) {
      imageUrl = await storageService.uploadFile(
        `notifications/${Date.now()}_${sanitizeFileName(imageFile.name)}`,
        imageFile,
      );
    }
    return await roomService.createRoom(input.semester, {
      name: input.title.trim(),
      points: input.points ?? 5,
      description: input.body,
      imageUrl,
      createdBy: user.displayName || user.email || 'Ban Cán Sự',
    });
  },

  async updateNotification(id: string, patch: Partial<NotificationInput>, imageFile?: File | null): Promise<void> {
    const semester = patch.semester;
    if (!semester) throw new Error('Thiếu học kỳ của thông báo.');
    const roomPatch: Partial<RoomDefinition> = {};
    if (patch.title !== undefined) roomPatch.name = patch.title;
    if (patch.body !== undefined) roomPatch.description = patch.body;
    if (patch.points !== undefined) roomPatch.points = patch.points;
    if (patch.imageUrl !== undefined) roomPatch.imageUrl = patch.imageUrl;
    if (imageFile) {
      roomPatch.imageUrl = await storageService.uploadFile(
        `notifications/${Date.now()}_${sanitizeFileName(imageFile.name)}`,
        imageFile,
      );
    }
    await roomService.updateRoom(semester, id, roomPatch);
  },

  async deleteNotification(semester: string, id: string): Promise<void> {
    await roomService.deleteRoom(semester, id);
  },
};

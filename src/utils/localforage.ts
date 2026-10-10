import localforage from 'localforage';
import type { ActivitySubmission } from '@/types/submission.types';

localforage.config({
  name: 'DH26NHE_Cache',
  storeName: 'userActivities',
});

const CACHE_DURATION_MS = 10 * 60 * 1000;

interface CachedPayload {
  data: ActivitySubmission[];
  timestamp: number;
}

function cacheKey(userId: string, semester: string): string {
  return `profile_${userId}_${semester}`;
}

export async function setUserActivitiesCache(
  userId: string,
  semester: string,
  data: ActivitySubmission[],
): Promise<void> {
  try {
    const payload: CachedPayload = { data, timestamp: Date.now() };
    await localforage.setItem(cacheKey(userId, semester), payload);
  } catch (err) {
    console.warn('[Cache] setUserActivitiesCache failed:', err);
  }
}

export async function getUserActivitiesCache(
  userId: string,
  semester: string,
): Promise<ActivitySubmission[] | null> {
  try {
    const payload = await localforage.getItem<CachedPayload>(cacheKey(userId, semester));
    if (!payload) return null;
    if (Date.now() - payload.timestamp > CACHE_DURATION_MS) return null;
    return payload.data;
  } catch (err) {
    console.warn('[Cache] getUserActivitiesCache failed:', err);
    return null;
  }
}

export async function clearUserCache(userId: string, semester: string): Promise<void> {
  try {
    await localforage.removeItem(cacheKey(userId, semester));
  } catch (err) {
    console.warn('[Cache] clearUserCache failed:', err);
  }
}

export async function clearAllCaches(): Promise<void> {
  try {
    await localforage.clear();
  } catch (err) {
    console.warn('[Cache] clearAllCaches failed:', err);
  }
}

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

function env(name: string, legacy?: string): string {
  const v = import.meta.env[name] ?? (legacy ? import.meta.env[legacy] : undefined);
  return (v as string | undefined) ?? '';
}

const firebaseConfig = {
  apiKey: env('VITE_FIREBASE_API_KEY', 'VITE_API_KEY'),
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN', 'VITE_AUTH_DOMAIN'),
  databaseURL: env('VITE_FIREBASE_DATABASE_URL', 'VITE_DATABASE_URL'),
  projectId: env('VITE_FIREBASE_PROJECT_ID', 'VITE_PROJECT_ID'),
  storageBucket: env('VITE_FIREBASE_STORAGE_BUCKET', 'VITE_STORAGE_BUCKET'),
  messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_MESSAGING_SENDER_ID'),
  appId: env('VITE_FIREBASE_APP_ID', 'VITE_APP_ID'),
  measurementId: env('VITE_FIREBASE_MEASUREMENT_ID', 'VITE_MEASUREMENT_ID'),
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Auth with Local Persistence — giữ phiên đăng nhập qua các lần đóng/mở tab
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[Firebase Auth] Persistence error:', err);
});

// Firestore with Multi-Tab IndexedDB Cache & Fallback
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  console.warn('[Firestore] Fallback to memory cache:', e);
  dbInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
}
export const db = dbInstance;

// Realtime Database & Storage
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

export const APP_CONFIG = {
  defaultClassName: env('VITE_DEFAULT_CLASS_NAME') || 'DH26NHE',
  defaultSemester: env('VITE_DEFAULT_SEMESTER') || 'HK1N1',
  studentEmailDomain: env('VITE_STUDENT_EMAIL_DOMAIN') || '@st.hcmuaf.edu.vn',
} as const;

export const SEMESTERS = [
  'HK1N1',
  'HK2N1',
  'HK1N2',
  'HK2N2',
  'HK1N3',
  'HK2N3',
  'HK1N4',
  'HK2N4',
] as const;
export type SemesterId = (typeof SEMESTERS)[number];

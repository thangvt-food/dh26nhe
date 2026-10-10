import {
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  getRedirectResult,
  type User,
} from 'firebase/auth';
import { auth } from '@/firebase';
import type { ExtendedUser } from '@/types/auth.types';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export const authService = {
  async loginWithGoogle(): Promise<unknown> {
    try {
      return await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      const isCoopError =
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.message?.includes('Cross-Origin-Opener-Policy');

      if (isCoopError) {
        console.warn('[AuthService] Fallback to signInWithRedirect due to COOP');
        return await signInWithRedirect(auth, provider);
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  subscribeToAuthChanges(callback: (user: ExtendedUser | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }
      const extUser = firebaseUser as ExtendedUser;
      try {
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        extUser.isAdmin = Boolean(idTokenResult.claims.admin);
      } catch (err) {
        console.warn('[AuthService] Failed to read custom claims:', err);
        extUser.isAdmin = false;
      }
      callback(extUser);
    });
  },

  async handleRedirectResult(): Promise<void> {
    try {
      await getRedirectResult(auth);
    } catch (err) {
      console.warn('[AuthService] Redirect result error:', err);
    }
  },
};

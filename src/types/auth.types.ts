import type { User } from 'firebase/auth';

export interface ExtendedUser extends User {
  isAdmin?: boolean;
}

export interface AuthContextValue {
  currentUser: ExtendedUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: () => Promise<unknown>;
  logout: () => Promise<void>;
}

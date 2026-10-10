import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import type { AuthContextValue, ExtendedUser } from '@/types/auth.types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void authService.handleRedirectResult();
    const unsubscribe = authService.subscribeToAuthChanges((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = () => authService.loginWithGoogle();
  const logout = () => authService.logout();

  const value: AuthContextValue = {
    currentUser,
    loading,
    isAdmin: Boolean(currentUser?.isAdmin),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

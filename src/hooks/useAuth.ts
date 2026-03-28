import { useState, useEffect, useCallback } from 'react';
import { signInWithGoogle, signOut, onAuthChange, type User } from '../firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setState({ user, loading: false, error: null });
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      await signInWithGoogle();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Sign-in failed',
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Sign-out failed',
      }));
    }
  }, []);

  return { ...state, login, logout };
}

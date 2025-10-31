import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { logout as authLogout } from '@/lib/auth-service';
import type { UserSession } from '@/lib/types';

/**
 * Hook para gerenciar autenticação do usuário
 * Centraliza lógica de sessão, login e logout
 */
export function useAuth() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const userSession = await storage.getUserSession();
      setSession(userSession);
      setIsAuthenticated(!!userSession);
    } catch (error) {
      console.error('[useAuth] Error loading session:', error);
      setSession(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const logout = useCallback(async () => {
    try {
      await authLogout();
      setSession(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('[useAuth] Error logging out:', error);
      throw error;
    }
  }, []);

  const updateSession = useCallback((newSession: UserSession) => {
    setSession(newSession);
    setIsAuthenticated(true);
  }, []);

  return {
    session,
    loading,
    isAuthenticated,
    user: session?.user,
    apiKey: session?.api_key,
    logout,
    refresh: loadSession,
    updateSession,
  };
}

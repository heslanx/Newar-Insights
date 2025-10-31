import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { logInfo, logError } from '../lib/logger';

interface AuthContextValue {
  apiKey: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setApiKey: (key: string) => Promise<void>;
  clearAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load API key on mount
  useEffect(() => {
    loadApiKey();
  }, []);

  async function loadApiKey() {
    try {
      const result = await chrome.storage.local.get(['apiKey']);
      if (result.apiKey) {
        setApiKeyState(result.apiKey);
        logInfo('API key loaded from storage');
      }
    } catch (error) {
      logError('Failed to load API key', error as Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function setApiKey(key: string) {
    try {
      await chrome.storage.local.set({ apiKey: key });
      setApiKeyState(key);
      logInfo('API key saved to storage');
    } catch (error) {
      logError('Failed to save API key', error as Error);
      throw error;
    }
  }

  async function clearAuth() {
    try {
      await chrome.storage.local.remove(['apiKey']);
      setApiKeyState(null);
      logInfo('API key cleared from storage');
    } catch (error) {
      logError('Failed to clear API key', error as Error);
      throw error;
    }
  }

  const value: AuthContextValue = {
    apiKey,
    isAuthenticated: !!apiKey,
    isLoading,
    setApiKey,
    clearAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

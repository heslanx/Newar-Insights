import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { logInfo, logError } from '../lib/logger';

export interface AppSettings {
  notifications: boolean;
  autoAdmit: boolean;
  theme: 'light' | 'dark' | 'system';
  defaultBotName: string;
  language: 'en' | 'pt';
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  autoAdmit: true,
  theme: 'system',
  defaultBotName: 'Newar Bot',
  language: 'pt'
};

interface SettingsContextValue {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      if (result.settings) {
        setSettingsState({ ...DEFAULT_SETTINGS, ...result.settings });
        logInfo('Settings loaded from storage', result.settings);
      }
    } catch (error) {
      logError('Failed to load settings', error as Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateSettings(updates: Partial<AppSettings>) {
    try {
      const newSettings = { ...settings, ...updates };
      await chrome.storage.local.set({ settings: newSettings });
      setSettingsState(newSettings);
      logInfo('Settings updated', updates);
    } catch (error) {
      logError('Failed to update settings', error as Error);
      throw error;
    }
  }

  async function resetSettings() {
    try {
      await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
      setSettingsState(DEFAULT_SETTINGS);
      logInfo('Settings reset to defaults');
    } catch (error) {
      logError('Failed to reset settings', error as Error);
      throw error;
    }
  }

  const value: SettingsContextValue = {
    settings,
    isLoading,
    updateSettings,
    resetSettings
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

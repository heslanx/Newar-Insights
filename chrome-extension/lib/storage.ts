import type { StorageSchema, UserSession, Recording, UserPreferences } from './types';
import { DEFAULT_PREFERENCES } from './types';
import { cache } from './cache';

/**
 * Type-safe Chrome Storage wrapper with in-memory cache
 * Provides a clean API for accessing chrome.storage.local
 */
class Storage {
  /**
   * Get a value from storage (with cache)
   */
  async get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K] | null> {
    // Check cache first
    const cached = cache.get<StorageSchema[K]>(key);
    if (cached !== null) {
      return cached;
    }
    
    try {
      const result = await chrome.storage.local.get(key);
      const value = result[key] ?? null;
      
      // Cache the result
      if (value !== null) {
        cache.set(key, value, 60000); // 1 minute TTL
      }
      
      return value;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  }

  /**
   * Set a value in storage
   */
  async set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
      throw error;
    }
  }

  /**
   * Remove a value from storage
   */
  async remove<K extends keyof StorageSchema>(key: K): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
      throw error;
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // ============================================
  // Convenience methods for specific keys
  // ============================================

  /**
   * Get user session
   */
  async getUserSession(): Promise<UserSession | null> {
    return this.get('user_session');
  }

  /**
   * Set user session
   */
  async setUserSession(session: UserSession): Promise<void> {
    await this.set('user_session', session);
  }

  /**
   * Clear user session (logout)
   */
  async clearUserSession(): Promise<void> {
    await this.remove('user_session');
    await this.remove('onboarding_completed');
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getUserSession();
    return session !== null && !!session.api_key;
  }

  /**
   * Get API key
   */
  async getApiKey(): Promise<string | null> {
    const session = await this.getUserSession();
    return session?.api_key ?? null;
  }

  /**
   * Logout (clear session)
   */
  async logout(): Promise<void> {
    await this.remove('user_session');
    await this.remove('active_recordings');
  }

  /**
   * Get active recordings
   */
  async getActiveRecordings(): Promise<Recording[]> {
    const recordings = await this.get('active_recordings');
    return recordings ?? [];
  }

  /**
   * Set active recordings
   */
  async setActiveRecordings(recordings: Recording[]): Promise<void> {
    await this.set('active_recordings', recordings);
  }

  /**
   * Add a recording to active recordings
   */
  async addActiveRecording(recording: Recording): Promise<void> {
    const recordings = await this.getActiveRecordings();
    const exists = recordings.some(r => r.meeting_id === recording.meeting_id);
    
    if (!exists) {
      recordings.push(recording);
      await this.setActiveRecordings(recordings);
    }
  }

  /**
   * Update a recording in active recordings
   */
  async updateActiveRecording(meetingId: string, updates: Partial<Recording>): Promise<void> {
    const recordings = await this.getActiveRecordings();
    const index = recordings.findIndex(r => r.meeting_id === meetingId);
    
    if (index !== -1) {
      recordings[index] = { ...recordings[index], ...updates };
      await this.setActiveRecordings(recordings);
    }
  }

  /**
   * Remove a recording from active recordings
   */
  async removeActiveRecording(meetingId: string): Promise<void> {
    const recordings = await this.getActiveRecordings();
    const filtered = recordings.filter(r => r.meeting_id !== meetingId);
    await this.setActiveRecordings(filtered);
  }

  /**
   * Get active recording for a specific meeting
   */
  async getActiveRecordingByMeetingId(meetingId: string): Promise<Recording | null> {
    const recordings = await this.getActiveRecordings();
    return recordings.find(r => r.meeting_id === meetingId) ?? null;
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    const prefs = await this.get('preferences');
    return prefs ?? DEFAULT_PREFERENCES;
  }

  /**
   * Set user preferences
   */
  async setPreferences(preferences: UserPreferences): Promise<void> {
    await this.set('preferences', preferences);
  }

  /**
   * Update specific preference
   */
  async updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<void> {
    const prefs = await this.getPreferences();
    prefs[key] = value;
    await this.setPreferences(prefs);
  }

  /**
   * Check if onboarding is completed
   */
  async isOnboardingCompleted(): Promise<boolean> {
    const completed = await this.get('onboarding_completed');
    return completed ?? false;
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<void> {
    await this.set('onboarding_completed', true);
  }

  // ============================================
  // Storage change listener
  // ============================================

  /**
   * Listen to storage changes
   */
  onChange<K extends keyof StorageSchema>(
    key: K,
    callback: (newValue: StorageSchema[K] | null, oldValue: StorageSchema[K] | null) => void
  ): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[key]) {
        callback(changes[key].newValue ?? null, changes[key].oldValue ?? null);
      }
    });
  }
}

// Export singleton instance
export const storage = new Storage();

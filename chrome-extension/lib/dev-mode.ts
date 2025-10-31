/**
 * Development Mode Utilities
 * Auto-configures extension to work with local API in development
 */

export const DEV_MODE = {
  enabled: false, // Set to false in production
  bypassAuth: false, // Use real auth with dev API key
  bypassAPI: false, // Use real API calls
  mockData: false, // Use real data from API
  autoSetup: true, // Auto-configure dev environment
};

// Development API configuration
export const DEV_API_CONFIG = {
  // Use real development API key (matches backend dev key)
  apiKey: 'vxa_live_dev_auto_VYysnoh8SdsZM1ZtoPaOtje2AIWxzumN0xPpqDjniUU',
  adminApiUrl: 'http://localhost:8081',
  apiGatewayUrl: 'http://localhost:8080',
  userId: 1, // Default dev user ID
  userName: 'Developer',
  userEmail: 'dev@newar.com',
};

// Mock user session (for storage compatibility)
export const MOCK_USER_SESSION = {
  user: {
    id: DEV_API_CONFIG.userId,
    email: DEV_API_CONFIG.userEmail,
    name: DEV_API_CONFIG.userName,
    max_concurrent_bots: 10,
    plan: 'enterprise',
  },
  api_key: DEV_API_CONFIG.apiKey,
  expires_at: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
};

// Mock recordings
export const MOCK_RECORDINGS = [
  {
    id: 'rec-1',
    meeting_id: 'abc-defg-hij',
    platform: 'google_meet',
    status: 'completed',
    started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    duration: 3600,
    file_size: 125000000,
    download_url: 'https://example.com/recording1.mp4',
    bot_name: 'Newar Bot',
  },
  {
    id: 'rec-2',
    meeting_id: 'xyz-uvwx-yz',
    platform: 'google_meet',
    status: 'completed',
    started_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    duration: 2400,
    file_size: 85000000,
    download_url: 'https://example.com/recording2.mp4',
    bot_name: 'Newar Bot',
  },
  {
    id: 'rec-3',
    meeting_id: 'lmn-opqr-stu',
    platform: 'google_meet',
    status: 'processing',
    started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    duration: 1800,
    bot_name: 'Newar Bot',
  },
];

// Mock active recording
export const MOCK_ACTIVE_RECORDING = {
  id: 'rec-active-1',
  meeting_id: 'current-meet-id',
  platform: 'google_meet',
  status: 'recording',
  started_at: new Date().toISOString(),
  bot_name: 'Newar Bot',
};

/**
 * Check if dev mode is enabled
 */
export function isDevMode(): boolean {
  return DEV_MODE.enabled;
}

/**
 * Auto-setup dev environment with real API
 */
export async function devAutoSetup(): Promise<void> {
  if (!DEV_MODE.autoSetup) return;

  console.log('[DEV MODE] Auto-setup enabled, configuring extension with real API...');

  // Set real API key and user session
  await chrome.storage.local.set({
    api_key: DEV_API_CONFIG.apiKey,
    user: MOCK_USER_SESSION.user,
    onboarding_completed: true,
    preferences: {
      botName: 'Newar Bot (Dev)',
      notifyOnStart: true,
      notifyOnComplete: true,
      autoRecord: false,
    },
  });

  console.log('[DEV MODE] ✅ Extension configured with REAL API');
  console.log('[DEV MODE] 🔑 API Key:', DEV_API_CONFIG.apiKey.substring(0, 20) + '...');
  console.log('[DEV MODE] 🌐 Admin API:', DEV_API_CONFIG.adminApiUrl);
  console.log('[DEV MODE] 🌐 Gateway API:', DEV_API_CONFIG.apiGatewayUrl);
  console.log('[DEV MODE] 👤 User:', DEV_API_CONFIG.userEmail);
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  if (!DEV_MODE.enabled) return true;

  try {
    const response = await fetch(`${DEV_API_CONFIG.apiGatewayUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch (error) {
    console.warn('[DEV MODE] ⚠️ Backend not reachable:', DEV_API_CONFIG.apiGatewayUrl);
    console.warn('[DEV MODE] Make sure to run: docker-compose up -d');
    return false;
  }
}

/**
 * Get dev API key
 */
export function getDevApiKey(): string | null {
  return DEV_MODE.enabled ? DEV_API_CONFIG.apiKey : null;
}

/**
 * Log dev mode status
 */
export function logDevModeStatus() {
  if (!DEV_MODE.enabled) return;

  console.log(
    '%c[DEV MODE ENABLED - REAL API]',
    'background: #10B981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
  );
  console.log('✅ Using REAL API calls (not mocks)');
  console.log('✅ Auto-configured with dev API key');
  console.log('🌐 Admin API:', DEV_API_CONFIG.adminApiUrl);
  console.log('🌐 Gateway API:', DEV_API_CONFIG.apiGatewayUrl);
  console.log('👤 User:', DEV_API_CONFIG.userEmail);
  console.log('🔑 API Key:', DEV_API_CONFIG.apiKey.substring(0, 20) + '...');
  console.log('\n💡 To disable dev mode, set DEV_MODE.enabled = false in lib/dev-mode.ts');
}

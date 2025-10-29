const ADMIN_API_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:8081';
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'admin_dev_secret_key_123';

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

export const adminAPI = {
  async getUsers(): Promise<{ data: any[]; total: number }> {
    return fetcher(`${ADMIN_API_URL}/admin/users?limit=100`, {
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },

  async createUser(data: { email: string; name: string; max_concurrent_bots: number }) {
    return fetcher(`${ADMIN_API_URL}/admin/users`, {
      method: 'POST',
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: number) {
    return fetcher(`${ADMIN_API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },

  async generateToken(userId: number) {
    return fetcher(`${ADMIN_API_URL}/admin/users/${userId}/tokens`, {
      method: 'POST',
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },

  async getHealth() {
    return fetcher(`${ADMIN_API_URL}/health`);
  },
};

export const gatewayAPI = {
  async getRecordings(apiKey: string) {
    return fetcher(`${API_GATEWAY_URL}/recordings?limit=100`, {
      headers: { 'X-API-Key': apiKey },
    });
  },

  async createRecording(apiKey: string, data: { platform: string; meeting_id: string; bot_name: string }) {
    return fetcher(`${API_GATEWAY_URL}/recordings`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: JSON.stringify(data),
    });
  },

  async stopRecording(apiKey: string, platform: string, meetingId: string) {
    return fetcher(`${API_GATEWAY_URL}/recordings/${platform}/${meetingId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    });
  },

  async getRecordingStatus(apiKey: string, platform: string, meetingId: string) {
    return fetcher(`${API_GATEWAY_URL}/recordings/${platform}/${meetingId}`, {
      headers: { 'X-API-Key': apiKey },
    });
  },

  async downloadRecording(apiKey: string, platform: string, meetingId: string) {
    const response = await fetch(`${API_GATEWAY_URL}/recordings/${platform}/${meetingId}/download`, {
      headers: { 'X-API-Key': apiKey },
    });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
  },

  async getHealth() {
    return fetcher(`${API_GATEWAY_URL}/health`);
  },
};

// Admin APIs for managing all recordings (across all users)
export const adminRecordingsAPI = {
  async getAllRecordings() {
    return fetcher(`${ADMIN_API_URL}/admin/recordings?limit=1000`, {
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },

  async getRecordingsByUser(userId: number) {
    return fetcher(`${ADMIN_API_URL}/admin/users/${userId}/recordings`, {
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },

  async deleteRecording(recordingId: number) {
    return fetcher(`${ADMIN_API_URL}/admin/recordings/${recordingId}`, {
      method: 'DELETE',
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },
};

// Bot Manager APIs
export const botManagerAPI = {
  async getActiveBots() {
    return fetcher(`${ADMIN_API_URL}/admin/bots/active`, {
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },

  async getBotLogs(containerId: string) {
    return fetcher(`${ADMIN_API_URL}/admin/bots/${containerId}/logs`, {
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },

  async stopBot(containerId: string) {
    return fetcher(`${ADMIN_API_URL}/admin/bots/${containerId}/stop`, {
      method: 'POST',
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },
};

// System Health APIs
export const systemHealthAPI = {
  async getFullHealth() {
    return fetcher(`${ADMIN_API_URL}/admin/system/health`, {
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },

  async getMetrics() {
    return fetcher(`${ADMIN_API_URL}/admin/system/metrics`, {
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },

  async getLogs(service: string, limit = 100) {
    return fetcher(`${ADMIN_API_URL}/admin/system/logs?service=${service}&limit=${limit}`, {
      headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
    });
  },
};

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:8081';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8080';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'admin_dev_secret_key_123';

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
  async getUsers() {
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

  async getHealth() {
    return fetcher(`${API_GATEWAY_URL}/health`);
  },
};

import type {
  CreateUserRequest,
  CreateUserResponse,
  GenerateTokenResponse,
  CreateRecordingRequest,
  CreateRecordingResponse,
  Recording,
  RecordingListResponse,
  StopRecordingResponse,
  APIError,
} from './types';
import { retryApiCall } from './retry';
import { logInfo, logError, logWarn } from './logger';

/**
 * API Configuration
 */
const API_CONFIG = {
  ADMIN_API_URL: import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:8081',
  API_GATEWAY_URL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080',
  ADMIN_API_KEY: import.meta.env.VITE_ADMIN_API_KEY || 'dev-admin-key',
  REQUEST_TIMEOUT: 30000, // 30 seconds
};

/**
 * API Client for Newar Insights backend
 */
class APIClient {
  private adminApiUrl: string;
  private apiGatewayUrl: string;
  private adminApiKey: string;
  private timeout: number;

  constructor() {
    this.adminApiUrl = API_CONFIG.ADMIN_API_URL;
    this.apiGatewayUrl = API_CONFIG.API_GATEWAY_URL;
    this.adminApiKey = API_CONFIG.ADMIN_API_KEY;
    this.timeout = API_CONFIG.REQUEST_TIMEOUT;
  }

  /**
   * Generic fetch with timeout, error handling, and retry logic
   * Uses HTTP keep-alive for connection reuse
   */
  private async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const method = options.method || 'GET';
    const startTime = Date.now();

    logInfo(`API Request: ${method} ${url}`);

    return retryApiCall(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          keepalive: true, // ⚡ Enable HTTP keep-alive for connection reuse
          headers: {
            'Content-Type': 'application/json',
            'Connection': 'keep-alive', // ⚡ Explicit keep-alive header
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        logInfo(`API Response: ${response.status} in ${duration}ms`, {
          url,
          method,
          status: response.status,
          duration
        });

        if (!response.ok) {
          const error: APIError = await response.json().catch(() => ({
            error: `HTTP ${response.status}: ${response.statusText}`,
          }));

          const errorObj = new Error(
            error.error || error.message || `Request failed with status ${response.status}`
          ) as any;
          errorObj.status = response.status;
          errorObj.response = error;

          logError(`API Error: ${response.status}`, errorObj, { url, method });
          throw errorObj;
        }

        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            logWarn('API Request timeout', { url, method, timeout: this.timeout });
            const timeoutError = new Error('Servidor demorou para responder. Tente novamente.') as any;
            timeoutError.name = 'AbortError';
            throw timeoutError;
          }

          if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
            logError('Network error', error, { url, method });
            const networkError = new Error('Servidor indisponível. Verifique sua conexão.') as any;
            networkError.name = 'NetworkError';
            throw networkError;
          }
        }

        logError('API Request failed', error as Error, { url, method });
        throw error;
      }
    }, {
      onRetry: (attempt, error) => {
        logWarn(`Retrying API request (attempt ${attempt})`, { url, method, error });
      }
    });
  }

  // ============================================
  // User Management (Admin API)
  // ============================================

  /**
   * Create new user (auto-registration)
   */
  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    return this.fetch<CreateUserResponse>(`${this.adminApiUrl}/admin/users`, {
      method: 'POST',
      headers: {
        'X-Admin-API-Key': this.adminApiKey,
      },
      body: JSON.stringify({
        email: userData.email,
        name: userData.name,
        max_concurrent_bots: userData.max_concurrent_bots || 3,
      }),
    });
  }

  /**
   * Generate API token for user
   */
  async generateToken(userId: number): Promise<GenerateTokenResponse> {
    return this.fetch<GenerateTokenResponse>(
      `${this.adminApiUrl}/admin/users/${userId}/tokens`,
      {
        method: 'POST',
        headers: {
          'X-Admin-API-Key': this.adminApiKey,
        },
      }
    );
  }

  /**
   * Get user details
   */
  async getUser(userId: number): Promise<CreateUserResponse | null> {
    const response = await this.fetch<{ data: CreateUserResponse[] }>(
      `${this.adminApiUrl}/admin/users?limit=100`,
      {
        headers: {
          'X-Admin-API-Key': this.adminApiKey,
        },
      }
    );
    return response.data.find(user => user.id === userId) || null;
  }

  // ============================================
  // Recording Management (API Gateway)
  // ============================================

  /**
   * Create recording (start bot)
   */
  async createRecording(
    apiKey: string,
    recordingData: CreateRecordingRequest
  ): Promise<CreateRecordingResponse> {
    console.log('[Newar API] Creating recording...');
    console.log('[Newar API] URL:', `${this.apiGatewayUrl}/recordings`);
    console.log('[Newar API] API Key:', apiKey.substring(0, 15) + '...');
    console.log('[Newar API] Data:', recordingData);
    
    try {
      const result = await this.fetch<CreateRecordingResponse>(`${this.apiGatewayUrl}/recordings`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(recordingData),
      });
      
      console.log('[Newar API] Recording created successfully:', result);
      return result;
    } catch (error) {
      console.error('[Newar API] Failed to create recording:', error);
      throw error;
    }
  }

  /**
   * Get recording status
   */
  async getRecording(apiKey: string, meetingId: string): Promise<Recording> {
    return this.fetch<Recording>(
      `${this.apiGatewayUrl}/recordings/google_meet/${meetingId}`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );
  }

  /**
   * List all recordings for user
   */
  async listRecordings(
    apiKey: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<RecordingListResponse> {
    return this.fetch<RecordingListResponse>(
      `${this.apiGatewayUrl}/recordings?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );
  }

  /**
   * Stop recording
   */
  async stopRecording(apiKey: string, meetingId: string): Promise<StopRecordingResponse> {
    console.log('[Newar API] Stopping recording...');
    console.log('[Newar API] URL:', `${this.apiGatewayUrl}/recordings/google_meet/${meetingId}`);
    console.log('[Newar API] API Key:', apiKey.substring(0, 15) + '...');
    console.log('[Newar API] Meeting ID:', meetingId);

    try {
      const result = await this.fetch<StopRecordingResponse>(
        `${this.apiGatewayUrl}/recordings/google_meet/${meetingId}`,
        {
          method: 'DELETE',
          headers: {
            'X-API-Key': apiKey,
          },
        }
      );

      console.log('[Newar API] Recording stopped successfully:', result);
      return result;
    } catch (error) {
      console.error('[Newar API] Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Get download URL for recording
   */
  getDownloadURL(apiKey: string, meetingId: string): string {
    return `${this.apiGatewayUrl}/recordings/google_meet/${meetingId}/download?api_key=${apiKey}`;
  }

  /**
   * Download recording
   */
  async downloadRecording(apiKey: string, meetingId: string): Promise<Blob> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.getDownloadURL(apiKey, meetingId), {
        signal: controller.signal,
        keepalive: true, // ⚡ Enable HTTP keep-alive
        headers: {
          'X-API-Key': apiKey,
          'Connection': 'keep-alive', // ⚡ Explicit keep-alive header
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      return response.blob();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Download timeout. Tente novamente.');
      }
      
      throw error;
    }
  }

  // ============================================
  // Health Checks
  // ============================================

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      await this.listRecordings(apiKey, 1, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check Admin API health
   */
  async checkAdminHealth(): Promise<{ status: string }> {
    return this.fetch<{ status: string }>(`${this.adminApiUrl}/health`);
  }

  /**
   * Check API Gateway health
   */
  async checkGatewayHealth(): Promise<{ status: string }> {
    return this.fetch<{ status: string }>(`${this.apiGatewayUrl}/health`);
  }
}

// Export singleton instance
export const apiClient = new APIClient();

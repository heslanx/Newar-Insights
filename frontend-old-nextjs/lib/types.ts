export type User = {
  id: number;
  email: string;
  name: string;
  max_concurrent_bots: number;
  created_at: string;
  updated_at: string;
};

export type Meeting = {
  id: number;
  user_id: number;
  platform: 'google_meet' | 'teams';
  meeting_id: string;
  bot_container_id?: string;
  status: 'requested' | 'joining' | 'active' | 'recording' | 'finalizing' | 'completed' | 'failed';
  meeting_url: string;
  recording_path?: string;
  recording_url?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
};

export type HealthStatus = {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  dependencies?: Record<string, string>;
};

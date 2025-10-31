// ============================================
// User & Authentication Types
// ============================================

export interface User {
  id: number;
  email: string;
  name: string;
  max_concurrent_bots: number;
  created_at?: string;
}

export interface UserSession {
  user: User;
  api_key: string;
  logged_in_at: string;
}

// ============================================
// Recording Types
// ============================================

export type RecordingStatus =
  | 'requested'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'processing'
  | 'completed'
  | 'failed';

export interface Recording {
  id: number;
  user_id: number;
  platform: 'google_meet';
  meeting_id: string;
  status: RecordingStatus;
  bot_name?: string;
  started_at: string;
  ended_at?: string;
  recording_path?: string;
  error_message?: string;
  container_id?: string;
}

export interface RecordingListResponse {
  data: Recording[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================
// User Preferences Types
// ============================================

export interface UserPreferences {
  botName: string;
  notifyOnStart: boolean;
  notifyOnComplete: boolean;
  autoStart: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  botName: 'Assistente de Gravação',
  notifyOnStart: true,
  notifyOnComplete: true,
  autoStart: false,
};

// ============================================
// Chrome Storage Schema
// ============================================

export interface StorageSchema {
  // Authentication
  user_session: UserSession | null;
  
  // Active recordings cache
  active_recordings: Recording[];
  
  // User preferences
  preferences: UserPreferences;
  
  // Onboarding state
  onboarding_completed: boolean;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateUserRequest {
  email: string;
  name: string;
  max_concurrent_bots?: number;
}

export interface CreateUserResponse {
  id: number;
  email: string;
  name: string;
  max_concurrent_bots: number;
  created_at: string;
}

export interface GenerateTokenResponse {
  token: string;
  created_at: string;
}

export interface CreateRecordingRequest {
  platform: 'google_meet';
  meeting_id: string;
  bot_name?: string;
}

export interface CreateRecordingResponse extends Recording {}

export interface StopRecordingResponse {
  message: string;
}

// ============================================
// API Error Types
// ============================================

export interface APIError {
  error: string;
  message?: string;
  status?: number;
}

// ============================================
// UI State Types
// ============================================

export type PopupState = 
  | 'loading'
  | 'not-authenticated'
  | 'not-on-meet'
  | 'ready-to-record'
  | 'recording-in-progress'
  | 'error';

export interface PopupData {
  state: PopupState;
  user?: User;
  currentMeetingId?: string;
  activeRecording?: Recording;
  stats?: {
    totalRecordings: number;
    botsAvailable: number;
  };
  error?: string;
}

// ============================================
// Message Types (for chrome.runtime.sendMessage)
// ============================================

export type MessageType =
  | 'START_RECORDING'
  | 'STOP_RECORDING'
  | 'GET_POPUP_DATA'
  | 'CHECK_MEETING_STATUS'
  | 'LOGOUT';

export interface Message<T = any> {
  type: MessageType;
  payload?: T;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Content Script Types
// ============================================

export interface MeetingInfo {
  meetingId: string;
  url: string;
  isActive: boolean;
}

export interface BadgeState {
  visible: boolean;
  status: RecordingStatus | 'idle';
  duration?: number;
}

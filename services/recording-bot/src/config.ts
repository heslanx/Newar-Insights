// Configuration loaded from environment variables

export interface Config {
  meetingId: number;
  userId: number;
  platform: 'google_meet' | 'teams';
  meetingUrl: string;
  botName: string;
  redisUrl: string;
  storageType: 'local' | 'supabase';
  storagePath: string;
  chunkDuration: number; // seconds
  audioBitrate: number;
}

export function loadConfig(): Config {
  const meetingId = parseInt(process.env.MEETING_ID || '0');
  const userId = parseInt(process.env.USER_ID || '0');
  const platform = (process.env.PLATFORM || 'google_meet') as 'google_meet' | 'teams';
  const meetingUrl = process.env.MEETING_URL || '';
  const botName = process.env.BOT_NAME || 'Newar Recorder';
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const storageType = (process.env.STORAGE_TYPE || 'local') as 'local' | 'supabase';
  const storagePath = process.env.STORAGE_PATH || './storage/recordings';
  const chunkDuration = parseInt(process.env.CHUNK_DURATION || '10');
  const audioBitrate = parseInt(process.env.AUDIO_BITRATE || '128000');

  // Validate required fields
  if (!meetingId || !userId || !meetingUrl) {
    throw new Error('Missing required environment variables: MEETING_ID, USER_ID, MEETING_URL');
  }

  return {
    meetingId,
    userId,
    platform,
    meetingUrl,
    botName,
    redisUrl,
    storageType,
    storagePath,
    chunkDuration,
    audioBitrate,
  };
}

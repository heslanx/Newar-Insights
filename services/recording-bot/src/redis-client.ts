import { createClient } from 'redis';

export type BotStatus = 'joining' | 'active' | 'recording' | 'finalizing' | 'completed' | 'failed';

export interface BotStatusUpdate {
  container_id: string;
  meeting_id: number;
  status: BotStatus;
  error_message?: string;
  chunk_count?: number;
  timestamp: string;
}

export class RedisClient {
  private client: ReturnType<typeof createClient>;
  private containerId: string;
  private meetingId: number;

  constructor(redisUrl: string, containerId: string, meetingId: number) {
    this.client = createClient({ url: redisUrl });
    this.containerId = containerId;
    this.meetingId = meetingId;
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.log('✅ Connected to Redis');
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
    console.log('✅ Disconnected from Redis');
  }

  async publishStatus(status: BotStatus, chunkCount?: number, errorMessage?: string): Promise<void> {
    const update: BotStatusUpdate = {
      container_id: this.containerId,
      meeting_id: this.meetingId,
      status,
      chunk_count: chunkCount,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    };

    const channel = `bot:status:${this.containerId}`;
    await this.client.publish(channel, JSON.stringify(update));

    console.log(`📡 Published status: ${status}${chunkCount !== undefined ? ` (${chunkCount} chunks)` : ''}`);
  }

  async subscribeToCommands(handler: (command: string) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.connect();

    const channel = `bot:command:${this.containerId}`;

    await subscriber.subscribe(channel, (message) => {
      try {
        const command = JSON.parse(message);
        console.log(`📩 Received command: ${command.command}`);
        handler(command.command);
      } catch (err) {
        console.error('Failed to parse command:', err);
      }
    });

    console.log(`👂 Subscribed to commands on ${channel}`);
  }
}

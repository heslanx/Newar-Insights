import * as fs from 'fs';
import * as path from 'path';

export class ChunkUploader {
  private storagePath: string;
  private meetingId: number;
  private tempDir: string;

  constructor(storagePath: string, meetingId: number) {
    this.storagePath = storagePath;
    this.meetingId = meetingId;
    this.tempDir = path.join(storagePath, 'temp', `meeting_${meetingId}`);
  }

  async initialize(): Promise<void> {
    // Ensure temp directory exists
    await fs.promises.mkdir(this.tempDir, { recursive: true });
    console.log(`✅ Initialized storage at ${this.tempDir}`);
  }

  async uploadChunk(blob: Buffer, chunkIndex: number): Promise<void> {
    const fileName = `chunk_${String(chunkIndex).padStart(5, '0')}.webm`;
    const filePath = path.join(this.tempDir, fileName);

    await fs.promises.writeFile(filePath, blob);

    const sizeKB = (blob.length / 1024).toFixed(2);
    console.log(`✅ Uploaded ${fileName} (${sizeKB} KB)`);
  }

  async cleanup(): Promise<void> {
    // Cleanup is handled by bot-manager after finalization
    console.log(`ℹ️  Temp files will be cleaned up by bot-manager`);
  }
}

import { Page } from 'playwright';
import { ChunkUploader } from './uploader';

export class AudioRecorder {
  private page: Page;
  private uploader: ChunkUploader;
  private chunkDuration: number;
  private audioBitrate: number;
  private chunkIndex: number = 0;
  private isRecording: boolean = false;

  constructor(page: Page, uploader: ChunkUploader, chunkDuration: number, audioBitrate: number) {
    this.page = page;
    this.uploader = uploader;
    this.chunkDuration = chunkDuration;
    this.audioBitrate = audioBitrate;
  }

  async startRecording(): Promise<void> {
    console.log('🎙️  Starting audio recording...');

    // Inject recording script into the page
    await this.page.evaluate(
      ({ chunkDurationMs, bitrate }) => {
        return new Promise<void>((resolve, reject) => {
          // Get all audio streams from the page
          const audioContext = new AudioContext();
          const audioStreams: MediaStream[] = [];

          // Try to capture audio from the meeting
          // This is a simplified version - actual implementation needs platform-specific logic
          navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            const mediaRecorder = new MediaRecorder(stream, {
              mimeType: 'audio/webm;codecs=opus',
              audioBitsPerSecond: bitrate,
            });

            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                chunks.push(event.data);

                // Send chunk to parent context (we'll handle this differently in real implementation)
                const reader = new FileReader();
                reader.onloadend = () => {
                  // Store in window object to be retrieved by Playwright
                  if (!window.__recordingChunks) {
                    window.__recordingChunks = [];
                  }
                  window.__recordingChunks.push(reader.result);
                };
                reader.readAsArrayBuffer(event.data);
              }
            };

            mediaRecorder.onerror = (error) => {
              console.error('MediaRecorder error:', error);
              reject(error);
            };

            mediaRecorder.start(chunkDurationMs);

            // Store recorder in window for later access
            window.__mediaRecorder = mediaRecorder;

            console.log('✅ MediaRecorder started');
            resolve();
          }).catch(reject);
        });
      },
      {
        chunkDurationMs: this.chunkDuration * 1000,
        bitrate: this.audioBitrate,
      }
    );

    this.isRecording = true;

    // Poll for new chunks
    this.startChunkPoller();
  }

  private async startChunkPoller(): Promise<void> {
    const pollInterval = this.chunkDuration * 1000;

    while (this.isRecording) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      // Retrieve chunks from the page
      const chunks = await this.page.evaluate(() => {
        const chunks = window.__recordingChunks || [];
        window.__recordingChunks = []; // Clear after retrieval
        return chunks;
      });

      // Upload each chunk
      for (const chunkData of chunks) {
        const buffer = Buffer.from(chunkData as ArrayBuffer);
        await this.uploader.uploadChunk(buffer, this.chunkIndex);
        this.chunkIndex++;
      }
    }
  }

  async stopRecording(): Promise<number> {
    console.log('⏹️  Stopping audio recording...');

    this.isRecording = false;

    // Stop MediaRecorder
    await this.page.evaluate(() => {
      if (window.__mediaRecorder) {
        window.__mediaRecorder.stop();
        delete window.__mediaRecorder;
      }
    });

    // Wait for final chunks
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Retrieve final chunks
    const chunks = await this.page.evaluate(() => {
      const chunks = window.__recordingChunks || [];
      window.__recordingChunks = [];
      return chunks;
    });

    for (const chunkData of chunks) {
      const buffer = Buffer.from(chunkData as ArrayBuffer);
      await this.uploader.uploadChunk(buffer, this.chunkIndex);
      this.chunkIndex++;
    }

    console.log(`✅ Recording stopped. Total chunks: ${this.chunkIndex}`);
    return this.chunkIndex;
  }

  getChunkCount(): number {
    return this.chunkIndex;
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __mediaRecorder?: MediaRecorder;
    __recordingChunks?: ArrayBuffer[];
  }
}

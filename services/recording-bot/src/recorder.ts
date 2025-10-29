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

    // Inject recording script using Vexa Clean's approach
    await this.page.evaluate(
      ({ chunkDurationMs, bitrate }) => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            console.log('[Browser] Finding media elements with audio...');

            // Find active media elements (Vexa Clean approach)
            const findMediaElements = async (retries = 10, delay = 1000): Promise<HTMLMediaElement[]> => {
              for (let i = 0; i < retries; i++) {
                const mediaElements = Array.from(
                  document.querySelectorAll("audio, video")
                ).filter((el: any) =>
                  !el.paused &&
                  el.srcObject instanceof MediaStream &&
                  el.srcObject.getAudioTracks().length > 0
                ) as HTMLMediaElement[];

                if (mediaElements.length > 0) {
                  console.log(`[Browser] Found ${mediaElements.length} active media elements`);
                  return mediaElements;
                }

                console.log(`[Browser] No media elements found, retry ${i + 1}/${retries}...`);
                await new Promise(r => setTimeout(r, delay));
              }
              return [];
            };

            const mediaElements = await findMediaElements();

            if (mediaElements.length === 0) {
              throw new Error('No media elements found with audio');
            }

            // Create combined audio stream (Vexa Clean approach)
            const audioContext = new AudioContext({ sampleRate: 48000 });
            const destination = audioContext.createMediaStreamDestination();

            mediaElements.forEach((element: any, index: number) => {
              try {
                const elementStream = element.srcObject ||
                  (element.captureStream && element.captureStream()) ||
                  (element.mozCaptureStream && element.mozCaptureStream());

                if (elementStream instanceof MediaStream && elementStream.getAudioTracks().length > 0) {
                  const source = audioContext.createMediaStreamSource(elementStream);
                  source.connect(destination);
                  console.log(`[Browser] Connected audio stream ${index + 1}`);
                }
              } catch (error: any) {
                console.error(`[Browser] Failed to connect stream ${index}:`, error.message);
              }
            });

            const combinedStream = destination.stream;

            // Initialize MediaRecorder
            const mediaRecorder = new MediaRecorder(combinedStream, {
              mimeType: 'audio/webm;codecs=opus',
              audioBitsPerSecond: bitrate,
            });

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (!window.__recordingChunks) {
                    window.__recordingChunks = [];
                  }
                  // Convert ArrayBuffer to base64 string for Playwright serialization
                  const base64 = btoa(
                    String.fromCharCode(...new Uint8Array(reader.result as ArrayBuffer))
                  );
                  window.__recordingChunks.push(base64);
                };
                reader.readAsArrayBuffer(event.data);
              }
            };

            mediaRecorder.onerror = (error) => {
              console.error('MediaRecorder error:', error);
              reject(error);
            };

            mediaRecorder.start(chunkDurationMs);
            window.__mediaRecorder = mediaRecorder;

            console.log('✅ MediaRecorder started with combined stream');
            resolve();
          } catch (error) {
            reject(error);
          }
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

      // Upload each chunk (convert from base64)
      for (const chunkData of chunks) {
        const buffer = Buffer.from(chunkData as string, 'base64');
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
      const buffer = Buffer.from(chunkData as string, 'base64');
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
    __recordingChunks?: string[]; // base64 encoded chunks
  }
}

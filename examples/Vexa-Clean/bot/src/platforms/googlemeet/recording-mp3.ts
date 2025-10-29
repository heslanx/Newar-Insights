import { Page } from "playwright";
import { log } from "../../utils";
import { BotConfig } from "../../types";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Simplified Google Meet recording using MediaRecorder API
 * No external dependencies (WhisperLive removed)
 * Records audio to WebM format and saves to /recordings volume
 */
export async function startGoogleRecordingMP3(page: Page, botConfig: BotConfig): Promise<void> {
  log("[Recording] Starting simplified MediaRecorder-based recording");

  // Inject recording script into browser context
  // This runs in the browser and starts MediaRecorder
  const meetingId = botConfig.nativeMeetingId;
  await page.evaluate((meetingId) => {
    console.log("[Browser] Initializing MediaRecorder for audio capture");

    // Find media elements with audio
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
          console.log(`[Browser] Found ${mediaElements.length} active media elements with audio`);
          return mediaElements;
        }

        console.log(`[Browser] No media elements found, retry ${i + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      return [];
    };

    // Create combined audio stream from all media elements
    const createCombinedStream = (mediaElements: HTMLMediaElement[]): MediaStream => {
      const audioContext = new AudioContext({ sampleRate: 48000 });
      const destination = audioContext.createMediaStreamDestination();

      let sourcesConnected = 0;
      mediaElements.forEach((element: any, index: number) => {
        try {
          const elementStream = element.srcObject ||
            (element.captureStream && element.captureStream()) ||
            (element.mozCaptureStream && element.mozCaptureStream());

          if (elementStream instanceof MediaStream && elementStream.getAudioTracks().length > 0) {
            const source = audioContext.createMediaStreamSource(elementStream);
            source.connect(destination);
            sourcesConnected++;
            console.log(`[Browser] Connected audio stream ${index + 1} (${element.tagName})`);
          }
        } catch (error: any) {
          console.error(`[Browser] Failed to connect stream ${index}:`, error.message);
        }
      });

      console.log(`[Browser] Combined ${sourcesConnected} audio sources`);
      return destination.stream;
    };

    // Start the recording process
    const initRecording = async () => {
      try {
        const mediaElements = await findMediaElements();

        if (mediaElements.length === 0) {
          console.error("[Browser] ERROR: No media elements found after retries");
          throw new Error("No media elements found for recording");
        }

        const combinedStream = createCombinedStream(mediaElements);

        // Check MediaRecorder support
        const mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.warn(`[Browser] ${mimeType} not supported, trying fallback`);
          throw new Error("MediaRecorder not supported");
        }

        // Initialize MediaRecorder with streaming support
        const options = {
          mimeType: mimeType,
          audioBitsPerSecond: 128000  // 128kbps - good quality
        };

        const recorder = new MediaRecorder(combinedStream, options);
        
        // Track chunk index for streaming
        let chunkIndex = 0;
        const RECORDING_STORAGE_URL = 'http://recording-storage:8000';
        // meetingId is passed as parameter from Node.js context

        recorder.ondataavailable = async (event) => {
          if (event.data && event.data.size > 0) {
            const currentChunkIndex = chunkIndex++;
            console.log(`[Browser] Chunk ${currentChunkIndex} ready: ${event.data.size} bytes`);
            
            try {
              // Send chunk to recording-storage immediately
              const formData = new FormData();
              formData.append('file', event.data, `chunk_${currentChunkIndex}.webm`);
              
              const response = await fetch(`${RECORDING_STORAGE_URL}/stream`, {
                method: 'POST',
                headers: {
                  'X-Meeting-ID': meetingId,
                  'X-Chunk-Index': String(currentChunkIndex)
                },
                body: formData
              });
              
              if (response.ok) {
                console.log(`[Browser] ✅ Chunk ${currentChunkIndex} sent successfully`);
              } else {
                console.error(`[Browser] ❌ Failed to send chunk ${currentChunkIndex}: ${response.status}`);
              }
            } catch (error: any) {
              console.error(`[Browser] ❌ Error sending chunk ${currentChunkIndex}:`, error.message);
            }
          }
        };

        recorder.onstop = () => {
          console.log(`[Browser] Recording stopped. Total chunks sent: ${chunkIndex}`);
          (window as any).__recordingChunkCount = chunkIndex;
        };

        recorder.onerror = (error: any) => {
          console.error("[Browser] MediaRecorder error:", error);
        };

        // Start recording (send chunks every 10 seconds)
        recorder.start(10000);
        console.log(`[Browser] MediaRecorder started with streaming (${mimeType}, ${options.audioBitsPerSecond} bps, chunks every 10s)`);

        // Store recorder reference for cleanup
        (window as any).__mediaRecorder = recorder;

        // Add helper function to stop recording (called from Node.js later)
        (window as any).stopRecording = () => {
          if (recorder.state !== 'inactive') {
            console.log("[Browser] Stopping recording...");
            recorder.stop();
          }
        };

      } catch (error: any) {
        console.error("[Browser] Failed to initialize recording:", error);
        throw error;
      }
    };

    // Execute initialization
    return initRecording();
  }, meetingId);

  log("[Recording] MediaRecorder initialized successfully in browser context");
  log("[Recording] Audio capture is running in background");

  // CRITICAL: Keep this promise active so the bot doesn't exit immediately
  // This promise never resolves - the bot will stay recording until:
  // 1. Removal monitor detects bot was removed
  // 2. Redis "leave" command is received
  // 3. Automatic leave timeout triggers
  log("[Recording] Keeping recording active (awaiting removal signal or manual stop)...");
  await new Promise(() => {
    // Never resolves - keeps bot alive during recording
    // The meetingFlow's Promise.race will wait for removal signal instead
  });
}

/**
 * Stop recording and finalize the audio file
 * Called when bot is leaving the meeting
 * With streaming enabled, this just stops the recorder and calls /finalize
 */
export async function extractRecording(page: Page, botConfig: BotConfig): Promise<string | null> {
  log("[Recording] Finalizing streamed recording...");

  try {
    // Stop the recorder in browser
    await page.evaluate(() => {
      const stopFn = (window as any).stopRecording;
      if (stopFn) {
        stopFn();
      }
    });

    // Wait for last chunk to be sent
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get chunk count
    const chunkCount = await page.evaluate(() => {
      return (window as any).__recordingChunkCount || 0;
    });

    log(`[Recording] Stopped recorder. ${chunkCount} chunks were sent during recording.`);

    // Call finalize endpoint to concatenate chunks
    const RECORDING_STORAGE_URL = process.env.RECORDING_STORAGE_URL || 'http://recording-storage:8000';
    const meetingId = botConfig.nativeMeetingId;

    log(`[Recording] Calling /finalize endpoint for meeting ${meetingId}...`);

    const response = await fetch(`${RECORDING_STORAGE_URL}/finalize/${meetingId}`, {
      method: 'POST'
    });

    if (response.ok) {
      const result = await response.json();
      log(`[Recording] ✅ Finalized: ${result.filename} (${result.chunks_merged} chunks, ${result.file_size} bytes)`);
      return result.filename;
    } else {
      const errorText = await response.text();
      log(`[Recording] ❌ Finalization failed: ${response.status} - ${errorText}`);
      return null;
    }

  } catch (error: any) {
    log(`[Recording] ERROR during finalization: ${error.message}`);
    log(`[Recording] Stack: ${error.stack}`);
    return null;
  }
}

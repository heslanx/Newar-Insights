import { chromium as playwrightChromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'playwright';
import { loadConfig } from './config';
import { RedisClient } from './redis-client';
import { ChunkUploader } from './uploader';
import { AudioRecorder } from './recorder';
import { GoogleMeetPlatform } from './platforms/google-meet';
import { TeamsPlatform } from './platforms/teams';

const CONTAINER_ID = process.env.HOSTNAME || `bot-${Date.now()}`;

async function main() {
  console.log('🤖 Newar Recording Bot Starting...');
  console.log(`📦 Container ID: ${CONTAINER_ID}`);

  // Load configuration
  const config = loadConfig();
  console.log(`📋 Config loaded: Meeting ID=${config.meetingId}, Platform=${config.platform}`);

  let browser: Browser | null = null;
  let page: Page | null = null;
  let redisClient: RedisClient | null = null;
  let recorder: AudioRecorder | null = null;
  let shouldStop = false;

  try {
    // Initialize Redis client
    redisClient = new RedisClient(config.redisUrl, CONTAINER_ID, config.meetingId);
    await redisClient.connect();

    // Subscribe to commands (stop, etc.)
    await redisClient.subscribeToCommands((command) => {
      if (command === 'stop') {
        console.log('🛑 Stop command received');
        shouldStop = true;
      }
    });

    // Publish joining status
    await redisClient.publishStatus('joining');

    // Launch browser with stealth plugin (like Vexa Clean)
    console.log('🌐 Launching Chromium browser with stealth...');
    
    // Configure stealth plugin
    const stealthPlugin = StealthPlugin();
    stealthPlugin.enabledEvasions.delete("iframe.contentWindow");
    stealthPlugin.enabledEvasions.delete("media.codecs");
    playwrightChromium.use(stealthPlugin);
    
    browser = await playwrightChromium.launch({
      headless: false, // CRITICAL: Vexa uses headless:false for Google Meet
      args: [
        '--incognito',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-infobars',
        '--disable-gpu',
        '--use-fake-ui-for-media-stream',
        '--use-file-for-fake-video-capture=/dev/null',
        '--use-file-for-fake-audio-capture=/dev/null',
        '--allow-running-insecure-content',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-site-isolation-trials',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['microphone', 'camera'],
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    });
    
    page = await context.newPage();

    console.log('✅ Browser launched');

    // Initialize storage uploader
    const uploader = new ChunkUploader(config.storagePath, config.meetingId);
    await uploader.initialize();

    // Join meeting based on platform
    let platform: GoogleMeetPlatform | TeamsPlatform;

    if (config.platform === 'google_meet') {
      platform = new GoogleMeetPlatform(page, config.botName);
      await platform.join(config.meetingUrl);
    } else if (config.platform === 'teams') {
      platform = new TeamsPlatform(page, config.botName);
      await platform.join(config.meetingUrl);
    } else {
      throw new Error(`Unsupported platform: ${config.platform}`);
    }

    // Publish active status
    await redisClient.publishStatus('active');

    // Initialize recorder
    recorder = new AudioRecorder(page, uploader, config.chunkDuration, config.audioBitrate);

    // Start recording
    await recorder.startRecording();
    await redisClient.publishStatus('recording', 0);

    // Monitor recording
    console.log('🎥 Recording in progress...');

    // Periodically update status with chunk count
    const statusInterval = setInterval(async () => {
      if (recorder && redisClient) {
        await redisClient.publishStatus('recording', recorder.getChunkCount());
      }
    }, 30000); // Every 30 seconds

    // Wait until stop command or timeout
    while (!shouldStop) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if meeting ended (page navigation or specific indicators)
      // TODO: Implement platform-specific meeting end detection
    }

    clearInterval(statusInterval);

    // Stop recording
    console.log('⏹️  Stopping recording...');
    await redisClient.publishStatus('finalizing');

    const totalChunks = await recorder.stopRecording();

    // Leave meeting
    if (config.platform === 'google_meet') {
      await (platform as GoogleMeetPlatform).leave();
    }

    // Publish completed status
    await redisClient.publishStatus('completed', totalChunks);

    console.log('✅ Recording completed successfully!');

  } catch (error) {
    console.error('❌ Error during recording:', error);

    if (redisClient) {
      await redisClient.publishStatus('failed', undefined, String(error));
    }

    process.exit(1);
  } finally {
    // Cleanup
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed');
    }

    if (redisClient) {
      await redisClient.disconnect();
    }
  }

  console.log('👋 Bot exiting gracefully');
  process.exit(0);
}

// Handle signals for graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down...');
  process.exit(0);
});

// Run the bot
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

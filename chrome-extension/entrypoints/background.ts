import { storage } from '@/lib/storage';
import { apiClient } from '@/lib/api-client';
import type { Message, MessageResponse, Recording } from '@/lib/types';
import {
  isDevMode,
  devAutoSetup,
  checkBackendHealth,
  logDevModeStatus,
} from '@/lib/dev-mode';

export default defineBackground(() => {
  console.log('Newar Insights Background Service Worker initialized');

  // Dev mode setup with real API
  if (isDevMode()) {
    logDevModeStatus();
    devAutoSetup().then(() => {
      checkBackendHealth().then(isHealthy => {
        if (!isHealthy) {
          console.warn('[DEV MODE] ⚠️ Backend is not running!');
          console.warn('[DEV MODE] Run: docker-compose up -d');
        } else {
          console.log('[DEV MODE] ✅ Backend is running and healthy!');
        }
      });
    });
  }

  // ============================================
  // Installation & Setup
  // ============================================

  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      console.log('Extension installed - opening onboarding');
      
      // Open onboarding page
      await chrome.tabs.create({
        url: chrome.runtime.getURL('/onboarding.html'),
      });
    }
  });

  // ============================================
  // Message Handling
  // ============================================

  chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    handleMessage(message)
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error('Error handling message:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    // Return true to indicate async response
    return true;
  });

  async function handleMessage(message: Message): Promise<MessageResponse> {
    console.log('Received message:', message.type);

    switch (message.type) {
      case 'START_RECORDING':
        return handleStartRecording(message.payload);

      case 'STOP_RECORDING':
        return handleStopRecording(message.payload);

      case 'CHECK_MEETING_STATUS':
        return handleCheckMeetingStatus(message.payload);

      case 'OPEN_SETTINGS':
        return handleOpenSettings();

      case 'OPEN_RECORDINGS':
        return handleOpenRecordings();

      case 'LOGOUT':
        return handleLogout();

      default:
        return {
          success: false,
          error: 'Unknown message type',
        };
    }
  }

  // ============================================
  // Recording Actions
  // ============================================

  async function handleStartRecording(payload: {
    meetingId: string;
    botName?: string;
  }): Promise<MessageResponse> {
    console.log('[Newar Background] START_RECORDING requested for:', payload.meetingId);

    try {
      const apiKey = await storage.getApiKey();
      console.log('[Newar Background] API Key:', apiKey ? 'Found' : 'NOT FOUND');
      
      if (!apiKey) {
        console.error('[Newar Background] No API key found, user not authenticated');
        throw new Error('Not authenticated');
      }

      const preferences = await storage.getPreferences();
      console.log('[Newar Background] Preferences loaded:', preferences);

      // Create recording
      console.log('[Newar Background] Calling API to create recording...');
      const recording = await apiClient.createRecording(apiKey, {
        platform: 'google_meet',
        meeting_id: payload.meetingId,
        bot_name: payload.botName || preferences.botName,
      });
      
      console.log('[Newar Background] Recording created:', recording);

      // Save to active recordings
      await storage.addActiveRecording(recording);
      console.log('[Newar Background] Recording saved to storage');

      // Show notification if enabled
      if (preferences.notifyOnStart) {
        await showNotification({
          title: 'Gravação Iniciada',
          message: `Gravando reunião: ${payload.meetingId}`,
          iconUrl: '/icon/128.png',
        });
        console.log('[Newar Background] Notification shown');
      }

      // Start polling for status updates
      startPolling(payload.meetingId);
      console.log('[Newar Background] Polling started');

      return {
        success: true,
        data: recording,
      };
    } catch (error) {
      console.error('[Newar Background] Error starting recording:', error);
      console.error('[Newar Background] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start recording',
      };
    }
  }

  async function handleStopRecording(payload: {
    meetingId: string;
  }): Promise<MessageResponse> {
    console.log('[Newar Background] STOP_RECORDING requested for:', payload.meetingId);

    try {
      const apiKey = await storage.getApiKey();
      console.log('[Newar Background] API Key for stop:', apiKey ? 'Found' : 'NOT FOUND');

      if (!apiKey) {
        console.error('[Newar Background] No API key found, user not authenticated');
        throw new Error('Not authenticated');
      }

      // Stop recording
      console.log('[Newar Background] Calling API to stop recording...');
      const result = await apiClient.stopRecording(apiKey, payload.meetingId);
      console.log('[Newar Background] Stop recording result:', result);

      // Update storage
      console.log('[Newar Background] Updating storage...');
      await storage.updateActiveRecording(payload.meetingId, {
        status: 'stopping',
      });

      // Stop polling
      console.log('[Newar Background] Stopping polling...');
      stopPolling(payload.meetingId);

      const preferences = await storage.getPreferences();
      if (preferences.notifyOnComplete) {
        await showNotification({
          title: 'Gravação Parada',
          message: `Gravação finalizada: ${payload.meetingId}`,
          iconUrl: '/icon/128.png',
        });
        console.log('[Newar Background] Stop notification shown');
      }

      console.log('[Newar Background] Recording stopped successfully');

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[Newar Background] Error stopping recording:', error);
      console.error('[Newar Background] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop recording',
      };
    }
  }

  // (Legacy) GET_POPUP_DATA removed along with popup UI

  async function handleCheckMeetingStatus(payload: {
    meetingId: string;
  }): Promise<MessageResponse<{ isRecording: boolean; recording?: Recording }>> {
    try {
      const recording = await storage.getActiveRecordingByMeetingId(payload.meetingId);
      
      return {
        success: true,
        data: {
          isRecording: !!recording,
          recording: recording || undefined,
        },
      };
    } catch (error) {
      console.error('Error checking meeting status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check meeting status',
      };
    }
  }

  async function handleLogout(): Promise<MessageResponse> {
    try {
      await storage.logout();

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error logging out:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to logout',
      };
    }
  }

  async function handleOpenSettings(): Promise<MessageResponse> {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('/settings.html'),
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error opening settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open settings',
      };
    }
  }

  async function handleOpenRecordings(): Promise<MessageResponse> {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('/recordings.html'),
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error opening recordings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open recordings',
      };
    }
  }

  // ============================================
  // Status Polling
  // ============================================

  const pollingIntervals = new Map<string, number>();

  function startPolling(meetingId: string) {
    // Don't start if already polling
    if (pollingIntervals.has(meetingId)) {
      return;
    }

    console.log(`Starting polling for meeting: ${meetingId}`);

    const intervalId = setInterval(async () => {
      await pollRecordingStatus(meetingId);
    }, 5000); // Poll every 5 seconds

    pollingIntervals.set(meetingId, intervalId as unknown as number);
  }

  function stopPolling(meetingId: string) {
    const intervalId = pollingIntervals.get(meetingId);
    
    if (intervalId) {
      console.log(`Stopping polling for meeting: ${meetingId}`);
      clearInterval(intervalId);
      pollingIntervals.delete(meetingId);
    }
  }

  async function pollRecordingStatus(meetingId: string) {
    try {
      const apiKey = await storage.getApiKey();
      if (!apiKey) {
        stopPolling(meetingId);
        return;
      }

      // Get latest status from API
      const recording = await apiClient.getRecording(apiKey, meetingId);

      // Update storage
      await storage.updateActiveRecording(meetingId, recording);

      // Check if recording is finished
      if (recording.status === 'completed' || recording.status === 'failed') {
        stopPolling(meetingId);

        // Show notification
        const preferences = await storage.getPreferences();
        if (preferences.notifyOnComplete) {
          await showNotification({
            title: recording.status === 'completed' ? 'Gravação Concluída' : 'Gravação Falhou',
            message:
              recording.status === 'completed'
                ? `Reunião ${meetingId} gravada com sucesso`
                : `Erro ao gravar reunião: ${recording.error_message || 'Unknown error'}`,
            iconUrl: '/icon/128.png',
          });
        }

        // Remove from active recordings after a delay
        setTimeout(async () => {
          await storage.removeActiveRecording(meetingId);
        }, 60000); // 1 minute
      }
    } catch (error) {
      console.error(`Error polling status for ${meetingId}:`, error);
      
      // Stop polling on persistent errors
      stopPolling(meetingId);
    }
  }

  // ============================================
  // Notifications
  // ============================================

  async function showNotification(options: {
    title: string;
    message: string;
    iconUrl: string;
    buttons?: { title: string }[];
    requireInteraction?: boolean;
  }) {
    await chrome.notifications.create({
      type: 'basic',
      title: options.title,
      message: options.message,
      iconUrl: options.iconUrl,
      buttons: options.buttons,
      requireInteraction: options.requireInteraction,
    });
  }

  // Handle notification clicks
  chrome.notifications.onClicked.addListener(() => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('/recordings.html'),
    });
  });

  // ============================================
  // Context Menu & Meet Detection (No popup/badge)
  // ============================================

  // Track meeting prompts to avoid spamming
  const promptedMeetings = new Set<string>();
  const notificationMeetingMap = new Map<string, string>();

  // Create context menus scoped to Meet
  function createContextMenus() {
    try {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: 'newar-start',
          title: 'Iniciar gravação',
          contexts: ['page'],
          documentUrlPatterns: ['https://meet.google.com/*'],
        });
        chrome.contextMenus.create({
          id: 'newar-stop',
          title: 'Parar gravação',
          contexts: ['page'],
          documentUrlPatterns: ['https://meet.google.com/*'],
        });
        chrome.contextMenus.create({
          id: 'newar-open',
          title: 'Abrir gravações',
          contexts: ['all'],
        });
      });
    } catch (e) {
      console.error('Error creating context menus:', e);
    }
  }

  createContextMenus();
  chrome.runtime.onInstalled.addListener(() => createContextMenus());

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const url = info.pageUrl || tab?.url || '';
    const meetingId = extractMeetingId(url || '');
    if (info.menuItemId === 'newar-open') {
      await chrome.tabs.create({ url: chrome.runtime.getURL('/recordings.html') });
      return;
    }
    if (!meetingId) return;

    if (info.menuItemId === 'newar-start') {
      await handleStartRecording({ meetingId });
    } else if (info.menuItemId === 'newar-stop') {
      await handleStopRecording({ meetingId });
    }
  });

  // Detect Meet tabs and prompt to start recording once per meeting
  chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    const url = tab?.url || '';
    if (!url.includes('meet.google.com')) return;
    const meetingId = extractMeetingId(url);
    if (!meetingId || promptedMeetings.has(meetingId)) return;

    promptedMeetings.add(meetingId);

    const notificationId = await chrome.notifications.create({
      type: 'basic',
      title: 'Detectei uma reunião do Google Meet',
      message: 'Deseja iniciar a gravação desta reunião?',
      iconUrl: '/icon/128.png',
      buttons: [{ title: 'Iniciar gravação' }, { title: 'Dispensar' }],
      requireInteraction: true,
    });
    notificationMeetingMap.set(notificationId, meetingId);
  });

  chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    const meetingId = notificationMeetingMap.get(notificationId);
    if (!meetingId) return;
    if (buttonIndex === 0) {
      await handleStartRecording({ meetingId });
    }
    chrome.notifications.clear(notificationId);
    notificationMeetingMap.delete(notificationId);
  });

  // ============================================
  // Keyboard Shortcuts
  // ============================================

  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-recording') {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab?.url?.includes('meet.google.com')) {
        const meetingId = extractMeetingId(tab.url);
        
        if (meetingId) {
          const recording = await storage.getActiveRecordingByMeetingId(meetingId);
          
          if (recording) {
            await handleStopRecording({ meetingId });
          } else {
            await handleStartRecording({ meetingId });
          }
        }
      }
    } else if (command === 'open-recordings') {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('/recordings.html'),
      });
    }
  });

  // ============================================
  // Utilities
  // ============================================

  function extractMeetingId(url: string): string | null {
    const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
    return match ? match[1] : null;
  }

  console.log('Background service worker ready');
});

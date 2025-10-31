/**
 * Recording service
 * Centralized recording management logic
 */

import { apiClient } from './api-client';
import { storage } from './storage';
import { parseApiError, logError } from './error-handler';
import type { Recording, CreateRecordingRequest } from './types';

export interface RecordingResult {
  success: boolean;
  error?: string;
  recording?: Recording;
}

export interface RecordingsListResult {
  success: boolean;
  error?: string;
  recordings?: Recording[];
  total?: number;
}

/**
 * Start recording
 */
export async function startRecording(
  apiKey: string,
  meetingId: string,
  botName?: string
): Promise<RecordingResult> {
  try {
    console.log('[Newar Recording] Starting recording for:', meetingId);
    
    const preferences = await storage.getPreferences();
    
    const request: CreateRecordingRequest = {
      platform: 'google_meet',
      meeting_id: meetingId,
      bot_name: botName || preferences.botName,
    };
    
    const recording = await apiClient.createRecording(apiKey, request);
    
    // Save to active recordings
    await storage.addActiveRecording(recording);
    
    console.log('[Newar Recording] Recording started successfully:', recording.id);
    
    // Show notification if enabled
    if (preferences.notifyOnStart) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon/128.png',
        title: 'Gravação Iniciada',
        message: `Gravando reunião: ${meetingId}`,
      });
    }
    
    return { success: true, recording };
  } catch (error) {
    logError(error, { operation: 'start recording', details: { meetingId } });
    return { success: false, error: parseApiError(error, { operation: 'iniciar gravação' }) };
  }
}

/**
 * Stop recording
 */
export async function stopRecording(
  apiKey: string,
  meetingId: string
): Promise<RecordingResult> {
  try {
    console.log('[Newar Recording] Stopping recording for:', meetingId);
    
    await apiClient.stopRecording(apiKey, meetingId);
    
    // Remove from active recordings
    await storage.removeActiveRecording(meetingId);
    
    console.log('[Newar Recording] Recording stopped successfully');
    
    const preferences = await storage.getPreferences();
    if (preferences.notifyOnComplete) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon/128.png',
        title: 'Gravação Parada',
        message: `Gravação finalizada: ${meetingId}`,
      });
    }
    
    return { success: true };
  } catch (error) {
    logError(error, { operation: 'stop recording', details: { meetingId } });
    return { success: false, error: parseApiError(error, { operation: 'parar gravação' }) };
  }
}

/**
 * Get recording status
 */
export async function getRecordingStatus(
  apiKey: string,
  meetingId: string
): Promise<RecordingResult> {
  try {
    const recording = await apiClient.getRecording(apiKey, meetingId);
    return { success: true, recording };
  } catch (error) {
    logError(error, { operation: 'get recording status', details: { meetingId } });
    return { success: false, error: parseApiError(error) };
  }
}

/**
 * List recordings
 */
export async function listRecordings(
  apiKey: string,
  limit: number = 100,
  offset: number = 0
): Promise<RecordingsListResult> {
  try {
    console.log('[Newar Recording] Listing recordings...');
    
    const response = await apiClient.listRecordings(apiKey, limit, offset);
    
    return {
      success: true,
      recordings: response.data,
      total: response.total,
    };
  } catch (error) {
    logError(error, { operation: 'list recordings' });
    return { success: false, error: parseApiError(error, { operation: 'listar gravações' }) };
  }
}

/**
 * Download recording
 */
export async function downloadRecording(
  apiKey: string,
  meetingId: string,
  filename?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Newar Recording] Downloading recording:', meetingId);
    
    const blob = await apiClient.downloadRecording(apiKey, meetingId);
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `recording-${meetingId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[Newar Recording] Download started');
    
    return { success: true };
  } catch (error) {
    logError(error, { operation: 'download recording', details: { meetingId } });
    return { success: false, error: parseApiError(error, { operation: 'baixar gravação' }) };
  }
}

/**
 * Check if meeting is being recorded
 */
export async function isMeetingRecording(meetingId: string): Promise<boolean> {
  try {
    const recording = await storage.getActiveRecordingByMeetingId(meetingId);
    return !!recording;
  } catch (error) {
    logError(error, { operation: 'check meeting recording', details: { meetingId } });
    return false;
  }
}

/**
 * Get active recordings count
 */
export async function getActiveRecordingsCount(): Promise<number> {
  try {
    const recordings = await storage.getActiveRecordings();
    return recordings.length;
  } catch (error) {
    logError(error, { operation: 'get active recordings count' });
    return 0;
  }
}

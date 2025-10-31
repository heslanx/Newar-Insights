import { useState, useCallback, useEffect } from 'react';
import { listRecordings, startRecording, stopRecording, downloadRecording } from '@/lib/recording-service';
import type { Recording } from '@/lib/types';

interface UseRecordingsOptions {
  autoLoad?: boolean;
}

/**
 * Hook para gerenciar gravações
 * Centraliza lógica de CRUD de recordings
 */
export function useRecordings(apiKey: string | undefined, options: UseRecordingsOptions = {}) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiKey) {
      setError('API Key não fornecida');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await listRecordings(apiKey);
      if (result.success && result.recordings) {
        setRecordings(result.recordings);
      } else {
        setError(result.error || 'Erro ao carregar gravações');
      }
    } catch (err) {
      console.error('[useRecordings] Load error:', err);
      setError('Erro inesperado ao carregar gravações');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const start = useCallback(async (meetingId: string, botName?: string) => {
    if (!apiKey) {
      return { success: false, error: 'API Key não fornecida' };
    }

    const result = await startRecording(apiKey, meetingId, botName);
    
    if (result.success) {
      await load(); // Recarrega lista
    }
    
    return result;
  }, [apiKey, load]);

  const stop = useCallback(async (meetingId: string) => {
    if (!apiKey) {
      return { success: false, error: 'API Key não fornecida' };
    }

    const result = await stopRecording(apiKey, meetingId);
    
    if (result.success) {
      await load(); // Recarrega lista
    }
    
    return result;
  }, [apiKey, load]);

  const download = useCallback(async (meetingId: string, filename?: string) => {
    if (!apiKey) {
      return { success: false, error: 'API Key não fornecida' };
    }

    return await downloadRecording(apiKey, meetingId, filename);
  }, [apiKey]);

  // Auto-load se configurado
  useEffect(() => {
    if (options.autoLoad && apiKey) {
      load();
    }
  }, [options.autoLoad, apiKey, load]);

  return {
    recordings,
    loading,
    error,
    load,
    start,
    stop,
    download,
  };
}

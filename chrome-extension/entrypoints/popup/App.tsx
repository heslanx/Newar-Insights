import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HulyCard, HulyCardContent } from '@/components/ui/huly-card';
import { GlowingButton } from '@/components/ui/glowing-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { extractMeetingId } from '@/lib/utils';
import { storage } from '@/lib/storage';
import { isDevMode, checkBackendHealth } from '@/lib/dev-mode';
import { Loader2, Video, VideoOff, Settings, LogOut, AlertCircle, CheckCircle } from 'lucide-react';

interface PopupState {
  state: 'not-authenticated' | 'not-on-meet' | 'ready-to-record' | 'recording-in-progress';
  user?: {
    email: string;
    name: string;
    max_concurrent_bots: number;
  };
  stats?: {
    totalRecordings: number;
    botsAvailable: number;
    activeRecordings: number;
  };
  currentMeetingId?: string;
  activeRecording?: any;
  backendHealthy?: boolean;
}

function App() {
  const [data, setData] = useState<PopupState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPopupData();
  }, []);

  async function loadPopupData() {
    const startTime = performance.now();
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const meetingId = tab?.url?.includes('meet.google.com')
        ? extractMeetingId(tab.url)
        : undefined;

      // Check authentication
      const apiKey = await storage.getApiKey();
      const user = await storage.getUser();

      if (!apiKey || !user) {
        setData({
          state: 'not-authenticated',
          currentMeetingId: meetingId,
        });
        return;
      }

      // Check backend health if dev mode
      let backendHealthy = true;
      if (isDevMode()) {
        backendHealthy = await checkBackendHealth();
      }

      // Check if currently recording
      const activeRecordings = await storage.getActiveRecordings();
      const activeRecording = meetingId
        ? activeRecordings.find((r: any) => r.meeting_id === meetingId)
        : undefined;

      // Calculate stats
      const stats = {
        totalRecordings: 0, // Could fetch from API
        botsAvailable: user.max_concurrent_bots - activeRecordings.length,
        activeRecordings: activeRecordings.length,
      };

      // Determine state
      let state: PopupState['state'];
      if (activeRecording) {
        state = 'recording-in-progress';
      } else if (meetingId) {
        state = 'ready-to-record';
      } else {
        state = 'not-on-meet';
      }

      setData({
        state,
        user,
        stats,
        currentMeetingId: meetingId,
        activeRecording,
        backendHealthy,
      });

      console.log(`Popup loaded in ${performance.now() - startTime}ms`);
    } catch (error) {
      console.error('Error loading popup data:', error);
      // Set default data on error
      setData({
        state: 'not-on-meet',
        user: undefined,
        stats: undefined,
        currentMeetingId: undefined,
        activeRecording: undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  const handleStartRecording = useCallback(async () => {
    if (!data?.currentMeetingId) return;

    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        payload: { meetingId: data.currentMeetingId },
      });

      if (response.success) {
        await loadPopupData();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    } finally {
      setLoading(false);
    }
  }, [data?.currentMeetingId]);

  const handleStopRecording = useCallback(async () => {
    if (!data?.currentMeetingId) {
      console.error('[Popup] Cannot stop: no meeting ID');
      return;
    }

    console.log('[Popup] Stop recording button clicked for:', data.currentMeetingId);
    setLoading(true);
    try {
      console.log('[Popup] Sending STOP_RECORDING message...');
      const response = await chrome.runtime.sendMessage({
        type: 'STOP_RECORDING',
        payload: { meetingId: data.currentMeetingId },
      });

      console.log('[Popup] Stop recording response:', response);

      if (response.success) {
        console.log('[Popup] Recording stopped successfully, reloading popup data...');
        await loadPopupData();
      } else {
        console.error('[Popup] Stop recording failed:', response.error);
        alert(`Erro ao parar gravação: ${response.error}`);
      }
    } catch (error) {
      console.error('[Popup] Error stopping recording:', error);
      alert(`Erro ao parar gravação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }, [data?.currentMeetingId]);

  const handleLogout = useCallback(async () => {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    window.location.reload();
  }, []);

  function openRecordings() {
    chrome.tabs.create({ url: '/recordings.html' });
  }

  function openSettings() {
    chrome.tabs.create({ url: '/settings.html' });
  }

  if (loading || !data) {
    return (
      <div className="w-[400px] h-[300px] bg-gray-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="w-[400px] bg-gray-1">
      {/* Header */}
      <div className="p-4 border-b border-gray-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo-newar-branco.svg"
              alt="Newar Insights"
              className="h-6"
            />
            {isDevMode() && (
              <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-gray-10">
                {data.backendHealthy ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-green-500 font-medium">API OK</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-yellow-500" />
                    <span className="text-yellow-500 font-medium">API OFF</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <OutlineButton
              onClick={openSettings}
              className="w-8 h-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </OutlineButton>
            {data.user && (
              <OutlineButton
                onClick={handleLogout}
                className="w-8 h-8 p-0"
              >
                <LogOut className="w-4 h-4" />
              </OutlineButton>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 min-h-[250px]">
        {/* Backend warning (dev mode only) */}
        {isDevMode() && !data.backendHealthy && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-[11px] text-yellow-500">
                <p className="font-bold mb-1">Backend não está rodando</p>
                <p className="text-yellow-500/80">
                  Execute: <code className="px-1 py-0.5 bg-gray-10 rounded">docker-compose up -d</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {data.state === 'not-authenticated' && (
          <HulyCard>
            <HulyCardContent className="pt-6 text-center space-y-4">
              <p className="text-[14px] text-gray-80">
                Você precisa fazer login para usar a extensão
              </p>
              <GlowingButton
                onClick={() => chrome.tabs.create({ url: '/onboarding.html' })}
                className="w-full h-10"
              >
                Fazer Login
              </GlowingButton>
            </HulyCardContent>
          </HulyCard>
        )}

        {data.state === 'not-on-meet' && (
          <>
            <div className="text-center space-y-3 py-4">
              <VideoOff className="w-12 h-12 mx-auto text-gray-50" />
              <p className="text-[14px] text-gray-80 px-4">
                Entre em uma reunião do Google Meet para começar a gravar
              </p>
            </div>

            {data.stats && (
              <div className="grid grid-cols-2 gap-3">
                <HulyCard>
                  <HulyCardContent className="pt-4 pb-4 text-center">
                    <p className="text-[28px] font-title text-white">{data.stats.totalRecordings}</p>
                    <p className="text-[11px] text-gray-60 uppercase font-bold tracking-snug">Gravações</p>
                  </HulyCardContent>
                </HulyCard>
                <HulyCard>
                  <HulyCardContent className="pt-4 pb-4 text-center">
                    <p className="text-[28px] font-title text-brand-blue">{data.stats.botsAvailable}</p>
                    <p className="text-[11px] text-gray-60 uppercase font-bold tracking-snug">Bots Ativos</p>
                  </HulyCardContent>
                </HulyCard>
              </div>
            )}

            <OutlineButton
              onClick={openRecordings}
              className="w-full h-10"
            >
              Ver Gravações
            </OutlineButton>
          </>
        )}

        {data.state === 'ready-to-record' && (
          <>
            <div className="text-center space-y-3 py-4">
              <div className="w-14 h-14 mx-auto bg-gradient-to-br from-blue to-orange rounded-2xl flex items-center justify-center">
                <Video className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-[18px] font-title text-white">Reunião Detectada</h3>
              <p className="text-[12px] text-gray-60 font-mono">
                {data.currentMeetingId}
              </p>
            </div>

            {data.stats && data.stats.botsAvailable > 0 ? (
              <GlowingButton
                onClick={handleStartRecording}
                disabled={loading}
                className="w-full h-11 shadow-action"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 w-5 h-5" />
                    Gravar Reunião
                  </>
                )}
              </GlowingButton>
            ) : (
              <Button
                disabled
                className="w-full h-11 bg-gray-20 text-gray-60 text-[12px] uppercase font-bold rounded-full cursor-not-allowed"
              >
                Limite de Bots Atingido
              </Button>
            )}
          </>
        )}

        {data.state === 'recording-in-progress' && data.activeRecording && (
          <>
            <div className="text-center space-y-3 py-4">
              <div className="relative inline-block">
                <div className="w-14 h-14 mx-auto bg-brand-danger rounded-2xl flex items-center justify-center">
                  <Video className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-danger rounded-full animate-pulse border-2 border-gray-1" />
              </div>
              <h3 className="text-[18px] font-title text-brand-danger uppercase tracking-tight">GRAVANDO</h3>
              <p className="text-[12px] text-gray-60 uppercase font-bold">
                Status: {data.activeRecording.status}
              </p>
            </div>

            <OutlineButton
              onClick={handleStopRecording}
              disabled={loading}
              className="w-full h-11 border-brand-danger text-brand-danger hover:bg-brand-danger hover:text-white shadow-action"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Parando...
                </>
              ) : (
                'Parar Gravação'
              )}
            </OutlineButton>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

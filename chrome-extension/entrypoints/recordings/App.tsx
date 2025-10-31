import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HulyCard, HulyCardContent, HulyCardHeader, HulyCardTitle } from '@/components/ui/huly-card';
import { GlowingButton } from '@/components/ui/glowing-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { storage } from '@/lib/storage';
import { listRecordings, downloadRecording } from '@/lib/recording-service';
import { formatDate, formatDuration, formatFileSize } from '@/lib/utils';
import { Loader2, Video, Download, Trash2, Calendar, Clock, ArrowLeft } from 'lucide-react';
import type { Recording } from '@/lib/types';
import { useToast } from '@/components/ui/toast';

export default function RecordingsApp() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadRecordings();
  }, []);

  async function loadRecordings() {
    try {
      const session = await storage.getUserSession();
      if (!session) {
        window.location.href = '/onboarding.html';
        return;
      }

      // TODO: Implement actual API call
      // const response = await apiClient.getRecordings();
      
      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockRecordings: Recording[] = [
        {
          id: '1',
          meeting_id: 'abc-defg-hij',
          platform: 'google_meet',
          status: 'completed',
          started_at: new Date(Date.now() - 86400000).toISOString(),
          finished_at: new Date(Date.now() - 82800000).toISOString(),
          duration: 3600,
          file_size: 524288000
        },
        {
          id: '2',
          meeting_id: 'xyz-uvwx-klm',
          platform: 'google_meet',
          status: 'recording',
          started_at: new Date(Date.now() - 1800000).toISOString(),
        },
      ];
      
      setRecordings(mockRecordings);
    } catch (err) {
      console.error('Error loading recordings:', err);
      showToast('error', 'Erro ao carregar gravações');
      setError('Erro ao carregar gravações');
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = useCallback(async (recordingId: string) => {
    try {
      const session = await storage.getUserSession();
      if (!session) return;
      
      const result = await downloadRecording(session.api_key, recordingId);
      if (!result.success) {
        showToast('error', result.error || 'Erro ao baixar gravação');
        setError(result.error || 'Erro ao baixar gravação');
      } else {
        showToast('success', 'Download iniciado!');
      }
    } catch (err) {
      console.error('Error downloading:', err);
      showToast('error', 'Erro ao baixar gravação');
      setError('Erro ao baixar gravação');
    }
  }, []);

  const handleDelete = useCallback(async (recordingId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta gravação?')) return;
    
    try {
      // TODO: Implement delete API call
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      showToast('success', 'Gravação excluída com sucesso!');
    } catch (err) {
      console.error('Error deleting:', err);
      showToast('error', 'Erro ao excluir gravação');
      setError('Erro ao excluir gravação');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-1 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-1">
      {/* Header */}
      <div className="border-b border-gray-10 bg-gray-2">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <OutlineButton
                onClick={() => window.close()}
                className="w-10 h-10 p-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </OutlineButton>
              <div>
                <h1 className="text-[28px] font-title text-white">Minhas Gravações</h1>
                <p className="text-[14px] text-gray-60 mt-1">
                  {recordings.length} {recordings.length === 1 ? 'gravação' : 'gravações'}
                </p>
              </div>
            </div>
            <img
              src="/logo-newar-branco.svg"
              alt="Newar"
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-xl text-brand-danger text-[14px]">
            {error}
          </div>
        )}

        {recordings.length === 0 ? (
          <HulyCard>
            <HulyCardContent className="py-16 text-center">
              <Video className="w-16 h-16 mx-auto mb-4 text-gray-50" />
              <h3 className="text-[18px] font-title text-white mb-2">Nenhuma gravação ainda</h3>
              <p className="text-[14px] text-gray-60 mb-6">
                Entre em uma reunião do Google Meet e inicie sua primeira gravação
              </p>
              <GlowingButton
                onClick={() => window.close()}
              >
                Voltar
              </GlowingButton>
            </HulyCardContent>
          </HulyCard>
        ) : (
          <div className="grid gap-4">
            {recordings.map((recording) => (
              <HulyCard key={recording.id}>
                <HulyCardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        recording.status === 'recording'
                          ? 'bg-brand-danger/20'
                          : 'bg-brand-blue/20'
                      }`}>
                        <Video className={`w-6 h-6 ${
                          recording.status === 'recording'
                            ? 'text-brand-danger'
                            : 'text-brand-blue'
                        }`} />
                      </div>
                      <div>
                        <HulyCardTitle className="text-[18px] mb-1">
                          Meeting {recording.meeting_id}
                        </HulyCardTitle>
                        <div className="flex items-center gap-4 text-[13px] text-gray-60">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(recording.started_at)}
                          </span>
                          {recording.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDuration(recording.duration)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase ${
                      recording.status === 'recording'
                        ? 'bg-brand-danger/20 text-brand-danger'
                        : recording.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-20 text-gray-60'
                    }`}>
                      {recording.status === 'recording' ? 'Gravando' :
                       recording.status === 'completed' ? 'Concluída' :
                       'Processando'}
                    </div>
                  </div>
                </HulyCardHeader>
                <HulyCardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] text-gray-60">
                      {recording.file_size && (
                        <span>Tamanho: {formatFileSize(recording.file_size)}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {recording.status === 'completed' && (
                        <GlowingButton
                          onClick={() => handleDownload(recording.id)}
                          className="h-9 px-4"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar
                        </GlowingButton>
                      )}
                      <OutlineButton
                        onClick={() => handleDelete(recording.id)}
                        className="h-9 w-9 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </OutlineButton>
                    </div>
                  </div>
                </HulyCardContent>
              </HulyCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

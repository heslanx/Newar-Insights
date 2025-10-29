'use client';

import { useEffect, useState } from 'react';
import { botManagerAPI, adminRecordingsAPI } from '@/lib/api';
import type { Meeting } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bot,
  Activity,
  Clock,
  Square,
  Terminal,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { formatDuration, formatDate } from '@/lib/utils';

interface ActiveBot {
  container_id: string;
  meeting_id: string;
  platform: string;
  status: string;
  started_at: string;
  user_id: number;
  chunks_recorded?: number;
}

export default function BotsPage() {
  const [activeBots, setActiveBots] = useState<ActiveBot[]>([]);
  const [recordings, setRecordings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<ActiveBot | null>(null);
  const [botLogs, setBotLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [botsData, recordingsData] = await Promise.all([
        botManagerAPI.getActiveBots().catch(() => ({ bots: [] })),
        adminRecordingsAPI.getAllRecordings().catch(() => ({ data: [] })),
      ]);

      // Map active recordings to bots
      const recordingsArray = (recordingsData as any).data || [];
      const activeRecordings = recordingsArray.filter((r: Meeting) =>
        ['joining', 'active', 'recording'].includes(r.status)
      );

      const bots: ActiveBot[] = activeRecordings.map((rec: Meeting) => ({
        container_id: rec.bot_container_id || 'unknown',
        meeting_id: rec.meeting_id,
        platform: rec.platform,
        status: rec.status,
        started_at: rec.started_at || rec.created_at,
        user_id: rec.user_id,
        chunks_recorded: 0, // TODO: Get from Redis or bot manager
      }));

      setActiveBots(bots);
      setRecordings(recordingsArray);
      setLoading(false);
    } catch (error) {
      console.error('Error loading bots:', error);
      setLoading(false);
    }
  }

  async function handleStopBot(containerId: string) {
    if (!confirm('Tem certeza que deseja parar este bot?')) return;

    try {
      await botManagerAPI.stopBot(containerId);
      loadData();
      alert('Bot parado com sucesso!');
    } catch (error: any) {
      alert('Erro ao parar bot: ' + error.message);
    }
  }

  async function handleViewLogs(bot: ActiveBot) {
    setSelectedBot(bot);
    setShowLogs(true);

    try {
      const logs = await botManagerAPI.getBotLogs(bot.container_id);
      setBotLogs((logs as any).logs || ['Logs não disponíveis']);
    } catch (error) {
      setBotLogs(['Erro ao carregar logs']);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: any; label: string; color: string }> = {
      joining: { variant: 'secondary', label: 'Entrando', color: 'text-yellow-600' },
      active: { variant: 'default', label: 'Ativo', color: 'text-green-600' },
      recording: { variant: 'default', label: 'Gravando', color: 'text-blue-600' },
    };

    const config = variants[status] || { variant: 'secondary', label: status, color: 'text-gray-600' };
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  }

  function calculateUptime(startedAt: string): number {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    return Math.floor((now - start) / 1000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Bots Ativos</h1>
        <p className="text-muted-foreground mt-2">
          Monitore bots em execução em tempo real
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bots Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div className="text-2xl font-bold">{activeBots.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Entrando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {activeBots.filter(b => b.status === 'joining').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Gravando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {activeBots.filter(b => b.status === 'recording').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recordings.filter(r => {
                const today = new Date().toISOString().split('T')[0];
                return r.created_at.startsWith(today);
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Bots Grid */}
      {activeBots.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum bot ativo</p>
              <p className="text-sm mt-1">Bots aparecerão aqui quando iniciarem gravações</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activeBots.map((bot) => {
            const uptime = calculateUptime(bot.started_at);
            const recording = recordings.find(r => r.bot_container_id === bot.container_id);

            return (
              <Card key={bot.container_id} className="relative overflow-hidden">
                {/* Status indicator */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  bot.status === 'recording' ? 'bg-blue-500 animate-pulse' :
                  bot.status === 'active' ? 'bg-green-500' :
                  'bg-yellow-500'
                }`} />

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-base font-mono">
                          {bot.meeting_id}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {bot.platform === 'google_meet' ? 'Google Meet' : 'Microsoft Teams'}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(bot.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Tempo Ativo</span>
                      </div>
                      <p className="text-lg font-semibold">{formatDuration(uptime)}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Radio className="h-3 w-3" />
                        <span>Chunks</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {Math.floor(uptime / 10)}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Container ID:</span>
                      <span className="font-mono text-xs">
                        {bot.container_id.substring(0, 12)}...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User ID:</span>
                      <span className="font-medium">#{bot.user_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Iniciado:</span>
                      <span>{formatDate(bot.started_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewLogs(bot)}
                    >
                      <Terminal className="mr-2 h-4 w-4" />
                      Ver Logs
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleStopBot(bot.container_id)}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Parar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent Stopped Bots */}
      <Card>
        <CardHeader>
          <CardTitle>Bots Recentes (Completos/Parados)</CardTitle>
          <CardDescription>Últimas 10 gravações finalizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recordings
              .filter(r => ['completed', 'failed'].includes(r.status))
              .slice(0, 10)
              .map((rec) => {
                const duration = rec.started_at && rec.completed_at
                  ? Math.floor(
                      (new Date(rec.completed_at).getTime() - new Date(rec.started_at).getTime()) / 1000
                    )
                  : 0;

                return (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          rec.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-sm">{rec.meeting_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {rec.platform === 'google_meet' ? 'Google Meet' : 'Teams'} •{' '}
                          {duration > 0 ? formatDuration(duration) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={rec.status === 'completed' ? 'default' : 'destructive'}
                      >
                        {rec.status === 'completed' ? 'Completo' : 'Falhou'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(rec.completed_at || rec.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Logs do Bot - {selectedBot?.meeting_id}
            </DialogTitle>
            <DialogDescription>
              Container: {selectedBot?.container_id}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] rounded-md border p-4">
            <div className="font-mono text-xs space-y-1">
              {botLogs.map((log, index) => (
                <div key={index} className="text-muted-foreground hover:bg-muted p-1">
                  {log}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogs(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

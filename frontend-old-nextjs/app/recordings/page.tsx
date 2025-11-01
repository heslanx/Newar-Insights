'use client';

import { useEffect, useState } from 'react';
import { adminRecordingsAPI, adminAPI } from '@/lib/api';
import type { Meeting, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Play,
  Download,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  Filter,
  Search,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecording, setSelectedRecording] = useState<Meeting | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showNewRecording, setShowNewRecording] = useState(false);
  const [newRecording, setNewRecording] = useState({
    user_id: '',
    platform: 'google_meet',
    meeting_id: '',
    bot_name: 'Newar Recorder',
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [recordingsData, usersData] = await Promise.all([
        adminRecordingsAPI.getAllRecordings().catch(() => ({ data: [] })),
        adminAPI.getUsers(),
      ]);

      setRecordings((recordingsData as any).data || []);
      setUsers(usersData.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }

  async function handleDeleteRecording(id: number) {
    if (!confirm('Tem certeza que deseja deletar esta gravação?')) return;

    try {
      await adminRecordingsAPI.deleteRecording(id);
      loadData();
      alert('Gravação deletada com sucesso!');
    } catch (error: any) {
      alert('Erro ao deletar gravação: ' + error.message);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: any; label: string }> = {
      completed: { variant: 'default', label: 'Completa' },
      active: { variant: 'default', label: 'Ativa' },
      recording: { variant: 'default', label: 'Gravando' },
      joining: { variant: 'secondary', label: 'Entrando' },
      requested: { variant: 'secondary', label: 'Solicitada' },
      failed: { variant: 'destructive', label: 'Falhou' },
      finalizing: { variant: 'secondary', label: 'Finalizando' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  const filteredRecordings = recordings.filter(rec => {
    const matchesStatus = filterStatus === 'all' || rec.status === filterStatus;
    const matchesPlatform = filterPlatform === 'all' || rec.platform === filterPlatform;
    const matchesSearch =
      rec.meeting_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.meeting_url.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPlatform && matchesSearch;
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Gravações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todas as gravações do sistema
          </p>
        </div>
        <Dialog open={showNewRecording} onOpenChange={setShowNewRecording}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Gravação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Nova Gravação</DialogTitle>
              <DialogDescription>
                Crie uma nova solicitação de gravação para um usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user">Usuário</Label>
                <Select
                  value={newRecording.user_id}
                  onValueChange={(value) => setNewRecording({ ...newRecording, user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Plataforma</Label>
                <Select
                  value={newRecording.platform}
                  onValueChange={(value) => setNewRecording({ ...newRecording, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_meet">Google Meet</SelectItem>
                    <SelectItem value="teams">Microsoft Teams</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting_id">ID da Reunião</Label>
                <Input
                  id="meeting_id"
                  placeholder="abc-defg-hij"
                  value={newRecording.meeting_id}
                  onChange={(e) => setNewRecording({ ...newRecording, meeting_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bot_name">Nome do Bot</Label>
                <Input
                  id="bot_name"
                  placeholder="Newar Recorder"
                  value={newRecording.bot_name}
                  onChange={(e) => setNewRecording({ ...newRecording, bot_name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewRecording(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                // TODO: Implement create recording
                alert('Funcionalidade em desenvolvimento');
                setShowNewRecording(false);
              }}>
                Criar Gravação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {recordings.filter(r => ['active', 'recording'].includes(r.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {recordings.filter(r => r.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Falhadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {recordings.filter(r => r.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ID da reunião ou URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="requested">Solicitadas</SelectItem>
                  <SelectItem value="joining">Entrando</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="recording">Gravando</SelectItem>
                  <SelectItem value="finalizing">Finalizando</SelectItem>
                  <SelectItem value="completed">Completas</SelectItem>
                  <SelectItem value="failed">Falhadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Label>Plataforma</Label>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="google_meet">Google Meet</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recordings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gravações ({filteredRecordings.length})</CardTitle>
          <CardDescription>
            Atualização automática a cada 5 segundos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Meeting ID</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecordings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma gravação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecordings.map((recording) => (
                  <TableRow key={recording.id}>
                    <TableCell className="font-medium">#{recording.id}</TableCell>
                    <TableCell className="font-mono text-sm">{recording.meeting_id}</TableCell>
                    <TableCell>
                      {recording.platform === 'google_meet' ? 'Google Meet' : 'Teams'}
                    </TableCell>
                    <TableCell>
                      {users.find(u => u.id === recording.user_id)?.name || `User #${recording.user_id}`}
                    </TableCell>
                    <TableCell>{getStatusBadge(recording.status)}</TableCell>
                    <TableCell className="text-sm">{formatDate(recording.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRecording(recording);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {recording.recording_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={recording.recording_url} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRecording(recording.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Gravação</DialogTitle>
          </DialogHeader>
          {selectedRecording && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ID</Label>
                  <p className="font-medium">#{selectedRecording.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRecording.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plataforma</Label>
                  <p className="font-medium">
                    {selectedRecording.platform === 'google_meet' ? 'Google Meet' : 'Microsoft Teams'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Meeting ID</Label>
                  <p className="font-mono text-sm">{selectedRecording.meeting_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Container ID</Label>
                  <p className="font-mono text-xs">{selectedRecording.bot_container_id || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Criada em</Label>
                  <p className="text-sm">{formatDate(selectedRecording.created_at)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">URL da Reunião</Label>
                <p className="text-sm break-all">{selectedRecording.meeting_url}</p>
              </div>
              {selectedRecording.recording_path && (
                <div>
                  <Label className="text-muted-foreground">Caminho da Gravação</Label>
                  <p className="font-mono text-xs">{selectedRecording.recording_path}</p>
                </div>
              )}
              {selectedRecording.error_message && (
                <div>
                  <Label className="text-muted-foreground text-red-600">Erro</Label>
                  <p className="text-sm text-red-600">{selectedRecording.error_message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

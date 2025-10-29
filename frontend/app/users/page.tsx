'use client';

import { useEffect, useState } from 'react';
import { adminAPI, adminRecordingsAPI } from '@/lib/api';
import type { User, Meeting } from '@/lib/types';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  UserPlus,
  Key,
  Trash2,
  Edit,
  Eye,
  Copy,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [recordings, setRecordings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [showRecordingsDialog, setShowRecordingsDialog] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    max_concurrent_bots: 5,
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [usersData, recordingsData] = await Promise.all([
        adminAPI.getUsers(),
        adminRecordingsAPI.getAllRecordings().catch(() => ({ data: [] })),
      ]);

      setUsers(usersData.data || []);
      setRecordings((recordingsData as any).data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }

  async function handleCreateUser() {
    try {
      await adminAPI.createUser(newUser);
      setNewUser({ email: '', name: '', max_concurrent_bots: 5 });
      setShowCreateDialog(false);
      loadData();
      alert('Usuário criado com sucesso!');
    } catch (error: any) {
      alert('Erro ao criar usuário: ' + error.message);
    }
  }

  async function handleDeleteUser(id: number) {
    if (!confirm('Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.')) return;

    try {
      await adminAPI.deleteUser(id);
      loadData();
      alert('Usuário deletado com sucesso!');
    } catch (error: any) {
      alert('Erro ao deletar usuário: ' + error.message);
    }
  }

  async function handleGenerateToken(user: User) {
    try {
      const result = await adminAPI.generateToken(user.id);
      setGeneratedToken((result as any).token);
      setSelectedUser(user);
      setShowTokenDialog(true);
    } catch (error: any) {
      alert('Erro ao gerar token: ' + error.message);
    }
  }

  function handleCopyToken() {
    navigator.clipboard.writeText(generatedToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  }

  function getUserRecordings(userId: number) {
    return recordings.filter(r => r.user_id === userId);
  }

  function getUserStats(userId: number) {
    const userRecordings = getUserRecordings(userId);
    return {
      total: userRecordings.length,
      active: userRecordings.filter(r => ['joining', 'active', 'recording'].includes(r.status)).length,
      completed: userRecordings.filter(r => r.status === 'completed').length,
      failed: userRecordings.filter(r => r.status === 'failed').length,
    };
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie usuários e seus acessos ao sistema
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Adicione um novo usuário ao sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="João Silva"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@empresa.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_bots">Máximo de Bots Simultâneos</Label>
                <Input
                  id="max_bots"
                  type="number"
                  min={1}
                  max={50}
                  value={newUser.max_concurrent_bots}
                  onChange={(e) => setNewUser({ ...newUser, max_concurrent_bots: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser}>Criar Usuário</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => getUserStats(u.id).active > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Gravações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {recordings.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Média por Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.length > 0 ? (recordings.length / users.length).toFixed(1) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>
            Lista completa de usuários do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Max Bots</TableHead>
                <TableHead>Gravações</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const stats = getUserStats(user.id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">#{user.id}</TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.max_concurrent_bots}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stats.total}</span>
                          {stats.active > 0 && (
                            <Badge variant="default" className="text-xs">
                              {stats.active} ativo(s)
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {stats.active > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm text-green-600 font-medium">Online</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Inativo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRecordingsDialog(true);
                            }}
                            title="Ver gravações"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateToken(user)}
                            title="Gerar token"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Deletar usuário"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Token Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token Gerado</DialogTitle>
            <DialogDescription>
              Token de API para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-900 mb-2">
                Atenção: Copie este token agora!
              </p>
              <p className="text-xs text-yellow-700">
                Este token só será exibido uma vez. Guarde-o em um local seguro.
              </p>
            </div>
            <div className="space-y-2">
              <Label>API Token</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedToken}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyToken}
                >
                  {copiedToken ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowTokenDialog(false);
              setGeneratedToken('');
              setCopiedToken(false);
            }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Recordings Dialog */}
      <Dialog open={showRecordingsDialog} onOpenChange={setShowRecordingsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gravações de {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Histórico completo de gravações deste usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{getUserStats(selectedUser.id).total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {getUserStats(selectedUser.id).active}
                    </p>
                    <p className="text-xs text-muted-foreground">Ativas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {getUserStats(selectedUser.id).completed}
                    </p>
                    <p className="text-xs text-muted-foreground">Completas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {getUserStats(selectedUser.id).failed}
                    </p>
                    <p className="text-xs text-muted-foreground">Falhadas</p>
                  </div>
                </div>

                {/* Recordings List */}
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Meeting ID</TableHead>
                        <TableHead>Plataforma</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getUserRecordings(selectedUser.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Nenhuma gravação encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        getUserRecordings(selectedUser.id).map((rec) => (
                          <TableRow key={rec.id}>
                            <TableCell className="font-mono text-sm">{rec.meeting_id}</TableCell>
                            <TableCell>
                              {rec.platform === 'google_meet' ? 'Google Meet' : 'Teams'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  rec.status === 'completed' ? 'default' :
                                  rec.status === 'failed' ? 'destructive' :
                                  rec.status === 'active' || rec.status === 'recording' ? 'default' :
                                  'secondary'
                                }
                              >
                                {rec.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(rec.created_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordingsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

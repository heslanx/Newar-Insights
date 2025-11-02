'use client';

import { useEffect, useState } from 'react';
import { adminAPI, adminRecordingsAPI, systemHealthAPI } from '@/lib/api';
import type { User, Meeting } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Server,
  PlayCircle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { formatDate } from '@/lib/utils';

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [usersData, recordingsData] = await Promise.all([
        adminAPI.getUsers(),
        adminRecordingsAPI.getAllRecordings().catch(() => ({ data: [] })),
      ]);

      setUsers(usersData.data || []);
      const recordingsArray = (recordingsData as any).data || [];
      setMeetings(recordingsArray);

      // Generate activity data for the last 7 days
      generateActivityData(recordingsArray);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }

  function generateActivityData(meetings: Meeting[]) {
    const today = new Date();
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayMeetings = meetings.filter(m =>
        m.created_at.startsWith(dateStr)
      );

      data.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        total: dayMeetings.length,
        completed: dayMeetings.filter(m => m.status === 'completed').length,
        failed: dayMeetings.filter(m => m.status === 'failed').length,
      });
    }

    setActivityData(data);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  const activeRecordings = meetings.filter(m => ['joining', 'active', 'recording'].includes(m.status)).length;
  const completedToday = meetings.filter(m => {
    const today = new Date().toISOString().split('T')[0];
    return m.status === 'completed' && m.completed_at?.startsWith(today);
  }).length;
  const failedRecordings = meetings.filter(m => m.status === 'failed').length;

  const statusData = [
    { name: 'Ativas', value: activeRecordings, color: '#10b981' },
    { name: 'Completas', value: meetings.filter(m => m.status === 'completed').length, color: '#3b82f6' },
    { name: 'Falhadas', value: failedRecordings, color: '#ef4444' },
    { name: 'Aguardando', value: meetings.filter(m => m.status === 'requested').length, color: '#f59e0b' },
  ];

  const recentActivity = meetings.slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral do sistema de gravação de reuniões
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Usuários cadastrados no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gravações Ativas</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeRecordings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Bots gravando agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completas Hoje</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{completedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Gravações finalizadas hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xl font-semibold">Online</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os serviços operacionais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
            <CardDescription>Gravações por status atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade dos Últimos 7 Dias</CardTitle>
            <CardDescription>Gravações criadas por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
                <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completas" strokeWidth={2} />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Falhadas" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Activity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Últimas gravações solicitadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma atividade recente
                </div>
              ) : (
                recentActivity.map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        meeting.status === 'completed' ? 'bg-green-500' :
                        meeting.status === 'failed' ? 'bg-red-500' :
                        meeting.status === 'active' || meeting.status === 'recording' ? 'bg-blue-500 animate-pulse' :
                        'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{meeting.meeting_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {meeting.platform === 'google_meet' ? 'Google Meet' : 'Teams'} • {formatDate(meeting.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      meeting.status === 'completed' ? 'default' :
                      meeting.status === 'failed' ? 'destructive' :
                      meeting.status === 'active' || meeting.status === 'recording' ? 'default' :
                      'secondary'
                    }>
                      {meeting.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às principais funções</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href="/recordings">
                <PlayCircle className="mr-2 h-4 w-4" />
                Ver Gravações
              </a>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href="/bots">
                <Activity className="mr-2 h-4 w-4" />
                Bots Ativos
              </a>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href="/users">
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Usuários
              </a>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href="/health">
                <Server className="mr-2 h-4 w-4" />
                Saúde do Sistema
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas do Sistema</CardTitle>
          <CardDescription>Métricas gerais de uso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Gravações</p>
              <p className="text-2xl font-bold">{meetings.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-green-600">
                {meetings.length > 0 ? Math.round((meetings.filter(m => m.status === 'completed').length / meetings.length) * 100) : 0}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Gravações Falhadas</p>
              <p className="text-2xl font-bold text-red-600">{failedRecordings}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Média por Usuário</p>
              <p className="text-2xl font-bold">
                {users.length > 0 ? (meetings.length / users.length).toFixed(1) : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

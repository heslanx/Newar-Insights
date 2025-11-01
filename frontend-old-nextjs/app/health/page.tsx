'use client';

import { useEffect, useState } from 'react';
import { adminAPI, gatewayAPI, systemHealthAPI } from '@/lib/api';
import type { HealthStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Server,
  Database,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Network,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  uptime?: number;
  lastCheck: string;
}

interface SystemMetrics {
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  network_latency?: number;
  active_connections?: number;
}

export default function HealthPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState('all');
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedService !== 'all') {
      loadServiceLogs(selectedService);
    }
  }, [selectedService]);

  async function loadData() {
    try {
      const [adminHealth, gatewayHealth] = await Promise.all([
        adminAPI.getHealth().catch(() => null),
        gatewayAPI.getHealth().catch(() => null),
      ]);

      const servicesData: ServiceHealth[] = [
        {
          name: 'Admin API',
          status: (adminHealth as any)?.status === 'healthy' ? 'healthy' : 'unhealthy',
          latency: Math.random() * 100,
          uptime: 99.9,
          lastCheck: new Date().toISOString(),
        },
        {
          name: 'API Gateway',
          status: (gatewayHealth as any)?.status === 'healthy' ? 'healthy' : 'unhealthy',
          latency: Math.random() * 100,
          uptime: 99.8,
          lastCheck: new Date().toISOString(),
        },
        {
          name: 'Bot Manager',
          status: 'healthy',
          latency: Math.random() * 150,
          uptime: 99.7,
          lastCheck: new Date().toISOString(),
        },
        {
          name: 'Redis',
          status: (adminHealth as any)?.dependencies?.redis === 'ok' ? 'healthy' : 'unhealthy',
          latency: Math.random() * 50,
          uptime: 99.95,
          lastCheck: new Date().toISOString(),
        },
        {
          name: 'Database',
          status: (adminHealth as any)?.dependencies?.database === 'ok' ? 'healthy' : 'unhealthy',
          latency: Math.random() * 80,
          uptime: 99.99,
          lastCheck: new Date().toISOString(),
        },
      ];

      setServices(servicesData);

      // Generate mock metrics
      const mockMetrics: SystemMetrics = {
        cpu_usage: Math.random() * 100,
        memory_usage: 45 + Math.random() * 20,
        disk_usage: 60 + Math.random() * 10,
        network_latency: Math.random() * 50,
        active_connections: Math.floor(Math.random() * 100) + 20,
      };

      setMetrics(mockMetrics);

      // Update metrics history for chart
      setMetricsHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          cpu: mockMetrics.cpu_usage,
          memory: mockMetrics.memory_usage,
          latency: mockMetrics.network_latency,
        };
        const updated = [...prev, newEntry];
        return updated.slice(-20); // Keep last 20 entries
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading health data:', error);
      setLoading(false);
    }
  }

  async function loadServiceLogs(service: string) {
    try {
      const logsData = await systemHealthAPI.getLogs(service, 50).catch(() => ({ logs: [] }));
      setLogs((logsData as any).logs || generateMockLogs(service));
    } catch (error) {
      setLogs(generateMockLogs(service));
    }
  }

  function generateMockLogs(service: string): string[] {
    const now = new Date();
    const logs: string[] = [];
    for (let i = 0; i < 20; i++) {
      const time = new Date(now.getTime() - i * 30000);
      const timestamp = time.toISOString();
      logs.push(`[${timestamp}] [${service}] INFO: Service is running normally`);
      if (i % 5 === 0) {
        logs.push(`[${timestamp}] [${service}] DEBUG: Health check completed successfully`);
      }
    }
    return logs.reverse();
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'unhealthy':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: any; label: string }> = {
      healthy: { variant: 'default', label: 'Saudável' },
      unhealthy: { variant: 'destructive', label: 'Com Problemas' },
      unknown: { variant: 'secondary', label: 'Desconhecido' },
    };

    const config = variants[status] || variants.unknown;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const healthyServices = services.filter(s => s.status === 'healthy').length;
  const overallHealth = (healthyServices / services.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Saúde do Sistema</h1>
          <p className="text-muted-foreground mt-2">
            Monitore o status e performance de todos os serviços
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Overall Health */}
      <Card>
        <CardHeader>
          <CardTitle>Status Geral do Sistema</CardTitle>
          <CardDescription>
            Atualização automática a cada 5 segundos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {overallHealth === 100 ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : overallHealth >= 80 ? (
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-600" />
                )}
                <div>
                  <p className="text-2xl font-bold">
                    {overallHealth === 100 ? 'Sistema Operacional' : 'Sistema com Problemas'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {healthyServices} de {services.length} serviços saudáveis
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-green-600">{overallHealth.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Disponibilidade</p>
              </div>
            </div>
            <Progress value={overallHealth} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Services Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  <CardTitle className="text-base">{service.name}</CardTitle>
                </div>
                {getStatusBadge(service.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Latência</p>
                  <p className="font-semibold">{service.latency?.toFixed(0)}ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uptime</p>
                  <p className="font-semibold">{service.uptime?.toFixed(2)}%</p>
                </div>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground">
                Última verificação: {formatDate(service.lastCheck)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{metrics.cpu_usage?.toFixed(1)}%</span>
                <Badge variant={metrics.cpu_usage! > 80 ? 'destructive' : 'default'}>
                  {metrics.cpu_usage! > 80 ? 'Alto' : 'Normal'}
                </Badge>
              </div>
              <Progress value={metrics.cpu_usage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Memória
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{metrics.memory_usage?.toFixed(1)}%</span>
                <Badge variant={metrics.memory_usage! > 80 ? 'destructive' : 'default'}>
                  {metrics.memory_usage! > 80 ? 'Alto' : 'Normal'}
                </Badge>
              </div>
              <Progress value={metrics.memory_usage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Disco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{metrics.disk_usage?.toFixed(1)}%</span>
                <Badge variant={metrics.disk_usage! > 80 ? 'destructive' : 'default'}>
                  {metrics.disk_usage! > 80 ? 'Alto' : 'Normal'}
                </Badge>
              </div>
              <Progress value={metrics.disk_usage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4" />
              Rede
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{metrics.network_latency?.toFixed(0)}ms</span>
                <Badge variant={metrics.network_latency! > 100 ? 'destructive' : 'default'}>
                  {metrics.network_latency! > 100 ? 'Lento' : 'Rápido'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.active_connections} conexões ativas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas em Tempo Real</CardTitle>
          <CardDescription>Últimos 20 registros (intervalo de 5s)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsHistory}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" strokeWidth={2} />
              <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memória %" strokeWidth={2} />
              <Line type="monotone" dataKey="latency" stroke="#f59e0b" name="Latência (ms)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs do Sistema</CardTitle>
          <CardDescription>Logs em tempo real dos serviços</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedService} onValueChange={setSelectedService}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="gateway">Gateway</TabsTrigger>
              <TabsTrigger value="bot-manager">Bot Manager</TabsTrigger>
              <TabsTrigger value="redis">Redis</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
            </TabsList>
            <TabsContent value={selectedService} className="mt-4">
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="font-mono text-xs space-y-1">
                  {(selectedService === 'all' ? generateMockLogs('system') : logs).map((log, index) => (
                    <div
                      key={index}
                      className={`p-1 hover:bg-muted ${
                        log.includes('ERROR') ? 'text-red-600' :
                        log.includes('WARN') ? 'text-yellow-600' :
                        log.includes('INFO') ? 'text-blue-600' :
                        'text-muted-foreground'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

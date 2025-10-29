'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Save,
  Key,
  Shield,
  Database,
  Zap,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
} from 'lucide-react';

export default function SettingsPage() {
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [settings, setSettings] = useState({
    // General
    systemName: 'Newar Insights',
    maxConcurrentBots: 10,
    defaultBotName: 'Newar Recorder',
    autoCleanupRecordings: true,
    recordingRetentionDays: 30,

    // API Configuration
    adminApiUrl: process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:8081',
    gatewayApiUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080',
    adminApiKey: process.env.NEXT_PUBLIC_ADMIN_API_KEY || '',

    // Database Configuration
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_KEY || '',

    // Redis Configuration
    redisUrl: 'redis://localhost:6379',

    // Bot Configuration
    botRecordingQuality: '128',
    chunkUploadInterval: 10,
    maxBotWaitTime: 300,

    // Notifications
    enableEmailNotifications: false,
    enableWebhookNotifications: false,
    webhookUrl: '',

    // Security
    enableRateLimiting: true,
    maxRequestsPerMinute: 10,
    enableCors: true,
    allowedOrigins: 'http://localhost:3000',
  });

  function handleCopy(field: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  }

  function handleSave() {
    // TODO: Implement save settings
    alert('Configurações salvas com sucesso!');
  }

  function handleReset() {
    if (confirm('Tem certeza que deseja resetar todas as configurações?')) {
      // TODO: Implement reset
      alert('Configurações resetadas!');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as configurações do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Resetar
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="api">APIs</TabsTrigger>
          <TabsTrigger value="bots">Bots</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configurações básicas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemName">Nome do Sistema</Label>
                <Input
                  id="systemName"
                  value={settings.systemName}
                  onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxConcurrentBots">Máximo de Bots Simultâneos (Global)</Label>
                <Input
                  id="maxConcurrentBots"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.maxConcurrentBots}
                  onChange={(e) => setSettings({ ...settings, maxConcurrentBots: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Limite global de bots que podem estar ativos simultaneamente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultBotName">Nome Padrão do Bot</Label>
                <Input
                  id="defaultBotName"
                  value={settings.defaultBotName}
                  onChange={(e) => setSettings({ ...settings, defaultBotName: e.target.value })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Limpeza Automática de Gravações</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove gravações antigas automaticamente
                  </p>
                </div>
                <Switch
                  checked={settings.autoCleanupRecordings}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoCleanupRecordings: checked })}
                />
              </div>

              {settings.autoCleanupRecordings && (
                <div className="space-y-2">
                  <Label htmlFor="retentionDays">Dias de Retenção</Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    min={1}
                    max={365}
                    value={settings.recordingRetentionDays}
                    onChange={(e) => setSettings({ ...settings, recordingRetentionDays: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gravações mais antigas que {settings.recordingRetentionDays} dias serão deletadas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Configuração de APIs
              </CardTitle>
              <CardDescription>
                URLs e chaves de acesso dos serviços
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminApiUrl">Admin API URL</Label>
                <Input
                  id="adminApiUrl"
                  value={settings.adminApiUrl}
                  onChange={(e) => setSettings({ ...settings, adminApiUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gatewayApiUrl">API Gateway URL</Label>
                <Input
                  id="gatewayApiUrl"
                  value={settings.gatewayApiUrl}
                  onChange={(e) => setSettings({ ...settings, gatewayApiUrl: e.target.value })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="adminApiKey">Admin API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="adminApiKey"
                    type={showAdminKey ? 'text' : 'password'}
                    value={settings.adminApiKey}
                    onChange={(e) => setSettings({ ...settings, adminApiKey: e.target.value })}
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAdminKey(!showAdminKey)}
                  >
                    {showAdminKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy('adminApiKey', settings.adminApiKey)}
                  >
                    {copiedField === 'adminApiKey' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Chave de acesso administrativo (nunca compartilhe!)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Supabase Configuration
              </CardTitle>
              <CardDescription>
                Credenciais do banco de dados e storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabaseUrl">Supabase URL</Label>
                <Input
                  id="supabaseUrl"
                  value={settings.supabaseUrl}
                  onChange={(e) => setSettings({ ...settings, supabaseUrl: e.target.value })}
                  placeholder="https://xxxxx.supabase.co"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supabaseKey">Supabase Anon Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="supabaseKey"
                    type={showSupabaseKey ? 'text' : 'password'}
                    value={settings.supabaseKey}
                    onChange={(e) => setSettings({ ...settings, supabaseKey: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                  >
                    {showSupabaseKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy('supabaseKey', settings.supabaseKey)}
                  >
                    {copiedField === 'supabaseKey' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="redisUrl">Redis URL</Label>
                <Input
                  id="redisUrl"
                  value={settings.redisUrl}
                  onChange={(e) => setSettings({ ...settings, redisUrl: e.target.value })}
                  placeholder="redis://localhost:6379"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bot Settings */}
        <TabsContent value="bots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Configuração de Bots
              </CardTitle>
              <CardDescription>
                Parâmetros de gravação e comportamento dos bots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recordingQuality">Qualidade de Gravação (kbps)</Label>
                <Select
                  value={settings.botRecordingQuality}
                  onValueChange={(value) => setSettings({ ...settings, botRecordingQuality: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="64">64 kbps (Baixa)</SelectItem>
                    <SelectItem value="128">128 kbps (Média)</SelectItem>
                    <SelectItem value="192">192 kbps (Alta)</SelectItem>
                    <SelectItem value="256">256 kbps (Muito Alta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chunkInterval">Intervalo de Upload de Chunks (segundos)</Label>
                <Input
                  id="chunkInterval"
                  type="number"
                  min={5}
                  max={60}
                  value={settings.chunkUploadInterval}
                  onChange={(e) => setSettings({ ...settings, chunkUploadInterval: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Frequência com que chunks de áudio são enviados ao storage
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxWaitTime">Tempo Máximo de Espera (segundos)</Label>
                <Input
                  id="maxWaitTime"
                  type="number"
                  min={60}
                  max={3600}
                  value={settings.maxBotWaitTime}
                  onChange={(e) => setSettings({ ...settings, maxBotWaitTime: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Tempo máximo que o bot espera por admissão na reunião
                </p>
              </div>

              <Separator />

              <div className="bg-muted rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">Configurações Atuais:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Qualidade: {settings.botRecordingQuality} kbps</li>
                  <li>• Chunks a cada {settings.chunkUploadInterval} segundos</li>
                  <li>• Timeout de {settings.maxBotWaitTime} segundos</li>
                  <li>• Formato: WebM com codec Opus</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>
                Configure alertas e notificações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Enviar emails sobre eventos importantes
                  </p>
                </div>
                <Switch
                  checked={settings.enableEmailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableEmailNotifications: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Webhooks</Label>
                  <p className="text-xs text-muted-foreground">
                    Enviar eventos via webhook HTTP
                  </p>
                </div>
                <Switch
                  checked={settings.enableWebhookNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableWebhookNotifications: checked })}
                />
              </div>

              {settings.enableWebhookNotifications && (
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    type="url"
                    value={settings.webhookUrl}
                    onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                    placeholder="https://api.example.com/webhook"
                  />
                  <p className="text-xs text-muted-foreground">
                    Eventos serão enviados via POST para esta URL
                  </p>
                </div>
              )}

              <Separator />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-blue-900 mb-2">Eventos Notificados:</h4>
                <ul className="text-sm space-y-1 text-blue-700">
                  <li>✓ Gravação iniciada</li>
                  <li>✓ Gravação completa</li>
                  <li>✓ Gravação falhou</li>
                  <li>✓ Bot admitido na reunião</li>
                  <li>✓ Erros críticos do sistema</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança
              </CardTitle>
              <CardDescription>
                Configurações de segurança e proteção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Rate Limiting</Label>
                  <p className="text-xs text-muted-foreground">
                    Limitar requisições por minuto
                  </p>
                </div>
                <Switch
                  checked={settings.enableRateLimiting}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableRateLimiting: checked })}
                />
              </div>

              {settings.enableRateLimiting && (
                <div className="space-y-2">
                  <Label htmlFor="maxRequests">Máximo de Requisições por Minuto</Label>
                  <Input
                    id="maxRequests"
                    type="number"
                    min={1}
                    max={1000}
                    value={settings.maxRequestsPerMinute}
                    onChange={(e) => setSettings({ ...settings, maxRequestsPerMinute: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>CORS (Cross-Origin Resource Sharing)</Label>
                  <p className="text-xs text-muted-foreground">
                    Permitir requisições de outras origens
                  </p>
                </div>
                <Switch
                  checked={settings.enableCors}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableCors: checked })}
                />
              </div>

              {settings.enableCors && (
                <div className="space-y-2">
                  <Label htmlFor="allowedOrigins">Origens Permitidas</Label>
                  <Input
                    id="allowedOrigins"
                    value={settings.allowedOrigins}
                    onChange={(e) => setSettings({ ...settings, allowedOrigins: e.target.value })}
                    placeholder="http://localhost:3000, https://app.example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separe múltiplas origens com vírgula
                  </p>
                </div>
              )}

              <Separator />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-yellow-900 mb-1">
                      Boas Práticas de Segurança
                    </h4>
                    <ul className="text-xs space-y-1 text-yellow-700">
                      <li>• Mantenha suas chaves de API seguras</li>
                      <li>• Use HTTPS em produção</li>
                      <li>• Rotate API keys regularmente</li>
                      <li>• Monitore logs de acesso</li>
                      <li>• Configure firewall adequadamente</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

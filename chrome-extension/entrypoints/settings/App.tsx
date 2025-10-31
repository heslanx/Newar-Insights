import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HulyCard, HulyCardContent, HulyCardDescription, HulyCardHeader, HulyCardTitle } from '@/components/ui/huly-card';
import { GlowingButton } from '@/components/ui/glowing-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storage } from '@/lib/storage';
import { updateApiKey, logout } from '@/lib/auth-service';
import { Loader2, User, Key, LogOut, ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import type { UserSession } from '@/lib/types';

export default function SettingsApp() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const userSession = await storage.getUserSession();
      if (!userSession) {
        window.location.href = '/onboarding.html';
        return;
      }
      setSession(userSession);
      setApiKey(userSession.api_key);
    } catch (err) {
      console.error('Error loading session:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveApiKey = useCallback(async () => {
    if (!session) return;
    
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateApiKey(session, apiKey);
      
      if (result.success) {
        setSession(result.session!);
        setSuccess('API Key atualizada com sucesso!');
      } else {
        setError(result.error || 'Erro ao atualizar API Key');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }, [session, apiKey]);

  const handleLogout = useCallback(async () => {
    if (!confirm('Tem certeza que deseja sair?')) return;

    try {
      await logout();
      window.location.href = '/onboarding.html';
    } catch (err) {
      console.error('Error logging out:', err);
    }
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-1 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-1">
      {/* Header */}
      <div className="border-b border-gray-10 bg-gray-2">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <OutlineButton
                onClick={() => window.close()}
                className="w-10 h-10 p-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </OutlineButton>
              <div>
                <h1 className="text-[28px] font-title text-white">Configurações</h1>
                <p className="text-[14px] text-gray-60 mt-1">
                  Gerencie sua conta e preferências
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
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* User Info */}
        <HulyCard>
          <HulyCardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-orange flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <HulyCardTitle className="text-[18px]">{session.user.name}</HulyCardTitle>
                <p className="text-[13px] text-gray-60">{session.user.email}</p>
              </div>
            </div>
          </HulyCardHeader>
          <HulyCardContent>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-2 rounded-xl border border-gray-10">
              <div>
                <p className="text-[11px] text-gray-60 uppercase font-bold mb-1">Bots Simultâneos</p>
                <p className="text-[18px] font-title text-white">{session.user.max_concurrent_bots}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-60 uppercase font-bold mb-1">Conta desde</p>
                <p className="text-[18px] font-title text-white">
                  {new Date(session.logged_in_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </HulyCardContent>
        </HulyCard>

        {/* API Key */}
        <HulyCard>
          <HulyCardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-brand-blue" />
              <HulyCardTitle className="text-[18px]">API Key</HulyCardTitle>
            </div>
            <HulyCardDescription className="text-[13px] text-gray-60">
              Sua chave de autenticação para acessar a API
            </HulyCardDescription>
          </HulyCardHeader>
          <HulyCardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-[14px] text-gray-90">Chave de API</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-gray-2 border-gray-10 text-white font-mono text-[13px] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-60 hover:text-white transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-[14px] flex items-center gap-2">
                <span>✓</span>
                {success}
              </div>
            )}

            {error && (
              <div className="p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-brand-danger text-[14px] flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            <GlowingButton
              onClick={handleSaveApiKey}
              disabled={saving || apiKey === session.api_key}
              className="w-full h-10"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </GlowingButton>
          </HulyCardContent>
        </HulyCard>

        {/* Danger Zone */}
        <HulyCard className="border-brand-danger/20">
          <HulyCardHeader>
            <HulyCardTitle className="text-[18px] text-brand-danger">Zona de Perigo</HulyCardTitle>
            <HulyCardDescription className="text-[13px] text-gray-60">
              Ações irreversíveis
            </HulyCardDescription>
          </HulyCardHeader>
          <HulyCardContent>
            <OutlineButton
              onClick={handleLogout}
              className="w-full h-10 border-brand-danger text-brand-danger hover:bg-brand-danger hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair da Conta
            </OutlineButton>
          </HulyCardContent>
        </HulyCard>
      </div>
    </div>
  );
}

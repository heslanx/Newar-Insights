import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { HulyCard, HulyCardContent, HulyCardDescription, HulyCardHeader, HulyCardTitle } from '@/components/ui/huly-card';
import { GlowingButton } from '@/components/ui/glowing-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateAndSaveApiKey, createAccount, login } from '@/lib/auth-service';
import { debounce } from '@/lib/utils';
import { Loader2, CheckCircle2, Rocket } from 'lucide-react';

type Step = 'welcome' | 'auth-choice' | 'login' | 'create-account' | 'api-key' | 'success';

export default function OnboardingApp() {
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await validateAndSaveApiKey(apiKey);
      
      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Erro ao validar API Key');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await createAccount(name, email);
      
      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Erro ao criar conta');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    // Redirect to recordings page
    window.location.href = '/recordings.html';
  };

  return (
    <div className="min-h-screen bg-gray-1 flex items-center justify-center p-6">
      <HulyCard className="w-full max-w-lg shadow-2xl">
        {step === 'welcome' && (
          <>
            <HulyCardHeader className="text-center space-y-4 pt-8">
              <img
                src="/logo-newar-branco.svg"
                alt="Newar Insights"
                className="mx-auto h-12 mb-4"
              />
              <HulyCardTitle className="text-[32px]">Bem-vindo ao Newar Insights!</HulyCardTitle>
              <p className="text-[15px] text-gray-90 leading-snug max-w-md mx-auto">
                Grave suas reuniões do Google Meet automaticamente com um clique
              </p>
            </HulyCardHeader>
            <HulyCardContent className="space-y-6 pb-8">
              <div className="space-y-3">
                <p className="text-[14px] font-medium text-white">Como funciona:</p>
                <ul className="space-y-3 text-[14px] text-gray-80">
                  <li className="flex items-start gap-3">
                    <span className="text-brand-blue text-[18px]">✓</span>
                    <span>Entre em uma reunião do Google Meet</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-brand-blue text-[18px]">✓</span>
                    <span>Clique no ícone da extensão</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-brand-blue text-[18px]">✓</span>
                    <span>Inicie a gravação com um clique</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-brand-blue text-[18px]">✓</span>
                    <span>Acesse suas gravações a qualquer momento</span>
                  </li>
                </ul>
              </div>
              <GlowingButton 
                onClick={() => setStep('auth-choice')}
                className="w-full"
              >
                Começar
              </GlowingButton>
            </HulyCardContent>
          </>
        )}

        {step === 'auth-choice' && (
          <>
            <HulyCardHeader className="text-center space-y-4 pt-8 pb-2">
              <HulyCardTitle className="text-[32px]">Como deseja continuar?</HulyCardTitle>
              <p className="text-[15px] text-gray-80">
                Escolha a melhor opção para você
              </p>
            </HulyCardHeader>
            <HulyCardContent className="space-y-3 pb-8">
              {/* Opção 1: Login */}
              <button
                onClick={() => setStep('login')}
                className="group w-full p-5 bg-gray-2 hover:bg-gray-20 border-2 border-gray-10 hover:border-brand-blue rounded-2xl transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-blue/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[16px] font-bold text-white mb-1">Já tenho uma conta</h3>
                    <p className="text-[13px] text-gray-60">Fazer login com email e senha</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-60 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Opção 2: Criar Conta */}
              <button
                onClick={() => setStep('create-account')}
                className="group w-full p-5 bg-gray-2 hover:bg-gray-20 border-2 border-gray-10 hover:border-brand-orange rounded-2xl transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-orange/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[16px] font-bold text-white mb-1">Criar nova conta</h3>
                    <p className="text-[13px] text-gray-60">Registrar-se gratuitamente</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-60 group-hover:text-brand-orange group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Opção 3: API Key */}
              <button
                onClick={() => setStep('api-key')}
                className="group w-full p-5 bg-gray-2 hover:bg-gray-20 border-2 border-gray-10 hover:border-green-500 rounded-2xl transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[16px] font-bold text-white mb-1">Tenho uma API Key</h3>
                    <p className="text-[13px] text-gray-60">Conectar com chave existente</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-60 group-hover:text-green-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Botão Voltar */}
              <button
                onClick={() => setStep('welcome')}
                className="w-full h-10 text-gray-60 hover:text-white text-[12px] uppercase font-bold rounded-full mt-6 transition-colors"
              >
                ← Voltar
              </button>
            </HulyCardContent>
          </>
        )}

        {step === 'create-account' && (
          <>
            <HulyCardHeader className="space-y-2 pt-8">
              <HulyCardTitle className="text-[28px]">Criar sua conta</HulyCardTitle>
              <HulyCardDescription className="text-[15px] text-gray-80">
                Preencha os dados abaixo para começar a gravar suas reuniões
              </HulyCardDescription>
            </HulyCardHeader>
            <HulyCardContent className="pb-8">
              <form onSubmit={handleCreateAccount} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[14px] text-gray-90">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                    className="bg-gray-2 border-gray-10 text-white placeholder:text-gray-50 h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[14px] text-gray-90">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="bg-gray-2 border-gray-10 text-white placeholder:text-gray-50 h-11"
                  />
                </div>

                {error && (
                  <div className="p-3 text-[14px] text-brand-danger bg-brand-danger/10 rounded-lg border border-danger/20">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => setStep('welcome')}
                    disabled={loading}
                    className="w-full h-10 bg-gray-20 hover:bg-gray-10 text-white text-[11px] uppercase font-bold rounded-full"
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full h-10 bg-brand-orange hover:bg-brand-orange/90 text-white text-[11px] uppercase font-bold rounded-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>
                </div>
              </form>
            </HulyCardContent>
          </>
        )}

        {step === 'login' && (
          <>
            <HulyCardHeader className="space-y-2 pt-8">
              <HulyCardTitle className="text-[28px]">Bem-vindo de volta!</HulyCardTitle>
              <HulyCardDescription className="text-[15px] text-gray-80">
                Entre com suas credenciais para continuar
              </HulyCardDescription>
            </HulyCardHeader>
            <HulyCardContent className="pb-8">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-[14px] text-gray-90">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="bg-gray-2 border-gray-10 text-white placeholder:text-gray-50 h-11 focus:border-brand-blue transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[14px] text-gray-90">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="bg-gray-2 border-gray-10 text-white placeholder:text-gray-50 h-11 focus:border-brand-blue transition-colors"
                  />
                </div>

                {error && (
                  <div className="p-3 text-[14px] text-brand-danger bg-brand-danger/10 rounded-lg border border-brand-danger/20 flex items-start gap-2">
                    <span className="text-[16px]">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => setStep('auth-choice')}
                    disabled={loading}
                    className="w-full h-10 bg-gray-20 hover:bg-gray-10 text-white text-[11px] uppercase font-bold rounded-full transition-all"
                  >
                    Voltar
                  </Button>
                  <GlowingButton 
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </GlowingButton>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('create-account')}
                    className="text-[12px] text-gray-60 hover:text-brand-blue transition-colors"
                  >
                    Não tem uma conta? <span className="font-bold">Criar agora</span>
                  </button>
                </div>
              </form>
            </HulyCardContent>
          </>
        )}

        {step === 'api-key' && (
          <>
            <HulyCardHeader className="space-y-2 pt-8">
              <HulyCardTitle className="text-[28px]">Conectar com API Key</HulyCardTitle>
              <HulyCardDescription className="text-[15px] text-gray-80">
                Cole sua chave de API para começar a usar
              </HulyCardDescription>
            </HulyCardHeader>
            <HulyCardContent className="pb-8">
              <form onSubmit={handleApiKey} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-[14px] text-gray-90">API Key</Label>
                  <Input
                    id="api-key"
                    type="text"
                    placeholder="vxa_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={loading}
                    required
                    className="bg-gray-2 border-gray-10 text-white placeholder:text-gray-50 h-11 font-mono text-[13px] focus:border-brand-blue transition-colors"
                  />
                  <p className="text-[12px] text-gray-60 flex items-start gap-2 mt-2">
                    <span>💡</span>
                    <span>Você pode encontrar sua API Key nas configurações da sua conta Newar</span>
                  </p>
                </div>

                {error && (
                  <div className="p-3 text-[14px] text-brand-danger bg-brand-danger/10 rounded-lg border border-brand-danger/20 flex items-start gap-2">
                    <span className="text-[16px]">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="p-4 bg-gray-2 rounded-xl border border-gray-10 space-y-2">
                  <p className="text-[13px] font-medium text-white">Como obter sua API Key:</p>
                  <ol className="text-[12px] text-gray-80 space-y-1 list-decimal list-inside">
                    <li>Acesse <a href="https://newar.com.br" target="_blank" className="text-brand-blue hover:underline">newar.com.br</a></li>
                    <li>Faça login na sua conta</li>
                    <li>Vá em Configurações → API Keys</li>
                    <li>Copie sua chave e cole aqui</li>
                  </ol>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => setStep('auth-choice')}
                    disabled={loading}
                    className="w-full h-10 bg-gray-20 hover:bg-gray-10 text-white text-[11px] uppercase font-bold rounded-full transition-all"
                  >
                    Voltar
                  </Button>
                  <GlowingButton 
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      'Conectar'
                    )}
                  </GlowingButton>
                </div>
              </form>
            </HulyCardContent>
          </>
        )}

        {step === 'success' && (
          <>
            <HulyCardHeader className="text-center space-y-4 pt-8">
              <div className="mx-auto mb-2 w-16 h-16 bg-gradient-to-br from-blue to-orange rounded-2xl flex items-center justify-center shadow-action">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <HulyCardTitle className="text-[32px]">Tudo pronto!</HulyCardTitle>
              <p className="text-[15px] text-gray-90">
                Sua conta foi criada com sucesso
              </p>
            </HulyCardHeader>
            <HulyCardContent className="space-y-6 pb-8">
              <div className="p-5 bg-gray-2 rounded-xl space-y-3 border border-gray-10">
                <p className="text-[14px] font-medium text-white">Próximos passos:</p>
                <ul className="space-y-2 text-[14px] text-gray-80">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-blue">•</span>
                    <span>Entre em uma reunião do Google Meet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-blue">•</span>
                    <span>Clique no ícone da extensão</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-blue">•</span>
                    <span>Inicie sua primeira gravação!</span>
                  </li>
                </ul>
              </div>

              <GlowingButton
                onClick={handleFinish}
                className="w-full"
              >
                Começar a usar
              </GlowingButton>
            </HulyCardContent>
          </>
        )}
      </HulyCard>
    </div>
  );
}

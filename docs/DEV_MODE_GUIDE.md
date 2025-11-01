# 🔧 DEV MODE - Guia de Uso

## ✅ BYPASS COMPLETO ATIVADO!

Agora você pode testar a extensão **SEM BACKEND, SEM API, SEM LOGIN**!

---

## 🎯 O que foi feito

### **1. Dev Mode Ativado**
```typescript
// lib/dev-mode.ts
export const DEV_MODE = {
  enabled: true,        // ✅ Ativado
  bypassAuth: true,     // ✅ Sem login necessário
  bypassAPI: true,      // ✅ Sem chamadas de API
  mockData: true,       // ✅ Dados fake
  autoLogin: true,      // ✅ Login automático
};
```

### **2. Auto-Login**
- Ao carregar a extensão, você já está "logado"
- Usuário mock: `dev@newar.com`
- API key mock: `dev-api-key-mock-12345`
- Plano: Enterprise (5 bots simultâneos)

### **3. Mock Data**
- **3 gravações fake** já disponíveis
- Status variados: completed, processing
- Dados realistas (duração, tamanho, etc)

---

## 🚀 Como Usar

### **1. Build e Carregar**
```bash
cd chrome-extension
npm run build
```

### **2. Carregar no Chrome**
1. Abra `chrome://extensions/`
2. Ative "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `.output/chrome-mv3`

### **3. Testar no Meet**
1. Entre em qualquer reunião do Google Meet
2. Veja o botão laranja da Newar na toolbar
3. Clique no botão
4. ✅ Gravação inicia INSTANTANEAMENTE (sem API)
5. ✅ Notificação: "🔧 DEV: Gravação Iniciada"
6. ✅ Botão fica vermelho pulsante
7. ✅ Auto-admit ativo

### **4. Testar Auto-Admit**
1. Com gravação ativa (botão vermelho)
2. Peça para alguém entrar na sala de espera
3. ✅ Bot é admitido automaticamente
4. ✅ Log no console: "Auto-admitting participant..."

### **5. Parar Gravação**
1. Clique no botão vermelho
2. ✅ Gravação para INSTANTANEAMENTE
3. ✅ Notificação: "🔧 DEV: Gravação Parada"
4. ✅ Botão volta para laranja

---

## 📊 Dados Mock Disponíveis

### **Usuário Logado**
```json
{
  "email": "dev@newar.com",
  "name": "Developer User",
  "max_concurrent_bots": 5,
  "plan": "enterprise"
}
```

### **Gravações (3)**
```json
[
  {
    "id": "rec-1",
    "meeting_id": "abc-defg-hij",
    "status": "completed",
    "duration": 3600,
    "file_size": 125000000
  },
  {
    "id": "rec-2",
    "meeting_id": "xyz-uvwx-yz",
    "status": "completed",
    "duration": 2400,
    "file_size": 85000000
  },
  {
    "id": "rec-3",
    "meeting_id": "lmn-opqr-stu",
    "status": "processing",
    "duration": 1800
  }
]
```

---

## 🔍 Logs de Debug

### **Console do Background**
```javascript
[DEV MODE ENABLED]
🔧 Bypass Auth: true
🔧 Bypass API: true
🔧 Mock Data: true
🔧 Auto Login: true
📝 Mock User: dev@newar.com

[DEV MODE] Auto-login enabled, setting mock session...
[DEV MODE] Mock session set: { user: {...}, api_key: '...' }

[DEV MODE] Bypassing API, using mock...
[DEV MODE] Mock starting recording for: abc-defg-hij
[DEV MODE] Mock API response: { id: 'rec-...', ... }
```

### **Console do Content Script**
```javascript
[Newar Meet Button] Initializing...
[Newar Meet Button] Button injected successfully
[Newar Meet Button] Button clicked
[Newar Meet Button] Starting recording...
[Newar Meet Button] Recording started successfully
[Newar Meet Button] Auto-admitting participant via text...
```

---

## 🎨 Estados Visuais

### **Botão Laranja** 🟠
- Pronto para gravar
- Usuário "logado" (mock)
- Clique para iniciar

### **Botão Vermelho Pulsante** 🔴
- Gravando (mock)
- Auto-admit ativo
- Clique para parar

### **Notificações**
- "🔧 DEV: Gravação Iniciada"
- "🔧 DEV: Gravação Parada"
- Ícone 🔧 indica dev mode

---

## 📝 Checklist de Testes

### **Básico**
- [ ] Carregar extensão
- [ ] Ver botão na toolbar do Meet
- [ ] Botão está laranja (idle)
- [ ] Clicar no botão
- [ ] Notificação aparece
- [ ] Botão fica vermelho
- [ ] Clicar novamente
- [ ] Botão volta para laranja

### **Auto-Admit**
- [ ] Iniciar gravação (botão vermelho)
- [ ] Alguém entra na sala de espera
- [ ] Botão "Admit" é clicado automaticamente
- [ ] Participante entra sem intervenção

### **Sincronização**
- [ ] Abrir Meet em 2 tabs
- [ ] Iniciar gravação na tab 1
- [ ] Botão na tab 2 também fica vermelho
- [ ] Parar gravação na tab 2
- [ ] Botão na tab 1 também volta para laranja

### **Páginas**
- [ ] Abrir `/recordings.html`
- [ ] Ver 3 gravações mock
- [ ] Abrir `/settings.html`
- [ ] Ver configurações
- [ ] Abrir `/onboarding.html`
- [ ] Ver tela de boas-vindas

---

## 🔧 Customizar Dev Mode

### **Desativar Auto-Login**
```typescript
// lib/dev-mode.ts
export const DEV_MODE = {
  enabled: true,
  bypassAuth: true,
  bypassAPI: true,
  mockData: true,
  autoLogin: false, // ← Mudar para false
};
```

### **Adicionar Mais Gravações Mock**
```typescript
// lib/dev-mode.ts
export const MOCK_RECORDINGS = [
  // ... gravações existentes
  {
    id: 'rec-4',
    meeting_id: 'new-meet-id',
    status: 'completed',
    // ...
  },
];
```

### **Simular Erro**
```typescript
// lib/dev-mode.ts
export async function mockStartRecording(meetingId: string) {
  // Simular erro
  return mockApiError('Erro simulado para teste', 1000);
}
```

---

## 🚨 Importante

### **Dev Mode está SEMPRE ativado**
```typescript
// lib/dev-mode.ts
export const DEV_MODE = {
  enabled: true, // ← SEMPRE true
  // ...
};
```

### **Para DESATIVAR (produção)**
```typescript
export const DEV_MODE = {
  enabled: false, // ← Mudar para false
  // ...
};
```

### **Ou usar variável de ambiente**
```typescript
export const DEV_MODE = {
  enabled: import.meta.env.DEV, // ← Usa env
  // ...
};
```

---

## 🎯 Próximos Passos

### **Agora você pode:**
1. ✅ Testar o botão no Meet sem backend
2. ✅ Testar auto-admit sem bot real
3. ✅ Desenvolver UI sem se preocupar com API
4. ✅ Iterar rapidamente
5. ✅ Focar na UX

### **Quando backend estiver pronto:**
1. Mudar `DEV_MODE.enabled = false`
2. Configurar API real
3. Testar integração
4. Deploy!

---

## 📚 Arquivos Relacionados

```
lib/
├── dev-mode.ts          # ✅ Configuração e mocks
└── types.ts             # Tipos compartilhados

entrypoints/
├── background.ts        # ✅ Bypass de API
└── content.ts           # Botão no Meet

.env.development         # ✅ Variáveis de ambiente
```

---

## ✨ Resultado

**Você agora pode desenvolver SEM BACKEND!**

- ✅ Sem login
- ✅ Sem API
- ✅ Sem banco de dados
- ✅ Sem bot real
- ✅ Tudo funciona localmente
- ✅ Iteração rápida
- ✅ Foco na UX

**Build:** 353.11 kB  
**Status:** PRONTO PARA DESENVOLVIMENTO  
**Dev Mode:** ATIVADO 🔧

---

**Bora testar! 🚀**

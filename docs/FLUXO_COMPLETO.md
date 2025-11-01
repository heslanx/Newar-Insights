# 🔄 Fluxo Completo - Newar Insights Chrome Extension

## 📱 Fluxo do Usuário

### 1️⃣ Primeira Instalação
```
Instalação da Extensão
    ↓
Background Worker detecta instalação
    ↓
Abre /onboarding.html automaticamente
    ↓
Tela Welcome (Logo + Descrição)
```

### 2️⃣ Onboarding (6 Telas)
```
Welcome
    ↓ [Botão "Começar"]
Auth Choice (Escolha)
    ↓
┌─────────────┬──────────────┬─────────────┐
│   Login     │ Criar Conta  │  API Key    │
│             │              │             │
│ Email       │ Nome         │ Cole Key    │
│ Senha       │ Email        │             │
└──────┬──────┴──────┬───────┴──────┬──────┘
       └─────────────┴──────────────┘
                     ↓
              Success Screen
                     ↓
         Storage: user_session salvo
         Storage: onboarding_completed = true
                     ↓
              Fecha onboarding
```

### 3️⃣ Uso no Google Meet
```
Usuário entra em meet.google.com/abc-defg-hij
    ↓
Content Script detecta URL
    ↓
Extrai Meeting ID: "abc-defg-hij"
    ↓
Injeta Badge Flutuante (canto inferior direito)
    ↓
Badge mostra: "Newar Insights | Pronto"
```

### 4️⃣ Iniciar Gravação
```
Usuário clica no ícone da extensão
    ↓
Popup abre (400px width)
    ↓
Verifica se está no Google Meet
    ↓
┌─────────────────────────────────┐
│ Se SIM (no Meet):               │
│   - Mostra Meeting ID           │
│   - Botão "Gravar" laranja      │
│   - Estatísticas do usuário     │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Se NÃO (fora do Meet):          │
│   - Mensagem: "Entre em reunião"│
│   - Link para abrir Meet        │
└─────────────────────────────────┘
    ↓
Usuário clica "Gravar"
    ↓
Popup envia mensagem ao Background:
{ type: 'START_RECORDING', payload: { meetingId } }
    ↓
Background Worker:
  1. Pega API Key do storage
  2. Chama API: POST /recordings
  3. Salva em active_recordings
  4. Inicia polling (5s)
  5. Mostra notificação
    ↓
Badge atualiza: "GRAVANDO" (vermelho pulsante)
    ↓
Popup atualiza: Botão vira "Parar Gravação"
```

### 5️⃣ Durante a Gravação
```
Background Worker (a cada 5 segundos):
    ↓
GET /recordings/google_meet/{meetingId}
    ↓
Atualiza storage com status
    ↓
Se status mudou:
  - Atualiza Badge
  - Atualiza Popup (se aberto)
  - Mostra notificação (se configurado)
```

### 6️⃣ Parar Gravação
```
Usuário clica "Parar Gravação"
    ↓
Background Worker:
  1. DELETE /recordings/google_meet/{meetingId}
  2. Para polling
  3. Atualiza storage
  4. Mostra notificação
    ↓
Badge volta: "Pronto"
```

### 7️⃣ Ver Gravações
```
Usuário clica no ícone → "Ver Gravações"
    ↓
Abre /recordings.html em nova aba
    ↓
Lista todas as gravações:
  - Meeting ID
  - Data/Hora
  - Duração
  - Status (Gravando/Concluída/Processando)
  - Ações: Download, Delete
    ↓
Usuário clica "Download"
    ↓
GET /recordings/google_meet/{meetingId}/download
    ↓
Arquivo baixado
```

### 8️⃣ Configurações
```
Usuário clica no ícone → Engrenagem
    ↓
Abre /settings.html em nova aba
    ↓
Mostra:
  - Perfil do usuário
  - API Key (com show/hide)
  - Botão "Salvar Alterações"
  - Botão "Sair da Conta"
    ↓
Usuário atualiza API Key → Salva
    ↓
Storage atualizado
    ↓
Ou clica "Sair"
    ↓
Storage limpo → Volta para onboarding
```

---

## 🔌 Comunicação Entre Componentes

### Content Script ↔ Background Worker
```javascript
// Content Script envia
chrome.runtime.sendMessage({
  type: 'CHECK_MEETING_STATUS',
  payload: { meetingId }
});

// Background responde
{ success: true, data: { isRecording: true } }
```

### Popup ↔ Background Worker
```javascript
// Popup envia
chrome.runtime.sendMessage({
  type: 'START_RECORDING',
  payload: { meetingId, botName }
});

// Background responde
{ success: true, data: { id, status, ... } }
```

### Background Worker → Storage
```javascript
// Salvar sessão
await storage.setUserSession({
  user: { id, name, email, max_concurrent_bots },
  api_key: 'token',
  logged_in_at: '2025-10-30T...'
});

// Adicionar gravação ativa
await storage.addActiveRecording({
  id, meeting_id, platform, status, started_at
});
```

### Background Worker → API
```javascript
// Iniciar gravação
const recording = await apiClient.createRecording(apiKey, {
  platform: 'google_meet',
  meeting_id: 'abc-defg-hij',
  bot_name: 'Meu Bot'
});

// Verificar status
const status = await apiClient.getRecordingStatus(apiKey, meetingId);

// Parar gravação
await apiClient.stopRecording(apiKey, meetingId);
```

---

## 🎯 Estados da Aplicação

### Storage Keys
- `user_session`: Dados do usuário + API key
- `onboarding_completed`: Boolean
- `active_recordings`: Array de gravações ativas
- `preferences`: Configurações do usuário

### Estados do Badge
- **"Pronto"** (cinza): Não está gravando
- **"GRAVANDO"** (vermelho pulsante): Gravação ativa

### Estados do Popup
- **not-on-meet**: Não está em reunião
- **ready**: Pronto para gravar
- **recording**: Gravando
- **loading**: Carregando dados

---

## ✅ Checklist de Funcionalidades

### Implementado ✅
- [x] Onboarding completo (6 telas)
- [x] Login / Criar Conta / API Key
- [x] Popup com estados
- [x] Content Script com Badge
- [x] Background Worker com polling
- [x] Página de Gravações
- [x] Página de Configurações
- [x] Storage type-safe
- [x] API Client
- [x] Identidade visual completa
- [x] GlowingButton com efeito
- [x] Validações e feedback
- [x] Estados de erro
- [x] Loading states
- [x] Notificações

### Pronto para Produção 🚀
- Build: 334.14 kB
- CSS: 30.32 kB
- Sem erros de build
- TypeScript type-safe
- Design profissional aplicado
- UX seguindo heurísticas de Nielsen

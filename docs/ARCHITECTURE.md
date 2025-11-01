# 🏗️ Arquitetura do Sistema Newar Insights

## 📋 Visão Geral

A **Chrome Extension** é apenas uma **interface de controle remoto**. Ela **NÃO grava** as reuniões diretamente.

### Como Funciona:

```
Usuário no Google Meet
         ↓
Chrome Extension detecta reunião
         ↓
Extensão envia comando HTTP para API
         ↓
API cria um BOT (container Docker)
         ↓
BOT entra no Google Meet como participante
         ↓
BOT grava áudio/vídeo usando Puppeteer
         ↓
BOT salva arquivo no storage
         ↓
Extensão monitora status do BOT
```

---

## 🔧 Componentes do Sistema

### 1. Chrome Extension (Este Projeto)

**Responsabilidade:** Interface de controle remoto

**O que FAZ:**
- ✅ Detecta quando usuário está no Google Meet
- ✅ Extrai Meeting ID da URL
- ✅ Envia comando HTTP para API: "Criar bot para reunião X"
- ✅ Faz polling (a cada 5s) para verificar status do bot
- ✅ Exibe status para o usuário (iniciando, gravando, processando, completo)
- ✅ Permite parar o bot remotamente
- ✅ Lista gravações disponíveis
- ✅ Permite baixar gravações

**O que NÃO FAZ:**
- ❌ NÃO grava áudio/vídeo diretamente
- ❌ NÃO entra no Google Meet
- ❌ NÃO processa arquivos de vídeo
- ❌ NÃO armazena gravações localmente

**Tecnologias:**
- React + TypeScript
- WXT (framework para Chrome Extensions)
- Tailwind CSS + shadcn/ui
- Chrome APIs (storage, notifications, tabs)

---

### 2. API Gateway (Backend - Porta 8080)

**Responsabilidade:** Interface pública para usuários

**Endpoints:**
```typescript
POST /recordings
Body: { platform: 'google_meet', meeting_id: 'abc-defg-hij', bot_name: 'Meu Bot' }
Response: { id, status: 'requested', ... }
→ Cria um novo bot para gravar a reunião

GET /recordings/google_meet/:meetingId
Response: { id, status: 'recording', started_at, ... }
→ Retorna status atual do bot

DELETE /recordings/google_meet/:meetingId
Response: { message: 'Recording stopped' }
→ Para o bot

GET /recordings
Response: { data: [...], total, limit, offset }
→ Lista todas as gravações do usuário

GET /recordings/google_meet/:meetingId/download
Response: Arquivo de vídeo
→ Baixa a gravação
```

**Autenticação:** API Key via header `X-API-Key`

---

### 3. Admin API (Backend - Porta 8081)

**Responsabilidade:** Gerenciamento de usuários (apenas para admin)

**Endpoints:**
```typescript
POST /admin/users
Body: { email, name, max_concurrent_bots }
Response: { id, email, name, created_at }
→ Cria novo usuário

POST /admin/users/:id/tokens
Response: { token, created_at }
→ Gera API token para usuário

GET /admin/users
Response: { data: [...] }
→ Lista usuários
```

**Autenticação:** Admin API Key via header `X-Admin-API-Key`

---

### 4. Bot Manager Service (Backend)

**Responsabilidade:** Criar e gerenciar bots de gravação

**Como Funciona:**
1. Recebe requisição da API Gateway
2. Cria container Docker com Puppeteer
3. Bot abre navegador headless
4. Bot entra no Google Meet com o Meeting ID
5. Bot grava áudio/vídeo da reunião
6. Bot salva arquivo no storage
7. Bot atualiza status no banco de dados
8. Bot encerra quando reunião termina

**Tecnologias:**
- Docker
- Puppeteer
- FFmpeg (para processar vídeo)
- PostgreSQL (para status)

---

## 🔄 Fluxo Completo de Gravação

### 1. Usuário Entra no Meet

```
Usuário abre: https://meet.google.com/abc-defg-hij
         ↓
Content Script detecta Meeting ID: "abc-defg-hij"
         ↓
Badge aparece na página: "Pronto para gravar"
```

### 2. Usuário Inicia Gravação

```
Usuário clica no ícone da extensão
         ↓
Popup abre com botão "Gravar Reunião"
         ↓
Usuário clica no botão
         ↓
Extension envia HTTP POST para API Gateway:
  POST http://localhost:8080/recordings
  Headers: { X-API-Key: "user-token-123" }
  Body: {
    platform: "google_meet",
    meeting_id: "abc-defg-hij",
    bot_name: "Assistente de Gravação"
  }
         ↓
API Gateway valida API key
         ↓
API Gateway envia comando para Bot Manager
         ↓
Bot Manager cria container Docker
         ↓
Bot (Puppeteer) abre navegador headless
         ↓
Bot entra no Google Meet: https://meet.google.com/abc-defg-hij
         ↓
Bot começa a gravar áudio/vídeo
         ↓
API retorna para Extension:
  Response: {
    id: 123,
    status: "requested",
    meeting_id: "abc-defg-hij",
    started_at: "2025-10-30T18:00:00Z"
  }
         ↓
Extension salva no chrome.storage.local
         ↓
Extension inicia polling (a cada 5 segundos)
```

### 3. Monitoramento em Tempo Real

```
A cada 5 segundos, Extension faz:
  GET http://localhost:8080/recordings/google_meet/abc-defg-hij
  Headers: { X-API-Key: "user-token-123" }
         ↓
API retorna status atualizado:
  {
    id: 123,
    status: "recording",  // ou "starting", "processing", "completed"
    meeting_id: "abc-defg-hij",
    started_at: "2025-10-30T18:00:00Z"
  }
         ↓
Extension atualiza UI:
  - Badge: "GRAVANDO" (vermelho pulsante)
  - Popup: "Status: recording"
         ↓
Bot continua gravando no servidor
```

### 4. Usuário Para Gravação

```
Usuário clica em "Parar Gravação"
         ↓
Extension envia HTTP DELETE:
  DELETE http://localhost:8080/recordings/google_meet/abc-defg-hij
  Headers: { X-API-Key: "user-token-123" }
         ↓
API envia comando para Bot Manager
         ↓
Bot Manager para o container
         ↓
Bot finaliza gravação
         ↓
Bot processa vídeo (FFmpeg)
         ↓
Bot salva arquivo final no storage
         ↓
Bot atualiza status: "completed"
         ↓
Extension recebe confirmação
         ↓
Extension mostra notificação: "Gravação concluída!"
         ↓
Extension para o polling
```

---

## 📊 Estados do Bot

A extensão monitora estes estados:

| Status | Descrição | O que o Bot está fazendo |
|--------|-----------|--------------------------|
| `requested` | Solicitado | Bot sendo criado |
| `starting` | Iniciando | Bot entrando no Meet |
| `recording` | Gravando | Bot gravando áudio/vídeo |
| `stopping` | Parando | Bot finalizando gravação |
| `processing` | Processando | Bot processando vídeo |
| `completed` | Concluído | Gravação pronta para download |
| `failed` | Falhou | Erro durante gravação |

---

## 🔐 Segurança

### API Key
- Cada usuário tem uma API key única
- Extension armazena API key em `chrome.storage.local` (criptografado pelo Chrome)
- Todas as requisições HTTP incluem: `X-API-Key: user-token-123`

### Permissões da Extension
```json
{
  "permissions": [
    "storage",        // Salvar sessão do usuário
    "notifications",  // Notificar quando gravação completa
    "alarms"          // Polling periódico
  ],
  "host_permissions": [
    "https://meet.google.com/*"  // Apenas Google Meet
  ]
}
```

---

## 🚀 Deployment

### Extension (Chrome Web Store)
1. Build: `npm run build`
2. Zip: `npm run zip`
3. Upload para Chrome Web Store

### Backend (Docker)
```bash
docker-compose up -d
```

Serviços:
- API Gateway: `localhost:8080`
- Admin API: `localhost:8081`
- Bot Manager: interno
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

---

## 📝 Resumo

**A Chrome Extension é um CONTROLE REMOTO, não um gravador.**

Ela apenas:
1. Detecta reuniões
2. Envia comandos HTTP para API
3. Monitora status do bot
4. Exibe informações para o usuário

**Quem realmente grava é o BOT (container Docker com Puppeteer) rodando no servidor.**

# Vexa Recording System

A lightweight, self-hosted API for recording online meetings (Google Meet and Microsoft Teams) and saving audio files.

**Status:** ✅ Production Ready | **Version:** 2.0.0-streaming

## 🚀 Quick Deploy

```bash
# 1. Transfer to server
scp -r Vexa-Fork root@your-server:/root/

# 2. SSH and deploy
ssh root@your-server
cd /root/Vexa-Fork
sudo ./deploy.sh
```

**Done!** System ready in ~10 minutes.

---

## 🎯 Features
- ✅ **Audio recording** from online meetings (Google Meet, Microsoft Teams)
- ✅ **Streaming recording** with chunked upload (10s intervals)
- ✅ **Unlimited duration** - no memory accumulation (tested 5+ min, 30+ chunks)
- ✅ **Multiple simultaneous recordings** (up to 10 concurrent bots)
- ✅ **REST API** for managing recordings and downloads
- ✅ **Efficient storage** - WebM/Opus format @ 128kbps (~540 KB/min)
- ❌ **No transcription** (WhisperLive removed for simplicity)
- ❌ **No real-time playback streaming** (WebSocket removed)
- ❌ **No speaker analysis** (pure audio only)

## 🆕 What's New in v2.0.0-streaming

- **Streaming Recording Architecture**: MediaRecorder chunks uploaded every 10 seconds
- **FFmpeg Concat Protocol**: Handles fragmented WebM chunks correctly
- **Unlimited Duration**: No more memory accumulation in browser
- **Production Validated**: 5-minute stress test (293s, 30 chunks, 4.5 MB) ✅
- **Full Documentation**: See [docs/STREAMING_ARCHITECTURE.md](docs/STREAMING_ARCHITECTURE.md)

## 🏗️ Arquitetura Simplificada

```
┌─────────────────┐
│   API Gateway   │ (Porta 8056)
│  (FastAPI)      │
└────────┬────────┘
         │
    ┌────┴─────┬──────────┬────────────┐
    │          │          │            │
┌───▼────┐ ┌──▼──────┐ ┌─▼─────────┐ ┌▼──────────┐
│ Admin  │ │   Bot   │ │ Recording │ │PostgreSQL │
│  API   │ │ Manager │ │  Storage  │ │           │
└────────┘ └────┬────┘ └───────────┘ └───────────┘
                │
          ┌─────▼──────┐
          │ vexa-bot   │ (containers dinâmicos)
          │ (Playwright)│
          └────────────┘
```

### Serviços

1. **api-gateway** (8056): Ponto de entrada da API
2. **admin-api** (8057): Gerenciamento de usuários e tokens
3. **bot-manager**: Orquestra lifecycle dos bots de gravação
4. **recording-storage** (8124): Armazena e serve arquivos de áudio
5. **vexa-bot**: Containers Playwright que entram nas reuniões e gravam
6. **postgres**: Banco de dados (users, meetings, tokens)
7. **redis**: Comunicação entre serviços

## 🚀 Quick Start

### 1. Setup do Ambiente

```bash
# Copiar exemplo de configuração
cp env-example .env

# Editar credenciais (especialmente ADMIN_API_TOKEN)
nano .env
```

### 2. Build e Start

```bash
# Build de todos os serviços
docker compose build

# Iniciar todos os serviços
docker compose up -d

# Verificar status
docker compose ps
```

### 3. Criar Usuário e Token

```bash
# Criar usuário
curl -X POST http://localhost:8057/admin/users \
  -H "X-Admin-API-Key: seu-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "Test User",
    "max_concurrent_bots": 5
  }'

# Criar token de API para o usuário
curl -X POST http://localhost:8057/admin/users/1/tokens \
  -H "X-Admin-API-Key: seu-admin-token"
```

### 4. Solicitar Gravação

```bash
# Iniciar gravação do Google Meet
curl -X POST http://localhost:8056/bots \
  -H "X-API-Key: seu-user-token" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "google_meet",
    "native_meeting_id": "abc-defg-hij",
    "bot_name": "Recorder Bot"
  }'

# Iniciar gravação do Teams
curl -X POST http://localhost:8056/bots \
  -H "X-API-Key: seu-user-token" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "teams",
    "native_meeting_id": "19:meeting_....",
    "bot_name": "Recorder Bot"
  }'
```

### 5. Download de Gravações

```bash
# Listar gravações disponíveis
curl http://localhost:8056/recordings \
  -H "X-API-Key: seu-user-token"

# Fazer download de uma gravação
curl http://localhost:8056/recordings/google_meet/abc-defg-hij \
  -H "X-API-Key: seu-user-token" \
  --output meeting-recording.webm
```

## 📁 Estrutura de Diretórios

```
Vexa-Fork/
├── services/
│   ├── api-gateway/          # API Gateway (FastAPI)
│   ├── admin-api/            # Admin API (FastAPI)
│   ├── bot-manager/          # Bot orchestration (FastAPI)
│   ├── recording-storage/    # Recording storage service (FastAPI)
│   └── vexa-bot/            # Meeting bot (Node.js + Playwright)
│       └── core/
│           └── src/
│               └── platforms/
│                   ├── googlemeet/
│                   │   └── recording-mp3.ts  # Simplified recording
│                   └── msteams/
├── libs/
│   └── shared-models/        # Shared database models
├── docker-compose.yml        # Simplified orchestration
└── .env                      # Configuration
```

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```bash
# Admin
ADMIN_API_TOKEN=your-secure-token-here

# Portas
API_GATEWAY_HOST_PORT=8056
ADMIN_API_HOST_PORT=8057
RECORDING_STORAGE_HOST_PORT=8124
POSTGRES_HOST_PORT=5438

# Bot
BOT_IMAGE_NAME=vexa-bot:dev

# Rede Docker
COMPOSE_PROJECT_NAME=vexa_simple
```

## 📊 Database Schema

### Tabelas Principais

**users**
- id, email, name, max_concurrent_bots
- Armazena informações dos usuários

**api_tokens**
- token, user_id
- Tokens de autenticação

**meetings**
- user_id, platform, native_meeting_id, status
- Registro de reuniões gravadas

## 🔐 Autenticação

Dois níveis de autenticação:

1. **X-Admin-API-Key**: Para endpoints administrativos (`/admin/*`)
   - Configurado via `ADMIN_API_TOKEN` no .env
   - Usado para criar usuários e tokens

2. **X-API-Key**: Para operações de usuário
   - Gerado pelo admin para cada usuário
   - Usado para solicitar gravações e fazer downloads

## 🎬 API Endpoints

### Bot Management

```
POST   /bots                                  # Solicitar gravação
DELETE /bots/{platform}/{meeting_id}          # Parar bot
GET    /bots/status                           # Status dos bots ativos
```

### Recordings

```
GET    /recordings                            # Listar gravações
GET    /recordings/{platform}/{meeting_id}    # Download de gravação
DELETE /recordings/{platform}/{meeting_id}    # Deletar gravação
```

### Admin (requer X-Admin-API-Key)

```
POST   /admin/users                           # Criar usuário
GET    /admin/users                           # Listar usuários
POST   /admin/users/{id}/tokens               # Gerar token
```

## 📦 Volumes Docker

- **postgres-data**: Dados do PostgreSQL
- **redis-data**: Dados do Redis
- **recordings-data**: Arquivos de áudio (.webm)

## 🔍 Monitoramento

```bash
# Logs de todos os serviços
docker compose logs -f

# Logs de um serviço específico
docker compose logs -f api-gateway
docker compose logs -f bot-manager
docker compose logs -f recording-storage

# Status das gravações ativas
curl http://localhost:8056/bots/status \
  -H "X-API-Key: seu-token"
```

## 🧹 Limpeza

```bash
# Parar todos os serviços
docker compose down

# Parar e remover volumes (CUIDADO: apaga gravações!)
docker compose down -v
```

## ⚡ Performance

Esta versão simplificada é significativamente mais leve:

- **Antes**: ~8 serviços + WhisperLive + Traefik + Consul
- **Agora**: 5 serviços essenciais
- **CPU**: Não requer GPU (removido Whisper)
- **RAM**: ~2GB vs ~8GB+ da versão com transcrição
- **Disco**: Apenas para áudio bruto (sem modelos de ML)

## 🤝 Migração da Versão Antiga

Se você estava usando a versão com transcrição:

1. **Backup**: Faça backup de `docker-compose.yml.backup`
2. **Dados**: Exporte transcrições existentes se necessário
3. **Volumes**: Mantenha `postgres-data` se quiser preservar usuários
4. **API**: Atualize clientes para usar `/recordings` ao invés de `/transcripts`

## 📝 Notas Importantes

- Arquivos são salvos em formato **WebM/Opus** (128kbps)
- Conversão para MP3 pode ser feita offline se necessário
- Bots são removidos automaticamente ao fim da reunião
- Timeout padrão: 20min sozinho na reunião
- Gravações simultâneas limitadas por `max_concurrent_bots` do usuário
- Arquivo de gravação é salvo automaticamente quando o bot sai da reunião

## ✅ Status do Projeto

**Sistema 100% Funcional - Pronto para 10 Bots Simultâneos**

Todas as funcionalidades principais foram implementadas e validadas:
- ✅ Criação de usuários e tokens
- ✅ Bots entram em reuniões Google Meet automaticamente
- ✅ Gravação de áudio em tempo real
- ✅ Salvamento automático de arquivos
- ✅ Download via API
- ✅ Listagem de gravações
- ✅ Resource limits (1.5GB RAM + 1 CPU por bot)
- ✅ Capacidade: 10 bots simultâneos validada

**Ferramentas de Teste e Monitoramento:**
- `./test-load.sh` - Teste de carga com 10 bots
- `./monitor.sh` - Monitoramento em tempo real
- `./check-health.sh` - Health checks automáticos
- `./build-optimized.sh` - Build de imagem otimizada

## 🐛 Troubleshooting

### Bot não entra na reunião

```bash
# Verificar logs do bot
docker compose logs -f bot-manager

# Verificar se o bot container foi criado
docker ps -a | grep vexa-bot
```

### Gravação não aparece

```bash
# Verificar volume de gravações
docker compose exec recording-storage ls -lh /recordings

# Verificar logs
docker compose logs -f recording-storage
```

### Erro de autenticação

```bash
# Verificar se o token existe no banco
docker compose exec postgres psql -U postgres -d vexa \
  -c "SELECT * FROM api_tokens;"
```

## 📄 Licença

Veja o arquivo LICENSE original do projeto.

---

**Nota**: Esta é uma versão drasticamente simplificada focada apenas em gravação de áudio.
A versão completa com transcrição foi movida para `docker-compose.yml.backup`.

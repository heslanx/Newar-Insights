# Newar Insights - Plano de Implementação

**Versão:** 1.0
**Stack:** Go + Redis + SQLite (migrar para Supabase depois) + Playwright
**Target:** EasyPanel Deployment
**Data:** 2025-10-28

---

## 🎯 Resumo do Projeto

Sistema de gravação de reuniões online (Google Meet, Microsoft Teams) via API REST.

### Features Principais
- API REST para solicitar gravações
- Bots headless que entram em reuniões
- Gravação de áudio em chunks de 10s
- Concatenação automática em arquivo final WebM
- Multi-tenant com autenticação por API key
- Admin API para gerenciamento de usuários

---

## 📋 Fases de Implementação

### ✅ FASE 1: Configuração Inicial
- [x] Criar estrutura de pastas
- [x] Inicializar Git
- [x] Inicializar Go module
- [x] Criar .gitignore
- [x] Criar .env.example

### 🔄 FASE 2: Database Setup (SQLite)
- [ ] Criar schema SQL (users, api_tokens, meetings)
- [ ] Implementar migrations
- [ ] Criar database helpers (SQLite + preparar para Supabase)

### 🔄 FASE 3: Redis Setup
- [ ] Configurar Redis local (docker-compose)
- [ ] Criar Redis helpers (pub/sub)
- [ ] Testar conexão

### 🔄 FASE 4: Shared Packages
- [ ] shared/types (structs Go)
- [ ] shared/constants (status, platforms)
- [ ] shared/database (SQLite connector com interface para Supabase)
- [ ] shared/redis (client helper)

### 🔄 FASE 5: Admin API (Port 8081)
- [ ] Estrutura do serviço
- [ ] Middleware de autenticação admin
- [ ] POST /admin/users
- [ ] POST /admin/users/{id}/tokens (SHA-256)
- [ ] GET /admin/users
- [ ] DELETE /admin/users/{id}
- [ ] GET /health
- [ ] Testes unitários

### 🔄 FASE 6: API Gateway (Port 8080)
- [ ] Estrutura do serviço
- [ ] Middleware autenticação (X-API-Key)
- [ ] Middleware rate limiting
- [ ] Middleware CORS
- [ ] POST /recordings
- [ ] GET /recordings/{platform}/{meeting_id}
- [ ] DELETE /recordings/{platform}/{meeting_id}
- [ ] GET /recordings (list)
- [ ] GET /recordings/{platform}/{meeting_id}/download
- [ ] Validação de inputs
- [ ] GET /health
- [ ] Testes unitários

### 🔄 FASE 7: Bot Manager (Port 8082)
- [ ] Estrutura do serviço
- [ ] Docker client integration
- [ ] POST /bots/spawn
- [ ] Verificação max_concurrent_bots
- [ ] Redis Pub/Sub subscriber (status)
- [ ] Redis publisher (comandos)
- [ ] Status handler (update DB)
- [ ] Finalizer (FFmpeg concat)
- [ ] Cleanup (temp files, containers)
- [ ] GET /health
- [ ] Testes unitários

### 🔄 FASE 8: Recording Bot (TypeScript)
- [ ] Setup TypeScript project
- [ ] Instalar dependências (playwright, etc)
- [ ] src/config.ts
- [ ] src/platforms/google-meet.ts
- [ ] src/platforms/teams.ts
- [ ] src/recorder.ts (MediaRecorder 10s chunks)
- [ ] src/uploader.ts (local storage por enquanto)
- [ ] Redis publisher (status)
- [ ] Redis subscriber (comandos)
- [ ] Graceful shutdown
- [ ] src/index.ts
- [ ] Build com esbuild
- [ ] Testes de integração

### 🔄 FASE 9: Dockerização
- [ ] Dockerfile.gateway (multi-stage)
- [ ] Dockerfile.admin (multi-stage)
- [ ] Dockerfile.manager (multi-stage + docker-cli)
- [ ] Dockerfile.bot (playwright base)
- [ ] docker-compose.yml (todos serviços + redis + sqlite)
- [ ] .dockerignore
- [ ] Testar build local

### 🔄 FASE 10: Testes E2E
- [ ] Script de teste E2E
- [ ] Fluxo completo: criar user → gerar token → gravar
- [ ] Verificar bot join
- [ ] Aguardar 30s (3 chunks)
- [ ] Stop recording
- [ ] Verificar concatenação
- [ ] Download arquivo final
- [ ] Validar WebM (ffprobe)
- [ ] Coleção Postman

### 🔄 FASE 11: Documentação
- [ ] README.md
- [ ] API_REFERENCE.md
- [ ] ARCHITECTURE.md
- [ ] DEPLOYMENT.md
- [ ] create_tables.sql (comentado)
- [ ] Documentar .env.example
- [ ] Swagger docs (opcional)

### 🔄 FASE 12: Monitoramento
- [ ] Structured logging (zerolog)
- [ ] Métricas Prometheus (opcional)
- [ ] Dashboard básico (opcional)

### 🔄 FASE 13: Segurança
- [ ] Revisar hashing de tokens
- [ ] Verificar SQL injection
- [ ] Sanitização de inputs
- [ ] Revisar logs (não logar API keys)
- [ ] HTTPS/TLS config

### 🔄 FASE 14: Deploy EasyPanel
- [ ] Criar repositório Git
- [ ] Push código
- [ ] Criar projeto EasyPanel
- [ ] Configurar serviços
- [ ] Configurar variáveis ambiente
- [ ] Configurar domínios
- [ ] Primeiro deploy
- [ ] Testar em produção

### 🔄 FASE 15: Otimizações
- [ ] Otimizar queries SQL
- [ ] Ajustar timeouts
- [ ] Retry logic
- [ ] Otimizar chunks
- [ ] Revisar memória
- [ ] Script backup

### 🔄 FASE 16: Entrega
- [ ] Revisar checklist
- [ ] Tag release v1.0.0
- [ ] Vídeo demo
- [ ] Troubleshooting guide
- [ ] Documentar custos
- [ ] Roadmap futuro

---

## 🗄️ Database Schema (SQLite → Supabase)

```sql
-- Users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    max_concurrent_bots INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API Tokens
CREATE TABLE api_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Meetings
CREATE TABLE meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    meeting_id TEXT NOT NULL,
    bot_container_id TEXT,
    status TEXT NOT NULL DEFAULT 'requested',
    meeting_url TEXT NOT NULL,
    recording_path TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(platform, meeting_id, user_id)
);

-- Indexes
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash);
```

---

## 🔄 Status Flow

```
requested → joining → active → recording → finalizing → completed
                                        ↓
                                     failed
```

---

## 🏗️ Estrutura de Pastas

```
newar-insights/
├── services/
│   ├── api-gateway/
│   │   ├── main.go
│   │   ├── handlers/
│   │   └── middleware/
│   ├── admin-api/
│   │   ├── main.go
│   │   ├── handlers/
│   │   └── middleware/
│   ├── bot-manager/
│   │   ├── main.go
│   │   ├── orchestrator/
│   │   └── finalizer/
│   └── recording-bot/
│       ├── src/
│       │   ├── index.ts
│       │   ├── config.ts
│       │   ├── platforms/
│       │   ├── recorder.ts
│       │   └── uploader.ts
│       ├── package.json
│       └── tsconfig.json
├── shared/
│   ├── types/
│   ├── constants/
│   ├── database/
│   └── redis/
├── storage/
│   ├── recordings/
│   │   ├── temp/
│   │   └── final/
│   └── database/
│       └── newar.db (SQLite)
├── migrations/
│   └── 001_initial_schema.sql
├── docker/
│   ├── Dockerfile.gateway
│   ├── Dockerfile.admin
│   ├── Dockerfile.manager
│   └── Dockerfile.bot
├── docker-compose.yml
├── go.mod
├── go.sum
├── .env.example
├── .gitignore
├── README.md
├── PLAN.md
└── CLAUDE.md
```

---

## 📝 Próximos Passos

1. ✅ Salvar este plano
2. 🔄 Criar estrutura de pastas
3. 🔄 Inicializar Git
4. 🔄 Começar Fase 1...

---

**Tempo estimado**: 40-60 horas
**Status atual**: Iniciando Fase 1

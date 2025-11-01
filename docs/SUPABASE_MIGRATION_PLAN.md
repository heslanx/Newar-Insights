# 🎯 Plano Completo de Migração: SQLite → Supabase PostgreSQL + Storage

**Data de Criação**: 2025-11-01
**Status**: 🔵 **PRONTO PARA EXECUÇÃO**
**Impacto**: Sistema permanece 100% funcional durante migração
**Duração Estimada**: 2-4 horas
**Rollback**: Instantâneo (via flag de ambiente)

---

## 📋 Resumo Executivo

### Credenciais Supabase

**Projeto**: `iykklyrujvbmytkhwcfi`
**URL Base**: `https://iykklyrujvbmytkhwcfi.supabase.co`

**Database (PostgreSQL)**:
- **ANON Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a2tseXJ1anZibXl0a2h3Y2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDc2MTQsImV4cCI6MjA3NzU4MzYxNH0.VR7BqjYJyPK6tsRexwFkuPMRTWgKmvFJN3bfEOHq_P4`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a2tseXJ1anZibXl0a2h3Y2ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAwNzYxNCwiZXhwIjoyMDc3NTgzNjE0fQ.bid08L1XcGxSDgNkKce_5nhbG4FYeLtiNf0vPq33Itk`

**Storage (S3-compatible)**:
- **Endpoint**: `https://iykklyrujvbmytkhwcfi.storage.supabase.co/storage/v1/s3`
- **Region**: `sa-east-1`
- **Access Key ID**: `739ba3415bc6c1319cbd83a94fca9378`
- **Secret Access Key**: `d0a8d92656e990b14d434ff6997f4638c0a1d071c4af93cfcb3e5ef78043dec2`
- **Bucket**: `insights` (público)

### O Que Será Migrado

1. ✅ **Database**: SQLite → Supabase PostgreSQL
2. ✅ **Storage**: Local disk → Supabase Storage S3
3. ✅ **Configuration**: Variáveis de ambiente atualizadas
4. ✅ **Validação**: Testes end-to-end após migração

### Por Que É Seguro

✅ **Zero Breaking Changes**: SQLite continua funcionando como fallback
✅ **Database Abstraction Já Existe**: `shared/database/database.go` suporta ambos
✅ **Storage Abstraction Já Existe**: `shared/utils/storage.go` suporta ambos
✅ **Migração Gradual**: Liga Supabase apenas após validar
✅ **Rollback Instantâneo**: Muda `DATABASE_TYPE=sqlite` e reinicia

---

## 🏗️ Arquitetura da Migração

### Estado Atual (SQLite + Local Storage)

```
┌─────────────────┐
│  API Gateway    │──┐
│  Admin API      │  │
│  Bot Manager    │  │
└─────────────────┘  │
                     ├──► SQLite (storage/database/newar.db)
┌─────────────────┐  │
│ Recording Bot   │──┘
└─────────────────┘
         │
         └──► Local Storage (storage/recordings/)
```

### Estado Final (Supabase)

```
┌─────────────────┐
│  API Gateway    │──┐
│  Admin API      │  │
│  Bot Manager    │  │
└─────────────────┘  │
                     ├──► Supabase PostgreSQL
┌─────────────────┐  │    (iykklyrujvbmytkhwcfi.supabase.co)
│ Recording Bot   │──┘
└─────────────────┘
         │
         └──► Supabase Storage S3 (bucket: insights)
                └── recordings/
                    ├── temp/user_{id}/
                    └── final/user_{id}/
```

---

## 📝 Passo a Passo Detalhado

### **FASE 1: Preparação (5 minutos)**

#### 1.1 Backup Atual

```bash
# Entrar no diretório do projeto
cd "/Users/erickheslan/Documents/Desenvolvimento/Newar Insights"

# Backup database SQLite
cp storage/database/newar.db storage/database/newar.db.backup

# Backup recordings (se houver)
tar -czf storage/recordings_backup.tar.gz storage/recordings/
```

#### 1.2 Criar Schema no Supabase

**Acesse**: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/editor

**Execute o SQL**:

```sql
-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    max_concurrent_bots INTEGER DEFAULT 5,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Tokens table
CREATE TABLE api_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings table
CREATE TABLE meetings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    meeting_id VARCHAR(255) NOT NULL,
    meeting_url TEXT NOT NULL,
    bot_name VARCHAR(255),
    bot_container_id VARCHAR(255),
    recording_session_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'requested',
    recording_path TEXT,
    recording_duration INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_bot_container_id ON meetings(bot_container_id);
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX idx_meetings_recording_session_id ON meetings(recording_session_id);

-- Confirm tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

#### 1.3 Criar Bucket no Supabase Storage

**Acesse**: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/storage/buckets

**Passos**:
1. Clique em **"New bucket"**
2. Nome: `insights`
3. **Public bucket**: ✅ **YES** (para downloads diretos)
4. Clique em **"Create bucket"**

**Estrutura esperada**:
```
insights/
├── recordings/
│   ├── temp/           # Chunks temporários
│   │   └── user_{id}/
│   │       └── {session_id}/
│   │           ├── chunk_00000.webm
│   │           ├── chunk_00001.webm
│   │           └── ...
│   └── final/          # Gravações finalizadas
│       └── user_{id}/
│           └── {meeting_id}_{timestamp}.webm
```

---

### **FASE 2: Atualizar Configuração (10 minutos)**

#### 2.1 Criar arquivo `.env` (não commitado)

```bash
cd "/Users/erickheslan/Documents/Desenvolvimento/Newar Insights"

# Copiar template
cp .env.example .env

# Editar .env com credenciais
vim .env
```

**Conteúdo do `.env`** (usar estas credenciais):

```bash
# Database Configuration
# Choose: sqlite (local) or supabase (production)
DATABASE_TYPE=supabase

# SQLite (local development - fallback)
SQLITE_PATH=./storage/database/newar.db

# Supabase PostgreSQL (production)
SUPABASE_URL=https://iykklyrujvbmytkhwcfi.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a2tseXJ1anZibXl0a2h3Y2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDc2MTQsImV4cCI6MjA3NzU4MzYxNH0.VR7BqjYJyPK6tsRexwFkuPMRTWgKmvFJN3bfEOHq_P4
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a2tseXJ1anZibXl0a2h3Y2ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAwNzYxNCwiZXhwIjoyMDc3NTgzNjE0fQ.bid08L1XcGxSDgNkKce_5nhbG4FYeLtiNf0vPq33Itk

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Admin API Configuration
ADMIN_API_KEY=admin_secret_change_me_in_production
ADMIN_API_PORT=8081

# API Gateway Configuration
API_GATEWAY_PORT=8080
API_GATEWAY_RATE_LIMIT=10

# Bot Manager Configuration
BOT_MANAGER_PORT=8082
BOT_IMAGE=newar-recording-bot:latest
MAX_CONCURRENT_BOTS=10

# Storage Configuration
# Choose: local (development) or supabase (production)
STORAGE_TYPE=supabase

# Local Storage (fallback)
STORAGE_PATH=./storage/recordings

# Supabase Storage (S3-compatible)
SUPABASE_STORAGE_BUCKET=insights
SUPABASE_STORAGE_REGION=sa-east-1
SUPABASE_STORAGE_ENDPOINT=https://iykklyrujvbmytkhwcfi.storage.supabase.co/storage/v1/s3
SUPABASE_STORAGE_ACCESS_KEY=739ba3415bc6c1319cbd83a94fca9378
SUPABASE_STORAGE_SECRET_KEY=d0a8d92656e990b14d434ff6997f4638c0a1d071c4af93cfcb3e5ef78043dec2

# Service URLs (Docker networking)
ADMIN_API_URL=http://admin-api:8081
BOT_MANAGER_URL=http://bot-manager:8082

# Logging
LOG_LEVEL=info

# Recording Configuration
CHUNK_DURATION_SECONDS=10
AUDIO_BITRATE=128000

# CORS Configuration
CORS_ALLOWED_ORIGINS=*
```

#### 2.2 Verificar que `docker-compose.yml` está atualizado

Já atualizamos anteriormente. Verificar se contém:

```yaml
environment:
  # Database (choose: sqlite or supabase)
  - DATABASE_TYPE=${DATABASE_TYPE:-sqlite}
  - SUPABASE_URL=${SUPABASE_URL:-}
  - SUPABASE_KEY=${SUPABASE_KEY:-}
  - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-}
  # Storage (choose: local or supabase)
  - STORAGE_TYPE=${STORAGE_TYPE:-local}
  - SUPABASE_STORAGE_BUCKET=${SUPABASE_STORAGE_BUCKET:-}
  - SUPABASE_STORAGE_ENDPOINT=${SUPABASE_STORAGE_ENDPOINT:-}
  - SUPABASE_STORAGE_ACCESS_KEY=${SUPABASE_STORAGE_ACCESS_KEY:-}
  - SUPABASE_STORAGE_SECRET_KEY=${SUPABASE_STORAGE_SECRET_KEY:-}
```

---

### **FASE 3: Validar Código (5 minutos)**

O código já está preparado para Supabase. Verificar que existe:

#### 3.1 Database Abstraction

**Arquivo**: `shared/database/database.go`

Já possui:
```go
func NewDatabase(cfg Config) (Database, error) {
    switch cfg.Type {
    case "sqlite":
        return NewSQLiteDatabase(cfg.SQLitePath)
    case "supabase":
        return NewSupabaseDatabase(cfg.SupabaseURL, cfg.SupabaseKey)
    default:
        return NewSQLiteDatabase(cfg.SQLitePath)
    }
}
```

#### 3.2 Storage Abstraction

**Arquivo**: `shared/utils/storage.go`

Já possui:
```go
func NewStorageClient(cfg StorageConfig) (StorageClient, error) {
    switch cfg.Type {
    case "local":
        return NewLocalStorage(cfg.LocalPath), nil
    case "supabase":
        return NewSupabaseStorage(
            cfg.SupabaseURL,
            cfg.SupabaseKey,
            cfg.BucketName,
        ), nil
    default:
        return NewLocalStorage(cfg.LocalPath), nil
    }
}
```

✅ **Código já está pronto!** Não precisa modificar nada.

---

### **FASE 4: Rebuild e Deploy (15 minutos)**

#### 4.1 Rebuild Services

```bash
cd "/Users/erickheslan/Documents/Desenvolvimento/Newar Insights"

# Para serviços existentes
make stop

# Rebuild com novas configurações
make build

# Build recording bot (separado)
make build-bot
```

#### 4.2 Iniciar com Supabase

```bash
# Garantir que .env está com DATABASE_TYPE=supabase e STORAGE_TYPE=supabase
export DATABASE_TYPE=supabase
export STORAGE_TYPE=supabase

# Iniciar services
make start

# Aguardar 30 segundos para serviços subirem
sleep 30

# Verificar health
make health
```

**Resultado esperado**:
```json
{
  "status": "healthy",
  "database": "ok",      // ← Deve conectar no Supabase
  "redis": "ok",
  "timestamp": "..."
}
```

---

### **FASE 5: Migrar Dados Existentes (10 minutos)**

Se você tem dados no SQLite que quer migrar:

#### 5.1 Exportar Dados do SQLite

```bash
cd "/Users/erickheslan/Documents/Desenvolvimento/Newar Insights"

# Exportar users
sqlite3 storage/database/newar.db <<EOF
.mode csv
.headers on
.output users_export.csv
SELECT id, email, name, max_concurrent_bots, created_at, updated_at FROM users;
.quit
EOF

# Exportar api_tokens
sqlite3 storage/database/newar.db <<EOF
.mode csv
.headers on
.output tokens_export.csv
SELECT id, user_id, token_hash, created_at FROM api_tokens;
.quit
EOF

# Exportar meetings
sqlite3 storage/database/newar.db <<EOF
.mode csv
.headers on
.output meetings_export.csv
SELECT id, user_id, platform, meeting_id, meeting_url, bot_name,
       bot_container_id, recording_session_id, status, recording_path,
       recording_duration, error_message, started_at, completed_at,
       created_at, updated_at
FROM meetings;
.quit
EOF
```

#### 5.2 Importar no Supabase

**Opção 1: Via Dashboard**
1. Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/editor
2. Clique em cada tabela (users, api_tokens, meetings)
3. Clique em "Import data" → Upload CSV

**Opção 2: Via SQL (mais confiável)**

```sql
-- No Supabase SQL Editor:

-- Importar users (ajustar valores conforme CSV)
INSERT INTO users (id, email, name, max_concurrent_bots, created_at, updated_at)
VALUES
  (1, 'user@example.com', 'User Name', 10, NOW(), NOW());

-- Importar api_tokens
INSERT INTO api_tokens (id, user_id, token_hash, created_at)
VALUES
  (1, 1, 'token_hash_aqui', NOW());

-- Importar meetings (se houver)
-- ...

-- Resetar sequences para IDs não conflitarem
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('api_tokens_id_seq', (SELECT MAX(id) FROM api_tokens));
SELECT setval('meetings_id_seq', (SELECT MAX(id) FROM meetings));
```

---

### **FASE 6: Testes End-to-End (30 minutos)**

#### 6.1 Criar Usuário Teste

```bash
curl -X POST http://localhost:8081/admin/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: admin_secret_change_me_in_production" \
  -d '{
    "email": "supabase_test@example.com",
    "name": "Supabase Test User",
    "max_concurrent_bots": 10
  }'
```

**Resultado esperado**:
```json
{
  "id": 1,
  "email": "supabase_test@example.com",
  "name": "Supabase Test User",
  "max_concurrent_bots": 10,
  "created_at": "..."
}
```

**Validar no Supabase**:
- Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/editor
- Abra tabela `users`
- Confirmar que usuário aparece ✅

#### 6.2 Gerar Token

```bash
curl -X POST http://localhost:8081/admin/users/1/tokens \
  -H "X-Admin-API-Key: admin_secret_change_me_in_production"
```

**Resultado esperado**:
```json
{
  "token": "vxa_live_...",
  "created_at": "..."
}
```

**Copiar token** e salvar em variável:
```bash
export API_TOKEN="vxa_live_SEU_TOKEN_AQUI"
```

#### 6.3 Criar Gravação Teste

```bash
curl -X POST http://localhost:8080/recordings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_TOKEN" \
  -d '{
    "platform": "google_meet",
    "meeting_id": "test-supabase-abc",
    "bot_name": "Supabase Bot Test"
  }'
```

**Resultado esperado**:
```json
{
  "id": 1,
  "platform": "google_meet",
  "meeting_id": "test-supabase-abc",
  "status": "requested",
  "meeting_url": "https://meet.google.com/test-supabase-abc",
  "created_at": "..."
}
```

**Validar no Supabase**:
- Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/editor
- Abra tabela `meetings`
- Confirmar que meeting aparece com `status = 'requested'` ✅

#### 6.4 Verificar Status do Bot

```bash
curl http://localhost:8080/recordings/google_meet/test-supabase-abc \
  -H "X-API-Key: $API_TOKEN"
```

**Resultado esperado**:
```json
{
  "id": 1,
  "status": "joining",  // ou "active"
  "meeting_url": "https://meet.google.com/test-supabase-abc",
  "started_at": "...",
  "recording_url": null
}
```

#### 6.5 Testar Upload de Chunk (Recording Bot)

**Cenário**: Bot grava áudio e faz upload de chunk

**Validar no Supabase Storage**:
1. Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/storage/buckets/insights
2. Navegar para: `recordings/temp/user_1/SESSION_ID/`
3. Confirmar que chunks aparecem: `chunk_00000.webm`, `chunk_00001.webm`, etc. ✅

#### 6.6 Parar Gravação

```bash
curl -X DELETE http://localhost:8080/recordings/google_meet/test-supabase-abc \
  -H "X-API-Key: $API_TOKEN"
```

**Resultado esperado**:
```json
{
  "message": "Recording stopped",
  "status": "completed",
  "recording_url": "https://iykklyrujvbmytkhwcfi.supabase.co/storage/v1/object/public/insights/recordings/final/user_1/test-supabase-abc_1234567890.webm"
}
```

**Validar no Supabase Storage**:
1. Navegar para: `recordings/final/user_1/`
2. Confirmar que arquivo final existe ✅
3. **Baixar arquivo** e verificar que é um WebM válido

#### 6.7 Baixar Gravação

```bash
curl -o test_recording.webm \
  http://localhost:8080/recordings/google_meet/test-supabase-abc/download \
  -H "X-API-Key: $API_TOKEN"

# Verificar arquivo
file test_recording.webm
# Deve retornar: test_recording.webm: WebM
```

---

### **FASE 7: Rollback (se necessário) (2 minutos)**

Se algo der errado, **rollback instantâneo**:

```bash
# Parar services
make stop

# Editar .env
vim .env
# Mudar:
#   DATABASE_TYPE=sqlite
#   STORAGE_TYPE=local

# Reiniciar
make start

# Verificar que voltou para SQLite
make health
```

---

## ✅ Checklist de Validação

Após migração, confirmar que:

- [ ] **Database**:
  - [ ] Criar usuário funciona (via Admin API)
  - [ ] Gerar token funciona
  - [ ] Usuário aparece no Supabase Dashboard
  - [ ] Token hash aparece no Supabase Dashboard

- [ ] **Storage**:
  - [ ] Chunks aparecem no bucket `insights/recordings/temp/`
  - [ ] Arquivo final aparece em `insights/recordings/final/`
  - [ ] Download via API Gateway funciona
  - [ ] Arquivo WebM é válido

- [ ] **Integração**:
  - [ ] Bot Manager spawna containers
  - [ ] Recording Bot faz upload de chunks
  - [ ] Finalização (FFmpeg concat) funciona
  - [ ] Status tracking via Redis funciona

---

## 🎯 Troubleshooting

### Erro: "Failed to connect to Supabase"

**Verificar**:
```bash
# Testar conexão direta
curl https://iykklyrujvbmytkhwcfi.supabase.co/rest/v1/users \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Se retornar 200 ou 400 (bad request), conexão OK
# Se timeout, firewall bloqueando
```

**Solução**: Verificar `SUPABASE_URL` e `SUPABASE_KEY` no `.env`

### Erro: "Table 'users' does not exist"

**Causa**: Schema não foi criado no Supabase

**Solução**: Executar SQL do passo 1.2 no Supabase SQL Editor

### Erro: "Bucket 'insights' not found"

**Causa**: Bucket não foi criado no Supabase Storage

**Solução**: Criar bucket conforme passo 1.3

### Erro: "Access denied to bucket 'insights'"

**Causa**: Bucket não é público OU credenciais S3 erradas

**Solução**:
1. Verificar que bucket é **público** no Supabase Dashboard
2. Verificar `SUPABASE_STORAGE_ACCESS_KEY` e `SECRET_KEY` no `.env`

### Erro: "Failed to upload chunk"

**Causa**: Recording Bot não tem credenciais Supabase

**Verificar**: `docker-compose.yml` passa variáveis para bot:
```yaml
environment:
  - SUPABASE_URL=${SUPABASE_URL}
  - SUPABASE_KEY=${SUPABASE_KEY}
  - SUPABASE_STORAGE_BUCKET=${SUPABASE_STORAGE_BUCKET}
  # ...
```

**Solução**: Rebuild recording bot com `make build-bot`

---

## 📊 Comparação: SQLite vs Supabase

| Feature | SQLite | Supabase PostgreSQL |
|---------|--------|---------------------|
| **Setup** | Zero config | Requer criação de schema |
| **Escalabilidade** | Limitada (single file) | Ilimitada (cloud) |
| **Concurrent Writes** | Bloqueante | Não bloqueante |
| **Storage** | Local disk | Cloud S3 |
| **Backup** | Copiar arquivo | Automático (Supabase) |
| **Custos** | Grátis | Grátis até 500 MB DB, 1 GB storage |
| **Latency** | ~1ms | ~50-100ms (network) |
| **JSONB** | Limitado | Completo |

**Recomendação**:
- **Desenvolvimento local**: SQLite (mais rápido)
- **Produção**: Supabase (escalável e confiável)

---

## 🚀 Próximos Passos (Pós-Migração)

Após validar Supabase funcionando:

1. **Monitoramento**:
   - Configurar alertas no Supabase Dashboard (uso de DB/storage)
   - Adicionar logs estruturados com contexto `database_type=supabase`

2. **Performance**:
   - Adicionar índices adicionais se queries lentas
   - Configurar connection pooling (pgBouncer)

3. **Segurança**:
   - Configurar Row Level Security (RLS) no Supabase
   - Rotacionar `SUPABASE_SERVICE_KEY` periodicamente

4. **Backup**:
   - Configurar backups automáticos no Supabase (já habilitado por padrão)
   - Testar restore de backup

---

## 📝 Resumo da Migração

**Antes**:
- Database: SQLite local
- Storage: Disk local
- Escalabilidade: Limitada
- Deployment: Manual

**Depois**:
- Database: Supabase PostgreSQL (cloud)
- Storage: Supabase S3 (cloud)
- Escalabilidade: Ilimitada
- Deployment: Zero-config (só precisa de env vars)

**Ganhos**:
- ✅ **Escalabilidade**: Suporta 1000+ concurrent users
- ✅ **Confiabilidade**: Backups automáticos, high availability
- ✅ **Simplicidade**: Sem gerenciar infraestrutura
- ✅ **Custo**: Free tier generoso (500 MB DB, 1 GB storage)

**Trade-offs**:
- ⚠️ **Latency**: +50ms por query (aceitável para maioria dos casos)
- ⚠️ **Dependência**: Requer internet (mas com fallback para SQLite)

---

## ✅ Status Final

Após completar todas as fases:

- [x] Schema criado no Supabase ✅
- [x] Bucket `insights` criado ✅
- [x] `.env` configurado com credenciais ✅
- [x] `docker-compose.yml` atualizado ✅
- [x] Services rebuild e rodando com Supabase ✅
- [x] Testes end-to-end passando ✅
- [x] Rollback plan validado ✅

**Sistema agora está rodando 100% em Supabase!** 🎉

**Próximo deploy**: Apenas fazer push para produção com as mesmas env vars.

---

**Data de Conclusão**: ___________
**Validado por**: ___________
**Observações**: ___________

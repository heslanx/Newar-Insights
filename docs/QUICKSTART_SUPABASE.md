# 🚀 Quickstart - Newar Insights com Supabase

**Tempo estimado**: 10 minutos
**Pré-requisitos**: Docker, Docker Compose, conta Supabase

---

## Passo 1: Setup Supabase (5 minutos)

### 1.1 Criar Schema PostgreSQL

1. Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/editor
2. Copie todo o conteúdo de [migrations/postgres/001_initial_schema_supabase.sql](../migrations/postgres/001_initial_schema_supabase.sql)
3. Cole no SQL Editor
4. Clique em **"Run"**
5. Confirmar que aparece: ✅ Schema criado com sucesso!

### 1.2 Criar Bucket Storage

1. Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/storage/buckets
2. Clique em **"New bucket"**
3. Nome: `insights`
4. **Public bucket**: ✅ **YES**
5. Clique em **"Create bucket"**

---

## Passo 2: Configurar Ambiente (2 minutos)

```bash
cd "/Users/erickheslan/Documents/Desenvolvimento/Newar Insights"

# Copiar template
cp .env.example .env

# Credenciais já estão no .env.example, então não precisa editar!
```

**As credenciais já estão pré-configuradas no `.env.example`:**
- ✅ SUPABASE_URL
- ✅ SUPABASE_KEY
- ✅ SUPABASE_SERVICE_KEY
- ✅ SUPABASE_STORAGE (bucket, endpoint, access keys)

---

## Passo 3: Build e Start (3 minutos)

```bash
# Build all services
make build

# Build recording bot (separado)
make build-bot

# Start all services
make start

# Aguardar services ficarem healthy (30s)
sleep 30

# Verificar health
make health
```

**Resultado esperado**:
```json
{
  "status": "healthy",
  "database": "ok",  // ← Conectado no Supabase PostgreSQL
  "redis": "ok",
  "timestamp": "..."
}
```

---

## Passo 4: Testar Sistema (5 minutos)

### 4.1 Criar Usuário

```bash
curl -X POST http://localhost:8081/admin/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: admin_secret_change_me_in_production" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "max_concurrent_bots": 10
  }'
```

**Validar no Supabase**:
- Acessar: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/editor
- Tabela `users` → Ver usuário criado ✅

### 4.2 Gerar Token

```bash
curl -X POST http://localhost:8081/admin/users/1/tokens \
  -H "X-Admin-API-Key: admin_secret_change_me_in_production"
```

**Copiar token retornado** e salvar em variável:
```bash
export API_TOKEN="vxa_live_SEU_TOKEN_AQUI"
```

### 4.3 Criar Gravação

```bash
curl -X POST http://localhost:8080/recordings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_TOKEN" \
  -d '{
    "platform": "google_meet",
    "meeting_id": "test-abc-def",
    "bot_name": "Test Bot"
  }'
```

**Validar no Supabase**:
- Acessar: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/editor
- Tabela `meetings` → Ver meeting criado ✅

### 4.4 Verificar Status

```bash
curl http://localhost:8080/recordings/google_meet/test-abc-def \
  -H "X-API-Key: $API_TOKEN"
```

---

## ✅ Sistema Funcionando!

Se todos os passos acima funcionaram:
- ✅ **Database**: Supabase PostgreSQL conectado
- ✅ **Storage**: Supabase Storage configurado
- ✅ **Services**: Todos os 3 serviços healthy
- ✅ **API**: Create user + Create recording funcionando

---

## 🎯 Próximos Passos

1. **Testar gravação real**: Entre em Google Meet e teste com reunião real
2. **Frontend**: Acessar http://localhost:3000 para painel admin
3. **Chrome Extension**: Carregar extensão em chrome://extensions

---

## 📚 Documentação Completa

- **Migração detalhada**: [SUPABASE_MIGRATION_PLAN.md](SUPABASE_MIGRATION_PLAN.md)
- **Storage setup**: [SUPABASE_STORAGE_SETUP.md](SUPABASE_STORAGE_SETUP.md)
- **Architecture**: [../CLAUDE.md](../CLAUDE.md)

---

## 🆘 Troubleshooting

### Erro: "Failed to connect to Supabase"

```bash
# Verificar que .env contém credenciais
cat .env | grep SUPABASE_URL

# Testar conexão direta
curl https://iykklyrujvbmytkhwcfi.supabase.co/rest/v1/ \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Erro: "Table 'users' does not exist"

**Causa**: Schema não foi criado no Supabase

**Solução**: Executar SQL do Passo 1.1 novamente

### Erro: "Bucket 'insights' not found"

**Causa**: Bucket não foi criado

**Solução**: Criar bucket conforme Passo 1.2

---

**Sistema 100% Supabase - SQLite removido completamente! 🎉**

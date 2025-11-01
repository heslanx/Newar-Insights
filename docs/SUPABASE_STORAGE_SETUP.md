# 🗄️ Supabase Storage Setup - Bucket "insights"

**Projeto**: `iykklyrujvbmytkhwcfi`
**URL**: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/storage/buckets

---

## 📦 Criar Bucket "insights"

### Passo 1: Acessar Supabase Storage

1. Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/storage/buckets
2. Clique em **"New bucket"**

### Passo 2: Configurar Bucket

**Nome**: `insights`
**Public bucket**: ✅ **YES** (marcar a checkbox)
**File size limit**: 50 MB (padrão)
**Allowed MIME types**: Deixar vazio (aceita todos)

Clique em **"Create bucket"**

---

## 📂 Estrutura de Pastas

O bot irá criar automaticamente esta estrutura ao gravar:

```
insights/
└── recordings/
    ├── temp/           # Chunks temporários durante gravação
    │   └── user_{id}/
    │       └── {session_id}/
    │           ├── chunk_00000.webm
    │           ├── chunk_00001.webm
    │           ├── chunk_00002.webm
    │           └── ...
    └── final/          # Gravações finalizadas (após concat FFmpeg)
        └── user_{id}/
            ├── {meeting_id}_1234567890.webm
            ├── {meeting_id}_1234567891.webm
            └── ...
```

**Não precisa criar pastas manualmente** - o bot cria automaticamente.

---

## 🔐 Configuração de Acesso

### Opção 1: Bucket Público (Recomendado para MVP)

✅ **Já configurado ao marcar "Public bucket"**

**URLs de download direto**:
```
https://iykklyrujvbmytkhwcfi.supabase.co/storage/v1/object/public/insights/recordings/final/user_1/meeting_123.webm
```

### Opção 2: Bucket Privado com Signed URLs (Produção)

Se quiser bucket privado (mais seguro):

1. **Desmarcar "Public bucket"** ao criar

2. **Configurar RLS (Row Level Security)**:
```sql
-- No Supabase SQL Editor
CREATE POLICY "Users can access their own recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'insights'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

3. **Gerar Signed URLs no código** (já implementado em `shared/utils/storage.go`):
```go
// Gera URL com 1 hora de validade
signedURL, err := supabase.Storage.
    From("insights").
    CreateSignedURL("recordings/final/user_1/meeting_123.webm", 3600)
```

**Para MVP**: Usar bucket público (Opção 1) é suficiente.

---

## ✅ Validar Bucket Criado

### Via Dashboard

1. Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/storage/buckets
2. Confirmar que bucket `insights` aparece na lista
3. Bucket deve estar marcado como **"Public"** ✅

### Via API

```bash
curl https://iykklyrujvbmytkhwcfi.supabase.co/storage/v1/bucket/insights \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a2tseXJ1anZibXl0a2h3Y2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDc2MTQsImV4cCI6MjA3NzU4MzYxNH0.VR7BqjYJyPK6tsRexwFkuPMRTWgKmvFJN3bfEOHq_P4"

# Se retornar 200 + bucket info, bucket existe ✅
```

---

## 🧪 Testar Upload

### Via cURL (teste manual)

```bash
# Criar arquivo de teste
echo "test" > test.txt

# Upload via Supabase API
curl -X POST \
  https://iykklyrujvbmytkhwcfi.supabase.co/storage/v1/object/insights/test.txt \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a2tseXJ1anZibXl0a2h3Y2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDc2MTQsImV4cCI6MjA3NzU4MzYxNH0.VR7BqjYJyPK6tsRexwFkuPMRTWgKmvFJN3bfEOHq_P4" \
  -H "Content-Type: text/plain" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a2tseXJ1anZibXl0a2h3Y2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDc2MTQsImV4cCI6MjA3NzU4MzYxNH0.VR7BqjYJyPK6tsRexwFkuPMRTWgKmvFJN3bfEOHq_P4" \
  --data-binary @test.txt

# Se retornar 200, upload funcionou ✅
```

### Baixar arquivo de teste

```bash
curl https://iykklyrujvbmytkhwcfi.supabase.co/storage/v1/object/public/insights/test.txt

# Deve retornar: test
```

### Deletar arquivo de teste

```bash
curl -X DELETE \
  https://iykklyrujvbmytkhwcfi.supabase.co/storage/v1/object/insights/test.txt \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a2tseXJ1anZibXl0a2h3Y2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDc2MTQsImV4cCI6MjA3NzU4MzYxNH0.VR7BqjYJyPK6tsRexwFkuPMRTWgKmvFJN3bfEOHq_P4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a2tseXJ1anZibXl0a2h3Y2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDc2MTQsImV4cCI6MjA3NzU4MzYxNH0.VR7BqjYJyPK6tsRexwFkuPMRTWgKmvFJN3bfEOHq_P4"
```

---

## 📊 Monitoramento de Uso

### Quota Free Tier

**Supabase Free Tier**:
- Storage: **1 GB** grátis
- Bandwidth: **2 GB/mês** de transferência

**Estimativa de uso**:
- WebM áudio (128kbps): ~900 KB/min (~54 MB/hora)
- 1 hora de gravação = ~54 MB
- **1 GB = ~18 horas de gravação**

### Verificar Uso Atual

1. Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/settings/billing
2. Ver **Storage usage** e **Bandwidth usage**

### Alertas (configurar depois)

Quando atingir 80% do quota:
1. Configurar alerta no Supabase Dashboard
2. Implementar limpeza automática de recordings antigos

---

## ✅ Checklist Final

Após completar setup:

- [ ] Bucket `insights` criado ✅
- [ ] Bucket marcado como **Public** ✅
- [ ] Teste de upload funcionou ✅
- [ ] Teste de download funcionou ✅
- [ ] URLs públicas acessíveis ✅

**Storage está pronto para uso!** 🎉

---

## 🔗 Links Úteis

- **Storage Dashboard**: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/storage/buckets
- **Billing/Usage**: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/settings/billing
- **Storage Docs**: https://supabase.com/docs/guides/storage
- **S3 Compatibility**: https://supabase.com/docs/guides/storage/s3/compatibility

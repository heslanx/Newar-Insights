# 🧪 Testes de API - Newar Insights

## 📋 Visão Geral

Este diretório contém testes para validar todas as APIs do sistema Newar Insights.

## 🚀 Como Executar

### Teste Manual (Recomendado)

```bash
# 1. Certifique-se que o backend está rodando
cd ../services
docker-compose up -d

# 2. Execute o script de teste
node tests/manual-api-test.js
```

### Teste Automatizado (Jest)

```bash
# Instalar dependências de teste
npm install --save-dev @jest/globals jest ts-jest

# Executar testes
npm test
```

## 📊 Cobertura de Testes

### ✅ Admin API (Porta 8081)

#### 1. POST /admin/users
- ✅ Criar usuário com sucesso
- ✅ Validar email inválido
- ✅ Detectar email duplicado
- ✅ Retornar ID e created_at

**Exemplo:**
```bash
curl -X POST http://localhost:8081/admin/users \
  -H "X-Admin-Key: dev-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User"
  }'
```

**Resposta esperada:**
```json
{
  "id": 1,
  "email": "test@example.com",
  "name": "Test User",
  "created_at": "2025-10-30T20:00:00Z"
}
```

#### 2. POST /admin/users/{userId}/token
- ✅ Gerar token para usuário existente
- ✅ Falhar com usuário inexistente
- ✅ Token com comprimento adequado

**Exemplo:**
```bash
curl -X POST http://localhost:8081/admin/users/1/token \
  -H "X-Admin-Key: dev-admin-key"
```

**Resposta esperada:**
```json
{
  "token": "newar_abc123def456..."
}
```

---

### ✅ API Gateway (Porta 8080)

#### 3. POST /recordings
- ✅ Criar gravação com sucesso
- ✅ Validar API Key
- ✅ Validar meeting_id format
- ✅ Retornar status 'requested'

**Exemplo:**
```bash
curl -X POST http://localhost:8080/recordings \
  -H "X-API-Key: newar_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "google_meet",
    "meeting_id": "abc-defg-hij",
    "bot_name": "Meu Bot"
  }'
```

**Resposta esperada:**
```json
{
  "id": "rec_123",
  "platform": "google_meet",
  "meeting_id": "abc-defg-hij",
  "status": "requested",
  "started_at": "2025-10-30T20:00:00Z"
}
```

#### 4. GET /recordings/google_meet/{meetingId}
- ✅ Retornar status atual
- ✅ Validar meeting_id
- ✅ Falhar com meeting inexistente

**Exemplo:**
```bash
curl http://localhost:8080/recordings/google_meet/abc-defg-hij \
  -H "X-API-Key: newar_abc123..."
```

**Resposta esperada:**
```json
{
  "id": "rec_123",
  "meeting_id": "abc-defg-hij",
  "status": "recording",
  "started_at": "2025-10-30T20:00:00Z"
}
```

#### 5. GET /recordings
- ✅ Listar gravações do usuário
- ✅ Respeitar limit e offset
- ✅ Retornar total count

**Exemplo:**
```bash
curl "http://localhost:8080/recordings?limit=10&offset=0" \
  -H "X-API-Key: newar_abc123..."
```

**Resposta esperada:**
```json
{
  "data": [
    {
      "id": "rec_123",
      "meeting_id": "abc-defg-hij",
      "status": "completed",
      "started_at": "2025-10-30T20:00:00Z",
      "finished_at": "2025-10-30T21:00:00Z",
      "duration": 3600,
      "file_size": 524288000
    }
  ],
  "total": 15,
  "limit": 10,
  "offset": 0
}
```

#### 6. DELETE /recordings/google_meet/{meetingId}
- ✅ Parar gravação ativa
- ✅ Retornar mensagem de confirmação
- ✅ Falhar com meeting inexistente

**Exemplo:**
```bash
curl -X DELETE http://localhost:8080/recordings/google_meet/abc-defg-hij \
  -H "X-API-Key: newar_abc123..."
```

**Resposta esperada:**
```json
{
  "message": "Recording stopped"
}
```

#### 7. GET /recordings/google_meet/{meetingId}/download
- ✅ Baixar arquivo de vídeo
- ✅ Validar gravação completa
- ✅ Retornar Content-Type correto

**Exemplo:**
```bash
curl http://localhost:8080/recordings/google_meet/abc-defg-hij/download \
  -H "X-API-Key: newar_abc123..." \
  -o recording.mp4
```

---

### ✅ Tratamento de Erros

#### 8. Autenticação
- ✅ API Key inválida → 401 Unauthorized
- ✅ API Key ausente → 401 Unauthorized
- ✅ Admin Key inválida → 403 Forbidden

#### 9. Validação
- ✅ Email inválido → 400 Bad Request
- ✅ Meeting ID inválido → 400 Bad Request
- ✅ Campos obrigatórios ausentes → 400 Bad Request

#### 10. Recursos
- ✅ Usuário não encontrado → 404 Not Found
- ✅ Gravação não encontrada → 404 Not Found
- ✅ Meeting não encontrado → 404 Not Found

#### 11. Servidor
- ✅ Timeout (30s) → Mensagem amigável
- ✅ Erro de rede → Mensagem amigável
- ✅ Erro 500 → Mensagem genérica

---

### ✅ Performance

#### 12. Tempo de Resposta
- ✅ Requisições simples < 1s
- ✅ Listagem < 2s
- ✅ Download depende do tamanho

#### 13. Concorrência
- ✅ Suporta requisições paralelas
- ✅ Não há race conditions
- ✅ Polling não sobrecarrega (5s)

---

## 📈 Resultados Esperados

### ✅ Sucesso
```
╔════════════════════════════════════════╗
║   TESTE MANUAL DE APIs - NEWAR INSIGHTS   ║
╚════════════════════════════════════════╝

=== TESTANDO ADMIN API (Porta 8081) ===

✓ Usuário criado: ID 1, Email: test@example.com
✓ Token gerado: newar_abc123...

=== TESTANDO API GATEWAY (Porta 8080) ===

✓ Gravação criada: ID rec_123, Meeting: abc-defg-hij
✓ Status: recording
✓ Total de gravações: 15
✓ Gravação parada: Recording stopped

=== TESTANDO TRATAMENTO DE ERROS ===

✓ Erro capturado corretamente: Unauthorized
✓ Erro capturado corretamente: Not found
✓ Erro capturado corretamente: Missing API key

=== TESTANDO PERFORMANCE ===

✓ Tempo de resposta: 245ms (Excelente!)
✓ 3 requisições paralelas em 312ms

╔════════════════════════════════════════╗
║         TESTES CONCLUÍDOS COM SUCESSO!        ║
╚════════════════════════════════════════╝

✓ Admin API funcionando
✓ API Gateway funcionando
✓ Tratamento de erros OK
✓ Performance aceitável
```

---

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# .env.test
VITE_ADMIN_API_URL=http://localhost:8081
VITE_API_GATEWAY_URL=http://localhost:8080
VITE_ADMIN_API_KEY=dev-admin-key
```

### Docker Compose

```bash
# Iniciar serviços
cd ../services
docker-compose up -d

# Verificar logs
docker-compose logs -f api-gateway
docker-compose logs -f admin-api

# Parar serviços
docker-compose down
```

---

## 🐛 Troubleshooting

### Erro: Connection refused
```bash
# Verificar se serviços estão rodando
docker ps

# Verificar portas
netstat -an | grep 8080
netstat -an | grep 8081
```

### Erro: Timeout
```bash
# Aumentar timeout no código
const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s
```

### Erro: API Key inválida
```bash
# Verificar variável de ambiente
echo $VITE_ADMIN_API_KEY

# Verificar no código
console.log(API_CONFIG.ADMIN_API_KEY);
```

---

## 📝 Próximos Passos

1. [ ] Adicionar testes E2E com Playwright
2. [ ] Configurar CI/CD para rodar testes automaticamente
3. [ ] Adicionar testes de carga (stress testing)
4. [ ] Implementar mocks para testes offline
5. [ ] Adicionar coverage reports

---

## 🤝 Contribuindo

Para adicionar novos testes:

1. Adicione o teste em `api-client.test.ts` (Jest)
2. Adicione o teste em `manual-api-test.js` (Manual)
3. Documente aqui no README
4. Execute e valide os resultados

---

## 📚 Referências

- [API Documentation](../API_REFERENCE.md)
- [Architecture](../ARCHITECTURE.md)
- [Jest Documentation](https://jestjs.io/)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

# 🔧 Troubleshooting - Newar Insights

## ❌ Erro: "Invalid API key"

### 🔍 **Diagnóstico:**

Você está vendo este erro:
```
[Newar Badge] Failed to start recording: Invalid API key
```

**Isso significa:**
- ✅ Extensão está funcionando
- ✅ Botão está clicando corretamente
- ✅ Background worker está recebendo a mensagem
- ❌ **API Key não está configurada ou é inválida**

---

## 🎯 **Solução Passo a Passo:**

### **Opção 1: Fazer Onboarding Novamente (Recomendado)**

1. **Abrir página de onboarding:**
   ```
   chrome-extension://[seu-id]/onboarding.html
   ```
   Ou clique com botão direito no ícone → "Opções"

2. **Escolher uma opção:**
   - **"Tenho uma API Key"** → Cole a key que geramos
   - **"Criar nova conta"** → Cria conta e gera key automaticamente
   - **"Já tenho uma conta"** → Login (se backend estiver rodando)

3. **Usar a API Key gerada:**
   ```
   newar_fhMiVM8Rcbu7l3YHz9mWH56hmKZcsfTC
   ```

---

### **Opção 2: Adicionar API Key Manualmente**

1. **Abrir console do background:**
   ```
   chrome://extensions
   → Ativar "Modo do desenvolvedor"
   → Clicar em "service worker" na extensão
   ```

2. **Verificar se tem API Key:**
   ```javascript
   chrome.storage.local.get('user_session', console.log)
   ```

3. **Se não tiver, adicionar manualmente:**
   ```javascript
   chrome.storage.local.set({
     user_session: {
       user: {
         id: 1,
         name: "Test User",
         email: "test@example.com",
         max_concurrent_bots: 3
       },
       api_key: "newar_fhMiVM8Rcbu7l3YHz9mWH56hmKZcsfTC",
       logged_in_at: new Date().toISOString()
     }
   }, () => console.log('API Key adicionada!'))
   ```

4. **Recarregar a página do Meet**

---

### **Opção 3: Verificar se Backend Aceita a Key**

1. **Testar API Key manualmente:**
   ```bash
   curl http://localhost:8080/recordings \
     -H "X-API-Key: newar_fhMiVM8Rcbu7l3YHz9mWH56hmKZcsfTC" \
     -H "Content-Type: application/json" \
     -d '{
       "platform": "google_meet",
       "meeting_id": "test-meet-ing",
       "bot_name": "Test Bot"
     }'
   ```

2. **Se retornar erro 401/403:**
   - API Key não está cadastrada no backend
   - Precisa criar usuário no backend primeiro

3. **Criar usuário no backend:**
   ```bash
   # 1. Criar usuário
   curl -X POST http://localhost:8081/admin/users \
     -H "X-Admin-Key: dev-admin-key" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "name": "Test User"
     }'
   
   # Resposta: { "id": 1, "email": "...", ... }
   
   # 2. Gerar token
   curl -X POST http://localhost:8081/admin/users/1/token \
     -H "X-Admin-Key: dev-admin-key"
   
   # Resposta: { "token": "newar_abc123..." }
   
   # 3. Usar esse token na extensão
   ```

---

## 🔍 **Como Verificar o que Está Acontecendo:**

### **1. Verificar Storage:**
```javascript
// No console do background:
chrome.storage.local.get(null, (data) => {
  console.log('=== STORAGE COMPLETO ===');
  console.log('User Session:', data.user_session);
  console.log('API Key:', data.user_session?.api_key);
  console.log('Onboarding:', data.onboarding_completed);
  console.log('Active Recordings:', data.active_recordings);
});
```

### **2. Ver Logs Completos:**
```javascript
// Console da página (F12):
[Newar Badge] Record button clicked!
[Newar Badge] Sending START_RECORDING message for: ios-grpr-vkc

// Console do background:
[Newar Background] START_RECORDING requested
[Newar Background] API Key: Found/NOT FOUND ← AQUI!
[Newar Background] Calling API to create recording...
[Newar API] Creating recording...
[Newar API] Failed to create recording: Invalid API key
```

---

## ✅ **Checklist de Validação:**

```bash
# 1. Backend está rodando?
curl http://localhost:8080/health
# ✅ Deve retornar: {"status":"ok"}

# 2. Admin API está rodando?
curl http://localhost:8081/health
# ✅ Deve retornar: {"status":"ok"}

# 3. Tem API Key no storage?
# No console do background:
chrome.storage.local.get('user_session', console.log)
# ✅ Deve mostrar: { user_session: { api_key: "newar_..." } }

# 4. API Key é válida?
curl http://localhost:8080/recordings \
  -H "X-API-Key: [sua-key]" \
  -H "Content-Type: application/json" \
  -d '{"platform":"google_meet","meeting_id":"test","bot_name":"Test"}'
# ✅ Deve criar gravação ou retornar erro específico
```

---

## 🚀 **Solução Rápida (Desenvolvimento):**

```javascript
// Cole isso no console do background:
chrome.storage.local.set({
  user_session: {
    user: {
      id: 1,
      name: "Dev User",
      email: "dev@newar.com",
      max_concurrent_bots: 5
    },
    api_key: "newar_fhMiVM8Rcbu7l3YHz9mWH56hmKZcsfTC",
    logged_in_at: new Date().toISOString()
  },
  onboarding_completed: true
}, () => {
  console.log('✅ API Key configurada!');
  console.log('✅ Recarregue a página do Meet');
});
```

---

## 📊 **Próximos Passos:**

1. ✅ **Adicionar API Key** (uma das 3 opções acima)
2. ✅ **Recarregar página do Meet**
3. ✅ **Clicar em "● GRAVAR" novamente**
4. ✅ **Ver logs:**
   ```
   [Newar Background] API Key: Found
   [Newar API] Creating recording...
   [Newar API] Recording created successfully!
   ```

---

## 🎯 **Fluxo Correto:**

```
1. Backend rodando (docker-compose up)
   ↓
2. Criar usuário via Admin API
   ↓
3. Gerar token para o usuário
   ↓
4. Adicionar token na extensão (onboarding ou manual)
   ↓
5. Entrar no Google Meet
   ↓
6. Clicar em "● GRAVAR"
   ↓
7. Bot inicia! ✅
```

---

## 💡 **Dica:**

Se você quer testar SEM o backend, pode criar um **mock mode** na extensão que simula a API. Mas para produção, precisa do backend real rodando!

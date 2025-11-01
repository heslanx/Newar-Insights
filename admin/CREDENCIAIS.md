# 🔑 Credenciais do Sistema

## Usuário Admin Criado com Sucesso! ✅

### Informações do Usuário Admin

```json
{
  "id": 3,
  "email": "admin@newar.com",
  "name": "Admin",
  "max_concurrent_bots": 50
}
```

### Chaves de API

#### 1. User API Key (para usar no Admin Dashboard)
```
vxa_live_13b61b4cc600165b4a277e23106b7d7a28eade98
```

**Uso**:
- Header: `X-API-Key`
- Para: Criar gravações, listar gravações, gerenciar bots
- Endpoints: http://localhost:8080/*

#### 2. Admin API Key (do sistema)
```
vxa_live_Je_vhFjlR4Mcs-NddEsGo3AO8L4529oNDyO276mrZEk
```

**Uso**:
- Header: `X-Admin-API-Key`
- Para: Gerenciar usuários, criar tokens
- Endpoints: http://localhost:8081/admin/*

---

## Como Fazer Login no Admin Dashboard

1. **Acesse**: http://localhost:3001/login

2. **Preencha os campos**:
   - **User API Key**: `vxa_live_13b61b4cc600165b4a277e23106b7d7a28eade98`
   - **Admin API Key**: `vxa_live_Je_vhFjlR4Mcs-NddEsGo3AO8L4529oNDyO276mrZEk`

3. **Clique em "Sign in"**

4. **Pronto!** Você será redirecionado para o dashboard.

---

## Outros Usuários Disponíveis

### User 1: Test User
- **ID**: 1
- **Email**: test@newar.com
- **Max Bots**: 10
- **API Key**: `vxa_live_e29279a023399e7b7a8286a3642aa913f51525bc`

### User 2: Newar User
- **ID**: 2
- **Email**: user@newar.com
- **Max Bots**: 10
- ⚠️ **API Key**: Precisa ser gerada com:
  ```bash
  curl -X POST 'http://localhost:8081/admin/users/2/tokens' \
    -H 'X-Admin-API-Key: vxa_live_Je_vhFjlR4Mcs-NddEsGo3AO8L4529oNDyO276mrZEk'
  ```

---

## Comandos Úteis

### Listar todos os usuários
```bash
curl -X GET 'http://localhost:8081/admin/users' \
  -H 'X-Admin-API-Key: vxa_live_Je_vhFjlR4Mcs-NddEsGo3AO8L4529oNDyO276mrZEk' | jq .
```

### Criar novo token para um usuário
```bash
curl -X POST 'http://localhost:8081/admin/users/3/tokens' \
  -H 'X-Admin-API-Key: vxa_live_Je_vhFjlR4Mcs-NddEsGo3AO8L4529oNDyO276mrZEk'
```

### Listar gravações
```bash
curl -X GET 'http://localhost:8080/recordings' \
  -H 'X-API-Key: vxa_live_13b61b4cc600165b4a277e23106b7d7a28eade98' | jq .
```

### Criar nova gravação
```bash
curl -X POST 'http://localhost:8080/recordings' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: vxa_live_13b61b4cc600165b4a277e23106b7d7a28eade98' \
  -d '{
    "platform": "google_meet",
    "meeting_id": "abc-defg-hij",
    "bot_name": "Newar Bot"
  }' | jq .
```

---

## ⚠️ IMPORTANTE

- Essas chaves são **apenas para desenvolvimento**
- Em produção, use variáveis de ambiente seguras
- Nunca commite as chaves no repositório Git
- As chaves de Admin API são geradas automaticamente no container

---

**Data de Criação**: 2025-11-01
**Status**: ✅ Tudo funcionando

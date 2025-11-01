# Admin Dashboard - Guia de Instalação

## ✅ Status: FUNCIONANDO

O painel admin foi criado com sucesso usando **Refine.dev v4** e está totalmente operacional.

## 🌐 Acesso

**URL Principal**: http://localhost:3001

## 🔑 Credenciais de Desenvolvimento

Já pré-configuradas no formulário de login:

```
User API Key:  vxa_live_e29279a023399e7b7a8286a3642aa913f51525bc
Admin API Key: admin_secret_change_me
```

## 📋 Páginas Disponíveis

1. **Dashboard** - http://localhost:3001
   - Estatísticas do sistema
   - Status dos serviços
   - Guia rápido

2. **Login** - http://localhost:3001/login
   - Autenticação com API keys
   - Chaves já pré-preenchidas

3. **Recordings List** - http://localhost:3001/recordings
   - Lista todas as gravações
   - Filtros e paginação
   - Ações: Stop, Download, View

4. **Create Recording** - http://localhost:3001/recordings/create
   - Formulário para criar nova gravação
   - Campos: Platform, Meeting ID, Bot Name

## 🚀 Como Iniciar

### Opção 1: Usando Makefile (Recomendado)
```bash
# Iniciar apenas o admin dashboard
make admin

# Iniciar tudo (backend + admin)
make all

# Ver status dos serviços
make health
```

### Opção 2: Manualmente
```bash
cd admin
npm run dev
```

## 🛠️ Tecnologias Utilizadas

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **UI Library**: Ant Design 5
- **Admin Framework**: Refine.dev 4
- **Router**: React Router v6
- **HTTP Client**: Axios

## 📦 Estrutura de Arquivos

```
admin/
├── src/
│   ├── pages/
│   │   ├── dashboard/index.tsx       # Dashboard principal
│   │   ├── recordings/list.tsx       # Lista de gravações
│   │   ├── recordings/create.tsx     # Criar gravação
│   │   └── login.tsx                 # Página de login
│   ├── providers/
│   │   ├── dataProvider.ts           # Integração com API Go
│   │   └── authProvider.ts           # Sistema de autenticação
│   ├── App.tsx                       # Configuração Refine
│   └── main.tsx                      # Entry point
├── vite.config.ts                    # Config do Vite + proxy
├── tsconfig.json                     # Config TypeScript
├── package.json                      # Dependências
├── index.html                        # HTML root
└── README.md                         # Documentação técnica
```

## 🔌 Integração com Backend

O admin dashboard se conecta com 2 APIs Go:

1. **API Gateway** (http://localhost:8080)
   - Endpoint: `/recordings`
   - Header: `X-API-Key`
   - Usado para: listar, criar, parar gravações

2. **Admin API** (http://localhost:8081)
   - Endpoint: `/admin/users`, `/admin/tokens`
   - Header: `X-Admin-API-Key`
   - Usado para: gerenciar usuários e tokens

**Proxy configurado no Vite** para evitar problemas de CORS.

## 🔧 Comandos de Desenvolvimento

```bash
# Instalar dependências (já feito)
npm install

# Iniciar dev server
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## ✅ Verificação de Funcionamento

### Backend Services
```bash
curl http://localhost:8080/health  # API Gateway
curl http://localhost:8081/health  # Admin API
curl http://localhost:8082/health  # Bot Manager
```

Resposta esperada: `{"status":"healthy","dependencies":{"database":"ok","redis":"ok"}}`

### Admin Dashboard
```bash
curl http://localhost:3001
```

Resposta esperada: HTML com `<title>Newar Admin Dashboard - Meeting Recordings Management</title>`

## 🐛 Problemas Resolvidos

1. ✅ **Erro `@refinedev/kbar` não encontrado**
   - Removido do código (era opcional)

2. ✅ **Erro de importação `Button` do `@refinedev/antd`**
   - Corrigido para importar de `antd` diretamente

3. ✅ **Sintaxe `syncWith Location: true`**
   - Corrigido para `syncWithLocation: true`

4. ✅ **Porta 3000 ocupada**
   - Vite automaticamente mudou para porta 3001

## 📝 Próximos Passos

Funcionalidades que podem ser adicionadas no futuro:

- [ ] Página de gerenciamento de usuários
- [ ] Página de gerenciamento de bots ativos
- [ ] Dashboard com gráficos de estatísticas (Chart.js ou Recharts)
- [ ] Configurações do sistema
- [ ] Logs em tempo real
- [ ] Notificações push quando gravação completa

## 🎉 Conclusão

O painel admin está **100% funcional** e pronto para uso em desenvolvimento!

**Acesse agora**: http://localhost:3001

Para fazer login, clique em "Sign in" com as chaves já pré-preenchidas.

# 📋 Requisitos da Extensão Newar Insights

## 🎯 Objetivo Principal
Extensão Chrome que permite gravar reuniões do Google Meet automaticamente através de bots gerenciados por API.

## 🔑 Funcionalidades Core

### 1. Autenticação e Onboarding
- [ ] Fluxo de boas-vindas
- [ ] Criação de conta (nome + email)
- [ ] Geração automática de API key
- [ ] Login com API key existente
- [ ] Inserção manual de API key
- [ ] Validação de API key
- [ ] Persistência de sessão

### 2. Detecção de Reuniões
- [ ] Detectar quando usuário entra no Google Meet
- [ ] Extrair meeting ID da URL
- [ ] Exibir badge flutuante na página do Meet
- [ ] Mostrar status da gravação no badge

### 3. Gerenciamento de Gravações
- [ ] Iniciar gravação com um clique
- [ ] Monitorar status da gravação em tempo real
- [ ] Parar gravação
- [ ] Exibir duração da gravação
- [ ] Listar todas as gravações
- [ ] Filtrar gravações por status/data
- [ ] Baixar gravações completas
- [ ] Deletar gravações
- [ ] Paginação de resultados

### 4. Popup Principal
- [ ] Mostrar informações do usuário
- [ ] Exibir estatísticas (total de gravações, bots disponíveis)
- [ ] Estado "Não está no Meet"
- [ ] Estado "Pronto para gravar"
- [ ] Estado "Gravando"
- [ ] Botão de ação contextual
- [ ] Link para página de gravações
- [ ] Link para configurações

### 5. Configurações
- [ ] Nome padrão do bot
- [ ] Ativar/desativar notificações de início
- [ ] Ativar/desativar notificações de conclusão
- [ ] Auto-start (iniciar automaticamente ao entrar no Meet)
- [ ] Logout
- [ ] Informações da conta

### 6. Notificações
- [ ] Notificação quando gravação inicia
- [ ] Notificação quando gravação completa
- [ ] Notificação de erros
- [ ] Ações rápidas nas notificações

### 7. Atalhos de Teclado
- [ ] Alt+Shift+R - Toggle gravação
- [ ] Alt+Shift+O - Abrir página de gravações

## 🔌 Integrações de API

### Admin API
- `POST /admin/users` - Criar usuário
- `POST /admin/users/:id/tokens` - Gerar API token
- `GET /admin/users?limit=100` - Buscar usuário por ID

### API Gateway
- `POST /recordings` - Iniciar gravação
- `GET /recordings` - Listar gravações
- `GET /recordings/google_meet/:meetingId` - Status da gravação
- `DELETE /recordings/google_meet/:meetingId` - Parar gravação
- `GET /recordings/google_meet/:meetingId/download` - Baixar gravação

## 🎨 Design System

### Cores (shadcn/ui theme)
- Primary: Azul escuro elegante
- Accent: Azul claro
- Success: Verde
- Destructive: Vermelho
- Muted: Cinza claro

### Componentes shadcn/ui
- Button (variants: default, secondary, ghost, destructive)
- Card
- Badge
- Dialog
- Form (Input, Label, Textarea)
- Tabs
- Toast
- Avatar
- Skeleton
- Select
- Switch
- Alert

### Tipografia
- Font: Inter (system font stack)
- Heading: font-semibold
- Body: font-normal
- Small: text-sm

## 🏗️ Arquitetura Técnica

### Stack
- **Framework**: WXT (Web Extension Tools)
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Chrome Storage API + React hooks
- **Build**: Vite (via WXT)
- **Testing**: Playwright (integrado ao WXT)

### Estrutura de Pastas
```
chrome-extension/
├── entrypoints/
│   ├── background.ts          # Service worker
│   ├── content.ts             # Content script (Meet detector)
│   ├── popup/                 # Popup principal
│   ├── onboarding/            # Página de onboarding
│   ├── recordings/            # Página de gravações
│   └── settings/              # Página de configurações
├── components/
│   ├── ui/                    # shadcn/ui components
│   └── shared/                # Componentes compartilhados
├── lib/
│   ├── api-client.ts          # Cliente de API
│   ├── storage.ts             # Wrapper do Chrome Storage
│   ├── types.ts               # TypeScript types
│   └── utils.ts               # Utilitários
├── public/
│   └── icons/                 # Ícones da extensão
└── wxt.config.ts              # Configuração do WXT
```

### Fluxo de Dados
1. **Service Worker** é a única fonte da verdade
2. **UI Components** ouvem mudanças via `chrome.storage.onChanged`
3. **Ações do usuário** enviam mensagens para o service worker
4. **Service worker** atualiza o storage, disparando updates em todos os listeners

### Permissões Chrome
- `storage` - Persistir dados
- `notifications` - Notificações
- `alarms` - Polling de status
- `host_permissions` - Google Meet

## ✅ Critérios de Qualidade

### Performance
- [ ] First paint < 100ms
- [ ] Interaction ready < 200ms
- [ ] Bundle size < 500KB
- [ ] Memory usage < 50MB

### UX
- [ ] Loading states em todas as ações
- [ ] Error handling com mensagens claras
- [ ] Feedback visual imediato
- [ ] Animações suaves (< 300ms)
- [ ] Responsive design

### Code Quality
- [ ] TypeScript strict mode
- [ ] Zero ESLint errors
- [ ] 100% type coverage
- [ ] Componentes < 200 linhas
- [ ] Funções < 50 linhas

### Testing
- [ ] E2E tests para fluxos principais
- [ ] Unit tests para lógica de negócio
- [ ] Coverage > 80%

## 🚀 Roadmap de Implementação

### Sprint 1: Fundação (2h)
- Setup WXT + React + TypeScript
- Configurar Tailwind + shadcn/ui
- Storage layer + API client
- Service worker básico

### Sprint 2: Autenticação (2h)
- Onboarding completo
- Validação de API key
- Persistência de sessão

### Sprint 3: Detecção (1h)
- Content script
- Badge flutuante
- Comunicação com background

### Sprint 4: Gravações (2h)
- Iniciar/parar gravação
- Monitoramento de status
- Feedback visual

### Sprint 5: Listagem (2h)
- Página de gravações
- Filtros e paginação
- Download/delete

### Sprint 6: Configurações (1h)
- Página de settings
- Preferências
- Logout

### Sprint 7: Polimento (2h)
- Animações
- Loading states
- Error handling
- Testes E2E

**Total estimado: 12-14 horas**

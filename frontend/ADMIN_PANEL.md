# Newar Insights - Admin Panel

Admin panel completo e moderno construído com Next.js 14, React, TypeScript e shadcn/ui.

## Funcionalidades

### 1. Dashboard (/)
- **Métricas em Cards**: Total de usuários, gravações ativas, completas hoje, status do sistema
- **Gráfico de Pizza**: Distribuição de gravações por status
- **Gráfico de Linha**: Atividade dos últimos 7 dias
- **Atividade Recente**: Últimas 8 gravações solicitadas
- **Ações Rápidas**: Links para principais funcionalidades
- **Estatísticas do Sistema**: Métricas gerais de uso
- **Auto-refresh**: Atualiza dados a cada 5 segundos

### 2. Gravações (/recordings)
- **Tabela Completa**: Todas as gravações do sistema
- **Filtros Avançados**:
  - Busca por ID ou URL
  - Filtro por status (requested, joining, active, recording, finalizing, completed, failed)
  - Filtro por plataforma (Google Meet, Teams)
- **Estatísticas**: Cards com totais (total, ativas, completas, falhadas)
- **Ações**:
  - Ver detalhes completos
  - Download da gravação
  - Deletar gravação
  - Solicitar nova gravação (dialog)
- **Auto-refresh**: Atualiza a cada 5 segundos

### 3. Bots (/bots)
- **Bots Ativos em Tempo Real**:
  - Status visual (joining, active, recording)
  - Tempo ativo (uptime)
  - Chunks gravados
  - Container ID
- **Ações por Bot**:
  - Ver logs em tempo real
  - Parar bot
- **Histórico**: Últimas 10 gravações completas/paradas
- **Auto-refresh**: Atualiza a cada 5 segundos

### 4. Usuários (/users)
- **Tabela de Usuários**: Lista completa com informações
- **Criar Usuário**: Dialog para adicionar novos usuários
- **Gerar Token**: Gera API token para o usuário
  - Exibe token apenas uma vez
  - Botão de copiar com feedback visual
- **Ver Gravações**: Dialog com histórico completo do usuário
  - Estatísticas (total, ativas, completas, falhadas)
  - Lista de todas as gravações
- **Deletar Usuário**: Com confirmação
- **Status em Tempo Real**: Indica se usuário tem bots ativos

### 5. Saúde do Sistema (/health)
- **Status Geral**: Indicador de saúde global
- **Serviços Monitorados**:
  - Admin API
  - API Gateway
  - Bot Manager
  - Redis
  - Database
- **Métricas por Serviço**:
  - Status (healthy/unhealthy)
  - Latência
  - Uptime
- **Métricas de Sistema**:
  - CPU usage
  - Memory usage
  - Disk usage
  - Network latency
  - Active connections
- **Gráfico em Tempo Real**: Últimos 20 registros de métricas
- **Logs por Serviço**: Tabs com logs de cada serviço
- **Auto-refresh**: Atualiza a cada 5 segundos

### 6. Configurações (/settings)
#### Geral
- Nome do sistema
- Máximo de bots simultâneos (global)
- Nome padrão do bot
- Limpeza automática de gravações
- Dias de retenção

#### APIs
- URLs dos serviços (Admin API, Gateway)
- Admin API Key (com show/hide e copy)
- Supabase URL e Key
- Redis URL

#### Bots
- Qualidade de gravação (64/128/192/256 kbps)
- Intervalo de upload de chunks
- Tempo máximo de espera

#### Notificações
- Email notifications
- Webhooks
- Webhook URL

#### Segurança
- Rate limiting
- Max requisições por minuto
- CORS
- Origens permitidas

## Componentes Shadcn Utilizados

- `button` - Botões em todo o sistema
- `card` - Cards para métricas e conteúdo
- `table` - Tabelas de dados
- `badge` - Status badges
- `dialog` - Modais para criar/editar
- `input` - Campos de entrada
- `label` - Labels para formulários
- `select` - Dropdowns
- `tabs` - Navegação por abas
- `separator` - Separadores visuais
- `scroll-area` - Área com scroll para logs
- `tooltip` - Tooltips informativos
- `progress` - Barras de progresso
- `chart` - Gráficos (Recharts)
- `switch` - Toggle switches
- `toast` - Notificações toast

## Tecnologias

- **Next.js 14**: Framework React com App Router
- **TypeScript**: Type safety
- **shadcn/ui**: Componentes modernos e acessíveis
- **Tailwind CSS**: Estilização
- **Recharts**: Gráficos e visualizações
- **lucide-react**: Ícones

## Estrutura de Arquivos

```
frontend/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── recordings/
│   │   └── page.tsx          # Página de gravações
│   ├── bots/
│   │   └── page.tsx          # Página de bots
│   ├── users/
│   │   └── page.tsx          # Página de usuários
│   ├── health/
│   │   └── page.tsx          # Página de saúde
│   ├── settings/
│   │   └── page.tsx          # Página de configurações
│   ├── layout.tsx            # Layout principal
│   └── globals.css           # Estilos globais
├── components/
│   ├── ui/                   # Componentes shadcn
│   └── main-nav.tsx          # Navegação principal
├── lib/
│   ├── api.ts                # Cliente API
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Funções utilitárias
└── hooks/
    └── use-toast.ts          # Hook para toast
```

## Features de UX

### Auto-refresh
- Dashboard: 5s
- Gravações: 5s
- Bots: 5s
- Usuários: 10s
- Saúde: 5s

### Loading States
- Spinner durante carregamento inicial
- Estados vazios informativos

### Feedback Visual
- Toast notifications (quando implementado)
- Badges de status coloridos
- Animações de pulse para estados ativos
- Confirmações para ações destrutivas

### Responsividade
- Grid adaptativo para diferentes tamanhos de tela
- Tabelas com scroll horizontal em mobile
- Cards empilhados em telas pequenas

## Design System

### Cores de Status
- **Verde**: Ativo, saudável, completo
- **Azul**: Em progresso, gravando
- **Amarelo**: Aguardando, joining
- **Vermelho**: Falha, erro, problema

### Tipografia
- Títulos: Bold, tracking-tight
- Corpo: Regular
- Código: font-mono

### Espaçamento
- Cards: padding consistente
- Grids: gap-4 ou gap-6
- Seções: space-y-4 ou space-y-6

## APIs Utilizadas

### Admin API
- `GET /admin/users` - Lista usuários
- `POST /admin/users` - Cria usuário
- `DELETE /admin/users/:id` - Deleta usuário
- `POST /admin/users/:id/tokens` - Gera token
- `GET /admin/recordings` - Lista gravações
- `DELETE /admin/recordings/:id` - Deleta gravação
- `GET /admin/bots/active` - Lista bots ativos
- `POST /admin/bots/:id/stop` - Para bot
- `GET /admin/bots/:id/logs` - Logs do bot
- `GET /admin/system/health` - Saúde do sistema
- `GET /admin/system/metrics` - Métricas do sistema
- `GET /admin/system/logs` - Logs do sistema

### Gateway API
- `GET /recordings` - Lista gravações do usuário
- `POST /recordings` - Cria gravação
- `DELETE /recordings/:platform/:meeting_id` - Para gravação
- `GET /recordings/:platform/:meeting_id/download` - Download

## Variáveis de Ambiente

```env
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:8081
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080
NEXT_PUBLIC_ADMIN_API_KEY=admin_dev_secret_key_123
```

## Próximas Melhorias

- [ ] Implementar toast notifications em vez de alerts
- [ ] Adicionar dark mode
- [ ] Gráficos mais avançados (mais períodos, mais métricas)
- [ ] Exportar dados (CSV, JSON)
- [ ] Filtros salvos
- [ ] Dashboards personalizáveis
- [ ] Real-time updates via WebSocket
- [ ] Testes unitários e E2E
- [ ] Storybook para componentes
- [ ] Internacionalização (i18n)

## Como Executar

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start
```

Acesse em: http://localhost:3000

## Notas Importantes

- Todas as páginas são client components (`'use client'`)
- Auto-refresh implementado com setInterval
- Tratamento de erros com try-catch
- Loading states em todas as páginas
- Confirmações para ações destrutivas
- Dados mock quando APIs não estão disponíveis
- Responsivo e acessível
- Seguindo padrões do shadcn/ui

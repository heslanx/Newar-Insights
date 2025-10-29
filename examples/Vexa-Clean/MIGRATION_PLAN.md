# Plano de Migração - Vexa Recording System Clean

## Objetivo
Criar versão limpa do projeto com apenas arquivos essenciais e estrutura organizada.

## Estrutura Final

```
Vexa-Clean/
├── services/                 # Microserviços
│   ├── api-gateway/
│   ├── admin-api/
│   ├── bot-manager/
│   └── recording-storage/
├── bot/                      # Bot renomeado para clareza
│   └── (conteúdo de vexa-bot/core)
├── libs/                     # Bibliotecas compartilhadas
│   └── shared-models/
├── docs/                     # Documentação técnica
├── scripts/                  # Scripts utilitários
│   ├── deploy.sh
│   ├── monitor.sh
│   └── check-health.sh
├── tests/                    # Testes (renomeado de testing/)
│   ├── integration/
│   └── load/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── .dockerignore
├── README.md
└── CLAUDE.md
```

## Arquivos a Transferir

### 1. Core Services ✅
- services/api-gateway/*
- services/admin-api/*
- services/bot-manager/* (sem app/tasks/)
- services/recording-storage/*

### 2. Bot ✅
- services/vexa-bot/core/* → bot/

### 3. Shared Libraries ✅
- libs/shared-models/*

### 4. Documentation ✅
- README.md
- CLAUDE.md
- docs/*

### 5. Configuration ✅
- docker-compose.yml
- .gitignore
- .dockerignore
- .env → .env.example (sem credenciais)

### 6. Scripts ✅
- deploy.sh → scripts/
- monitor.sh → scripts/
- check-health.sh → scripts/

### 7. Tests ✅
- testing/* → tests/

## Arquivos NÃO Transferir

❌ nbs/ - Jupyter notebooks (dev only)
❌ assets/ - Imagens (opcional)
❌ test-load.sh - Duplicado
❌ build-optimized.sh - Específico
❌ OPTIMIZATION_PLAN.md - Planning doc
❌ services/bot-manager/app/tasks/ - Disabled features
❌ .venv/ - Python venv
❌ node_modules/ - NPM packages
❌ dist/ - Compiled files

## Melhorias na Estrutura

1. **Renomear:**
   - `services/vexa-bot/core/` → `bot/`
   - `testing/` → `tests/`

2. **Organizar:**
   - Scripts soltos → `scripts/`
   - Testes → `tests/integration/` e `tests/load/`

3. **Limpar:**
   - Remover app/tasks/ do bot-manager
   - Remover arquivos .sh duplicados
   - Remover docs de planejamento (mover para archive/)


# 🎥 Newar Insights - Chrome Extension

> Grave suas reuniões do Google Meet automaticamente com um clique

![Build](https://img.shields.io/badge/build-357.63%20kB-success)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![WXT](https://img.shields.io/badge/WXT-0.20-blueviolet)

## ✅ Status Atual

**🔥 100% Funcional com API Real em Dev Mode!**

- ✅ **Dev Mode** - Conecta com backend local automaticamente
- ✅ **API Real** - NÃO usa mocks, faz chamadas HTTP reais
- ✅ **Auto-configuração** - Zero setup necessário
- ✅ **UX Moderna** - Design Huly (dark mode)
- ✅ **Backend Check** - Indica se API está rodando

## ⚡ Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Build
npm run build

# 3. Carregar no Chrome
# - Abra chrome://extensions/
# - Ative "Modo do desenvolvedor"
# - Clique "Carregar sem compactação"
# - Selecione a pasta: .output/chrome-mv3

# 4. IMPORTANTE: Iniciar backend
cd ..
docker-compose up -d
```

## 🎯 Dev Mode - API Real

A extensão está configurada para **usar a API real automaticamente**:

```typescript
// lib/dev-mode.ts
export const DEV_MODE = {
  enabled: true,        // Dev mode ativo
  bypassAuth: false,    // USA autenticação real ✅
  bypassAPI: false,     // USA API real ✅
  mockData: false,      // USA dados reais ✅
  autoSetup: true,      // Auto-configura ✅
};
```

**O que isso significa:**
- ❌ **NÃO** usa mocks ou dados falsos
- ✅ **SIM**, faz chamadas reais para `localhost:8080`
- ✅ **SIM**, cria bots reais de gravação
- ✅ **SIM**, grava arquivos .webm reais
- ✅ **SIM**, funciona de verdade!

## 📖 Como Usar

### 1. Via Popup (Recomendado)

1. **Clique** no ícone da extensão na barra de ferramentas
2. **Entre** em uma reunião: https://meet.google.com/abc-defg-hij
3. **Clique** em "Gravar Reunião"
4. Para parar: **Clique** em "Parar Gravação"

### 2. Via Context Menu

1. **Entre** em uma reunião do Meet
2. **Clique direito** → Newar Insights → Iniciar gravação

### 3. Via Atalhos de Teclado

- **Alt+Shift+R** - Iniciar/Parar gravação
- **Alt+Shift+O** - Abrir página de gravações

## 🔧 Troubleshooting

### Backend não está rodando

**Sintoma:** Popup mostra "⚠️ API OFF" em amarelo

**Solução:**
```bash
docker-compose up -d
docker-compose ps  # Verificar status
```

### Erro "Not authenticated"

**Sintoma:** Ao tentar gravar, aparece erro de autenticação

**Solução:**
```bash
# Recarregar extensão
chrome://extensions/ → Clique em ↻ (Reload)

# Verificar console
chrome://extensions/ → Detalhes → Inspecionar service worker
# Deve aparecer:
# [DEV MODE ENABLED - REAL API]
# ✅ Using REAL API calls (not mocks)
```

### Gravação não inicia

**Checklist:**
1. ✅ Backend está rodando?
2. ✅ Está em uma reunião do Meet?
3. ✅ Console do service worker tem erros?

**Console esperado:**
```javascript
[DEV MODE ENABLED - REAL API]
✅ Using REAL API calls (not mocks)
✅ Auto-configured with dev API key
🌐 Admin API: http://localhost:8081
🌐 Gateway API: http://localhost:8080
👤 User: dev@newar.com
🔑 API Key: vxa_live_dev_auto_...
```

## 📁 Estrutura

```
chrome-extension/
├── entrypoints/
│   ├── background.ts       # Service worker principal
│   ├── popup/
│   │   ├── App.tsx         # UI do popup
│   │   └── index.html
│   ├── settings/
│   │   ├── App.tsx         # Página de configurações
│   │   └── index.html
│   └── recordings/
│       ├── App.tsx         # Página de gravações
│       └── index.html
├── lib/
│   ├── dev-mode.ts         # 🔑 Configuração de dev mode
│   ├── api-client.ts       # Cliente HTTP para API
│   ├── storage.ts          # Chrome Storage wrapper
│   ├── auth-service.ts     # Lógica de autenticação
│   └── types.ts            # TypeScript types
└── components/ui/          # shadcn/ui components
```

## 🚀 Comandos

```bash
npm run build      # Build production
npm run dev        # Build watch mode
npm run zip        # Criar .zip para Chrome Web Store
```

## 🔄 Alterar para Production

Para desativar o dev mode e usar em produção:

```typescript
// lib/dev-mode.ts
export const DEV_MODE = {
  enabled: false,  // ← Mudar para false
};
```

Depois:
```bash
npm run build
# Recarregar extensão no Chrome
```

No modo produção, você precisará:
1. Ir em **Configurações**
2. Colar sua **API Key** real
3. Salvar

## 📚 Documentação Completa

Ver documentação detalhada em: **[CHROME_EXTENSION_GUIDE.md](../CHROME_EXTENSION_GUIDE.md)**

Inclui:
- Fluxo completo de gravação
- Troubleshooting avançado
- Diagramas de arquitetura
- Referências

## 🏗️ Arquitetura

A extensão é um **controle remoto** que se comunica com o backend:

```
Chrome Extension → API Gateway → Bot Manager → Recording Bots (Docker)
```

**A extensão NÃO grava diretamente.** Ela apenas:
1. Detecta reuniões do Google Meet
2. Envia comandos HTTP para criar/parar bots
3. Monitora status via polling (5s)
4. Exibe informações para o usuário

## 🔧 Tech Stack

- **WXT 0.20** - Framework para Chrome Extensions
- **React 19** + TypeScript 5
- **Tailwind CSS v4** + shadcn/ui
- **Vite 7** - Build tool ultrarrápido
- **Chrome APIs** - storage, notifications, tabs, contextMenus

## ✨ Funcionalidades

### ✅ Completo
- Service worker com polling
- Popup com 4 estados (não auth, não no meet, pronto, gravando)
- Página de configurações
- Página de gravações
- Context menu
- Atalhos de teclado
- Notificações
- Detecção automática de reuniões
- Status do backend (dev mode)
- Auto-configuração (dev mode)

### 🎨 UI Components
- HulyCard - Cards com design Huly
- GlowingButton - Botão com efeito glow
- OutlineButton - Botão outlined
- Input, Label - Formulários
- Badges, Status Indicators

## 📊 Build Stats

```
✔ Built extension in 2.6s
├─ background.js            15.92 kB
├─ popup.html               585 B
├─ settings.html            763 B
├─ recordings.html          761 B
└─ assets/                  273.65 kB
Σ Total size: 357.63 kB
```

## 📄 Licença

MIT

---

**Última Atualização:** 2025-10-31
**Status:** ✅ Funcional e pronta para desenvolvimento!

🚀 **Boa codificação!**

# 🎨 Design System - Newar Insights

## 📐 Fundamentos

### Paleta de Cores

#### Backgrounds
```css
gray-1: #090A0C   /* Principal - Quase preto */
gray-2: #111111   /* Secundário escuro */
gray-5: #1C1D21   /* Cards e modais */
gray-10: #2A2B2F  /* Bordas primárias */
gray-20: #303236  /* Bordas secundárias */
gray-98: #F6F6F6  /* Seções claras */
```

#### Textos
```css
white: #FFFFFF    /* Principal sobre escuro */
gray-30: #45464A  /* Parágrafos em claro */
gray-50: #818285  /* Subtítulos */
gray-60: #999A9C  /* Texto secundário */
gray-80: #CDCFD1  /* Texto terciário */
gray-90: #E4E5E7  /* Parágrafos em escuro */
```

#### Acentos
```css
brand-blue: #3d7eff    /* Links, ações primárias */
brand-orange: #F58041  /* CTAs, botões principais */
brand-danger: #ff4d4d  /* Erros, ações destrutivas */
```

### Tipografia

#### Família
- **Títulos:** Satoshi-Bold, General Sans
- **Corpo:** Satoshi-Regular, Inter
- **Código:** Monospace

#### Escala
```css
text-[32px] - Títulos principais (H1)
text-[28px] - Títulos secundários (H2)
text-[18px] - Títulos terciários (H3)
text-[15px] - Parágrafos grandes
text-[14px] - Corpo padrão
text-[13px] - Corpo pequeno
text-[12px] - Botões primários
text-[11px] - Botões secundários, labels
```

#### Pesos
- **Bold (700):** Títulos, botões
- **Semibold (600):** Subtítulos
- **Medium (500):** Destaque
- **Regular (400):** Corpo
- **Light (300):** Secundário

### Espaçamento

#### Sistema Base (4px)
```css
gap-2  = 8px   /* Elementos muito próximos */
gap-3  = 12px  /* Elementos relacionados */
gap-4  = 16px  /* Padrão entre elementos */
gap-6  = 24px  /* Seções relacionadas */
gap-8  = 32px  /* Seções distintas */

space-y-2 = 8px   /* Vertical compacto */
space-y-3 = 12px  /* Vertical médio */
space-y-4 = 16px  /* Vertical padrão */
space-y-5 = 20px  /* Vertical forms */
space-y-6 = 24px  /* Vertical seções */
```

#### Padding
```css
p-3 = 12px  /* Compacto */
p-4 = 16px  /* Padrão */
p-5 = 20px  /* Confortável */
p-6 = 24px  /* Espaçoso */
```

---

## 🧩 Componentes

### Botões

#### Primário (Glowing)
```tsx
<GlowingButton type="submit">
  Texto do Botão
</GlowingButton>
```
- Altura: 40px (h-10)
- Padding: 64px horizontal (px-16)
- Fonte: 12px uppercase bold
- Cor texto: #5A250A
- Fundo: #d1d1d1
- Borda: white/60
- Efeito: Brilho laranja externo + interno que segue mouse

#### Secundário
```tsx
<Button className="bg-brand-blue hover:bg-brand-blue/90">
  Ação
</Button>
```
- Altura: 40px (h-10)
- Fonte: 11px uppercase bold
- Cor: white
- Fundo: brand-blue
- Hover: 90% opacity

#### Outline
```tsx
<Button className="bg-gray-20 hover:bg-gray-10">
  Voltar
</Button>
```
- Altura: 40px (h-10)
- Fonte: 11px uppercase bold
- Fundo: gray-20
- Hover: gray-10

#### Danger
```tsx
<Button className="bg-brand-danger/20 hover:bg-brand-danger text-brand-danger hover:text-white">
  Excluir
</Button>
```
- Altura: 40px (h-10)
- Fundo: danger/20
- Hover: danger sólido + texto branco

### Cards

#### Padrão
```tsx
<Card className="bg-gray-5 border-gray-10">
  <CardHeader>
    <CardTitle className="text-[18px] text-white">
      Título
    </CardTitle>
  </CardHeader>
  <CardContent>
    Conteúdo
  </CardContent>
</Card>
```
- Fundo: gray-5
- Borda: gray-10 (1px)
- Border radius: 12px
- Padding header: 24px
- Padding content: 24px

#### Com Hover
```tsx
<Card className="bg-gray-5 border-gray-10 hover:border-gray-20 transition-colors">
```

### Inputs

#### Text Input
```tsx
<Input
  type="text"
  className="bg-gray-2 border-gray-10 text-white placeholder:text-gray-50 h-11 focus:border-brand-blue transition-colors"
  placeholder="Digite aqui..."
/>
```
- Altura: 44px (h-11)
- Fundo: gray-2
- Borda: gray-10
- Focus: brand-blue
- Placeholder: gray-50

#### Password Input
```tsx
<div className="relative">
  <Input type={show ? 'text' : 'password'} />
  <button className="absolute right-3 top-1/2 -translate-y-1/2">
    <Eye className="w-4 h-4" />
  </button>
</div>
```

### Badges

#### Status
```tsx
<span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-green-500/20 text-green-400">
  Concluída
</span>
```

**Variações:**
- **Gravando:** bg-brand-danger/20 text-brand-danger
- **Concluída:** bg-green-500/20 text-green-400
- **Processando:** bg-gray-20 text-gray-60

### Feedback

#### Success
```tsx
<div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-[14px] flex items-center gap-2">
  <span>✓</span>
  Operação realizada com sucesso!
</div>
```

#### Error
```tsx
<div className="p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-brand-danger text-[14px] flex items-center gap-2">
  <span>⚠️</span>
  Ocorreu um erro. Tente novamente.
</div>
```

#### Info
```tsx
<div className="p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-lg text-brand-blue text-[14px] flex items-center gap-2">
  <span>💡</span>
  Dica útil para o usuário.
</div>
```

---

## 🎭 Estados & Animações

### Loading
```tsx
<Loader2 className="w-4 h-4 animate-spin text-brand-blue" />
```

### Hover States
```css
hover:bg-gray-10        /* Botões secundários */
hover:bg-brand-blue/90  /* Botões primários */
hover:scale-105         /* Glowing button */
hover:border-brand-blue /* Inputs */
hover:underline         /* Links */
```

### Transitions
```css
transition-colors  /* Mudanças de cor */
transition-all     /* Múltiplas propriedades */
ease-in-out       /* Suave */
ease-out          /* Rápido início */
duration-200      /* 200ms padrão */
```

### Focus States
```css
focus:border-brand-blue
focus:ring-1
focus:ring-brand-blue
focus:outline-none
```

---

## 📱 Layouts

### Popup (400px width)
```tsx
<div className="w-[400px] bg-gray-1">
  <div className="p-4 border-b border-gray-10">
    {/* Header */}
  </div>
  <div className="p-4 space-y-4 min-h-[250px]">
    {/* Content */}
  </div>
</div>
```

### Full Page
```tsx
<div className="min-h-screen bg-gray-1">
  <div className="border-b border-gray-10 bg-gray-2">
    <div className="max-w-6xl mx-auto px-6 py-6">
      {/* Header */}
    </div>
  </div>
  <div className="max-w-6xl mx-auto px-6 py-8">
    {/* Content */}
  </div>
</div>
```

### Modal/Card Centered
```tsx
<div className="min-h-screen bg-gray-1 flex items-center justify-center p-6">
  <Card className="w-full max-w-lg">
    {/* Content */}
  </Card>
</div>
```

---

## ✨ Microinterações

### Botão com Loading
```tsx
<Button disabled={loading}>
  {loading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Carregando...
    </>
  ) : (
    'Salvar'
  )}
</Button>
```

### Card com Hover
```tsx
<Card className="hover:border-gray-20 transition-colors cursor-pointer">
```

### Badge Pulsante
```tsx
<div className="animate-pulse bg-brand-danger">
  GRAVANDO
</div>
```

### Glowing Effect
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(255, 77, 77, 0); }
}
```

---

## 🎯 Princípios de Design

### 1. Hierarquia Visual
- Títulos grandes e bold
- Subtítulos médios
- Corpo pequeno e light
- Cores para destacar ações

### 2. Consistência
- Mesmos padrões em todas as páginas
- Espaçamento uniforme
- Cores semânticas

### 3. Feedback
- Loading states visíveis
- Mensagens de erro claras
- Confirmações de sucesso

### 4. Acessibilidade
- Contraste adequado (WCAG AA)
- Labels em todos os inputs
- Focus states visíveis
- Textos alternativos

### 5. Performance
- Transições suaves (200ms)
- Animações leves
- Bundle otimizado (334 kB)

---

## 📊 Métricas de Qualidade

- ✅ **Contraste:** Mínimo 4.5:1 (WCAG AA)
- ✅ **Espaçamento:** Sistema base 4px
- ✅ **Tipografia:** Escala consistente
- ✅ **Cores:** Paleta limitada e semântica
- ✅ **Animações:** < 300ms
- ✅ **Bundle:** 334 kB total
- ✅ **CSS:** 30 kB

# AVGESTÃO — Diretrizes de Design Premium (Aprovado na OS)

> Documento de referência para replicar o visual premium aprovado na tela de **Detalhes da Ordem de Serviço** (`/ordens-servico/[id]`) e **Lista de OS** (`/ordens-servico`) em todas as outras páginas do sistema.

---

## 1. Filosofia Visual

**Referência:** Linear, Stripe, Vercel, Notion  
**Sensação:** Produto pago, organizado, confiável, moderno, limpo  
**Princípio:** "Quando bater o olho, precisa sentir: isso parece um SaaS de verdade."

### O que NÃO fazer
- Não usar verde como cor de "sucesso/approval" em títulos de seção (cria dissonância cognitiva quando a OS está pendente)
- Não usar fontes serifadas ou finas demais
- Não usar cards quadrados ou sem destaque visual
- Não deixar texto pequeno demais dentro de cards
- Não misturar muitas cores de destaque

---

## 2. Tipografia (Aprovado)

### Fonte Principal
- **DM Sans** via `next/font/google`
- Peso 400, 500, 600, 700, 800
- Deve ser carregada no layout raiz e aplicada no `<body>`

### Hierarquia de Tamanhos (o que funcionou)

| Elemento | Tamanho | Peso | Observação |
|---|---|---|---|
| **Título da página (hero)** | `text-[2.25rem]` a `text-[2.5rem]` | `font-extrabold` | Código da OS ou título principal |
| **Subtítulo / contador** | `text-base` | `font-medium` | "X registros" |
| **Título de seção (card header)** | `text-lg` | `font-bold` | Dentro do header do card |
| **Subtítulo de seção** | `text-base` | `font-medium` | Descrição do que está no card |
| **Texto dentro dos cards** | **`text-base`** | `font-normal` | **Padrão para TODO conteúdo interno** |
| **Labels uppercase** | `text-sm` a `text-base` | `font-semibold` + `uppercase tracking-wider` | "Valor Total", "Problema Relatado" |
| **Valores monetários grandes** | `text-2xl` a `text-4xl` | `font-extrabold` | Total da OS, total de itens |
| **Dados secundários** | `text-sm` | `font-medium` | Datas, códigos, emails |
| **Badges / pills** | `text-xs` | `font-semibold` | Status |

### Regra de Ouro
> **TUDO dentro dos cards deve ser `text-base` mínimo.** Nunca `text-xs` ou `text-sm` para conteúdo legível. `text-sm` só para metadados (datas, códigos).

---

## 3. Estrutura de Cards (Bento 2.0)

### Container do Card
```
rounded-2xl
border border-border/60
border-t-2 border-t-emerald-500/30   ← identidade visual da zona
bg-card
shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]
overflow-hidden
```

### Header do Card (MUITO DESTACADO — o usuário gostou assim)
```
bg-emerald-50/40 dark:bg-emerald-950/20   ← background sutil esmeralda
px-6 py-5                                 ← generoso, parece header de verdade
border-b border-border/40
flex items-center gap-3
```

### Elementos do Header
| Elemento | Classes |
|---|---|
| **Ícone container** | `w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400` |
| **Título** | `text-lg font-bold text-foreground` ← **preto**, nunca verde |
| **Subtítulo** | `text-base text-muted-foreground font-medium` |

### Body do Card
```
p-6        ← padding generoso
space-y-4  ← respiro entre elementos
```

---

## 4. Sistema de Cores (Emerald como Identidade, Não Status)

### Uso do Emerald
| Contexto | Uso |
|---|---|
| **Border-top dos cards** | `border-t-emerald-500/30` ← identidade da zona |
| **Background do header** | `bg-emerald-50/40` ← destaque sutil do header |
| **Ícone container** | `bg-emerald-100 text-emerald-700` |
| **Hover em tabela** | `hover:bg-emerald-50/30` |
| **Hover em ações** | `hover:bg-emerald-50 hover:text-emerald-600` |
| **Filtro ativo** | `bg-emerald-50 border-emerald-200 text-emerald-700` |
| **Badge status "concluído"** | Verde |

### O que NÃO fazer com Emerald
- ❌ Títulos de seção em verde (`text-emerald-700`) → parece que tudo está aprovado/sucesso
- ❌ Texto de problemas pendentes em verde
- ❌ Valores de pagamento pendente em verde

### Texto deve ser
- Títulos: `text-foreground` (preto/cinza escuro)
- Corpo: `text-foreground` ou `text-muted-foreground`

---

## 5. Layout da Página de Detalhes (4 Zonas Visuais)

### Zona 1 — Hero (Cabeçalho Principal)
```
max-w-[1400px] mx-auto px-6 py-8
```
- Código da OS: `text-[2.5rem] font-extrabold`
- Status: `StatusPill` arredondado
- Valor total: `text-4xl font-extrabold` com label `text-sm uppercase tracking-wider text-muted-foreground`
- Grid de informações: `text-base` para cliente, equipamento, datas
- Técnico: avatar + badge

### Zona 2 — Cards de Conteúdo (grid de 1 ou 2 colunas)
```
grid grid-cols-1 lg:grid-cols-2 gap-5
```
- Cards com header destacado (conforme seção 3)
- Corpo com `text-base`

### Zona 3 — Ações (ActionBar)
Separar ações em dois grupos:
1. **Primárias** — botões principais (Finalizar, WhatsApp)
2. **Secundárias** — dropdown ou grupo separado (Editar, PDF, Excluir, Voltar)

### Zona 4 — Animação de Entrada
- Framer Motion `staggerChildren: 0.05`
- Cada card anima de `opacity: 0, y: 12` para `opacity: 1, y: 0`
- Duração: `0.3s`
- Easing: `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out suave)

---

## 6. Layout da Página de Lista

### Container
```
max-w-[1400px] mx-auto px-6 py-8
```

### Header
- Título: `text-[2.25rem] font-extrabold`
- Subtítulo: `text-base font-medium text-muted-foreground`
- Botão primário à direita

### Filtros (Pills)
```
rounded-full px-3 py-1.5 text-sm font-medium
border border-border/50
hover:bg-accent hover:border-accent

Ativo:
bg-emerald-50 border-emerald-200 text-emerald-700
```

### Tabela Premium
```
rounded-xl border border-border/60 bg-card
shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]
overflow-hidden
```

**Headers:**
```
text-[11px] font-semibold uppercase tracking-[0.04em]
text-muted-foreground
bg-muted/30
px-4 py-3.5
```

**Linhas:**
```
hover:bg-emerald-50/30 transition-colors duration-150
cursor-pointer
border-b border-border/30 last:border-0
```

**Células:**
```
text-sm text-foreground px-4 py-3.5
```

**Coluna de ação:**
```
ChevronRight com hover:text-emerald-600 hover:bg-emerald-50 rounded-full p-1
```

---

## 7. Componentes Reutilizáveis

### StatusPill (exclusivo, não StatusBadge antigo)
```tsx
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
  {label}
</span>
```
- Cores por status: emerald (concluído), amber (andamento), blue (aberta), red (cancelada), slate (default)

### ActionBar
```tsx
<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
  <div className="flex items-center gap-2">   {/* primárias */}
  <div className="flex items-center gap-2">   {/* secundárias */}
</div>
```
- Botões primários: `variant="default"` (emerald)
- Botões secundários: `variant="outline"` ou `variant="ghost"`
- Separador visual entre grupos

### SectionCard
Wrapper com header destacado + body padding.

---

## 8. Animações (Framer Motion)

### Configuração Base
```tsx
const easeOut = [0.23, 1, 0.32, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: easeOut }
  }
};
```

### Uso
```tsx
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  <motion.div variants={itemVariants}> {/* card 1 */} </motion.div>
  <motion.div variants={itemVariants}> {/* card 2 */} </motion.div>
</motion.div>
```

### Regras
- Stagger de **50ms** entre elementos
- Duração máxima: **300ms**
- Easing: suave, não elástico
- Não animar tabelas grandes inteiras (só fade-in do container)

---

## 9. Decisões que o Usuário Aprovou (Checkpoint)

| Decisão | Status |
|---|---|
| Cards com `rounded-2xl` | ✅ |
| Header de card com `px-6 py-5` + `bg-emerald-50/40` | ✅ |
| Ícone container `w-10 h-10 rounded-xl` | ✅ |
| Título de seção `text-lg font-bold text-foreground` (preto) | ✅ |
| Texto dentro dos cards em `text-base` | ✅ |
| Valores grandes `text-2xl`/`text-4xl` | ✅ |
| DM Sans como fonte | ✅ |
| Base font-size 15px no body | ✅ |
| `max-w-[1400px] mx-auto` | ✅ |
| Tabela com `rounded-xl` e shadow sutil | ✅ |
| Filtros em pills `rounded-full` | ✅ |
| StatusPill arredondado (não Badge quadrado) | ✅ |
| Emerald como identidade visual, não como status | ✅ |
| 4 zonas visuais na página de detalhe | ✅ |
| Animação stagger suave nos cards | ✅ |
| ActionBar separando primárias/secundárias | ✅ |

---

## 10. Checklist para Replicar em Outras Páginas

Antes de entregar qualquer tela, verificar:

- [ ] Container com `max-w-[1400px] mx-auto px-6 py-8`
- [ ] Fonte DM Sans aplicada
- [ ] Título da página em `text-[2.25rem] font-extrabold`
- [ ] Cards com `rounded-2xl`, `border-border/60`, `border-t-emerald-500/30`
- [ ] Header do card com `bg-emerald-50/40` e `px-6 py-5`
- [ ] Ícone no header com `w-10 h-10 rounded-xl bg-emerald-100`
- [ ] Título do card em `text-lg font-bold text-foreground` (**preto**)
- [ ] Todo texto interno do card em **`text-base`**
- [ ] Labels em `text-sm uppercase tracking-wider`
- [ ] Tabela com headers `text-[11px] uppercase tracking-[0.04em]`
- [ ] Hover da tabela `hover:bg-emerald-50/30`
- [ ] Filtros em pills `rounded-full`
- [ ] Status usando `StatusPill` arredondado
- [ ] Animação Framer Motion com stagger 50ms
- [ ] ActionBar separando ações primárias/secundárias
- [ ] Build passando (`npm run build`)
- [ ] TypeScript limpo (`npx tsc --noEmit`)

---

## 11. Exemplo de Estrutura Esperada (Detalhe)

```
┌─────────────────────────────────────────────┐
│  Hero: Código OS + Status + Valor Total      │  ← text-[2.5rem] / text-4xl
├─────────────────────────────────────────────┤
│                                               │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ 🛠️ Atendi-  │  │ 📋 Itens e  │           │  ← cards rounded-2xl
│  │    mento    │  │  Pagamento  │           │  ← header emerald/40
│  │  Problema...│  │  R$ 1.234   │           │  ← text-base dentro
│  └─────────────┘  └─────────────┘           │
│                                               │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ 💰 Financeiro│  │ 📦 Estoque  │           │
│  │  R$ 500     │  │  3 itens    │           │
│  └─────────────┘  └─────────────┘           │
│                                               │
│  ┌─────────────────────────────────────────┐│
│  │ 🔧 Pós-venda / Garantia                ││
│  └─────────────────────────────────────────┘│
│                                               │
│  ┌─────────────────────────────────────────┐│
│  │ [Finalizar] [WhatsApp]  [Mais ▼] [Voltar]│  ← ActionBar
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

---

---

## 12. Inputs Premium (Adicionado)

### Filosofia
Inputs não podem parecer "pequenos" ou "cruzs". Precisam ser confortáveis, modernos e alinhados ao visual premium dos cards.

### Input Padrão
```
h-12
px-4
text-base
rounded-xl
border border-border/60
bg-background
shadow-sm
placeholder:text-muted-foreground/60
focus-visible:ring-2 focus-visible:ring-emerald-500/20
focus-visible:border-emerald-500/50
```

### Select / SelectTrigger
Mesma altura e aparência do input:
```
h-12
px-4
text-base
rounded-xl
border border-border/60
bg-background
shadow-sm
```

### Textarea
```
min-h-[120px]
px-4 py-3
text-base
rounded-xl
border border-border/60
bg-background
shadow-sm
resize-y
```

### Label
```
text-sm
font-semibold
text-foreground
mb-1.5 (no componente base)
```

### Mensagens Auxiliares
- **Descrição:** `text-sm text-muted-foreground`
- **Erro:** `text-sm font-medium text-destructive`

### Guard Rails
- Não alterar lógica de formulário
- Não alterar validações, schemas, APIs
- Não alterar nomes de campos ou comportamento de submit
- Apenas refinar classes visuais dos componentes UI

### Componentes base atualizados
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/label.tsx`

---

> **Última atualização:** 2026-06-16  
> **Aprovado em:** `/ordens-servico/[id]` — AVGESTÃO OS Premium

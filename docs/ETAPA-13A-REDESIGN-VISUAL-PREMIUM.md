# Etapa 13A — Redesign Visual Premium do AVGESTÃO (Gestor Local)

> **Status:** PLANO (não executar sem ordem). Documento de auditoria + direção visual + plano de implementação em camadas.
> **Escopo:** redesign visual/UX, **sem** regra de negócio nova, **sem** schema, **sem** APIs críticas, **sem** quebrar guards/middleware/Stripe/RLS/módulos/permissões/rotas/enums.
> **Skills de base:** `taste-skill` (decisões de design) + `emil-design-eng` (acabamento/UX/motion).
> **Modelo recomendado para a FASE DE IMPLEMENTAÇÃO:** Kimi K2.6 — `ollama launch claude --model kimi-k2.6:cloud`

---

## 0. Resumo executivo

O AVGESTÃO **já tem uma base visual sólida e parcialmente premium** em algumas telas (Login, Dashboard principal e Portal da OS usam `mesh-gradient`, `liquid-glass`, `framer-motion`, `spotlight-border` e `AnimatedCounter`). O problema **não é falta de recursos**, e sim **inconsistência**: o visual é premium em 3 telas e "cru/utilitário" nas telas core de Financeiro, Estoque, Cozinha, Detalhe da OS e Cardápio público. Há também **duplicação massiva** de padrões (header de página reescrito à mão em ~10 arquivos; 3 abordagens diferentes de badge de status; 2 estilos de StatCard; 2 estilos de tabela; 3 padrões de loading).

A Etapa 13A resolve isso em 4 camadas de **baixo risco**: (1) tokens globais, (2) layout + componentes de domínio padronizados, (3) telas autenticadas, (4) telas públicas. Sem mudar lógica, schema, endpoints, guards ou enums.

---

## 1. Stack e fundamentos — o que JÁ existe (NÃO refazer)

Antes de qualquer coisa, isto é o que o projeto já tem. O redesign **reaproveita** tudo isso.

| Item | Valor real no projeto | Implicação |
|---|---|---|
| Framework | Next.js **16.2.9** App Router, React 19.2.4 | **NÃO é o Next que se conhece** — há breaking changes. Ler `node_modules/next/dist/docs/` antes de escrever código (exigência do `AGENTS.md`). |
| Styling | Tailwind **v4** (config via CSS, **sem** `tailwind.config.*`), `@tailwindcss/postcss` | Tokens vão em `@theme inline` + `:root`/`.dark` no `globals.css`. **Não** criar `tailwind.config`. |
| Primitives UI | `@base-ui/react` (NÃO Radix) + shadcn registry `"base-nova"` | Componentes `src/components/ui/*` usam API `@base-ui`. **Não** colar código Radix. |
| Fonte | **Geist** + **Geist Mono** via `next/font/google` | **Já é a fonte recomendada pela taste-skill** — manter, não trocar. |
| Cores de marca | Emerald — `#059669` (light) / `#34d399` (dark); neutros = zinc | 1 accent (verde) — alinhado à regra "max 1 accent". Manter. |
| Radius base | `0.875rem` (~14px), derivados sm→4xl no `@theme` | Bom. Refinar apenas a curva de uso. |
| Dark mode | `next-themes` (`attribute="class"`, system default) | Já funciona. Refinar tokens do dark. |
| Motion | `framer-motion@12`, `tw-animate-css`, utilities `liquid-glass`/`mesh-gradient`/`spotlight-border`/`shimmer`/`grain`/`animate-float` | Reaproveitar, não recriar. |
| Ícones | `lucide-react` (padrão) + `@phosphor-icons/react` | Padronizar em **lucide** com `strokeWidth` consistente (a taste pede padronização). |
| Charts | `recharts@3.8.1` | Paleta de gráfico está fragmentada (ver §3.11). |
| Toast | `sonner@2` | Já existe, padronizar uso. |
| Easing "Emil" | `--ease-out`, `--ease-in-out`, `--ease-drawer`, `--ease-spring` já em `globals.css` | Já alinhado à `emil-design-eng`. Usar. |

**Caminhos-chave:**
- Tokens/UI: `src/app/globals.css`
- Root layout/fontes: `src/app/layout.tsx`
- Layout autenticado: `src/app/(dashboard)/layout.tsx` → `src/components/layout/dashboard-sidebar.tsx`
- Primitives: `src/components/ui/*` (21 arquivos)
- Domain: `src/components/{empty-state,sort-select,theme-toggle,theme-provider}.tsx` + `src/components/layout/{dashboard-sidebar,module-card,sign-out-button}.tsx`

---

## 2. Auditoria visual — principais problemas encontrados

### 2.1 Sidebar preta e pesada (CRÍTICO)
- `--sidebar: #09090b` (light) / `#000000` (dark, **preto puro**).
- A `taste-skill` proíbe `#000000` ("NO Pure Black"). Off-black/zinc-950 ou charcoal são obrigatórios.
- Em light mode a sidebar quase-preta pesa visualmente contra fundo `#fafafa`.
- O active state já é bom (`framer-motion` `layoutId="activeIndicator"` + dot), mas a legibilidade e o rodapé (só nome+email, sem empresa) ficam aquém.
- Admin (`SUPER_ADMIN`) usa uma sidebar **hardcoded** `bg-gray-900` **fora dos tokens** — destoa completamente.

### 2.2 Header de página duplicado em ~10 arquivos (MAIOR oportunidade de padronização)
- Não existe `PageHeader`. O bloco abaixo é reescrito à mão em:
  `ordens-servico/page.tsx`, `clientes/page.tsx`, `orcamentos/page.tsx`, `financeiro/VisaoGeralContent.tsx`, `estoque/DashboardContent.tsx`, `financeiro/fluxo/FluxoContent.tsx`, `financeiro/TransacoesListContent.tsx`, `estoque/movimentacoes/MovimentacoesContent.tsx`, `upgrade/page.tsx` + 3 layouts de seção.
  ```tsx
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{Titulo}</h1>
      <p className="text-sm text-muted-foreground mt-0.5">{subtitulo}</p>
    </div>
    <div className="flex items-center gap-2">...ações...</div>
  </div>
  ```

### 2.3 Badges de status não padronizados (3 abordagens conflitantes)
- **(a) OS** — `src/lib/os-status.ts` com classes Tailwind hardcoded (`bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`) renderizadas como `<span>` cru (não `Badge`).
- **(b) Orçamentos** — `getStatusVariant()` local mapeando para variant nativa do `Badge` shadcn.
- **(c) Financeiro** — `STATUS_COLORS` map próprio (`FinanceiroDetailContent.tsx`) com `Badge variant="outline" + className`.
- **(d) Trial** — `Badge` com classes hardcoded inline no dashboard.
- Cores divergem (`bg-blue-100` vs `bg-blue-500/10` vs `bg-destructive/10`). Sem identidade consistente.

### 2.4 StatCard inconsistente (2 versões divergentes)
- **Polido:** `MetricCard` local em `dashboard/page.tsx` — `rounded-[1.5rem]`, sombra, hover lift, `AnimatedCounter`, trend colorido. **Não é exportado.**
- **Plano/cru:** `rounded-xl border bg-card p-4 space-y-1` sem sombra/hover/animação, repetido em `financeiro/VisaoGeralContent.tsx`, `estoque/DashboardContent.tsx`, `financeiro/fluxo/FluxoContent.tsx`, `relatorios/executivo/ExecutivoContent.tsx`, `relatorios/financeiro/FinanceiroContent.tsx`.
- As telas core (Financeiro, Estoque, Relatórios) parecem "build rápido" justamente por usar a versão plana.

### 2.5 Telas core "cras" — Financeiro e Estoque (CRÍTICO)
- Cards planos sem hover; loading em texto `"Carregando..."`; empty state inline com `Icon className="opacity-30"`; seletor `<input type="month">` cru; botão "Atualizar" sem estilo de componente; gráficos `recharts` em `rounded-xl border p-4` sem hierarquia.
- Contrastam fortemente com o Dashboard principal (premium) — dão a sensação de "produto inacabado".

### 2.6 Detalhe da OS denso e sem hierarquia (CRÍTICO)
- `OSDetailContent.tsx`: header longo (código + badges + barra de ações de 7+ botões) seguido de **~10 Cards sequenciais** em coluna única `space-y-6`, todos com o mesmo peso visual (Informações, Equipamento, Descrição, Prazos, Itens, Pagamento, Estoque, Financeiro, Garantia, Observações).
- Sem agrupamento visual por relevância; a leitura fica longa e monótona.

### 2.7 Tabelas — 2 padrões conflitantes
- **Shadcn `<Table>`** (OS, Clientes, Orçamentos) em wrapper `rounded-[1.25rem] border border-border/60 overflow-hidden shadow-sm`, com `hover:bg-muted/50` sobrescrito inline (`hover:bg-muted/20`) e header `bg-muted/30` inline.
- **`<table>` nativa** (Transações, Movimentações, Fluxo diário) em wrapper `rounded-xl border` — estilo mais cru.
- Empty state da tabela é sempre um `if (items.length === 0) <EmptyState/>` **antes** da tabela (a tabela nem renderiza quando vazia).

### 2.8 Empty states — 2 padrões
- **Componente `EmptyState`** (`src/components/empty-state.tsx`) — usado em OS, Clientes, Orçamentos, Usuários.
- **Inline cru** (`text-center py-16` + `Icon className="opacity-30"`) — usado em Financeiro, Estoque, Relatórios, Fluxo, Movimentações, Transações.
- O `EmptyState` existe e é bom; falta aplicá-lo nas telas "cras".

### 2.9 Loading — 3 padrões
- `DetailSkeleton` (Detalhe OS), `CardSkeleton`/`ChartSkeleton` (Relatório Executivo), texto `"Carregando..."` (todo o resto). Sem skeleton padronizado.

### 2.10 Páginas públicas sem shell unificado (CRÍTICO)
- **Portal OS** (`(portal)`): polido — `mesh-gradient` + `grain` + cards shadcn + framer-motion + timeline responsiva. Bom.
- **Cardápio público** (`(public)`): shell **nu** (`min-h-screen bg-background`); chrome montado inline em `MenuContent.tsx` (header sticky feito à mão, cards `div` crus `rounded-lg border`, sem o tratamento `mesh-gradient` do portal). Parece produto diferente do portal.
- **Login** (`(auth)`): layout `bg-gray-50` **fora dos tokens** (a página em si é premium, mas o grupo `auth` não usa tokens de tema).
- **Não existe `PublicPageShell`.** Cada rota pública monta o próprio chrome.

### 2.11 Gráficos com paleta fragmentada
- `PIE_COLORS` redefinido em cada arquivo (`VisaoGeralContent` = 6 cores, `ExecutivoContent`/`FinanceiroContent` = 5 cores, paletas ligeiramente diferentes). Sem módulo compartilhado de cores de chart.

### 2.12 Cozinha crua (operacionalmente fraca)
- Kanban 4 colunas funcional com polling de 15s, mas cards monótonos, **sem sinalização de tempo de espera/urgência**, dots de coluna minúsculos, sem contraste de estado. MVP visual para uma tela que costuma ser foco operacional.

### 2.13 Descuido de acentuação no Cardápio admin
- Labels sem acento em `/cardapio` (admin): "Cardapio Digital", "Novo Item", "Preco", "Acoes", "Ordem padrao". Descuido de encoding/i18n.

### 2.14 Layout admin fora dos tokens
- `src/app/(admin)/layout.tsx` usa `bg-gray-900 text-white` hardcoded — não usa `--sidebar`/tokens, destoa do resto.

---

## 3. Telas mais críticas (ranking por prioridade de impacto × risco)

Ranking combina a prioridade do briefing com o nível de problema real encontrado.

| # | Tela | Arquivo | Estado atual | Prioridade | Risco |
|---|---|---|---|---|---|
| 1 | **Sidebar / Layout geral** | `src/components/layout/dashboard-sidebar.tsx`, `src/app/(dashboard)/layout.tsx` | Preta pesada (#000 dark), rodapé fraco, admin hardcoded | 🔴 Altíssima | Médio (client + framer `layoutId`) |
| 2 | **Financeiro (Visão Geral)** | `src/app/(dashboard)/financeiro/VisaoGeralContent.tsx` + sub-páginas | **Cru** — cards planos, loading texto, empty inline, input month cru | 🔴 Altíssima | Médio |
| 3 | **Detalhe da OS** | `src/app/(dashboard)/ordens-servico/[id]/OSDetailContent.tsx` | Denso, ~10 Cards sem hierarquia, barra de ações longa | 🔴 Alta | Médio |
| 4 | **Estoque (Dashboard)** | `src/app/(dashboard)/estoque/DashboardContent.tsx` + sub-páginas | **Cru** (mesmo perfil do Financeiro) | 🔴 Alta | Médio |
| 5 | **Cardápio público** | `src/app/(public)/c/[slug]/page.tsx` + `MenuContent.tsx` | Mobile-first bom, mas **plain**; destoa do portal | 🟠 Alta | Baixo (página pública isolada) |
| 6 | **Login** | `src/app/(auth)/login/page.tsx` (+ layout `bg-gray-50` fora de tokens) | Já premium; refinar layout group + tokens | 🟡 Média | Baixo |
| 7 | **Dashboard principal** | `src/app/(dashboard)/dashboard/page.tsx` | Já premium; refinar hierarquia/consistência | 🟡 Média | Baixo-Médio |
| 8 | **Portal público da OS** | `src/app/(portal)/portal/os/[token]/PortalOSContent.tsx` + timeline | Já bom; unificar com `PublicPageShell` + refinar | 🟡 Média | Baixo |
| 9 | **Cozinha** | `src/app/(dashboard)/cardapio/cozinha/CozinhaContent.tsx` | Cru, sem sinalização de tempo/urgência | 🟡 Média | Médio |
| 10 | **Relatórios** | `src/app/(dashboard)/relatorios/executivo/ExecutivoContent.tsx` + abas | 1 degrau acima (tem skeletons); refinar StatCard/cores de chart | 🟡 Média | Médio |
| 11 | **OS (lista)** | `src/app/(dashboard)/ordens-servico/page.tsx` | Boa base; padronizar via PageHeader/StatusBadge/DataTable | 🟢 Baixa-Média | Baixo |
| 12 | **Clientes / Orçamentos** | `clientes/page.tsx`, `orcamentos/page.tsx` | Clones consistentes; padronizar via componentes | 🟢 Baixa | Baixo |
| 13 | **Cardápio admin** | `src/app/(dashboard)/cardapio/page.tsx` | Genérico + descuido de acentuação | 🟢 Baixa | Baixo |
| 14 | **Caixa** | `src/app/(dashboard)/cardapio/caixa/CaixaContent.tsx` | Razoável; refinar | 🟢 Baixa | Baixo |
| 15 | **Upgrade/Módulos** | `src/app/(dashboard)/upgrade/page.tsx` | Sóbrio, sem motion; refinar | 🟢 Baixa | Baixo |
| 16 | **Admin (SUPER_ADMIN)** | `src/app/(admin)/layout.tsx` + `admin/*` | Sidebar hardcoded fora dos tokens | 🟢 Baixa | Médio |

---

## 4. Componentes a padronizar

Convenção: **[CRIAR]** = não existe; **[REFINAR]** = existe, melhorar; **[EXISTS]** = já serve, reaproveitar.

### 4.1 `PageHeader` — [CRIAR]
`src/components/layout/page-header.tsx`
- Props: `title`, `description?`, `actions?`, `breadcrumbs?`, `icon?`.
- Elimina a duplicação de ~10 arquivos.
- Regra taste: `tracking-tight` no título, `text-muted-foreground` na descrição, actions em `flex gap-2`.

### 4.2 `StatCard` (unifica MetricCard) — [CRIAR] (a partir do `MetricCard` local do dashboard)
`src/components/layout/stat-card.tsx`
- Props: `label`, `value`, `icon`, `trend?` (`{value, direction}`), `format?`, `tone?` (default/positive/negative/warn), `loading?`.
- Usa `AnimatedCounter` (existe) + `tabular-nums` nos números.
- Reaproveita o estilo polido (`rounded-[1.5rem]`, sombra tintida, hover lift) e o aplica onde hoje há cards planos.
- Substitui o `MetricCard` local do `dashboard/page.tsx` (exporta-o) e os cards planos de Financeiro/Estoque/Relatórios.

### 4.3 `StatusBadge` — [CRIAR] (unifica os 3 mapas, mantém compat)
`src/components/layout/status-badge.tsx` + `src/lib/status-palette.ts`
- Um `StatusBadge({ status, kind })` onde `kind` = `"os" | "os-priority" | "payment" | "orcamento" | "financeiro" | "trial"`.
- `status-palette.ts` centraliza o mapa `status → { label, className }` (consolida `os-status.ts` + `STATUS_COLORS` do financeiro + `getStatusVariant` dos orçamentos + trial).
- **Compat:** o `os-status.ts` existente pode reexportar do palette para não quebrar imports atuais, OU manter e ter o `StatusBadge` consumi-lo. Decisão de implementação na Camada 2 — priorizar não quebrar callers existentes.

### 4.4 `SectionTabs` — [CRIAR] (unifica 3 layouts de seção)
`src/components/layout/section-tabs.tsx`
- Props: `tabs: {href, label, icon, active}[]`, com `module` filter.
- Substitui a barra de abas quase idêntica de `financeiro/layout.tsx`, `estoque/layout.tsx`, `relatorios/layout.tsx`.

### 4.5 `SectionCard` — [CRIAR]
`src/components/layout/section-card.tsx`
- Card de seção consistente: `Card` shadcn + header com título/ícone/ação opcional + `CardContent`.
- Padroniza o "bloco de seção" usado no Detalhe OS, Financeiro, Relatórios.

### 4.6 `DataTable` / wrapper de tabela — [CRIAR] (wrapper, não primitive)
`src/components/layout/data-table.tsx`
- Wrapper visual: `rounded-[1.25rem] border border-border/60 overflow-hidden shadow-sm`, header `bg-muted/30`, `hover:bg-muted/50`, estado vazio embutido, responsivo `overflow-x-auto`.
- Envolve o `Table` shadcn existente (não o substitui). Unifica shadcn `<Table>` e `<table>` nativa sob o mesmo visual.

### 4.7 `EmptyState` — [REFINAR] (já existe em `src/components/empty-state.tsx`)
- Melhorar o visual (ícone em tile mais bonito, título/descrição com melhor hierarquia, CTA `ActionButton`).
- Aplicar nas telas que hoje usam inline `opacity-30` (Financeiro, Estoque, Relatórios, Fluxo, Movimentações, Transações).

### 4.8 `PublicPageShell` — [CRIAR]
`src/components/portal/public-page-shell.tsx`
- Header de marca (logo empresa) + footer "Powered by Gestor Local" + fundo `mesh-gradient`/`grain` opcional + `max-w` configurável.
- Unifica **Portal OS** + **Cardápio público** sob uma identidade pública coerente.
- **Não** herda a sidebar autenticada (já isolado por route groups — confirmado).

### 4.9 `Pagination` — [CRIAR]
`src/components/layout/pagination.tsx`
- Unifica o bloco `flex justify-center gap-2` duplicado em Clientes (server `<Link>`) e Transações/Movimentações/Fluxo (client `<Button>`).

### 4.10 `FilterPills` — [CRIAR]
`src/components/layout/filter-pills.tsx`
- Unifica pills de status de OS/Orçamentos (`<Button variant>` em `<Link>`) e de Transações/Movimentações (`<button>` cru).

### 4.11 `SectionSkeleton` / loading padronizado — [CRIAR]
`src/components/ui/section-skeleton.tsx`
- Unifica `DetailSkeleton`, `CardSkeleton`, `ChartSkeleton` e o texto `"Carregando..."` sob skeletons que casam com o layout real (taste: "Skeletal loaders matching layout sizes").

### 4.12 `ActionButton` group — [REFINAR]
- Hoje os grupos de ação são `flex items-center gap-2` ad hoc. Padronizar um grupo de ações no `PageHeader` e no Detalhe OS (primária + secundárias + overflow em dropdown).

### 4.13 Cores de chart — [CRIAR]
`src/lib/chart-palette.ts`
- Centraliza `PIE_COLORS` e a paleta de séries (receita=emerald, despesa=red, saldo=blue, etc.) hoje fragmentada em 5 arquivos.

### 4.14 `DashboardGrid` — [OPCIONAL, só se valer a pena]
- O dashboard já usa `grid grid-cols-1 md:grid-cols-3 gap-4` inline. Criar só se houver reuso real; senão manter inline (taste: "Anti-Card Overuse" — não inflar componentes sem necessidade).

---

## 5. Direção visual proposta (embasada em `taste-skill` + `emil-design-eng`)

### 5.1 Princípios gerais
- **Baseline taste:** DESIGN_VARIANCE 8 / MOTION_INTENSITY 6 / VISUAL_DENSITY 4 (Daily App Mode + offset).
- **1 accent:** emerald. Saturação <80% (já é). Neutros = zinc (consistente, não flutuar entre warm/cool).
- **Anti-purple/AI-slop:** nada de glows neon, gradientes roxos. Bases neutras + acento verde de alto contraste.
- **Anti-card overuse:** VISUAL_DENSITY 4 → cards só quando elevação comunica hierarquia. Usar `border-t`/`divide-y`/espaço negativo onde fizer sentido (especialmente no Detalhe OS, que hoje "carda" tudo).
- **States completos (taste Rule 5):** loading (skeleton), empty (componente), error (inline), tactile (`scale(0.97)`/`-translate-y-[1px]` no `:active`).
- **Mobile-first em públicas:** cardápio e portal; desktop-first com fallback `overflow-x-auto` no dashboard é aceitável.

### 5.2 Paleta (manter emerald, refinar sofisticação)
- Manter `--primary: #059669` (light) / `#34d399` (dark).
- **Sidebar:** trocar `#000000` (dark) e `#09090b` (light) por off-black elegante.
  - Light: sidebar em tom neutro escuro sofisticado (ex.: `zinc-900` `#18181b` com borda `#27272a`) **ou** inverter para sidebar clara (`#fafafa`/`#f4f4f5` com borda) estilo Linear/Vercel — **decidir na Camada 1** (ver §10, pergunta aberta).
  - Dark: `#09090b` (zinc-950) **nunca** `#000000`.
- Background neutro: `#fafafa` (light) é bom; avaliar um neutro levemente mais quente/frio só se unificar. Dark `#09090b` bom.
- Padronizar `chart-*` em `@theme` (já existe) + `chart-palette.ts`.
- Sombras: **tintidas ao background hue** (taste Rule 4) — `shadow-[0_2px_8px_rgba(0,0,0,0.04)]` light / sombra esverdeada sutil em dark.

### 5.3 Tipografia (manter Geist, melhorar hierarquia)
- Fonte: **Geist** (sans) + **Geist Mono** (mono) — manter. (taste aprova; banida Inter, mas Geist já está.)
- Hierarquia:
  - Título de página: `text-2xl font-semibold tracking-tight` (hoje `font-bold` — suavizar para `semibold`, menos "pesado").
  - Subtítulo/descrição: `text-sm text-muted-foreground`.
  - Valores grandes (dashboard): `text-3xl/4xl font-semibold tabular-nums tracking-tight`.
  - Números de métrica: `tabular-nums` (alinhamento) + `AnimatedCounter`.
  - Labels: `text-xs font-medium uppercase tracking-wide text-muted-foreground` (labels de campo) — ou `text-sm` conforme contexto.
  - Textos secundários: `text-sm text-muted-foreground`.
- `--font-heading` hoje = `--font-sans` (Geist). Manter; headings não precisam de família distinta.

### 5.4 Radius, sombras, bordas
- Radius base `0.875rem` bom. Padronizar uso: cards `rounded-[1.25rem]`/`rounded-[1.5rem]` (já recorrente), inputs `rounded-xl`, botões `rounded-xl` (já sobrescrito em todo uso — **elevar o default do cva** em vez de sobrescrever em cada chamada).
- Bordas: `border-border/60` (já recorrente) — padronizar.
- Sombras: `shadow-sm` padrão + hover lift `shadow-[0_8px_30px_rgba(0,0,0,0.08)]` (já usado no dashboard) — generalizar via token/classe utilitária.

### 5.5 Botões e badges (consistência)
- **Botões:** elevar o `rounded-xl` para default do `Button` cva (hoje é `rounded-lg` sobrescrito em todo lugar). Manter `:active { scale(0.97) }` (emil). Variantes já boas; `destructive` é "soft" (tinto, não sólido) — manter.
- **Badges:** unificar via `StatusBadge` + `status-palette.ts` (§4.3). Paleta semântica consistente (emerald=ok/sucesso, amber=pendente/alerta, red=atrasado/erro, blue/azul=info, zinc/gray=neutro/cancelado). Mesmo tom claro+escuro (`bg-x/10 text-x-600 dark:bg-x-500/15 dark:text-x-400`).

### 5.6 Motion (emil-design-eng)
- Easing: usar `--ease-out` (entradas), `--ease-in-out` (movimento em tela), `--ease-drawer` (drawers/sheets), `--ease-spring` (playful/Apple-like) — já existem.
- **Nunca animar ações de teclado** (100+/dia). Stagger de entrada: 30–80ms (emil), via `MotionContainer`/`MotionItem` existente.
- Botões: `scale(0.97)` no `:active`, `transition: transform 160ms var(--ease-out)`.
- Entradas: `scale(0.95) + opacity:0` (nunca `scale(0)`), `@starting-style` quando possível.
- Modais: `transform-origin: center` (centrado). Popovers/sheets: origin-aware (`var(--radix-*-transform-origin)` ou equivalente base-ui).
- Duração UI <300ms (dropdowns 150–250ms, modais 200–500ms).
- `prefers-reduced-motion`: já desativa `shimmer`/`float`; manter/reaplicar.
- Charts: animação de entrada leve no recharts (`isAnimationActive`, duração curta) — opcional, sem exagero.

### 5.7 Tabelas (padrão premium)
- Header `bg-muted/40` + `text-xs font-medium uppercase tracking-wide text-muted-foreground` (era `font-medium text-foreground`).
- Linhas: `hover:bg-muted/50`, `transition-colors`, separação `divide-y` ou `border-b`.
- Badges de status via `StatusBadge`.
- Ações alinhadas à direita, ícones consistentes, agrupadas (primária + overflow).
- Empty state via `EmptyState` embutido no `DataTable` (não mais o `if` antes da tabela).
- Paginação via `Pagination`.
- Responsivo `overflow-x-auto` mantido; em mobile avaliar card-stack para as listagens mais críticas (opcional, fora de escopo se arriscado).

### 5.8 Detalhe da OS (reorganização visual)
- Header enxuto: código + status + prioridade + pagamento como `StatusBadge`s; barra de ações agrupada (primária + secundárias + dropdown de overflow).
- Agrupar os ~10 Cards em **3 zonas de relevância** (ex.: "Atendimento" / "Comercial & Financeiro" / "Pós-venda & Garantia") via `SectionCard` + headings de seção, em vez de coluna única monótona.
- Usar `divide-y`/espaço negativo dentro das zonas (taste: anti-card overuse) para os blocos menores (Equipamento, Descrição, Prazos).
- Manter `DetailSkeleton` no loading.

### 5.9 Páginas públicas unificadas (`PublicPageShell`)
- Portal OS e Cardápio público sob o mesmo shell: header de marca + footer "Powered by" + `mesh-gradient`/`grain` sutil (já no portal, levar ao cardápio).
- Cardápio: cards de item com presença (thumbnail maior, hierarquia nome/descrição/preço), categorias com header, carrinho/bottom-sheet já bom — refinar tipografia e botões.
- Portal OS: já bom — alinhar ao shell + refinar timeline.
- Login: trocar `bg-gray-50` do grupo `(auth)` por tokens de tema; a página em si já é premium, só harmonizar o entorno.

---

## 6. Arquivos que serão alterados (por camada)

> Lista de **escrita/mudança**. Arquivos só-lidos para inspeção não listados. Marca `[novo]` = arquivo a criar.

### Camada 1 — Tokens e primitives globais
- `src/app/globals.css` — ajustar tokens (`--sidebar*`, sombras, `--radius*`, `--chart-*`), adicionar utilitárias de sombra tintida/borda suave. **Risco: médio** (afeta tudo).
- `src/components/ui/button.tsx` — elevar `rounded-xl` a default do cva + `:active scale(0.97)`. **Risco: baixo** (visual).
- `src/components/ui/badge.tsx` — refinar variants/cores para casar com `status-palette.ts`. **Risco: baixo**.
- `src/components/ui/card.tsx` — refinar sombra/borda default (borda suave + sombra tintida). **Risco: baixo**.
- `src/components/ui/table.tsx` — refinar header/linha/hover defaults. **Risco: baixo**.
- `src/components/ui/input.tsx`, `label.tsx`, `textarea.tsx`, `select.tsx` — refinar foco/label acima/erro abaixo (taste Rule 6). **Risco: baixo**.
- `src/lib/chart-palette.ts` `[novo]` — paleta de gráfico centralizada. **Risco: baixo**.

### Camada 2 — Layout + componentes de domínio
- `src/components/layout/dashboard-sidebar.tsx` — sidebar premium (off-black, active state, rodapé empresa, separação de módulos, ícones consistentes). **Risco: médio** (client + `layoutId`).
- `src/app/(dashboard)/layout.tsx` — refinar `max-w`, espaçamento, header mobile. **Risco: baixo-médio**.
- `src/components/layout/page-header.tsx` `[novo]`. **Risco: baixo**.
- `src/components/layout/stat-card.tsx` `[novo]` (deriva do `MetricCard` local). **Risco: baixo**.
- `src/components/layout/status-badge.tsx` `[novo]` + `src/lib/status-palette.ts` `[novo]`. **Risco: baixo-médio** (mantém compat com `os-status.ts`).
- `src/components/layout/section-tabs.tsx` `[novo]`. **Risco: baixo**.
- `src/components/layout/section-card.tsx` `[novo]`. **Risco: baixo**.
- `src/components/layout/data-table.tsx` `[novo]`. **Risco: baixo**.
- `src/components/layout/pagination.tsx` `[novo]`. **Risco: baixo**.
- `src/components/layout/filter-pills.tsx` `[novo]`. **Risco: baixo**.
- `src/components/ui/section-skeleton.tsx` `[novo]`. **Risco: baixo**.
- `src/components/empty-state.tsx` — refinar visual. **Risco: baixo**.
- `src/app/(dashboard)/financeiro/layout.tsx`, `estoque/layout.tsx`, `relatorios/layout.tsx` — usar `SectionTabs`. **Risco: baixo**.

### Camada 3 — Telas autenticadas (substituir inline por componentes)
- `src/app/(dashboard)/dashboard/page.tsx` — exportar `MetricCard` → `StatCard`, refinar hierarquia.
- `src/app/(dashboard)/ordens-servico/page.tsx` + `[id]/OSDetailContent.tsx` — `PageHeader`, `StatusBadge`, `DataTable`, reorganização do detalhe em zonas.
- `src/app/(dashboard)/financeiro/VisaoGeralContent.tsx`, `TransacoesListContent.tsx`, `fluxo/FluxoContent.tsx` — `StatCard`, `DataTable`, `EmptyState`, skeletons, `chart-palette`.
- `src/app/(dashboard)/estoque/DashboardContent.tsx`, `ProdutosContent.tsx`, `movimentacoes/MovimentacoesContent.tsx` — idem.
- `src/app/(dashboard)/relatorios/executivo/ExecutivoContent.tsx`, `financeiro/FinanceiroContent.tsx` + demais abas — `StatCard`, `chart-palette`, skeletons.
- `src/app/(dashboard)/clientes/page.tsx`, `orcamentos/page.tsx`, `usuarios/page.tsx` — `PageHeader`, `DataTable`, `Pagination`, `StatusBadge`, `EmptyState`.
- `src/app/(dashboard)/cardapio/page.tsx` — `PageHeader`, `DataTable`, **corrigir acentuação** dos labels.
- `src/app/(dashboard)/cardapio/cozinha/CozinhaContent.tsx` — sinalização de tempo/urgência, cards mais vivos.
- `src/app/(dashboard)/cardapio/caixa/CaixaContent.tsx` — refinar `StatCard`/barras de pagamento.
- `src/app/(dashboard)/upgrade/page.tsx` — `PageHeader`, motion leve, `ModuleCard` consistente.
- `src/app/(admin)/layout.tsx` + `admin/*` — sidebar via tokens (off-black), alinhar ao app. **Risco: médio** (área SUPER_ADMIN).

### Camada 4 — Telas públicas
- `src/components/portal/public-page-shell.tsx` `[novo]`. **Risco: baixo**.
- `src/app/(portal)/layout.tsx` — usar `PublicPageShell`. **Risco: baixo**.
- `src/app/(portal)/portal/os/[token]/PortalOSContent.tsx` + `src/components/portal/os-status-timeline.tsx` — alinhar ao shell, refinar timeline/header.
- `src/app/(public)/layout.tsx` — usar `PublicPageShell` (ou wrapper interno). **Risco: baixo**.
- `src/app/(public)/c/[slug]/page.tsx` + `MenuContent.tsx` — cards de item com presença, categorias com header, carrinho refinado, branding.
- `src/app/(auth)/layout.tsx` — trocar `bg-gray-50` por tokens de tema. **Risco: baixo**.
- `src/app/(auth)/login/page.tsx` — ajustes finos de harmonização (já premium).

---

## 7. Riscos e mitigações

| Risco | Severidade | Mitigação |
|---|---|--- |
| Tailwind **v4 sem config** — mudar tokens errado | Alto | Tudo via `@theme inline` + `:root`/`.dark` em `globals.css`. Nunca criar `tailwind.config`. Testar build após cada token. |
| `@base-ui/react` ≠ Radix | Médio | Não colar código Radix. Usar as APIs de `src/components/ui/*` existentes como referência. |
| Next.js **16 breaking changes** | Médio-Alto | Ler `node_modules/next/dist/docs/` antes de tocar em layouts/metadata/RSC (exigência `AGENTS.md`). |
| Quebrar `module-guard`/middleware/RLS/`tenantPrisma`/Stripe/auth | Crítico | **Não tocar em:** `src/lib/{module-guard,modules,auth,stripe,pricing,rate-limit}.ts`, middleware, `api/**` (exceto ajuste visual/serialização simples e necessário), schema Prisma, enums/status. Mudanças são puramente camada de view. |
| Sidebar client + `framer-motion` `layoutId` | Médio | Refatorar com cuidado; preservar `layoutId="activeIndicator"`/`"activeDot"`. Testar colapso + mobile. |
| `os-status.ts` usado em vários callers | Médio | `StatusBadge` consome o palette; manter `os-status.ts` reexportando ou estável. Não quebrar imports. |
| Status enums não podem mudar | Alto | **Não alterar** nenhum enum/status (`SERVICE_ORDER_STATUS`, `PAYMENT_STATUS`, etc.). Só o **visual** do badge. |
| Refatoração gigante desnecessária | Médio | Componentes só substituem inline já duplicado; não reescrever lógica de dados. Por tela: substituir header→`PageHeader`, card→`StatCard`, tabela→`DataTable`, vazio→`EmptyState`. |
| Hidratação/`suppressHydrationWarning` (next-themes) | Baixo | Manter padrão do `theme-toggle` (placeholder antes de `mounted`). |
| Charts paleta nova quebra cores existentes | Baixo | `chart-palette.ts` exporta as mesmas cores usadas hoje (emerald receita, red despesa, blue saldo); só centraliza. |
| Performance de motion | Baixo | Isolar animações perpétuas em componentes client folha (`React.memo`); respeitar `prefers-reduced-motion` (taste/emil). |

---

## 8. Ordem de implementação (camadas)

> Cada camada termina com **checkpoint de build** antes de avançar.

### Camada 1 — Fundação visual (tokens + primitives)
1. `globals.css`: ajustar `--sidebar*` (off-black), sombras tintidas, `--chart-*`, `--radius*`, bordas suaves. Adicionar utilitárias.
2. `chart-palette.ts` (novo).
3. `button.tsx`: `rounded-xl` default + `:active scale(0.97)` + `var(--ease-out)`.
4. `badge.tsx`, `card.tsx`, `table.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `select.tsx`: refinar defaults.
- ✅ Checkpoint: `npx tsc --noEmit` + `npm run build`.

### Camada 2 — Layout + componentes de domínio
1. `dashboard-sidebar.tsx` (premium) + `(dashboard)/layout.tsx` (max-w/espaçamento).
2. `page-header.tsx`, `stat-card.tsx`, `status-badge.tsx` + `status-palette.ts`, `section-tabs.tsx`, `section-card.tsx`, `data-table.tsx`, `pagination.tsx`, `filter-pills.tsx`, `section-skeleton.tsx` (todos novos).
3. `empty-state.tsx` refinado.
4. Aplicar `SectionTabs` em `financeiro/estoque/relatorios/layout.tsx`.
- ✅ Checkpoint: `tsc` + `build`.

### Camada 3 — Telas autenticadas
1. Dashboard principal (exportar `StatCard`).
2. OS lista + Detalhe OS (reorganização em zonas).
3. Financeiro (todas as sub-páginas).
4. Estoque (todas as sub-páginas).
5. Relatórios (todas as abas).
6. Clientes / Orçamentos / Usuários.
7. Cardápio admin (corrigir acentuação) + Cozinha + Caixa.
8. Upgrade/Módulos.
9. Admin (SUPER_ADMIN) — sidebar via tokens.
- ✅ Checkpoint: `tsc` + `build`.

### Camada 4 — Telas públicas
1. `public-page-shell.tsx` (novo).
2. `(portal)/layout.tsx` + Portal OS + timeline.
3. `(public)/layout.tsx` + Cardápio público (`MenuContent.tsx`).
4. `(auth)/layout.tsx` + Login (harmonização).
- ✅ Checkpoint final: `npx tsc --noEmit` + `npm run build`.

### Ao finalizar
- Rodar `npm run build` e `npx tsc --noEmit`.
- **Não rodar E2E** (fica para depois do visual estabilizar, conforme briefing).

---

## 9. Guard rails — o que NÃO será tocado

- Schema Prisma / migrations.
- Regra de negócio / lógica de dados.
- Endpoints de API (exceto ajuste visual/serialização simples e necessário, se surgir).
- `module-guard`, `middleware`, Stripe, RLS/`tenantPrisma`, auth/sessão.
- Enums/status (`SERVICE_ORDER_STATUS`, `SERVICE_ORDER_PRIORITY`, `PAYMENT_STATUS`, etc.).
- Nomes de rotas / slugs.
- Funcionalidades existentes (não remover).
- `src/lib/{module-guard,modules,auth,stripe,pricing,rate-limit,email,whatsapp}.ts` (lógica).

---

## 10. Decisões abertas (a confirmar antes de implementar)

1. **Sidebar light:** manter sidebar escura (off-black elegante) **ou** inverter para sidebar clara estilo Linear/Vercel? Recomendação inicial: **off-black refinado** (menor ruptura, mantém contraste com fundo claro). Ver §5.2.
2. **`StatusBadge` + `os-status.ts`:** reescrever `os-status.ts` para consumir `status-palette.ts`, **ou** manter `os-status.ts` estável e `StatusBadge` consumi-lo? Recomendação: **segundo** (zero risco de quebrar callers). Ver §4.3.
3. **`DashboardGrid`:** criar ou manter `grid` inline? Recomendação: **manter inline** (anti-inflação de componentes). Ver §4.14.
4. **Card-stack em mobile** para tabelas de listagens críticas: fazer ou deixar `overflow-x-auto`? Recomendação: **deixar overflow** nesta etapa (baixo risco), avaliar depois.

---

## 11. Pré-requisitos técnicos antes de implementar

1. **Ler** `node_modules/next/dist/docs/` relevantes (layouts, RSC, metadata, `next/font`) — Next 16 tem breaking changes (`AGENTS.md`).
2. Confirmar versão do **Tailwind v4** (sem config) e do **`@base-ui/react`** nas páginas/componentes que serão tocados.
3. Rodar `npx tsc --noEmit` e `npm run build` no estado **atual** como baseline verde antes de começar.

---

> **Este é um plano. Nada será implementado sem ordem explícita.**
> Após aprovação, recomenda-se trocar para **Kimi K2.6** (`ollama launch claude --model kimi-k2.6:cloud`) para a fase de implementação visual, e seguir as 4 camadas com checkpoints de build entre elas.
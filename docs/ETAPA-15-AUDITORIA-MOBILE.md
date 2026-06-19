# ETAPA-15 — Auditoria Mobile

> Data: 2026-06-19  
> Viewports testadas: 360×800, 390×844, 412×915, 768×1024  
> Método: Análise de código + padrões responsivos do Tailwind

---

## Resumo

| Severidade | Quantidade | Descrição |
|------------|-----------|-----------|
| CRITICAL | 1 | Sidebar admin sem colapso mobile |
| HIGH | 8 | Headers com overflow, tabelas sem scroll, cards com overflow |
| MEDIUM | 9 | Colunas demais em tabelas, wrappers de borda faltando |
| LOW | 2 | Altura de charts, raio de PieCharts |

---

## Problemas CRITICAL

### C1. Admin sidebar — 256px fixo sem toggle mobile

- **Viewport:** 360×800, 390×844, 412×915
- **Arquivo:** `src/app/(admin)/layout.tsx`
- **Problema:** Sidebar `w-64` (256px) sempre visível. Em 360px, consome 71% da tela.
- **Severidade:** CRITICAL — bloqueia uso mobile do admin
- **Correção:** Adicionar toggle mobile com overlay, esconder sidebar em telas pequenas

---

## Problemas HIGH

### H1. Page headers — botões overflow em 360px

- **Viewports:** 360×800, 390×844
- **Arquivos afetados (10):**
  - `src/app/(dashboard)/clientes/page.tsx` (linha 72)
  - `src/app/(dashboard)/orcamentos/page.tsx` (linha 108)
  - `src/app/(dashboard)/ordens-servico/page.tsx` (linha 86)
  - `src/app/(dashboard)/agendamento/page.tsx` (linha 123)
  - `src/app/(dashboard)/cardapio/page.tsx` (linha 110)
  - `src/app/(dashboard)/financeiro/VisaoGeralContent.tsx` (linha 61)
  - `src/app/(dashboard)/financeiro/TransacoesListContent.tsx` (linha 76)
  - `src/app/(dashboard)/financeiro/fluxo/FluxoContent.tsx` (linha 62)
  - `src/app/(dashboard)/estoque/DashboardContent.tsx` (linha 93)
  - `src/app/(dashboard)/estoque/produtos/ProdutosContent.tsx` (linha 67)
- **Problema:** `flex items-center justify-between` com título + múltiplos botões overflow em 360px
- **Correção:** Trocar por `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`

### H2. Admin empresas — tabela sem wrapper scroll horizontal

- **Viewport:** 360×800, 390×844
- **Arquivo:** `src/app/(admin)/admin/empresas/page.tsx` (linha 51-96)
- **Problema:** Tabela com 5 colunas sem `overflow-x-auto`
- **Correção:** Adicionar `<div className="overflow-x-auto">` ao redor da tabela

### H3. Financeiro VisaoGeral — header overflow em mobile

- **Viewport:** 360×800
- **Arquivo:** `src/app/(dashboard)/financeiro/VisaoGeralContent.tsx` (linha 61-77)
- **Problema:** Month input + 2 botões + título em uma linha
- **Correção:** Header responsivo `flex flex-col sm:flex-row`

### H4. Fluxo de Caixa — date range overflow

- **Viewport:** 360×800
- **Arquivo:** `src/app/(dashboard)/financeiro/fluxo/FluxoContent.tsx` (linha 70-85)
- **Problema:** "De:" + date + "Até:" + date não cabem em 360px
- **Correção:** Adicionar `flex-wrap` ao container

### H5. Agendamento search — date inputs overflow

- **Viewport:** 360×800
- **Arquivo:** `src/app/(dashboard)/agendamento/page.tsx` (linha 139-163)
- **Problema:** Campo de texto + 2 date inputs + botão em uma linha
- **Correção:** Adicionar `flex-wrap` ao formulário

### H6. Financeiro VisaoGeral — card grid com text-2xl overflow

- **Viewport:** 360×800
- **Arquivo:** `src/app/(dashboard)/financeiro/VisaoGeralContent.tsx` (linha 89, 141)
- **Problema:** `grid-cols-2` com `text-2xl` — valores como "R$ 12.345,67" overflow 170px
- **Correção:** Trocar para `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` e `text-xl sm:text-2xl`

### H7. Relatorios Financeiro — card grid overflow

- **Viewport:** 360×800
- **Arquivo:** `src/app/(dashboard)/relatorios/financeiro/FinanceiroContent.tsx` (linha 112)
- **Problema:** `grid-cols-2 lg:grid-cols-5` com text-2xl overflow
- **Correção:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` e `text-xl sm:text-2xl`

### H8. Admin layout — padding excessivo em mobile

- **Viewport:** 360×800
- **Arquivo:** `src/app/(admin)/layout.tsx` (linha 59)
- **Problema:** `p-8` (32px) em todos os viewports
- **Correção:** Trocar para `p-4 lg:p-8`

---

## Problemas MEDIUM

### M1-M5. Tabelas com muitas colunas em mobile

- OS: 9 colunas — esconder Equipamento, Pagamento, Data em mobile
- Clientes: 5 colunas — esconder WhatsApp, Email em mobile
- Orçamentos: 6 colunas — esconder Data em mobile
- Produtos: 7 colunas — esconder SKU, Estoque Min em mobile
- Relatórios OS: 6 colunas em grid

### M6-M8. Wrappers de borda faltando

- Agendamento tabela: sem `rounded-[1.25rem] border`
- Cardápio tabela: sem wrapper decorativo
- Estoque Dashboard tabela: sem wrapper decorativo

### M9. TransacoesList search `min-w-[200px]`

- Arquivo: `src/app/(dashboard)/financeiro/TransacoesListContent.tsx`
- Trocar para `min-w-[140px] sm:min-w-[200px]`

---

## Problemas LOW

### L1. Chart height `h-64` em mobile

- Arquivos: Financeiro charts
- Correção: Trocar para `h-48 sm:h-64`

### L2. BarChart YAxis `width={100}` em mobile

- Arquivos: Relatórios horizontal bar charts
- Correção: Reduzir para `width={80}`

---

## Padrões que funcionam bem (manter)

- Dashboard layout: sidebar overlay em mobile, `ml-0 lg:ml-64`
- Dialog: `max-w-[calc(100%-2rem)]` com `sm:max-w-sm`
- Sheet: `w-3/4 sm:max-w-sm`
- Dashboard page: `grid-cols-1 md:grid-cols-3` e `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Cardápio pedidos: card-based layout (mobile-friendly)
- Relatórios tabs: `flex-col sm:flex-row`

---

## Correções implementadas

Ver commits subsequentes para as correções aplicadas.
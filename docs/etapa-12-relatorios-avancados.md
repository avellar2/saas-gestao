# Etapa 12 — Relatórios Avançados e Dashboard Executivo

## 1. Estado Atual

### O que já existe

| Recurso | Arquivo | Estado |
|---------|---------|--------|
| Página `/relatorios` | `src/app/(dashboard)/relatorios/page.tsx` | Server component com cards estáticos, sem gráficos, sem filtro de mês, sem abas |
| API `/api/relatorios` | `src/app/api/relatorios/route.ts` | GET único com 22 queries paralelas, sem filtro de período, sem separação por relatório |
| Exportação CSV | `src/app/api/exportar/route.ts` | Exporta 8 entidades por `?entity=X`, não integrado à página de relatórios |
| Helper CSV | `src/lib/csv-export.ts` | `toCsv(headers, rows)` reaproveitável |
| PDF de OS/Orçamento | `src/app/api/pdf/os/[id]/route.tsx` | Não serve para relatórios |
| Módulo `reports` | `src/lib/modules.ts` | Definido como `addon`, R$20/mês, já no sidebar |

### O que falta
- Gráficos (recharts já instalado)
- Filtro de mês/período
- Abas por tipo de relatório
- Dashboard executivo consolidado
- Exportação CSV por relatório
- Respeitar módulos ativos (Cardápio inativo → esconder seção Cardápio)
- Relatórios específicos: financeiro, OS, cardápio, estoque, clientes

---

## 2. Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/app/api/relatorios/executivo/route.ts` | GET — Dashboard executivo consolidado |
| `src/app/api/relatorios/financeiro/route.ts` | GET — Relatório financeiro consolidado |
| `src/app/api/relatorios/os/route.ts` | GET — Relatório de Ordens de Serviço |
| `src/app/api/relatorios/cardapio/route.ts` | GET — Relatório do Cardápio |
| `src/app/api/relatorios/estoque/route.ts` | GET — Relatório de Estoque |
| `src/app/api/relatorios/clientes/route.ts` | GET — Relatório de Clientes |
| `src/app/api/relatorios/exportar/route.ts` | GET — Exportação CSV por tipo de relatório |
| `src/app/(dashboard)/relatorios/layout.tsx` | Layout com 6 abas |
| `src/app/(dashboard)/relatorios/ExecutivoContent.tsx` | Dashboard executivo client component |
| `src/app/(dashboard)/relatorios/financeiro/page.tsx` | Página relatório financeiro |
| `src/app/(dashboard)/relatorios/FinanceiroContent.tsx` | Client component financeiro |
| `src/app/(dashboard)/relatorios/os/page.tsx` | Página relatório OS |
| `src/app/(dashboard)/relatorios/OSContent.tsx` | Client component OS |
| `src/app/(dashboard)/relatorios/cardapio/page.tsx` | Página relatório Cardápio |
| `src/app/(dashboard)/relatorios/CardapioContent.tsx` | Client component Cardápio |
| `src/app/(dashboard)/relatorios/estoque/page.tsx` | Página relatório Estoque |
| `src/app/(dashboard)/relatorios/EstoqueContent.tsx` | Client component Estoque |
| `src/app/(dashboard)/relatorios/clientes/page.tsx` | Página relatório Clientes |
| `src/app/(dashboard)/relatorios/ClientesContent.tsx` | Client component Clientes |
| `src/lib/relatorios-helpers.ts` | Helpers reutilizáveis (module check, cálculos) |

## 3. Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/app/(dashboard)/relatorios/page.tsx` | De server component estático → redirect para `/relatorios/executivo` ou wrapper simples |
| `src/app/api/relatorios/route.ts` | Manter para compatibilidade, mas delegar para novo endpoint executivo |
| `src/lib/modules.ts` | Adicionar sub-rotas de relatórios ao MODULE_ROUTE_MAP |

## 4. Novos Endpoints

### GET `/api/relatorios/executivo?month=YYYY-MM`

**Retorna:**
```ts
{
  month: string,                // "2026-06"
  cards: {
    receitaMes: number,          // soma PAID (RECEIVABLE) por paidAt no mês
    despesaMes: number,          // soma PAID (PAYABLE) por paidAt no mês
    saldoMes: number,            // receitaMes - despesaMes
    osAbertas: number,           // OS com status != COMPLETED/CANCELLED
    osConcluidasMes: number,     // OS com completedAt no mês
    pedidosEntreguesMes: number,  // MenuOrder DELIVERED com paidAt no mês (se menu ativo)
    contasVencidas: number,      // FinancialTransaction PENDING + dueDate < hoje
    produtosBaixo: number,       // Product quantity <= minStock AND quantity > 0 (se estoque ativo)
    produtosZerados: number,     // Product quantity <= 0 (se estoque ativo)
    ticketMedioCardapio: number, // receitaCardapio / pedidosEntreguesMes (se menu ativo)
    valorTotalEstoque: number,   // sum(quantity * costPrice) (se estoque ativo)
  },
  charts: {
    receitaDespesaDiaria: { date: string, receita: number, despesa: number }[],
    receitaPorOrigem: { origem: string, valor: number }[],  // manual, os, cardapio
  },
  activeModules: {
    finance: boolean,
    menu: boolean,
    inventory: boolean,
    service_orders: boolean,
  }
}
```

**Regras de cálculo:**
- `receitaMes`: `FinancialTransaction` where `type=RECEIVABLE, status=PAID, paidAt >= startOfMonth, paidAt < endOfMonth` → `sum(amount)`
- `despesaMes`: `FinancialTransaction` where `type=PAYABLE, status=PAID, paidAt >= startOfMonth, paidAt < endOfMonth` → `sum(amount)`
- `osAbertas`: `ServiceOrder` where `status NOT IN [COMPLETED, CANCELLED]` → `count`
- `osConcluidasMes`: `ServiceOrder` where `completedAt >= startOfMonth, completedAt < endOfMonth` → `count`
- `pedidosEntreguesMes`: `MenuOrder` where `status=DELIVERED, paidAt >= startOfMonth, paidAt < endOfMonth` → `count` (só se módulo menu ativo)
- `contasVencidas`: `FinancialTransaction` where `status=PENDING, dueDate < hoje` → `count` (só se módulo finance ativo)
- `produtosBaixo/Zerados/valorTotalEstoque`: usa `Product` (só se módulo inventory ativo)
- `ticketMedioCardapio`: `receitaCardapio / pedidosEntreguesMes` (só se módulo menu ativo, 0 se sem pedidos)
- `receitaDespesaDiaria`: agrupa PAID por dia (paidAt) dentro do mês
- `receitaPorOrigem`: agrupa RECEIVABLE PAID por origem (serviceOrderId != null → os, menuOrderId != null → cardapio, resto → manual)

### GET `/api/relatorios/financeiro?month=YYYY-MM`

**Retorna:**
```ts
{
  month: string,
  resumo: {
    receitas: number,            // PAID RECEIVABLE por paidAt no mês
    despesas: number,            // PAID PAYABLE por paidAt no mês
    saldo: number,               // receitas - despesas
    contasVencidas: number,      // PENDING + dueDate < hoje
    contasPendentes: number,     // PENDING + dueDate >= hoje
  },
  receitasPorDia: { date: string, valor: number }[],
  despesasPorDia: { date: string, valor: number }[],
  receitasPorOrigem: { origem: string, valor: number }[],
  despesasPorCategoria: { categoria: string, valor: number }[],  // top 5
}
```

**Regras:**
- Só retorna dados se módulo `finance` ativo, senão 403
- PAID → `paidAt` no período
- PENDING → `dueDate` para contas abertas
- CANCELLED → excluído dos totais principais
- OVERDUE: calculado visualmente (PENDING + dueDate < hoje)

### GET `/api/relatorios/os?month=YYYY-MM`

**Retorna:**
```ts
{
  month: string,
  resumo: {
    total: number,               // OS criadas no mês (createdAt)
    abertas: number,             // status != COMPLETED/CANCELLED
    concluidas: number,          // completedAt no mês
    canceladas: number,          // CANCELLED + cancelledAt? (ou status CANCELLED criadas no mês)
    receitaGerada: number,       // sum(total) das OS concluídas no mês
    ticketMedio: number,         // receitaGerada / concluidas (0 se 0)
  },
  statusDistribution: { status: string, count: number }[],
  topClientes: { cliente: string, total: number, valor: number }[],  // top 5
  porTecnico: { tecnico: string, total: number, concluidas: number }[],  // se technicianId existir
}
```

**Regras:**
- Só retorna dados se módulo `service_orders` ativo, senão 403
- `total`: OS com `createdAt` no mês
- `abertas`: status NOT IN [COMPLETED, CANCELLED] (contagem atual, não filtrada por mês)
- `concluidas`: `completedAt` no mês
- `receitaGerada`: `sum(finalAmount ?? total)` das OS com `completedAt` no mês
- `topClientes`: agrupa OS por `customerId` no mês, soma valor, top 5
- `porTecnico`: agrupa por `technicianId` onde não null, top 5

### GET `/api/relatorios/cardapio?month=YYYY-MM`

**Retorna:**
```ts
{
  month: string,
  resumo: {
    pedidosEntregues: number,    // DELIVERED com paidAt no mês
    pedidosCancelados: number,   // CANCELLED no mês
    receita: number,             // sum(total) dos DELIVERED no mês
    ticketMedio: number,         // receita / pedidosEntregues
  },
  vendasPorPagamento: { metodo: string, total: number, valor: number }[],
  itensMaisVendidos: { item: string, quantidade: number, valor: number }[],  // top 5
  vendasPorDia: { date: string, pedidos: number, valor: number }[],
}
```

**Regras:**
- Só retorna dados se módulo `menu` ativo, senão 403
- `pedidosEntregues`: `MenuOrder` where `status=DELIVERED, paidAt >= startOfMonth, paidAt < endOfMonth`
- `pedidosCancelados`: `MenuOrder` where `status=CANCELLED, updatedAt >= startOfMonth, updatedAt < endOfMonth`
- `receita`: `sum(total)` dos pedidos entregues
- `vendasPorPagamento`: agrupa DELIVERED por `paymentMethod`
- `itensMaisVendidos`: soma `MenuOrderItem.quantity` agrupado por `nameSnapshot` nos pedidos entregues do mês, top 5
- `vendasPorDia`: agrupa DELIVERED por dia (paidAt) no mês

### GET `/api/relatorios/estoque?month=YYYY-MM`

**Retorna:**
```ts
{
  month: string,
  resumo: {
    produtosBaixo: number,      // quantity > 0 && quantity <= minStock
    produtosZerados: number,    // quantity <= 0
    valorTotalEstoque: number,  // sum(quantity * costPrice) onde costPrice != null
    movimentacoesNoPeriodo: number,  // StockMovement createdAt no mês
    entradas: number,           // sum(quantity) IN no mês
    saidas: number,             // sum(quantity) OUT no mês
  },
  produtosBaixoLista: { id: string, nome: string, quantidade: number, minStock: number }[],  // top 10
  produtosZeradosLista: { id: string, nome: string }[],  // top 10
  produtosMaisMovimentados: { produto: string, movimentacoes: number, entradas: number, saidas: number }[],  // top 5
  movimentacoesPorOrigem: { origem: string, total: number }[],  // manual, os
}
```

**Regras:**
- Só retorna dados se módulo `inventory` ativo, senão 403
- `produtosBaixo/Zerados`: contagem atual (não filtrada por mês)
- `valorTotalEstoque`: usa `costPrice` se existir, senão `0` por produto
- `movimentacoesNoPeriodo`: `StockMovement` com `createdAt` no mês
- `produtosMaisMovimentados`: agrupa `StockMovement` por `productId` no mês, top 5
- `movimentacoesPorOrigem`: `serviceOrderId != null` → os, resto → manual

### GET `/api/relatorios/clientes?month=YYYY-MM`

**Retorna:**
```ts
{
  month: string,
  resumo: {
    total: number,              // total de clientes
    novosNoPeriodo: number,     // createdAt no mês
  },
  topClientesReceita: { cliente: string, receita: number, os: number }[],  // top 5
  clientesMaisOS: { cliente: string, total: number }[],  // top 5
}
```

**Regras:**
- Sempre disponível (clientes é módulo core)
- `total`: `Customer.count()` total da empresa
- `novosNoPeriodo`: `Customer` com `createdAt` no mês
- `topClientesReceita`: agrupa OS por `customerId` no mês, soma `total`, inclui contagem de OS, top 5
- `clientesMaisOS`: agrupa OS por `customerId` (all-time), top 5

### GET `/api/relatorios/exportar?tipo=executivo|financeiro|os|cardapio|estoque|clientes&month=YYYY-MM`

**Retorna:** CSV com os dados do relatório selecionado.

**Regras:**
- Exige módulo `reports` ativo
- Exige módulo específico ativo (ex: `finance` para tipo financeiro)
- Loga exportação via `logActivity`
- Reutiliza `toCsv` de `src/lib/csv-export.ts`

---

## 5. UI — Layout com 6 Abas

### Estrutura

```
/relatorios           → redirect para /relatorios/executivo
/relatorios/executivo → ExecutivoContent
/relatorios/financeiro → FinanceiroContent
/relatorios/os        → OSContent
/relatorios/cardapio  → CardapioContent
/relatorios/estoque   → EstoqueContent
/relatorios/clientes  → ClientesContent
```

### Layout (`layout.tsx`)

Seguir padrão existente (financeiro/cardapio):
- "use client"
- TABS array: `{ href, label, icon, exact }`
- Abas: Executivo (LayoutDashboard), Financeiro (DollarSign), OS (Wrench), Cardápio (UtensilsCrossed), Estoque (Package), Clientes (Users)
- Abas de módulos inativos: renderizar com `opacity-50 pointer-events-none` + tooltip "Módulo não ativo" (ou esconder — ver seção 8)
- Filtro de mês global no layout (shared state via prop ou URL param)
- Active styling: `bg-primary/10 text-primary border-b-2 border-primary`

### Componente ExecutivoContent

**Filtro:** `<input type="month">` no topo

**Cards (3 colunas desktop, 2 mobile):**
1. Receita do Mês (TrendingUp, verde)
2. Despesa do Mês (TrendingDown, vermelho)
3. Saldo do Mês (DollarSign, verde/vermelho)
4. OS Abertas (Wrench, roxo)
5. OS Concluídas no Mês (CheckCircle, roxo)
6. Pedidos Entregues no Mês (UtensilsCrossed, laranja) — só se menu ativo
7. Contas Vencidas (AlertTriangle, vermelho) — só se finance ativo
8. Produtos Estoque Baixo (AlertTriangle, amarelo) — só se inventory ativo
9. Produtos Zerados (Ban, vermelho) — só se inventory ativo
10. Ticket Médio Cardápio (Receipt, azul) — só se menu ativo
11. Valor Total Estoque (DollarSign, cyan) — só se inventory ativo

**Gráficos:**
1. BarChart: Receita x Despesa por dia no mês (verde/vermelho)
2. PieChart: Receita por Origem (Manual, OS, Cardápio)

**Card inativo:** quando módulo não ativo, renderizar card com "— " e badge "Módulo inativo"

### Componente FinanceiroContent

**Cards:** Receitas, Despesas, Saldo, Contas Vencidas, Contas Pendentes

**Gráficos:**
1. ComposedChart: Receitas e Despesas por dia (barras) + linha saldo acumulado
2. PieChart: Receitas por Origem
3. PieChart: Despesas por Categoria (top 5)

### Componente OSContent

**Cards:** Total no Mês, Abertas, Concluídas, Canceladas, Receita Gerada, Ticket Médio

**Gráficos:**
1. PieChart: Distribuição por Status
2. BarChart: Top 5 Clientes por Receita

**Tabela:** Por Técnico (se existir)

### Componente CardapioContent

**Cards:** Pedidos Entregues, Cancelados, Receita, Ticket Médio

**Gráficos:**
1. BarChart: Vendas por Dia (pedidos + valor)
2. PieChart: Vendas por Forma de Pagamento

**Tabela:** Itens Mais Vendidos (top 5)

### Componente EstoqueContent

**Cards:** Produtos Baixo, Zerados, Valor Total, Movimentações no Período, Entradas, Saídas

**Gráficos:**
1. BarChart: Entradas x Saídas por dia
2. PieChart: Movimentações por Origem (Manual, OS)

**Tabelas:**
- Produtos em Estoque Baixo (top 10, com link para /estoque/[id])
- Produtos Mais Movimentados (top 5)

### Componente ClientesContent

**Cards:** Total de Clientes, Novos no Período

**Gráficos:**
1. BarChart: Top 5 Clientes por Receita
2. BarChart: Clientes com Mais OS

**Empty states** em todos os componentes quando dados = 0 ou null.

**Skeleton/loading** com `Carregando...` enquanto fetch pendente.

---

## 6. Respeitar Módulos Ativos

### Na API (executivo)

O endpoint `/api/relatorios/executivo` consulta quais módulos estão ativos e retorna:
```ts
activeModules: { finance, menu, inventory, service_orders }
```

Para cada módulo inativo, os campos relacionados retornam `0` ou `null` (não faz query).

### Na API (específicos)

Cada endpoint de relatório específico verifica o módulo:
- `/api/relatorios/financeiro` → verifica `finance`
- `/api/relatorios/cardapio` → verifica `menu`
- `/api/relatorios/estoque` → verifica `inventory`
- `/api/relatorios/os` → verifica `service_orders`
- `/api/relatorios/clientes` → sempre disponível (core)

Se módulo inativo → 403 com `{ error: "Módulo não ativo", moduleKey }`

### Na UI (layout)

- Abas de módulos inativos: **esconder** a aba (não renderizar), pois fica mais limpo
- Alternativa considerada: renderizar aba desabilitada → rejeitado, polui a UI
- A aba "Executivo" e "Clientes" sempre aparecem (core)
- As demais abas só aparecem se o módulo correspondente estiver ativo
- No Executivo, cards de módulos inativos mostram badge "Módulo inativo" em vez do valor

### Como detectar módulos ativos no layout

O layout já recebe `activeModuleKeys` do dashboard layout pai. O componente de aba pode usar `isModuleActive` ou receber via prop.

**Solução:** O `layout.tsx` de relatórios faz fetch de `/api/relatorios/executivo` no client para obter `activeModules`, OU recebe a lista de módulos ativos via prop do layout pai (como o sidebar já faz).

**Melhor opção:** Reutilizar o mesmo padrão do sidebar — o layout `(dashboard)/layout.tsx` já passa `activeModuleKeys` para o sidebar. O `relatorios/layout.tsx` pode usar `usePathname` e um hook simples que chama `/api/relatorios/executivo` sem params para obter `activeModules`.

---

## 7. Riscos

| Risco | Mitigação |
|-------|-----------|
| Queries pesadas no mês (especialmente agregações diárias) | Limitar ao mês, usar `Promise.all` para paralelizar, reduzir em JS quando possível |
| `paidAt` null em transações PAID | Filtro WHERE inclui `paidAt NOT NULL` para agregações por período |
| `completedAt` null em OS concluídas | Usar `updatedAt` como fallback quando `completedAt` for null (OS antigas) |
| `MenuOrderItem.nameSnapshot` null | Usar `nameSnapshot ?? "Item removido"` |
| Performance com muitos itens por pedido | Limitar `itensMaisVendidos` a top 5, usar aggregate em vez de fetch all |
| Exportação CSV com dados grandes | Não travar esta etapa por PDF; CSV usa streaming simples com `toCsv` |
| Módulos inativos gerando 403 na aba | Layout esconde abas de módulos inativos; cards mostram "Módulo inativo" |
| `costPrice` null em produtos | `valorTotalEstoque`: se costPrice null, soma como 0 |

---

## 8. Como Testar

1. **Build + typecheck:** `npm run build && npx tsc --noEmit`
2. **Aba Executivo:** Verificar cards com dados reais, gráficos renderizam, filtro de mês funciona
3. **Aba Financeiro:** Verificar dados batem com `/financeiro/visao-geral`, OVERDUE calculado visual
4. **Aba OS:** Verificar totais com a página de OS, distribuição por status correta
5. **Aba Cardápio:** Verificar totais com `/cardapio/caixa`, itens mais vendidos corretos
6. **Aba Estoque:** Verificar totais com `/estoque/dashboard`, alertas consistentes
7. **Aba Clientes:** Verificar total de clientes com a página de clientes
8. **Módulos inativos:** Desativar Cardápio → aba some, card no executivo mostra "Módulo inativo"
9. **Exportação CSV:** Clicar "Exportar CSV" em cada aba, verificar conteúdo
10. **Período:** Trocar mês, verificar dados filtram corretamente

---

## 9. Ordem de Implementação

1. **`src/lib/relatorios-helpers.ts`** — Helpers: `getMonthRange`, `checkReportModuleAccess`, `formatMonthLabel`, `ORIGIN_LABELS`
2. **APIs** — Ordem: execututivo → financeiro → os → cardapio → estoque → clientes → exportar
3. **Layout** — `relatorios/layout.tsx` com abas dinâmicas
4. **Página principal** — Modificar `page.tsx` para redirect
5. **Content components** — ExecutivoContent → FinanceiroContent → OSContent → CardapioContent → EstoqueContent → ClientesContent
6. **modules.ts** — Adicionar sub-rotas
7. **Build + typecheck**
8. **Commit**

---

## 10. Não Implementar Nesta Etapa

- BI avançado
- DRE contábil
- Relatórios fiscais / nota fiscal
- Previsão com IA
- Dashboard personalizável
- Permissões avançadas por relatório
- PDF de relatórios (só CSV)
- Comparações período-a-período
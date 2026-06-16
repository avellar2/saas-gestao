# Etapa 10 — Financeiro Premium: Fluxo de Caixa, Contas a Pagar/Receber e Dashboard

## Contexto

O módulo Financeiro já existe com CRUD básico (listar, criar, editar, excluir). Receitas automáticas chegam da OS (Etapa 5) e do Cardápio (Etapa 8), mas os campos `serviceOrderId`/`menuOrderId` nunca são expostos na UI. Não há dashboard, gráficos, fluxo de caixa, visão de contas a pagar/receber, nem detecção de vencidos.

Esta etapa transforma o Financeiro em produto premium sem quebrar o que já funciona.

---

## 1. Estado Atual

### FinancialTransaction (schema atual)
```
id, companyId, type (String), description, category?, amount (Decimal),
dueDate?, paidAt?, status (String, default PENDING), customerId?,
notes?, serviceOrderId?, menuOrderId?, createdAt, updatedAt
```

- `type` e `status` são **Strings**, não enums Prisma
- `serviceOrderId` e `menuOrderId` existem mas **nunca são lidos pela UI**
- Nenhuma mudança no Prisma é necessária

### Rotas atuais
| Rota | Métodos |
|------|---------|
| `/api/financeiro` | GET (list), POST (create) |
| `/api/financeiro/[id]` | GET, PUT (mark-paid ou update), DELETE |

### Páginas atuais
| Página | Função |
|--------|--------|
| `/financeiro` | Lista com 3 cards (A Receber, A Pagar, Saldo) + tabela + filtros |
| `/financeiro/novo` | Formulário de criação |
| `/financeiro/[id]` | Detalhe, editar, marcar como pago, excluir |

### Gaps
- Sem layout/tabs
- Sem gráficos (nenhuma lib de chart instalada)
- Sem fluxo de caixa
- Sem visão separada de Contas a Receber / Contas a Pagar
- `serviceOrderId`/`menuOrderId` não são exibidos
- OVERDUE não é detectado (campo existe mas nada transita para ele)
- PUT route não usa Zod validation
- Cards de resumo calculam sobre TODAS as transações sem filtro de período

---

## 2. Mudanças no Prisma

**Nenhuma.** O schema atual suporta tudo que precisamos:
- `serviceOrderId`/`menuOrderId` já existem para detectar origem
- `status` já inclui OVERDUE como valor string
- `dueDate` já existe para cálculo de vencidos
- `paidAt` já existe para fluxo de caixa

---

## 3. Biblioteca de Gráficos

**Sugestão: `recharts`** (≈45KB gzip, React-native, amplamente usada com Next.js)

Alternativas consideradas:
- `chart.js` + `react-chartjs-2`: mais pesada, mais configuração
- `@nivo`: bonita mas bundle grande
- D3: baixo nível demais para este uso

Se preferir não instalar lib nova, posso usar barras CSS puras (como já fiz no Caixa do Cardápio). Mas para a Visão Geral com receita x despesa por dia e distribuição por categoria, recharts fica significativamente melhor.

**Aguardando confirmação sobre instalação de recharts.**

---

## 4. Novas Rotas / APIs

### GET `/api/financeiro/resumo?month=YYYY-MM`

Retorna cards da visão geral:
```json
{
  "month": "2026-06",
  "receivable": { "total": 5000, "paid": 3500, "pending": 1200, "overdue": 300 },
  "payable": { "total": 2000, "paid": 1500, "pending": 400, "overdue": 100 },
  "balance": 3000,
  "byOrigin": { "manual": 1000, "os": 2500, "menu": 500 },
  "byCategory": [{ "category": "Manutenção", "type": "RECEIVABLE", "amount": 2500 }],
  "daily": [{ "date": "2026-06-01", "receivable": 500, "payable": 200 }]
}
```

**Regras de cálculo:**
- Filtrar por mês: `dueDate` ou `paidAt` dentro do mês (para PENDING/OVERDUE usa `dueDate`; para PAID usa `paidAt`)
- `overdue`: PENDING + `dueDate < hoje` → contado como vencido
- `byOrigin`: detectar via `serviceOrderId`/`menuOrderId`/nenhum
- `daily`: agrupar transações PAID por `paidAt`, PENDING/OVERDUE por `dueDate

### GET `/api/financeiro/fluxo-caixa?start=YYYY-MM-DD&end=YYYY-MM-DD`

Retorna agrupamento por dia:
```json
{
  "start": "2026-06-01",
  "end": "2026-06-30",
  "days": [
    { "date": "2026-06-01", "receivable": 500, "payable": 200, "balance": 300, "accumulated": 300 },
    { "date": "2026-06-02", "receivable": 0, "payable": 100, "balance": -100, "accumulated": 200 }
  ]
}
```

**Regras:**
- Apenas transações com `status: "PAID"` e `paidAt` dentro do período
- `receivable` = soma de type RECEIVABLE no dia
- `payable` = soma de type PAYABLE no dia
- `balance` = receivable - payable
- `accumulated` = saldo acumulado desde o primeiro dia

### PATCH `/api/financeiro/transacoes/[id]/pay`

Marca como pago:
- `status` → "PAID"
- `paidAt` → `new Date()`
- ActivityLog: "Transação marcada como paga: {description}"

### PATCH `/api/financeiro/transacoes/[id]/cancel`

Cancela transação:
- `status` → "CANCELLED"
- ActivityLog: "Transação cancelada: {description}"

### GET `/api/financeiro/transacoes` (melhorar)

Adicionar filtros:
- `month=YYYY-MM` — filtrar por mês (dueDate ou paidAt)
- `origin=manual|os|menu` — filtrar por origem

---

## 5. UI: Layout com Tabs

### Novo: `src/app/(dashboard)/financeiro/layout.tsx`

```
Visão Geral | Contas a Receber | Contas a Pagar | Fluxo de Caixa | Transações
```

| Tab | Rota | Conteúdo |
|-----|------|----------|
| Visão Geral | `/financeiro` | Dashboard com cards + gráficos |
| Contas a Receber | `/financeiro/receber` | Lista type=RECEIVABLE |
| Contas a Pagar | `/financeiro/pagar` | Lista type=PAYABLE |
| Fluxo de Caixa | `/financeiro/fluxo` | Tabela agrupada por dia |
| Transações | `/financeiro/transacoes` | Lista completa (atual) |

A rota `/financeiro` atual (lista) vira a Visão Geral.
A funcionalidade de lista atual é movida para `/financeiro/transacoes`.
`/financeiro/novo` e `/financeiro/[id]` continuam funcionando.

---

## 6. Visão Geral Financeira (`/financeiro`)

### Cards
| Card | Cálculo |
|------|---------|
| Receita do mês | soma RECEIVABLE do mês |
| Despesa do mês | soma PAYABLE do mês |
| Saldo do mês | receita - despesa |
| A receber em aberto | RECEIVABLE PENDING+OVERDUE |
| A pagar em aberto | PAYABLE PENDING+OVERDUE |
| Contas vencidas | PENDING + dueDate < hoje |

### Gráficos (se recharts aprovado)
1. **Receitas x Despesas por dia** — BarChart com 2 barras (receita verde, despesa vermelha)
2. **Distribuição por categoria** — PieChart/DonutChart
3. **Receitas por origem** — PieChart com 3 fatias (Manual, OS, Cardápio)

Se recharts NÃO for aprovado: usar barras CSS puras como no Caixa do Cardápio.

### Filtro de mês
- Seletor `<input type="month">` padrão do browser
- Default: mês atual

---

## 7. Contas a Receber (`/financeiro/receber`)

Lista filtrada `type: RECEIVABLE` com:
- Descrição, categoria, origem (badge OS/Cardápio/Manual), cliente, valor, vencimento, data pagamento, status
- Ações: marcar como pago, cancelar, editar, excluir
- Filtros: status, período, origem
- Badge de origem com ícone: 🔧 OS, 🍽️ Cardápio, ✏️ Manual

---

## 8. Contas a Pagar (`/financeiro/pagar`)

Lista filtrada `type: PAYABLE` com:
- Descrição, categoria, valor, vencimento, pagamento, status
- Ações: marcar como pago, cancelar, editar, excluir
- Filtros: status, período

---

## 9. Fluxo de Caixa (`/financeiro/fluxo`)

- Filtro por período (data início, data fim)
- Tabela: Data | Entradas | Saídas | Saldo do dia | Acumulado
- Linhas com saldo positivo em verde, negativo em vermelho
- Se recharts: gráfico de linha com saldo acumulado

---

## 10. Regra de Vencidos (OVERDUE)

**Cálculo visual apenas**, sem alterar o banco:

```typescript
function isOverdue(tx: { status: string; dueDate: string | null }): boolean {
  if (tx.status !== "PENDING") return false;
  if (!tx.dueDate) return false;
  return new Date(tx.dueDate) < new Date();
}

// Na UI:
const displayStatus = isOverdue(tx) ? "OVERDUE" : tx.status;
```

- No resumo: contagens de vencidos usam esta lógica
- Na listagem: badge "Vencido" aparece para PENDING com dueDate < hoje
- No banco: status continua PENDING (sem efeito colateral)

---

## 11. Origem da Transação

```typescript
function getTransactionOrigin(tx: {
  serviceOrderId: string | null;
  menuOrderId: string | null;
}): "os" | "menu" | "manual" {
  if (tx.serviceOrderId) return "os";
  if (tx.menuOrderId) return "menu";
  return "manual";
}

const ORIGIN_LABELS = {
  os: { label: "OS", icon: Wrench, color: "text-blue-600" },
  menu: { label: "Cardápio", icon: UtensilsCrossed, color: "text-orange-600" },
  manual: { label: "Manual", icon: Pencil, color: "text-gray-600" },
};
```

---

## 12. Arquivos a Alterar/Criar

### Novos
| Arquivo | Função |
|---------|--------|
| `src/app/(dashboard)/financeiro/layout.tsx` | Tabs: Visão Geral, Receber, Pagar, Fluxo, Transações |
| `src/app/(dashboard)/financeiro/VisaoGeralContent.tsx` | Dashboard com cards + gráficos |
| `src/app/(dashboard)/financeiro/receber/page.tsx` | Contas a Receber |
| `src/app/(dashboard)/financeiro/receber/ReceberContent.tsx` | Client component |
| `src/app/(dashboard)/financeiro/pagar/page.tsx` | Contas a Pagar |
| `src/app/(dashboard)/financeiro/pagar/PagarContent.tsx` | Client component |
| `src/app/(dashboard)/financeiro/fluxo/page.tsx` | Fluxo de Caixa |
| `src/app/(dashboard)/financeiro/fluxo/FluxoContent.tsx` | Client component |
| `src/app/(dashboard)/financeiro/transacoes/page.tsx` | Lista completa (migrada da atual) |
| `src/app/(dashboard)/financeiro/transacoes/TransacoesContent.tsx` | Client component |
| `src/app/api/financeiro/resumo/route.ts` | GET resumo mensal |
| `src/app/api/financeiro/fluxo-caixa/route.ts` | GET fluxo por período |
| `src/app/api/financeiro/transacoes/[id]/pay/route.ts` | PATCH marcar como pago |
| `src/app/api/financeiro/transacoes/[id]/cancel/route.ts` | PATCH cancelar |
| `src/lib/finance-helpers.ts` | isOverdue, getTransactionOrigin, ORIGIN_LABELS, etc. |

### Modificar
| Arquivo | Mudança |
|---------|---------|
| `src/app/(dashboard)/financeiro/page.tsx` | De lista → Visão Geral (dashboard) |
| `src/app/api/financeiro/route.ts` | Adicionar filtros `month`, `origin` |
| `src/app/api/financeiro/[id]/route.ts` | Usar Zod no PUT, melhorar validação |
| `src/lib/modules.ts` | Adicionar sub-rotas do financeiro |
| `src/lib/validations.ts` | Nenhuma mudança necessária |

---

## 13. ActivityLog

- "Transação marcada como paga: {description}"
- "Transação cancelada: {description}"
- "Transação editada: {description}" (já existe no PUT)
- "Nova transação criada: {description}" (já existe no POST)

---

## 14. Segurança

- ✅ Todas as rotas exigem login + módulo finance ativo
- ✅ Usa tenantPrisma/RLS em todas as queries
- ✅ Não expõe dados de outra empresa
- ✅ Preserva lançamentos automáticos de OS e Cardápio
- ✅ PATCH pay/cancel não altera transações de origem (OS/Cardápio), só o status financeiro
- ✅ OVERDUE é apenas visual, sem efeito colateral no banco
- ✅ Não quebra transações antigas (sem migration)

---

## 15. Riscos

| Risco | Mitigação |
|-------|-----------|
| Performance do resumo com muitas transações | Usar `groupBy` Prisma aggregation em vez de fetchAll + reduce |
| Instalar recharts sem necessidade | Perguntar antes; se não, usar barras CSS puras |
| Quebrar rota /financeiro atual (lista) | Mover lista para /financeiro/transacoes; /financeiro vira Visão Geral |
| PUT sem Zod validation | Corrigir nesta etapa: usar financialTransactionUpdateSchema |
| serviceOrderId/menuOrderId nulos em transações antigas | Origem "Manual" como fallback — funciona sem problema |

---

## 16. Como Testar

1. **Visão Geral**: Ir para /financeiro → ver cards + gráficos do mês atual
2. **Contas a Receber**: Ir para /financeiro/receber → ver transações RECEIVABLE, badge de origem
3. **Contas a Pagar**: Ir para /financeiro/pagar → ver transações PAYABLE
4. **Fluxo de Caixa**: Ir para /financeiro/fluxo → ver tabela por dia com acumulado
5. **Transações**: Ir para /financeiro/transacoes → ver lista completa (migrada)
6. **Marcar como pago**: Clicar "Pagar" em uma transação PENDING → status vira PAID, paidAt preenchido
7. **Cancelar**: Clicar "Cancelar" em uma transação → status vira CANCELLED
8. **Vencidos**: Transação PENDING com dueDate antiga → badge "Vencido" aparece
9. **Origem**: Transação da OS mostra badge "OS", do Cardápio mostra "Cardápio", manual mostra "Manual"
10. **Novo + Editar**: /financeiro/novo e /financeiro/[id] continuam funcionando
11. **Build**: `npm run build && npx tsc --noEmit`
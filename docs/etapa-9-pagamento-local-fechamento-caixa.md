# Etapa 9 — Pagamento Local + Fechamento de Caixa do Cardápio

## Contexto

As etapas 7 e 8 entregaram o Cardápio Digital com QR, pedidos, cozinha kanban e integração financeira. Quando um pedido é marcado como DELIVERED, uma receita é gerada no Financeiro — mas **nenhuma forma de pagamento é registrada**. Sem isso, o caixa do cardápio não consegue agrupar vendas por PIX, Dinheiro, Cartão etc.

Esta etapa adiciona:
1. Forma de pagamento no pedido (registrada ao entregar)
2. Página de Caixa com resumo diário
3. Atualização da integração financeira para incluir a forma de pagamento

---

## 1. Inspeção do Schema Atual

### MenuOrder (atual)
```
id, companyId, tableId, customerName, customerPhone, orderType, status, total, notes, orderNumber, createdAt, updatedAt
```
- **NÃO tem** `paymentMethod`, `paidAt`, nem `paymentStatus`

### FinancialTransaction (atual)
```
id, companyId, type, description, category, amount, dueDate, paidAt, status, customerId, notes, serviceOrderId, menuOrderId, createdAt, updatedAt
```
- **NÃO tem** `paymentMethod`

### Enums existentes (reutilizáveis)
```prisma
enum PaymentMethod { CASH, PIX, CARD, TRANSFER, OTHER }
enum PaymentStatus { PENDING, PARTIAL, PAID, CANCELLED }
```
- Já usados em `ServiceOrder` — **serão reutilizados, sem criar duplicatas**

### Modelo de Caixa
- **NÃO existe** nenhum modelo de caixa/fechamento — será uma view computada sobre `MenuOrder`, não uma tabela nova

---

## 2. Mudanças no Prisma

### MenuOrder — adicionar 2 campos

```diff
model MenuOrder {
  id            String          @id @default(cuid())
  companyId     String
  tableId       String?
  customerName  String?
  customerPhone String?
  orderType     MenuOrderType
  status        MenuOrderStatus @default(RECEIVED)
+ paymentMethod PaymentMethod?
+ paidAt        DateTime?
  total         Decimal         @db.Decimal(10, 2)
  notes         String?
  orderNumber   Int
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  ...
}
```

**Decisão:** NÃO adicionar `paymentStatus` ao MenuOrder. Para este MVP:
- `DELIVERED` + `paymentMethod` + `paidAt` = pedido entregue e pago
- `CANCELLED` = pedido cancelado, sem pagamento
- Um `paymentStatus` seria redundante — não temos pagamento parcial nem online

**Reutilização:** O enum `PaymentMethod` já existe. Não criar enum novo.

### Migration proposta

```sql
-- AlterTable: add paymentMethod and paidAt to MenuOrder
ALTER TABLE "menu_orders" ADD COLUMN "paymentMethod" "PaymentMethod";
ALTER TABLE "menu_orders" ADD COLUMN "paidAt" TIMESTAMP(3);
```

---

## 3. Fluxo da Entrega com Pagamento

### Decisão: DELIVERED exige paymentMethod

Ao transicionar para DELIVERED:
- `paymentMethod` é **obrigatório** no payload
- Se o usuário não sabe a forma, usa `OTHER` como fallback
- `paidAt` é preenchido automaticamente com `now()` no backend

### Fluxo no frontend (Cozinha)

1. Usuário clica "Entregar" no card do pedido READY
2. Abre dialog com as opções: 💰 Dinheiro (CASH), 📱 PIX, 💳 Cartão (CARD), 🏦 Transferência (TRANSFER), ❓ Outro (OTHER)
3. Usuário seleciona e confirma
4. Frontend envia `PATCH /api/cardapio/pedidos/{id}/status` com `{ status: "DELIVERED", paymentMethod: "PIX" }`
5. Backend valida, atualiza `status`, `paymentMethod`, `paidAt`
6. Se Financeiro ativo, cria/atualiza FinancialTransaction com forma de pagamento em `notes`

### Fluxo no backend (PATCH status)

```typescript
// Validação adicionada ao schema:
updateMenuOrderStatusSchema = z.object({
  status: z.enum(["RECEIVED","PREPARING","READY","DELIVERED","CANCELLED"]),
  paymentMethod: paymentMethodSchema.optional(), // obrigatório quando status = DELIVERED
})

// No handler, quando newStatus === "DELIVERED":
if (newStatus === "DELIVERED" && !parsed.data.paymentMethod) {
  return 400 { error: "Forma de pagamento é obrigatória ao entregar o pedido" }
}

// Atualização:
data: {
  status: newStatus,
  paymentMethod: parsed.data.paymentMethod,  // ou undefined para outros status
  paidAt: newStatus === "DELIVERED" ? new Date() : undefined,
}
```

---

## 4. Atualização da Integração Financeira

### O que muda na criação da FinancialTransaction

**FinancialTransaction NÃO tem campo `paymentMethod`.** Decisão: colocar em `notes`.

```typescript
// Antes (Etapa 8):
notes: `Pedido #${existing.orderNumber} - ${orderTypeLabel}`

// Depois (Etapa 9):
const paymentLabel = PAYMENT_METHOD_LABELS[parsed.data.paymentMethod!]
notes: `Pedido #${existing.orderNumber} - ${orderTypeLabel} - Pagamento: ${paymentLabel}`
```

**Mapa de labels** (reutilizar `getPaymentMethodLabel` de `src/lib/os-status.ts`):

```typescript
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CARD: "Cartão",
  TRANSFER: "Transferência",
  OTHER: "Outro",
};
```

**Não inventar campo no Financeiro sem necessidade** — conforme instruído.

---

## 5. API do Caixa

### Endpoint: `GET /api/cardapio/caixa?date=YYYY-MM-DD`

**Autenticação:** obrigatória (session)
**Módulo:** exige `menu` ativo

**Lógica:**
```typescript
const date = searchParams.get("date") || hoje
const start = new Date(date + "T00:00:00.000")
const end   = new Date(date + "T23:59:59.999")

const orders = await tenant.menuOrder.findMany({
  where: {
    status: "DELIVERED",
    createdAt: { gte: start, lte: end },
  },
  include: { items: true, table: { select: { name: true } } },
  orderBy: { createdAt: "desc" },
})

// Calcular:
const totalVendido = soma de order.total
const porForma = agrupar por paymentMethod e somar
const ticketMedio = totalVendido / count
const cancelados = count where status === "CANCELLED" no mesmo período
```

**Resposta:**
```json
{
  "date": "2026-06-16",
  "summary": {
    "totalSold": 850.00,
    "byPaymentMethod": {
      "PIX": 400.00,
      "CASH": 150.00,
      "CARD": 300.00
    },
    "deliveredCount": 23,
    "cancelledCount": 2,
    "averageTicket": 36.95
  },
  "orders": [ ... ]
}
```

---

## 6. Página Caixa

### Rota: `/cardapio/caixa`

### Tab nova no layout

Adicionar "Caixa" ao array de tabs do layout, entre Pedidos e Config:

```
Itens | Mesas/QR | Cozinha | Pedidos | Caixa | Config
```

### UI — Cards de resumo

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Total Vendido│ │ Pedidos Entr.│ │ Cancelados  │ │ Ticket Médio│
│  R$ 850,00   │ │     23      │ │      2      │ │  R$ 36,95   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Por Forma de Pagamento                                       │
│ 📱 PIX         R$ 400,00   ████████████████████   47%       │
│ 💳 Cartão      R$ 300,00   ███████████████        35%       │
│ 💰 Dinheiro    R$ 150,00   ████████               18%       │
└──────────────────────────────────────────────────────────────┘
```

### UI — Filtro de data

- DatePicker simples com `input type="date"` padrão do browser
- Default: hoje
- Ao trocar data, re-fetch `/api/cardapio/caixa?date=YYYY-MM-DD`

### UI — Tabela de pedidos

| # | Tipo | Forma Pgto | Total | Hora |
|---|------|-----------|-------|------|
| 23 | Mesa 5 | PIX | R$ 45,00 | 14:32 |
| 22 | Viagem | Dinheiro | R$ 28,00 | 14:15 |

### UI — Estado vazio

Ícone de caixa registradora + mensagem "Nenhuma venda registrada nesta data."

---

## 7. Arquivos a Alterar/Criar

### Schema
| Arquivo | Ação |
|--------|------|
| `prisma/schema.prisma` | Adicionar `paymentMethod PaymentMethod?` e `paidAt DateTime?` em MenuOrder |
| `prisma/migrations/20260616160000_add_menu_order_payment/migration.sql` | Criar migration |

### Validações
| Arquivo | Ação |
|--------|------|
| `src/lib/validations.ts` | Atualizar `updateMenuOrderStatusSchema` para incluir `paymentMethod` opcional |

### API
| Arquivo | Ação |
|--------|------|
| `src/app/api/cardapio/pedidos/[id]/status/route.ts` | Aceitar `paymentMethod`, exigir em DELIVERED, salvar `paymentMethod` + `paidAt`, atualizar notes da FinancialTransaction |
| `src/app/api/cardapio/caixa/route.ts` | **NOVO** — endpoint de caixa |
| `src/app/api/cardapio/pedidos/route.ts` | Incluir `paymentMethod` e `paidAt` na resposta |

### UI
| Arquivo | Ação |
|--------|------|
| `src/app/(dashboard)/cardapio/layout.tsx` | Adicionar tab "Caixa" |
| `src/app/(dashboard)/cardapio/cozinha/CozinhaContent.tsx` | Adicionar dialog de pagamento ao clicar "Entregar" |
| `src/app/(dashboard)/cardapio/pedidos/PedidosContent.tsx` | Mostrar `paymentMethod` no pedido entregue e no badge financeiro |
| `src/app/(dashboard)/cardapio/caixa/page.tsx` | **NOVO** — página server do caixa |
| `src/app/(dashboard)/cardapio/caixa/CaixaContent.tsx` | **NOVO** — client component do caixa |

### Módulos
| Arquivo | Ação |
|--------|------|
| `src/lib/modules.ts` | Adicionar `/cardapio/caixa` nas rotas protegidas |

### Helpers
| Arquivo | Ação |
|--------|------|
| `src/lib/menu-helpers.ts` | Adicionar `PAYMENT_METHOD_LABELS` |

### Activity Log
| Arquivo | Ação |
|--------|------|
| `src/lib/activity-log.ts` | Nenhuma mudança necessária — já suporta `"menu_order"` |

---

## 8. ActivityLog

Registrar:
- `"Pagamento registrado no Pedido #${orderNumber}: ${paymentLabel}"` — na transição DELIVERED com paymentMethod
- `"Pedido #${orderNumber} entregue e lançado no caixa"` — junto com a criação da transação financeira

---

## 9. Segurança

- ✅ Cardápio público NÃO escolhe forma de pagamento
- ✅ Só usuário autenticado registra pagamento
- ✅ `paymentMethod` validado server-side pelo Zod schema
- ✅ Total continua vindo do pedido, não do frontend
- ✅ Financeiro continua opcional (best-effort com try/catch)
- ✅ Se Financeiro inativo, caixa do cardápio funciona normalmente
- ✅ `paidAt` é setado no backend, não pelo cliente

---

## 10. Riscos

| Risco | Mitigação |
|-------|-----------|
| Migration em produção com dados existentes | `paymentMethod` e `paidAt` são nullable — pedidos existentes ficam `null` |
| Quebrar fluxo de pedidos anteriores | Validação: `paymentMethod` obrigatório APENAS quando `status = DELIVERED`; outros status não exigem |
| Cozinha kanban sem pagamento | Dialog obriga seleção antes de confirmar; OTHER como fallback |
| Financeiro já ter `notes` | Append da forma de pagamento ao notes existente, não substitui |
| Performance do caixa com muitos pedidos | Query filtrada por data e companyId (RLS), sem paginação pesada |

---

## 11. Como Testar

1. **Aplicar migration:** `npx prisma db push --accept-data-loss` ou `prisma migrate dev`
2. **Cozinha — entrega com pagamento:** Ir para Cozinha, mover pedido para READY, clicar "Entregar", selecionar PIX, confirmar → pedido vira DELIVERED com `paymentMethod: "PIX"` e `paidAt` preenchido
3. **Cozinha — entrega sem pagamento:** Verificar que o dialog NÃO permite entregar sem selecionar forma de pagamento; OTHER é o fallback
4. **Pedidos — badge atualizado:** Na aba Pedidos, expandir pedido entregue → ver forma de pagamento no badge financeiro
5. **Caixa — resumo:** Ir para /cardapio/caixa, selecionar data → ver total vendido, por forma de pagamento, ticket médio, lista de pedidos
6. **Caixa — dia sem vendas:** Selecionar data passada sem pedidos → ver estado vazio
7. **Financeiro inativo:** Desativar módulo finance → caixa continua funcionando; badge financeiro não aparece
8. **Build:** `npm run build && npx tsc --noEmit`
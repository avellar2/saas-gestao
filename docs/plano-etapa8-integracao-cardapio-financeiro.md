# Etapa 8 — Integracao Opcional Cardapio Digital ↔ Financeiro

## Plano de Implementacao

---

## 1. Estado Atual — Inspecao do Schema

### FinancialTransaction (modelo financeiro real)

```prisma
model FinancialTransaction {
  id          String   @id @default(cuid())
  companyId   String
  type        String   // RECEIVABLE or PAYABLE
  description String
  category    String?
  amount      Decimal  @db.Decimal(10, 2)
  dueDate     DateTime?
  paidAt      DateTime?
  status      String   @default("PENDING") // PENDING, PAID, OVERDUE, CANCELLED
  customerId      String?
  notes           String?
  serviceOrderId  String?                              // vinculo com OS
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company     Company       @relation(...)
  customer    Customer?     @relation(...)
  serviceOrder ServiceOrder? @relation(fields: [serviceOrderId], references: [id], onDelete: SetNull)

  @@index([companyId])
  @@index([type])
  @@index([status])
  @@index([serviceOrderId])
  @@map("financial_transactions")
}
```

**Campos reais:**
- `type`: String — `"RECEIVABLE"` ou `"PAYABLE"`
- `status`: String — `"PENDING"`, `"PAID"`, `"OVERDUE"`, `"CANCELLED"`
- `serviceOrderId`: ja vincula com OS (opcional, SetNull)
- `customerId`: opcional
- `paidAt`: data de pagamento
- `dueDate`: data de vencimento

### MenuOrder (modelo atual)

```prisma
model MenuOrder {
  id           String          @id @default(cuid())
  companyId    String
  tableId      String?
  customerName String?
  customerPhone String?
  orderType    MenuOrderType
  status       MenuOrderStatus @default(RECEIVED)
  total        Decimal         @db.Decimal(10, 2)
  notes        String?
  orderNumber  Int
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  company Company          @relation(...)
  table   RestaurantTable? @relation(...)
  items   MenuOrderItem[]

  @@unique([companyId, orderNumber])
  @@index([companyId])
  @@index([status])
  @@map("menu_orders")
}
```

**Nao existe** relacao entre MenuOrder e FinancialTransaction.

### Padrao existente: OS ↔ Financeiro

A integracao OS ↔ Financeiro esta no endpoint de fechamento (`close/route.ts`):
- Verifica `financeActive` com `checkModuleAccess(companyId, "finance")`
- Executa **fora da transaction principal** (best-effort, try/catch)
- Busca transacao existente por `serviceOrderId`
- Se `paymentStatus === "CANCELLED"` → marca transacao como CANCELLED
- Se pago → cria RECEIVABLE com status PAID, `paidAt: completedAt`
- Se pendente → cria RECEIVABLE com status PENDING, `dueDate: completedAt`
- Se ja existe transacao → atualiza
- Erro no financeiro **nao quebra** o fechamento da OS

---

## 2. Mudancas no Prisma Schema

### Adicionar em FinancialTransaction

```prisma
menuOrderId   String?                              // NOVO
menuOrder     MenuOrder?    @relation(fields: [menuOrderId], references: [id], onDelete: SetNull)
```

### Adicionar em MenuOrder

```prisma
transactions  FinancialTransaction[]                // NOVO
```

### Adicionar indice

```prisma
@@index([menuOrderId])   // em FinancialTransaction
```

### Schema completo apos alteracao

**FinancialTransaction** (campos novos marcados com `// NOVO`):

```prisma
model FinancialTransaction {
  id          String   @id @default(cuid())
  companyId   String
  type        String   // RECEIVABLE or PAYABLE
  description String
  category    String?
  amount      Decimal  @db.Decimal(10, 2)
  dueDate     DateTime?
  paidAt      DateTime?
  status      String   @default("PENDING") // PENDING, PAID, OVERDUE, CANCELLED
  customerId      String?
  notes           String?
  serviceOrderId  String?
  menuOrderId     String?                              // NOVO
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company     Company       @relation(...)
  customer    Customer?     @relation(...)
  serviceOrder ServiceOrder? @relation(...)
  menuOrder    MenuOrder?    @relation(fields: [menuOrderId], references: [id], onDelete: SetNull)  // NOVO

  @@index([companyId])
  @@index([type])
  @@index([status])
  @@index([serviceOrderId])
  @@index([menuOrderId])      // NOVO
  @@map("financial_transactions")
}
```

**MenuOrder** (relacao nova):

```prisma
model MenuOrder {
  // ... campos existentes ...
  transactions FinancialTransaction[]    // NOVO
  // ...
}
```

---

## 3. Migration Proposta

```sql
-- AlterTable: adicionar menuOrderId em FinancialTransaction
ALTER TABLE "financial_transactions" ADD COLUMN "menuOrderId" TEXT;

-- CreateIndex
CREATE INDEX "financial_transactions_menuOrderId_idx" ON "financial_transactions"("menuOrderId");

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_menuOrderId_fkey"
  FOREIGN KEY ("menuOrderId") REFERENCES "menu_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**Seguro:** `menuOrderId` e `String?` (opcional) — transacoes existentes continuam funcionando.

---

## 4. Regra de Criacao da Receita

### Quando criar

| Evento | Acao financeira |
|--------|----------------|
| Pedido → DELIVERED | Criar RECEIVABLE com status PAID |

### Quando NAO criar

| Evento | Acao financeira |
|--------|----------------|
| Pedido → RECEIVED | Nenhuma |
| Pedido → PREPARING | Nenhuma |
| Pedido → READY | Nenhuma |
| Pedido → CANCELLED (sem transacao existente) | Nenhuma |
| Pedido → CANCELLED (com transacao existente) | Marcar transacao como CANCELLED |

### Dados da transacao

```
type:        "RECEIVABLE"
status:      "PAID"
amount:      order.total
description: "Receita do Pedido #{orderNumber}"
category:    "Cardapio"
paidAt:      new Date()  (data da entrega)
dueDate:     new Date()  (data da entrega)
menuOrderId: order.id
notes:       "Pedido #{orderNumber} - {orderType === TABLE ? 'Mesa {tableName}' : 'Para viagem'}"
customerId:  null       (pedido publico, sem Customer vinculado)
```

**Por que PAID e nao PENDING?**
- O pedido do cardapio e pago no ato da entrega (na mesa ou viagem)
- Nao ha fluxo de "conta a receber" para pedidos de restaurante
- Se no futuro houver pagamento diferido, pode-se mudar para PENDING

---

## 5. Estrategia para Evitar Duplicidade

**Antes de criar:** buscar transacao existente por `menuOrderId`

```typescript
const existingTx = await tenant.financialTransaction.findFirst({
  where: { menuOrderId: order.id },
});
```

- Se `existingTx` existe → atualizar com os dados atuais
- Se `existingTx` NAO existe → criar nova

**Isso garante:**
- Nunca duas receitas para o mesmo pedido
- Se o pedido for entregue duas vezes (impossivel pela logica de transicoes, mas defensivamente), a transacao e atualizada, nao duplicada

---

## 6. Onde Integrar

### PATCH /api/cardapio/pedidos/[id]/status

**Local:** `src/app/api/cardapio/pedidos/[id]/status/route.ts`

**Apos** a atualizacao do status para DELIVERED:

1. Verificar se `finance` esta ativo: `checkModuleAccess(companyId, "finance")`
2. Se ativo → criar/atualizar transacao financeira
3. Se der erro → logar, nao quebrar a mudanca de status
4. Registrar ActivityLog

**Fora da transaction do status** (best-effort, igual ao padrao OS ↔ Financeiro).

### CANCELLED com transacao existente

Se `newStatus === "CANCELLED"` e `financeActive`:
1. Buscar transacao existente por `menuOrderId`
2. Se existir e status nao for CANCELLED → marcar como CANCELLED
3. Logar ActivityLog

---

## 7. Arquivos que Serao Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `prisma/schema.prisma` | Adicionar `menuOrderId` em FinancialTransaction + `transactions` em MenuOrder + indice |
| `src/app/api/cardapio/pedidos/[id]/status/route.ts` | Adicionar integracao financeira (criar RECEIVABLE em DELIVERED, cancelar em CANCELLED) |
| `src/app/(dashboard)/cardapio/pedidos/PedidosContent.tsx` | Mostrar badge de lancamento financeiro quando houver transacao vinculada |

### Criados

| Arquivo | Proposito |
|---------|-----------|
| `prisma/migrations/YYYYMMDD_add_menu_order_finance_link/migration.sql` | Migration auto-gerada |

---

## 8. UI — Badge de Lancamento Financeiro

Na listagem de pedidos (`PedidosContent.tsx`), quando o pedido estiver expandido:

- Se `financeActive` e pedido tem `transactions` vinculadas:
  - Mostrar badge verde: "Lancamento financeiro gerado"
  - Status: PAID, valor, data
- Se `financeActive` e pedido DELIVERED sem transacao:
  - Nao mostrar erro (transacao pode ter sido deletada manualmente)
- Se financeiro NAO ativo:
  - Mostrar aviso discreto: "Ative o Financeiro para lancar receitas automaticamente."
  - Apenas na area de pedidos entregues, nao no cardapio publico

**Como obter dados:** O endpoint GET `/api/cardapio/pedidos` precisa incluir `transactions` no include quando `financeActive`.

---

## 9. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|--------|-----------|
| Erro no financeiro quebra mudanca de status | Alto | try/catch — financeiro e best-effort, igual ao padrao OS |
| Pedido CANCELLED mas transacao ja processada | Medio | Marcar transacao como CANCELLED, nao deletar |
| Transacao manual com menuOrderId | Baixo | Buscar por menuOrderId garante que so o pedido controla |
| Dois DELIVERED para mesmo pedido | Baixo | Logica de transicoes impede (DELIVERED → vazio), mas findFirst + update protege |
| Financeiro desativado apos lancamento existente | Baixo | Lancamento permanece no financeiro, sem problemas |
| Migration adiciona coluna nullable | Baixo | Seguro — transacoes existentes ficam com menuOrderId = null |

---

## 10. Ordem de Implementacao

1. **Schema + Migration** — Adicionar `menuOrderId`, relacao, indice
2. **PATCH status** — Adicionar integracao financeira em DELIVERED e CANCELLED
3. **GET pedidos** — Incluir `transactions` quando finance ativo
4. **UI Pedidos** — Badge de lancamento financeiro + aviso se finance inativo
5. **Build + Typecheck** — `npm run build` + `npx tsc --noEmit`

---

## 11. Como Testar Manualmente

### Teste 1: Financeiro ativo, pedido entregue
1. Com financeiro ativo, criar e entregar um pedido
2. Verificar transacao criada: tipo RECEIVABLE, status PAID, category "Cardapio"
3. Verificar ActivityLog

### Teste 2: Financeiro inativo, pedido entregue
1. Desativar financeiro
2. Entregar pedido
3. Verificar que nenhuma transacao foi criada
4. Pedido funciona normalmente

### Teste 3: Pedido cancelado com transacao existente
1. Com financeiro ativo, criar e entregar pedido (transacao PAID criada)
2. Cancelar pedido
3. Verificar transacao marcada como CANCELLED

### Teste 4: Pedido cancelado sem transacao
1. Cancelar pedido que nunca foi entregue
2. Verificar que nenhuma transacao foi criada

### Teste 5: Duplicidade
1. Entregar pedido (transacao criada)
2. Tentar atualizar transacao manualmente via financeiro
3. Verificar que a transacao existente e atualizada, nao duplicada

### Teste 6: UI
1. Com financeiro ativo, entregar pedido
2. Na tela de pedidos, expandir pedido entregue
3. Verificar badge "Lancamento financeiro gerado"
4. Desativar financeiro, verificar aviso discreto

---

## 12. O que NAO sera implementado nesta etapa

- Pagamento online
- Integracao com Estoque / baixa de ingredientes
- Pix / Stripe / conciliacao
- Cupom/desconto
- Fechamento de caixa
- Recibo fiscal
- Impressora termica
- WhatsApp automatico
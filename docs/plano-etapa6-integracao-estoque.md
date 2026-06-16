# Etapa 6 — Integração Opcional OS Premium ↔ Estoque

## Status: 🟢 APROVADO E IMPLEMENTADO — 2026-06-16

---

## 1. Inspeção do Schema Atual

### Modelos existentes relevantes

| Model | Tabela | Campos relevantes |
|-------|--------|-------------------|
| `ServiceOrder` | `service_orders` | `id`, `companyId`, `number`, `code`, `status`, `finishedAt`, `transactions`... |
| `ServiceOrderItem` | `service_order_items` | `id`, `serviceOrderId`, `description`, `quantity`, `unitPrice`, `total` — **NÃO tem `productId`** |
| `Product` | `products` | `id`, `companyId`, `name`, `description`, `sku`, `category`, `quantity` (Decimal 10,2), `minStock` (Decimal 10,2), `costPrice`, `salePrice`, `active` |
| `CompanyModule` | `company_modules` | `companyId`, `moduleKey`, `active` — módulo de estoque é `"inventory"` |
| `ActivityLog` | `activity_logs` | `action`, `entity`, `entityId`, `details` — não tem `stock_movement` no entity |

### O que NÃO existe hoje
- `productId` em `ServiceOrderItem`
- `StockMovement` model
- `inventoryDeductedAt` em `ServiceOrder`
- Qualquer lógica de baixa de estoque no fechamento de OS
- Qualquer relacionamento entre OS e Produto

---

## 2. Mudanças no Prisma Schema

### 2.1 ServiceOrderItem — adicionar `productId`

```prisma
model ServiceOrderItem {
  id              String   @id @default(cuid())
  serviceOrderId  String
  productId       String?                           // NOVO
  description     String
  quantity        Decimal  @db.Decimal(10, 2)
  unitPrice       Decimal  @db.Decimal(10, 2)
  total           Decimal  @db.Decimal(10, 2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  serviceOrder ServiceOrder @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)
  product      Product?     @relation(fields: [productId], references: [id], onDelete: SetNull)  // NOVO

  @@index([serviceOrderId])
  @@index([productId])            // NOVO
  @@map("service_order_items")
}
```

### 2.2 Product — adicionar relação reversa

```prisma
model Product {
  id          String   @id @default(cuid())
  companyId   String
  name        String
  description String?
  sku         String?
  category    String?
  quantity    Decimal  @db.Decimal(10, 2) @default(0)
  minStock    Decimal  @db.Decimal(10, 2) @default(0)
  costPrice   Decimal? @db.Decimal(10, 2)
  salePrice   Decimal  @db.Decimal(10, 2) @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company           Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  serviceOrderItems ServiceOrderItem[]  // NOVO
  stockMovements    StockMovement[]      // NOVO

  @@index([companyId])
  @@index([name])
  @@map("products")
}
```

### 2.3 ServiceOrder — adicionar `inventoryDeductedAt`

```prisma
model ServiceOrder {
  // ... campos existentes ...
  inventoryDeductedAt DateTime?   // NOVO — previne baixa duplicada de estoque

  // ... relações existentes ...
  stockMovements    StockMovement[]  // NOVO

  // ... indexes existentes ...
}
```

### 2.4 Enums para StockMovement

```prisma
enum StockMovementType {
  IN
  OUT
  ADJUSTMENT
}

enum StockMovementReason {
  SERVICE_ORDER
  PURCHASE
  SALE
  MANUAL_ADJUSTMENT
  RETURN
  LOSS
}
```

### 2.5 Novo model `StockMovement` (com enums)

```prisma
model StockMovement {
  id                String              @id @default(cuid())
  companyId         String
  productId         String
  serviceOrderId    String?
  type              StockMovementType
  reason            StockMovementReason
  quantity          Decimal             @db.Decimal(10, 2)
  previousQuantity  Decimal             @db.Decimal(10, 2)
  newQuantity       Decimal             @db.Decimal(10, 2)
  description       String?
  createdById       String?
  createdAt         DateTime            @default(now())

  company       Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  product       Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  serviceOrder  ServiceOrder? @relation(fields: [serviceOrderId], references: [id], onDelete: SetNull)
  createdBy     User?         @relation("StockMovementCreator", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([companyId])
  @@index([productId])
  @@index([serviceOrderId])
  @@index([createdAt])
  @@map("stock_movements")
}
```

### 2.6 Company — adicionar relação

```prisma
model Company {
  // ... relações existentes ...
  stockMovements StockMovement[]   // NOVO
}
```

### 2.7 User — adicionar relação

```prisma
model User {
  // ... relações existentes ...
  stockMovementsCreated StockMovement[] @relation("StockMovementCreator")  // NOVO
}
```

---

## 3. Migration Proposta

```
npx prisma migrate dev --name add-stock-movement-and-os-inventory-integration
```

A migration criará:

| Ação | Detalhe |
|------|---------|
| **CREATE TABLE** `stock_movements` | Com todos os campos e foreign keys |
| **ALTER TABLE** `service_order_items` | Adicionar coluna `product_id` (nullable) |
| **ALTER TABLE** `service_orders` | Adicionar coluna `inventory_deducted_at` (nullable) |
| **CREATE INDEX** | `service_order_items_product_id_idx` |
| **CREATE INDEX** | Múltiplos índices em `stock_movements` |

> ⚠️ A coluna `productId` em ServiceOrderItem é nullable (`String?`) para manter compatibilidade — itens manuais continuam sem produto vinculado.

---

## 4. Abordagem para RLS dentro de Transaction

### Decisão: `prisma.$transaction` com `set_config` manual

O `tenantPrisma` do projeto estende o PrismaClient com um middleware que injeta `companyId` nas queries. No entanto, dentro de `prisma.$transaction()` esse middleware pode não se comportar de forma confiável para todas as operações (especialmente `create` com RLS).

**Estratégia escolhida:**

1. Usar `prisma.$transaction(async (tx) => { ... })` com o **client global** (sem tenantPrisma)
2. No início da callback da transaction, executar `SELECT set_config('app.current_company_id', $1, true)` para garantir RLS
3. Usar `tx` para todas as operações dentro da transaction
4. Para operações `create`, incluir `companyId` manualmente nos dados

Isso garante que todas as queries dentro da transaction estejam no contexto tenant correto e evita misturar queries fora do contexto.

### Pseudocódigo da transaction

```typescript
await prisma.$transaction(async (tx) => {
  // Set RLS context for the transaction
  await tx.$executeRawUnsafe(
    `SELECT set_config('app.current_company_id', $1, true)`,
    companyId
  );

  // Todas as operações usam `tx` e estão no contexto RLS
  // Incluir companyId manualmente nos creates
  await tx.serviceOrder.update({ where: { id }, data: { ... } });
  await tx.stockMovement.create({ data: { companyId, ... } });
  await tx.product.update({ where: { id, companyId }, data: { ... } });
});
```

### Por que não `tenantPrisma.$transaction`?

- O `tenantPrisma` retorna um extended client. Chamar `.$transaction` nele cria uma transaction que **não** tem garantia de usar o middleware de RLS corretamente para todas as operações (o middleware do extended client opera no query-level, e dentro de transaction os callbacks podem ter comportamento inconsistente com RLS).
- A abordagem manual com `set_config` é explícita e confiável para PostgreSQL + Prisma.
- A desvantagem (precisar incluir `companyId` manualmente nos creates) é mitigada pelo uso do `where: { companyId }` nas buscas.

---

## 5. Estratégia para Evitar Baixa Duplicada

**Opção escolhida: `inventoryDeductedAt` em `ServiceOrder`**

Vantagens:
- Simples e direto — um campo nullable
- Fácil de verificar antes de processar
- Registra **quando** a baixa ocorreu
- Não depende de buscar StockMovements (mais rápido)

Fluxo:
1. Ao fechar a OS, verificar se `inventoryDeductedAt` é `null`
2. Se for `null`, processar a baixa e depois setar `inventoryDeductedAt = new Date()`
3. Se já estiver preenchido, **pular** a baixa de estoque (idempotente)

Alternativa considerada e descartada:
- Verificar StockMovements existentes com `serviceOrderId` e `reason = SERVICE_ORDER` — funciona mas requer query extra e é mais frágil

---

## 6. Proteção Contra Concorrência (Race Condition)

### Problema
Dois fechamentos simultâneos da mesma OS podem ler `product.quantity = 10`, ambos validarem que há estoque suficiente, e ambos tentarem baixar. Isso pode levar a estoque negativo.

### Solução: update condicional com `where`

Em vez de confiar em "ler → validar → atualizar", usamos um **update condicional** que só executa se a quantidade ainda for suficiente:

```typescript
// Em vez de:
const product = await tx.product.findUnique({ where: { id } });
// validar...
await tx.product.update({ where: { id }, data: { quantity: newQuantity } });

// Usar:
const result = await tx.product.updateMany({
  where: {
    id: item.productId,
    quantity: { gte: item.quantity }, // Só atualiza se ainda tem estoque
  },
  data: {
    quantity: { decrement: item.quantity }, // Decrement seguro
  },
});

if (result.count === 0) {
  // Concorrência detectada ou estoque insuficiente
  throw new Error("Estoque insuficiente para o produto...");
}
```

### Por que `updateMany` + `decrement`?
- **`quantity: { gte: item.quantity }`** garante que a atualização só ocorre se o estoque for suficiente NO MOMENTO DA ESCRITA
- **`{ decrement: item.quantity }`** é uma operação atômica no banco — não depende do valor lido anteriormente
- **`result.count === 0`** detecta se a condição não foi satisfeita (concorrência ou estoque insuficiente)
- Isso funciona com `READ COMMITTED` (default do PostgreSQL) porque o `WHERE` é reavaliado no momento do UPDATE

### Fluxo completo na transaction

1. **Setar RLS** via `set_config`
2. **Atualizar a OS** (condicional — verificar `inventoryDeductedAt` no `where`)
3. **Para cada item com productId**, executar `updateMany` com `quantity: { gte: item.quantity }` e `{ decrement: item.quantity }`
4. Se `result.count === 0` para algum item → **ROLLBACK** (lançar erro)
5. Criar `StockMovement` com `previousQuantity` e `newQuantity`
6. Atualizar `inventoryDeductedAt` na OS
7. ✅ Commit

```typescript
await prisma.$transaction(async (tx) => {
  // 1. RLS
  await tx.$executeRawUnsafe(
    `SELECT set_config('app.current_company_id', $1, true)`,
    companyId
  );

  // 2. Atualizar OS (só se ainda não teve baixa)
  const osUpdate = await tx.serviceOrder.updateMany({
    where: { id, inventoryDeductedAt: null },
    data: { /* status, finalAmount, etc. */ },
  });
  if (osUpdate.count === 0) throw new Error("OS já finalizada ou baixada");

  // 3. Para cada item com productId, baixar estoque condicionalmente
  for (const item of itemsWithProduct) {
    const result = await tx.product.updateMany({
      where: {
        id: item.productId,
        companyId,
        quantity: { gte: item.quantity },
      },
      data: { quantity: { decrement: item.quantity } },
    });
    if (result.count === 0) {
      throw new InsufficientStockError(item.product!.name, /* ... */);
    }

    // 4. Criar StockMovement (precisa ler o valor atual depois do update)
    const updatedProduct = await tx.product.findUnique({
      where: { id: item.productId },
    });
    await tx.stockMovement.create({
      data: {
        companyId,
        productId: item.productId,
        serviceOrderId: id,
        type: "OUT",
        reason: "SERVICE_ORDER",
        quantity: item.quantity,
        previousQuantity: Number(updatedProduct!.quantity) + Number(item.quantity),
        newQuantity: Number(updatedProduct!.quantity),
        description: `Baixa pela OS ${code}`,
        createdById: userId,
      },
    });
  }

  // 5. Marcar inventoryDeductedAt
  await tx.serviceOrder.update({
    where: { id },
    data: { inventoryDeductedAt: new Date() },
  });
});
```

---

## 7. Arquivos que Serão Alterados/criados

### Arquivos a ALTERAR

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | Adicionar enums `StockMovementType`, `StockMovementReason`, model `StockMovement`, `productId` em ServiceOrderItem, `inventoryDeductedAt` em ServiceOrder, relações |
| `src/lib/validations.ts` | Adicionar `productId` ao `osItemSchema` |
| `src/lib/activity-log.ts` | Adicionar `"stock_movement"` ao tipo `entity` |
| `src/lib/prisma.ts` | Adicionar `"StockMovement"` ao `TENANT_MODELS` |
| `src/components/modules/service-order-form.tsx` | Adicionar seletor de produto (quando estoque ativo) e campo `productId` nos itens |
| `src/app/(dashboard)/ordens-servico/[id]/OSDetailContent.tsx` | Adicionar card de estoque (produtos vinculados, status da baixa) |
| `src/app/(dashboard)/ordens-servico/novo/NovaOSContent.tsx` | Carregar lista de produtos se estoque ativo, passar para o form |
| `src/app/api/ordens-servico/[id]/close/route.ts` | Adicionar lógica de baixa de estoque com transaction atômica |
| `src/app/api/ordens-servico/[id]/route.ts` | Incluir `productId` nos itens ao criar/atualizar, incluir `product` no GET |
| `src/app/api/ordens-servico/route.ts` | Incluir `productId` nos itens ao criar OS |
| `src/components/modules/close-service-order-dialog.tsx` | Tratar erro de estoque insuficiente na UI |

### Arquivos a CRIAR

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/stock-deduction.ts` | Função helper `deductStockForServiceOrder()` com transaction, update condicional e atomicidade |
| Nenhum arquivo de migration manual | A migration será gerada por `prisma migrate dev` |

---

## 8. Como a UI Vai Ficar

### 7.1 Formulário de OS — Seletor de Produto (quando Estoque ativo)

```
┌──────────────────────────────────────────────────────────┐
│ Itens                                                     │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Produto    ▼ [Pesquisar produto...]                   │  │
│ │ Descrição  [Tela Samsung Galaxy S24]   (auto-fill)   │  │
│ │ Qtd        [1]                                      │  │
│ │ Preço Unit [R$ 1.200,00]  (auto-fill do salePrice)  │  │
│ │ Total      R$ 1.200,00                               │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Produto    ▼ [Item manual - sem produto]             │  │
│ │ Descrição  [Mão de obra de instalação]               │  │
│ │ Qtd        [1]                                      │  │
│ │ Preço Unit [R$ 150,00]                              │  │
│ │ Total      R$ 150,00                                │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
│ [+ Adicionar Item]                                        │
└──────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Se módulo `inventory` está **inativo**: formulário igual ao atual (apenas item manual)
- Se módulo `inventory` está **ativo**: cada item ganha um dropdown de produto
  - Ao selecionar produto: `description` e `unitPrice` são preenchidos automaticamente com `product.name` e `product.salePrice`
  - `quantity` permanece editável
  - `unitPrice` pode ser editado após preenchimento
  - Opção "Item manual (sem produto)" permite digitar descrição e preço livremente
  - Mostra estoque disponível ao lado do nome do produto: `"Tela Samsung (5 un.)"`

### 7.2 Detalhe da OS — Card de Estoque

```
┌──────────────────────────────────────────────────────────┐
│ 📦 Estoque                                               │
│                                                           │
│ [Cenário 1: Estoque ativo, baixa ainda não realizada]    │
│ ℹ️ O estoque será baixado automaticamente ao finalizar    │
│    a Ordem de Serviço.                                   │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Tela Samsung Galaxy    │ Qtd: 1  │ Disponível: 5  │   │
│ │ Bateria iPhone 15      │ Qtd: 2  │ Disponível: 8  │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ [Cenário 2: Estoque ativo, baixa já realizada]           │
│ ✅ Produtos baixados do estoque em 15/06/2026 14:30     │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Tela Samsung Galaxy    │ Qtd: 1  │ Antes: 5 → 4  │   │
│ │ Bateria iPhone 15      │ Qtd: 2  │ Antes: 8 → 6  │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ [Cenário 3: Estoque inativo]                              │
│ (não mostra o card de estoque)                            │
│                                                           │
│ [Cenário 4: OS com apenas itens manuais]                  │
│ (não mostra o card de estoque — nada a baixar)           │
└──────────────────────────────────────────────────────────┘
```

### 7.3 Erro de estoque insuficiente ao fechar OS

```
┌──────────────────────────────────────────────────────────┐
│ ⚠️ Estoque Insuficiente                                   │
│                                                           │
│ Não é possível finalizar esta OS porque os seguintes     │
│ produtos não possuem estoque suficiente:                  │
│                                                           │
│ • Tela Samsung Galaxy: necessário 5, disponível 2       │
│ • Bateria iPhone 15: necessário 3, disponível 1         │
│                                                           │
│ Abasteça o estoque ou remova os itens antes de           │
│ finalizar.                                                │
│                                                           │
│                                    [Entendi]              │
└──────────────────────────────────────────────────────────┘
```

---

## 9. ActivityLog

Registrar as seguintes atividades:

| Momento | Action | Entity | Details |
|---------|--------|--------|---------|
| Ao baixar estoque na OS | `UPDATE` | `service_order` | `"Estoque baixado automaticamente pela OS {code}"` |
| Por produto baixado | `UPDATE` | `product` | `"Estoque baixado: {quantity} un. de {productName} pela OS {code}. Estoque: {previous} → {new}"` |

> Nota: O `ActivityLog` hoje tem o tipo `entity` como string fixa. Vamos usar `"product"` como entity para log por produto, mantendo compatibilidade.

---

## 10. Lógica do Close Endpoint com Estoque

### Pseudocódigo

```typescript
// Dentro de PATCH /api/ordens-servico/[id]/close
// Após validação normal do fechamento

// 1. Verificar se módulo inventory está ativo
const inventoryActive = await checkModuleAccess(companyId, "inventory");

// 2. Buscar OS com itens e dados de produto
const serviceOrder = await tenant.serviceOrder.findUnique({
  where: { id },
  include: { items: { include: { product: true } } },
});

// 3. Se inventory ativo E inventoryDeductedAt é null E há itens com productId
if (inventoryActive && !serviceOrder.inventoryDeductedAt) {
  const itemsWithProduct = serviceOrder.items.filter(item => item.productId);
  
  if (itemsWithProduct.length > 0) {
    // 4. Validar estoque suficiente para TODOS os itens
    const insufficientItems = [];
    for (const item of itemsWithProduct) {
      if (Number(item.product.quantity) < Number(item.quantity)) {
        insufficientItems.push({
          productId: item.productId,
          productName: item.product.name,
          available: Number(item.product.quantity),
          required: Number(item.quantity),
        });
      }
    }
    
    if (insufficientItems.length > 0) {
      return NextResponse.json({
        error: "Estoque insuficiente",
        insufficientStock: true,
        details: insufficientItems,
      }, { status: 409 });
    }
    
    // 5. Usar transaction para garantir atomicidade
    await prisma.$transaction(async (tx) => {
      // 5a. Para cada item com productId, criar StockMovement e atualizar Product.quantity
      for (const item of itemsWithProduct) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        const previousQuantity = Number(product.quantity);
        const deductionAmount = Number(item.quantity);
        const newQuantity = previousQuantity - deductionAmount;
        
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: item.productId,
            serviceOrderId: id,
            type: "OUT",
            reason: "SERVICE_ORDER",
            quantity: deductionAmount,
            previousQuantity,
            newQuantity,
            description: `Baixa pela OS ${serviceOrder.code || serviceOrder.number}`,
            createdById: userId,
          },
        });
        
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: newQuantity },
        });
      }
      
      // 5b. Marcar inventoryDeductedAt na OS
      await tx.serviceOrder.update({
        where: { id },
        data: { inventoryDeductedAt: new Date() },
      });
    });
    
    // 6. Logs de atividade (fora da transaction, são best-effort)
    await logActivity({ ... });
  }
}

// Continuar com o restante do fechamento (financeiro, email, etc.)
```

### Observação importante sobre RLS e transaction

O `tenantPrisma` usa RLS via `set_config`. Na transaction, precisamos garantir que o contexto RLS seja mantido. A abordagem mais segura é:

1. Usar `prisma.$transaction()` (client global) com RLS setado manualmente no início
2. Ou usar `tenant.serviceOrder.update()` dentro da transaction com o extended client

**Decisão**: Usar a instância global `prisma` dentro da transaction e setar o RLS manualmente, ou verificar se o `tenantPrisma` extended client funciona corretamente com `$transaction`. Testar isso na implementação.

---

## 11. Segurança

| Ponto | Medida |
|-------|--------|
| **tenantPrisma/RLS** | Todas as queries de estoque usam `tenantPrisma(companyId)` com RLS |
| **Module guard** | Verificar `checkModuleAccess(companyId, "inventory")` antes de qualquer operação de estoque |
| **OS sem produto** | Itens sem `productId` são ignorados na baixa — funcionam como itens manuais |
| **Estoque inativo** | Se módulo `inventory` não estiver ativo, nenhuma lógica de estoque é executada |
| **Portal público** | O portal do cliente (Etapa 3) **não expõe** dados de estoque — apenas visualização da OS |
| **Idempotência** | `inventoryDeductedAt` impede baixa duplicada |
| **Atomicidade** | Transaction Prisma garante all-or-nothing |

---

## 12. O que NÃO será implementado nesta etapa

- Compras de estoque (entrada de estoque por compra)
- Fornecedores
- Inventário avançado
- Custo médio
- Lote/validade
- Baixa de ingredientes do cardápio
- Relatórios avançados de estoque
- UI completa de StockMovements (historial)
- Devolução de estoque ao cancelar OS

---

## 13. Riscos

| Risco | Mitigação |
|-------|-----------|
| **RLS na transaction** — `tenantPrisma` não funciona dentro de `prisma.$transaction()` | Usar `set_config` manual no início da transaction. Operações usam `tx` (global) com `companyId` explícito nos where/creates |
| **Race condition de estoque** — dois fechamentos simultâneos podem causar estoque negativo | **UPDATE condicional**: `updateMany` com `where: { quantity: { gte: item.quantity } }` e `data: { quantity: { decrement: item.quantity } }`. Se `count === 0`, a transaction falha com erro |
| **ProductId inválido** — produto pode ter sido deletado entre a criação da OS e o fechamento | `onDelete: SetNull` no relation transforma productId em null — item vira manual automaticamente. Além disso, a transaction valida produtos antes da baixa |
| **Migration grande** — tabela nova + enums + 3 alterações de tabela | Migration simples e aditiva, sem breaking changes. Colunas novas são nullable. Enums são aditivos no PostgreSQL |
| **Baixa parcial em OS cancelada** — se a OS for cancelada após baixa | Por enquanto, não faremos devolução automática. A devolução será manual via ajuste de estoque. Podemos implementar devolução automática em etapa futura |

---

## 14. Ordem de Implementação

| Passo | Arquivo | Descrição |
|-------|---------|-----------|
| 1 | `prisma/schema.prisma` | Adicionar enums `StockMovementType`/`StockMovementReason`, `StockMovement`, `productId` em ServiceOrderItem, `inventoryDeductedAt` em ServiceOrder, relações |
| 2 | `prisma migrate dev` | Gerar e rodar migration `add-stock-movement-and-inventory-integration` |
| 3 | `src/lib/prisma.ts` | Adicionar `"StockMovement"` ao `TENANT_MODELS` |
| 4 | `src/lib/activity-log.ts` | Adicionar `"stock_movement"` ao union type de entity |
| 5 | `src/lib/validations.ts` | Adicionar `productId` ao `osItemSchema` |
| 6 | `src/lib/stock-deduction.ts` | Criar helper `deductStockForServiceOrder()` com `prisma.$transaction`, `set_config` manual, `updateMany` condicional |
| 7 | `src/app/api/ordens-servico/[id]/close/route.ts` | Integrar `deductStockForServiceOrder` na transaction de fechamento (antes do financeiro) |
| 8 | `src/app/api/ordens-servico/[id]/route.ts` (GET) | Retornar `inventoryDeductedAt`, `inventoryActive`, `product` nos items |
| 9 | `src/app/api/ordens-servico/[id]/route.ts` (PUT) | Suportar `productId` nos itens |
| 10 | `src/app/api/ordens-servico/route.ts` (POST) | Suportar `productId` nos itens |
| 11 | `src/components/modules/service-order-form.tsx` | Adicionar seletor de produto (condicional ao módulo inventory) |
| 12 | `src/app/(dashboard)/ordens-servico/novo/NovaOSContent.tsx` | Buscar lista de produtos se inventory ativo |
| 13 | `src/app/(dashboard)/ordens-servico/[id]/OSDetailContent.tsx` | Adicionar card de estoque com stockMovements, status da baixa |
| 14 | `src/components/modules/close-service-order-dialog.tsx` | Tratar erro 409 de estoque insuficiente |
| 15 | — | Rodar `npm run build` e `npx tsc --noEmit` |

---

## 15. Como Testar

### Teste 1: OS com item manual (sem produto) — módulo inventory inativo
1. Desative o módulo inventory para a empresa
2. Crie uma OS com item manual
3. Feche a OS
4. **Resultado esperado**: OS fecha normalmente, sem baixa de estoque

### Teste 2: OS com item manual — módulo inventory ativo
1. Ative o módulo inventory
2. Crie uma OS com item manual (sem productId)
3. Feche a OS
4. **Resultado esperado**: OS fecha normalmente, sem baixa de estoque, `inventoryDeductedAt` permanece null

### Teste 3: OS com produto vinculado — estoque suficiente
1. Ative o módulo inventory
2. Crie um produto "Tela Samsung" com quantity = 10
3. Crie uma OS com item vinculado ao produto (quantity = 2)
4. Feche a OS
5. **Resultado esperado**:
   - OS fecha com sucesso
   - Produto "Tela Samsung" agora tem quantity = 8
   - StockMovement criado com type=OUT, reason=SERVICE_ORDER
   - `inventoryDeductedAt` preenchido na OS
   - Card de estoque mostra "Produtos baixados" com detalhes

### Teste 4: OS com produto vinculado — estoque insuficiente
1. Crie um produto "Bateria" com quantity = 1
2. Crie uma OS com item vinculado ao produto (quantity = 5)
3. Tente fechar a OS
4. **Resultado esperado**: Erro 409 com mensagem "Estoque insuficiente para o produto Bateria. Disponível: 1, necessário: 5."

### Teste 5: Tentar baixa duplicada
1. Feche uma OS com produto (baixa realizada)
2. Tente fechar a mesma OS novamente
3. **Resultado esperado**: OS fecha normalmente, sem nova baixa de estoque (idempotente)

### Teste 6: Produto deletado após vínculo
1. Crie uma OS com item vinculado a um produto
2. Delete o produto
3. **Resultado esperado**: `productId` do item vira null (onDelete: SetNull), item vira manual

### Teste 7: Misto — item com produto + item manual
1. Crie OS com 2 itens: um vinculado ao produto, outro manual
2. Feche a OS
3. **Resultado esperado**: Apenas o item com produto baixa estoque

---

## 16. Dependências

- Etapa 1 (base modular): ✅ Concluída
- Etapa 2 (OS Premium): ✅ Concluída
- Etapa 3 (Portal do Cliente): ✅ Concluída
- Etapa 4 (Fechamento da OS): ✅ Concluída
- Etapa 5 (Integração Financeiro): ✅ Concluída
- Etapa 6 (Integração Estoque): 🔵 Este plano

---

> **Aguardando aprovação antes de implementar.**
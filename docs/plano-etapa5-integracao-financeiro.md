# Etapa 5 — Integração Opcional OS Premium ↔ Financeiro

## Contexto

Ao fechar uma OS (Etapa 4), o sistema salva finalAmount, paymentStatus, warranty etc. Esta etapa cria/atualiza automaticamente uma FinancialTransaction vinculada, mas **apenas se o módulo Financeiro estiver ativo** para a empresa. Se o módulo não estiver ativo, o fechamento funciona normalmente — sem erro, sem transação.

---

## Model real do financeiro

**Model:** `FinancialTransaction`  
**Tabela:** `financial_transactions`  
(Não é `Transaction` / `transactions`)

### Campos reais usados

| Campo | Tipo | Uso |
|---|---|---|
| `type` | String | `"RECEIVABLE"` |
| `status` | String | `"PAID"` / `"PENDING"` / `"CANCELLED"` |
| `paidAt` | DateTime? | Preenchido quando PAID |
| `dueDate` | DateTime? | Preenchido quando PENDING |
| `description` | String | `"Receita da OS {code}"` |
| `category` | String? | `"Ordem de Serviço"` |
| `amount` | Decimal | finalAmount |
| `customerId` | String? | customerId da OS |
| `notes` | String? | Apenas para PARTIAL |

---

## Arquivos que serão alterados

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `prisma/schema.prisma` | Adicionar `serviceOrderId` nullable + relation em FinancialTransaction; `transactions[]` em ServiceOrder; `@@index([serviceOrderId])` |
| 2 | Migration (auto-gerada) | `ALTER TABLE financial_transactions ADD COLUMN serviceOrderId TEXT` + FK + index |
| 3 | `src/app/api/ordens-servico/[id]/close/route.ts` | Verificar módulo finance, criar/atualizar FinancialTransaction vinculada |
| 4 | `src/app/api/ordens-servico/[id]/route.ts` | Adicionar `transactions` no include do GET + `financeActive` na response |
| 5 | `src/app/(dashboard)/ordens-servico/[id]/OSDetailContent.tsx` | Card financeiro ou aviso de módulo inativo |

---

## Mudanças no Prisma Schema

### FinancialTransaction — adicionar campo + relação

```prisma
serviceOrderId   String?
serviceOrder     ServiceOrder? @relation(fields: [serviceOrderId], references: [id], onDelete: SetNull)
@@index([serviceOrderId])
```

### ServiceOrder — adicionar relação reversa

```prisma
transactions  FinancialTransaction[]
```

**Compatibilidade:** `serviceOrderId` é nullable → transações existentes continuam funcionando. `onDelete: SetNull` → se OS deletada, transação sobrevive com link nulo.

---

## Regras de criação da Transaction

| paymentStatus | type | status | paidAt | dueDate | description | notes |
|---|---|---|---|---|---|---|
| **PAID** | RECEIVABLE | PAID | completedAt | — | `Receita da OS {code}` | — |
| **PENDING** | RECEIVABLE | PENDING | — | completedAt | `Conta a receber da OS {code}` | — |
| **PARTIAL** | RECEIVABLE | PENDING | — | completedAt | `Pagamento parcial da OS {code}` | `Pagamento parcial: R$ X de R$ Y` |
| **CANCELLED** | RECEIVABLE | CANCELLED | — | — | Atualizar transação existente para CANCELLED, ou não criar se não existir |

- Sempre `category: "Ordem de Serviço"`, `customerId: os.customerId`, `amount: finalAmount`
- Se `finalAmount <= 0`, não criar transação
- **Deduplicação:** `findFirst({ where: { serviceOrderId } })` — se existe, UPDATE; se não, CREATE

---

## Lógica no close/route.ts

Após update da OS e ActivityLog de service_order:

```
1. checkModuleAccess(companyId, "finance") — em paralelo com checkModuleAccess("service_orders")
2. Se não ativo → pular (fluxo atual preservado 100%)
3. Se ativo E finalAmount > 0:
   a. Buscar transação existente por serviceOrderId
   b. Se paymentStatus === CANCELLED:
      - Se existir transação → marcar como CANCELLED
      - Se não existir → não fazer nada
   c. Se paymentStatus !== CANCELLED:
      - Montar dados conforme tabela acima
      - Criar ou atualizar (upsert manual via findFirst + create/update)
      - LogActivity entity "financial"
4. try/catch: erro no finance → console.error, NÃO falhar fechamento
5. Re-buscar OS com transactions no include
6. Retornar { ...refreshedOS, financeActive }
```

---

## Mudanças no GET endpoint

- Adicionar `transactions` no include (select: id, type, description, category, amount, dueDate, paidAt, status, notes, createdAt, updatedAt)
- Serializar `amount: Number(t.amount)` na response
- Adicionar `financeActive` boolean na response

---

## UI — OSDetailContent

1. **Financeiro INATIVO** → Card: "Ative o módulo Financeiro para lançar receitas automaticamente."
2. **Financeiro ATIVO + transação vinculada** → Card com badge de status, valor, data, link → `/financeiro/{id}`
3. **Financeiro ATIVO + sem transação** → Não mostrar nada

Posição: após card de Pagamento, antes de Garantia.

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Migration em produção | serviceOrderId nullable → sem breaking change |
| Erro finance quebra fechamento | try/catch com console.error, OS fecha normalmente |
| Duplicidade | findFirst por serviceOrderId antes de criar |
| Transação órfã | onDelete: SetNull |
| Decimal serialization | Converter amount para Number (padrão já usado) |
| RLS/tenant | Usar tenant.financialTransaction (tenantPrisma injeta companyId) |

---

## Verificação

1. `npx prisma migrate dev --name add_os_finance_link`
2. `npx prisma generate`
3. `npm run build`
4. `npx tsc --noEmit`

---

## Não implementar

- Estoque, baixa de produtos, conciliação bancária, pagamento online, Pix/Stripe, recibo avançado, aprovação do cliente
# Plano de Implementação — Etapa 2: OS Premium

**Data:** 2026-06-15
**Etapa:** 2 (OS Premium)
**Depende de:** Etapa 1 concluída (base modular SaaS)

---

## Objetivo

Melhorar o módulo Ordens de Serviço para virar um módulo premium, com campos avançados, fluxo de status profissional e badges visuais. Sem implementar Portal, Financeiro, Estoque ou Cardápio ainda.

---

## Campos Novos no Prisma — ServiceOrder

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| code | String | auto: "OS-{number}" | Código legível da OS |
| equipmentName | String? | null | Equipamento/produto |
| equipmentBrand | String? | null | Marca do equipamento |
| equipmentModel | String? | null | Modelo do equipamento |
| serialNumber | String? | null | Número de série |
| accessories | String? | null | Acessórios recebidos (texto livre) |
| priority | ServiceOrderPriority | NORMAL | Prioridade |
| technicianId | String? | null | FK para User (técnico responsável) |
| receivedAt | DateTime? | null | Data de entrada no sistema |
| expectedDeliveryDate | DateTime? | null | Data prevista de entrega |
| completedAt | DateTime? | null | Data de conclusão real |
| finalAmount | Decimal? @db.Decimal(10,2) | null | Valor final (pode diferir do total) |
| paymentMethod | PaymentMethod? | null | Método de pagamento |
| warrantyEnabled | Boolean | false | Se garantia está ativa |
| warrantyStartDate | DateTime? | null | Data inicial da garantia |
| warrantyEndDate | DateTime? | null | Data final da garantia |
| warrantyTerms | String? | null | Termos da garantia |
| internalNotes | String? | null | Observações internas (não visíveis ao cliente) |
| customerNotes | String? | null | Observações visíveis ao cliente |
| publicToken | String? @unique | null | Token público para futuro portal do cliente |

---

## Enums Novos

### ServiceOrderPriority
```
enum ServiceOrderPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### ServiceOrderStatus (atualizado)
```
enum ServiceOrderStatus {
  RECEIVED          // nova OS recebida
  DIAGNOSIS         // em diagnóstico
  WAITING_APPROVAL  // aguardando aprovação do orçamento
  WAITING_PARTS     // aguardando peças
  IN_PROGRESS       // em execução
  READY             // pronta para retirada
  DELIVERED         // entregue ao cliente
  COMPLETED         // concluída e encerrada
  CANCELLED         // cancelada
}
```

### PaymentMethod (novo)
```
enum PaymentMethod {
  CASH
  PIX
  CARD
  TRANSFER
  OTHER
}
```

---

## Estratégia de Compatibilidade com OS Antigas

Os status antigos precisam ser migrados:

| Status Antigo | Status Novo |
|---------------|-----------|
| OPENED | RECEIVED |
| IN_PROGRESS | IN_PROGRESS (sem mudança) |
| WAITING_PARTS | WAITING_PARTS (sem mudança) |
| FINISHED | READY |
| DELIVERED | DELIVERED (sem mudança) |
| CANCELLED | CANCELLED (sem mudança) |

**Migration strategy:**

1. Criar migration que adiciona os novos valores ao enum `ServiceOrderStatus` (PostgreSQL suporta adicionar valores a enums com `ALTER TYPE ... ADD VALUE`)
2. Rodar um script SQL de update em batch:
   ```sql
   UPDATE service_orders SET status = 'RECEIVED' WHERE status = 'OPENED';
   UPDATE service_orders SET status = 'READY' WHERE status = 'FINISHED';
   ```
3. Adicionar os novos campos com `@default` e valores nulos — OS existentes terão campos novos como `null`
4. O campo `code` pode ser populado retroativamente com `"OS-{number}"` para OS existentes
5. O campo `priority` default é `NORMAL`, então OS existentes recebem prioridade normal
6. O campo `publicToken` pode ser gerado para OS existentes com um script de retroatividade

**Campos antigos mantidos:**
- `number` (Int) — continua existindo, `code` é derivado
- `status` — muda os valores do enum mas o campo continua
- `total` — continua, `finalAmount` é separado
- `paidAmount` — continua
- `paymentStatus` — continua
- `notes` — continua, mas renomeado conceitualmente para `internalNotes`

---

## Arquivos que serão alterados

| # | Arquivo | Ação | Por que |
|---|---------|------|---------|
| 1 | `prisma/schema.prisma` | Adicionar campos e enums | Schema do banco |
| 2 | `prisma/seed.ts` | Atualizar dados de seed | Popular OS com novos campos |
| 3 | `src/lib/validations.ts` | Atualizar osSchema e adicionar osUpdateSchema | Validação Zod |
| 4 | `src/lib/modules.ts` | Confirmar service_orders como premium | Já feito na Etapa 1 |
| 5 | `src/lib/os-status.ts` | **CRIAR** — helpers centralizados de status, labels, cores, transições | Eliminar duplicação de getStatusLabel/getStatusVariant |
| 6 | `src/app/api/ordens-servico/route.ts` | Adicionar campos novos no POST | Criar OS com novos campos |
| 7 | `src/app/api/ordens-servico/[id]/route.ts` | Adicionar campos novos no GET/PUT, atualizar máquina de status | Editar OS, fluxo de status premium |
| 8 | `src/app/(dashboard)/ordens-servico/page.tsx` | Atualizar listagem com novos campos | Mostrar código, equipamento, prioridade, previsão |
| 9 | `src/app/(dashboard)/ordens-servico/[id]/OSDetailContent.tsx` | Reorganizar em seções, adicionar novos campos | Página de detalhe premium |
| 10 | `src/components/modules/service-order-form.tsx` | Adicionar campos de equipamento, prioridade, garantia, pagamento | Formulário premium |
| 11 | `src/components/pdf/service-order-pdf.tsx` | Atualizar PDF com novos campos e seções | PDF premium |
| 12 | `src/app/api/pdf/os/[id]/route.tsx` | Atualizar fetch para incluir novos campos | API do PDF |
| 13 | `src/app/(dashboard)/ordens-servico/novo/NovaOSContent.tsx` | Adaptar para formulário premium | Criar OS com novos campos |
| 14 | `src/app/(dashboard)/dashboard/page.tsx` | Atualizar query de OS abertas para novo status | Dashboard com RECEIVED e DIAGNOSIS |
| 15 | `src/lib/company-limits.ts` | Manter serviceOrders: 20 (já existe) | Sem mudança |

---

## Detalhes por Arquivo

### 1. `prisma/schema.prisma`

Adicionar:

```prisma
enum ServiceOrderPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum PaymentMethod {
  CASH
  PIX
  CARD
  TRANSFER
  OTHER
}
```

Atualizar `ServiceOrderStatus`:
```prisma
enum ServiceOrderStatus {
  RECEIVED
  DIAGNOSIS
  WAITING_APPROVAL
  WAITING_PARTS
  IN_PROGRESS
  READY
  DELIVERED
  COMPLETED
  CANCELLED
}
```

Atualizar modelo `ServiceOrder`:
```prisma
model ServiceOrder {
  id                  String              @id @default(cuid())
  companyId           String
  customerId          String
  quoteId             String?
  number              Int
  code                String?             @unique
  status              ServiceOrderStatus  @default(RECEIVED)
  priority            ServiceOrderPriority @default(NORMAL)
  problemDescription  String?
  serviceDescription  String?
  equipmentName       String?
  equipmentBrand       String?
  equipmentModel       String?
  serialNumber        String?
  accessories         String?
  technicianId        String?
  total               Decimal             @db.Decimal(10, 2) @default(0)
  finalAmount         Decimal?            @db.Decimal(10, 2)
  paidAmount          Decimal             @db.Decimal(10, 2) @default(0)
  paymentStatus       PaymentStatus       @default(PENDING)
  paymentMethod       PaymentMethod?
  receivedAt          DateTime?
  expectedDeliveryDate DateTime?
  completedAt         DateTime?
  warrantyEnabled     Boolean             @default(false)
  warrantyStartDate   DateTime?
  warrantyEndDate     DateTime?
  warrantyTerms       String?
  internalNotes       String?
  customerNotes       String?
  publicToken         String?             @unique
  notes               String?
  openedAt            DateTime            @default(now())
  finishedAt          DateTime?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  company     Company            @relation(fields: [companyId], references: [id])
  customer    Customer           @relation(fields: [customerId], references: [id])
  quote       Quote?             @relation(fields: [quoteId], references: [id])
  technician  User?              @relation(fields: [technicianId], references: [id])
  items       ServiceOrderItem[]

  @@unique([companyId, number])
  @@index([companyId])
  @@index([customerId])
  @@index([status])
  @@map("service_orders")
}
```

Adicionar relação em `User`:
```prisma
model User {
  // ... campos existentes ...
  serviceOrders ServiceOrder[] @relation("ServiceOrderTechnician")
}
```

---

### 2. `prisma/seed.ts`

Atualizar OS de exemplo para incluir campos novos:
- `code: "OS-1"`
- `priority: "NORMAL"`
- `equipmentName`, `equipmentBrand`, `equipmentModel`
- `receivedAt`, `expectedDeliveryDate`
- `status: "IN_PROGRESS"` (migrado de antigo)
- `warrantyEnabled: false`

---

### 3. `src/lib/validations.ts`

Atualizar `osSchema` para refletir novos campos e novos status:

```ts
export const serviceOrderPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const paymentMethodSchema = z.enum(["CASH", "PIX", "CARD", "TRANSFER", "OTHER"]);

export const osItemSchema = z.object({
  description: z.string().min(1, "Descricao e obrigatoria"),
  quantity: z.coerce.number().positive("Quantidade deve ser positiva"),
  unitPrice: z.coerce.number().nonnegative("Preco nao pode ser negativo"),
});

export const osSchema = z.object({
  customerId: z.string().min(1, "Cliente e obrigatorio"),
  quoteId: z.string().optional().or(z.literal("")),
  problemDescription: z.string().optional().or(z.literal("")),
  serviceDescription: z.string().optional().or(z.literal("")),
  equipmentName: z.string().optional().or(z.literal("")),
  equipmentBrand: z.string().optional().or(z.literal("")),
  equipmentModel: z.string().optional().or(z.literal("")),
  serialNumber: z.string().optional().or(z.literal("")),
  accessories: z.string().optional().or(z.literal("")),
  priority: serviceOrderPrioritySchema.optional().default("NORMAL"),
  expectedDeliveryDate: z.string().optional().or(z.literal("")),
  warrantyEnabled: z.boolean().optional().default(false),
  warrantyTerms: z.string().optional().or(z.literal("")),
  internalNotes: z.string().optional().or(z.literal("")),
  customerNotes: z.string().optional().or(z.literal("")),
  items: z.array(osItemSchema).optional().default([]),
  notes: z.string().optional().or(z.literal("")),
});
```

---

### 4. `src/lib/os-status.ts` (CRIAR)

Centralizar todos os helpers de status, labels, cores e transições:

```ts
import type { ServiceOrderStatus, ServiceOrderPriority, PaymentStatus, PaymentMethod } from "@/generated/prisma/client";

// ── Status ────────────────────────────────────────────────────────────────

export const SERVICE_ORDER_STATUS: { value: ServiceOrderStatus; label: string; variant: string }[] = [
  { value: "RECEIVED", label: "Recebida", variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "DIAGNOSIS", label: "Em Diagnóstico", variant: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "WAITING_APPROVAL", label: "Aguardando Aprovação", variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "WAITING_PARTS", label: "Aguardando Peças", variant: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "IN_PROGRESS", label: "Em Execução", variant: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { value: "READY", label: "Pronta", variant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "DELIVERED", label: "Entregue", variant: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "COMPLETED", label: "Concluída", variant: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
  { value: "CANCELLED", label: "Cancelada", variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

export const STATUS_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  RECEIVED: ["DIAGNOSIS", "IN_PROGRESS", "CANCELLED"],
  DIAGNOSIS: ["WAITING_APPROVAL", "IN_PROGRESS", "CANCELLED"],
  WAITING_APPROVAL: ["IN_PROGRESS", "CANCELLED"],
  WAITING_PARTS: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "WAITING_PARTS", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function getStatusLabel(status: ServiceOrderStatus): string {
  return SERVICE_ORDER_STATUS.find(s => s.value === status)?.label ?? status;
}

export function getStatusVariant(status: ServiceOrderStatus): string {
  return SERVICE_ORDER_STATUS.find(s => s.value === status)?.variant ?? "bg-gray-100 text-gray-700";
}

// ── Priority ─────────────────────────────────────────────────────────────

export const SERVICE_ORDER_PRIORITY: { value: ServiceOrderPriority; label: string; variant: string }[] = [
  { value: "LOW", label: "Baixa", variant: "bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400" },
  { value: "NORMAL", label: "Normal", variant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "HIGH", label: "Alta", variant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "URGENT", label: "Urgente", variant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

export function getPriorityLabel(priority: ServiceOrderPriority): string {
  return SERVICE_ORDER_PRIORITY.find(p => p.value === priority)?.label ?? priority;
}

export function getPriorityVariant(priority: ServiceOrderPriority): string {
  return SERVICE_ORDER_PRIORITY.find(p => p.value === priority)?.variant ?? "bg-gray-100 text-gray-700";
}

// ── Payment ──────────────────────────────────────────────────────────────

export const PAYMENT_STATUS: { value: PaymentStatus; label: string; variant: string }[] = [
  { value: "PENDING", label: "Pendente", variant: "bg-amber-100 text-amber-700" },
  { value: "PARTIAL", label: "Parcial", variant: "bg-orange-100 text-orange-700" },
  { value: "PAID", label: "Pago", variant: "bg-emerald-100 text-emerald-700" },
  { value: "CANCELLED", label: "Cancelado", variant: "bg-red-100 text-red-700" },
];

export const PAYMENT_METHOD: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CARD", label: "Cartão" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "OTHER", label: "Outro" },
];

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS.find(p => p.value === status)?.label ?? status;
}

export function getPaymentStatusVariant(status: PaymentStatus): string {
  return PAYMENT_STATUS.find(p => p.value === status)?.variant ?? "bg-gray-100 text-gray-700";
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD.find(p => p.value === method)?.label ?? method;
}

// ── Warranty ─────────────────────────────────────────────────────────────

export function getWarrantyStatus(warrantyEnabled: boolean, warrantyEndDate: Date | null): { label: string; variant: string } {
  if (!warrantyEnabled) return { label: "Sem garantia", variant: "bg-gray-100 text-gray-600" };
  if (!warrantyEndDate) return { label: "Garantia ativa", variant: "bg-emerald-100 text-emerald-700" };
  const now = new Date();
  if (now > new Date(warrantyEndDate)) return { label: "Garantia vencida", variant: "bg-red-100 text-red-700" };
  return { label: "Garantia ativa", variant: "bg-emerald-100 text-emerald-700" };
}

// ── Code ─────────────────────────────────────────────────────────────────

export function generateOSCode(number: number): string {
  return `OS-${String(number).padStart(4, '0')}`;
}
```

---

### 5-14. Outros arquivos

Todos os outros arquivos serão atualizados para:

- Importar helpers de `@/lib/os-status` em vez de duplicar
- Adicionar novos campos nos formulários, listagem e detalhe
- Atualizar máquina de status para o novo fluxo
- Adicionar seções na página de detalhe (equipamento, garantia, pagamento, observações)
- Atualizar badges de status, prioridade e pagamento
- Atualizar PDF com novas seções
- Gerar `publicToken` com `crypto.randomUUID()` ao criar OS
- Calcular `code` automaticamente como `"OS-{number}"` ao criar OS
- Respeitar `module-guard` para `service_orders` (premium)

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Migration quebra OS existentes | Adicionar novos campos como nullable; rodar UPDATE batch para migrar status |
| Status antigos (OPENED, FINISHED) não existem mais | Migration SQL: `UPDATE service_orders SET status = 'RECEIVED' WHERE status = 'OPENED'` e `UPDATE ... SET status = 'READY' WHERE status = 'FINISHED'` |
| Zod schema antigo com status errados | Atualizar `osSchema` com novos valores e tornar campos novos opcionais |
| Labels de status duplicados em 4 arquivos | Centralizar em `os-status.ts` e importar de lá |
| PDF quebra com campos nulos | Todos os campos novos são opcionais; PDF renderiza condicionalmente |
| `publicToken` pode ser nulo para OS antigas | Gerar tokens retroativamente via script SQL |

---

## Como Testar

1. `npx prisma migrate dev --name os-premium` — migration deve rodar sem erros
2. `npm run build` — deve compilar sem erros
3. `npx tsc --noEmit` — zero erros de TypeScript
4. Criar OS nova — todos os campos novos devem ser salvos
5. Listagem mostra: código OS, cliente, equipamento, prioridade, previsão, pagamento, garantia
6. Detalhe organizado em seções: cliente, equipamento, problema, serviço, itens, prazos, pagamento, garantia, observações
7. Status transitions seguem a nova máquina de estados
8. OS antigas continuam funcionando com campos novos como null
9. PDF mostra novas seções condicionalmente
10. Módulo `service_orders` (premium) requer assinatura para acessar

---

## O que NÃO muda (preservado)

- RLS / tenantPrisma
- ActivityLog
- NextAuth
- module-guard para service_orders
- Campos antigos do ServiceOrder (number, total, paidAmount, etc.)
- Relação com Quote e Customer
- WhatsApp integration
- Email integration
- Funcionalidades existentes de OS
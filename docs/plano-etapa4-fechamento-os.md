# Etapa 4 — Fechamento da OS com Garantia

## Contexto

A Etapa 2 (OS Premium) adicionou os campos necessários ao model ServiceOrder (finalAmount, paymentStatus, paymentMethod, warrantyEnabled, warrantyStartDate, warrantyEndDate, warrantyTerms, completedAt, etc.). A Etapa 3 (Portal) criou o portal público. Agora é preciso implementar o fluxo de fechamento dentro do painel autenticado, permitindo que o usuário finalize uma OS com dados de pagamento, garantia e serviço realizado.

---

## Arquivos que serão criados (2)

| # | Arquivo | Função |
|---|---------|--------|
| 1 | `src/app/api/ordens-servico/[id]/close/route.ts` | Endpoint PATCH dedicado ao fechamento |
| 2 | `src/components/modules/close-service-order-dialog.tsx` | Dialog/modal de fechamento |

## Arquivos que serão modificados (3)

| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `src/lib/validations.ts` | Adicionar `closeServiceOrderSchema` |
| 2 | `src/lib/os-status.ts` | Adicionar constante `ALLOWED_CLOSE_TRANSITIONS` |
| 3 | `src/app/(dashboard)/ordens-servico/[id]/OSDetailContent.tsx` | Adicionar botão "Finalizar OS" e integrar dialog |

## Arquivos que NÃO serão alterados

- PDF (`service-order-pdf.tsx`, `public-service-order-pdf.tsx`) — já mostra garantia, pagamento, descrição de serviço
- Portal (`PortalOSContent.tsx`, `portal.ts`) — já mostra todos os campos de fechamento
- Middleware — sem mudança necessária
- Schema Prisma — sem migração necessária

---

## Endpoint: PATCH /api/ordens-servico/[id]/close

### Por que PATCH em endpoint separado?

O PUT existente já tem 3 modos (status, pagamento, edição completa). Adicionar um 4º modo aumentaria a complexidade e o risco de bugs. Um endpoint dedicado com PATCH é semanticamente correto (atualização parcial de uma operação específica) e mantém responsabilidades separadas.

### Fluxo lógico

1. Autenticar via `auth()`. Retornar 401 se sem sessão.
2. Extrair `companyId`, `userId`, `userName` da sessão.
3. Verificar acesso ao módulo `service_orders` via `checkModuleAccess(companyId, "service_orders")`.
4. Buscar OS existente via `tenant.serviceOrder.findUnique({ where: { id }, include: { customer: { select: { email: true, name: true } } } })`.
5. Retornar 404 se não encontrada.
6. Validar que `existing.status` está em `["IN_PROGRESS", "READY", "DELIVERED"]`. Retornar 400 se não.
7. Parsear body com `closeServiceOrderSchema.safeParse()`. Retornar 422 com erros se inválido.
8. Validar que `finalStatus` é permitido para o status atual via `ALLOWED_CLOSE_TRANSITIONS`. Retornar 400 se não.
9. Construir objeto de update:

```ts
const updateData = {
  status: validatedData.finalStatus,
  finalAmount: validatedData.finalAmount,
  paymentStatus: validatedData.paymentStatus,
  paymentMethod: validatedData.paymentMethod || null,
  completedAt: new Date(validatedData.completedAt),
  finishedAt: new Date(), // marca como finalizada
  serviceDescription: validatedData.serviceDescription?.trim() || null,
  customerNotes: validatedData.customerNotes?.trim() || null,
  warrantyEnabled: validatedData.warrantyEnabled,
  warrantyStartDate: validatedData.warrantyEnabled ? ... : null,
  warrantyEndDate: validatedData.warrantyEnabled ? ... : null,
  warrantyTerms: validatedData.warrantyEnabled ? ... : null,
};

// Se pagamento = PAID, setar paidAmount = finalAmount
if (validatedData.paymentStatus === "PAID") {
  updateData.paidAmount = validatedData.finalAmount;
}
```

10. Executar `tenant.serviceOrder.update({ where: { id }, data: updateData, include: { ... } })`.
11. Criar ActivityLog: `action: "UPDATE"`, `entity: "service_order"`, `details: "Nº {number} - Finalizada: {finalStatus}"`.
12. Se `sendEmail === true` e cliente tem email, chamar `sendOSCompletedEmail()` fire-and-forget.
13. Retornar OS atualizada como JSON.

### Transições permitidas por status

```ts
export const ALLOWED_CLOSE_TRANSITIONS: Record<string, string[]> = {
  IN_PROGRESS: ["READY", "DELIVERED", "COMPLETED"],
  READY: ["DELIVERED", "COMPLETED"],
  DELIVERED: ["COMPLETED"],
};
```

---

## Zod Schema: closeServiceOrderSchema

```ts
export const closeServiceOrderSchema = z.object({
  finalStatus: z.enum(["READY", "DELIVERED", "COMPLETED"], {
    message: "Status final inválido",
  }),
  finalAmount: z.coerce.number().nonnegative("Valor final não pode ser negativo"),
  paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID", "CANCELLED"], {
    message: "Status de pagamento inválido",
  }),
  paymentMethod: z.enum(["CASH", "PIX", "CARD", "TRANSFER", "OTHER"]).optional().nullable(),
  completedAt: z.string().min(1, "Data de conclusão é obrigatória"),
  serviceDescription: z.string().optional().default(""),
  customerNotes: z.string().optional().default(""),
  warrantyEnabled: z.coerce.boolean(),
  warrantyStartDate: z.string().optional().default(""),
  warrantyEndDate: z.string().optional().default(""),
  warrantyTerms: z.string().optional().default(""),
  sendEmail: z.coerce.boolean().optional().default(true),
});
```

Validação adicional no API route (não no Zod):
- Se `warrantyEnabled === true`: `warrantyStartDate` e `warrantyEndDate` devem estar preenchidos.
- Se `warrantyEnabled === false`: limpar datas e termos.
- Se `paymentStatus` não for `PENDING` e `paymentMethod` não for fornecido, não é erro (method é opcional).

---

## Componente: CloseServiceOrderDialog

### Props

```ts
interface CloseServiceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrder: ServiceOrderDetail;  // tipo existente do OSDetailContent
  onSuccess: (updated: ServiceOrderDetail) => void;
}
```

### Estado interno

Inicializado a partir de `serviceOrder` (preenche com valores existentes):

| Campo | Valor inicial |
|-------|--------------|
| `finalAmount` | `so.finalAmount ?? so.total` |
| `paymentStatus` | `so.paymentStatus` |
| `paymentMethod` | `so.paymentMethod ?? null` |
| `completedAt` | data de hoje (ISO) |
| `serviceDescription` | `so.serviceDescription ?? ""` |
| `customerNotes` | `so.customerNotes ?? ""` |
| `warrantyEnabled` | `so.warrantyEnabled` |
| `warrantyDays` | `"30"` |
| `warrantyStartDate` | hoje |
| `warrantyEndDate` | hoje + 30 dias |
| `warrantyTerms` | texto padrão ou `so.warrantyTerms ?? ""` |
| `sendEmail` | `true` se `so.customer.email` existe |
| `finalStatus` | primeira opção de `ALLOWED_CLOSE_TRANSITIONS[so.status]` |
| `submitting` | `false` |
| `error` | `null` |

### Layout do Dialog

```
┌─────────────────────────────────────────┐
│  Finalizar Ordem de Serviço    ✕        │
│  OS-0001 • Status atual: Em Execução    │
├─────────────────────────────────────────┤
│  Status Final                           │
│  [▼ COMPLETED        ]                 │
├─────────────────────────────────────────┤
│  Valores e Pagamento                    │
│  Valor Final: [350,00  ]               │
│  Status Pagto: [▼ PAGO  ]             │
│  Forma Pagto:  [▼ PIX   ]             │
├─────────────────────────────────────────┤
│  Serviço Realizado                      │
│  [textarea: serviceDescription]         │
│  Observações para o Cliente             │
│  [textarea: customerNotes]              │
├─────────────────────────────────────────┤
│  ☑ Oferecer garantia                   │
│  Prazo: [▼ 30 dias]                     │
│  Início: [15/06/2026]                  │
│  Validade: [15/07/2026]                │
│  Termos:                                │
│  [textarea: warrantyTerms]              │
├─────────────────────────────────────────┤
│  Data de Conclusão                      │
│  [15/06/2026]                           │
├─────────────────────────────────────────┤
│  ☑ Enviar notificação por e-mail        │
├─────────────────────────────────────────┤
│  [Cancelar]          [Finalizar OS]      │
└─────────────────────────────────────────┘
```

### Lógica de garantia

- **Se warrantyEnabled = true**:
  - warrantyStartDate obrigatório (default: hoje)
  - warrantyEndDate calculado a partir de warrantyDays (7, 15, 30, 60, 90) ou custom
  - warrantyTerms tem texto padrão: `"Garantia de {days} dias a partir da data de início. A garantia cobre defeitos de fabricação e problemas relacionados ao serviço realizado. Não cobre danos causados por uso inadequado, acidentes ou intervenções de terceiros."`
- **Se warrantyEnabled = false**:
  - Limpar warrantyStartDate, warrantyEndDate, warrantyTerms
  - Campos desaparecem do formulário

### Texto padrão de garantia

```
Garantia de {days} dias a partir da data de início. A garantia cobre defeitos de fabricação e problemas relacionados ao serviço realizado. Não cobre danos causados por uso inadequado, acidentes ou intervenções de terceiros.
```

---

## Regras de status

| Status atual | Botão "Finalizar OS"? | Opções no dialog |
|--------------|----------------------|------------------|
| RECEIVED | Não | — |
| DIAGNOSIS | Não | — |
| WAITING_APPROVAL | Não | — |
| WAITING_PARTS | Não | — |
| IN_PROGRESS | Sim | READY, DELIVERED, COMPLETED |
| READY | Sim | DELIVERED, COMPLETED |
| DELIVERED | Sim | COMPLETED |
| COMPLETED | Não | — |
| CANCELLED | Não | — |

O botão "Finalizar OS" usa `variant="default"` (emerald, primário) para se destacar.

Os botões de transição individual (READY, DELIVERED, COMPLETED) que hoje aparecem no `renderActionButtons()` são **removidos** para os status onde o dialog de fechamento é usado. O botão CANCELLED permanece separado.

---

## Pagamento

- Salvar apenas `finalAmount`, `paymentStatus`, `paymentMethod` na OS
- Se `paymentStatus === "PAID"`, setar `paidAmount = finalAmount` automaticamente
- **Não** criar Transaction no Financeiro (etapa futura)
- **Não** exigir pagamento como PAID para finalizar

---

## Portal do Cliente

O portal já reflete automaticamente os campos de fechamento:

- Status final → timeline e badge atualizam via `force-dynamic`
- Serviço realizado → card "Descrição" mostra `serviceDescription`
- Observações para o cliente → card "Observações" mostra `customerNotes`
- Pagamento → badge `paymentStatus` e valor `finalAmount ?? total`
- Garantia → card "Garantia" com status, datas e termos
- Data de conclusão → card "Prazos" com `completedAt`

**Nenhuma mudança necessária no portal.**

---

## PDF

O PDF público (`PublicServiceOrderPDF`) já mostra:

- Status final, valor, pagamento, garantia, descrição de serviço, observações do cliente

**Nenhuma mudança necessária no PDF.**

---

## Regras de garantia detalhadas

1. **warrantyEnabled = true**:
   - `warrantyStartDate` preenchido (default: data de hoje)
   - `warrantyEndDate` = `warrantyStartDate` + `warrantyDays` dias
   - Se `warrantyDays = "custom"`: ambas as datas são editáveis manualmente
   - `warrantyTerms` preenchido com texto padrão (editável)
   - Validação API: se `warrantyEnabled`, `warrantyStartDate` e `warrantyEndDate` são obrigatórios

2. **warrantyEnabled = false**:
   - `warrantyStartDate = null`
   - `warrantyEndDate = null`
   - `warrantyTerms = null`
   - Campos desaparecem do formulário

---

## Segurança e compatibilidade

- **Não quebra OS antigas**: OS existentes sem `finalAmount`, `completedAt`, etc. continuam funcionando (campos nullable)
- **Não remove campos existentes**: todos os campos do model são preservados
- **Não exige garantia**: `warrantyEnabled` pode ser false
- **Não exige pagamento PAID**: `paymentStatus` pode ser PENDING, PARTIAL, etc.
- **Não implementa Financeiro**: nenhuma Transaction é criada
- **Preserva RLS**: `tenantPrisma` é usado no endpoint
- **Preserva ActivityLog**: log de atividade é criado
- **Preserva módulo guard**: `checkModuleAccess` verificado
- **Não expõe internalNotes**: portal e PDF público não incluem notas internas

---

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Condição de corrida: outro usuário muda status enquanto o dialog está aberto | API valida status atual antes de atualizar. Retorna 400 se status mudou. |
| Pular etapas de status (IN_PROGRESS → COMPLETED) | Permitido por design — o fechamento é uma operação que pode avançar múltiplos status. |
| Pagamento inconsistente (PAID mas valor diferente) | Se `paymentStatus === "PAID"`, API seta `paidAmount = finalAmount`. |
| warrantyEndDate no passado | Dialog calcula automaticamente a partir de warrantyStartDate + warrantyDays. Validação no API. |
| Dialog muito alto em mobile | Usar `sm:max-w-lg` com `overflow-y-auto` no conteúdo. |
| Email com assinatura limitada | `sendOSCompletedEmail` é suficiente para esta etapa. Enriquecimento futuro. |

---

## Como testar

1. **Criar OS** → status RECEIVED → botão "Finalizar OS" **não aparece**
2. **Mudar para IN_PROGRESS** → botão "Finalizar OS" **aparece** → dialog com READY, DELIVERED, COMPLETED
3. **Mudar para READY** → botão "Finalizar OS" **aparece** → dialog com DELIVERED, COMPLETED
4. **Mudar para DELIVERED** → botão "Finalizar OS" **aparece** → dialog com COMPLETED
5. **Mudar para COMPLETED** → botão "Finalizar OS" **não aparece**
6. **Preencher dialog** com valor final, pagamento, garantia → submeter → OS atualizada
7. **Garantia toggle** → desligar garantia → campos desaparecem → dados limpos
8. **Garantia toggle** → ligar garantia → campos aparecem → data calculada automaticamente
9. **Pagamento PAID** → `paidAmount` setado automaticamente
10. **Email** → verificar checkbox aparece apenas se cliente tem email
11. **ActivityLog** → verificar entrada criada com detalhes corretos
12. **Portal** → acessar `/portal/os/[token]` → verificar dados de fechamento
13. **PDF** → baixar PDF público → verificar seção de garantia, pagamento, serviço
14. **Validação** → submeter sem dados obrigatórios → verificar erros

---

## Ordem de implementação

1. Adicionar `closeServiceOrderSchema` em `src/lib/validations.ts`
2. Adicionar `ALLOWED_CLOSE_TRANSITIONS` em `src/lib/os-status.ts`
3. Criar `src/app/api/ordens-servico/[id]/close/route.ts`
4. Criar `src/components/modules/close-service-order-dialog.tsx`
5. Modificar `src/app/(dashboard)/ordens-servico/[id]/OSDetailContent.tsx`
6. Rodar `npx next build` e `npx tsc --noEmit`
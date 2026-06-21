# ETAPA 16A — AUDITORIA: ENVIO, PORTAL PÚBLICO E APROVAÇÃO DE ORÇAMENTOS

## 1. MODELO ATUAL DO ORÇAMENTO

**Model Prisma:** `Quote` (linha 416 do schema)

**Campos existentes:**

| Campo | Tipo | Nullable | Observação |
|-------|------|----------|------------|
| `id` | String @id @default(cuid()) | Não | |
| `companyId` | String | Não | FK → Company |
| `customerId` | String | Não | FK → Customer |
| `number` | Int | Não | Sequencial por empresa |
| `publicToken` | String? @unique | **Sim** | **JÁ EXISTE!** |
| `status` | QuoteStatus @default(DRAFT) | Não | |
| `description` | String? | Sim | |
| `subtotal` | Decimal @default(0) | Não | |
| `discount` | Decimal @default(0) | Não | |
| `total` | Decimal @default(0) | Não | |
| `validUntil` | DateTime? | Sim | |
| `notes` | String? | Sim | |
| `createdAt` | DateTime @default(now()) | Não | |
| `updatedAt` | DateTime @updatedAt | Não | |

**Status existentes (`QuoteStatus` enum, linha 408):**
- `DRAFT`
- `SENT`
- `APPROVED`
- `REJECTED`
- `EXPIRED`

**Relacionamentos:**
- `company` → Company (Cascade)
- `customer` → Customer
- `items` → QuoteItem[]
- `serviceOrders` → ServiceOrder[] (OS vinculadas a este orçamento)

**Campos de token/envio/aprovação que já existem:**
- ✅ `publicToken` — já existe no schema, único, nullable
- ❌ `sentAt` — não existe
- ❌ `sentVia` — não existe
- ❌ `approvedAt` — não existe
- ❌ `rejectedAt` — não existe
- ❌ `approvalSource` — não existe
- ❌ `approvedByUserId` — não existe
- ❌ `approvedByName` — não existe
- ❌ `rejectionReason` — não existe

**Paralelo com ServiceOrder:** A OS tem `publicToken` (linha 566) que já é usado pelo portal público `/portal/os/[token]`. O padrão é idêntico ao que precisamos para o orçamento.

---

## 2. FLUXO ATUAL DO BOTÃO "ENVIAR"

**Arquivo:** `src/app/(dashboard)/orcamentos/[id]/OrcamentoDetailContent.tsx`

**Função chamada:** `handleStatusChange("SENT")` (linha 115)

**Endpoint usado:** `PUT /api/orcamentos/[id]` (linha 119)

**Como muda para SENT:**
- Envia `body: JSON.stringify({ status: "SENT" })`
- O backend (`src/app/api/orcamentos/[id]/route.ts`, linha 82-111) valida o status contra `["DRAFT", "SENT", "APPROVED", "REJECTED", "EXPIRED"]`
- Atualiza o campo `status` via `tenant.quote.update`
- Se status = `APPROVED`, envia email de aprovação (`sendBudgetApprovedEmail`) — fire-and-forget
- Cria ActivityLog com action `UPDATE`

**Validação de permissão:**
- ✅ Verifica sessão (`auth()`)
- ✅ Verifica módulo ativo (`checkModuleAccess(companyId, "quotes")`)
- ✅ Tenant guard via `tenantPrisma` (injeta `companyId`)

**ActivityLog:** ✅ Sim, registrado como `UPDATE` entity `quote`

**Envio parcial implementado:** ❌ Não. Apenas muda status. Nenhum envio real.

**Link WhatsApp:** ✅ Já existe. A função `getWhatsAppLink()` (linha 187) gera o link via `buildWhatsAppLink()` + `quoteWhatsAppMessage()`. É usado no botão "WhatsApp" do menu secundário. Mas **não é aberto automaticamente** ao clicar em "Enviar".

---

## 3. PORTAL PÚBLICO DA OS (REUTILIZÁVEL)

**Padrão de token:**
- Gerado no backend (provavelmente `crypto.randomBytes()`)
- Campo `publicToken String? @unique` no schema
- Buscado via `prisma.serviceOrder.findUnique({ where: { publicToken: token } })`

**Rota pública:**
- Página: `/portal/os/[token]` (SSR com `generateMetadata`)
- API: `/api/public/os/[token]` (JSON)
- PDF público: `/api/public/os/[token]/pdf`

**Validação do token:**
- Verifica `token.length < 10` → retorna 400
- Busca por `publicToken` → retorna 404 se não encontrar
- Não há verificação de expiração no portal da OS

**Estrutura visual:**
- `PortalOSContent.tsx` — componente client com cards animados
- `PortalOSError.tsx` — componente de erro
- Layout limpo com header da empresa, timeline, equipamentos, itens, pagamento, garantia, prazos, observações
- Botões: "Baixar PDF" e "Falar com a empresa" (WhatsApp)

**Endpoints públicos:**
- `GET /api/public/os/[token]` — retorna dados sanitizados
- `GET /api/public/os/[token]/pdf` — gera PDF público

**Sanitização:** `src/lib/portal.ts` — função `sanitizeServiceOrderForPortal()` que remove dados sensíveis (IDs internos, internalNotes, etc.)

**Rate limit:** Middleware global (`src/middleware.ts`) — 100 req/min por IP para todas as rotas `/api/`

**Segurança:**
- Middleware permite `/portal/*` e `/api/public/*` sem auth
- Dados sanitizados antes de retornar ao cliente
- `publicToken` é único e aleatório (não é ID interno)

**Tratamento de expiração:**  Não implementado no portal da OS

**Testes existentes:** `e2e/os-portal.spec.ts` — 4 testes (token inválido, token vazio, API pública, fluxo completo de criação + portal)

---

## 4. WHATSAPP

**`buildWhatsAppLink()` (`src/lib/whatsapp.ts:1`):**
```ts
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}
```

**`quoteWhatsAppMessage()` (`src/lib/whatsapp.ts:7`):**
```ts
export function quoteWhatsAppMessage(
  customerName: string,
  quoteNumber: number,
  total: number,
  companyName: string
): string {
  return `Olá ${customerName}! Segue orçamento #${quoteNumber} da ${companyName} no valor de R$${total.toFixed(2)}.`;
}
```

**Formato do telefone:** Remove todos os caracteres não-numéricos (`\D`). Não adiciona DDI automaticamente — depende do telefone estar salvo com DDI (ex: `5521968410983`).

**Tratamento de DDI/DDDs:**  Não normaliza. Se o telefone foi salvo sem DDI, o link `wa.me` pode falhar.

**Mensagem atual:** Simples, sem link de portal. Não inclui validade nem URL de aprovação.

**Onde o link é gerado:** `OrcamentoDetailContent.tsx:187-199` — função `getWhatsAppLink()`

**Por que não é aberto hoje:** O link só é usado no botão "WhatsApp" do menu secundário. O botão "Enviar" apenas muda o status via `handleStatusChange("SENT")` sem abrir nenhum link.

---

## 5. E-MAIL

**Configuração do Resend:**
- `RESEND_API_KEY` no `.env` → (chave real removida por segurança)
- `RESEND_FROM_EMAIL` → `noreply@avgestao.com.br`
- Instância lazy: `resend = new Resend(resendApiKey)` só se a key existir

**Padrão dos templates:** HTML inline com estilos, container 480px, header com gradiente, body com padding, footer. Todos seguem o mesmo padrão visual.

**Remetente:** `noreply@avgestao.com.br`

**Tratamento de erro:** Try/catch com `console.error` + retorno `{ success: false, error: "..." }`

**Funções existentes:**
- `sendTrialExpiringEmail()` — trial expirando
- `sendBudgetApprovedEmail()` — orçamento aprovado (já existe!)
- `sendOSCompletedEmail()` — OS concluída
- `sendPasswordResetEmail()` — reset de senha
- `sendCompanyInviteEmail()` — convite de empresa

**Envio no backend:** ✅ Sim, todas as funções são server-side

**Como evita marcar SENT quando Resend falha:** Atualmente **não evita**. O `sendBudgetApprovedEmail` é fire-and-forget (`.catch()` sem bloquear). Mas para o novo fluxo de envio de orçamento, será necessário mudar isso.

**Função `sendQuoteEmail()` necessária:** ❌ Não existe ainda. Precisa ser criada.

---

## 6. PDF

**Como é gerado:** `@react-pdf/renderer` → `renderToBuffer()` → `Uint8Array` → Response com `Content-Type: application/pdf`

**Endpoint atual:** `GET /api/pdf/orcamento/[id]` — **exige autenticação** (`auth()`)

**Pode ser reutilizado no portal público?** Não diretamente. O endpoint atual exige sessão autenticada. Será necessário criar uma rota pública protegida por token, similar a `/api/public/os/[token]/pdf`.

**Será necessário criar rota protegida por token?** ✅ Sim. Padrão: `/api/public/orcamentos/[token]/pdf`

---

## 7. MUDANÇAS DE SCHEMA

**Campos que JÁ EXISTEM:**
- ✅ `publicToken` (String? @unique) — linha 420 do schema

**Campos que precisam ser adicionados ao model `Quote`:**

```prisma
sentAt              DateTime?
sentVia             QuoteSendChannel?
approvedAt          DateTime?
rejectedAt          DateTime?
approvalSource      QuoteApprovalSource?
approvedByUserId    String?
approvedByName      String?
rejectionReason     String?
```

**Enums que precisam ser criados:**

```prisma
enum QuoteSendChannel {
  EMAIL
  WHATSAPP
  MANUAL
}

enum QuoteApprovalSource {
  ONLINE
  PHYSICAL
}
```

**Todos os campos novos são nullable** — nenhum quebra dados existentes.

**SQL aproximado da migration:**

```sql
-- Criar enums
CREATE TYPE "QuoteSendChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'MANUAL');
CREATE TYPE "QuoteApprovalSource" AS ENUM ('ONLINE', 'PHYSICAL');

-- Adicionar colunas
ALTER TABLE "quotes" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN "sentVia" "QuoteSendChannel";
ALTER TABLE "quotes" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN "approvalSource" "QuoteApprovalSource";
ALTER TABLE "quotes" ADD COLUMN "approvedByUserId" TEXT;
ALTER TABLE "quotes" ADD COLUMN "approvedByName" TEXT;
ALTER TABLE "quotes" ADD COLUMN "rejectionReason" TEXT;
```

**Riscos:**
- Mínimo. Todos os campos são nullable.
- Nenhum dado existente será alterado.
- O enum `QuoteSendChannel` e `QuoteApprovalSource` são novos, sem conflito.
- O campo `publicToken` já existe e é único — sem conflito.

---

## 8. ENDPOINTS PROPOSTOS

### Públicos (sem auth, protegidos por token):

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/public/orcamentos/[token]` | Dados do orçamento para o portal |
| GET | `/api/public/orcamentos/[token]/pdf` | PDF público |
| POST | `/api/public/orcamentos/[token]/approve` | Aprovar online |
| POST | `/api/public/orcamentos/[token]/reject` | Recusar online |

### Internos (com auth + tenant guard):

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/orcamentos/[id]/send` | Enviar (WhatsApp/Email/Manual) |
| POST | `/api/orcamentos/[id]/approve-physical` | Aprovar presencialmente |
| GET | `/api/orcamentos/[id]/public-link` | Gerar/obter link público |

---

## 9. ARQUIVOS QUE SERIAM CRIADOS

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/quote-send.ts` | Funções centrais: `sendQuote()`, `generateQuotePublicToken()` |
| `src/lib/quote-approve.ts` | Funções centrais: `approveQuote()`, `rejectQuote()` |
| `src/lib/quote-portal.ts` | Tipo `PortalQuote` + `sanitizeQuoteForPortal()` |
| `src/app/api/public/orcamentos/[token]/route.ts` | API pública de dados |
| `src/app/api/public/orcamentos/[token]/pdf/route.tsx` | PDF público |
| `src/app/api/public/orcamentos/[token]/approve/route.ts` | Aprovação online |
| `src/app/api/public/orcamentos/[token]/reject/route.ts` | Recusa online |
| `src/app/api/orcamentos/[id]/send/route.ts` | Envio (WhatsApp/Email/Manual) |
| `src/app/api/orcamentos/[id]/approve-physical/route.ts` | Aprovação presencial |
| `src/app/(portal)/portal/orcamento/[token]/page.tsx` | Página do portal |
| `src/app/(portal)/portal/orcamento/[token]/PortalQuoteContent.tsx` | Componente do portal |
| `src/app/(portal)/portal/orcamento/[token]/PortalQuoteError.tsx` | Erro do portal |
| `src/components/quote/send-dialog.tsx` | Modal de envio |
| `src/components/quote/approve-physical-dialog.tsx` | Modal de aprovação presencial |
| `src/components/pdf/public-quote-pdf.tsx` | PDF público do orçamento |
| `e2e/quote-portal.spec.ts` | Testes E2E do portal |
| `e2e/quote-send.spec.ts` | Testes E2E do envio |

---

## 10. ARQUIVOS QUE SERIAM ALTERADOS

| Arquivo | Alteração |
|---------|-----------|
| `prisma/schema.prisma` | Adicionar campos + enums ao model `Quote` |
| `src/lib/whatsapp.ts` | Melhorar `quoteWhatsAppMessage()` com link do portal |
| `src/lib/email.ts` | Adicionar `sendQuoteEmail()` |
| `src/lib/activity-log.ts` | Adicionar actions `SEND`, `APPROVE`, `REJECT` |
| `src/lib/validations.ts` | Adicionar schemas de envio e aprovação |
| `src/middleware.ts` | Adicionar `/portal/orcamento` e `/api/public/orcamentos` nas rotas públicas |
| `src/app/(dashboard)/orcamentos/[id]/OrcamentoDetailContent.tsx` | Substituir botão "Enviar" por modal; adicionar menu de aprovação presencial e copiar link |
| `src/app/api/orcamentos/[id]/route.ts` | Adicionar lógica de geração de token; refatorar PUT de status |
| `src/app/api/pdf/orcamento/[id]/route.tsx` | Manter para uso interno (não mudar) |

---

## 11. RISCOS

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Token vaza em logs | Baixa | Alto | Nunca logar `publicToken`; usar apenas em URLs |
| Cross-tenant no portal | Baixa | Crítico | Buscar por `publicToken` (único global), não por ID |
| Dupla aprovação | Média | Médio | Idempotência: verificar status antes de aprovar |
| Resend falha silenciosamente | Média | Médio | Não mudar status se Resend retornar erro |
| WhatsApp sem DDI | Alta | Baixo | Link `wa.me` pode falhar; informar usuário |
| Orçamento expirado aprovado | Baixa | Médio | Validar `validUntil` na aprovação online |
| Migration quebra produção | Baixa | Alto | Todos os campos nullable; deploy em horário de baixo tráfego |
| Token de orçamento dá acesso à OS | Nenhuma | — | Tokens são independentes; `publicToken` da OS é separado |

---

## 12. TESTES PROPOSTOS (20 testes)

1. Modal de envio abre ao clicar "Enviar"
2. WhatsApp desabilitado sem telefone do cliente
3. E-mail desabilitado sem e-mail do cliente
4. Link público é gerado no primeiro envio
5. Portal abre sem login
6. Token inválido retorna 404
7. Orçamento expirado não aprova online
8. Cliente aprova via portal
9. Cliente recusa via portal
10. Aprovação duplicada é idempotente (não quebra)
11. Aprovação presencial funciona
12. Cross-tenant bloqueado (token de empresa A não acessa empresa B)
13. E-mail só marca SENT após sucesso do Resend
14. Falha do Resend não muda status
15. WhatsApp gera URL e mensagem corretas (com link do portal)
16. Manual marca SENT com canal MANUAL
17. Reenvio é permitido (botão muda para "Reenviar")
18. PDF público exige token válido
19. Orçamento cancelado não pode ser enviado
20. Token não aparece em logs ou resposta indevida

---

## 13. ORDEM DE IMPLEMENTAÇÃO

**Fase 1 — Schema e infra (sem risco visual):**
1. Migration: adicionar campos + enums ao `Quote`
2. `src/lib/quote-send.ts` — funções centrais
3. `src/lib/quote-approve.ts` — funções centrais
4. `src/lib/quote-portal.ts` — sanitização
5. `src/lib/email.ts` — `sendQuoteEmail()`
6. `src/lib/whatsapp.ts` — melhorar mensagem

**Fase 2 — Endpoints internos:**
7. `POST /api/orcamentos/[id]/send`
8. `POST /api/orcamentos/[id]/approve-physical`
9. `GET /api/orcamentos/[id]/public-link`

**Fase 3 — Portal público:**
10. `GET /api/public/orcamentos/[token]`
11. `GET /api/public/orcamentos/[token]/pdf`
12. `POST /api/public/orcamentos/[token]/approve`
13. `POST /api/public/orcamentos/[token]/reject`
14. Página `/portal/orcamento/[token]`

**Fase 4 — Frontend:**
15. Modal de envio (`send-dialog.tsx`)
16. Modal de aprovação presencial
17. Atualizar `OrcamentoDetailContent.tsx`
18. Middleware — liberar rotas públicas

**Fase 5 — Testes:**
19. Testes E2E do portal
20. Testes E2E do envio

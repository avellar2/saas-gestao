# Etapa 3 — Portal do Cliente da OS

## Contexto

A Etapa 1 (base modular SaaS) e a Etapa 2 (OS Premium) foram concluídas. O model `ServiceOrder` já possui `publicToken`, `code`, campos de equipamento, status premium, prioridade, previsão de entrega, garantia, pagamento, observações internas e para o cliente. O campo `publicToken` é gerado automaticamente via `crypto.randomUUID()` na criação, mas **nunca é consumido** por nenhuma rota pública — não existe portal de cliente ainda.

O objetivo desta etapa é criar o Portal do Cliente: uma rota pública onde o cliente acompanha o andamento da OS sem login, visualizando apenas dados seguros.

---

## Arquivos que serão criados

| # | Arquivo | Propósito |
|---|---------|-----------|
| 1 | `src/lib/portal.ts` | Função de sanitização de dados + tipo `PortalServiceOrder` + constantes do timeline |
| 2 | `src/app/(portal)/layout.tsx` | Layout do portal (sem sidebar, sem auth, fundo com mesh-gradient) |
| 3 | `src/app/(portal)/portal/os/[token]/page.tsx` | Server component: busca OS por publicToken, sanitiza, repassa para client |
| 4 | `src/app/(portal)/portal/os/[token]/PortalOSContent.tsx` | Client component: UI principal do portal com todas as seções |
| 5 | `src/app/(portal)/portal/os/[token]/PortalOSError.tsx` | Client component: estados de erro (não encontrada, token inválido) |
| 6 | `src/components/portal/os-status-timeline.tsx` | Componente de timeline visual do andamento da OS |
| 7 | `src/app/api/public/os/[token]/route.ts` | API pública GET: retorna dados sanitizados da OS por publicToken |
| 8 | `src/app/api/public/os/[token]/pdf/route.tsx` | API pública GET: gera PDF da OS por publicToken (sem auth) |

## Arquivos que serão modificados

| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `src/middleware.ts` | Adicionar `/portal` e `/api/public` nas rotas públicas |
| 2 | `src/lib/whatsapp.ts` | Adicionar função `portalWhatsAppMessage()` |

---

## Estratégia de Middleware / Rota Pública

O middleware atual (`src/middleware.ts`, linhas 67-76) define rotas públicas com um bloco `if` com `pathname.startsWith()`. A mudança é simples:

```typescript
// Antes
if (
  pathname.startsWith("/login") ||
  pathname.startsWith("/forgot-password") ||
  pathname.startsWith("/reset-password") ||
  pathname.startsWith("/api/auth") ||
  pathname.startsWith("/_next") ||
  pathname.startsWith("/favicon")
)

// Depois
if (
  pathname.startsWith("/login") ||
  pathname.startsWith("/forgot-password") ||
  pathname.startsWith("/reset-password") ||
  pathname.startsWith("/portal") ||           // ← NOVO
  pathname.startsWith("/api/public") ||        // ← NOVO
  pathname.startsWith("/api/auth") ||
  pathname.startsWith("/_next") ||
  pathname.startsWith("/favicon")
)
```

**Por que isso é seguro:**
- `/portal` só acessa via `publicToken` (UUID v4, 122 bits de entropia — inviável de forçar bruto)
- `/api/public` só retorna dados sanitizados, sem IDs internos
- Rate limiter existente (100 req/min por IP) cobre `/api/public`
- Sem `companyId` via query — a empresa é resolvida pela relação da OS
- Usa `prisma` base (não `tenantPrisma`) pois não há sessão autenticada

**Bug adicional corrigido:** Adicionar `/api/stripe/webhook` e `/api/cron` nas rotas públicas, pois hoje o middleware bloqueia webhooks do Stripe e crons que usam autenticação própria. Isso não é parte da Etapa 3, mas é recomendado.

---

## Campos exibidos no Portal

| Campo | Origem | Observação |
|-------|--------|------------|
| Nome da empresa | `company.tradeName \|\| company.name` | Fantasia ou razão social |
| Telefone da empresa | `company.phone` | Para botão WhatsApp |
| WhatsApp da empresa | `company.whatsapp` | Preferencial para botão WhatsApp |
| Email da empresa | `company.email` | Info de contato |
| Código da OS | `code \|\| generateOSCode(number)` | Ex: "OS-0001" |
| Nome do cliente | `customer.name` | Apenas o nome |
| Nome do equipamento | `equipmentName` | |
| Marca | `equipmentBrand` | |
| Modelo | `equipmentModel` | |
| Número de série | `serialNumber` | |
| Acessórios | `accessories` | |
| Status atual | `status` | Com badge colorido |
| Prioridade | `priority` | Apenas se não for NORMAL |
| Problema informado | `problemDescription` | |
| Serviço realizado | `serviceDescription` | Se existir |
| Observações para o cliente | `customerNotes` | Se existir |
| Data de entrada | `receivedAt \|\| openedAt` | |
| Data prevista de entrega | `expectedDeliveryDate` | |
| Data de conclusão | `completedAt` | Se existir |
| Garantia ativa/vencida | `getWarrantyStatus()` | Badge + datas |
| Início da garantia | `warrantyStartDate` | Se warrantyEnabled |
| Fim da garantia | `warrantyEndDate` | Se warrantyEnabled |
| Termos da garantia | `warrantyTerms` | Se warrantyEnabled |
| Valor total | `total` | |
| Valor final | `finalAmount` | Se diferente de total |
| Status de pagamento | `paymentStatus` | Apenas label + badge |
| Itens | `items[]` | description, qty, unitPrice, total |

---

## Campos ocultos (NUNCA expor)

| Campo | Motivo |
|-------|--------|
| `id` | Identificador interno |
| `companyId` | Escopo de tenant |
| `customerId` | Referência interna |
| `quoteId` | Referência interna |
| `technicianId` | Referência interna |
| `number` (raw) | Sequencial interno, usar `code` para exibição |
| `internalNotes` | Notas internas explícitas |
| `paidAmount` | Detalhe de pagamento interno |
| `paymentMethod` | Detalhe interno |
| `notes` | Notas gerais internas |
| `publicToken` | Usado apenas para lookup, não exibido |
| `createdAt` / `updatedAt` | Timestamps internos |
| `finishedAt` | Interno, usar `completedAt` |
| `quote` (relation) | Referência interna |
| `technician` (relation) | Referência interna |
| Dados de outras OS | Escopo isolado por publicToken |
| `company.document`, `company.stripeCustomerId`, `company.status`, `company.trialStartsAt`, `company.trialEndsAt`, `company.monthlyPrice` | Dados administrativos/sensíveis da empresa |

---

## Componente Timeline do Andamento

**Arquivo:** `src/components/portal/os-status-timeline.tsx`

A timeline é o elemento visual assinatura do portal. Mostra o ciclo de vida da OS como progresso visual.

**Ordem dos status no timeline:**
```
RECEIVED → DIAGNOSIS → WAITING_APPROVAL → WAITING_PARTS → IN_PROGRESS → READY → DELIVERED → COMPLETED
```

**Tratamento especial:**
- `CANCELLED`: Mostra badge vermelha separada, não timeline de progresso
- Status atingidos: círculo preenchido verde-esmeralda com ícone de check
- Status atual: círculo com anel pulsante em esmeralda (animação `animate-pulse`)
- Status futuros: círculo vazio cinza com label mudo
- Linhas conectoras animadas com framer-motion (stagger)

**Layout responsivo:**
- Desktop: timeline horizontal
- Mobile: timeline vertical

**Props:**
```typescript
interface OsStatusTimelineProps {
  currentStatus: ServiceOrderStatus;
}
```

O componente importa `SERVICE_ORDER_STATUS` de `src/lib/os-status.ts` e filtra `CANCELLED` da lista de progresso.

---

## Rota Pública de PDF

**Arquivo:** `src/app/api/public/os/[token]/pdf/route.tsx`

**Estratégia:** Reutiliza o componente `ServiceOrderPDF` existente em `src/components/pdf/service-order-pdf.tsx`, mas com dados sanitizados:

1. Busca OS por `publicToken` (não por `id`)
2. Usa `prisma` base (não `tenantPrisma`) — sem sessão
3. Strip de campos internos antes de passar ao PDF:
   - `internalNotes` → `null`
   - `notes` → `null`
   - `technicianName` → `null`
   - Não inclui relação `quote`
4. `Content-Disposition: attachment` (download, não inline)
5. Retorna 404 para token inválido
6. Sem checar trial/watermark (opcionalmente pode incluir)

**Diferenças do PDF autenticado existente (`/api/pdf/os/[id]`):**
| Aspecto | PDF Autenticado | PDF Público |
|---------|----------------|-------------|
| Auth | Requer sessão | Nenhum |
| Lookup | Por `id` interno | Por `publicToken` |
| Prisma | `tenantPrisma(companyId)` | `prisma` base |
| Campos | Todos | Sanitizados |
| Header | `inline` | `attachment` |

---

## Estrutura visual do Portal

```
┌──────────────────────────────────────────────────────┐
│  [Logo/Ícone]  Nome da Empresa                        │
│                phone | email                            │
├──────────────────────────────────────────────────────┤
│  OS-0001                    [STATUS BADGE]             │
│  [PRIORITY BADGE — se não NORMAL]                      │
├──────────────────────────────────────────────────────┤
│  ┌──── TIMELINE ────────────────────────────────┐      │
│  │  ●──●──●──○──○──○──○──○                    │      │
│  │  Recebida  Em Diag...                       │      │
│  └──────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────┤
│  ▸ Equipamento              (border-l-primary)         │
│    Notebook Dell Latitude 5520                         │
│    Marca: Dell  Modelo: Latitude 5520                   │
│    N/S: ABC123                                         │
├──────────────────────────────────────────────────────┤
│  ▸ Descrição                                          │
│    Problema: notebook não liga...                       │
│    Serviço realizado: troca da placa...                  │
├──────────────────────────────────────────────────────┤
│  ▸ Itens                    (se existir)               │
│    Desc         Qtd   Unit   Total                     │
│    Placa mãe     1   350,00  350,00                    │
│    ─────────────────────────────────                   │
│    Total: R$ 350,00                                     │
├──────────────────────────────────────────────────────┤
│  ▸ Pagamento                                          │
│    [PAGO]   Valor: R$ 350,00                           │
├──────────────────────────────────────────────────────┤
│  ▸ Garantia                 (se warrantyEnabled)       │
│    [Garantia Ativa]  Validade: até 15/01/2027          │
│    Termos: Garantia de 90 dias...                       │
├──────────────────────────────────────────────────────┤
│  ▸ Prazos                                             │
│    Entrada: 01/06/2026                                  │
│    Previsão: 10/06/2026                                 │
│    Conclusão: 08/06/2026                                │
├──────────────────────────────────────────────────────┤
│  ▸ Observações             (se customerNotes existir)  │
│    Seu equipamento está pronto para retirada...         │
├──────────────────────────────────────────────────────┤
│  [⬇ Baixar PDF]     [💬 Falar com a empresa]          │
├──────────────────────────────────────────────────────┤
│  Powered by Gestor Local                              │
└──────────────────────────────────────────────────────┘
```

**Estado de OS cancelada:** Banner vermelho no topo "Esta ordem de serviço foi cancelada", timeline substituída por badge vermelha, cards com `opacity-70`.

**Estado de token inválido/não encontrado:** Componente `PortalOSError` com ícone animado, mensagem clara, sem informação sobre formato de token.

---

## Detalhes de implementação por arquivo

### `src/lib/portal.ts`
- Tipo `PortalServiceOrder` com apenas campos seguros
- Função `sanitizeServiceOrderForPortal(fullData)` que mapeia dados do Prisma para o tipo sanitizado
- Constante `PORTAL_STATUS_ORDER` com a ordem dos status no timeline
- Reexporta helpers relevantes de `os-status.ts`

### `src/app/(portal)/layout.tsx`
- Layout sem sidebar, sem auth, com fundo `mesh-gradient grain`
- Container `max-w-3xl mx-auto`
- Footer minimalista "Powered by Gestor Local"

### `src/app/(portal)/portal/os/[token]/page.tsx`
- Server component com `revalidate = 60` (ISR)
- Busca via `prisma.serviceOrder.findUnique({ where: { publicToken: token } })` com includes
- Se não encontrar: `<PortalOSError type="not_found" />`
- Se encontrar: sanitiza e repassa para `<PortalOSContent data={safeData} />`
- `generateMetadata` para título dinâmico: `OS-0001 - Nome da Empresa`

### `src/app/(portal)/portal/os/[token]/PortalOSContent.tsx`
- Client component com `framer-motion` para animações stagger
- Cards com `border-l-4 border-l-primary` para destaque visual
- Seções condicionais (só renderiza se dados existirem)
- Usa `formatCurrency` e `formatDate` de `src/lib/utils.ts`
- Usa helpers de `src/lib/os-status.ts` para badges
- Botão PDF: `<a href="/api/public/os/[token]/pdf">`
- Botão WhatsApp: `<a href={buildWhatsAppLink(...)}` com `portalWhatsAppMessage`

### `src/app/(portal)/portal/os/[token]/PortalOSError.tsx`
- Animação com `framer-motion` (similar ao `not-found.tsx`)
- Ícone `FileSearch` para não encontrada, `AlertTriangle` para inválido
- Mensagem clara sem vazar informação

### `src/components/portal/os-status-timeline.tsx`
- Componente reutilizável
- Desktop: timeline horizontal com dots e linhas
- Mobile: timeline vertical
- Usa `framer-motion` para animações de entrada
- Badge especial para CANCELLED (não renderiza timeline normal)

### `src/app/api/public/os/[token]/route.ts`
- GET: busca por publicToken, retorna JSON sanitizado
- Validação mínima de token (length > 10)
- Usa `sanitizeServiceOrderForPortal`
- Cache headers: `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`

### `src/app/api/public/os/[token]/pdf/route.tsx`
- GET: gera PDF por publicToken
- Reutiliza `ServiceOrderPDF` com dados sanitizados (internalNotes=null, notes=null, technicianName=null)
- `Content-Disposition: attachment; filename="os-XXXX.pdf"`
- Retorna 404 para token inválido

### `src/lib/whatsapp.ts` (modificação)
- Adicionar `portalWhatsAppMessage(customerName, osCode, companyName)`:
  ```
  "Olá! Sou [customerName], estou acompanhando a OS [osCode] pelo portal e gostaria de mais informações."
  ```

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Brute-force de publicToken | Token é UUID v4 (122 bits), rate limiter de 100 req/min por IP — inviável de adivinhar |
| Vazar dados de outra empresa | Query por publicToken (globalmente único), sem companyId no request |
| Expor campos internos | Função `sanitizeServiceOrderForPortal` com tipo `PortalServiceOrder` garante que apenas campos seguros saem |
| Middleware bloquear `/portal` | Adição explícita no middleware, testável manualmente |
| PDF com dados internos | Strip explícito de `internalNotes`, `notes`, `technicianName` no PDF público |
| ISR stale data | `revalidate = 60` segundos; chamar `revalidatePath` no handler de PUT da OS se necessário |
| OS cancelada visível | Mostrar com banner vermelho e opacity reduzida — o cliente merece saber |

---

## Ordem de implementação

### Fase 1: Fundação (Middleware + Camada de Dados)
1. Modificar `src/middleware.ts` — adicionar `/portal` e `/api/public`
2. Criar `src/lib/portal.ts` — tipo `PortalServiceOrder` + função de sanitização
3. Adicionar `portalWhatsAppMessage` em `src/lib/whatsapp.ts`

### Fase 2: Rotas de API
4. Criar `src/app/api/public/os/[token]/route.ts` — GET público
5. Criar `src/app/api/public/os/[token]/pdf/route.tsx` — PDF público

### Fase 3: Componentes de UI
6. Criar `src/components/portal/os-status-timeline.tsx` — timeline
7. Criar `src/app/(portal)/layout.tsx` — layout do portal
8. Criar `src/app/(portal)/portal/os/[token]/PortalOSError.tsx` — estados de erro
9. Criar `src/app/(portal)/portal/os/[token]/PortalOSContent.tsx` — UI principal
10. Criar `src/app/(portal)/portal/os/[token]/page.tsx` — server component

### Fase 4: Validação
11. Rodar `npx next build` — verificar build sem erros
12. Rodar `npx tsc --noEmit` — verificar tipos sem erros
13. Testar manualmente cenários: OS válida, token inválido, OS cancelada, PDF download, WhatsApp

---

## Como testar

1. **Middleware:** Acessar `/portal/os/qualquer-token` sem login → deve carregar a página (não redirecionar para `/login`)
2. **Token válido:** Criar uma OS no dashboard, copiar o `publicToken` do banco, acessar `/portal/os/{token}` → ver portal completo
3. **Token inválido:** Acessar `/portal/os/token-falso` → ver estado de "não encontrada"
4. **OS cancelada:** Cancelar uma OS, acessar portal → ver banner vermelho
5. **API pública:** `GET /api/public/os/{token}` → retornar JSON sanitizado sem campos internos
6. **PDF público:** `GET /api/public/os/{token}/pdf` → download do PDF sem notas internas
7. **WhatsApp:** Clica no botão → abre wa.me com mensagem pré-preenchida
8. **Responsivo:** Testar em mobile (375px) e desktop (1440px)
9. **Dark mode:** Alternar tema e verificar cores
10. **Build:** `npx next build` sem erros
11. **TypeCheck:** `npx tsc --noEmit` sem erros

---

## O que NÃO implementar nesta etapa

- Aprovação pelo cliente
- Pagamento online
- Assinatura digital
- Integração com Financeiro
- Integração com Estoque
- WhatsApp automático real
- Notificações push para o cliente
- Compartilhamento de OS via link (já é inerente ao publicToken)
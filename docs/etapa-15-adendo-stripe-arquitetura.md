# Etapa 15 — Adendo: Correção da Arquitetura Stripe

> Data: 2026-06-19
> Correções obrigatórias ao plano original.
> Status: **Aguardando aprovação. Não implementar.**

---

## 1. Fórmula Exata de `calculateMonthlyPrice()`

Código-fonte verificado em `src/lib/pricing.ts`:

```
BASE_PRICE = 49
EXTRA_MODULE_PRICES = [30, 25, 20]  // 2º, 3º, 4º módulo extra
ADDITIONAL_MODULE_PRICE = 20         // 5º módulo extra em diante
```

```ts
function calculateMonthlyPrice(activeModuleKeys: string[]): number {
  // 1. Filtrar: remove core (customers) e legacy (catalog)
  const purchasable = activeModuleKeys.filter(
    (k) => !isCoreModule(k) && getModuleConfig(k)?.status !== "legacy"
  );

  if (purchasable.length === 0) return BASE_PRICE;

  // 2. Ordenar por preço descendente (o mais caro entra no base)
  const sortedPrices = purchasable
    .map((k) => getModuleConfig(k)?.monthlyPrice ?? 20)
    .sort((a, b) => b - a);

  // 3. Primeiro módulo incluso no base (R$49)
  let total = BASE_PRICE;
  for (let i = 1; i < sortedPrices.length; i++) {
    const priceIndex = i - 1;
    if (priceIndex < EXTRA_MODULE_PRICES.length) {
      total += EXTRA_MODULE_PRICES[priceIndex];
    } else {
      total += ADDITIONAL_MODULE_PRICE;
    }
  }
  return total;
}
```

### Verificação da regra comercial

A regra desejada é:

> R$49 inclui o núcleo e 1 módulo não-core escolhido.
> Módulos adicionais são cobrados conforme seus preços.
> Módulo core não é cobrado separadamente.
> Módulo legacy não pode ser comprado.
> Módulo coming_soon não pode ser comprado.

**Conclusão:** A fórmula **NÃO** cobre módulos adicionais pelo preço individual de cada módulo. Ela aplica uma tabela fixa de preços extras (R$30, R$25, R$20, R$20, R$20, ...) independentemente de qual módulo é adicionado. O `monthlyPrice` de cada módulo em `modules.ts` serve APENAS para ordenação (o mais caro entra no base).

Isso cria uma divergência entre:
- O preço exibido no card do módulo (`monthlyPrice`: R$20 a R$35)
- O preço real cobrado no extra (R$30 para o 2º, R$25 para o 3º, R$20 para o 4º+)

**Dois caminhos possíveis:**

### Caminho A — Preço por slot (atual)

Manter a fórmula atual. O preço de cada módulo no card serve apenas para ordenação. O preço real do extra é determinado pelo slot:

| Slot | Preço |
|---|---|
| Base (1º módulo não-core) | R$49 (incluído) |
| 2º módulo | +R$30 |
| 3º módulo | +R$25 |
| 4º módulo | +R$20 |
| 5º+ módulo | +R$20 cada |

No Stripe: cada slot vira um Price separado (ex: `price_slot_2`, `price_slot_3`), e o módulo ocupa o slot disponível.

**Vantagem:** simples, previsível.
**Desvantagem:** o usuário vê "Orçamentos R$30/mês" no card, mas se já tiver 1 módulo, paga R$30 pelo 2º, não importa qual escolha.

### Caminho A — No Stripe

| Item | Price ID | Descrição |
|---|---|---|
| Base | `STRIPE_BASE_PRICE_ID` | R$49/mês (núcleo + 1 módulo incluso) |
| Módulo extra (slot) | Um Price genérico por valor | R$30, R$25, R$20 — sem vínculo ao módulo específico |

Quando o usuário adiciona um módulo, cria-se um `subscription_item` com o Price correspondente ao próximo slot disponível. O `metadata` do item carrega o `moduleKey`.

### Caminho B — Preço por módulo (cada módulo = seu Price)

Cada módulo tem seu próprio Price no Stripe, e o valor cobrado é o `monthlyPrice` do módulo. O base continua R$49, e o primeiro módulo não-core está incluso — mas a partir do 2º, cada módulo custa o que diz no card.

| Módulo | Preço no card | Preço real |
|---|---|---|
| Clientes (core) | R$0 | Grátis |
| Orçamentos | R$30 | R$30 (se for o incluso: R$0 extra) |
| OS Premium | R$35 | R$35 (se for o incluso: R$0 extra) |
| Agendamento | R$20 | R$20 |
| Financeiro | R$20 | R$20 |
| Estoque | R$20 | R$20 |
| Cardápio Digital | R$35 | R$35 |
| Relatórios | R$20 | R$20 |
| Usuários e Permissões | R$20 | R$20 |

**Vantagem:** o que o usuário vê é o que ele paga. Transparente.
**Desvantagem:** mais complexo no Stripe (8 Price IDs em vez de 3).

### Caminho B — No Stripe

| Item | Price ID | Descrição |
|---|---|---|
| Base | `STRIPE_BASE_PRICE_ID` | R$49/mês (núcleo + 1 módulo incluso) |
| Orçamentos | `STRIPE_MODULE_QUOTES_PRICE_ID` | R$30/mês |
| OS Premium | `STRIPE_MODULE_SERVICE_ORDERS_PRICE_ID` | R$35/mês |
| Agendamento | `STRIPE_MODULE_SCHEDULING_PRICE_ID` | R$20/mês |
| Financeiro | `STRIPE_MODULE_FINANCE_PRICE_ID` | R$20/mês |
| Estoque | `STRIPE_MODULE_INVENTORY_PRICE_ID` | R$20/mês |
| Cardápio Digital | `STRIPE_MODULE_MENU_PRICE_ID` | R$35/mês |
| Relatórios | `STRIPE_MODULE_REPORTS_PRICE_ID` | R$20/mês |
| Usuários | `STRIPE_MODULE_USERS_PERMISSIONS_PRICE_ID` | R$20/mês |

O módulo incluso no base não gera subscription_item separado — está coberto pelo base. Os demais geram um subscription_item com o Price do módulo específico.

### Recomendação: Caminho B

O Caminho B é mais transparente para o usuário e mais fácil de reconciliar: cada `subscription_item` tem um `price.id` que mapeia diretamente para um `moduleKey`. A fórmula `calculateMonthlyPrice()` passaria a somar os preços reais dos módulos ativos (exceto o incluso), e não os valores de slot.

**Isso exige ajustar `calculateMonthlyPrice()` para:**

```ts
function calculateMonthlyPrice(activeModuleKeys: string[], includedModuleKey?: string): number {
  const purchasable = activeModuleKeys.filter(
    (k) => !isCoreModule(k) && getModuleConfig(k)?.status !== "legacy"
  );

  if (purchasable.length === 0) return BASE_PRICE;

  // O primeiro módulo (ou o incluído) está no base
  const included = includedModuleKey || purchasable[0];
  const extras = purchasable.filter((k) => k !== included);

  let total = BASE_PRICE;
  for (const key of extras) {
    total += getModuleConfig(key)?.monthlyPrice ?? 20;
  }
  return total;
}
```

Com essa mudança, o preço mensal = R$49 (base com 1 incluso) + soma dos `monthlyPrice` dos módulos extras.

### Decisão pendente

Qual caminho seguir? **Caminho B** (preço por módulo) é o recomendado, mas requer aprovação antes de prosseguir.

---

## 2. Modelo Final de Cobrança

### Estrutura

```
Assinatura Stripe = 1 Subscription por empresa
  ├── Subscription Item 1: Base (R$49/mês) — sempre presente
  │     Price: STRIPE_BASE_PRICE_ID
  │     metadata: { type: "base" }
  │
  ├── Subscription Item 2: Módulo incluso no base (R$0 extra)
  │     Price: STRIPE_MODULE_{KEY}_PRICE_ID
  │     metadata: { type: "included", moduleKey: "quotes" }
  │     quantity: 1 (não cobra, coberto pelo base — ver tratamento abaixo)
  │
  ├── Subscription Item 3: Módulo adicional 1 (preço do módulo)
  │     Price: STRIPE_MODULE_{KEY}_PRICE_ID
  │     metadata: { type: "extra", moduleKey: "finance" }
  │
  └── ... (mais módulos conforme adicionados)
```

### Tratamento do módulo incluso

O módulo incluso no base (R$49) precisa ser representado no Stripe. Existem duas abordagens:

**Abordagem recomendada:** O módulo incluso NÃO gera subscription_item separado. Ele está coberto pelo Price do base. O `includedModuleKey` é registrado apenas no banco (`Subscription.includedModuleKey`). No webhook de reconciliação, o sistema sabe que aquele módulo está ativo porque está no base, não porque tem um item no Stripe.

Isso simplifica a lógica: só existem subscription_items para módulos ADICIONAIS (além do incluso). O base cobre núcleo + 1 módulo à escolha.

### Price IDs necessários

```env
# Base (núcleo + 1 módulo incluso)
STRIPE_BASE_PRICE_ID=price_xxx

# Módulos adicionais (cada um com seu Price)
STRIPE_MODULE_QUOTES_PRICE_ID=price_xxx            # R$30
STRIPE_MODULE_SERVICE_ORDERS_PRICE_ID=price_xxx    # R$35
STRIPE_MODULE_SCHEDULING_PRICE_ID=price_xxx        # R$20
STRIPE_MODULE_FINANCE_PRICE_ID=price_xxx           # R$20
STRIPE_MODULE_INVENTORY_PRICE_ID=price_xxx         # R$20
STRIPE_MODULE_MENU_PRICE_ID=price_xxx              # R$35
STRIPE_MODULE_REPORTS_PRICE_ID=price_xxx           # R$20
STRIPE_MODULE_USERS_PERMISSIONS_PRICE_ID=price_xxx # R$20
```

**Remover:**
```env
STRIPE_BASIC_PRICE_ID  # legado
STRIPE_PRO_PRICE_ID    # legado
```

### Mapeamento moduleKey → Price ID

Criar função em `stripe.ts`:

```ts
const MODULE_PRICE_MAP: Record<string, string> = {
  quotes: process.env.STRIPE_MODULE_QUOTES_PRICE_ID || "",
  service_orders: process.env.STRIPE_MODULE_SERVICE_ORDERS_PRICE_ID || "",
  scheduling: process.env.STRIPE_MODULE_SCHEDULING_PRICE_ID || "",
  finance: process.env.STRIPE_MODULE_FINANCE_PRICE_ID || "",
  inventory: process.env.STRIPE_MODULE_INVENTORY_PRICE_ID || "",
  menu: process.env.STRIPE_MODULE_MENU_PRICE_ID || "",
  reports: process.env.STRIPE_MODULE_REPORTS_PRICE_ID || "",
  users_permissions: process.env.STRIPE_MODULE_USERS_PERMISSIONS_PRICE_ID || "",
};

function getModulePriceId(moduleKey: string): string | null {
  return MODULE_PRICE_MAP[moduleKey] || null;
}
```

---

## 3. Campos Exatos da Migration

### `prisma/schema.prisma` — adições

```prisma
model CompanyModule {
  id                       String    @id @default(cuid())
  companyId                String
  moduleKey                String
  active                   Boolean   @default(false)
  price                    Decimal?  @db.Decimal(10, 2)
  activatedAt              DateTime?
  deactivatedAt            DateTime?
  stripeSubscriptionItemId String?   // NOVO: vincula ao subscription_item no Stripe
                                      // Apenas para módulos extras cobrados como items.
                                      // O módulo incluso no base NÃO tem subscription_item.
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  module  Module  @relation(fields: [moduleKey], references: [key])

  @@unique([companyId, moduleKey])
  @@index([companyId])
  @@index([moduleKey])
  @@map("company_modules")
}

model Subscription {
  id                    String             @id @default(cuid())
  companyId             String             @unique
  status                SubscriptionStatus @default(TRIAL)
  planName              String?
  basePrice             Decimal            @db.Decimal(10, 2) @default(49.00)
  includedModuleKey     String?            // NOVO: qual módulo está incluso no base
  modulesCount          Int                @default(0)
  monthlyPrice          Decimal            @db.Decimal(10, 2) @default(49.00)
  trialEndsAt           DateTime?
  currentPeriodStartsAt DateTime?
  currentPeriodEndsAt   DateTime?
  stripeSubscriptionId  String?            @unique
  stripePriceId         String?            // Mantido: Price ID do item base
  paymentMethod         String?
  notes                 String?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}
```

### Avaliação: `stripeStatus` é necessário?

**Não.** O enum `SubscriptionStatus` existente (`TRIAL`, `ACTIVE`, `SUSPENDED`, `CANCELLED`) já cobre os estados necessários. A sincronização com o Stripe é feita pela função de reconciliação, que mapeia:

| Stripe `subscription.status` | AVGESTÃO `SubscriptionStatus` |
|---|---|
| `active` | `ACTIVE` |
| `trialing` | `TRIAL` |
| `past_due` | `SUSPENDED` |
| `paused` | `SUSPENDED` |
| `canceled` | `CANCELLED` |
| `unpaid` | `SUSPENDED` |

O `stripeStatus` seria redundante. A função de reconciliação pode registrar o status bruto do Stripe em `notes` se precisar de auditoria, mas não precisa de coluna dedicada.

### Campos legados a manter

- `Subscription.planName` — manter por enquanto, migrar para nome dinâmico via `getPlanName()`
- `Company.planName` — manter por compatibilidade, mas pode ser removido em migração futura
- `Company.monthlyPrice` — manter, recalculado via `calculateMonthlyPrice()`

### Resumo da migration

| Modelo | Campo | Tipo | Ação |
|---|---|---|---|
| `CompanyModule` | `stripeSubscriptionItemId` | `String?` | **Adicionar** |
| `Subscription` | `includedModuleKey` | `String?` | **Adicionar** |
| `Subscription` | `stripeStatus` | — | **Não adicionar** (enum existente é suficiente) |

⚠️ **Não criar migration sem aprovação.**

---

## 4. Eventos Stripe Realmente Utilizados

### Eventos que DEVEM ser tratados

| Evento Stripe | Quando dispara | O que fazer |
|---|---|---|
| `checkout.session.completed` | Após checkout bem-sucedido | Criar/atualizar customer, subscription e ativar módulo incluso. Confirmar pagamento. |
| `customer.subscription.created` | Subscription criada (pode vir junto com checkout) | Reconciliar. Criar registro se não existir. |
| `customer.subscription.updated` | Mudança de status, período, items | Reconciliar todos os subscription items com CompanyModules. |
| `customer.subscription.deleted` | Cancelamento da subscription | Desativar todos os módulos não-core. Marcar empresa como CANCELLED. |
| `invoice.paid` | Pagamento de fatura confirmado | Confirmar que módulos estão ativos. Marcar período como pago. |
| `invoice.payment_failed` | Falha no pagamento | Logar aviso. Não suspender imediatamente — aguardar retry do Stripe. |
| `invoice.payment_action_required` | SCA (Strong Customer Authentication) | Notificar empresa que ação é necessária. Não desativar módulos. |

### Eventos que NÃO existem e NÃO serão utilizados

- ❌ `customer.subscription_item.created` — não existe no Stripe
- ❌ `customer.subscription_item.updated` — não existe no Stripe
- ❌ `customer.subscription_item.deleted` — não existe no Stripe

### Como sincronizar módulos sem eventos de item

A sincronização é feita pelo evento `customer.subscription.updated`, que contém a lista completa de `items.data`. A função de reconciliação (`syncStripeSubscription`) compara os items do Stripe com os `CompanyModule` do banco e ativa/desativa conforme necessário.

Também no `invoice.paid`: confirma que os módulos correspondentes aos items pagos estão ativos.

---

## 5. Fluxo do Primeiro Checkout

### Cenário

Empresa trial escolhe o primeiro módulo não-core (ex: "Orçamentos").

### Passo a passo

```
1. Usuário acessa /upgrade
2. Clica "Assinar Orçamentos"
3. Frontend POST /api/stripe/checkout
   Body: { includedModuleKey: "quotes" }

4. Backend (checkout):
   a. Valida usuário autenticado e ADMIN
   b. Valida empresa
   c. Valida que includedModuleKey é comprável (isPurchasable)
   d. Verifica se empresa já tem subscription ativa no Stripe
      - Se SIM: erro — usar endpoint de add para módulos adicionais
      - Se NÃO: continuar
   e. Cria ou recupera Stripe Customer para a empresa
   f. Cria Checkout Session:
      mode: "subscription"
      line_items: [
        { price: STRIPE_BASE_PRICE_ID, quantity: 1 }
      ]
      metadata: {
        companyId: "...",
        includedModuleKey: "quotes",
        type: "first_checkout"
      }
      subscription_data: {
        metadata: {
          companyId: "...",
          includedModuleKey: "quotes"
        }
      }
   g. Retorna { url: checkout.url }

5. Usuário completa pagamento no Stripe

6. Webhook: checkout.session.completed
   a. Extrai companyId e includedModuleKey dos metadata
   b. Recupera subscription do Stripe com items expandidos
   c. Chama syncStripeSubscription(companyId, subscription)
   d. A função de reconciliação:
      - Cria/atualiza Subscription no banco
      - Seta includedModuleKey
      - Seta status ACTIVE
      - Ativa CompanyModule correspondente ao includedModuleKey
      - Ativa CompanyModule de core (customers) se não estiver
      - Salva stripeCustomerId na Company
      - Salva stripeSubscriptionId e stripePriceId na Subscription
```

### Nota sobre o módulo incluso

O módulo incluso no base (ex: "Orçamentos") **não gera subscription_item separado no Stripe**. Ele está coberto pelo Price base (R$49). O registro de qual módulo está incluso fica apenas no banco (`Subscription.includedModuleKey`).

Isso significa que o `invoice.paid` e a reconciliação precisam considerar:
- Itens do Stripe → módulos extras
- `includedModuleKey` → módulo incluso no base
- Core → sempre ativo

---

## 6. Fluxo de Módulo Adicional

### Endpoint: `POST /api/stripe/modules/add`

```
1. Autentica usuário (ADMIN da empresa)
2. Valida body: { moduleKey: string }
3. Valida que moduleKey é comprável (isPurchasable)
4. Valida que módulo NÃO está ativo (CompanyModule.active !== true)
5. Recupera empresa e subscription
6. Verifica que empresa tem stripeSubscriptionId (já é pagante)
7. Recupera subscription do Stripe
8. Verifica que não existe subscription_item com o mesmo price
9. Cria subscription_item:
   stripe.subscriptionItems.create({
     subscription: stripeSubscriptionId,
     price: getModulePriceId(moduleKey),
     metadata: { moduleKey, companyId },
     proration_behavior: "create_prorations"  // ou "default" para cobrar pró-rata
   })
10. Registra ActivityLog: "Módulo {moduleKey} adicionado à assinatura"
11. Retorna { success: true, message: "Módulo adicionado. Ativação após confirmação de pagamento." }

12. Webhook: invoice.paid (ou customer.subscription.updated)
    → syncStripeSubscription() reconcilia e ativa o módulo
```

### Tratamento de proration

- `proration_behavior: "create_prorations"` — cobrar pró-rata imediatamente (padrão)
- Se o período de cobrança estiver próximo do fim, pode ser melhor `proration_behavior: "none"` e cobrar a partir do próximo ciclo

### Tratamento de pagamento que exige autenticação (SCA)

- Se o pagamento requer `payment_action_required`, o Stripe envia o evento `invoice.payment_action_required`
- O módulo **NÃO deve ser ativado** até o pagamento ser confirmado por `invoice.paid`
- A função de reconciliação só ativa módulos quando a fatura está paga

### Idempotência

- Verificar se já existe `CompanyModule.stripeSubscriptionItemId` para aquele módulo antes de criar
- Se o módulo já está ativo, retornar erro 409
- Se o subscription_item já existe no Stripe (mesmo price), não criar outro
- Usar idempotency key no Stripe: `stripeSubscriptionId + moduleKey`

---

## 7. Fluxo de Remoção de Módulo

### Endpoint: `POST /api/stripe/modules/remove`

```
1. Autentica usuário (ADMIN da empresa)
2. Valida body: { moduleKey: string }
3. Valida que moduleKey NÃO é core → erro 400 se for
4. Valida que moduleKey não é o includedModuleKey da Subscription
   - Se for o incluso, exigir que outro módulo seja escolhido como incluso primeiro, OU impedir remoção
5. Valida que módulo ESTÁ ativo (CompanyModule.active === true)
6. Recupera CompanyModule.stripeSubscriptionItemId
   - Se não existe (módulo incluso ou trial), tratar separadamente
7. Recupera subscription do Stripe
8. Remove subscription_item:
   stripe.subscriptionItems.del(stripeSubscriptionItemId, {
     proration_behavior: "create_prorations"  // ou "none" para remover no fim do período
   })
9. Registra ActivityLog: "Módulo {moduleKey} removido da assinatura"
10. Retorna { success: true, message: "Módulo removido. Desativação após confirmação." }

11. Webhook: customer.subscription.updated
    → syncStripeSubscription() reconcilia e desativa o módulo
```

### Regras de remoção

- **Core (customers):** Nunca pode ser removido. Erro 400.
- **Módulo incluso no base:** Não pode ser removido sem substituição. Exigir que o ADMIN escolha outro módulo incluso antes. Ou impedir a remoção e orientar a trocar o módulo incluso.
- **Módulo adicional:** Pode ser removido livremente.
- **Imediata vs fim de período:**
  - `proration_behavior: "create_prorations"` → remove imediatamente, gera crédito pró-rata
  - `proration_behavior: "none"` → mantém acesso até o fim do período, remove no próximo ciclo
  - Recomendação: usar `"create_prorations"` para simplicidade

### Troca de módulo incluso

Se o usuário quer trocar o módulo incluso (ex: de Orçamentos para Financeiro):

```
1. Validar que o novo módulo é comprável e não é core
2. Remover subscription_item do módulo incluso atual (se existir)
3. Atualizar Subscription.includedModuleKey para o novo módulo
4. Atualizar CompanyModule: desativar antigo incluso, ativar novo incluso
5. Recalcular monthlyPrice
6. Se o antigo incluso tinha subscription_item, removê-lo
7. Se o novo incluso era um módulo extra, remover seu subscription_item (agora incluso no base)
8. Se o novo incluso era um módulo que não estava ativo, apenas ativá-lo
```

---

## 8. Tratamento de SCA e Pagamento Incompleto

### Cenários

| Cenário | Stripe Event | Ação no AVGESTÃO |
|---|---|---|
| Pagamento bem-sucedido | `invoice.paid` | Reconciliar: ativar módulos correspondentes aos items pagos |
| Pagamento falhou (cartão recusado) | `invoice.payment_failed` | Logar. Não desativar módulos — Stripe fará retry automático |
| Pagamento requer autenticação (SCA) | `invoice.payment_action_required` | Notificar ADMIN. Módulos permanecem como estão até confirmação |
| Assinatura inadimplente após retries | `customer.subscription.updated` com `status: "past_due"` | Marcar empresa como `SUSPENDED`. Suspender acesso |
| Assinatura cancelada | `customer.subscription.deleted` | Desativar todos os módulos não-core. Marcar empresa como `CANCELLED` |

### Regra de ouro

**Módulos são ativados SOMENTE após confirmação segura de pagamento (invoice.paid).**

O webhook `checkout.session.completed` pode criar o registro da subscription, mas a ativação dos módulos depende de `invoice.paid` ou da reconciliação após `customer.subscription.updated` com status `active`.

---

## 9. Estratégia de Reconciliação

### Função central: `syncStripeSubscription(companyId, stripeSubscription)`

```ts
/**
 * Reconcilia o estado do Stripe com o banco.
 * Idempotente: pode ser chamada múltiplas vezes sem efeitos colaterais.
 */
async function syncStripeSubscription(
  companyId: string,
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  // 1. Validar customer da empresa
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Empresa não encontrada");
  if (company.stripeCustomerId !== stripeSubscription.customer as string) {
    throw new Error("Customer não pertence à empresa");
  }

  // 2. Mapear Price IDs para moduleKeys
  const items = stripeSubscription.items.data;
  const paidModuleKeys: string[] = [];

  for (const item of items) {
    const moduleKey = getPriceIdToModuleKey(item.price.id);
    if (moduleKey) {
      paidModuleKeys.push(moduleKey);
    }
    // O item base (STRIPE_BASE_PRICE_ID) não mapeia para nenhum módulo
  }

  // 3. Atualizar Subscription
  const subscription = await prisma.subscription.upsert({
    where: { companyId },
    create: {
      companyId,
      status: mapStripeStatusToLocal(stripeSubscription.status),
      planName: getPlanName(paidModuleKeys),
      basePrice: 49.0,
      includedModuleKey: stripeSubscription.metadata?.includedModuleKey || null,
      modulesCount: paidModuleKeys.length,
      monthlyPrice: calculateMonthlyPrice(paidModuleKeys),
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: items[0]?.price.id,
      currentPeriodStartsAt: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEndsAt: new Date(stripeSubscription.current_period_end * 1000),
    },
    update: {
      status: mapStripeStatusToLocal(stripeSubscription.status),
      planName: getPlanName(paidModuleKeys),
      includedModuleKey: stripeSubscription.metadata?.includedModuleKey || null,
      modulesCount: paidModuleKeys.length,
      monthlyPrice: calculateMonthlyPrice(paidModuleKeys),
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: items[0]?.price.id,
      currentPeriodStartsAt: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEndsAt: new Date(stripeSubscription.current_period_end * 1000),
    },
  });

  // 4. Atualizar status da empresa
  const companyStatus = mapStripeStatusToLocal(stripeSubscription.status) === "ACTIVE"
    ? "ACTIVE"
    : mapStripeStatusToLocal(stripeSubscription.status) === "SUSPENDED"
    ? "SUSPENDED"
    : mapStripeStatusToLocal(stripeSubscription.status) === "CANCELLED"
    ? "CANCELLED"
    : "TRIAL";

  await prisma.company.update({
    where: { id: companyId },
    data: {
      status: companyStatus,
      monthlyPrice: subscription.monthlyPrice,
    },
  });

  // 5. Ativar módulos correspondentes aos items pagos
  const includedModuleKey = subscription.includedModuleKey;

  // Core sempre ativo
  const activeKeys = new Set<string>(CORE_MODULES.map(m => m.key));

  // Módulo incluso no base
  if (includedModuleKey) {
    activeKeys.add(includedModuleKey);
  }

  // Módulos extras (com subscription_item)
  for (const key of paidModuleKeys) {
    activeKeys.add(key);
  }

  // Atualizar CompanyModules
  const allModules = await prisma.companyModule.findMany({
    where: { companyId },
  });

  for (const cm of allModules) {
    const shouldBeActive = activeKeys.has(cm.moduleKey);
    if (cm.active !== shouldBeActive) {
      await prisma.companyModule.update({
        where: { id: cm.id },
        data: {
          active: shouldBeActive,
          activatedAt: shouldBeActive ? new Date() : undefined,
          deactivatedAt: !shouldBeActive ? new Date() : undefined,
        },
      });
    }
  }

  // 6. Salvar stripeSubscriptionItemId nos módulos extras
  for (const item of items) {
    const moduleKey = getPriceIdToModuleKey(item.price.id);
    if (moduleKey && moduleKey !== includedModuleKey) {
      await prisma.companyModule.update({
        where: { companyId_moduleKey: { companyId, moduleKey } },
        data: { stripeSubscriptionItemId: item.id },
      });
    }
  }

  // 7. Limpar stripeSubscriptionItemId de módulos que não estão mais no Stripe
  const paidItemIds = new Set(items.map(i => i.id));
  await prisma.companyModule.updateMany({
    where: {
      companyId,
      stripeSubscriptionItemId: { not: null },
      NOT: { stripeSubscriptionItemId: { in: [...paidItemIds] } },
    },
    data: { stripeSubscriptionItemId: null },
  });
}
```

### Mapeamento de status

```ts
function mapStripeStatusToLocal(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "paused":
    case "unpaid":
      return "SUSPENDED";
    case "canceled":
      return "CANCELLED";
    default:
      return "TRIAL";
  }
}
```

### Quando chamar `syncStripeSubscription`

| Momento | Gatilho |
|---|---|
| Checkout completado | `checkout.session.completed` |
| Subscription atualizada | `customer.subscription.updated` |
| Subscription criada | `customer.subscription.created` |
| Invoice paga | `invoice.paid` |
| Admin adiciona módulo | Após criar subscription_item (verificar status) |
| Admin remove módulo | Após remover subscription_item (verificar status) |

A função é idempotente: chamar múltiplas vezes com os mesmos dados produz o mesmo resultado.

---

## 10. Customer Portal

### O que o Portal FAZ

- Atualizar forma de pagamento (cartão)
- Consultar faturas
- Baixar recibos
- Cancelar a assinatura inteira (se habilitado)

### O que o Portal NÃO FAZ

- ❌ Adicionar módulos
- ❌ Remover módulos
- ❌ Trocar módulo incluso
- ❌ Fazer upgrade/downgrade de módulos individuais

Adicionar e remover módulos acontece dentro do AVGESTÃO por endpoints autenticados e autorizados (`/api/stripe/modules/add` e `/api/stripe/modules/remove`).

### Configuração do Portal

Ao criar a sessão do portal, configurar apenas as funcionalidades permitidas:

```ts
const portal = await getStripe().billingPortal.sessions.create({
  customer: company.stripeCustomerId,
  return_url: `${getAppUrl()}/dashboard`,
  configuration: portalConfigurationId, // configuração pré-criada no Stripe
});
```

A configuração do portal no Stripe Dashboard deve ter:
- Payment methods: habilitado
- Invoices: habilitado
- Subscription cancel: habilitado (com proration)
- Subscription update: **desabilitado**

Isso garante que o usuário pode gerenciar pagamento e cancelar, mas NÃO pode adicionar/remover módulos pelo portal.

---

## 11. Assinaturas Legadas

### Antes de remover Basic/Pro

**Verificações obrigatórias:**

1. **No Stripe Dashboard:** Verificar se existem customers com subscriptions ativas usando os Price IDs `STRIPE_BASIC_PRICE_ID` ou `STRIPE_PRO_PRICE_ID`.
2. **No banco de dados:** Verificar se existe alguma `Subscription` com `stripeSubscriptionId` preenchido:

```sql
SELECT id, "companyId", status, "stripeSubscriptionId", "stripePriceId"
FROM subscriptions
WHERE "stripeSubscriptionId" IS NOT NULL;
```

3. **No banco de dados:** Verificar se existe alguma `Company` com `stripeCustomerId` preenchido:

```sql
SELECT id, name, "stripeCustomerId"
FROM companies
WHERE "stripeCustomerId" IS NOT NULL;
```

### Se NÃO existem customers/subscriptions reais

**→ Usar Estratégia A:**
- Remover `PLANS` de `stripe.ts`
- Remover `STRIPE_BASIC_PRICE_ID` e `STRIPE_PRO_PRICE_ID` do `.env`
- Arquivar os Prices no Stripe Dashboard (marcar como inactive)
- Implementar cobrança modular limpa para novas compras

### Se EXISTEM customers/subscriptions reais

**→ Usar Estratégia B:**
- Manter `PLANS` em `stripe.ts` como legado, marcado com `@deprecated`
- Impedir novas compras de Basic/Pro no checkout (remover a opção do fluxo)
- Criar os novos Price IDs modulares no Stripe (modo teste primeiro)
- Implementar cobrança modular como fluxo separado
- Não migrar assinaturas existentes automaticamente
- Manter o webhook legado funcionando para as assinaturas existentes
- Adicionar lógica no webhook: se `plan` nos metadata = "basic" ou "pro", usar fluxo legado; caso contrário, usar fluxo modular

---

## 12. Auditoria Mobile Real

### Pendente

A auditoria mobile original listou problemas **prováveis**, não confirmados.

**Antes de qualquer alteração na UI:**

1. Rodar o projeto localmente (`npm run dev`)
2. Abrir cada página listada com Playwright nas viewports:
   - 360x800 (Android pequeno)
   - 390x844 (iPhone 14)
   - 412x915 (Android grande)
   - 768px (tablet)
3. Capturar screenshots de cada página
4. Detectar overflow horizontal, conteúdo cortado, botões inacessíveis, tabelas inúteis, etc.
5. Listar problemas **confirmados** por página
6. Somente depois propor arquivos e correções específicas

**Páginas a testar (21):**

| # | Rota | Viewports | Prioridade |
|---|---|---|---|
| 1 | `/login` | Todas | Baixa |
| 2 | `/dashboard` | Todas | Média |
| 3 | Sidebar | 360, 390 | Média |
| 4 | `/clientes` | Todas | Alta |
| 5 | `/orcamentos` | Todas | Alta |
| 6 | `/ordens-servico` | Todas | Alta |
| 7 | `/ordens-servico/[id]` | Todas | Alta |
| 8 | `/ordens-servico/novo` | Todas | Alta |
| 9 | `/financeiro` | Todas | Alta |
| 10 | `/financeiro/fluxo` | Todas | Alta |
| 11 | `/estoque` | Todas | Média |
| 12 | `/cardapio` | Todas | Média |
| 13 | `/cardapio/cozinha` | 360, 390 | Alta |
| 14 | `/cardapio/caixa` | 360, 390 | Alta |
| 15 | `/relatorios/executivo` | Todas | Alta |
| 16 | `/usuarios` | Todas | Média |
| 17 | `/upgrade` | Todas | Média |
| 18 | `/admin/empresas` | Todas | Média |
| 19 | `/admin/empresas/[id]` | Todas | Média |
| 20 | `/portal/os/[token]` | Todas | Baixa |
| 21 | `/c/[slug]` | 360, 390, 412 | Alta |

**Resultado:** Será entregue como um documento separado após a execução dos testes.

---

## 13. Primeiro Administrador — Confirmação

A Fase 1 está aprovada conceitualmente. Confirmando os pontos:

| Requisito | Status |
|---|---|
| Criação atômica de Company, CompanyModules, Subscription, User e token | ✅ Confirmado — `prisma.$transaction()` |
| Empresa sempre TRIAL | ✅ Confirmado — `status: "TRIAL"` por padrão |
| Primeiro usuário sempre COMPANY_ADMIN | ✅ Confirmado — `role: COMPANY_ADMIN` |
| Link de convite seguro | ✅ Confirmado — `/reset-password?token=<crypto token>` |
| Fallback copiável sem Resend | ✅ Confirmado — retornar link no response da API |
| Nenhuma senha enviada em texto | ✅ Confirmado — senha temporária é hash, link de reset |
| Nenhum schema novo necessário | ✅ Confirmado — `PasswordResetToken` já existe |

### Fluxo detalhado

```
POST /api/empresas
  Body: {
    name, tradeName, document, phone, whatsapp, email, address,
    status, trialDays,
    adminName, adminEmail, adminPhone  // NOVOS
  }

  Transaction:
    1. Verificar se adminEmail já existe em User
       - Se sim: erro 409 "Email já cadastrado"
    2. Criar Company (status=TRIAL, monthlyPrice=49.0)
    3. Criar CompanyModules (todos inativos, exceto core)
    4. Criar Subscription (status=TRIAL, planName="Inicial", basePrice=49.0)
    5. Criar User (role=COMPANY_ADMIN, companyId, passwordHash=hash aleatório)
    6. Criar PasswordResetToken (token crypto, expiresAt=agora+7dias)
    7. LogActivity: "Empresa criada com administrador"

  Response: {
    company: { ... },
    user: { id, name, email, role },
    inviteLink: "/reset-password?token=xxx",
    inviteExpiresAt: "2026-06-26T..."
  }

  Paralelo (fire-and-forget):
    - Enviar email via Resend com link de convite
    - Se Resend não configurado: logar link no console
```

---

## 14. Nova Ordem de Implementação

| Fase | O que | Arquivos | Risco |
|---|---|---|---|
| **Fase 0** | Auditoria mobile com screenshots | Playwright specs, 21 páginas | Baixo |
| **Fase 1** | Criar primeiro administrador na criação de empresa | `empresas/route.ts`, `empresas/novo/page.tsx`, `empresas/[id]/page.tsx`, `email.ts` | Baixo |
| **Fase 2** | Schema migration (adicionar campos) | `schema.prisma`, migration | Baixo (campos nullable) |
| **Fase 3** | Reescrever Stripe: checkout modular | `stripe.ts`, `checkout/route.ts`, `upgrade/page.tsx` | Médio |
| **Fase 4** | Reescrever Stripe: webhook com reconciliação | `webhook/route.ts`, novo `stripe-sync.ts` | Médio |
| **Fase 5** | Criar endpoints de adicionar/remover módulos | `modules/add/route.ts`, `modules/remove/route.ts` | Médio |
| **Fase 6** | Configurar Customer Portal | `portal/route.ts` | Baixo |
| **Fase 7** | Verificar legado Basic/Pro e limpar se seguro | `stripe.ts`, `.env`, `README_DEPLOY.md`, docs | Baixo (após verificação) |
| **Fase 8** | Responsividade mobile (com base nos screenshots) | ~15 arquivos de UI | Médio |
| **Fase 9** | Testes E2E comerciais | ~7 arquivos de spec | Baixo |
| **Fase 10** | Verificação final: build + typecheck + E2E | CI | Baixo |

---

## Guard Rails

- ❌ Não apagar Basic/Pro antes de confirmar se há dependências
- ❌ Não mexer em Stripe live
- ❌ Não criar produtos ou preços no modo live
- ❌ Não commitar chaves
- ❌ Não alterar schema sem aprovação
- ❌ Não quebrar assinaturas existentes
- ❌ Não ativar módulo apenas pelo frontend
- ❌ Não confiar em metadata sem validar
- ❌ Não enviar senha em texto
- ❌ Não usar eventos Stripe inexistentes (`subscription_item.created/updated/deleted`)
- ❌ Não assumir que Customer Portal gerencia módulos
- ❌ Não ativar módulo antes de confirmação segura de pagamento
- ❌ Não aplicar redesign geral novamente
- ❌ Não reintroduzir Framer Motion como dependência para conteúdo aparecer
- ❌ Não alterar UI mobile sem screenshots confirmados
- ✅ Manter build, typecheck e E2E passando
- ✅ Reconciliação sempre idempotente
- ✅ Módulo incluso no base sem subscription_item separado
- ✅ Módulos extras com `stripeSubscriptionItemId` no CompanyModule
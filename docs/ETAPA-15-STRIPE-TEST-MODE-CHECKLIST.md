# Checklist: Configuração do Stripe em Modo Teste

> **NÃO usar Stripe live nesta etapa.** Todos os passos abaixo são em modo teste.

---

## 1. Criar STRIPE_BASE_PRICE_ID

1. Acessar [Stripe Dashboard](https://dashboard.stripe.com/test) → **Produtos**
2. Criar produto "Plano Base AVGESTÃO" com preço recorrente R$49/mês
3. Copiar o `price_id` (começa com `price_...`) para `STRIPE_BASE_PRICE_ID`

**Configuração do preço:**
- Nome: Plano Base
- Modelo: Recorrente
- Preço: R$49,00
- Período: Mensal
- Moeda: BRL

---

## 2. Criar os oito STRIPE_MODULE_*_PRICE_ID

Para cada módulo comprável, criar um produto + preço:

| Módulo | Env Var | Preço (R$/mês) | Nome no Stripe |
|--------|---------|----------------|----------------|
| Orçamentos | `STRIPE_MODULE_QUOTES_PRICE_ID` | R$30 | Módulo Orçamentos |
| OS Premium | `STRIPE_MODULE_SERVICE_ORDERS_PRICE_ID` | R$35 | Módulo OS Premium |
| Agendamento | `STRIPE_MODULE_SCHEDULING_PRICE_ID` | R$20 | Módulo Agendamento |
| Financeiro | `STRIPE_MODULE_FINANCE_PRICE_ID` | R$20 | Módulo Financeiro |
| Estoque | `STRIPE_MODULE_INVENTORY_PRICE_ID` | R$20 | Módulo Estoque |
| Cardápio Digital | `STRIPE_MODULE_MENU_PRICE_ID` | R$35 | Módulo Cardápio Digital |
| Relatórios | `STRIPE_MODULE_REPORTS_PRICE_ID` | R$20 | Módulo Relatórios |
| Usuários e Permissões | `STRIPE_MODULE_USERS_PERMISSIONS_PRICE_ID` | R$20 | Módulo Usuários e Permissões |

**Para cada produto:**
1. Stripe Dashboard → **Produtos** → **Adicionar produto**
2. Nome: conforme tabela acima
3. Modelo: **Recorrente**
4. Preço: conforme tabela
5. Período: **Mensal**
6. Moeda: **BRL**
7. Copiar o `price_id` para a env var correspondente

---

## 3. Configurar Webhook Test

1. Stripe Dashboard → **Desenvolvedores** → **Webhooks**
2. Certificar que está em **Modo Teste** (toggle no canto superior)
3. **Adicionar endpoint**: `https://avgestao.com.br/api/stripe/webhook`
   - Em desenvolvimento local: `http://localhost:3000/api/stripe/webhook`
4. **Eventos a selecionar**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
5. Copiar o `whsec_...` para `STRIPE_WEBHOOK_SECRET`

**Para desenvolvimento local** usar Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
O CLI imprime o `whsec_...` para usar como `STRIPE_WEBHOOK_SECRET`.

---

## 4. Definir STRIPE_WEBHOOK_SECRET Test

```env
# .env.local (desenvolvimento) — NÃO versionar
STRIPE_WEBHOOK_SECRET="whsec_..."

# .env (produção) — NÃO versionar
STRIPE_WEBHOOK_SECRET="whsec_..."
```

⚠️ **Nunca** commitar secrets reais em arquivos versionados.

---

## 5. Testar Primeiro Checkout

1. Fazer login como COMPANY_ADMIN
2. Acessar `/upgrade`
3. Selecionar um módulo (ex: "Orçamentos")
4. Verificar que o checkout redireciona para o Stripe
5. No Stripe, usar cartão de teste: `4242 4242 4242 4242`
6. Completar o pagamento
7. Verificar que o webhook `checkout.session.completed` é recebido
8. Verificar no banco:
   - `Company.status` = "ACTIVE"
   - `Company.stripeCustomerId` preenchido
   - `Subscription.stripeSubscriptionId` preenchido
   - `Subscription.includedModuleKey` = "quotes"
   - `CompanyModule[quotes].active` = true
   - `StripeWebhookEvent` com status = "PROCESSED"

---

## 6. Testar Módulo Adicional

1. Com assinatura ativa, acessar `/upgrade`
2. Selecionar outro módulo (ex: "Financeiro")
3. Verificar que chama `/api/stripe/modules/add`
4. No Stripe, verificar que o item foi adicionado à assinatura
5. Aguardar webhook `invoice.paid` ou `subscription.updated`
6. Verificar no banco:
   - `CompanyModule[finance].active` = true
   - `CompanyModule[finance].stripeSubscriptionItemId` preenchido
   - `Subscription.monthlyPrice` atualizado

---

## 7. Testar SCA (Strong Customer Authentication)

1. Usar cartão de teste SCA: `4000 0025 0000 3155`
2. Realizar checkout ou adicionar módulo
3. Verificar que `payment_behavior: "pending_if_incomplete"` funciona:
   - Módulo **NÃO** deve ser ativado antes da autenticação
   - Webhook `invoice.payment_action_required` deve ser recebido
4. Completar autenticação no Stripe Dashboard
5. Verificar que o módulo é ativado após `invoice.paid`

---

## 8. Testar Falha de Pagamento

1. Usar cartão de teste que falha: `4000 0000 0000 0002`
2. Verificar que webhook `invoice.payment_failed` é recebido
3. Verificar que `Company.status` muda para "SUSPENDED" se `past_due`
4. Verificar que módulos não-core **não** são desativados — apenas acesso é suspenso
5. Pagar a fatura pendente e verificar que `Company.status` volta para "ACTIVE"

---

## 9. Testar Remoção de Módulo

1. Com assinatura ativa e múltiplos módulos, chamar `/api/stripe/modules/remove`
2. Verificar que o `subscriptionItem` é removido do Stripe
3. Verificar que o módulo é desativado no banco após webhook
4. Verificar que `CompanyModule.stripeSubscriptionItemId` é limpo
5. Verificar que `Subscription.monthlyPrice` é recalculado

**Cartões de teste do Stripe (modo teste):**

| Cartão | Comportamento |
|--------|---------------|
| `4242 4242 4242 4242` | Sucesso |
| `4000 0025 0000 3155` | Requer autenticação (SCA) |
| `4000 0000 0000 0002` | Falha de pagamento |
| `4000 0000 0000 3220` | Sucesso com 3DS |
| `4000 0000 0000 9995` | Saldo insuficiente |

---

## 10. Testar Webhook Duplicado

1. No Stripe Dashboard → **Desenvolvedores** → **Webhooks**
2. Selecionar o endpoint e clicar em **Reenviar** um evento
3. Verificar no banco que `StripeWebhookEvent` tem status = "PROCESSED"
4. Verificar que o evento duplicado retorna `{ received: true, duplicate: true }`
5. Verificar que NÃO há duplicação de efeitos (CompanyModule, ActivityLog, etc.)

---

## 11. Verificar Idempotência com Falha

1. Simular um webhook que falha (ex: desconectar banco temporariamente)
2. Verificar que `StripeWebhookEvent` tem status = "FAILED"
3. Reenviar o evento
4. Verificar que o registro FAILED é deletado e reprocessado
5. Verificar que após sucesso, o status muda para "PROCESSED"

---

## Resumo das Env Vars

```env
# Stripe — Modo Teste
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Preço base
STRIPE_BASE_PRICE_ID="price_..."

# Preços por módulo
STRIPE_MODULE_QUOTES_PRICE_ID="price_..."
STRIPE_MODULE_SERVICE_ORDERS_PRICE_ID="price_..."
STRIPE_MODULE_SCHEDULING_PRICE_ID="price_..."
STRIPE_MODULE_FINANCE_PRICE_ID="price_..."
STRIPE_MODULE_INVENTORY_PRICE_ID="price_..."
STRIPE_MODULE_MENU_PRICE_ID="price_..."
STRIPE_MODULE_REPORTS_PRICE_ID="price_..."
STRIPE_MODULE_USERS_PERMISSIONS_PRICE_ID="price_..."

# Legado (manter para assinaturas existentes)
STRIPE_BASIC_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
```

⚠️ **NÃO commitar valores reais.** Usar `.env.local` (gitignore) ou variáveis de ambiente do deploy.
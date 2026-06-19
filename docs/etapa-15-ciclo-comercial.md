# Etapa 15 — Fechar o Ciclo Comercial do AVGESTÃO

> Auditoria completa e plano de implementação.
> Data: 2026-06-19
> Status: **Aguardando aprovação antes de implementar**

---

## PARTE 1 — Auditoria do Stripe Legado

### 1.1 Onde Basic e Pro estão definidos

| Local | Conteúdo | Status |
|---|---|---|
| `src/lib/stripe.ts` → `PLANS` | `basic`: R$49, 3 módulos / `pro`: R$99, todos módulos | `@legacy` — comentário diz "manter até checkout modular estar validado" |
| `src/lib/pricing.ts` → `PLAN_LABELS` | `Inicial`: R$49, 1 mód / `Crescimento`: R$79, 2 mód / `Profissional`: R$104, 3 mód / `Completo`: R$144, 5 mód | ✅ Modelo modular novo |
| `docs/arquitetura-sistema.md` | Lista "Basic (3 módulos, R$49)" e "Pro (todos, R$99)" | ⚠️ Documentação desatualizada |
| `README_DEPLOY.md` | `STRIPE_BASIC_PRICE_ID` e `STRIPE_PRO_PRICE_ID` como env vars obrigatórias | ⚠️ Legado em produção |

### 1.2 Price IDs

| Env Var | Uso | Valor |
|---|---|---|
| `STRIPE_BASIC_PRICE_ID` | `PLANS.basic.priceId` no checkout legado | Vazio se não configurado (`|| ""`) |
| `STRIPE_PRO_PRICE_ID` | `PLANS.pro.priceId` no checkout legado | Vazio se não configurado (`|| ""`) |

**Nenhum Price ID está hardcoded** — vêm de variáveis de ambiente. Mas o checkout atual **sempre usa `PLANS.basic.priceId`** (o fluxo manda `plan: "basic"` fixo).

### 1.3 Páginas que exibem Basic/Pro

| Página | O que mostra | Problema |
|---|---|---|
| `/upgrade` | Mostra cards de módulos individuais (modelo modular). NÃO mostra "Basic" ou "Pro" como opções | ✅ Já migrado visualmente |
| `/dashboard` | Cards de módulos com preços de `modules.ts` | ✅ Modular |
| `/admin/empresas/[id]` | Mostra `monthlyPrice` calculado via `calculateMonthlyPrice()`. Exibe "Plano Base" e módulos ativos | ✅ Modular |
| Landing page (`/`) | Lista de funcionalidades, sem preços | ✅ Sem Basic/Pro |

**Conclusão:** A interface NÃO exibe mais "Basic/Pro" para o usuário. O legado só existe no código backend (`stripe.ts` + checkout API).

### 1.4 Como o checkout atual funciona

```
1. Usuário clica "Assinar [módulo]" no /upgrade
2. Frontend POST /api/stripe/checkout com { plan: "basic", moduleKey: "quotes" }
3. Backend usa PLANS.basic.priceId (Price ID do plano "Basic" no Stripe)
4. Cria Stripe Checkout Session em modo subscription com 1 line item (o price do Basic)
5. Metadata: { companyId, plan: "basic", moduleKey: "quotes" }
6. Stripe processa pagamento → webhook checkout.session.completed
7. Webhook: ativa company (status ACTIVE), upserta Subscription, ativa o CompanyModule específico
```

**Problema central:** O Stripe cobra R$49 fixo (preço do plano Basic) independentemente de quantos módulos o cliente assina. Cada módulo novo cria uma NOVA subscription separada com o mesmo `PLANS.basic.priceId` de R$49, sem adicionar line items à subscription existente.

### 1.5 Como o webhook ativa módulo

`checkout.session.completed`:
1. Extrai `companyId`, `plan`, `moduleKey` dos metadata
2. Seta `company.status = ACTIVE`
3. Upserta `Subscription` com `stripeSubscriptionId` e `stripePriceId`
4. Se `moduleKey` existe, ativa o `CompanyModule` correspondente (`active: true`, `activatedAt: now`)

`customer.subscription.deleted`:
1. Seta `company.status = CANCELLED`
2. Seta `subscription.status = CANCELLED`
3. Desativa TODOS os CompanyModules exceto core (`CORE_MODULES`)

**Problema:** Cancelar uma subscription cancela a empresa inteira e desativa todos os módulos. Não existe cancelamento de módulo individual via Stripe.

### 1.6 Cancelamento, inadimplência e renovação

| Evento Stripe | Comportamento atual |
|---|---|
| `subscription.updated` | Se ativa → `ACTIVE`. Senão → `SUSPENDED` |
| `subscription.deleted` | `CANCELLED` + desativa todos os módulos não-core |
| `invoice.payment_failed` | Apenas `console.warn`. Nenhuma ação no banco |

**Não existe:** período de carência, notificação de inadimplência, suspensão parcial, downgrade de módulos.

### 1.7 CompanyModule é atualizado pelo webhook?

**Sim, mas parcialmente:**
- ✅ `checkout.session.completed` ativa um módulo individual via `moduleKey` nos metadata
- ❌ `subscription.updated` NÃO atualiza CompanyModule (só muda status da empresa/subscription)
- ❌ `subscription.deleted` desativa TODOS os módulos de uma vez
- ❌ Não existe webhook para adicionar/remover módulos de uma subscription existente

### 1.8 Conflitos entre arquivos

| Conflito | Detalhe |
|---|---|
| `stripe.ts` vs `pricing.ts` | `PLANS` tem Básico(R$49)/Pro(R$99). `pricing.ts` tem Inicial(R$49)/Crescimento(R$79)/Profissional(R$104)/Completo(R$144). Preços incompatíveis. |
| `stripe.ts` vs `/upgrade` | Checkout manda `plan: "basic"` mas a UI mostra preço modular |
| `pricing.ts` vs webhook | `calculateMonthlyPrice()` calcula preço dinâmico, mas webhook usa `plan` dos metadata para `planName` |
| `modules.ts` vs BD `Module.basePrice` | Admin pode editar `Module.basePrice` no banco, mas `pricing.ts` lê de `MODULES` (hardcoded). Valores divergem. |
| `Company.monthlyPrice` vs Stripe | Campo é atualizado pelo admin ao ativar módulos, mas NÃO pelo Stripe. Cobrança real é pelo preço do Basic no Stripe. |

### 1.9 Campos Stripe no banco

| Modelo | Campo | Tipo | Uso |
|---|---|---|---|
| `Company` | `stripeCustomerId` | String? @unique | ID do customer no Stripe |
| `Subscription` | `stripeSubscriptionId` | String? @unique | ID da subscription no Stripe |
| `Subscription` | `stripePriceId` | String? | Price ID da subscription |
| `Company` | `planName` | String? | Nome do plano (legacy) |
| `Company` | `monthlyPrice` | Decimal? | Preço mensal calculado |
| `Subscription` | `planName` | String? | Nome do plano |
| `Subscription` | `basePrice` | Decimal(10,2) | Preço base (default 49.00) |
| `Subscription` | `monthlyPrice` | Decimal(10,2) | Preço mensal calculado |
| `Subscription` | `modulesCount` | Int | Contagem de módulos |

**Não existe** `stripeStatus` no banco — o status da subscription é mapeado para o enum `SubscriptionStatus` próprio.

### 1.10 Existem clientes/assinaturas reais?

**Sem acesso ao Stripe Dashboard, não é possível confirmar.** Mas:
- O `.env` pode conter configuração de produção
- `README_DEPLOY.md` documenta `STRIPE_BASIC_PRICE_ID` e `STRIPE_PRO_PRICE_ID` como obrigatórios
- O webhook aponta para `https://avgestao.com.br/api/stripe/webhook`

**Recomendação:** Verificar no Stripe Dashboard se existem customers/subscriptions reais antes de remover os planos legados.

---

## Estratégia Recomendada

### Se NÃO há clientes reais usando Basic/Pro → Estratégia A

1. **Descontinuar Basic/Pro** — remover `PLANS` de `stripe.ts`, remover `STRIPE_BASIC_PRICE_ID` e `STRIPE_PRO_PRICE_ID` das envs
2. **Remover Basic/Pro das telas comerciais** — já feito, a UI usa modelo modular
3. **Manter compatibilidade técnica temporária** — o schema `Subscription` com `stripeSubscriptionId` e `stripePriceId` continua funcionando para o novo modelo
4. **Implementar cobrança modular limpa** — uma subscription com múltiplos subscription items

### Se HÁ clientes reais → Estratégia B

1. Manter assinaturas existentes funcionando (não cancelar)
2. Marcar `PLANS.basic` e `PLANS.pro` como legacy no código
3. Impedir novas compras desses planos
4. Criar Stripe Modular V2 para novos clientes
5. Não migrar assinatura existente sem aprovação

**Preferência:** Se não houver cliente real usando Basic/Pro, usar a **Estratégia A**.

---

## PARTE 2 — Modelo Modular Recomendado

### Opção 1 vs Opção 2

| Critério | Opção 1: Subscription com múltiplos items | Opção 2: Uma subscription por módulo |
|---|---|---|
| Complexidade | Média | Alta |
| Upgrade | Adicionar item à subscription existente | Criar nova subscription |
| Downgrade | Remover item da subscription | Cancelar subscription específica |
| Cancelamento total | Cancelar 1 subscription | Cancelar N subscriptions |
| Webhook | 1 subscription para gerenciar | N subscriptions para sincronizar |
| Customer Portal | Suporte nativo para items | Múltiplas subscriptions no portal |
| Faturamento | 1 invoice com todos os módulos | N invoices separados |
| Pró-rata | Automático por item | Manual por subscription |
| Conflito com legado | Baixo — substitui o price único | Médio — N subscriptions vs 1 legada |

### ✅ Recomendação: Opção 1 — Uma subscription com múltiplos subscription items

**Justificativa:**
- Arquitetura atual já usa 1 subscription por empresa (tabela `Subscription` com `companyId @unique`)
- Stripe suporta nativamente `subscription_items` com add/remove
- O Customer Portal gerencia items automaticamente
- Faturamento unificado (1 invoice/mês)
- Pró-rata automático ao adicionar/remover módulos
- Menos webhooks para gerenciar

### Como funciona no Stripe

```
1. Primeiro módulo comprado:
   - Criar Subscription com 1 item: Base (R$49) ou módulo específico
   - Stripe Subscription Item: price=base_price, quantity=1

2. Módulo adicional comprado:
   - Adicionar Subscription Item à subscription existente
   - stripe.subscriptionItems.create({ subscription: sub_id, price: module_price })
   - Pró-rata automático

3. Módulo removido:
   - stripe.subscriptionItems.del(item_id)
   - Pró-rata automático

4. Cancelamento total:
   - stripe.subscriptions.del(sub_id)
   - Desativar todos os CompanyModules não-core
```

### Env vars necessárias

```env
# Legado (remover após transição)
STRIPE_BASIC_PRICE_ID=xxx      # REMOVER
STRIPE_PRO_PRICE_ID=xxx       # REMOVER

# Novo modelo modular
STRIPE_BASE_PRICE_ID=xxx                    # Price para o plano base (R$49)
STRIPE_MODULE_QUOTES_PRICE_ID=xxx           # R$30
STRIPE_MODULE_SERVICE_ORDERS_PRICE_ID=xxx   # R$35
STRIPE_MODULE_SCHEDULING_PRICE_ID=xxx       # R$20
STRIPE_MODULE_FINANCE_PRICE_ID=xxx          # R$20
STRIPE_MODULE_INVENTORY_PRICE_ID=xxx        # R$20
STRIPE_MODULE_MENU_PRICE_ID=xxx             # R$35
STRIPE_MODULE_REPORTS_PRICE_ID=xxx          # R$20
STRIPE_MODULE_USERS_PERMISSIONS_PRICE_ID=xxx # R$20
```

### Mudanças de schema necessárias

**Sim, são necessárias:**

1. **Adicionar `stripeSubscriptionItemId` em `CompanyModule`** — para rastrear qual item do Stripe corresponde a qual módulo

```prisma
model CompanyModule {
  // ... campos existentes
  stripeSubscriptionItemId String?   // NOVO: vincula ao subscription_item no Stripe
}
```

2. **Adicionar `stripeStatus` em `Subscription`** — para sincronizar status real do Stripe

```prisma
model Subscription {
  // ... campos existentes
  stripeStatus String?              // NOVO: status real do Stripe (active, past_due, etc.)
}
```

3. **Remover `planName` de `Company`** (opcional, após migração) — campo legado

⚠️ **Não criar migration sem aprovação.**

### Impacto no webhook

| Evento Stripe | Comportamento atual | Comportamento novo |
|---|---|---|
| `checkout.session.completed` | Ativa empresa + módulo via metadata | Ativa empresa + módulo. Cria/associa subscription items |
| `customer.subscription.updated` | Muda status da empresa | Muda status + sincroniza `stripeStatus` |
| `customer.subscription.deleted` | Cancela empresa inteira | Cancela subscription. Desativa todos os módulos não-core |
| `invoice.payment_failed` | Apenas log | Notifica empresa. Após N falhas, suspende |
| `customer.subscription_item.created` | Não tratado | Ativar CompanyModule correspondente |
| `customer.subscription_item.deleted` | Não tratado | Desativar CompanyModule correspondente |
| `customer.subscription_item.updated` | Não tratado | Atualizar preço do CompanyModule |

### Impacto em upgrade/downgrade

- **Upgrade (adicionar módulo):** Criar subscription item na subscription existente via Stripe API, ou redirecionar para checkout com `subscription_data.items` atualizados
- **Downgrade (remover módulo):** Deletar subscription item via Stripe API, ou permitir pelo Customer Portal
- **Mudança de preço:** Atualizar subscription item com novo price ID

### Impacto no Customer Portal

- O Stripe Customer Portal suporta nativamente múltiplos subscription items
- O cliente pode adicionar/remover módulos pelo portal
- É necessário configurar o portal no Stripe para permitir add/remove de items

---

## PARTE 3 — Criação de Empresa com Primeiro Administrador

### Estado atual

**Gap crítico:** `POST /api/empresas` cria Company + CompanyModules + Subscription, mas **NÃO cria nenhum User**. A empresa fica sem administrador.

O formulário em `/admin/empresas/novo` pede:
- Nome da empresa ✅
- Nome Fantasia ✅
- Documento ✅
- Telefone ✅
- WhatsApp ✅
- Email ✅
- Endereço ✅
- Status (TRIAL/ACTIVE) ✅
- Dias de trial ✅

**Mas NÃO pede:** nome do responsável, email do administrador, ou qualquer informação de usuário.

### Fluxo desejado

```
1. Super Admin preenche formulário de criação de empresa
   Campos NOVOS: nomeResponsavel, emailResponsavel (obrigatório), telefoneResponsavel (opcional)

2. Backend cria em TRANSACTION:
   a. Company (status=TRIAL)
   b. CompanyModules (todos inativos exceto core)
   c. Subscription (planName="Inicial", status=TRIAL)
   d. User (role=COMPANY_ADMIN, email=emailResponsavel, passwordHash=TEMPORÁRIO)
   e. PasswordResetToken (token aleatório, expiresAt=agora+7dias)
   f. ActivityLog (criação da empresa)

3. Tenta enviar email de convite via Resend
   - Email contém: link para /reset-password?token=XXX
   - Se Resend configurado: envia email
   - Se Resend NÃO configurado: retorna o link copiável no response da API

4. Responsável recebe o link (por email ou copiado pelo Super Admin)
5. Responsável acessa /reset-password?token=XXX
6. Responsável define sua própria senha
7. Responsável faz login na empresa correta (companyId já definido)
```

### Isso exige alteração de schema?

**NÃO.** O schema atual já suporta este fluxo:
- `User` com `role=COMPANY_ADMIN` ✅
- `PasswordResetToken` com `token`, `email`, `expiresAt`, `usedAt` ✅
- `sendPasswordResetEmail()` ✅
- `/api/auth/reset-password` ✅

**São necessárias alterações em:**

| Arquivo | Alteração |
|---|---|
| `src/app/(admin)/admin/empresas/novo/page.tsx` | Adicionar campos: nomeResponsavel, emailResponsavel, telefoneResponsavel |
| `src/app/api/empresas/route.ts` | Criar User + PasswordResetToken na mesma transaction |
| `src/app/(admin)/admin/empresas/[id]/page.tsx` | Mostrar link de convite se usuário existe mas não definiu senha |

### Regras

- ✅ Empresa nasce TRIAL
- ✅ Nunca criar empresa sem administrador
- ✅ Company e User na mesma transaction (`prisma.$transaction`)
- ✅ Email duplicado → rejeitar com erro claro
- ✅ Nunca mostrar senha definitiva
- ✅ Nunca armazenar senha em texto (hash temporário aleatório)
- ✅ Registrar ActivityLog
- ✅ Respeitar companyId
- ✅ Não quebrar usuários existentes

---

## PARTE 4 — Auditoria Mobile

### Páginas e componentes com problemas prováveis de responsividade

| # | Página/Componente | Problemas prováveis | Prioridade |
|---|---|---|---|
| 1 | `/login` | Provavelmente OK — formulário centralizado | Baixa |
| 2 | `/dashboard` | Grid de ModuleCards pode não adaptar bem em 360px | Média |
| 3 | Sidebar | Implementação mobile com overlay ✅, mas verificar animações e toque | Média |
| 4 | `/clientes` | Tabela de dados → precisa de cards em mobile | Alta |
| 5 | `/orcamentos` | Tabela → cards em mobile | Alta |
| 6 | `/ordens-servico` | Tabela → cards em mobile | Alta |
| 7 | `/ordens-servico/[id]` | Formulário complexo com muitos campos → coluna única em mobile | Alta |
| 8 | `/ordens-servico/novo` | Formulário longo → coluna única | Alta |
| 9 | `/financeiro` | Tabs + tabelas + gráficos → overflow provável | Alta |
| 10 | `/financeiro/fluxo` | Gráfico de fluxo de caixa → pode quebrar em mobile | Alta |
| 11 | `/estoque` | Dashboard com métricas + tabela | Média |
| 12 | `/cardapio/admin` | Grid de itens + imagem | Média |
| 13 | `/cardapio/cozinha` | Kanban de pedidos → precisa ser coluna única em mobile | Alta |
| 14 | `/cardapio/caixa` | POS/PDV → precisa ser otimizado para toque | Alta |
| 15 | `/relatorios/executivo` | KPIs + gráficos → overflow provável | Alta |
| 16 | `/usuarios` | Tabela → cards em mobile | Média |
| 17 | `/upgrade` | Grid de cards de módulos → empilhar em mobile | Média |
| 18 | `/admin/empresas` | Tabela → cards em mobile | Média |
| 19 | `/admin/empresas/[id]` | Formulário + toggle de módulos | Média |
| 20 | `/portal/os/[token]` | Provavelmente OK — layout simples | Baixa |
| 21 | `/c/[slug]` | Cardápio público → precisa ser mobile-first | Alta |

### Abordagem por tipo de problema

| Tipo | Solução |
|---|---|
| Tabelas em mobile | Transformar em cards empilhados (stacked cards) ou usar colunas prioritárias com scroll horizontal |
| Formulários em mobile | Coluna única, labels acima dos inputs, full-width |
| Diálogos/modais em mobile | Usar Sheet/Bottom Sheet que sobe da tela |
| ActionBars | Manter acessíveis, fixar no bottom em mobile |
| Gráficos | Reduzir altura, simplificar legendas, scroll horizontal se necessário |
| Sidebar | Já tem overlay mobile ✅ — verificar área de toque |
| Kanban (cozinha) | Coluna única com tabs para alternar entre status |
| PDV (caixa) | Otimizar para toque, botões grandes, layout simplificado |

### Viewports a testar

- 360x800 (Android pequeno)
- 390x844 (iPhone 14)
- 412x915 (Android grande)
- 768px (tablet)

---

## PARTE 5 — Testes E2E Comerciais

### Testes existentes (11 testes, 4 arquivos)

| Arquivo | Testes |
|---|---|
| `login.spec.ts` | 4 (login válido, inválido, super_admin redirect, unauthenticated) |
| `navigation.spec.ts` | 2 (sidebar nav, upgrade access) |
| `clientes.spec.ts` | 3 (list, create, view) |
| `orcamentos.spec.ts` | 2 (list, view) |

### Testes a criar

| # | Cenário | Arquivo |
|---|---|---|
| 1 | Super Admin cria empresa com responsável | `admin-empresa.spec.ts` |
| 2 | Responsável recebe link de convite (copiável se sem Resend) | `admin-empresa.spec.ts` |
| 3 | Responsável define senha via link | `convite-admin.spec.ts` |
| 4 | Responsável faz login na empresa correta | `convite-admin.spec.ts` |
| 5 | Responsável usa sistema em viewport mobile (360x800) | `mobile-basic.spec.ts` |
| 6 | Empresa tenta acessar módulo inativo | `module-guard.spec.ts` |
| 7 | Redirecionado para `/upgrade?module=X` | `module-guard.spec.ts` |
| 8 | Seleciona módulo comprável no upgrade | `stripe-modular.spec.ts` |
| 9 | Checkout Stripe test é criado com items corretos | `stripe-modular.spec.ts` |
| 10 | Webhook Stripe test ativa módulo | `stripe-modular.spec.ts` |
| 11 | Módulo fica acessível após ativação | `stripe-modular.spec.ts` |
| 12 | Webhook repetido não duplica ativação | `stripe-modular.spec.ts` |
| 13 | Cancelamento desativa módulos não-core | `stripe-modular.spec.ts` |
| 14 | Basic/Pro legado NÃO aparece para novas vendas | `stripe-modular.spec.ts` |
| 15 | Trial limits bloqueiam criação | `trial-limits.spec.ts` |
| 16 | OS fluxo completo (criar → status → fechar) | `ordens-servico.spec.ts` |
| 17 | Financeiro fluxo (criar transação → pagar → cancelar) | `financeiro.spec.ts` |
| 18 | Cardápio fluxo (criar item → mesa → pedido) | `cardapio.spec.ts` |
| 19 | Responsividade mobile em páginas críticas | `mobile-responsiveness.spec.ts` |

---

## PARTE 6 — Relatório Final

### 1. Estado real do Basic/Pro

O modelo Basic/Pro existe APENAS no código backend (`stripe.ts`, checkout API, webhook). A UI já foi migrada para o modelo modular. Os Price IDs vêm de env vars. **Não há referência a "Basic" ou "Pro" em nenhuma página visível ao usuário.**

### 2. Arquivos e rotas do Stripe legado

| Arquivo | O que contém | Ação |
|---|---|---|
| `src/lib/stripe.ts` | `PLANS` com basic/pro, `getStripe()`, `getAppUrl()` | Remover `PLANS`, reescrever para modular |
| `src/app/api/stripe/checkout/route.ts` | Checkout usando `PLANS[plan].priceId` | Reescrever para criar subscription com items modulares |
| `src/app/api/stripe/webhook/route.ts` | Webhook legado (ativa módulo via metadata) | Reescrever para gerenciar subscription items |
| `src/app/api/stripe/portal/route.ts` | Customer Portal (OK, sem Basic/Pro) | Manter, configurar para permitir add/remove |
| `src/app/(dashboard)/upgrade/page.tsx` | Envia `plan: "basic"` fixo | Reescrever para usar fluxo modular |
| `README_DEPLOY.md` | `STRIPE_BASIC_PRICE_ID`, `STRIPE_PRO_PRICE_ID` | Atualizar com novos env vars |
| `docs/arquitetura-sistema.md` | Referência a Basic/Pro | Atualizar |

### 3. Conflitos entre Basic/Pro e modular

| Conflito | Detalhe | Resolução |
|---|---|---|
| Preço divergente | Basic cobra R$49 fixo, modular calcula R$49-R$144+ | Checkout modular com items dinâmicos |
| Plan name divergente | "Básico"/"Profissional" vs "Inicial"/"Crescimento"/"Profissional"/"Completo" | Padronizar nos nomes modulares |
| Módulo por subscription | Cada módulo cria uma subscription separada | Usar subscription items na mesma subscription |
| `planName` em Company | Campo legado sem uso real | Substituir por `calculateMonthlyPrice()` |
| `Module.basePrice` no BD | Editável pelo admin, mas pricing.ts ignora | Remover divergência — unificar fonte de verdade |
| Webhook não diferencia | Cancelar subscription cancela TUDO | Webhook modular que gerencia items individualmente |

### 4. Dados/assinaturas que exigem compatibilidade

**⚠️ VERIFICAÇÃO PENDENTE:** Precisa confirmar no Stripe Dashboard se existem customers e subscriptions reais. Se existirem, será necessário manter compatibilidade durante a transição.

### 5. Estratégia recomendada

**Estratégia A** (se não há clientes reais):
1. Remover `PLANS` de `stripe.ts`
2. Reescrever checkout para modelo modular
3. Reescrever webhook para subscription items
4. Criar novos Price IDs no Stripe (modo teste)
5. Atualizar env vars
6. Atualizar documentação

### 6. Modelo Stripe recomendado

**Opção 1: Subscription com múltiplos items**
- 1 Stripe Subscription por empresa
- 1 Subscription Item por módulo ativo
- Price IDs individuais por módulo
- Base price como primeiro item

Vantagens: faturamento unificado, pró-rata automático, portal nativo, menos complexidade
Riscos: precisa migrar subscription existente (se houver)
Impacto no webhook: novos eventos para `subscription_item.created/deleted`
Impacto em upgrade: adicionar item à subscription existente
Impacto no portal: configurar para permitir add/remove de items

### 7. Mudanças de schema necessárias

```prisma
model CompanyModule {
  // ... campos existentes
  stripeSubscriptionItemId String?   // Vincula ao subscription_item no Stripe
}

model Subscription {
  // ... campos existentes
  stripeStatus String?              // Status real do Stripe (active, past_due, etc.)
}
```

⚠️ **Não criar migration sem aprovação.**

### 8. Fluxo do primeiro administrador

1. Super Admin preenche formulário com dados da empresa + dados do responsável
2. Backend cria Company + CompanyModules + Subscription + User (COMPANY_ADMIN) + PasswordResetToken em transaction
3. Sistema gera link de convite: `/reset-password?token=XXX`
4. Se Resend configurado → envia email. Se não → retorna link copiável.
5. Responsável acessa link, define senha, faz login

**Não exige alteração de schema.** Exige alteração em 3 arquivos.

### 9. Resultado da auditoria mobile

Ver tabela na PARTE 4 acima. 21 páginas/componentes analisados. Prioridade alta em 10 itens (tabelas, formulários, kanban, PDV, gráficos, cardápio público).

### 10. Arquivos a alterar

| Arquivo | Alteração |
|---|---|
| `src/lib/stripe.ts` | Remover `PLANS`, adicionar funções modulares, mapear moduleKey→priceId |
| `src/lib/pricing.ts` | Manter, possivelmente ajustar |
| `src/app/api/stripe/checkout/route.ts` | Reescrever para checkout modular com subscription items |
| `src/app/api/stripe/webhook/route.ts` | Reescrever para gerenciar subscription items |
| `src/app/api/stripe/portal/route.ts` | Configurar para permitir add/remove de items |
| `src/app/(dashboard)/upgrade/page.tsx` | Reescrever para enviar moduleKey sem `plan: "basic"` |
| `src/app/api/empresas/route.ts` | Adicionar criação de User + PasswordResetToken |
| `src/app/(admin)/admin/empresas/novo/page.tsx` | Adicionar campos do responsável |
| `src/app/(admin)/admin/empresas/[id]/page.tsx` | Mostrar link de convite e status do admin |
| `src/lib/email.ts` | Adicionar template de email de convite |
| `prisma/schema.prisma` | Adicionar `stripeSubscriptionItemId` em CompanyModule, `stripeStatus` em Subscription |
| `README_DEPLOY.md` | Atualizar env vars |
| `docs/arquitetura-sistema.md` | Atualizar modelo de preços |
| ~15 arquivos de UI | Responsividade mobile (a ser mapeado com screenshots) |

### 11. Testes a criar

Ver PARTE 5 — ~19 cenários de teste em 7 arquivos novos + expansão dos 4 existentes.

### 12. Riscos

| Risco | Mitigação |
|---|---|
| Assinaturas reais no Stripe legado | Verificar Dashboard antes de remover Basic/Pro |
| Webhook duplica ativação | Idempotência: verificar se CompanyModule já está ativo |
| Migration quebra dados existentes | Adicionar campos nullable, sem remover colunas |
| Stripe Customer sem subscription | Verificar no checkout se empresa já tem subscription antes de criar nova |
| Email de convite não enviado | Fallback de link copiável sempre disponível |
| Responsividade mobile | Abordagem página por página, sem classe genérica |
| Build/typecheck falhando | Rodar `npx tsc --noEmit` antes de cada commit |
| E2E instável | Usar selectors estáveis, waits explícitos |

### 13. Ordem de implementação

| Fase | O que | Arquivos | Risco |
|---|---|---|---|
| **Fase 1** | Criar primeiro administrador na criação de empresa | `empresas/route.ts`, `empresas/novo/page.tsx`, `empresas/[id]/page.tsx`, `email.ts` | Baixo |
| **Fase 2** | Reescrever Stripe checkout modular | `stripe.ts`, `checkout/route.ts`, `upgrade/page.tsx` | Médio |
| **Fase 3** | Reescrever Stripe webhook modular | `webhook/route.ts`, `portal/route.ts` | Médio |
| **Fase 4** | Schema migration (adicionar campos) | `schema.prisma` | Baixo (campos nullable) |
| **Fase 5** | Limpar legado Basic/Pro | `stripe.ts` (remover PLANS), `README_DEPLOY.md`, docs | Baixo (se não há clientes reais) |
| **Fase 6** | Responsividade mobile | ~15 arquivos de UI | Médio |
| **Fase 7** | Testes E2E comerciais | ~7 arquivos de spec | Baixo |
| **Fase 8** | Verificação final: build + typecheck + E2E | CI | Baixo |

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
- ❌ Não aplicar redesign geral novamente
- ❌ Não reintroduzir Framer Motion como dependência para conteúdo aparecer
- ✅ Manter build, typecheck e E2E passando
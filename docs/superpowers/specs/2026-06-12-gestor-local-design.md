# Gestor Local — SaaS Multiempresa Modular

**Data:** 2026-06-12
**Status:** Aprovado pelo usuário
**Fase:** Design → Implementação

---

## 1. Visão do Produto

Gestor Local é uma plataforma SaaS modular de gestão para pequenos negócios brasileiros.

Não é um "sisteminha". É uma plataforma profissional onde cada empresa acessa seus próprios dados isolados e desbloqueia módulos conforme o plano contratado.

O produto funciona como uma plataforma única, multiempresa, com módulos ativáveis por assinatura.

### Modelo de Negócio

- Teste grátis: 15 dias, 1 módulo, 1 usuário, limites de uso
- Sem setup inicial
- Pagamento mensal (Pix/manual no início, sem gateway automático)
- Admin ativa/desativa módulos manualmente
- Admin controla início e fim do teste grátis
- Admin converte empresa de teste para pagante
- Admin pode suspender empresa inadimplente
- Módulos bloqueados aparecem com cadeado
- Rotas de módulos bloqueados são protegidas (não é apenas bloqueio visual)

### Preços

**Base da plataforma:** R$49/mês

**Regra de módulos:**
- 1º módulo ativo: +R$50/mês
- 2º módulo ativo: +R$30/mês
- 3º módulo ativo: +R$25/mês
- 4º módulo em diante: +R$20/mês cada

**Planos comerciais:**
| Plano | Módulos | Valor |
|-------|---------|-------|
| Inicial | 1 | R$99/mês |
| Crescimento | 2 | R$129/mês |
| Profissional | 3 | R$154/mês |
| Completo | 5 | R$194/mês |

Tecnicamente, o sistema calcula pelo número de módulos ativos. Os planos são nomes comerciais.

### Limites do Teste Grátis

- Até 20 clientes
- Até 20 orçamentos
- Até 20 ordens de serviço
- 1 usuário
- PDF padrão (sem logo personalizada, com marca d'água "Plano Trial")
- Sem importação em massa
- Sem customização avançada

---

## 2. Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router, TypeScript) |
| Banco | PostgreSQL 16 |
| ORM | Prisma |
| Auth | NextAuth.js (Auth.js v5) |
| UI | Tailwind CSS + Radix UI + shadcn/ui |
| PDF | @react-pdf/renderer |
| WhatsApp | Links wa.me (sem API) |
| Idioma | pt-BR |
| Infra | Docker Compose (Next.js + PG + Nginx) |
| Deploy | VPS |

---

## 3. Arquitetura

### Diagrama

```
┌─────────────────────────────────────────┐
│                  Nginx                   │
│            (reverse proxy + SSL)         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│              Next.js App                 │
│  ┌──────────┬──────────┬───────────┐    │
│  │ App      │ Server   │ Server     │    │
│  │ Router   │ Actions  │ Components│    │
│  │ (pages)  │ (API)    │ (RSC)     │    │
│  └──────────┴──────────┴───────────┘    │
│  ┌──────────────────────────────────┐   │
│  │    Middleware (auth + tenant)     │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │    Prisma (with tenant filter)   │   │
│  └──────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           PostgreSQL 16                  │
│  (shared schema + RLS per company_id)    │
└─────────────────────────────────────────┘
```

### Abordagem Multiempresa

**Shared schema + RLS + Prisma middleware** (Abordagem A aprovada)

- Todas as empresas compartilham as mesmas tabelas
- Cada linha tem `company_id`
- Isolamento garantido por 3 camadas:
  1. Middleware Next.js: resolve companyId do usuário logado
  2. Prisma extension: injeta `company_id` automaticamente em queries
  3. PostgreSQL RLS: fail-safe no nível do banco

---

## 4. Estrutura de Pastas

```
saas-gestao/
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── nginx/
│       └── default.conf
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (admin)/
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── empresas/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── novo/page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   └── modulos/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── clientes/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── orcamentos/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── ordens-servico/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── upgrade/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── empresas/
│   │   │   ├── clientes/
│   │   │   ├── orcamentos/
│   │   │   ├── ordens-servico/
│   │   │   ├── modulos/
│   │   │   └── pdf/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── module-card.tsx
│   │   ├── admin/
│   │   └── modules/
│   │       ├── client-form.tsx
│   │       ├── quote-form.tsx
│   │       └── service-order-form.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── pricing.ts
│   │   ├── module-guard.ts
│   │   ├── company-limits.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-modules.ts
│   │   └── use-company.ts
│   ├── types/
│   │   └── index.ts
│   └── middleware.ts
├── public/
├── .env
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. Modelo de Banco de Dados

### User

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| email | String (unique) | Login |
| name | String | Nome completo |
| passwordHash | String | Senha hasheada (bcrypt) |
| role | UserRole | SUPER_ADMIN / COMPANY_ADMIN / STAFF |
| companyId | String (FK) | Empresa do usuário |
| active | Boolean | Usuário ativo/inativo |
| createdAt | DateTime | Criação |
| updatedAt | DateTime | Atualização |

### Company

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| name | String | Razão social |
| tradeName | String? | Nome fantasia |
| document | String? | CNPJ/CPF |
| phone | String? | Telefone |
| whatsapp | String? | WhatsApp |
| email | String? | E-mail |
| address | String? | Endereço |
| status | CompanyStatus | TRIAL / ACTIVE / SUSPENDED / CANCELLED |
| trialStartsAt | DateTime? | Início do teste |
| trialEndsAt | DateTime? | Fim do teste |
| planName | String? | Nome do plano |
| monthlyPrice | Decimal(10,2)? | Mensalidade |
| createdAt | DateTime | Criação |
| updatedAt | DateTime | Atualização |

### Module

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| key | String (unique) | "customers", "quotes", etc. |
| name | String | Nome de exibição |
| description | String? | Descrição |
| basePrice | Decimal(10,2) | Preço base do módulo |
| active | Boolean | Disponível no sistema |
| sortOrder | Int | Ordem de exibição |
| createdAt | DateTime | Criação |
| updatedAt | DateTime | Atualização |

**Módulos do seed:**
1. customers — Clientes
2. quotes — Orçamentos
3. service_orders — Ordem de Serviço
4. inventory — Estoque
5. scheduling — Agendamento
6. catalog — Catálogo com WhatsApp
7. menu — Cardápio Digital
8. finance — Financeiro simples
9. reports — Relatórios
10. users_permissions — Usuários e Permissões

### CompanyModule

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| companyId | String (FK) | Empresa |
| moduleKey | String (FK) | Chave do módulo |
| active | Boolean | Módulo ativo para a empresa |
| price | Decimal(10,2)? | Preço pago |
| activatedAt | DateTime? | Data de ativação |
| deactivatedAt | DateTime? | Data de desativação |
| createdAt | DateTime | Criação |
| updatedAt | DateTime | Atualização |

Unique: `[companyId, moduleKey]`

### Subscription

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| companyId | String (unique FK) | Empresa |
| status | SubscriptionStatus | TRIAL / ACTIVE / SUSPENDED / CANCELLED |
| planName | String? | Nome do plano |
| basePrice | Decimal(10,2) | Base (R$49) |
| modulesCount | Int | Número de módulos ativos |
| monthlyPrice | Decimal(10,2) | Total calculado |
| trialEndsAt | DateTime? | Fim do teste |
| currentPeriodStartsAt | DateTime? | Início do período |
| currentPeriodEndsAt | DateTime? | Fim do período |
| paymentMethod | String? | pix, manual |
| notes | String? | Observações |
| createdAt | DateTime | Criação |
| updatedAt | DateTime | Atualização |

### Customer

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| companyId | String (FK) | Empresa (isolamento) |
| name | String | Nome |
| phone | String? | Telefone |
| whatsapp | String? | WhatsApp |
| email | String? | E-mail |
| document | String? | CPF/CNPJ |
| address | String? | Endereço |
| notes | String? | Observações |
| createdAt | DateTime | Criação |
| updatedAt | DateTime | Atualização |

### Quote

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| companyId | String (FK) | Empresa |
| customerId | String (FK) | Cliente |
| number | Int | Número sequencial (por empresa, unique com companyId) |
| status | QuoteStatus | DRAFT / SENT / APPROVED / REJECTED / EXPIRED |
| description | String? | Descrição |
| subtotal | Decimal(10,2) | Subtotal |
| discount | Decimal(10,2) | Desconto |
| total | Decimal(10,2) | Total |
| validUntil | DateTime? | Validade |
| notes | String? | Observações |
| createdAt | DateTime | Criação |
| updatedAt | DateTime | Atualização |

### QuoteItem

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| quoteId | String (FK, cascade) | Orçamento |
| description | String | Descrição do item |
| quantity | Decimal(10,2) | Quantidade |
| unitPrice | Decimal(10,2) | Preço unitário |
| total | Decimal(10,2) | Total (qty × price) |
| createdAt | DateTime | Criação |
| updatedAt | DateTime | Atualização |

### ServiceOrder

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| companyId | String (FK) | Empresa |
| customerId | String (FK) | Cliente |
| quoteId | String? (FK) | Orçamento vinculado |
| number | Int | Número sequencial (por empresa, unique com companyId) |
| status | ServiceOrderStatus | OPENED / IN_PROGRESS / WAITING_PARTS / FINISHED / DELIVERED / CANCELLED |
| problemDescription | String? | Descrição do problema |
| serviceDescription | String? | Descrição do serviço |
| total | Decimal(10,2) | Total |
| paidAmount | Decimal(10,2) | Valor pago |
| paymentStatus | PaymentStatus | PENDING / PARTIAL / PAID / CANCELLED |
| openedAt | DateTime | Data de abertura |
| finishedAt | DateTime? | Data de finalização |
| notes | String? | Observações |
| createdAt | DateTime | Criação |
| updatedAt | DateTime | Atualização |

### ServiceOrderItem

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String (cuid) | PK |
| serviceOrderId | String (FK, cascade) | OS |
| description | String | Descrição do item |
| quantity | Decimal(10,2) | Quantidade |
| unitPrice | Decimal(10,2) | Preço unitário |
| total | Decimal(10,2) | Total (qty × price) |
| createdAt | DateTime | Criação |
| updatedAt | DateTime | Atualização |

---

## 6. Função Central de Pricing

```typescript
// lib/pricing.ts
const BASE_PRICE = 49.00;
const MODULE_PRICES = [50, 30, 25]; // 1º, 2º, 3º módulo
const ADDITIONAL_PRICE = 20;        // 4º em diante

export function calculateMonthlyPrice(activeModulesCount: number): number {
  if (activeModulesCount === 0) return BASE_PRICE;
  let total = BASE_PRICE;
  for (let i = 0; i < activeModulesCount; i++) {
    if (i < MODULE_PRICES.length) {
      total += MODULE_PRICES[i];
    } else {
      total += ADDITIONAL_PRICE;
    }
  }
  return total;
}

// Exemplos:
// 1 módulo:  49 + 50         = R$99
// 2 módulos: 49 + 50 + 30    = R$129
// 3 módulos: 49 + 50 + 30 + 25 = R$154
// 5 módulos: 49 + 50 + 30 + 25 + 20 + 20 = R$194
```

---

## 7. Autenticação e Multiempresa

### NextAuth.js v5

- Provider: Credentials (email + senha)
- Session: JWT em cookie httpOnly
- Callbacks injetam: `companyId`, `role`, `companyStatus` no token
- Redirect pós-login:
  - SUPER_ADMIN → `/admin`
  - COMPANY_ADMIN / STAFF → `/dashboard`

### Fluxo de Login

1. Usuário informa email + senha
2. Server verifica credenciais contra tabela User
3. Verifica `User.active = true` e `Company.status` não é SUSPENDED/CANCELLED
4. Gera JWT com: userId, email, role, companyId, companyStatus
5. Redireciona para o painel correto

### Isolamento de Dados (3 Camadas)

**Camada 1 — Middleware Next.js:**
- Verifica autenticação
- Resolve companyId do usuário logado
- Seta header `x-company-id`

**Camada 2 — Prisma Extension:**
- Toda query de leitura recebe automaticamente `where: { companyId }`
- Toda criação recebe automaticamente `data: { companyId }`
- Exceto tabelas globais: Module

**Camada 3 — PostgreSQL RLS:**
- Row Level Security ativado em todas as tabelas com `company_id`
- Policy: `USING (company_id = current_setting('app.company_id')::text)`
- Prisma seta `SET app.company_id = 'xxx'` antes de cada query

### Proteção de Módulos

1. Middleware verifica se empresa tem módulo ativo em `CompanyModule`
2. Se bloqueado:
   - Frontend: card com cadeado, click redireciona para `/upgrade?module=KEY`
   - Middleware: intercepta URL, redireciona para `/upgrade`
   - API: retorna 403 "Módulo não contratado"
3. Rotas protegidas: `/clientes/*`, `/orcamentos/*`, `/ordens-servico/*`

### Controle de Teste Grátis

- Admin define `trialStartsAt` e `trialEndsAt`
- Middleware verifica se trial expirou
- Se expirado → empresa pode ser suspensa (admin confirma)
- Empresa em trial: 1 módulo, 1 usuário, limites de uso

---

## 8. Papéis e Permissões

| Ação | SUPER_ADMIN | COMPANY_ADMIN | STAFF |
|------|:---:|:---:|:---:|
| Gerenciar empresas | ✅ | ❌ | ❌ |
| Ativar/desativar módulos | ✅ | ❌ | ❌ |
| Controlar teste grátis | ✅ | ❌ | ❌ |
| Ver mensalidade | ✅ | ❌ | ❌ |
| Gerenciar usuários da empresa | ✅ | ✅ | ❌ |
| CRUD clientes | ✅ | ✅ | ✅ |
| CRUD orçamentos | ✅ | ✅ | ✅ |
| CRUD OS | ✅ | ✅ | ✅ |
| Gerar PDF | ✅ | ✅ | ✅ |
| Enviar WhatsApp | ✅ | ✅ | ✅ |

---

## 9. Funcionalidades dos Módulos MVP

### Dashboard da Empresa

- Cards com métricas: total clientes, orçamentos pendentes, OS abertas
- Grid de módulos: ativos (clicáveis) e bloqueados (cadeado)
- Aviso se trial próximo do vencimento
- Banner de upgrade se status = TRIAL

### Módulo Clientes

- Lista paginada com busca por nome, telefone, WhatsApp
- CRUD completo
- Histórico de orçamentos e OS do cliente
- Limite trial: 20 clientes

### Módulo Orçamentos

- Lista com filtros por status
- Criar: selecionar cliente, adicionar itens, subtotal/desconto/total, validade, observações
- Editar apenas se DRAFT
- Alterar status: DRAFT → SENT → APPROVED/REJECTED
- Gerar PDF
- Enviar pelo WhatsApp (link wa.me)
- Converter orçamento aprovado em OS
- Limite trial: 20 orçamentos

### Módulo Ordem de Serviço

- Lista com filtros por status
- Criar: cliente, orçamento vinculado (opcional), problema, serviço, itens, pagamento
- Alterar status: OPENED → IN_PROGRESS → FINISHED → DELIVERED
- Gerar PDF
- Enviar pelo WhatsApp
- Registrar pagamento
- Limite trial: 20 OS

### PDF — Orçamento

- Header: dados da empresa
- Dados do cliente
- Número + data + validade
- Tabela de itens
- Subtotal, desconto, total
- Observações + status
- Rodapé: "Orçamento gerado pelo Gestor Local"
- Trial: marca d'água "Plano Trial", sem logo

### PDF — Ordem de Serviço

- Header: dados da empresa
- Dados do cliente
- Número da OS + data de abertura
- Status
- Descrição do problema e serviço
- Tabela de itens
- Total + pagamento
- Observações
- Rodapé: "OS gerada pelo Gestor Local"
- Trial: marca d'água "Plano Trial", sem logo

### WhatsApp

- Links wa.me com mensagem pronta
- Orçamento: "Olá [Nome]! Segue orçamento #[N] no valor de R$[Total]."
- OS finalizada: "Olá [Nome]! Sua OS #[N] foi finalizada. Valor: R$[Total]."
- OS entregue: "Olá [Nome]! Sua OS #[N] foi marcada como entregue."

### Painel Admin Global

- Dashboard: total empresas, ativas, em teste, suspensas
- Lista de empresas com filtros
- Criar empresa com status trial/ativo
- Editar empresa: dados + módulos + status
- Ver detalhes: dados, módulos, mensalidade calculada, usuários
- Suspender/reativar empresa
- Converter trial para ativo

---

## 10. Plano de Implementação

| Etapa | O que fazer | Modelo | Skill |
|-------|-------------|--------|-------|
| 1 | Planejamento e design | GLM 5.1 | GStack + brainstorming |
| 2 | Estrutura base (Next.js, Prisma, Docker) | GLM 5.1 | GStack |
| 3 | Auth + multiempresa + RLS | GLM 5.1 | GStack |
| 4 | Sistema de módulos + pricing | GLM 5.1 | GStack |
| 5 | Admin global | GLM 5.1 | GStack |
| 6 | Dashboard empresa + upgrade | DeepSeek Flash | GStack |
| 7 | CRUD clientes | DeepSeek Flash | GStack |
| 8 | CRUD orçamentos + itens | DeepSeek Flash | GStack |
| 9 | CRUD OS + itens + pagamento | DeepSeek Flash | GStack |
| 10 | PDF orçamento + OS | DeepSeek Flash | GStack |
| 11 | WhatsApp links | DeepSeek Flash | GStack |
| 12 | Seeds + testes de isolamento | DeepSeek Flash | GStack |
| 13 | Bug fixes | DeepSeek Pro (se difícil) | investigate |
| 14 | Visual premium | **Kimi 2.6** | **Emil + Taste** |
| 15 | Ajustes finais | DeepSeek Flash | GStack |

### Gatilho para trocar para Kimi 2.6

Depois que a Etapa 12 estiver completa e o sistema funcionar end-to-end:

> "Agora é uma boa hora para trocar para Kimi 2.6 e usar Emil/Taste para refinar o visual."

### Uso de GStack

- Arquitetura SaaS: padrões de multiempresa, auth, módulos
- /autoplan: revisão automática do plano
- /investigate: debug de problemas difíceis
- /qa: testar sistema no browser
- /review: revisão de código
- /ship: deploy para VPS

### Uso de Superpowers

- brainstorming: design colaborativo (usado)
- writing-plans: plano de implementação detalhado
- systematic-debugging: resolver bugs
- verification-before-completion: verificar cada etapa
- test-driven-development: testes de isolamento

---

## 11. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Vazamento de dados entre empresas | RLS + Prisma middleware + testes automatizados |
| Esquecer filtro company_id | Prisma extension injeta automaticamente |
| Módulo burlável por URL | Proteção no middleware + API + testes |
| RLS mal configurado | Teste cross-tenant |
| Trial com uso além do limite | Verificação em server actions |
| PDF pesado na VPS | @react-pdf/renderer é leve |
| Docker complexo | Docker Compose simples |

---

## 12. Decisões Tomadas

- ✅ Banco: PostgreSQL + Prisma (self-hosted)
- ✅ Framework: Next.js 15 full-stack (App Router)
- ✅ Auth: NextAuth.js v5 (Credentials + JWT)
- ✅ UI: Tailwind CSS + Radix UI + shadcn/ui
- ✅ PDF: @react-pdf/renderer (server-side, leve)
- ✅ WhatsApp: Links wa.me (sem API)
- ✅ Deploy: VPS com Docker Compose
- ✅ Idioma: pt-BR
- ✅ Multiempresa: Shared schema + RLS + Prisma middleware
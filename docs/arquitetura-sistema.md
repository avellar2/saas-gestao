# Arquitetura do Gestor Local — Visão Completa

> Documento técnico detalhado do sistema.
> Criado para que um LLM (GPT/Claude) entenda o projeto por completo.

---

## 1. Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16.2.9 |
| Linguagem | TypeScript | 5.x |
| Banco | PostgreSQL | 16 (Alpine) |
| ORM | Prisma | 7.8.0 |
| Autenticação | NextAuth v5 | beta |
| Pagamentos | Stripe | SDK latest |
| Email | Resend | SDK latest |
| Monitoramento | Sentry | 10.57.0 |
| CSS | Tailwind CSS | 4.x |
| Componentes | shadcn/ui + Base UI | React 19 |
| Animações | Framer Motion | 12.x |
| PDF | @react-pdf/renderer | 4.x |
| Ícones | Phosphor + Lucide | latest |
| Testes | Playwright | latest |
| Container | Docker + Docker Compose | latest |
| Proxy reverso | Caddy (SSL automático) | 2 Alpine |
| CI/CD | GitHub Actions | latest |

---

## 2. Estrutura de Diretórios

```
saas-gestao/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Rotas públicas de autenticação
│   │   │   ├── login/       # Página de login
│   │   │   ├── forgot-password/  # Esqueci senha
│   │   │   └── reset-password/  # Resetar senha
│   │   ├── (dashboard)/     # Rotas protegidas (empresas)
│   │   │   ├── dashboard/   # Home do dashboard
│   │   │   ├── clientes/    # CRUD clientes
│   │   │   ├── orcamentos/  # CRUD orçamentos
│   │   │   ├── ordens-servico/  # CRUD OS
│   │   │   ├── estoque/     # CRUD estoque
│   │   │   ├── financeiro/  # CRUD financeiro
│   │   │   ├── agendamento/ # CRUD agendamentos
│   │   │   ├── catalogo/    # Catálogo WhatsApp
│   │   │   ├── cardapio/    # Cardápio digital
│   │   │   ├── relatorios/  # Relatórios gerenciais
│   │   │   ├── usuarios/    # Usuários da empresa
│   │   │   ├── atividades/  # Log de atividades
│   │   │   └── upgrade/     # Página de upgrade de plano
│   │   ├── (admin)/         # Rotas do Super Admin
│   │   │   └── admin/
│   │   │       ├── empresas/  # CRUD de empresas
│   │   │       └── modulos/   # Gerenciar módulos
│   │   ├── api/             # API routes
│   │   ├── layout.tsx       # Layout raiz
│   │   ├── page.tsx         # Landing page
│   │   ├── error.tsx        # Página de erro global
│   │   ├── loading.tsx      # Loading global
│   │   └── not-found.tsx    # 404 global
│   ├── components/
│   │   ├── layout/          # Sidebar, module-card
│   │   ├── modules/         # Forms de cada módulo
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   ├── prisma.ts        # Cliente Prisma + tenantPrisma
│   │   ├── auth.ts          # Config NextAuth
│   │   ├── email.ts         # Serviço de email (Resend)
│   │   ├── stripe.ts        # Serviço Stripe
│   │   ├── api-handler.ts   # Handler genérico de API
│   │   ├── rate-limit.ts    # Rate limiting
│   │   ├── validations.ts   # Schemas Zod
│   │   ├── module-guard.ts  # Verificar módulo ativo
│   │   ├── company-limits.ts # Limites por plano
│   │   ├── activity-log.ts  # Log de atividades
│   │   └── csv-export.ts    # Exportar CSV
│   ├── hooks/
│   │   ├── use-company.ts   # Hook da empresa atual
│   │   └── use-modules.ts   # Hook dos módulos ativos
│   ├── middleware.ts         # Middleware Next.js
│   └── types/
│       └── index.ts         # Tipos globais
├── prisma/
│   ├── schema.prisma        # Schema do banco
│   ├── migrations/          # Migrations
│   ├── seed.ts              # Seed de desenvolvimento
│   └── tests/               # Testes de RLS
├── docker/
│   ├── Dockerfile           # Dockerfile da app
│   ├── docker-compose.yml   # Docker local
│   └── caddy/               # Config Caddy
├── scripts/
│   ├── deploy.sh            # Deploy na VPS
│   ├── backup.sh            # Backup do banco
│   ├── restore.sh           # Restore do banco
│   └── ssh-vps.py           # Script SSH auxiliar
├── e2e/                     # Testes Playwright
├── playwright.config.ts     # Config Playwright
├── next.config.ts           # Config Next.js
├── prisma.config.ts         # Config Prisma v7
├── sentry.client.config.ts  # Sentry client
├── sentry.server.config.ts  # Sentry server
└── sentry.edge.config.ts    # Sentry edge
```

---

## 3. Banco de Dados (Prisma Schema)

### 3.1 Modelos Principais

#### Company (Empresa)
```
id            String    @id @default(uuid())
name          String    (nome da empresa)
slug          String    @unique (slug único)
status        CompanyStatus (TRIAL | ACTIVE | SUSPENDED | CANCELLED)
trialEndsAt   DateTime? (fim do trial)
stripeCustomerId String? (ID no Stripe)
stripeSubscriptionId String?
stripePriceId String?
createdAt     DateTime
updatedAt     DateTime
users         User[]    (usuários da empresa)
customers     Customer[] (clientes da empresa)
quotes        Quote[]   (orçamentos)
serviceOrders ServiceOrder[] (OS)
products      Product[] (estoque)
transactions  Transaction[] (financeiro)
appointments  Appointment[] (agendamentos)
catalogItems  CatalogItem[] (catálogo)
menuItems     MenuItem[] (cardápio)
activityLogs  ActivityLog[] (logs)
companyModules CompanyModule[] (módulos ativos)
```

#### User (Usuário)
```
id            String    @id @default(uuid())
companyId     String?   (null = super admin)
name          String
email         String    @unique
password      String    (hash bcrypt)
role          UserRole (SUPER_ADMIN | ADMIN | STAFF)
company       Company?  @relation
createdAt     DateTime
updatedAt     DateTime
```

#### Customer (Cliente)
```
id            String    @id @default(uuid())
companyId     String
name          String
phone         String?
whatsapp      String?
email         String?
document      String?   (CPF/CNPJ)
address       String?
notes         String?
company       Company   @relation
quotes        Quote[]
serviceOrders ServiceOrder[]
appointments  Appointment[]
transactions  Transaction[]
createdAt     DateTime
updatedAt     DateTime
```

#### Quote (Orçamento)
```
id            String    @id @default(uuid())
companyId     String
customerId    String
items         QuoteItem[] (itens do orçamento)
discount      Decimal?  (desconto)
total         Decimal
status        QuoteStatus (PENDING | APPROVED | REJECTED)
customer      Customer  @relation
company       Company   @relation
createdAt     DateTime
updatedAt     DateTime
```

#### QuoteItem (Item do Orçamento)
```
id            String    @id @default(uuid())
quoteId       String
description   String
quantity      Decimal
unitPrice     Decimal
total         Decimal
quote         Quote     @relation
```

#### ServiceOrder (Ordem de Serviço)
```
id            String    @id @default(uuid())
companyId     String
customerId    String
items         ServiceOrderItem[]
problemDescription String?
serviceDescription String?
status        OSStatus (PENDING | IN_PROGRESS | COMPLETED | CANCELLED)
customer      Customer  @relation
company       Company   @relation
createdAt     DateTime
updatedAt     DateTime
```

#### Product (Produto/Estoque)
```
id            String    @id @default(uuid())
companyId     String
name          String
sku           String?
category      String?
quantity      Int       (estoque atual)
minStock      Int       (estoque mínimo)
costPrice     Decimal?  (preço de custo)
salePrice     Decimal?  (preço de venda)
description   String?
company       Company   @relation
createdAt     DateTime
updatedAt     DateTime
```

#### Transaction (Financeiro)
```
id            String    @id @default(uuid())
companyId     String
customerId    String?   (opcional)
type          TransactionType (INCOME | EXPENSE)
category      String
description   String
amount        Decimal
dueDate       DateTime
paymentDate   DateTime?
status        TransactionStatus (PENDING | PAID | OVERDUE | CANCELLED)
company       Company   @relation
customer      Customer? @relation
createdAt     DateTime
updatedAt     DateTime
```

#### Appointment (Agendamento)
```
id            String    @id @default(uuid())
companyId     String
customerId    String
title         String
description   String?
date          DateTime
time          String?   (horário)
status        AppointmentStatus (SCHEDULED | CONFIRMED | CANCELLED | COMPLETED)
company       Company   @relation
customer      Customer  @relation
createdAt     DateTime
updatedAt     DateTime
```

#### CompanyModule (Módulo Ativo)
```
id            String    @id @default(uuid())
companyId     String
moduleKey     ModuleKey (customers | quotes | service_orders | inventory | scheduling | catalog | menu | finance | reports | users_permissions)
active        Boolean   @default(true)
company       Company   @relation
```

#### ActivityLog (Log de Atividades)
```
id            String    @id @default(uuid())
companyId     String
userId        String?
action        String    (CREATE | UPDATE | DELETE)
entity        String    (customer | quote | service_order | etc)
entityId      String?
description   String
metadata      Json?
company       Company   @relation
createdAt     DateTime
```

### 3.2 Enums

```prisma
enum CompanyStatus { TRIAL ACTIVE SUSPENDED CANCELLED }
enum UserRole { SUPER_ADMIN ADMIN STAFF }
enum QuoteStatus { PENDING APPROVED REJECTED }
enum OSStatus { PENDING IN_PROGRESS COMPLETED CANCELLED }
enum TransactionType { INCOME EXPENSE }
enum TransactionStatus { PENDING PAID OVERDUE CANCELLED }
enum AppointmentStatus { SCHEDULED CONFIRMED CANCELLED COMPLETED }
```

### 3.3 ModuleKey (constante no código, não no banco)

```typescript
type ModuleKey =
  | "customers"        // Clientes
  | "quotes"           // Orçamentos
  | "service_orders"   // Ordens de Serviço
  | "inventory"        // Estoque
  | "scheduling"       // Agendamento
  | "catalog"          // Catálogo WhatsApp
  | "menu"             // Cardápio Digital
  | "finance"          // Financeiro
  | "reports"          // Relatórios
  | "users_permissions"; // Usuários e Permissões
```

---

## 4. Autenticação (NextAuth v5)

### 4.1 Fluxo de Login

1. Usuário acessa `/login`
2. Preenche e-mail e senha
3. `signIn("credentials", { email, password, redirect: false })`
4. NextAuth valida no `authorize()`:
   - Busca usuário por e-mail no banco
   - Compara senha com bcrypt
   - Se SUPER_ADMIN: retorna role = SUPER_ADMIN
   - Se ADMIN/STAFF: retorna companyId + role
5. JWT gerado com: id, email, name, role, companyId
6. Redirecionamento:
   - SUPER_ADMIN → `/admin`
   - ADMIN/STAFF → `/dashboard`

### 4.2 Fluxo de Recuperação de Senha

1. Usuário acessa `/forgot-password`
2. Digita e-mail
3. API `POST /api/auth/forgot-password`:
   - Gera token aleatório (crypto.randomBytes)
   - Salva na tabela `PasswordResetToken` com expiry (1 hora)
   - Envia e-mail via Resend com link: `/reset-password?token=xxx`
4. Usuário clica no link
5. API `POST /api/auth/reset-password`:
   - Valida token (não expirado, não usado)
   - Atualiza senha
   - Marca token como usado

### 4.3 Middleware

O middleware (`src/middleware.ts`) protege as rotas:

```typescript
// Rotas públicas (sem autenticação)
const publicRoutes = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/_next",
  "/favicon",
  "/images",
];

// Rotas de admin (requer SUPER_ADMIN)
const adminRoutes = ["/admin"];

// Qualquer outra rota → redireciona para /login se não autenticado
```

---

## 5. Isolamento entre Empresas (RLS)

### 5.1 Como funciona

Cada empresa só vê seus próprios dados. O isolamento é feito via **Row Level Security (RLS)** do PostgreSQL.

1. Uma role `gestor_app` é criada no banco
2. Todas as tabelas tenant têm `companyId` e políticas RLS
3. A função `app.current_company_id()` retorna o company_id da sessão
4. Antes de cada query, a sessão define: `SET app.current_company_id = 'uuid'`
5. O `tenantPrisma(companyId)` no código executa esse SET antes de cada query

### 5.2 tenantPrisma

```typescript
// src/lib/prisma.ts
export function tenantPrisma(companyId: string) {
  return prisma.$extends({
    query: {
      async $allOperations({ args, query }) {
        // Define o company_id na sessão do PostgreSQL
        await prisma.$executeRawUnsafe(
          `SELECT set_config('app.current_company_id', '${companyId}', TRUE)`
        );
        return query(args);
      },
    },
  });
}
```

### 5.3 Políticas RLS (exemplo)

```sql
CREATE POLICY tenant_isolation ON customers
  FOR ALL
  USING (company_id = app.current_company_id())
  WITH CHECK (company_id = app.current_company_id());
```

---

## 6. API Routes

### 6.1 Padrão

Todas as APIs seguem o mesmo padrão:

```typescript
// src/app/api/[recurso]/route.ts
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { ... }
export async function PUT(request: NextRequest) { ... }
export async function DELETE(request: NextRequest) { ... }
```

### 6.2 Lista de Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/clientes` | Listar clientes (com busca, ordenação, paginação) |
| POST | `/api/clientes` | Criar cliente |
| GET | `/api/clientes/[id]` | Detalhes do cliente |
| PUT | `/api/clientes/[id]` | Atualizar cliente |
| DELETE | `/api/clientes/[id]` | Excluir cliente |
| GET | `/api/orcamentos` | Listar orçamentos |
| POST | `/api/orcamentos` | Criar orçamento |
| GET | `/api/orcamentos/[id]` | Detalhes do orçamento |
| PUT | `/api/orcamentos/[id]` | Atualizar orçamento |
| DELETE | `/api/orcamentos/[id]` | Excluir orçamento |
| GET | `/api/ordens-servico` | Listar OS |
| POST | `/api/ordens-servico` | Criar OS |
| GET | `/api/ordens-servico/[id]` | Detalhes da OS |
| PUT | `/api/ordens-servico/[id]` | Atualizar OS |
| DELETE | `/api/ordens-servico/[id]` | Excluir OS |
| GET | `/api/estoque` | Listar produtos |
| POST | `/api/estoque` | Criar produto |
| GET | `/api/estoque/[id]` | Detalhes do produto |
| PUT | `/api/estoque/[id]` | Atualizar produto |
| DELETE | `/api/estoque/[id]` | Excluir produto |
| GET | `/api/financeiro` | Listar transações |
| POST | `/api/financeiro` | Criar transação |
| GET | `/api/financeiro/[id]` | Detalhes da transação |
| PUT | `/api/financeiro/[id]` | Atualizar transação |
| DELETE | `/api/financeiro/[id]` | Excluir transação |
| GET | `/api/agendamento` | Listar agendamentos |
| POST | `/api/agendamento` | Criar agendamento |
| GET | `/api/agendamento/[id]` | Detalhes do agendamento |
| PUT | `/api/agendamento/[id]` | Atualizar agendamento |
| DELETE | `/api/agendamento/[id]` | Excluir agendamento |
| GET | `/api/catalogo` | Listar catálogo |
| POST | `/api/catalogo` | Criar item |
| GET | `/api/catalogo/[id]` | Detalhes do item |
| PUT | `/api/catalogo/[id]` | Atualizar item |
| DELETE | `/api/catalogo/[id]` | Excluir item |
| GET | `/api/cardapio` | Listar cardápio |
| POST | `/api/cardapio` | Criar item |
| GET | `/api/cardapio/[id]` | Detalhes do item |
| PUT | `/api/cardapio/[id]` | Atualizar item |
| DELETE | `/api/cardapio/[id]` | Excluir item |
| GET | `/api/usuarios` | Listar usuários |
| POST | `/api/usuarios` | Criar usuário |
| GET | `/api/usuarios/[id]` | Detalhes do usuário |
| PUT | `/api/usuarios/[id]` | Atualizar usuário |
| DELETE | `/api/usuarios/[id]` | Excluir usuário |
| GET | `/api/relatorios` | Relatórios (com filtro de período) |
| GET | `/api/atividades` | Log de atividades |
| GET | `/api/exportar` | Exportar CSV |
| GET | `/api/modulos` | Listar módulos da empresa |
| POST | `/api/modulos` | Ativar/desativar módulo |
| GET | `/api/empresas` | Listar empresas (admin) |
| POST | `/api/empresas` | Criar empresa (admin) |
| GET | `/api/empresas/[id]` | Detalhes empresa (admin) |
| PUT | `/api/empresas/[id]` | Atualizar empresa (admin) |
| POST | `/api/auth/forgot-password` | Solicitar reset de senha |
| POST | `/api/auth/reset-password` | Executar reset de senha |
| POST | `/api/stripe/checkout` | Criar sessão de checkout |
| GET | `/api/stripe/portal` | URL do portal de assinatura |
| POST | `/api/stripe/webhook` | Webhook do Stripe |
| POST | `/api/upload` | Upload de arquivo |
| GET | `/api/uploads/[file]` | Servir arquivo |
| GET | `/api/pdf/orcamento/[id]` | Gerar PDF do orçamento |
| GET | `/api/pdf/os/[id]` | Gerar PDF da OS |
| GET | `/api/cron/trial-expiring` | Cron: notificar trials expirando |

---

## 7. Componentes de UI

### 7.1 shadcn/ui Components

Os seguintes componentes do shadcn/ui estão disponíveis:

- Button, Input, Label, Textarea
- Table, Badge, Card
- Select, Dialog, Sheet
- Skeleton, Avatar
- DropdownMenu, Popover
- Tabs, Separator

### 7.2 Componentes Customizados

| Componente | Descrição |
|-----------|-----------|
| `ModuleCard` | Card de módulo no dashboard |
| `DashboardSidebar` | Sidebar de navegação |
| `EmptyState` | Estado vazio padronizado |
| `MotionContainer` | Container com animação Framer Motion |
| `MotionItem` | Item animado |
| `AnimatedCounter` | Contador animado (números) |
| `SortSelect` | Select de ordenação |
| `ThemeToggle` | Alternar tema claro/escuro |
| `ThemeProvider` | Provider de tema |
| `DetailSkeleton` | Skeleton para páginas de detalhe |
| `ImageUpload` | Upload de imagens |
| `ClientForm` | Formulário de cliente |
| `QuoteForm` | Formulário de orçamento |
| `ServiceOrderForm` | Formulário de OS |
| `ProductForm` | Formulário de produto |
| `TransactionForm` | Formulário de transação |
| `AppointmentForm` | Formulário de agendamento |
| `CatalogItemForm` | Formulário de catálogo |
| `MenuItemForm` | Formulário de cardápio |
| `UserForm` | Formulário de usuário |

---

## 8. Layout e Navegação

### 8.1 Dashboard Layout

O layout do dashboard (`src/app/(dashboard)/layout.tsx`) inclui:

- **Sidebar** com links para todos os módulos
- **Header** com nome da empresa e botão de tema
- **Conteúdo** central com padding responsivo
- Detecção de empresa em trial com banner de aviso
- Verificação de módulos ativos

### 8.2 Admin Layout

O layout do admin (`src/app/(admin)/layout.tsx`) inclui:

- Sidebar simplificada com links para empresas e módulos
- Acesso restrito a SUPER_ADMIN

### 8.3 Fluxo de Navegação

```
/login → /dashboard (ou /admin se SUPER_ADMIN)
/dashboard → cards de módulos → /clientes, /orcamentos, etc
/dashboard → sidebar → qualquer módulo
/admin → /admin/empresas → /admin/empresas/[id]
/admin → /admin/modulos
```

---

## 9. Assinatura e Planos (Stripe)

### 9.1 Fluxo de Assinatura

1. Empresa criada com status TRIAL (14 dias)
2. Ao acessar `/upgrade`, usuário vê os planos disponíveis
3. Clica em "Assinar" → redirecionado para Checkout Stripe
4. Após pagamento, webhook Stripe atualiza:
   - `company.status = ACTIVE`
   - `company.stripeSubscriptionId = ...`
   - `company.stripePriceId = ...`
5. Módulos são ativados conforme o plano

### 9.2 Planos

| Plano | Preço | Módulos |
|-------|-------|---------|
| Basic | (definir) | Módulos básicos |
| Pro | (definir) | Todos os módulos |

### 9.3 Webhooks Stripe

Eventos processados:
- `checkout.session.completed` → ativar assinatura
- `customer.subscription.updated` → atualizar plano
- `customer.subscription.deleted` → cancelar / suspender

### 9.4 Cron de Trial

Todo dia, um cron job (`/api/cron/trial-expiring`) verifica:
- Empresas com trial expirando em 3 dias → envia e-mail de aviso
- Empresas com trial expirado → status = SUSPENDED

---

## 10. Notificações por E-mail (Resend)

### 10.1 Tipos de E-mail

| Tipo | Gatilho | Template |
|------|---------|----------|
| Trial expirando | Cron job (3 dias antes) | Lembrete para assinar |
| Orçamento aprovado | Cliente aprova orçamento | Notificação para empresa |
| OS concluída | OS marcada como concluída | Notificação para cliente |
| Reset de senha | Solicitação de forgot password | Link de reset |

### 10.2 Implementação

```typescript
// src/lib/email.ts
export async function sendEmail({
  to, subject, html, from
}: EmailParams) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: from || process.env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  });
}
```

---

## 11. Geração de PDF

### 11.1 PDF de Orçamento

Rota: `GET /api/pdf/orcamento/[id]`

Gera PDF com:
- Cabeçalho com nome da empresa
- Dados do cliente
- Tabela de itens (descrição, qtd, valor unitário, total)
- Desconto (se houver)
- Total geral
- Status e data

### 11.2 PDF de Ordem de Serviço

Rota: `GET /api/pdf/os/[id]`

Gera PDF com:
- Cabeçalho com nome da empresa
- Dados do cliente
- Descrição do problema
- Descrição do serviço realizado
- Tabela de itens
- Total
- Status e data

### 11.3 Tecnologia

Usa `@react-pdf/renderer` com componentes React para gerar PDFs no servidor.

---

## 12. Exportação CSV

Rota: `GET /api/exportar?tipo=clientes|orcamentos|ordens-servico`

Gera arquivo CSV com:
- Cabeçalho com nomes das colunas
- Dados formatados
- Download automático

---

## 13. Upload de Arquivos

### 13.1 Upload Local

Rota: `POST /api/upload`

- Aceita arquivos via FormData
- Salva em `/app/uploads/` (dentro do container)
- Retorna URL do arquivo: `/api/uploads/[filename]`

### 13.2 Servir Arquivo

Rota: `GET /api/uploads/[file]`

- Serve o arquivo do diretório de uploads
- Define Content-Type apropriado

---

## 14. Rate Limiting

Implementado via `src/lib/rate-limit.ts`:

```typescript
// Limita requisições por IP
// Configurável: RATE_LIMIT_MAX e RATE_LIMIT_WINDOW_MS
// Usa Map em memória (simples, sem Redis)
```

---

## 15. Validação (Zod)

Schemas de validação em `src/lib/validations.ts`:

```typescript
export const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  document: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const quoteSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(quoteItemSchema).min(1),
  discount: z.number().optional(),
});

export const serviceOrderSchema = z.object({
  customerId: z.string().min(1),
  problemDescription: z.string().optional(),
  serviceDescription: z.string().optional(),
  items: z.array(osItemSchema).optional(),
});
```

---

## 16. Segurança

### 16.1 Headers de Segurança (next.config.ts)

```
X-DNS-Prefetch-Control: on
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 1; mode=block
```

### 16.2 RLS (Row Level Security)

- Isolamento total entre empresas no PostgreSQL
- Cada query define o company_id na sessão
- Políticas RLS garantem que empresa A nunca vê dados da empresa B

### 16.3 Autenticação

- Senhas hash com bcrypt (10 rounds)
- Sessão JWT com NextAuth
- Middleware protege rotas não autenticadas
- Rotas de admin protegidas para SUPER_ADMIN apenas

### 16.4 Rate Limiting

- Limita requisições por IP
- Previne abuso de API

---

## 17. Monitoramento (Sentry)

### 17.1 Configuração

- DSN configurado via variável de ambiente
- Ativo apenas em produção (NODE_ENV === "production")
- Client, Server e Edge configurados separadamente
- Traces: 10% das requisições
- Replays: 10% das sessões, 100% em erro

### 17.2 next.config.ts

```typescript
const { withSentryConfig } = require("@sentry/nextjs");
if (process.env.SENTRY_DSN) {
  config = withSentryConfig(config, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true,
    hideSourceMaps: true,
  });
}
```

---

## 18. Deploy e Infraestrutura

### 18.1 VPS (Contabo)

| Item | Config |
|------|--------|
| IP | 86.48.24.70 |
| Domínio | avgestao.com.br |
| OS | Ubuntu 24.04 |
| CPU | 6 vCPU |
| RAM | 12 GB |
| Disco | 100 GB NVMe |
| Docker | Sim |
| Caddy | Proxy reverso + SSL |

### 18.2 Docker Compose (Produção)

```yaml
services:
  postgres:   # PostgreSQL 16 Alpine
  app:        # Next.js standalone
  caddy:      # Caddy 2 Alpine (SSL)
```

### 18.3 Docker Compose (Local)

```yaml
services:
  postgres:   # PostgreSQL 16 Alpine (porta 5433)
  app:        # Next.js
  nginx:      # Nginx (opcional)
```

### 18.4 CI/CD (GitHub Actions)

- **CI:** Build + Type check em PRs
- **Deploy:** Automático ao fazer push na main
  - Backup do banco
  - Git pull
  - Rebuild do container app
  - Rodar migrations
  - Verificar saúde

### 18.5 Backup

- Script: `scripts/backup.sh`
- Cron: diário às 3h
- Formato: `gestor_YYYY-MM-DD_HHmm.sql.gz`
- Local: `/opt/avgestao/backups/`

---

## 19. Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://gestor:senha@host:5432/gestor_local?schema=public"
POSTGRES_PASSWORD="senha"

# NextAuth
AUTH_SECRET="random-64-chars"
NEXTAUTH_URL="https://avgestao.com.br"
AUTH_TRUST_HOST=true

# App
NEXT_PUBLIC_APP_NAME="Gestor Local"
NEXT_PUBLIC_APP_URL="https://avgestao.com.br"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_BASIC_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."

# Email (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@avgestao.com.br"

# Sentry
SENTRY_DSN="https://key@sentry.io/project"
SENTRY_ORG="org"
SENTRY_PROJECT="project"

# Cron
CRON_SECRET="secret"

# Rate Limit (opcional)
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW_MS="60000"
```

---

## 20. Testes

### 20.1 Testes E2E (Playwright)

Arquivos em `/e2e/`:

| Arquivo | Testes | O que cobre |
|---------|--------|-------------|
| login.spec.ts | 4 | Login admin, empresa, erro, redirect |
| clientes.spec.ts | 3 | Listar, criar, detalhes |
| orcamentos.spec.ts | 2 | Listar, detalhes |
| navigation.spec.ts | 2 | Sidebar, upgrade |

Rodar: `npx playwright test`

### 20.2 Testes de RLS

Arquivos em `/prisma/tests/`:

| Arquivo | O que testa |
|---------|-------------|
| isolation-test.ts | Isolamento entre tenants |
| check-rls.ts | Verificar políticas RLS |
| apply-force-rls.ts | Aplicar RLS forçado |
| backfill-modules.ts | Backfill de módulos |
| setup-rls-role.ts | Setup da role RLS |

---

## 21. Seed de Desenvolvimento

O seed (`prisma/seed.ts`) cria:

1. **Módulos** — 10 módulos do sistema
2. **Super Admin** — admin@gestorlocal.com / admin123
3. **Empresa Trial** — Eletrônica Silva (silva@esilva.com / silva123)
4. **Empresa Ativa** — Auto Mecânica Central (marcos@mecanicacentral.com / marcos123, ana@mecanicacentral.com / ana123)
5. **Clientes** — 5 clientes de exemplo
6. **Orçamentos** — 3 orçamentos com itens
7. **Ordens de Serviço** — 3 OS com itens
8. **Produtos** — 5 produtos de exemplo
9. **Transações Financeiras** — 5 transações
10. **Agendamentos** — 3 agendamentos
11. **Catálogo** — 3 itens de catálogo
12. **Cardápio** — 3 itens de cardápio

---

## 22. Roadmap de Melhorias

### Fase 4 (Em andamento)
- [x] Stripe (checkout, webhook, portal)
- [x] Notificações por e-mail (trial, orçamento, OS, reset)
- [x] Sentry configurado
- [x] CI/CD GitHub Actions
- [ ] Testes automatizados no CI
- [ ] Alertas Sentry no Discord/Slack (via email já funciona)

### Fase 5 (Próxima)
- [ ] Testes unitários (Vitest)
- [ ] Testes de integração
- [ ] README completo

### Fase 6 (Futuro)
- [ ] Remover módulo Catálogo WhatsApp
- [ ] Reformular Cardápio Digital (upload imagens)
- [ ] PWA (offline)
- [ ] Gráficos nos relatórios (Recharts)
- [ ] Onboarding/tutorial
- [ ] Filtros avançados
- [ ] Exportação PDF/Excel
- [ ] i18n
- [ ] Dark mode refinado
- [ ] Animações de transição

---

## 23. Observações Técnicas Importantes

### 23.1 Prisma v7

O projeto usa Prisma v7, que tem mudanças significativas:
- Usa `prisma.config.ts` ao invés de `prisma/schema.prisma` como config principal
- Usa `@prisma/adapter-pg` para conexão com PostgreSQL
- Cliente gerado em `src/generated/prisma/`

### 23.2 Next.js 16

O projeto usa Next.js 16.2.9 com:
- App Router (não Pages Router)
- Turbopack para dev
- `output: "standalone"` para Docker
- Middleware (deprecated → migrar para proxy)

### 23.3 React 19

O projeto usa React 19 com:
- Server Components (padrão)
- Client Components (quando necessário, com "use client")
- Server Actions não implementadas (usa API routes)

### 23.4 Tailwind CSS v4

O projeto usa Tailwind CSS v4 com:
- Nova engine CSS (não mais PostCSS config)
- `@tailwindcss/postcss` plugin
- Sintaxe atualizada

---

## 24. Fluxos Completos

### 24.1 Fluxo: Novo Cliente

```
Usuário → /clientes/novo → Formulário → POST /api/clientes
  → Middleware verifica autenticação
  → API valida com Zod
  → tenantPrisma define company_id na sessão
  → Prisma cria cliente com RLS
  → ActivityLog registra ação
  → Redireciona para /clientes
```

### 24.2 Fluxo: Novo Orçamento

```
Usuário → /orcamentos/novo → Formulário → POST /api/orcamentos
  → Validação Zod (cliente + itens obrigatórios)
  → Cria orçamento + itens em transação
  → Calcula total automaticamente
  → ActivityLog registra
  → Redireciona para /orcamentos
```

### 24.3 Fluxo: Aprovar Orçamento

```
Usuário → /orcamentos/[id] → Aprovar
  → PUT /api/orcamentos/[id] { status: APPROVED }
  → Envia e-mail de notificação para empresa
  → ActivityLog registra
```

### 24.4 Fluxo: Concluir OS

```
Usuário → /ordens-servico/[id] → Concluir
  → PUT /api/ordens-servico/[id] { status: COMPLETED }
  → Envia e-mail de notificação para cliente
  → ActivityLog registra
```

### 24.5 Fluxo: Assinar Plano

```
Usuário → /upgrade → Escolhe plano
  → POST /api/stripe/checkout { priceId }
  → Stripe cria sessão de checkout
  → Redireciona para Stripe Checkout
  → Usuário paga no Stripe
  → Webhook Stripe: checkout.session.completed
  → Atualiza company.status = ACTIVE
  → Ativa módulos do plano
  → Usuário volta para /dashboard
```

### 24.6 Fluxo: Trial Expirado

```
Cron job (diário) → GET /api/cron/trial-expiring
  → Busca empresas com trial expirando em 3 dias
  → Envia e-mail de aviso
  → Busca empresas com trial expirado
  → Status = SUSPENDED
  → Módulos desativados
```

---

## 25. Dependências (package.json)

### Produção
```json
{
  "@base-ui/react": "^1.5.0",
  "@phosphor-icons/react": "^2.1.10",
  "@prisma/adapter-pg": "^7.8.0",
  "@prisma/client": "^7.8.0",
  "@react-pdf/renderer": "^4.5.1",
  "@sentry/nextjs": "^10.57.0",
  "bcryptjs": "^3.0.3",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "framer-motion": "^12.40.0",
  "lucide-react": "^1.18.0",
  "next": "16.2.9",
  "next-auth": "^5.0.0-beta.31",
  "next-themes": "^0.4.6",
  "pg": "^8.21.0",
  "prisma": "^7.8.0",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "resend": "^6.12.4",
  "shadcn": "^4.11.0",
  "sonner": "^2.0.7",
  "stripe": "^22.2.1",
  "tailwind-merge": "^3.6.0",
  "tw-animate-css": "^1.4.0",
  "zod": "^4.4.3"
}
```

### Desenvolvimento
```json
{
  "@playwright/test": "^1.61.0",
  "@tailwindcss/postcss": "^4",
  "@types/bcryptjs": "^2.4.6",
  "@types/node": "^20",
  "@types/pg": "^8.20.0",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "eslint": "^9",
  "eslint-config-next": "16.2.9",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

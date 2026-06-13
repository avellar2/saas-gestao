# Gestor Local

**SaaS multiempresa modular para pequenos negocios brasileiros.**

Plataforma completa de gestao empresarial com 10 modulos integrados, isolamento rigoroso entre empresas e suporte a multiplos usuarios por conta.

---

## Tecnologias

| Categoria | Tecnologia |
|-----------|-----------|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Frontend | React 19 |
| ORM | Prisma ORM + PostgreSQL 16 |
| Autenticacao | NextAuth.js v5 (Credentials + JWT) |
| Estilo | Tailwind CSS 4 + shadcn/ui + Radix UI |
| PDF | @react-pdf/renderer |
| Infra | Docker Compose (PostgreSQL + Nginx + App) |

---

## Funcionalidades

### Multitenancy
- Multiempresa com 3 camadas de isolamento: Middleware, Prisma Extension e RLS
- Cada empresa enxerga apenas seus proprios dados
- Painel Admin Global para gestao de todas as empresas

### 10 Modulos Implementados
| Modulo | Descricao |
|--------|-----------|
| Clientes | Cadastro e gestao de clientes |
| Orcamentos | Orcamentos com itens, geracao de PDF e link WhatsApp |
| Ordens de Servico | OS com controle de status, itens e pagamento |
| Estoque | Controle de entrada e saida de produtos |
| Financeiro | Contas a receber e a pagar |
| Usuarios | Gestao de multiplos usuarios por empresa |
| Agendamento | Agenda de compromissos e servicos |
| Catalogo WhatsApp | Catalogo de produtos para compartilhamento |
| Cardapio Digital | Cardapio online para estabelecimentos |
| Relatorios | Metricas agregadas e graficos |

### Recursos Gerais
- CRUD completo com protecao por modulo
- Activity Log (historico de acoes em 9 entidades)
- Exportacao CSV de todas as entidades
- Filtros avancados com ordenacao, data e busca
- Geracao de PDF (orcamento e ordem de servico)
- Links WhatsApp integrados
- Painel Admin Global (gerenciar empresas, modulos, status)
- Painel de Relatorios com metricas agregadas
- Testes de isolamento multiempresa (12/12 passando)
- Tema claro/escuro
- Upgrade de plano (Trial, Ativo, Inativo)

---

## Credenciais de Teste

| Role | Email | Senha |
|------|-------|-------|
| Super Admin | admin@gestorlocal.com | admin123 |
| Admin Trial | silva@esilva.com | silva123 |
| Admin Ativo | marcos@mecanicacentral.com | marcos123 |
| Staff | ana@mecanicacentral.com | ana123 |

---

## Requisitos

- Node.js 20+
- Docker e Docker Compose
- PostgreSQL 16 (via Docker)

---

## Como Rodar

### 1. Subir o banco

```bash
docker compose -f docker/docker-compose.yml up -d postgres
```

### 2. Configurar .env

Copie `.env.example` para `.env` e ajuste se necessario:

```bash
cp .env.example .env
```

Variaveis disponiveis:

```
DATABASE_URL="postgresql://gestor:gestor123@localhost:5433/gestor_local?schema=public"
AUTH_SECRET="change-me-to-a-random-secret-in-production"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Gestor Local"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Nota:** Gere um `AUTH_SECRET` seguro com `openssl rand -base64 32`.

### 3. Instalar dependencias

```bash
npm install
```

### 4. Rodar migrations e seed

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

### 5. Rodar o app

```bash
npm run dev
```

Acessar: [http://localhost:3000](http://localhost:3000)

---

## Deploy

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Isso sobe tres servicos:
- **postgres** — banco de dados PostgreSQL 16
- **app** — aplicacao Next.js em producao
- **nginx** — proxy reverso Nginx

---

## Testes

Para rodar os testes de isolamento multiempresa:

```bash
npx tsx --env-file=.env prisma/tests/isolation-test.ts
```

---

## Estrutura do Projeto

```
src/
  app/
    (auth)/              # Pagina de login
    (admin)/             # Painel admin global
      admin/empresas/    # Gerenciamento de empresas
      admin/modulos/     # Gerenciamento de modulos
    (dashboard)/         # Painel da empresa (10 modulos)
      clientes/          # CRUD clientes
      orcamentos/        # CRUD orcamentos
      ordens-servico/    # CRUD ordens de servico
      estoque/           # CRUD estoque
      financeiro/        # CRUD financeiro
      usuarios/          # CRUD usuarios
      agendamento/       # CRUD agendamento
      catalogo/          # CRUD catalogo WhatsApp
      cardapio/          # CRUD cardapio digital
      relatorios/        # Metricas e graficos
      atividades/        # Activity log
      upgrade/           # Pagina de upgrade de plano
    api/                 # API routes
      auth/              # Autenticacao (NextAuth)
      clientes/          # CRUD API clientes
      orcamentos/        # CRUD API orcamentos
      ordens-servico/    # CRUD API OS
      estoque/           # CRUD API estoque
      financeiro/        # CRUD API financeiro
      usuarios/          # CRUD API usuarios
      agendamento/       # CRUD API agendamento
      catalogo/          # CRUD API catalogo
      cardapio/          # CRUD API cardapio
      pdf/               # Geracao de PDF
      exportar/          # Exportacao CSV
      relatorios/        # API de metricas
      empresas/          # API admin empresas
      modulos/           # API admin modulos
      atividades/        # API activity log
  components/
    ui/                  # shadcn/ui components
    layout/              # Sidebar, ModuleCard
    modules/             # Formularios dos modulos
    pdf/                 # Templates PDF (orcamento, OS)
  lib/                   # Utilitarios e helpers
    auth.ts              # Configuracao NextAuth
    prisma.ts            # Cliente Prisma com extensao de empresa
    module-guard.ts      # Protecao por modulo
    company-limits.ts    # Limites por plano
    activity-log.ts      # Logger de atividades
    csv-export.ts        # Exportacao CSV
    whatsapp.ts          # Links WhatsApp
    pricing.ts           # Precificacao
    utils.ts             # Utilitarios gerais
  hooks/                 # React hooks
    use-company.ts       # Hook de empresa atual
    use-modules.ts       # Hook de modulos ativos
  types/                 # Types compartilhados
prisma/
  schema.prisma          # Schema do banco
  seed.ts                # Dados de seed
  migrations/            # Migrations
  tests/                 # Testes de isolamento
docker/
  docker-compose.yml     # Orquestracao Docker
  Dockerfile             # Dockerfile da aplicacao
  nginx/                 # Configuracao Nginx
```

---

## Modulos

| Modulo | Rota | Descricao |
|--------|------|-----------|
| Clientes | `/clientes` | Cadastro e gestao de clientes |
| Orcamentos | `/orcamentos` | Orcamentos com itens, PDF e WhatsApp |
| Ordens de Servico | `/ordens-servico` | OS com status, itens e pagamento |
| Estoque | `/estoque` | Controle de entrada e saida |
| Financeiro | `/financeiro` | Contas a receber e pagar |
| Usuarios | `/usuarios` | Multiplos usuarios por empresa |
| Agendamento | `/agendamento` | Agenda de compromissos |
| Catalogo WhatsApp | `/catalogo` | Catalogo de produtos |
| Cardapio Digital | `/cardapio` | Cardapio online |
| Relatorios | `/relatorios` | Metricas e graficos |

---

## Licenca

Proprietario. Uso interno.
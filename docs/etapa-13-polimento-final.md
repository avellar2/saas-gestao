# Etapa 13 — Polimento Final, E2E e Preparação para Venda

## Diagnóstico Geral do Projeto

### Pontos Críticos Encontrados

| # | Problema | Severidade | Categoria |
|---|----------|------------|-----------|
| 1 | **Sonner nunca montado** — `<Toaster>` não está em nenhum layout. Toasts são invisíveis. | Alta | UX |
| 2 | **Trends do dashboard hardcoded** — "+12%", "3 novos" etc. são strings fixas, não dados reais. | Média | UX |
| 3 | **Auth pages inconsistentes** — Login/forgot/reset usam Phosphor icons + violet theme; dashboard usa Lucide + emerald. | Média | UX |
| 4 | **Sem onboarding** — Usuário novo cai direto no dashboard vazio. | Média | UX |
| 5 | **OS sem paginação** — `ordens-servico` carrega todas as OS sem `take`/`skip`. | Média | Perf |
| 6 | **Empty states inconsistentes** — Financeiro, Estoque, Cozinha usam HTML inline em vez do `EmptyState` component. | Baixa | UX |
| 7 | **Sem página 403** — Módulo inativo redireciona para `/upgrade`, mas não existe `forbidden.tsx`. | Baixa | Seg |
| 8 | **PDF routes sem module guard** — `/api/pdf/os/[id]` e `/api/pdf/orcamento/[id]` não verificam módulo. | Média | Seg |
| 9 | **Module guard duplicado** — ~35 rotas redefinem `checkModuleAccess` inline em vez de usar `isModuleActive` de `module-guard.ts`. | Baixa | DX |
| 10 | **Acentos faltando** — "Voce", "periodo", "servico", "comecar" sem acentos/cedilhas em várias páginas. | Baixa | UX |
| 11 | **Seed data fraco** — Sem pedidos de cardápio, mesas, movimentações de estoque, logs, etc. | Média | Demo |
| 12 | **Sem `test` script** — `package.json` não tem script para rodar Playwright. | Baixa | DX |

---

## Arquivos a Alterar

### Arquivos Novos

| Arquivo | Descrição |
|---------|-----------|
| `src/app/(dashboard)/dashboard/WelcomeContent.tsx` | Componente de onboarding/checklist |
| `e2e/os-completa.spec.ts` | Teste E2E fluxo OS completa |
| `e2e/cardapio-completo.spec.ts` | Teste E2E fluxo cardápio |
| `e2e/financeiro.spec.ts` | Teste E2E fluxo financeiro |
| `e2e/estoque.spec.ts` | Teste E2E fluxo estoque |
| `e2e/relatorios.spec.ts` | Teste E2E fluxo relatórios |
| `e2e/api-security.spec.ts` | Teste E2E segurança de API |
| `docs/MVP-READY.md` | Documentação interna de prontidão |

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/app/layout.tsx` | Adicionar `<Toaster />` do sonner |
| `src/app/(dashboard)/dashboard/page.tsx` | Trends dinâmicos, adicionar WelcomeContent |
| `src/app/(dashboard)/financeiro/VisaoGeralContent.tsx` | Usar EmptyState component |
| `src/app/(dashboard)/financeiro/fluxo/FluxoContent.tsx` | Usar EmptyState component |
| `src/app/(dashboard)/financeiro/transacoes/TransacoesListContent.tsx` | Usar EmptyState component |
| `src/app/(dashboard)/estoque/DashboardContent.tsx` | Usar EmptyState component |
| `src/app/(dashboard)/cardapio/cozinha/CozinhaContent.tsx` | Empty state por coluna com ação |
| `src/app/(dashboard)/relatorios/executivo/ExecutivoContent.tsx` | Usar EmptyState component |
| `src/app/(dashboard)/ordens-servico/page.tsx` | Adicionar paginação |
| `src/app/api/pdf/os/[id]/route.tsx` | Adicionar module guard para `service_orders` |
| `src/app/api/pdf/orcamento/[id]/route.tsx` | Adicionar module guard para `quotes` |
| `src/app/(dashboard)/dashboard/page.tsx` | Corrigir acentos |
| Vários components | Corrigir acentos faltando |
| `package.json` | Adicionar script `test:e2e` |
| `prisma/seed.ts` | Expandir dados demo |

---

## Playwright

**Já instalado:** `@playwright/test@^1.61.0` com config em `playwright.config.ts`.

**Ação:** Não precisa instalar. Precisa adicionar script no `package.json` e instalar browsers.

```json
"scripts": {
  "test:e2e": "playwright test"
}
```

Depois: `npx playwright install chromium`

---

## Testes E2E a Criar

### Fluxo 1 — Login e Dashboard (`e2e/login.spec.ts` — já existe, ampliar)

- Login com admin demo
- Verificar redirect para dashboard
- Verificar sidebar com módulos ativos
- Verificar página de upgrade com módulos

### Fluxo 2 — OS Completa (`e2e/os-completa.spec.ts`)

- Login como admin demo
- Criar cliente
- Criar produto
- Criar OS com produto
- Finalizar OS com garantia
- Verificar financeiro criado (via API)
- Verificar estoque baixado (via API)
- Acessar portal público da OS

### Fluxo 3 — Cardápio Completo (`e2e/cardapio-completo.spec.ts`)

- Login como admin demo
- Criar item do cardápio
- Criar mesa
- Verificar cardápio público abre
- Verificar cozinha carrega
- Marcar pedido como preparando → pronto → entregue com pagamento
- Verificar caixa do dia

### Fluxo 4 — Financeiro (`e2e/financeiro.spec.ts`)

- Criar conta a pagar
- Marcar como paga
- Verificar fluxo de caixa atualiza

### Fluxo 5 — Estoque (`e2e/estoque.spec.ts`)

- Criar produto
- Fazer entrada
- Fazer saída
- Fazer ajuste
- Verificar movimentações

### Fluxo 6 — Relatórios (`e2e/relatorios.spec.ts`)

- Acessar relatórios
- Trocar mês
- Verificar cards do executivo carregam
- Verificar aba financeiro abre

### Fluxo 7 — Segurança API (`e2e/api-security.spec.ts`)

- API pública não exige login
- API autenticada sem login retorna 401
- API de módulo inativo retorna 403
- Rota pública do portal não expõe dados internos

---

## Plano de Seed/Demo

### Expandir `prisma/seed.ts` com:

1. **Empresa demo "Auto Mecânica Central"** (já existe, ampliar):
   - Adicionar 5 mesas de restaurante
   - Adicionar 5 pedidos de cardápio em status variados (RECEIVED, PREPARING, READY, DELIVERED)
   - Adicionar 10 movimentações de estoque (5 entradas, 3 saídas, 2 ajustes)
   - Adicionar mais transações financeiras (receitas e despesas variadas)
   - Adicionar 3 OS com status variados (RECEIVED, IN_PROGRESS, COMPLETED)
   - Adicionar logs de atividade

2. **Empresa trial "Eletrônica Silva"** (já existe, ampliar):
   - Adicionar 3 clientes
   - Adicionar 2 produtos
   - Adicionar 1 OS simples
   - Adicionar 2 transações financeiras

### Credenciais Demo

| Empresa | Email | Senha | Papel |
|---------|-------|------|-------|
| Super Admin | admin@gestorlocal.com | admin123 | SUPER_ADMIN |
| Auto Mecânica Central | marcos@mecanicacentral.com | marcos123 | COMPANY_ADMIN |
| Eletrônica Silva | silva@esilva.com | silva123 | COMPANY_ADMIN |

---

## Onboarding Inicial

### Abordagem: Checklist no Dashboard

Criar `WelcomeContent.tsx` que aparece quando:

- Empresa tem 0 clientes, OU
- Empresa tem menos de 3 registros em qualquer módulo ativo, OU
- É primeiro login (flag via localStorage)

Conteúdo do checklist:

1. ✅ Cadastrar empresa → link para `/empresas` (ou mostrar nome)
2. ✅ Cadastrar primeiro cliente → link para `/clientes/novo`
3. ✅ Criar primeira OS → link para `/ordens-servico/novo`
4. ✅ Adicionar produto ao estoque → link para `/estoque/novo`
5. ✅ Configurar cardápio → link para `/cardapio/novo`
6. ✅ Ver relatórios → link para `/relatorios/executivo`

Cada item do checklist verifica via API se o count é > 0. Itens completos ficam riscados.

---

## Empty States Premium

### Páginas a atualizar (usar `EmptyState` component):

1. **Financeiro/VisãoGeral** — "Nenhuma transação registrada" / "Crie sua primeira transação para acompanhar receitas e despesas." / [Nova Transação]
2. **Financeiro/Transações** — já tem empty state inline, converter para EmptyState
3. **Financeiro/Fluxo** — "Nenhum dado de fluxo de caixa" / "As transações pagas aparecerão aqui automaticamente."
4. **Estoque/Dashboard** — "Nenhum produto cadastrado" / "Adicione produtos ao estoque para gerenciar entradas, saídas e alertas." / [Novo Produto]
5. **Cozinha** — Por coluna: "Nenhum pedido recebido" / "Os novos pedidos aparecerão aqui automaticamente."
6. **Relatórios/Executivo** — "Nenhum dado disponível" / "Selecione um mês para visualizar o relatório executivo."

---

## UI Polish

### Correções de Acentos

Strings a corrigir (busca por "Voce", "periodo", "servico", "comecar", etc.):

- Dashboard: "Voce esta no periodo" → "Você está no período"
- Dashboard: "Seu periodo de teste" → "Seu período de teste"
- Dashboard: "Cadastre seus clientes para comecar" → "Começar"
- OS: "Crie sua primeira ordem de servico" → "serviço"
- Cozinha: "Nenhum pedido" — sem acento mas OK
- Vários empty states sem acento

### Toast

Adicionar `<Toaster />` no `layout.tsx` raiz ou do dashboard:

```tsx
import { Toaster } from "@/components/ui/sonner";
// ...
<Toaster />
```

### Dashboard Trends

Substituir strings hardcoded por cálculos dinâmicos:

- Clientes: total real (já busca) — remover trend fake ou calcular novos do mês
- OS abertas: total real — calcular percentual vs mês anterior ou omitir trend
- Orçamentos pendentes: total real — mesma abordagem

### Responsividade

Revisar páginas principais em viewport mobile (375px):

- Dashboard cards: já usa `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Relatórios cards: já usa `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Financeiro/Estoque tabs: já responsivo
- Cozinha kanban: verificar scroll horizontal em mobile

---

## Segurança — Module Guards

### PDF Routes

Adicionar verificação de módulo em:

- `/api/pdf/os/[id]` → verificar `service_orders`
- `/api/pdf/orcamento/[id]` → verificar `quotes`

### Consistência do Module Guard

**Decisão:** NÃO refatorar todos os guards inline nesta etapa. O funcionamento está correto, apenas duplicado. Registrar como dívida técnica.

Refatorar APENAS os PDF routes que não têm guard.

---

## Preparação Comercial

### Upgrade Page

A página `/upgrade` já existe e funciona. Ajustes:

- Mostrar módulos já ativos com badge "Ativo" em vez de "Assinar"
- Corrigir link de volta para dashboard
- Verificar que Stripe checkout funciona com dados demo

### Pricing Page

Não criar página nova de pricing nesta etapa. A página de upgrade já funciona como pricing.

### Mensagens de Bloqueio

O redirect para `/upgrade?module=X` já funciona. Ajustar:

- Texto mais claro na página de upgrade quando vem de redirect
- Badge "Ativo" em módulos já comprados

---

## Documentação — `docs/MVP-READY.md`

Criar com:

1. Módulos prontos e status
2. Fluxos principais testados
3. Como rodar local (`.env` setup, `npm install`, `npx prisma migrate dev`, `npm run dev`)
4. Como rodar seed demo (`npx prisma db seed`)
5. Como rodar E2E (`npm run test:e2e`)
6. Checklist de deploy (Vercel, env vars, Stripe webhook)
7. Checklist antes de vender ( Stripe testado, seed ok, E2E passando)

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| E2E pode quebrar se seed não estiver rodado | Seed deve rodar antes dos testes; testes usam credenciais fixas |
| Playwright browsers podem não instalar em CI | Adicionar `npx playwright install --with-deps chromium` no CI |
| Toast pode aparecer em lugares inesperados | Testar manualmente cada fluxo após adicionar Toaster |
| Onboarding checklist pode ser lento se fizer N requests | Usar Promise.all e cache |
| Seed com muitos dados pode ficar lento | Manter seed < 100 registros totais por empresa |
| Ajustes de UX podem quebrar snapshots | Fazer E2E antes de ajustes visuais |

---

## Ordem de Implementação

1. **Toaster** — Adicionar `<Toaster />` no layout raiz
2. **Acentos** — Corrigir strings sem acento
3. **PDF module guard** — Adicionar verificação em `/api/pdf/os` e `/api/pdf/orcamento`
4. **Empty States** — Converter inline para EmptyState component
5. **Onboarding** — WelcomeContent no dashboard
6. **Dashboard Trends** — Substituir trends hardcoded
7. **OS paginação** — Adicionar take/skip na listagem
8. **Seed expandido** — Ampliar dados demo
9. **E2E** — Criar testes Playwright
10. **Package.json** — Adicionar script test:e2e
11. **MVP-READY.md** — Documentação
12. **Build + typecheck**
13. **Commit**

---

## Não Implementar Nesta Etapa

- WhatsApp automático real
- Pagamento online
- Nota fiscal
- App mobile
- Multi-filial
- Marketplace
- IA
- Integração bancária
- Impressora térmica
- Refatorar todos os module guards inline
- Página de pricing separada da upgrade
- Testes unitários (apenas E2E)
# Roadmap Gestor Local - Prioridade de Implementação

> Criado em: 2026-06-13
> Última atualização: 2026-06-13
> Status: Fase 1 completa — pronto para Fase 2 (Segurança)

---

## FASE 1: Polimento Visual Premium (KIMI K2.6) - ✅ COMPLETA

**Modelo:** Kimi K2.6  
**Quando:** 2026-06-13  
**Escopo:** Apenas frontend/visual, zero alterações em banco/APIs

### Checklist

- [x] Dark mode consistente em todas as páginas (remover cores hardcoded tipo `slate-900`, `indigo-600`)
- [x] Skeleton screens em todas as listas e páginas de detalhe
- [x] Empty states padronizados usando componente `<EmptyState>`
- [x] Responsividade mobile (tabelas scrolláveis horizontalmente)
- [x] `error.tsx` global e por rota
- [x] `loading.tsx` global e por rota
- [x] `not-found.tsx` global
- [x] Criar componente `<Textarea>` no shadcn/ui (substituir raw HTML)
- [x] Padronizar focus rings e hover states em todas as páginas
- [x] Corrigir textareas raw HTML nos forms

### Arquivos envolvidos
- `src/app/(dashboard)/atividades/page.tsx` — cores hardcoded
- `src/app/(dashboard)/clientes/page.tsx` — empty state, tabela mobile
- `src/app/(dashboard)/orcamentos/page.tsx` — empty state, tabela mobile
- `src/app/(dashboard)/ordens-servico/page.tsx` — empty state, tabela mobile
- `src/app/(dashboard)/*/page.tsx` — todas as listas
- `src/components/modules/*-detail.tsx` — loading states
- `src/components/ui/skeleton.tsx` — já existe, usar
- `src/components/empty-state.tsx` — já existe, usar
- `src/components/ui/textarea.tsx` — criar

---

## FASE 2: Segurança e Validação (DEEPSEEK V4 FLASH)

**Modelo:** DeepSeek V4 Flash  
**Quando:** Próxima sessão  
**Motivo:** Backend/APIs, lógica de negócio

### Checklist

- [ ] Rate limiting em todas as API routes (`/api/*`)
- [ ] Validação com Zod em todas as APIs (substituir validação manual)
- [ ] Headers de segurança no `next.config.ts` (CSP, HSTS, X-Frame-Options, etc)
- [ ] Middleware com headers de segurança
- [ ] Fluxo de recuperação de senha (Forgot Password)
  - [ ] Tela "Esqueci minha senha"
  - [ ] API para gerar token de reset
  - [ ] Tela de reset com token
  - [ ] Integração com serviço de email (Resend/SendGrid)
- [ ] `.env.example` completo e seguro

### Arquivos envolvidos
- `src/middleware.ts` — headers de segurança
- `next.config.ts` — CSP, security headers
- `src/app/api/**/route.ts` — Zod validation + rate limit
- `src/app/(auth)/forgot-password/page.tsx` — nova
- `src/app/(auth)/reset-password/page.tsx` — nova
- `src/app/api/auth/forgot-password/route.ts` — nova
- `src/app/api/auth/reset-password/route.ts` — nova

---

## FASE 3: Arquitetura e Isolamento (MINIMAX M2.7)

**Modelo:** MiniMax M2.7  
**Quando:** Quando DeepSeek estiver lento/travando  
**Motivo:** Arquitetura complexa, agente de várias etapas

### Checklist

- [ ] RLS (Row Level Security) no PostgreSQL
  - [ ] Criar schema `app`
  - [ ] Criar função `app.current_company_id()`
  - [ ] Políticas RLS em todas as tabelas tenant
  - [ ] Testar que tenant A não vê dados do tenant B
- [ ] Revisar `tenantPrisma` extension para garantir compatibilidade com RLS
- [ ] Migration de backfill para RLS em produção

### Arquivos envolvidos
- `prisma/migrations/` — nova migration de RLS
- `src/lib/prisma.ts` — revisar extension
- `prisma/tests/isolation-test.ts` — validar

---

## FASE 4: Monetização e Infraestrutura (DEEPSEEK V4 FLASH + MINIMAX)

**Modelo:** DeepSeek V4 Flash (backend), MiniMax M2.7 (orquestração)  
**Quando:** Após Fase 2 e 3  
**Motivo:** Requer contas externas configuradas

### Pré-requisitos (configurar antes)
- [ ] Conta Stripe ou PagSeguro
- [ ] Conta AWS S3 ou Cloudflare R2
- [ ] Conta Resend ou SendGrid
- [ ] Conta Sentry

### Checklist

- [ ] Integração Stripe/PagSeguro
  - [ ] Webhook de pagamento
  - [ ] Ativação automática de módulos após pagamento
  - [ ] Cancelamento e upgrade de plano
- [ ] Upload de imagens (S3/R2)
  - [ ] Endpoint de upload presigned URL
  - [ ] Componente de upload com preview
  - [ ] Integrar em Catálogo e Cardápio
- [ ] Notificações por email
  - [ ] Trial expirando (3 dias antes)
  - [ ] Orçamento aprovado
  - [ ] OS concluída
  - [ ] Reset de senha
- [ ] Monitoramento Sentry
  - [ ] Captura de erros em produção
  - [ ] Alertas no Discord/Slack
- [ ] CI/CD GitHub Actions
  - [ ] Build + Type check em PR
  - [ ] Testes automatizados
  - [ ] Deploy automático na main

---

## FASE 5: Testes e Documentação (DEEPSEEK V4 PRO)

**Modelo:** DeepSeek V4 Pro  
**Quando:** Quando precisar de raciocínio profundo  
**Motivo:** Bug difícil, arquitetura complexa

### Checklist

- [ ] Testes unitários (Vitest)
  - [ ] Utils e helpers
  - [ ] Componentes críticos
- [ ] Testes de integração
  - [ ] APIs com banco de teste
  - [ ] Autenticação
- [ ] Testes E2E (Playwright)
  - [ ] Fluxo de login
  - [ ] CRUD de cliente
  - [ ] Geração de PDF
- [ ] README completo
  - [ ] Troubleshooting
  - [ ] Deploy em cloud (Vercel, AWS, Railway)
  - [ ] Variáveis obrigatórias vs opcionais
- [ ] Documentação API (Swagger/OpenAPI)

---

## FASE 6: Polimento Final e Features Extras (KIMI K2.6 + DEEPSEEK FLASH)

**Modelo:** Kimi K2.6 (visual), DeepSeek Flash (backend)  
**Quando:** Pós-lançamento

### Checklist

- [ ] PWA (manifest.json, service worker, offline)
- [ ] Gráficos nos relatórios (Recharts)
- [ ] Onboarding/tutorial interativo
- [ ] Filtros avançados por data e range
- [ ] Exportação PDF/Excel dos relatórios
- [ ] Internacionalização (i18n)
- [ ] Dark mode refinado (ajustes finos de contraste)
- [ ] Animações de transição entre páginas

---

## Resumo dos Modelos por Tarefa

| Tarefa | Modelo Principal | Fallback |
|--------|-----------------|----------|
| Frontend visual premium | **Kimi K2.6** | GLM-4.7 |
| Backend APIs, validação | **DeepSeek V4 Flash** | MiniMax M2.7 |
| Arquitetura, RLS, bug difícil | **DeepSeek V4 Pro** | MiniMax M2.7 |
| Agente multi-etapas, orquestração | **MiniMax M2.7** | GLM-5.1 |
| Tarefa simples, economia | **GLM-4.7-Flash** | Qwen3.5 |

---

## Notas

- Nunca remover funcionalidades existentes sem confirmar
- Sempre preservar backend ao mexer no frontend
- Build deve passar limpo antes de cada fase
- Testar dark mode em todas as telas novas
- Zero referências a IA em commits, código ou arquivos

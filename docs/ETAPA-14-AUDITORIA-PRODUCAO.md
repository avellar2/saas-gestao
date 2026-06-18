# ETAPA 14 — Auditoria de Produção + Checklist Comercial do AVGESTÃO

> **Status**: Auditoria completa. Aguardando aprovação para implementação.
> **Data**: 2026-06-18
> **Escopo**: Preparar AVGESTÃO para produção real e venda para primeiros clientes.
> **Restrições**: zero feature nova, zero refatoração grande, zero mudança de regra de negócio, zero alteração de schema sem aprovação, zero quebra de testes.

---

## Contexto

O AVGESTÃO passou por:

- redesign visual premium;
- E2E Playwright completo (134/134 testes);
- auditoria funcional (BUG-001 a BUG-035);
- hardening de segurança (P02, P04, P05, P08, P12, P14, P17, P18, P19, P23, P25, P33);
- build OK;
- typecheck OK;
- sistema considerado pronto para venda inicial.

Esta etapa **não cria feature**, **não refatora**, **não muda regra de negócio**. Apenas prepara o terreno operacional, documental e comercial.

---

## 1. ESTADO ATUAL DE DEPLOY

### 1.1 Como o projeto sobe hoje

| Comando | Função | Estado |
|---|---|---|
| `npm run dev` | Dev local com hot reload | OK |
| `npm run build` | Build de produção Next.js 16 | OK (validado 13D) |
| `npm run start` | Sobe `next start` em modo prod | A confirmar script |
| `npx prisma migrate deploy` | Aplica migrations | OK |
| `npx prisma db seed` | Roda seed | OK (agora seguro em prod) |
| `docker compose -f docker/docker-compose.yml up` | Dev local (portas 5433, 3000, 80, 443) | Não é prod-ready — expõe Postgres na porta 5433 do host |
| `docker compose -f docker-compose.prod.yml up` | Prod (portas 80, 443) | Configuração incompleta — usa Caddy minimalista, sem healthcheck do app |

### 1.2 Inconsistências detectadas

| # | Problema | Localização |
|---|---|---|
| I-1 | Existem **dois docker-compose** com arquiteturas diferentes (dev usa nginx, prod usa caddy) | `docker/docker-compose.yml` + `docker-compose.prod.yml` |
| I-2 | O `docker-compose.prod.yml` referencia `./docker/caddy/Caddyfile` mas o volume monta `./docker/nginx/default.conf` em outro lugar | `docker-compose.prod.yml:48-51` |
| I-3 | Dockerfile e Caddyfile estão em `docker/`, mas o `docker-compose.prod.yml` na raiz referencia `docker/Dockerfile` (correto) | OK |
| I-4 | Não existe pasta `scripts/` com `deploy.sh`, `backup.sh`, `restore.sh` — README_DEPLOY.md menciona mas não existem | — |
| I-5 | `package.json` não tem scripts `deploy`, `backup`, `restore`, `check-env`, `db:backup`, `db:restore`, `typecheck`, `db:migrate` | `package.json:5-14` |
| I-6 | Caddyfile de 7 linhas é minimalista — sem logs, rate limit, compressão, headers de segurança | `docker/caddy/Caddyfile:1-7` |
| I-7 | `docker-compose.prod.yml` não tem healthcheck do app, só do postgres | `docker-compose.prod.yml:18-22` |
| I-8 | O `app` no compose de prod não tem `healthcheck` para o proxy esperar | `docker-compose.prod.yml:24-39` |
| I-9 | `next.config.ts` precisa confirmar `output: standalone` (necessário pro Docker) | a verificar |
| I-10 | `Dockerfile` builder usa `DATABASE_URL=dummy` mas gera Prisma Client sem erro | `docker/Dockerfile:14-15` |
| I-11 | **`entrypoint.sh` imprime `DATABASE_URL` completo (com senha) no log** | `docker/entrypoint.sh:4` (VAZAMENTO DE SECRET) |
| I-12 | `entrypoint.sh` não tem `set -u`, não trata erro de migration adequadamente | `docker/entrypoint.sh:1-9` |
| I-13 | Não existe volume para `./backups` | — |
| I-14 | `docker-compose.prod.yml` tem `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-gestor_prod_123}` — fallback inseguro | `docker-compose.prod.yml:12` |
| I-15 | `sentry.server.config.ts` não filtra PII (passwords, tokens, emails podem vazar) | `sentry.server.config.ts:1-8` |
| I-16 | `sentry.client.config.ts` e `sentry.edge.config.ts` existem | OK |
| I-17 | `package.json` não tem `engines` para fixar Node 20 | `package.json` |
| I-18 | `package.json` não tem `typecheck` script | `package.json:5-14` |
| I-19 | `package.json` não tem `prisma:generate`, `db:migrate`, `db:seed` scripts | `package.json:5-14` |
| I-20 | `docker/Dockerfile` linha 26: `COPY --from=builder /app/.next/standalone ./` — precisa confirmar que `next.config.ts` tem `output: standalone` | — |

### 1.3 Estado das variáveis de ambiente

#### Env definidas em `.env.example` (mas com gaps)

| Var | Tipo | Estado |
|---|---|---|
| `DATABASE_URL` | obrigatória prod | OK |
| `POSTGRES_PASSWORD` | obrigatória prod | OK |
| `AUTH_SECRET` | obrigatória prod | OK (com placeholder ruim) |
| `NEXTAUTH_URL` | obrigatória prod | OK |
| `RESEND_API_KEY` | opcional prod | OK |
| `RESEND_FROM_EMAIL` | opcional prod | OK |
| `NEXT_PUBLIC_APP_NAME` | opcional | OK |
| `NEXT_PUBLIC_APP_URL` | opcional | OK |
| `STRIPE_SECRET_KEY` | condicional | OK |
| `STRIPE_WEBHOOK_SECRET` | condicional | OK como opcional (deveria ser obrigatória — inconsistência com P17) |
| `STRIPE_BASIC_PRICE_ID` | condicional | OK |
| `STRIPE_PRO_PRICE_ID` | condicional | OK |
| `SENTRY_DSN` | opcional | OK |
| `SENTRY_ORG` | opcional | presente mas não usado pelo `Sentry.init` |
| `SENTRY_PROJECT` | opcional | presente mas não usado pelo `Sentry.init` |
| `RATE_LIMIT_MAX` | opcional | presente mas middleware não usa |
| `RATE_LIMIT_WINDOW_MS` | opcional | presente mas middleware não usa |
| `CRON_SECRET` | obrigatória prod | OK (com placeholder ruim) |
| `SEED_ADMIN_EMAIL` | opcional | **FALTA no .env.example** |
| `SEED_ADMIN_PASSWORD` | obrigatória prod | **FALTA no .env.example** |
| `SEED_ADMIN_NAME` | opcional | **FALTA no .env.example** |

#### Validação em runtime (`src/lib/env.ts`)

- Valida 6 vars em produção: `AUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` é `required: false` no validator mas P17 do 13D diz que é obrigatório — **INCONSISTÊNCIA**
- `STRIPE_SECRET_KEY` é `required: false` — OK (sem Stripe a app sobe)
- Não valida `POSTGRES_PASSWORD` (variável de env do Docker)
- Não valida `RESEND_API_KEY` (mas é opcional)
- Não valida `SEED_ADMIN_PASSWORD` (mas seed valida em runtime)

### 1.4 Banco de dados

- **Migrations**: Prisma padrão em `prisma/migrations/` — OK
- **Seed**: `prisma/seed.ts` agora seguro em prod (P33) — OK
- **Backup**: **NÃO EXISTE SCRIPT**
- **Restore**: **NÃO EXISTE SCRIPT**
- **Volume Docker**: `pgdata_prod` (nomeado, persistente) — OK
- **Conexão**: `DATABASE_URL` aponta para `postgres:5432` no compose de prod — OK
- **SSL**: NÃO USA SSL (Postgres em rede Docker privada — OK)
- **Senha**: hardcoded `gestor123` em dev (OK), fallback `gestor_prod_123` em prod (INSEGURO)

### 1.5 HTTPS / Domínio

- **Proxy reverso**: Caddy no compose de prod, nginx no compose de dev — **INCONSISTÊNCIA**
- **Config nginx dev**: `docker/nginx/default.conf` (73 linhas) com TLS 1.2/1.3, HSTS, headers, gzip, redirect 80→443 — **EXCELENTE**
- **Config Caddy prod**: `docker/caddy/Caddyfile` (7 linhas) — **MINIMALISTA**, sem compressão, sem rate limit, sem headers de segurança, mas HTTPS automático via Let's Encrypt (vantagem do Caddy)
- **Let's Encrypt**: Caddy emite automaticamente; nginx precisa de certbot manual
- **HSTS**: nginx tem, Caddy não tem
- **Headers de segurança**: nginx OK, Caddy não
- **Redirect HTTP→HTTPS**: ambos OK
- **Domínio configurado**: `avgestao.com.br` (no Caddyfile e docs) — OK
- **Decisão necessária**: nginx (mais controle) ou Caddy (mais simples, Let's Encrypt automático)

### 1.6 Stripe

- **Checkout**: a confirmar (não lido, mencionado em `webhook/route.ts:31`)
- **Portal**: a confirmar
- **Webhook**: `src/app/api/stripe/webhook/route.ts` (168 linhas), P17 OK, valida signature
- **Secrets live**: condicionais via `STRIPE_SECRET_KEY` (env), `STRIPE_WEBHOOK_SECRET` (env)
- **Endpoint do webhook**: configurável via env (`NEXTAUTH_URL`)
- **Planos**: `PLANS` em `src/lib/stripe.ts` (Basic R$49, Pro R$99) — **legado**; `pricing.ts` tem modelo modular (Inicial R$49, Crescimento R$79, Profissional R$104, Completo R$144) — **INCONSISTÊNCIA entre os dois sistemas**
- **Bloqueio de módulo**: `checkModuleAccess` no módulo-guard — OK
- **Não usar Stripe em teste**: `getStripe()` lança erro se `STRIPE_SECRET_KEY` ausente — OK

### 1.7 Resend/Email

- **Domínio de envio**: `RESEND_FROM_EMAIL` configurável — OK
- **Remetente default**: `noreply@resend.dev` (Resend default) — OK em dev
- **Reset de senha**: `sendPasswordResetEmail` — OK
- **OS concluída**: `sendOSCompletedEmail` — OK
- **Orçamento aprovado**: `sendBudgetApprovedEmail` — OK
- **Trial expirando**: `sendTrialExpiringEmail` — OK
- **Falha amigável se não configurado**: todos fazem `if (!resend) { log dev; return success }` — excelente
- **Dev sem Resend**: loga token de reset de senha no console (bom para dev)

### 1.8 Sentry/Logs

- **Sentry configurado**: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` — OK
- **PII filtrada**: **NÃO** — `beforeSend` não está definido, então emails, telefones, tokens podem vazar
- **Logs sensíveis**: `entrypoint.sh:4` imprime `DATABASE_URL` completo (com senha) — **VAZAMENTO**
- **DSN configurável**: via `SENTRY_DSN` — OK
- **Sample rate**: 10% (`tracesSampleRate: 0.1`) — OK

### 1.9 Backups

- **Script backup**: **NÃO EXISTE**
- **Retenção**: não definida
- **Pasta**: não existe
- **Restore**: **NÃO EXISTE**
- **Agendamento**: README_DEPLOY.md menciona cron mas não tem crontab configurado

### 1.10 Smoke test pós-deploy

- **NÃO EXISTE CHECKLIST** nem script automatizado

### 1.11 Rollback

- **NÃO EXISTE PROCEDIMENTO** documentado para rollback de versão
- Restore de backup existe conceitualmente (sem script)

---

## 2. GAPS ENCONTRADOS (resumo priorizado)

### Críticos (bloqueiam deploy)

| # | Gap | Impacto |
|---|---|---|
| G-1 | **Vazamento de senha Postgres em log** | `entrypoint.sh:4` imprime DATABASE_URL completo com senha |
| G-2 | **Falta fallback de senha Postgres** | `docker-compose.prod.yml:12` tem fallback `gestor_prod_123` se env ausente |
| G-3 | **Backup/restore não existem** | Sem backup, qualquer erro em prod = perda total de dados |
| G-4 | **Inconsistência nginx/caddy** | Não está claro qual stack usar em prod (dev usa nginx, prod usa caddy) |
| G-5 | **STRIPE_WEBHOOK_SECRET opcional no validator** | P17 diz obrigatório, mas env.ts diz opcional — pode subir prod sem Stripe bloqueado |
| G-6 | **Sentry sem filtro de PII** | Emails, telefones e tokens podem vazar para Sentry |
| G-7 | **Sem healthcheck do app no compose de prod** | Caddy pode tentar conectar antes do app estar pronto |
| G-8 | **SEED_ADMIN_PASSWORD falta no .env.example** | Operador pode esquecer de setar e seed falhar em prod |

### Importantes (qualidade comercial)

| # | Gap | Impacto |
|---|---|---|
| G-9 | Scripts úteis faltando em `package.json` | `typecheck`, `db:backup`, `db:restore`, `deploy`, `check-env` |
| G-10 | Caddyfile minimalista | Sem compressão, headers de segurança, rate limit |
| G-11 | Sem smoke test automatizado | Deploy manual arrisca quebrar feature |
| G-12 | Sem procedimento de rollback | Rollback = improvisar em momento de crise |
| G-13 | Sem `engines` no `package.json` | Node 18 vs 20 pode quebrar |
| G-14 | `next.config.ts` precisa confirmar `output: standalone` | sem isso, Docker standalone não funciona |
| G-15 | Não há documentação de onboarding de cliente | Primeiro cliente vai exigir improviso |
| G-16 | Não há checklist de venda | Vendedor não tem material |

### Desejáveis (pós-deploy)

| # | Gap | Impacto |
|---|---|---|
| G-17 | Sentry `tracesSampleRate` muito alto para 12GB RAM | Pode consumir muita memória |
| G-18 | Middleware rate limit em memória (não Redis) | Em multi-instance (futuro) não funciona |
| G-19 | Sem CI/CD | Deploy manual |
| G-20 | Sem monitoramento de uptime externo | Não detecta queda do site |

---

## 3. ARQUIVOS A CRIAR/ALTERAR

### 3.1 Criar (novos)

| Arquivo | Propósito | Prioridade |
|---|---|---|
| `scripts/deploy.sh` | Deploy automatizado: pull, build, migrate, restart, health check | Crítico |
| `scripts/backup.sh` | Backup Postgres com timestamp, retenção 30 dias | Crítico |
| `scripts/restore.sh` | Restore com confirmação forte | Crítico |
| `scripts/check-env.ts` | Validador de env (chamável em CI e pré-deploy) | Crítico |
| `scripts/smoke-test.sh` | Smoke test automatizado pós-deploy | Importante |
| `docs/ETAPA-14-CHECKLIST-VENDA.md` | Checklist comercial completo | Importante |
| `docs/ETAPA-14-ONBOARDING-CLIENTE.md` | Procedimento de onboarding | Importante |
| `docs/ETAPA-14-TERMOS-LGPD.md` | Termos de uso + privacidade básicos | Importante |
| `docs/ETAPA-14-SUPORTE-SLA.md` | Política de suporte | Importante |
| `docs/ETAPA-14-PLANOS-PRECOS.md` | Tabela de planos sugeridos | Importante |
| `docs/ETAPA-14-INCIDENTES-RUNBOOK.md` | Runbook de incidentes | Importante |
| `docs/ETAPA-14-ROLLBACK.md` | Procedimento de rollback | Importante |
| `.github/workflows/ci.yml` (opcional) | CI rodando typecheck + lint + E2E | Desejável |

### 3.2 Alterar (existentes)

| Arquivo | O que mudar | Prioridade |
|---|---|---|
| `docker/entrypoint.sh` | Remover echo de DATABASE_URL, melhorar error handling | Crítico |
| `docker-compose.prod.yml` | Remover fallback de senha, adicionar healthcheck do app, volume de backups | Crítico |
| `src/lib/env.ts` | Marcar `STRIPE_WEBHOOK_SECRET` como `required: true` (consistência com P17) | Crítico |
| `sentry.server.config.ts` | Adicionar `beforeSend` para filtrar PII (password, token, email) | Crítico |
| `sentry.client.config.ts` | Adicionar `beforeSend` para filtrar PII | Crítico |
| `package.json` | Adicionar scripts: `typecheck`, `db:backup`, `db:restore`, `check-env`, `deploy` (helper) | Importante |
| `docker/caddy/Caddyfile` OU `docker-compose.prod.yml` | **Decidir stack prod**: nginx (com P14) OU Caddy melhorado | Crítico |
| `README_DEPLOY.md` | Atualizar com scripts reais, fluxo único, decisão nginx/caddy | Importante |
| `.env.example` | Adicionar `SEED_ADMIN_*`, ajustar placeholders, remover placeholders inseguros | Importante |
| `package.json` | Adicionar `engines: { node: ">=20" }` | Desejável |

### 3.3 Não criar/alterar (escopo respeitado)

- Schema Prisma (zero alteração)
- Regras de negócio (zero alteração)
- APIs (zero alteração)
- Testes (zero remoção, apenas novos)
- Visual (zero alteração)

---

## 4. RISCOS

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R-1 | Vazamento de segredo em logs (entrypoint.sh) | Alta | Crítico | Remover `echo` linha 4, substituir por `echo "DATABASE_URL: configured"` |
| R-2 | Caddyfile minimalista deixa prod exposto | Média | Médio | Decidir entre (a) Caddy melhorado com snippets OU (b) usar nginx com certbot (consistente com dev) |
| R-3 | Sem backup = qualquer erro = perda total | Baixa | Crítico | Script de backup com retenção 30 dias, agendado via cron do host, restore testado em staging |
| R-4 | `next start` script não existe no package.json | Alta | Crítico | Verificar e adicionar `start: "next start"` se necessário |
| R-5 | `output: standalone` no next.config.ts não verificado | Baixa | Crítico | Verificar `next.config.ts` linha 5-10 e confirmar |
| R-6 | Sem healthcheck = proxy pode 502 nos primeiros segundos | Alta | Baixo | Adicionar healthcheck no app + `depends_on: service_healthy` |
| R-7 | Sentry captura PII sem filtro | Média | Médio-LGPD | `beforeSend` que remove emails, telefones, tokens, password fields |
| R-8 | Stripe webhook secret não bloqueia prod sem | Média | Crítico | Marcar como `required: true` no `env.ts` validator |
| R-9 | Inconsistência nginx/caddy confunde operador | Alta | Médio | Padronizar UM stack (recomendo nginx + certbot para alinhar com dev e P14) |
| R-10 | Sem rollback = incidente vira crise | Baixa | Crítico | Documentar rollback, tag de versão no Docker, backup antes de cada deploy |

---

## 5. PLANO DE IMPLEMENTAÇÃO (5 fases)

### Fase 1 — Correções críticas de segurança (4-6h)

1. `docker/entrypoint.sh`: remover echo DATABASE_URL
2. `docker-compose.prod.yml`: remover fallback POSTGRES_PASSWORD, adicionar healthcheck app
3. `src/lib/env.ts`: `STRIPE_WEBHOOK_SECRET` → `required: true`
4. `sentry.server.config.ts` + `sentry.client.config.ts`: `beforeSend` para PII
5. Validar `next.config.ts` tem `output: standalone`
6. Validar `package.json` tem `start: "next start"`

### Fase 2 — Scripts essenciais (3-4h)

1. `scripts/check-env.ts`: valida todas as envs antes de subir
2. `scripts/backup.sh`: pg_dump com timestamp, compressão, retenção 30 dias, log seguro
3. `scripts/restore.sh`: pede confirmação "RESTORE", valida backup, executa
4. `scripts/deploy.sh`: pull, build, backup pré-deploy, migrate, restart, health check, smoke
5. `package.json`: adicionar scripts `check-env`, `db:backup`, `db:restore`, `typecheck`, `db:migrate:prod`

### Fase 3 — Padronização nginx/caddy (2-3h)

1. **Decisão**: padronizar em nginx (alinha com dev, com P14 já pronto, mais controle)
2. Atualizar `docker-compose.prod.yml` para usar nginx (mesmo do dev)
3. Remover pasta `docker/caddy/` se a decisão for nginx
4. Atualizar `README_DEPLOY.md` com fluxo único
5. Adicionar `scripts/smoke-test.sh` que faz curl em /login, /api/health

### Fase 4 — Documentação comercial (2-3h)

1. `docs/ETAPA-14-CHECKLIST-VENDA.md`: planos, onboarding, suporte, primeira venda
2. `docs/ETAPA-14-ONBOARDING-CLIENTE.md`: passo a passo
3. `docs/ETAPA-14-TERMOS-LGPD.md`: termos básicos + privacidade
4. `docs/ETAPA-14-SUPORTE-SLA.md`: política de suporte
5. `docs/ETAPA-14-INCIDENTES-RUNBOOK.md`: troubleshooting
6. `docs/ETAPA-14-ROLLBACK.md`: procedimento
7. `README_DEPLOY.md`: atualizar tudo

### Fase 5 — Validação final (1-2h)

1. Rodar `tsc --noEmit`
2. Rodar `npm run build`
3. Rodar regressão E2E completa
4. Testar `scripts/check-env.ts` localmente
5. Testar `scripts/backup.sh` e `scripts/restore.sh` em staging
6. Verificar que `package.json` está limpo
7. Atualizar `.env.example` final

---

## 6. COMANDOS FINAIS DE DEPLOY

### 6.1 Primeiro deploy (VPS Contabo)

```bash
ssh root@86.48.24.70
mkdir -p /opt/gestor-local
cd /opt/gestor-local
git clone <REPO> .
cd /opt/gestor-local

# Validar env antes de subir
npm run check-env

# Subir
docker compose -f docker-compose.prod.yml up -d

# Aguardar postgres healthy (30s)
sleep 30

# Migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Seed (apenas primeiro deploy)
docker compose -f docker-compose.prod.yml exec app npx tsx prisma/seed.ts

# SSL Let's Encrypt
certbot certonly --standalone -d avgestao.com.br -d www.avgestao.com.br \
  --email admin@avgestao.com.br --agree-tos --no-eff-email
mkdir -p docker/nginx/ssl
cp /etc/letsencrypt/live/avgestao.com.br/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/avgestao.com.br/privkey.pem docker/nginx/ssl/
chmod 600 docker/nginx/ssl/privkey.pem
docker compose -f docker-compose.prod.yml restart nginx

# Backup automático
echo "0 3 * * * root /opt/gestor-local/scripts/backup.sh" > /etc/cron.d/gestor-backup
chmod 644 /etc/cron.d/gestor-backup

# SSL auto-renovação
echo "0 4 * * * certbot renew --quiet && docker compose -f /opt/gestor-local/docker-compose.prod.yml restart nginx" | crontab -

# Smoke test
./scripts/smoke-test.sh
```

### 6.2 Deploy de atualização

```bash
cd /opt/gestor-local
./scripts/deploy.sh
```

### 6.3 Backup manual

```bash
cd /opt/gestor-local
./scripts/backup.sh
ls -lh backups/
```

### 6.4 Restore

```bash
cd /opt/gestor-local
./scripts/restore.sh backups/gestor_2026-06-19_0300.sql.gz
# (pode precisar parar o app antes)
```

### 6.5 Logs

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f postgres
```

### 6.6 Rollback

```bash
cd /opt/gestor-local
git log --oneline -5
git checkout <commit-anterior>
./scripts/deploy.sh
# Se falhar, restore backup:
./scripts/restore.sh backups/gestor_<data-anterior>.sql.gz
```

---

## 7. CHECKLIST FINAL ANTES DA PRIMEIRA VENDA

### 7.1 Infraestrutura

- [ ] VPS configurada (Ubuntu 24.04, Docker, 12GB RAM)
- [ ] Domínio `avgestao.com.br` apontando para IP da VPS (A record)
- [ ] DNS propagado (`dig avgestao.com.br`)
- [ ] Certificado Let's Encrypt emitido e copiado para `docker/nginx/ssl/`
- [ ] HTTPS funcionando (testar `https://avgestao.com.br`)
- [ ] HTTP redireciona para HTTPS
- [ ] HSTS funcionando (verificar headers com `curl -I`)

### 7.2 Variáveis de ambiente

- [ ] `.env` preenchido com **TODAS** as vars obrigatórias
- [ ] `AUTH_SECRET` >= 32 chars, gerado com `openssl rand -base64 32`
- [ ] `CRON_SECRET` >= 16 chars, gerado
- [ ] `STRIPE_SECRET_KEY` é `sk_live_...` (não `sk_test_`)
- [ ] `STRIPE_WEBHOOK_SECRET` configurado (whsec_)
- [ ] `STRIPE_BASIC_PRICE_ID` e `STRIPE_PRO_PRICE_ID` configurados
- [ ] `RESEND_API_KEY` configurado
- [ ] `RESEND_FROM_EMAIL` é domínio verificado no Resend
- [ ] `SEED_ADMIN_PASSWORD` >= 16 chars
- [ ] `SENTRY_DSN` configurado (opcional mas recomendado)
- [ ] `node scripts/check-env.ts` passa sem erro

### 7.3 Stripe

- [ ] Conta Stripe em modo **live**
- [ ] Produtos criados: Basic R$49, Pro R$99
- [ ] Webhook endpoint configurado: `https://avgestao.com.br/api/stripe/webhook`
- [ ] Eventos do webhook: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] `whsec_` copiado para `.env`
- [ ] Teste manual: criar empresa trial → checkout → ATIVAR → verificar módulo

### 7.4 Resend

- [ ] Domínio `avgestao.com.br` verificado no Resend
- [ ] SPF + DKIM configurados
- [ ] `RESEND_FROM_EMAIL=noreply@avgestao.com.br` (não `resend.dev`)
- [ ] Teste: enviar email de reset de senha → chega

### 7.5 Banco de dados

- [ ] `npx prisma migrate deploy` rodou sem erro
- [ ] Seed criou super admin com sucesso
- [ ] Backup automático agendado (cron 3AM)
- [ ] Restore testado em staging (criar banco de teste, restaurar backup)

### 7.6 Aplicação

- [ ] `npm run build` sucesso
- [ ] `npx tsc --noEmit` 0 erros
- [ ] `npm run test:e2e` 100% passando
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Criar OS funciona
- [ ] Fechar OS funciona
- [ ] Cardápio público funciona
- [ ] Logout funciona

### 7.7 Monitoramento

- [ ] Sentry capturando erros de teste (disparar erro manual)
- [ ] Sentry NÃO captura senhas/tokens (verificar payload de teste)
- [ ] Logs do app acessíveis via `docker compose logs`
- [ ] (Opcional) Uptime monitor externo (UptimeRobot, Better Uptime)

### 7.8 Documentação

- [ ] `docs/ETAPA-14-CHECKLIST-VENDA.md` criado
- [ ] `docs/ETAPA-14-ONBOARDING-CLIENTE.md` criado
- [ ] `docs/ETAPA-14-TERMOS-LGPD.md` criado
- [ ] `docs/ETAPA-14-SUPORTE-SLA.md` criado
- [ ] `docs/ETAPA-14-INCIDENTES-RUNBOOK.md` criado
- [ ] `docs/ETAPA-14-ROLLBACK.md` criado
- [ ] `README_DEPLOY.md` atualizado
- [ ] Termos de uso publicados no site (rota `/termos`)
- [ ] Política de privacidade publicada no site (rota `/privacidade`)

### 7.9 Primeira venda

- [ ] Cliente identificado
- [ ] Demo agendada (30-45 min)
- [ ] Proposta comercial enviada (preço + módulos)
- [ ] Link de pagamento Stripe enviado
- [ ] Pagamento confirmado
- [ ] Empresa criada pelo super admin (TRIAL 15 dias)
- [ ] Módulos ativados
- [ ] Usuário admin criado
- [ ] Senha enviada por email seguro (não email marketing)
- [ ] Treinamento 1:1 agendado (30 min)
- [ ] Acompanhamento 7 dias (WhatsApp)

---

## 8. DECISÃO PENDENTE

### Nginx vs Caddy em produção

| Critério | Nginx (já pronto) | Caddy (atual) |
|---|---|---|
| SSL automático (Let's Encrypt) | manual via certbot | automático |
| Config existente (P14) | robusta (73 linhas, HSTS, compressão) | minimalista (7 linhas) |
| Consistência com dev | mesmo compose | diferente |
| Headers de segurança | todos | nenhum |
| Compressão gzip | sim | não |
| Rate limit | precisa adicionar | precisa adicionar |
| Custo de tempo para deixar prod-ready | baixo (já tem P14) | alto (reescrever Caddyfile) |
| Habilidade operacional | comum | menos comum |

**Recomendação**: **nginx + certbot** (consistente com dev, com P14 já pronto, mais controle). Mas se preferir simplicidade do Caddy, pode-se melhorar o Caddyfile adicionando `header` directives, `encode gzip`, e `reverse_proxy` com health check.

---

## 9. RESUMO EXECUTIVO

- **Estado**: projeto funciona, mas deploy de prod tem 8 gaps críticos e 8 importantes
- **Risco principal**: vazamento de senha Postgres em log + ausência de backup
- **Tempo estimado para implementar tudo**: **10-15 horas** de trabalho
- **Bloqueio de primeira venda**: depende da decisão nginx vs Caddy
- **Pronto para venda após**: Fase 1 + Fase 2 + Fase 4 (decisão pode esperar para Fase 3)

---

## 10. PENDÊNCIAS DE APROVAÇÃO

Por favor confirmar antes de implementar:

1. **Nginx ou Caddy?** (recomendo nginx)
2. **Implementar todas as 5 fases ou apenas críticas (1+2)?**
3. **Prazo alvo para deploy em prod?** (define se Fase 5 — CI/CD — entra ou não)
4. **Algo do checklist 7.9 (primeira venda) que você quer ajustar antes?**

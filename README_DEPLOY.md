# Deploy — AVGESTÃO na VPS Contabo

## 📋 Especificações da VPS

| Item | Valor |
|------|-------|
| Provedor | Contabo |
| Plano | Cloud VPS 20 NVMe |
| IP | `86.48.24.70` |
| OS | Ubuntu 24.04 |
| CPU | 6 vCPU |
| RAM | 12 GB |
| Disco | 100 GB NVMe |
| Domínio | `avgestao.com.br` |
| Stack proxy | **Caddy 2** (HTTPS automático via Let's Encrypt) |

---

## 🚀 Primeiro Deploy (passo a passo)

### 1. Acessar a VPS

```bash
ssh root@86.48.24.70
```

### 2. Instalar Docker + dependências

```bash
apt update && apt upgrade -y
apt install docker.io docker-compose-v2 git openssl -y
systemctl enable --now docker
```

### 3. Clonar o repositório

```bash
mkdir -p /opt/gestor-local
git clone <URL-DO-REPO> /opt/gestor-local
cd /opt/gestor-local
```

### 4. Criar arquivo `.env`

```bash
nano .env
```

Use o `.env.example` como base, mas **substitua todos os placeholders por valores reais**:

```env
# Gerados com: openssl rand -base64 32
POSTGRES_PASSWORD="<gerado>"
AUTH_SECRET="<gerado>"
CRON_SECRET="<gerado>"

# Gerado com: openssl rand -base64 24
SEED_ADMIN_PASSWORD="<gerado>"

# URLs publicas
NEXTAUTH_URL="https://avgestao.com.br"
NEXT_PUBLIC_APP_URL="https://avgestao.com.br"
NEXT_PUBLIC_APP_NAME="AVGESTAO"

# Banco (mesma senha do POSTGRES_PASSWORD)
DATABASE_URL="postgresql://gestor:<senha>@postgres:5432/gestor_local?schema=public"
POSTGRES_USER="gestor"
POSTGRES_DB="gestor_local"

# Stripe live
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_BASIC_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."

# Resend
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@avgestao.com.br"

# Sentry (opcional)
SENTRY_DSN=""
SENTRY_ORG=""
SENTRY_PROJECT="avgestao"

# Seed admin
SEED_ADMIN_EMAIL="admin@avgestao.com.br"
SEED_ADMIN_NAME="Admin AVGESTAO"
```

> **Importante**: o sistema aborta o boot se faltarem envs obrigatórias. Valide antes de subir com `npm run check-env`.

### 5. Validar env

```bash
cd /opt/gestor-local
NODE_ENV=production npm run check-env
```

Se houver erros, corrija o `.env` antes de continuar.

### 6. Configurar DNS

No registro.br, adicione para `avgestao.com.br`:

| Tipo | Nome | Valor |
|------|------|-------|
| A | `@` | `86.48.24.70` |
| A | `www` | `86.48.24.70` |

Aguarde propagar (`dig avgestao.com.br`).

### 7. Subir containers

```bash
cd /opt/gestor-local
docker compose -f docker-compose.prod.yml up -d
```

Caddy detecta o domínio e emite certificado Let's Encrypt automaticamente. Pode levar 30-90 segundos na primeira vez.

### 8. Aguardar app saudável

```bash
# Health check do app (via Docker network)
docker compose -f docker-compose.prod.yml exec app wget -q --spider http://127.0.0.1:3000/api/health
```

### 9. Rodar migrations e seed (primeiro deploy apenas)

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec app npx tsx prisma/seed.ts
```

> **ATENÇÃO**: o seed usa `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` do `.env`. Anote a senha em local seguro.

### 10. Configurar backup automático

```bash
# Backup diario as 3h da manha
echo "0 3 * * * root cd /opt/gestor-local && /usr/bin/bash scripts/backup.sh >> /var/log/gestor-backup.log 2>&1" > /etc/cron.d/gestor-backup
chmod 644 /etc/cron.d/gestor-backup
```

### 11. Smoke test

```bash
BASE_URL=https://avgestao.com.br npm run smoke-test
```

Resultado esperado: `3 passou, 0 falhou`.

---

## 🔄 Deploy de atualizações

### Opção A: Totalmente automático (recomendado) ⭐

**Setup único**, depois só `git push`:

1. Configure CI/CD (GitHub Actions) + Watchtower na VPS
2. Em todo push na `main`:
   - GitHub Actions: typecheck + lint + E2E + build + push imagem
   - Watchtower: detecta em até 5 min, atualiza container
   - Auto-heal: monitora, restart se cair
   - Manutenção: limpeza diária

**Como configurar**: veja [`docs/ETAPA-14-AUTOMACOES.md`](docs/ETAPA-14-AUTOMACOES.md)

### Opção B: Manual via SSH

```bash
ssh root@86.48.24.70
cd /opt/avgestao
./scripts/deploy.sh
```

O script `deploy.sh` faz automaticamente:

1. Validar env
2. Backup pré-deploy
3. `git pull` (fast-forward)
4. `npm ci`
5. `prisma generate`
6. Rebuild do container `app`
7. `prisma migrate deploy` (dentro do container)
8. Restart dos containers
9. Health check (até 60s)
10. Smoke test contra `BASE_URL`

> **Seed NÃO roda automaticamente em atualização.** Apenas no primeiro deploy.

### Opção C: Wrapper local (Windows): `scripts/remote.ps1`

Em vez de entrar manualmente na VPS, use o wrapper local:

```powershell
# Configure UMA vez no .env (gitignored):
#   VPS_SERVER=86.48.24.70
#   VPS_USER=root
#   VPS_PASSWORD=...        # ou VPS_KEY=C:\path\id_rsa
#   APP_DIR=/opt/avgestao

# Uso:
.\scripts\remote.ps1 deploy
.\scripts\remote.ps1 backup
.\scripts\remote.ps1 restore backups/gestor_2026-06-19_0300.sql.gz
.\scripts\remote.ps1 smoke
.\scripts\remote.ps1 status
.\scripts\remote.ps1 logs [app|postgres|caddy]
.\scripts\remote.ps1 restart [app|postgres|caddy]
.\scripts\remote.ps1 exec "docker ps -a"
.\scripts\remote.ps1 ssh             # shell interativo
.\scripts\remote.ps1 setup          # instala Watchtower + cron + auto-heal
```

Suporta `plink.exe` (PuTTY) ou `ssh.exe` (OpenSSH nativo do Win10/11) automaticamente.

### Atalhos (aliases PowerShell)

Copie `scripts/aliases.ps1` para o seu `$PROFILE`. Aí:

- `gs` = status
- `gd` = deploy
- `gb` = backup
- `gl app` = logs do app
- `gsm` = smoke test
- `gsh` = shell na VPS
- `avgestao` = ajuda

---

## 💾 Backup e Restore

### Backup manual

```bash
cd /opt/gestor-local
npm run db:backup
```

Saída esperada:

```
[backup] Gerando backup: backups/gestor_2026-06-19_1430.sql.gz
[backup] OK: backups/gestor_202or_2026-06-19_1430.sql.gz (2.3M)
[backup] Limpando backups com mais de 30 dias...
[backup] Removidos: 0 arquivo(s) antigo(s).
[backup] Total de backups retidos: 1
```

Backups ficam em `./backups/` (volume Docker `gestor_backups` se rodando dentro do container).

### Restore

```bash
cd /opt/gestor-local
npm run db:restore -- backups/gestor_2026-06-19_0300.sql.gz
```

O script pede confirmação digitando `RESTORE`. Veja detalhes em `docs/ETAPA-14-ROLLBACK.md`.

> ⚠️ **Teste o restore em staging antes de confiar.** Um backup que não pode ser restaurado é pior que não ter backup.

---

## 🌐 Domínio e HTTPS

### Caddy gerencia SSL automaticamente

Caddy detecta o domínio no Caddyfile e:

- Emite certificado Let's Encrypt na primeira subida
- Renova automaticamente antes de expirar
- Redireciona HTTP → HTTPS
- Redireciona www → apex

### Verificar SSL

```bash
curl -I https://avgestao.com.br
# Esperado: HTTP/2 200, Strict-Transport-Security: max-age=63072000...
```

### Forçar renovação manual (se necessário)

```bash
docker compose -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## 💳 Stripe Webhook

Após o domínio estar funcionando:

1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com) > Desenvolvedores > Webhooks
2. **Add endpoint**: `https://avgestao.com.br/api/stripe/webhook`
3. **Eventos**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copie o `whsec_...` para `STRIPE_WEBHOOK_SECRET` no `.env`
5. Reinicie o app: `docker compose -f docker-compose.prod.yml restart app`

---

## 📧 Resend (Email)

1. Crie conta em [resend.com](https://resend.com)
2. Adicione domínio `avgestao.com.br` e configure DNS (SPF + DKIM)
3. Crie API key
4. Preencha `RESEND_API_KEY` e `RESEND_FROM_EMAIL` no `.env`
5. Reinicie o app

> **Em dev sem Resend configurado**: emails são logados no console do app (token de reset aparece no log).

---

## 📊 Sentry (opcional)

1. Crie projeto em [sentry.io](https://sentry.io)
2. Copie o DSN
3. Preencha `SENTRY_DSN` no `.env`
4. Reinicie o app
5. PII (senhas, tokens, emails) já é filtrada via `beforeSend`

---

## 🐳 Comandos úteis

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f postgres

# Status
docker compose -f docker-compose.prod.yml ps

# Restart
docker compose -f docker-compose.prod.yml restart app

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Subir
docker compose -f docker-compose.prod.yml up -d

# Banco
docker exec -it gestor_postgres psql -U gestor -d gestor_local
docker exec gestor_postgres psql -U gestor -d gestor_local -c "SELECT pg_size_pretty(pg_database_size('gestor_local'));"

# Validar env
NODE_ENV=production npm run check-env

# Backup
npm run db:backup

# Smoke test
npm run smoke-test
```

---

## 🔒 Segurança

- PostgreSQL **não tem porta exposta** — só a rede interna do Docker
- Portas públicas: **22** (SSH), **80** (HTTP), **443** (HTTPS)
- Caddy gerencia SSL automático via Let's Encrypt
- Variáveis sensíveis **apenas no .env** (nunca no código)
- Backup criptografado em repouso no disco da VPS
- Sentry filtra PII automaticamente (senhas, tokens, emails)
- Rate limit no middleware: 100 req/min por IP em `/api/*`
- Headers de segurança: HSTS, X-Frame-Options, CSP, Permissions-Policy

---

## ⚠️ Troubleshooting

| Problema | Solução |
|----------|---------|
| App não sobe | `docker compose logs app` |
| Banco não conecta | Verificar `DATABASE_URL` no `.env` e se `POSTGRES_PASSWORD` confere |
| SSL não emite | Domínio precisa apontar para o IP (`dig avgestao.com.br`) e portas 80/443 abertas |
| Migration falha | `docker compose exec app npx prisma migrate deploy` |
| Smoke test falha | Verificar `BASE_URL` no `.env` e logs do app |
| Env validation falha | `NODE_ENV=production npm run check-env` |
| Restore backup | Ver `docs/ETAPA-14-ROLLBACK.md` |
| Rollback de versão | Ver `docs/ETAPA-14-ROLLBACK.md` |
| Incidente grave | Ver `docs/ETAPA-14-INCIDENTES-RUNBOOK.md` |

---

## 📚 Documentação adicional

- `docs/ETAPA-14-AUDITORIA-PRODUCAO.md` — auditoria completa
- `docs/ETAPA-14-CHECKLIST-VENDA.md` — checklist de venda
- `docs/ETAPA-14-ONBOARDING-CLIENTE.md` — onboarding de cliente
- `docs/ETAPA-14-PLANOS-PRECOS.md` — planos e preços
- `docs/ETAPA-14-SUPORTE-SLA.md` — política de suporte
- `docs/ETAPA-14-TERMOS-LGPD.md` — termos e LGPD
- `docs/ETAPA-14-INCIDENTES-RUNBOOK.md` — runbook de incidentes
- `docs/ETAPA-14-ROLLBACK.md` — procedimento de rollback

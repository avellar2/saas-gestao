# Deploy — Gestor Local na VPS Contabo

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

---

## 🚀 Primeiro Deploy (passo a passo)

### 1. Acessar a VPS

```bash
ssh root@86.48.24.70
```

### 2. Instalar Docker

```bash
apt update && apt upgrade -y
apt install docker.io docker-compose-v2 git -y
systemctl enable --now docker
```

### 3. Clonar o repositório

```bash
mkdir -p /opt/gestor-local
git clone <URL-DO-REPO> /opt/gestor-local
cd /opt/gestor-local
```

### 4. Criar arquivo .env

```bash
nano .env
```

Cole o conteúdo abaixo e preencha com seus valores reais:

```env
# Database
POSTGRES_PASSWORD="senha-forte-aqui"
DATABASE_URL="postgresql://gestor:senha-forte-aqui@postgres:5432/gestor_local?schema=public"

# Auth
AUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://avgestao.com.br"

# App
NEXT_PUBLIC_APP_NAME="Gestor Local"
NEXT_PUBLIC_APP_URL="https://avgestao.com.br"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_BASIC_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."

# Email (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@avgestao.com.br"
```

### 5. Criar pastas de backup

```bash
mkdir -p backups
chmod +x scripts/*.sh
```

### 6. Subir os containers

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 7. Rodar migrations e seed

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec app npx tsx prisma/seed.ts
```

### 8. Configurar backup automático

```bash
echo "0 3 * * * root /opt/gestor-local/scripts/backup.sh" > /etc/cron.d/gestor-backup
chmod 644 /etc/cron.d/gestor-backup
```

---

## 🔄 Deploy de atualizações

```bash
ssh root@86.48.24.70
cd /opt/gestor-local
./scripts/deploy.sh
```

O script `deploy.sh` faz automaticamente:
1. Backup do banco atual
2. `git pull` da main
3. Rebuild do container app
4. Roda migrations
5. Verifica saúde

---

## 📦 Backup e Restore

### Backup manual

```bash
./scripts/backup.sh
```

Os backups ficam em `/opt/gestor-local/backups/` com nome `gestor_YYYY-MM-DD_HHmm.sql.gz`.

### Restore

```bash
./scripts/restore.sh backups/gestor_2026-06-13_0300.sql.gz
```

---

## 🌐 Domínio e DNS

### Configurar DNS no registro.br

1. Acesse [registro.br](https://registro.br)
2. Vá em **Domínios** > `avgestao.com.br` > **DNS**
3. Adicione os registros:

| Tipo | Nome | Valor |
|------|------|-------|
| A | `avgestao.com.br` | `86.48.24.70` |
| A | `www.avgestao.com.br` | `86.48.24.70` |

4. Após propagar, edite o `docker/caddy/Caddyfile`:
   - Descomente o bloco de produção
   - Comente o bloco de IP

5. Recarregue o Caddy:

```bash
docker compose -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### Stripe Webhook

Após o domínio estar funcionando:

1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com) > Desenvolvedores > Webhooks
2. Adicione endpoint: `https://avgestao.com.br/api/stripe/webhook`
3. Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copie o `whsec_...` para o `.env`

---

## 🐳 Comandos úteis

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f caddy

# Ver status
docker compose -f docker-compose.prod.yml ps

# Restartar um serviço
docker compose -f docker-compose.prod.yml restart app

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Subir novamente
docker compose -f docker-compose.prod.yml up -d

# Acessar o banco
docker exec -it gestor_postgres psql -U gestor -d gestor_local

# Ver tamanho do banco
docker exec gestor_postgres psql -U gestor -d gestor_local -c "SELECT pg_size_pretty(pg_database_size('gestor_local'));"
```

---

## 🔒 Segurança

- PostgreSQL **não tem porta exposta** — só a rede interna do Docker
- Portas públicas: **22** (SSH), **80** (HTTP), **443** (HTTPS)
- Caddy gerencia SSL automático via Let's Encrypt
- Variáveis sensíveis **apenas no .env** (nunca no código)
- Backup criptografado em repouso no disco da VPS

---

## ⚠️ Troubleshooting

| Problema | Solução |
|----------|---------|
| App não sobe | `docker compose logs app` |
| Banco não conecta | Verificar `DATABASE_URL` no .env |
| SSL não emite | Domínio precisa apontar para o IP |
| Migration falha | Rodar manualmente: `docker compose exec app npx prisma migrate deploy` |
| Porta 3000 ocupada | App não expõe porta 3000 no host, só via Caddy |

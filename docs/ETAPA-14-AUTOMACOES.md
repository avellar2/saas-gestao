# ETAPA 14 — Automações "Não Preciso Fazer Nada"

> Após configurar uma única vez, o AVGESTÃO se mantém sozinho. Você só edita código e dá `git push`.

---

## 1. Filosofia

| Antes | Depois |
|-------|--------|
| `git push` no GitHub | (mesmo) |
| SSH na VPS | — |
| `cd /opt/avgestao && git pull` | — |
| `npm ci` | — |
| `docker compose build` | — |
| `prisma migrate deploy` | — |
| `docker compose up -d` | — |
| `./scripts/smoke-test.sh` | — |
| Cuidar de logs | — |
| Limpar disco | — |
| Reiniciar se cair | — |
| Atualizar SSL | (Caddy já fazia) |

**Fluxo do dia-a-dia:**

1. Você: edita código
2. Você: `git push`
3. GitHub Actions: typecheck + lint + E2E + build + push imagem
4. Watchtower na VPS: detecta imagem nova, pull, restart
5. Auto-heal: se algo cair, restart automático
6. Manutenção: limpeza diária automática
7. Você: toma café ☕

---

## 2. Componentes

### 2.1 GitHub Actions (`.github/workflows/deploy.yml`)

Em todo push na `main`:
1. Roda `typecheck` + `lint`
2. Roda testes E2E contra Postgres em container
3. Builda imagem Docker
4. Pusha para GHCR (`ghcr.io/SEU_USUARIO/avgestao/app`)
5. Opcionalmente notifica Watchtower via API

**Setup inicial:**
1. Push do `.github/workflows/deploy.yml` para o GitHub
2. Settings > Actions > General > Workflow permissions: **"Read and write permissions"**
3. (Opcional) Adicionar secret `WATCHTOWER_URL` se quiser update imediato

### 2.2 Watchtower (auto-update de containers)

Container que fica polling GHCR/Docker Hub. Quando detecta nova imagem:
- Faz pull
- Para o container antigo
- Sobe o novo
- Limpa imagem antiga

**Configurado em** `docker-compose.prod.yml`:
- Poll a cada 5 minutos
- Só monitora containers com label `com.centurylinklabs.watchtower.enable=true`
- O `app` tem essa label

### 2.3 Auto-heal (cron a cada 5 min)

`scripts/vps-heal.sh`:
1. Roda smoke test (`/api/health`)
2. Se falhar: tenta restart do app
3. Se ainda falhar: restart de tudo
4. Se ainda falhar: notifica operador
5. Limite: 3 restarts/hora (depois disso, só notifica)

**Log**: `/var/log/avgestao-heal.log`

### 2.4 Backup diário (cron 3h)

Já existia na Etapa 14: `scripts/backup.sh`
- Roda às 3h da manhã
- Salva em `backups/gestor_YYYY-MM-DD_HHMM.sql.gz`
- Retém 30 dias
- Log: `/var/log/avgestao-backup.log`

### 2.5 Manutenção diária (cron 4h)

`scripts/vps-maintenance.sh`:
1. Prune imagens Docker antigas
2. Prune build cache > 24h
3. Prune volumes órfãos
4. Prune redes não usadas
5. Limpa logs do sistema > 30 dias
6. Trunca logs Docker > 100MB
7. Limpa backups > 30 dias
8. `unattended-upgrade` (security patches)
9. Verifica disco (alerta se > 80%)

**Log**: `/var/log/avgestao-maintenance.log`

### 2.6 Notificações (webhook)

`scripts/notify.sh` suporta:
- **Telegram**: `NOTIFY_WEBHOOK_URL=https://api.telegram.org/bot<TOKEN>/sendMessage` + `NOTIFY_CHAT_ID=...`
- **Discord**: webhook URL
- **Slack**: webhook URL
- **Generic**: POST JSON com `{title, message}`

Configurar no `.env` da VPS:
```env
NOTIFY_WEBHOOK_URL=https://...
NOTIFY_CHAT_ID=123456789  # só Telegram
```

---

## 3. Setup (uma única vez)

### 3.1 Local (sua máquina Windows)

1. **Instale os aliases no PowerShell**:
   ```powershell
   notepad $PROFILE
   ```
   Cole o conteúdo de `scripts/aliases.ps1`. Salve.
   
   Reinicie o PowerShell ou rode `. $PROFILE`.

2. **Configure `.env` da VPS** (já feito se chegou aqui):
   ```env
   VPS_SERVER=86.48.24.70
   VPS_USER=root
   VPS_PASSWORD=...
   APP_DIR=/opt/avgestao
   ```

3. **Push para o GitHub**:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "feat: CI/CD automatico"
   git push origin main
   ```

4. **GitHub**: Settings > Actions > General > Workflow permissions: "Read and write permissions"

5. **Edite `.github/workflows/deploy.yml`**: troque `SEU_USUARIO_GITHUB` pelo seu username do GitHub.

### 3.2 VPS (uma vez)

Roda a setup automatizada:

```powershell
cd C:\projetos\saas-gestão
.\scripts\remote.ps1 setup
```

(ou via alias: `gsetup`)

Isso instala:
- Crontab (backup, manutenção, heal)
- Logrotate
- Unattended-upgrades
- Sobe o Watchtower

---

## 4. Mudar app para usar imagem do GHCR (opcional, para auto-update)

Por padrão o `app` é construído localmente (`build: ./docker/Dockerfile`). Para o Watchtower atualizar, ele precisa puxar de um registry.

**Edite** `docker-compose.prod.yml` no container `app`:
```yaml
  app:
    image: ghcr.io/SEU_USUARIO/avgestao/app:latest  # <-- ADICIONE ISSO
    # build:                                     # <-- COMENTE ISSO
    #   context: .
    #   dockerfile: docker/Dockerfile
    ...
```

Faça commit + push → GitHub Actions builda e publica → Watchtower puxa.

---

## 5. Workflow do dia-a-dia

### Cenário: você fez uma mudança pequena

```bash
# Local
git add .
git commit -m "fix: bug X"
git push origin main

# Vai acontecer automaticamente:
# 1. GitHub Actions valida (typecheck + lint + E2E)
# 2. Se passar, builda e publica imagem
# 3. Watchtower na VPS detecta em ate 5 min
# 4. Pull + restart
# 5. Auto-heal monitora

# (opcional) Verificar:
gsm     # smoke test
gl app  # ver logs
gs      # ver status
```

### Cenário: você quer rollback rápido

```powershell
# SSH na VPS
gsh

# Dentro da VPS:
cd /opt/avgestao
docker compose -f docker-compose.prod.yml pull app   # baixa latest
# OU
docker compose -f docker-compose.prod.yml pull app:SHA_ANTIGO

# Restart
docker compose -f docker-compose.prod.yml up -d app
```

### Cenário: site caiu

Não faça nada. O auto-heal cuida em 5 minutos. Se persistir, você recebe webhook.

### Cenário: disco cheio

Não faça nada. Manutenção diária limpa. Se passar de 80%, você recebe alerta.

---

## 6. Verificações

### Ver se Watchtower está funcionando

```bash
docker logs gestor_watchtower --tail 50
```

### Ver logs do auto-heal

```bash
tail -f /var/log/avgestao-heal.log
```

### Ver logs da manutenção

```bash
tail -f /var/log/avgestao-maintenance.log
```

### Cron rodando

```bash
crontab -l
# ou
cat /etc/cron.d/avgestao
```

---

## 7. Troubleshooting

| Problema | Solução |
|----------|---------|
| Watchtower não atualiza | `docker logs gestor_watchtower`. Pode ser rate limit do GHCR (anônimo). Adicione PAT. |
| Auto-heal não roda | `systemctl status cron`. Pode ter parado. `systemctl start cron` |
| Disco encheu | Rodar `bash scripts/vps-maintenance.sh` manualmente |
| Notificações não chegam | Testar: `bash scripts/notify.sh "TESTE" "Olá"` |
| GitHub Actions falha | Ver logs em github.com/SEU_USUARIO/avgestao/actions |

### Watchtower + GHCR anônimo

GHCR tem rate limit baixo para pulls anônimos. Se Watchtower falhar, criar PAT:

1. GitHub > Settings > Developer settings > Personal access tokens > Fine-grained
2. Permissions: `read:packages`
3. Adicionar no `.env` da VPS:
   ```env
   GHCR_USERNAME=seu_usuario
   GHCR_TOKEN=ghp_xxxxxxxxxxxx
   ```
4. Watchtower precisa de config adicional. Editar compose:
   ```yaml
   watchtower:
     environment:
       - WATCHTOWER_REGISTRY_TLS_SKIP=true
     # ... e usar --registry-user/--registry-pass no comando
   ```

(Para deploy solo pequeno, rate limit anônimo costuma dar conta.)

---

## 8. Limitações conhecidas

- **GHCR rate limit**: anônimo tem limite. Com PAT, é resolvido.
- **Cold start do Watchtower**: primeira detecção demora até 5 min.
- **Migrations com breaking change**: precisa cuidado. Auto-heal pode reiniciar antes de migration completar. Solução: deploy com `start_period` maior ou pausar Watchtower durante deploy manual.
- **Sem staging**: deploy direto em prod. Para V2: criar staging environment.

---

## 9. Quando o usuário precisa intervir

| Situação | Ação |
|----------|------|
| Migração com breaking change | Pausar Watchtower, fazer deploy manual |
| Disco > 90% apesar da manutenção | Verificar logs de Docker, aumentar disco |
| Sistema totalmente fora | SSH e olhar logs (ou restore backup) |
| Quer mudar configuração crítica | Editar compose + restart manual |

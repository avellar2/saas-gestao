# ETAPA 14 — Runbook de Incidentes

> Procedimentos para responder aos incidentes mais comuns em produção.

---

## 1. Classificação de Incidentes

| Nível | Tipo | SLA Resposta |
|-------|------|--------------|
| **P0** | Sistema fora do ar | 15 min |
| **P1** | Função crítica quebrada (login, OS, financeiro) | 1h |
| **P2** | Função importante com workaround | 4h |
| **P3** | Cosmético, sem impacto operacional | 24h |

---

## 2. P0 — App fora do ar

### Sintomas
- Health check retorna erro
- Smoke test falha
- Cliente reclama que "não entra"

### Primeiros passos
```bash
# 1. Status dos containers
docker compose -f docker-compose.prod.yml ps

# 2. Logs do app
docker compose -f docker-compose.prod.yml logs --tail=100 app

# 3. Logs do Caddy
docker compose -f docker-compose.prod.yml logs --tail=50 caddy

# 4. Health check do app via rede Docker
docker compose -f docker-compose.prod.yml exec app wget -q --spider http://127.0.0.1:3000/api/health
```

### Causas comuns
- **App crashou**: ver logs, reiniciar com `docker compose restart app`
- **Banco caiu**: `docker compose logs postgres`, reiniciar
- **Sem disco**: `df -h` na VPS
- **Sem memória**: `free -m` na VPS

### Se for o banco
```bash
docker compose -f docker-compose.prod.yml restart postgres
sleep 30
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Se for o app
```bash
docker compose -f docker-compose.prod.yml restart app
sleep 10
curl -sf http://127.0.0.1:3000/api/health
```

### Se nada resolver
Considerar rollback (ver `docs/ETAPA-14-ROLLBACK.md`).

### Comunicação
- Avisar clientes em até 30 min via email + WhatsApp
- Status page (se houver) atualizar
- Post-mortem em até 48h

---

## 3. P1 — Login não funciona

### Sintomas
- Cliente não consegue logar
- Health check OK, mas login retorna 500

### Investigação
```bash
# Logs
docker compose -f docker-compose.prod.yml logs app | grep -i "auth\|login"

# Sentry
# (abrir dashboard e filtrar por /api/auth)
```

### Causas comuns
- **AUTH_SECRET rotacionado**: clientes logados são deslogados (esperado). Recriar cookie.
- **Senha do banco errada**: app crasha ao tentar query
- **Migration pendente**: usuário não existe na tabela nova

### Fix
```bash
# Rodar migrations pendentes
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Restart
docker compose -f docker-compose.prod.yml restart app
```

### Comunicação
- Se > 30 min: avisar clientes ativos por email

---

## 4. P1 — Banco não conecta

### Sintomas
- App retorna 500 em qualquer rota
- Logs mostram "Can't reach database"

### Investigação
```bash
# Verificar container
docker compose -f docker-compose.prod.yml ps postgres

# Logs
docker compose -f docker-compose.prod.yml logs --tail=50 postgres

# Disco
df -h /var/lib/docker/volumes

# Conectividade interna
docker compose -f docker-compose.prod.yml exec app nc -z postgres 5432
```

### Causas comuns
- Disco cheio
- Senha errada no `.env`
- Migration corrompida
- Container crashou

### Fix
```bash
# 1. Reiniciar postgres
docker compose -f docker-compose.prod.yml restart postgres
sleep 30

# 2. Verificar logs
docker compose -f docker-compose.prod.yml logs --tail=20 postgres

# 3. Se não subir, ver espaço
df -h
du -sh /var/lib/docker/volumes/gestor_pgdata

# 4. Se espaço cheio, ver backups antigos
ls -lh /opt/gestor-local/backups/
# Deletar backups antigos manualmente se necessário
```

### Se banco corrompeu
**NÃO TENTAR REPARAR**. Restaurar backup (ver `docs/ETAPA-14-ROLLBACK.md`).

---

## 5. P1 — Stripe webhook falhando

### Sintomas
- Cliente pagou mas continua TRIAL
- Sentry mostra erro em `/api/stripe/webhook`

### Investigação
```bash
# Logs do app
docker compose -f docker-compose.prod.yml logs app | grep -i stripe

# Sentry (filtrar por stripe)
```

### Causas comuns
- **STRIPE_WEBHOOK_SECRET errado**: signature inválida
- **Webhook não configurado no Stripe**: eventos não chegam
- **App rejeitando evento**: erro de business logic

### Fix
```bash
# 1. Verificar .env
grep STRIPE_WEBHOOK_SECRET .env

# 2. Verificar webhook no Stripe dashboard
# https://dashboard.stripe.com/webhooks

# 3. Re-ativar manualmente (one-off)
docker compose -f docker-compose.prod.yml exec app npx tsx scripts/fix-stripe-subscription.ts <companyId>
# (criar este script sob demanda)
```

### Comunicação
- Cliente específico: avisar que ativação será manual
- Ativação manual via painel super admin (atualizar status da empresa)

---

## 6. P2 — Email não chega

### Sintomas
- Cliente diz que email de reset/OS não chegou
- Resend dashboard mostra erro

### Investigação
```bash
# Logs do app
docker compose -f docker-compose.prod.yml logs app | grep -i "resend\|email"

# Resend dashboard
# https://resend.com/emails
```

### Causas comuns
- **RESEND_API_KEY errada/expirada**: emails falham silenciosamente
- **Domínio não verificado**: Resend bloqueia envio
- **Email na caixa de spam**: cliente não viu
- **Endereço inválido**: bounce

### Fix
- Verificar API key em `https://resend.com/api-keys`
- Verificar domínio em `https://resend.com/domains`
- Pedir para checar spam/lixeira
- Reenviar manualmente pelo painel

---

## 7. P2 — Smoke test falhando

### Sintomas
- `npm run smoke-test` retorna exit code 1
- Health check OK, mas `/login` ou `/` retorna erro

### Investigação
```bash
# Rodar smoke test com verbose
BASE_URL=https://avgestao.com.br bash -x scripts/smoke-test.sh

# Logs do Caddy (vê se está chegando requisição)
docker compose -f docker-compose.prod.yml logs --tail=50 caddy

# Logs do app
docker compose -f docker-compose.prod.yml logs --tail=50 app
```

### Causas comuns
- **Caddy não emite SSL**: aguardar 1-2 min e tentar de novo
- **Cache do Caddy corrompido**: `docker compose restart caddy`
- **App não respondeu em 15s**: app pode estar lento, reiniciar

---

## 8. P3 — Bug específico reportado

### Sintomas
- Cliente reporta comportamento estranho
- Tela X não funciona, mas o resto sim

### Investigação
```bash
# Logs
docker compose -f docker-compose.prod.yml logs app | grep <termo>

# Sentry
# Filtrar por user / período / URL
```

### Fix
- Avaliar se é bug nosso ou uso errado
- Se bug nosso: criar branch, fix, deploy (pode ser hotfix)
- Se uso errado: responder ao cliente com tutorial

### Comunicação
- Resposta em até 24h úteis
- Atualizar card no Trello

---

## 9. Restaurar Backup (cenário genérico)

```bash
# 1. Identificar backup desejado
ls -lh /opt/gestor-local/backups/

# 2. Parar app (importante!)
docker compose -f docker-compose.prod.yml stop app

# 3. Rodar restore
cd /opt/gestor-local
npm run db:restore -- backups/gestor_2026-06-19_0300.sql.gz
# Digitar: RESTORE

# 4. Restart app
docker compose -f docker-compose.prod.yml start app

# 5. Smoke test
npm run smoke-test
```

Mais detalhes em `docs/ETAPA-14-ROLLBACK.md`.

---

## 10. Logs Úteis — Referência Rápida

### Ver logs ao vivo
```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs -f caddy
```

### Filtrar por termo
```bash
docker compose -f docker-compose.prod.yml logs app | grep -i "error\|stripe\|auth"
```

### Últimas N linhas
```bash
docker compose -f docker-compose.prod.yml logs --tail=200 app
```

### Logs do host (VPS)
```bash
# Syslog
tail -f /var/log/syslog

# Auth
tail -f /var/log/auth.log

# Cron (backup)
tail -f /var/log/gestor-backup.log
```

---

## 11. Contatos de Emergência

- **Dev principal**: [TELEFONE]
- **Operador VPS**: [TELEFONE]
- **Suporte Stripe**: https://support.stripe.com
- **Suporte Resend**: https://resend.com/support
- **Suporte Contabo**: https://contabo.com/support

---

## 12. Post-Mortem (após P0 ou P1)

Após resolver, em até 48h:

- [ ] Escrever post-mortem (causa raiz, timeline, ação corretiva)
- [ ] Implementar fix preventivo
- [ ] Adicionar alerta/monitoramento (se aplicável)
- [ ] Comunicar clientes afetados (se P0)
- [ ] Documentar lições aprendidas

Template de post-mortem:

```markdown
## Post-Mortem: [TÍTULO]

**Data**: YYYY-MM-DD
**Severidade**: P0/P1/P2
**Duração**: Xh Ym
**Detectado por**: [Cliente/Interno/Sentry]

### Timeline
- HH:MM — evento aconteceu
- HH:MM — detectado
- HH:MM — resposta iniciada
- HH:MM — resolvido

### Causa raiz
[Descrição técnica]

### Impacto
- X clientes afetados
- Y requisições falharam
- Z transações perdidas

### Ação corretiva
- [ ] Fix X
- [ ] Alerta Y
- [ ] Documentação Z

### Lições aprendidas
1. ...
2. ...
```

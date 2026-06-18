# ETAPA 14 — Procedimento de Rollback

> Como reverter uma versão com problema ou restaurar o banco para um ponto anterior.

---

## 1. Quando Fazer Rollback

- Deploy introduziu bug crítico (P0/P1)
- Migration corrompeu dados
- Cliente reportou regressão grave
- Smoke test pós-deploy falha
- Decisão de produto desfaz release

**Não fazer rollback para**:
- Bug cosmético (P3) — fixar com hotfix
- Feature indesejada (reverter com git revert, mas não deploy)
- Lentidão (otimizar primeiro)

---

## 2. Tipos de Rollback

| Tipo | Quando usar | Comando |
|------|-------------|---------|
| **Rollback de código** | Bug no app, mas banco OK | `git checkout <commit>` + redeploy |
| **Rollback de banco** | Migration corrompeu dados | `npm run db:restore -- backup.sql.gz` |
| **Rollback completo** | Ambos corrompidos | Restore banco + checkout commit anterior + redeploy |

---

## 3. Rollback de Código (sem mexer no banco)

```bash
ssh root@86.48.24.70
cd /opt/gestor-local

# Ver últimos commits
git log --oneline -10

# Checkout do commit anterior (anote o hash antes!)
git checkout <commit-anterior>

# Rebuild + redeploy
./scripts/deploy.sh
```

> O `deploy.sh` já faz backup pré-deploy automaticamente. Mas se o rollback incluir migration, cuidado — ver seção 4.

---

## 4. Rollback de Código COM Migration

Se a nova versão incluiu migration que quebrou algo:

```bash
ssh root@86.48.24.70
cd /opt/gestor-local

# 1. PRIMEIRO: parar app
docker compose -f docker-compose.prod.yml stop app

# 2. Ver migrations aplicadas
docker compose -f docker-compose.prod.yml exec postgres psql -U gestor -d gestor_local \
  -c "SELECT migration_name FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;"

# 3. Marcar migration como rolled back (manualmente)
docker compose -f docker-compose.prod.yml exec postgres psql -U gestor -d gestor_local \
  -c "DELETE FROM _prisma_migrations WHERE migration_name = '<migration_problematica>';"

# 4. Reverter schema manualmente (ou restaurar backup)
# Opção A: reverter schema manualmente (se for simples)
# Opção B: restaurar backup (mais seguro)
```

> ⚠️ **Migrations do Prisma não têm rollback automático**. Você precisa reverter manualmente o SQL.

---

## 5. Restore de Banco (voltar dados para um ponto)

Use quando o banco está corrompido ou dados foram perdidos.

### Passo a passo
```bash
ssh root@86.48.24.70
cd /opt/gestor-local

# 1. Listar backups disponíveis
ls -lh backups/

# 2. Escolher o backup certo (anotar timestamp)
# Exemplo: backups/gestor_2026-06-19_0300.sql.gz

# 3. Parar o app (CRUCIAL)
docker compose -f docker-compose.prod.yml stop app

# 4. Rodar restore
npm run db:restore -- backups/gestor_2026-06-19_0300.sql.gz
# Script pede confirmação: digite RESTORE

# 5. Restart do app
docker compose -f docker-compose.prod.yml start app

# 6. Smoke test
npm run smoke-test

# 7. Avisar clientes (se > 1h de downtime)
```

### Se o restore falhar
```bash
# 1. Verificar integridade do arquivo
gunzip -t backups/gestor_2026-06-19_0300.sql.gz

# 2. Se OK, tentar de novo com verbose
gunzip -c backups/gestor_2026-06-19_0300.sql.gz | head -100
# (deve mostrar SQL válido)

# 3. Tentar backup mais recente
ls -lh backups/
```

### Se não houver backup válido
- Contatar suporte de emergência
- Reconstruir dados via atividade log (se ainda disponível)
- Aceitar perda de dados e comunicar clientes

---

## 6. Rollback Completo (cenário nuclear)

```bash
ssh root@86.48.24.70
cd /opt/gestor-local

# 1. Confirmar que tem backup bom
ls -lh backups/

# 2. Parar TUDO
docker compose -f docker-compose.prod.yml down

# 3. Checkout do commit correto
git log --oneline -10
git checkout <commit-que-funciona>

# 4. Rebuild
docker compose -f docker-compose.prod.yml build

# 5. Subir containers (vai criar banco vazio)
docker compose -f docker-compose.prod.yml up -d postgres
sleep 30

# 6. Restore do backup (em banco vazio)
docker compose -f docker-compose.prod.yml run --rm postgres bash -c "pg_isready -U gestor"
# Quando postgres estiver pronto:
npm run db:restore -- backups/gestor_YYYY-MM-DD_HHMM.sql.gz

# 7. Subir app
docker compose -f docker-compose.prod.yml up -d

# 8. Smoke test
npm run smoke-test
```

---

## 7. Validação Pós-Rollback

```bash
# 1. Health check
docker compose -f docker-compose.prod.yml exec app wget -q --spider http://127.0.0.1:3000/api/health

# 2. Smoke test
npm run smoke-test

# 3. Login manual (via super admin)
# https://avgestao.com.br/login

# 4. Verificar empresa principal
# Acessar painel admin e validar que dados estão lá

# 5. Conferir com cliente específico
# Pedir para cliente validar se problema foi resolvido
```

---

## 8. Comunicação com Clientes

### Antes do rollback (se > 30 min)
```
Assunto: Manutenção Emergencial — [DURAÇÃO ESTIMADA]

Olá,

Detectamos um problema em [FEATURE] e vamos reverter a versão
para manter a estabilidade.

Início: [HH:MM]
Duração estimada: [X minutos]
Impacto: [descrever]

Pedimos desculpas pelo transtorno. Estamos trabalhando para
resolver o mais rápido possível.

Equipe AVGESTÃO
```

### Após rollback
```
Assunto: Problema Resolvido

Olá,

O problema em [FEATURE] foi resolvido às [HH:MM].

Causa: [resumo]
Ação: revertemos para versão estável
Status: tudo normal

Se você ainda tem problema, por favor nos avise.

Equipe AVGESTÃO
```

---

## 9. Pós-Rollback

Em até 48h:

- [ ] Escrever post-mortem (ver `docs/ETAPA-14-INCIDENTES-RUNBOOK.md` seção 12)
- [ ] Criar issue no Trello/GitHub descrevendo o que aconteceu
- [ ] Adicionar teste de regressão (se bug foi por falta de teste)
- [ ] Comunicar cliente se dados foram perdidos
- [ ] Atualizar documentação de deploy se necessário

---

## 10. Prevenção

Para reduzir a chance de rollback:

- [ ] **Sempre rodar smoke test pós-deploy** (deploy.sh já faz)
- [ ] **Sempre ter backup pré-deploy** (deploy.sh já faz)
- [ ] **Deploy em horário de baixo movimento** (manhã cedo ou fim de semana)
- [ ] **Deploy em feature flag** (para V2)
- [ ] **Testar em staging antes** (criar staging env no V2)
- [ ] **Tag de versão no git** (para saber o que está em prod)
- [ ] **Migrations compatíveis com versão anterior** (não quebrar dados antigos)

---

## 11. Rollback Automático (Futuro / V2)

Quando tivermos staging + CI/CD:

```bash
# Pipeline detecta falha no smoke test
# Automaticamente:
#   1. Reverte para commit anterior
#   2. Rebuild
#   3. Restore do último backup bom
#   4. Avisa operador via Slack
```

> Não implementado no MVP (escopo).

---

## 12. Checklist Rápido de Rollback

```markdown
- [ ] Confirmar que precisa de rollback (não é fix hotfix?)
- [ ] Identificar tipo: código / banco / completo
- [ ] Parar app
- [ ] Escolher commit anterior OU backup
- [ ] Executar rollback
- [ ] Smoke test
- [ ] Validar com cliente
- [ ] Comunicar clientes
- [ ] Post-mortem
```

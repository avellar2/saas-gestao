#!/bin/bash
# Deploy de atualizacao em producao.
#
# Fluxo:
#   1. Validar env (.env)
#   2. Backup pre-deploy
#   3. git pull
#   4. npm ci
#   5. prisma generate
#   6. Rebuild container app
#   7. migrate deploy
#   8. Restart
#   9. Health check
#  10. Smoke test
#
# NAO roda seed automaticamente (seed so no primeiro deploy).
# Em caso de falha, mostra mensagem clara e NAO rollbacka automaticamente
# (operador deve seguir docs/ETAPA-14-ROLLBACK.md).

set -e

APP_DIR="${APP_DIR:-/opt/gestor-local}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$APP_DIR"

echo "===================================================="
echo "  DEPLOY AVGESTAO - $(date)"
echo "===================================================="

echo ""
echo "[1/10] Validando env..."
if ! npm run check-env; then
  echo "[deploy] ERRO: validacao de env falhou. Corrija o .env." >&2
  exit 1
fi

echo ""
echo "[2/10] Backup pre-deploy..."
if ! bash scripts/backup.sh; then
  echo "[deploy] AVISO: backup falhou. Continuar mesmo assim? (s/N)"
  read -r CONTINUE
  if [ "$CONTINUE" != "s" ] && [ "$CONTINUE" != "S" ]; then
    echo "[deploy] Abortado pelo operador."
    exit 1
  fi
fi

echo ""
echo "[3/10] git pull..."
if [ -d .git ]; then
  git pull --ff-only
else
  echo "[deploy] AVISO: nao e um repositorio git. Pulando."
fi

echo ""
echo "[4/10] npm ci..."
npm ci --no-audit --no-fund

echo ""
echo "[5/10] prisma generate..."
npx prisma generate

echo ""
echo "[6/10] Rebuild container app..."
docker compose -f "$COMPOSE_FILE" build app

echo ""
echo "[7/10] prisma migrate deploy (dentro do container)..."
docker compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy

echo ""
echo "[8/10] Restart containers..."
docker compose -f "$COMPOSE_FILE" up -d
docker compose -f "$COMPOSE_FILE" restart app

echo ""
echo "[9/10] Aguardando app ficar saudavel (ate 60s)..."
for i in $(seq 1 12); do
  if curl -sf -o /dev/null --max-time 5 http://127.0.0.1:3000/api/health 2>/dev/null \
    || docker compose -f "$COMPOSE_FILE" exec -T app wget -q --spider http://127.0.0.1:3000/api/health 2>/dev/null; then
    echo "  App saudavel em ~${i}*5 segundos"
    break
  fi
  sleep 5
done

echo ""
echo "[10/10] Smoke test..."
if BASE_URL="${BASE_URL:-https://avgestao.com.br}" bash scripts/smoke-test.sh; then
  echo ""
  echo "DEPLOY CONCLUIDO COM SUCESSO"
  echo ""
  echo "Proximos passos:"
  echo "  - Monitorar logs: docker compose -f ${COMPOSE_FILE} logs -f app"
  echo "  - Verificar Sentry: capturar evento de teste"
  echo "  - Se algo estiver errado: ver docs/ETAPA-14-ROLLBACK.md"
  exit 0
else
  echo ""
  echo "[deploy] AVISO: smoke test falhou. Verifique logs."
  echo "  docker compose -f ${COMPOSE_FILE} logs -f app"
  echo "  Em caso de problema grave, consulte docs/ETAPA-14-ROLLBACK.md"
  exit 1
fi

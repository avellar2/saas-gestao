#!/bin/bash
# Auto-heal: detecta problemas e tenta consertar sozinho.
# Rodar via cron a cada 5 minutos.
#
# Acoes:
#   - Roda smoke test
#   - Se falha, tenta restart do app
#   - Se ainda falha, restart do postgres
#   - Notifica via webhook se persistir
#   - Log em /var/log/avgestao-heal.log

set -e

HEAL_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${APP_DIR:-/opt/avgestao}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"
LOG_FILE="/var/log/avgestao-heal.log"
NOTIFY_SCRIPT="$HEAL_DIR/notify.sh"
MAX_RESTARTS_PER_HOUR=3
STATE_FILE="/tmp/avgestao-heal-state"

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# Carrega webhook se existir
if [ -f "$APP_DIR/.env" ]; then
  # shellcheck disable=SC1090
  set -a; . "$APP_DIR/.env"; set +a
fi

# Limpa estado se for nova hora
if [ -f "$STATE_FILE" ]; then
  last_hour=$(stat -c %Y "$STATE_FILE" 2>/dev/null || echo 0)
  current_hour=$(date +%s)
  if [ $((current_hour - last_hour)) -gt 3600 ]; then
    rm -f "$STATE_FILE"
  fi
fi

# Contador de restarts nessa hora
restarts=0
[ -f "$STATE_FILE" ] && restarts=$(cat "$STATE_FILE")

check_health() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")
  echo "$code"
}

notify() {
  local msg="$1"
  log "NOTIFY: $msg"
  if [ -x "$NOTIFY_SCRIPT" ]; then
    bash "$NOTIFY_SCRIPT" "AVGESTAO HEAL" "$msg" || true
  fi
}

restart_app() {
  log "Reiniciando app..."
  cd "$APP_DIR"
  docker compose -f docker-compose.prod.yml restart app >> "$LOG_FILE" 2>&1
  sleep 20
}

restart_all() {
  log "Reiniciando TUDO..."
  cd "$APP_DIR"
  docker compose -f docker-compose.prod.yml restart >> "$LOG_FILE" 2>&1
  sleep 30
}

# --- Loop principal ---
HEALTH=$(check_health)

if [ "$HEALTH" = "200" ]; then
  # Tudo OK
  if [ "$restarts" -gt 0 ]; then
    log "Servico recuperado (estava com $restarts restarts na ultima hora)"
    notify "OK: Servico recuperado apos $restarts restarts"
    rm -f "$STATE_FILE"
  fi
  exit 0
fi

# Algo esta errado
log "Health check falhou (HTTP $HEALTH)"

if [ "$restarts" -ge "$MAX_RESTARTS_PER_HOUR" ]; then
  log "Limite de restarts atingido ($restarts/hora). Notificando operador."
  notify "CRITICO: Health falhando. Ja tentou $restarts restarts nesta hora. Intervencao manual necessaria."
  exit 1
fi

# Tenta restart do app
restart_app
restarts=$((restarts + 1))
echo "$restarts" > "$STATE_FILE"

HEALTH2=$(check_health)
if [ "$HEALTH2" = "200" ]; then
  log "Recuperado apos restart do app"
  notify "OK: App recuperado apos restart automatico"
  exit 0
fi

# Ainda falhou. Tenta restart de tudo.
log "Restart do app nao resolveu. Reiniciando TUDO..."
restart_all

HEALTH3=$(check_health)
if [ "$HEALTH3" = "200" ]; then
  log "Recuperado apos restart completo"
  notify "OK: Sistema recuperado apos restart completo"
  exit 0
fi

# Nao resolveu
log "Sistema NAO recuperou. Notificando."
notify "CRITICO: Health falhando apos restart completo. Site pode estar fora. HTTP=$HEALTH3"
exit 1

#!/bin/bash
# Manutencao diaria automatica.
# Rodar via cron 1x por dia (ex: 4h da manha, apos backup).
#
# Acoes:
#   - Prune imagens Docker nao usadas (libera espaco)
#   - Prune volumes orfaos
#   - Prune redes nao usadas
#   - Limpa logs antigos do sistema (> 30 dias)
#   - Limpa logs do Docker (> 7 dias)
#   - Verifica espaco em disco
#   - Alerta se disco > 80%
#   - apt update + unattended-upgrade (atualizacoes de seguranca)

set -e

APP_DIR="${APP_DIR:-/opt/avgestao}"
LOG_FILE="/var/log/avgestao-maintenance.log"
NOTIFY_SCRIPT="$APP_DIR/scripts/notify.sh"
DISK_ALERT_THRESHOLD=80

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

notify() {
  local title="$1" msg="$2"
  if [ -x "$NOTIFY_SCRIPT" ]; then
    bash "$NOTIFY_SCRIPT" "$title" "$msg" || true
  fi
}

log "=== Iniciando manutencao diaria ==="

# 1. Prune de imagens Docker
log "Prune de imagens Docker (mantem apenas as usadas)..."
docker image prune -f 2>&1 | tee -a "$LOG_FILE" || true

# 2. Prune de build cache
log "Prune de build cache..."
docker builder prune -f --filter "until=24h" 2>&1 | tee -a "$LOG_FILE" || true

# 3. Prune de volumes orfaos
log "Prune de volumes orfaos..."
docker volume prune -f 2>&1 | tee -a "$LOG_FILE" || true

# 4. Prune de redes nao usadas
log "Prune de redes nao usadas..."
docker network prune -f 2>&1 | tee -a "$LOG_FILE" || true

# 5. Limpa logs antigos do sistema
log "Limpando logs do sistema > 30 dias..."
find /var/log -type f -name "*.gz" -mtime +30 -delete 2>&1 | tee -a "$LOG_FILE" || true
find /var/log -type f -name "*.log" -mtime +30 -delete 2>&1 | tee -a "$LOG_FILE" || true
journalctl --vacuum-time=30d 2>&1 | tee -a "$LOG_FILE" || true

# 6. Limpa logs Docker grandes
log "Verificando logs Docker > 100MB..."
for log_file in $(find /var/lib/docker/containers -name "*-json.log" 2>/dev/null); do
  size=$(stat -c %s "$log_file" 2>/dev/null || echo 0)
  if [ "$size" -gt 104857600 ]; then
    log "  Truncando $(basename $(dirname $log_file))-json.log ($(numfmt --to=iec $size))"
    truncate -s 0 "$log_file"
  fi
done

# 7. Limpa backups antigos (mantem 30 dias)
log "Limpando backups > 30 dias..."
find "$APP_DIR/backups" -name "*.sql.gz" -mtime +30 -delete 2>&1 | tee -a "$LOG_FILE" || true

# 8. Atualizacoes de seguranca (Ubuntu)
if command -v unattended-upgrade &> /dev/null; then
  log "Rodando unattended-upgrade..."
  unattended-upgrade -d 2>&1 | tee -a "$LOG_FILE" || true
else
  log "unattended-upgrade nao instalado (opcional)"
fi

# 9. Verifica espaco em disco
log "Verificando espaco em disco..."
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
log "Disco em ${DISK_USAGE}%"

if [ "$DISK_USAGE" -ge "$DISK_ALERT_THRESHOLD" ]; then
  log "ALERTA: Disco em ${DISK_USAGE}% (threshold ${DISK_ALERT_THRESHOLD}%)"
  notify "DISCO CHEIO" "Disco em ${DISK_USAGE}% no servidor. Limpar urgente."
fi

# 10. Estatisticas finais
log "=== Estatisticas pos-manutencao ==="
df -h / | tee -a "$LOG_FILE"
docker system df 2>&1 | tee -a "$LOG_FILE" || true
du -sh "$APP_DIR/backups" 2>/dev/null | tee -a "$LOG_FILE" || true

log "=== Manutencao concluida ==="

#!/bin/bash
# Backup do PostgreSQL do container de producao.
# - Salva em backups/ com timestamp
# - Compressao gzip
# - Retencao 30 dias
# - NAO imprime senha
# - Falha se banco nao estiver acessivel

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
CONTAINER_NAME="${CONTAINER_NAME:-gestor_postgres}"
DB_USER="${POSTGRES_USER:-gestor}"
DB_NAME="${POSTGRES_DB:-gestor_local}"

mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[backup] ERRO: container ${CONTAINER_NAME} nao esta rodando." >&2
  exit 1
fi

TIMESTAMP=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="${BACKUP_DIR}/gestor_${TIMESTAMP}.sql.gz"

echo "[backup] Gerando backup: ${BACKUP_FILE}"

if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists | gzip > "$BACKUP_FILE"; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[backup] OK: ${BACKUP_FILE} (${SIZE})"
else
  echo "[backup] ERRO: pg_dump falhou." >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "[backup] Limpando backups com mais de ${RETENTION_DAYS} dias..."
DELETED=$(find "$BACKUP_DIR" -name "gestor_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "[backup] Removidos: ${DELETED} arquivo(s) antigo(s)."

REMAINING=$(find "$BACKUP_DIR" -name "gestor_*.sql.gz" | wc -l)
echo "[backup] Total de backups retidos: ${REMAINING}"

#!/bin/bash
# ============================================================
# backup.sh — Backup do PostgreSQL do Gestor Local
# Uso: ./scripts/backup.sh
# Cron: 0 3 * * * /opt/gestor-local/scripts/backup.sh
# ============================================================
set -e

BACKUP_DIR="/opt/gestor-local/backups"
DB_NAME="gestor_local"
DB_USER="gestor"
CONTAINER="gestor_postgres"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
FILENAME="${BACKUP_DIR}/gestor_${TIMESTAMP}.sql.gz"

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup..."

# Verificar se o container está rodando
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERRO: Container ${CONTAINER} não está rodando"
    exit 1
fi

# Executar pg_dump dentro do container
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILENAME"

# Verificar se o backup foi criado
if [ -f "$FILENAME" ]; then
    SIZE=$(du -h "$FILENAME" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup concluído: ${FILENAME} (${SIZE})"
else
    echo "ERRO: Falha ao criar backup"
    exit 1
fi

# Remover backups antigos
find "$BACKUP_DIR" -name "gestor_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup antigos removidos (retenção: ${RETENTION_DAYS} dias)"

# Listar backups disponíveis
echo ""
echo "Backups disponíveis:"
ls -lh "$BACKUP_DIR" | tail -10

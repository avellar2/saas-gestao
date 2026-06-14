#!/bin/bash
# ============================================================
# restore.sh — Restaura backup do PostgreSQL do Gestor Local
# Uso: ./scripts/restore.sh backups/gestor_2026-06-13_0300.sql.gz
# ============================================================
set -e

if [ $# -ne 1 ]; then
    echo "Uso: $0 <arquivo-backup.sql.gz>"
    echo "Exemplo: $0 backups/gestor_2026-06-13_0300.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"
DB_NAME="gestor_local"
DB_USER="gestor"
CONTAINER="gestor_postgres"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERRO: Arquivo não encontrado: ${BACKUP_FILE}"
    exit 1
fi

echo "⚠️  ATENÇÃO: Isso vai SUBSTITUIR o banco de dados atual!"
echo "   Banco: ${DB_NAME}"
echo "   Backup: ${BACKUP_FILE}"
echo ""
read -p "Tem certeza? (digite 'sim' para confirmar): " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
    echo "Restauração cancelada."
    exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando restauração..."

# Verificar container
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERRO: Container ${CONTAINER} não está rodando"
    exit 1
fi

# Descompactar e restaurar
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restauração concluída!"
echo ""
echo "⚠️  Reinicie o container da aplicação para aplicar as migrations:"
echo "   docker restart gestor_app"

#!/bin/bash
# Restore de backup PostgreSQL.
# - Exige confirmacao digitando RESTORE
# - Valida que arquivo existe
# - NAO imprime senha
# - Para o app antes de restaurar (instrui o operador)

set -e

BACKUP_FILE="$1"
CONTAINER_NAME="${CONTAINER_NAME:-gestor_postgres}"
DB_USER="${POSTGRES_USER:-gestor}"
DB_NAME="${POSTGRES_DB:-gestor_local}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: $0 <arquivo-backup.sql.gz>" >&2
  echo "Exemplo: $0 backups/gestor_2026-06-19_0300.sql.gz" >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[restore] ERRO: arquivo ${BACKUP_FILE} nao encontrado." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[restore] ERRO: container ${CONTAINER_NAME} nao esta rodando." >&2
  exit 1
fi

echo "===================================================="
echo "  ATENCAO: RESTAURACAO DE BANCO DE DADOS"
echo "===================================================="
echo ""
echo "Arquivo:  ${BACKUP_FILE}"
echo "Container: ${CONTAINER_NAME}"
echo "Database:  ${DB_NAME}"
echo ""
echo "Esta operacao VAI SOBRESCREVER o banco atual."
echo "O app precisa estar parado durante o restore."
echo ""
echo "Para confirmar, digite exatamente: RESTORE"
echo ""

read -r CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
  echo "[restore] Cancelado pelo operador."
  exit 1
fi

echo "[restore] Confirmado. Restaurando backup..."

if ! gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1; then
  echo "[restore] ERRO: restore falhou." >&2
  exit 1
fi

echo "[restore] OK: banco restaurado de ${BACKUP_FILE}"
echo "[restore] Reinicie o app: docker compose -f docker-compose.prod.yml restart app"

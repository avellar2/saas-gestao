#!/bin/sh
# Entrypoint do container de produção.
# NAO imprime DATABASE_URL, senhas, tokens ou secrets.
# Falha claramente se migracao ou configuracao estiver incorreta.

set -e

# Avisa se DATABASE_URL nao esta setada, sem mostrar valor.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL nao configurada. Abortando."
  exit 1
fi
echo "[entrypoint] DATABASE_URL configured"

echo "[entrypoint] Rodando Prisma migrate deploy..."
if ! ./node_modules/.bin/prisma migrate deploy; then
  echo "[entrypoint] ERROR: prisma migrate deploy falhou. Abortando."
  exit 1
fi
echo "[entrypoint] Migrations aplicadas com sucesso"

# Next.js 16: HOSTNAME=0.0.0.0 faz o servidor bindar em todas interfaces.
# (SENAO: bind apenas no hostname do container, quebra healthcheck local)
echo "[entrypoint] Iniciando Next.js (standalone) em ${HOSTNAME:-0.0.0.0}:${PORT:-3000}..."
# Docker sobrescreve HOSTNAME com o ID do container. Forcamos 0.0.0.0 aqui.
unset HOSTNAME
HOSTNAME=0.0.0.0 exec node server.js


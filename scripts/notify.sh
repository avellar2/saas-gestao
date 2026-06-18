#!/bin/bash
# Notificacao via webhook (Telegram, Discord, Slack).
#
# Configure no .env da VPS:
#   NOTIFY_WEBHOOK_URL=https://api.telegram.org/bot.../sendMessage
#   NOTIFY_CHAT_ID=123456789
# OU
#   NOTIFY_WEBHOOK_URL=https://discord.com/api/webhooks/...
#
# OU mais simples (Slack-like):
#   NOTIFY_WEBHOOK_URL=https://hooks.slack.com/services/...
#
# Uso:
#   notify.sh "TITULO" "mensagem"

set -e

APP_DIR="${APP_DIR:-/opt/avgestao}"

# Carrega .env
if [ -f "$APP_DIR/.env" ]; then
  # shellcheck disable=SC1090
  set -a; . "$APP_DIR/.env"; set +a
fi

TITLE="${1:-AVGESTAO}"
MESSAGE="${2:-Sem mensagem}"

if [ -z "${NOTIFY_WEBHOOK_URL:-}" ]; then
  echo "[notify] NOTIFY_WEBHOOK_URL nao configurado em $APP_DIR/.env"
  echo "[notify] Mensagem: $TITLE - $MESSAGE"
  exit 0
fi

# Detecta tipo de webhook pelo URL
URL="$NOTIFY_WEBHOOK_URL"

if [[ "$URL" == *"api.telegram.org"* ]]; then
  # Telegram
  curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": \"${NOTIFY_CHAT_ID:-}\", \"text\": \"*$TITLE*\n\n$MESSAGE\", \"parse_mode\": \"Markdown\"}" \
    > /dev/null
elif [[ "$URL" == *"discord.com"* ]]; then
  # Discord
  curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"**$TITLE**\n\n$MESSAGE\"}" \
    > /dev/null
elif [[ "$URL" == *"hooks.slack.com"* ]]; then
  # Slack
  curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"*$TITLE*\n$MESSAGE\"}" \
    > /dev/null
else
  # Generic webhook (assume JSON POST com campo "text" ou "message")
  curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d "{\"title\": \"$TITLE\", \"message\": \"$MESSAGE\"}" \
    > /dev/null
fi

echo "[notify] Enviado: $TITLE"

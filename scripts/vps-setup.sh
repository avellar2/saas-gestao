#!/bin/bash
# Setup inicial da VPS - instala todas as automacoes.
# Rodar UMA VEZ apos primeiro deploy.
#
# Uso (da sua maquina local, via remote.ps1):
#   .\scripts\remote.ps1 setup
#
# Ou direto na VPS:
#   cd /opt/avgestao
#   bash scripts/vps-setup.sh
#
# O que faz:
#   1. Torna todos os scripts executaveis
#   2. Instala crontab (backup diario, manutencao diaria, heal a cada 5 min)
#   3. Configura logrotate
#   4. Instala unattended-upgrades (atualizacoes de seguranca automaticas)
#   5. Adiciona Watchtower ao docker-compose e sobe
#   6. Cria estrutura de diretorios
#   7. Primeira checagem de saude

set -e

APP_DIR="${APP_DIR:-/opt/avgestao}"
SCRIPTS_DIR="$APP_DIR/scripts"

echo "===================================================="
echo "  AVGESTAO VPS Setup - $(date)"
echo "===================================================="
echo ""

if [ ! -d "$APP_DIR" ]; then
  echo "ERRO: $APP_DIR nao existe. Faca o deploy primeiro."
  exit 1
fi

cd "$APP_DIR"

# 1. Torna scripts executaveis
echo "[1/7] Tornando scripts executaveis..."
chmod +x "$SCRIPTS_DIR"/*.sh
ls -lh "$SCRIPTS_DIR"/*.sh

# 2. Cria diretorios necessarios
echo ""
echo "[2/7] Criando diretorios..."
mkdir -p "$APP_DIR/backups"
mkdir -p /var/log
touch /var/log/avgestao-heal.log
touch /var/log/avgestao-maintenance.log
touch /var/log/avgestao-backup.log

# 3. Instala crontab
echo ""
echo "[3/7] Instalando crontab..."

# Backup diario as 3h
# Manutencao diaria as 4h
# Heal a cada 5 minutos
cat > /etc/cron.d/avgestao <<EOF
# AVGESTAO - crontab gerenciado por vps-setup.sh
# NAO EDITE MANUALMENTE (sera sobrescrito em cada setup)

# Variaveis
APP_DIR=$APP_DIR
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Backup diario as 3h da manha
0 3 * * * root /bin/bash $SCRIPTS_DIR/backup.sh >> /var/log/avgestao-backup.log 2>&1

# Manutencao diaria as 4h da manha (apos backup)
0 4 * * * root /bin/bash $SCRIPTS_DIR/vps-maintenance.sh >> /var/log/avgestao-maintenance.log 2>&1

# Auto-heal a cada 5 minutos
*/5 * * * * root /bin/bash $SCRIPTS_DIR/vps-heal.sh >> /var/log/avgestao-heal.log 2>&1
EOF

chmod 644 /etc/cron.d/avgestao
echo "  /etc/cron.d/avgestao criado"
echo "  - Backup: 3h diario"
echo "  - Manutencao: 4h diario"
echo "  - Heal: a cada 5 minutos"

# 4. Configura logrotate
echo ""
echo "[4/7] Configurando logrotate..."
cat > /etc/logrotate.d/avgestao <<EOF
/var/log/avgestao-*.log {
  daily
  rotate 7
  compress
  delaycompress
  missingok
  notifempty
  create 0644 root root
}
EOF
echo "  /etc/logrotate.d/avgestao criado"

# 5. Instala unattended-upgrades
echo ""
echo "[5/7] Configurando atualizacoes automaticas de seguranca..."
if command -v unattended-upgrade &> /dev/null; then
  echo "  unattended-upgrade ja instalado"
else
  apt-get update -qq
  apt-get install -y unattended-upgrades apt-listchanges 2>&1 | tail -3
fi

# Configura para aplicar so security updates automaticamente
cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
Unattended-Upgrade::Allowed-Origins {
  "\${distro_id}:\${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
echo "  Atualizacoes de seguranca: ATIVAS"
echo "  Reboot automatico: DESATIVADO (voce decide quando reiniciar)"

# 6. Sobe o Watchtower
echo ""
echo "[6/7] Iniciando Watchtower..."
if docker compose -f docker-compose.prod.yml ps --services 2>/dev/null | grep -q watchtower; then
  echo "  Watchtower ja configurado, subindo..."
  docker compose -f docker-compose.prod.yml up -d watchtower
else
  echo "  AVISO: Watchtower ainda nao esta no docker-compose.prod.yml"
  echo "  Fazendo pull e subindo standalone..."
  docker run -d \
    --name gestor_watchtower \
    --restart unless-stopped \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -e WATCHTOWER_LABEL_ENABLE=true \
    -e WATCHTOWER_CLEANUP=true \
    -e WATCHTOWER_POLL_INTERVAL=300 \
    -e TZ=America/Sao_Paulo \
    --network gestor_network \
    containrrr/watchtower
fi

# 7. Verificacao final
echo ""
echo "[7/7] Verificacao final..."
echo ""
echo "Containers rodando:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "Crontab ativo:"
crontab -l 2>/dev/null | grep -v "^#" | head -10 || cat /etc/cron.d/avgestao

echo ""
echo "Proxima checagem de saude em ate 5 minutos."
echo "Logs:"
echo "  - /var/log/avgestao-heal.log"
echo "  - /var/log/avgestao-maintenance.log"
echo "  - /var/log/avgestao-backup.log"

echo ""
echo "===================================================="
echo "  Setup concluido!"
echo "===================================================="
echo ""
echo "Proximos passos opcionais:"
echo "  1. Configurar webhook de notificacao (Telegram/Discord/Slack):"
echo "     Adicione no .env:"
echo "       NOTIFY_WEBHOOK_URL=https://..."
echo "       NOTIFY_CHAT_ID=...   # se Telegram"
echo ""
echo "  2. Apontar imagem do app para GHCR (para auto-update via Watchtower):"
echo "     Edite docker-compose.prod.yml:"
echo "       app:"
echo "         image: ghcr.io/SEU_USUARIO/avgestao/app:latest"
echo "     (substitua build: por image:)"
echo ""
echo "  3. Configurar GitHub Actions secret WATCHTOWER_URL (opcional):"
echo "     https://github.com/SEU_USUARIO/avgestao/settings/secrets"

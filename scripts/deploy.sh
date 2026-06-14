#!/bin/bash
# ============================================================
# deploy.sh — Deploy do Gestor Local na VPS
# Uso: ./scripts/deploy.sh
# ============================================================
set -e

cd /opt/gestor-local

echo "=========================================="
echo "  Gestor Local - Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# 1. Backup automático antes do deploy
echo "📦 Fazendo backup do banco atual..."
./scripts/backup.sh || echo "⚠️  Backup falhou, continuando mesmo assim..."
echo ""

# 2. Atualizar código
echo "📥 Atualizando código..."
git pull origin main
echo ""

# 3. Rebuild e restart
echo "🔨 Rebuildando containers..."
docker compose -f docker-compose.prod.yml up -d --build app
echo ""

# 4. Rodar migrations
echo "🗃️  Rodando migrations..."
docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy || echo "⚠️  Migration falhou, verificar manualmente"
echo ""

# 5. Verificar saúde
echo "🏥 Verificando saúde..."
sleep 5
if docker ps --format '{{.Names}}' | grep -q "^gestor_app$"; then
    echo "✅ App rodando!"
else
    echo "❌ App não está rodando. Verifique os logs:"
    echo "   docker compose -f docker-compose.prod.yml logs app"
fi

echo ""
echo "=========================================="
echo "  Deploy concluído!"
echo "=========================================="

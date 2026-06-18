#!/bin/bash
# Roda nova senha e ja atualiza no banco.
# Apos rodar, faca: docker compose -f docker-compose.prod.yml restart app

set -e

# Gera senha sem caracteres especiais (evita problema com + em URL)
NEW_PASS=$(openssl rand -hex 24)
echo "Nova senha: $NEW_PASS"

# 1. Atualiza .env (sem aspas - mais seguro)
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$NEW_PASS|" /opt/avgestao/.env
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://gestor:$NEW_PASS@postgres:5432/gestor_local?schema=public|" /opt/avgestao/.env

# 2. Atualiza senha do usuario no Postgres
echo "Atualizando senha no banco..."
docker exec gestor_postgres psql -U gestor -d gestor_local \
  -c "ALTER USER gestor WITH PASSWORD '$NEW_PASS';"

# 3. Restart do app para pegar a nova senha
echo "Reiniciando app..."
cd /opt/avgestao
docker compose -f docker-compose.prod.yml restart app

echo "OK! Senha rotacionada com sucesso."

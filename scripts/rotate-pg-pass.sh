#!/bin/bash
NEW_PASS=$(openssl rand -base64 24)
echo "Nova senha: $NEW_PASS"
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=\"$NEW_PASS\"|" /opt/avgestao/.env
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"postgresql://gestor:$NEW_PASS@postgres:5432/gestor_local?schema=public\"|" /opt/avgestao/.env
grep -E "^(POSTGRES_PASSWORD|DATABASE_URL)=" /opt/avgestao/.env

#!/bin/sh
set -e

echo "⏳ Running Prisma migrations..."
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy --schema=prisma/schema.prisma

echo "🚀 Starting Next.js..."
exec node server.js

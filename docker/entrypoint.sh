#!/bin/sh
set -e

echo "⏳ DATABASE_URL=${DATABASE_URL}"
echo "⏳ Running Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

echo "🚀 Starting Next.js..."
exec node server.js

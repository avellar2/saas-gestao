#!/bin/sh
set -e

echo "⏳ Running Prisma migrations..."
npx -y prisma@7 migrate deploy

echo "🚀 Starting Next.js..."
exec node server.js

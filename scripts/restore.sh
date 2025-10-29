#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/restore.sh [DATE] [VERSION]
# Example: bash scripts/restore.sh 2025-10-29 0.8.3

STAMP="${1:-$(date +%F)}"
VER="${2:-0.8.3}"

echo "🔄 Restoring snapshot from $STAMP (v$VER)"

# Verify backup exists
if [ ! -d "backups/$STAMP" ]; then
  echo "❌ Error: Backup directory backups/$STAMP not found"
  exit 1
fi

echo "📂 Checking out tag v$VER..."
git fetch --all --tags
git checkout "v$VER"

echo "🔐 Restoring environment files..."
if [ -f ".env.backups/$STAMP/.env" ]; then
  cp ".env.backups/$STAMP/.env" .env
  echo "✅ Restored .env"
else
  echo "⚠️  No .env backup found - you may need to configure manually"
fi

if [ -f ".env.backups/$STAMP/.env.local" ]; then
  cp ".env.backups/$STAMP/.env.local" .env.local
  echo "✅ Restored .env.local"
fi

echo "📦 Restoring dependencies..."
if [ -f ".env.backups/$STAMP/pnpm-lock.yaml" ]; then
  cp ".env.backups/$STAMP/pnpm-lock.yaml" pnpm-lock.yaml
fi
pnpm install --frozen-lockfile

echo "🗄️  Database restore available at: backups/$STAMP/db-full.sql"
echo ""
echo "⚠️  Manual steps required:"
echo ""
echo "1. Restore database (DESTRUCTIVE - will overwrite current data!):"
echo "   supabase db reset --db-url \"\$SUPABASE_DB_URL\" -f backups/$STAMP/db-full.sql"
echo ""
echo "2. Restore i18n locales (if needed):"
echo "   unzip -o backups/$STAMP/locales.zip -d public/"
echo ""
echo "3. Verify environment variables in .env match your current setup"
echo ""
echo "4. Build and start:"
echo "   pnpm build"
echo "   pnpm dev"

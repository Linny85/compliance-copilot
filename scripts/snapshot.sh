#!/usr/bin/env bash
set -euo pipefail

# Usage: bash scripts/snapshot.sh [DATE] [VERSION]
# Example: bash scripts/snapshot.sh 2025-10-29 0.8.3

STAMP="${1:-$(date +%F)}"
VER="${2:-0.8.3}"

echo "📸 Creating snapshot for $STAMP (v$VER)"

# Create backup directories
mkdir -p "backups/$STAMP" ".env.backups/$STAMP"

echo "📦 Building artifact..."
pnpm i --frozen-lockfile
pnpm build
( cd dist && zip -r "../artifact-$VER.zip" . )

echo "🗄️  Dumping database schema and data..."
supabase db dump -f "backups/$STAMP/db-full.sql" --schema public

echo "📝 Generating TypeScript types..."
supabase gen types typescript --local > src/integrations/supabase/types-snapshot.ts

echo "🔐 Backing up environment files..."
cp .env ".env.backups/$STAMP/.env" 2>/dev/null || true
cp .env.local ".env.backups/$STAMP/.env.local" 2>/dev/null || true
cp pnpm-lock.yaml ".env.backups/$STAMP/pnpm-lock.yaml"

echo "🌍 Backing up i18n locales..."
zip -r "backups/$STAMP/locales.zip" public/locales/

# Optional: Postmark templates (requires POSTMARK_SERVER_TOKEN)
if [ -n "${POSTMARK_SERVER_TOKEN:-}" ]; then
  echo "📧 Exporting Postmark templates..."
  curl -sS -H "X-Postmark-Server-Token: $POSTMARK_SERVER_TOKEN" \
       "https://api.postmarkapp.com/templates?count=500&offset=0" \
       > "backups/$STAMP/postmark-templates.json"
fi

# Optional: Stripe data (requires stripe CLI configured)
if command -v stripe &> /dev/null; then
  echo "💳 Exporting Stripe products and prices..."
  stripe products list -l 100 > "backups/$STAMP/stripe-products.json" 2>/dev/null || true
  stripe prices list -l 100 > "backups/$STAMP/stripe-prices.json" 2>/dev/null || true
fi

echo "✅ Snapshot complete!"
echo ""
echo "📍 Next steps:"
echo "   git add -A"
echo "   git commit -m 'chore(snapshot): $STAMP v$VER'"
echo "   git tag -a 'v$VER' -m 'Snapshot $STAMP'"
echo "   git push && git push --tags"

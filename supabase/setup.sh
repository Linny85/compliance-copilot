#!/usr/bin/env bash
set -e

echo "🚀 Norrland Innovate – Postmark E-Mail System Setup"
echo "---------------------------------------------------"

# 1️⃣ Migrationen ausführen
echo "🧱 Running database migrations..."
supabase db push || supabase migration up

# 2️⃣ Seed-Daten (Template-Aliase)
echo "🌱 Inserting Postmark template aliases..."
supabase db query < supabase/seeds/email_templates.sql

# 3️⃣ Secrets setzen (lokal oder remote)
echo "🔐 Setting required secrets..."
supabase secrets set \
  POSTMARK_TOKEN="$POSTMARK_TOKEN" \
  POSTMARK_WEBHOOK_SECRET="$POSTMARK_WEBHOOK_SECRET" \
  FROM_EMAIL="info@norrland-innovate.com" \
  REPLY_TO="info@norrland-innovate.com" \
  APP_URL="https://app.norrland-innovate.com"

# 4️⃣ Funktionen deployen
echo "⚙️  Deploying Supabase Edge Functions..."
supabase functions deploy send-test
supabase functions deploy enqueue-trial-emails
supabase functions deploy email-dispatcher --schedule "*/5 * * * *"
supabase functions deploy webhooks-bounce
supabase functions deploy events-list

# 5️⃣ Überprüfung der Policies
echo "🔎 Verifying RLS policies..."
supabase db query "select policyname, tablename from pg_policies where schemaname='public';"

# 6️⃣ Smoke-Test vorbereiten
echo "🧪 Run test: curl https://<your-project>.functions.supabase.co/send-test"
echo "Setup complete ✅"

#!/bin/bash
# Fix hard-coded imports in edge functions
# Replace esm.sh and deno.land URLs with import map aliases

find supabase/functions -name "*.ts" -type f | while read file; do
  # Skip _shared directory
  if [[ "$file" == *"/_shared/"* ]]; then
    continue
  fi
  
  # Replace Supabase imports
  sed -i 's|https://esm\.sh/@supabase/supabase-js@[0-9.]*|@supabase/supabase-js|g' "$file"
  
  # Replace std/http/server imports
  sed -i 's|https://deno\.land/std@[0-9.]*\/http\/server\.ts|std/http/server.ts|g' "$file"
  
  # Replace std/encoding/base64 imports
  sed -i 's|https://deno\.land/std@[0-9.]*\/encoding\/base64\.ts|std/encoding/base64.ts|g' "$file"
  
  # Replace std/async/delay imports
  sed -i 's|https://deno\.land/std@[0-9.]*\/async\/delay\.ts|std/async/delay.ts|g' "$file"
  
  # Replace pdf-lib imports
  sed -i 's|https://esm\.sh/pdf-lib@[0-9.]*|pdf-lib|g' "$file"
done

echo "✅ Fixed all hard-coded imports in edge functions"

#!/usr/bin/env bash
# Applies pending Supabase migrations, then the seed, then the read-only parity check — to the database in
# $SUPABASE_DB_URL. Run by .github/workflows/supabase-deploy.yml after a merge to the production branch.
#   SUPABASE_DB_URL=postgresql://… bash scripts/db-deploy.sh            (needs: supabase CLI, psql, npx tsx)
# Stops at the first error. Never prints the URL.
set -euo pipefail
: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL (a secret; never commit it)}"
SUPABASE="${SUPABASE_BIN:-supabase}"
PSQL=(psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -q -At)

# One-time baseline: staging got 0001–0010 by hand in the SQL editor (2026-11-28, commit 8f429f1), so the
# migration history is empty although the schema exists. Record exactly those as applied — never anything newer.
HAS_SCHEMA=$("${PSQL[@]}" -c "select to_regclass('public.dishes') is not null")
HAS_HISTORY=f
if [ "$("${PSQL[@]}" -c "select to_regclass('supabase_migrations.schema_migrations') is not null")" = "t" ]; then
  HAS_HISTORY=$("${PSQL[@]}" -c "select exists (select 1 from supabase_migrations.schema_migrations)")
fi
if [ "$HAS_SCHEMA" = "t" ] && [ "$HAS_HISTORY" != "t" ]; then
  echo "Baseline: recording 0001–0010 as already applied (schema present, no migration history)"
  "$SUPABASE" migration repair --db-url "$SUPABASE_DB_URL" --status applied 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 --yes
fi

echo "Migrations pending:"
"$SUPABASE" migration list --db-url "$SUPABASE_DB_URL" | sed 's/^/  /'
"$SUPABASE" db push --db-url "$SUPABASE_DB_URL" --yes

echo "Seed (idempotent):"
"${PSQL[@]}" -f supabase/seed.sql > /dev/null

echo "Parity:"
npx tsx scripts/print-seed-parity-sql.ts > /tmp/ksx-parity.sql
OUT=$("${PSQL[@]}" -f /tmp/ksx-parity.sql)
echo "$OUT" | sed 's/^/  /'
if echo "$OUT" | grep -q "PARITY FAIL"; then echo "Seed parity failed"; exit 1; fi
echo "Database deploy OK"

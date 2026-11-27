#!/usr/bin/env bash
# Applies the Supabase migration + seed to a throwaway local PostgreSQL database and runs tests/db/*.sql.
# Requires local PostgreSQL 16 + PostGIS 3 (apt: postgresql postgresql-16-postgis-3). Usage: npm run test:db
set -euo pipefail
DB=ksx_test_$$
PSQL="psql -v ON_ERROR_STOP=1 -q -X"
as_pg() { if [ "$(id -un)" = "postgres" ]; then "$@"; else su postgres -c "$(printf '%q ' "$@")"; fi; }
as_pg createdb "$DB"
trap 'as_pg dropdb --if-exists "$DB"' EXIT
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
as_pg $PSQL -d "$DB" -f "$ROOT/supabase/local/supabase-stubs.sql" -f "$ROOT/supabase/migrations/0001_init.sql"
for m in "$ROOT"/supabase/migrations/0*.sql; do [ "$m" = "$ROOT/supabase/migrations/0001_init.sql" ] || as_pg $PSQL -d "$DB" -f "$m"; done
as_pg $PSQL -d "$DB" -f "$ROOT/supabase/local/grants.sql"
as_pg $PSQL -d "$DB" -f "$ROOT/supabase/seed.sql"
as_pg $PSQL -d "$DB" -f "$ROOT/supabase/seed.sql"                    # idempotency: second run must succeed
# The exact columns the app reads must exist and be readable by the anon role.
COLS_SQL=$(cd "$ROOT" && npx tsx scripts/print-read-columns-sql.ts)
echo "$COLS_SQL" > "/tmp/ksx_cols_$$.sql"; chmod 644 "/tmp/ksx_cols_$$.sql"
as_pg psql -X -At -v ON_ERROR_STOP=1 -d "$DB" -f "/tmp/ksx_cols_$$.sql" | sed 's/^/columns readable by anon: /'
rm -f "/tmp/ksx_cols_$$.sql"
OUT=$(as_pg psql -X -At -d "$DB" -f "$ROOT/tests/db/rls.sql")
echo "$OUT"
echo "$OUT" | grep -q "ALL DB TESTS PASSED"

/**
 * Exports the live Supabase catalogue back to JSON (backup + bringing editor changes into Git).
 *   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run db:export
 * Writes backups/supabase-export-<date>.json. Public (RLS-visible) data only: candidates, audit and
 * user data are not included — use `supabase db dump` for a full backup (docs/SUPABASE.md).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fetchSupabaseFood } from "../src/lib/supabase/food";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"); process.exit(1); }
(async () => {
  const data = await fetchSupabaseFood(createClient(url, key, { auth: { persistSession: false } }));
  const dir = path.resolve(__dirname, "../backups");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `supabase-export-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(file, JSON.stringify({ exportedAt: new Date().toISOString(), source: url, ...data }, null, 2));
  console.log(`✓ ${file} — ${data.dishes.length} dishes, ${data.restaurants.length} establishments, ${data.links.length} links`);
})().catch((e) => { console.error(e); process.exit(1); });

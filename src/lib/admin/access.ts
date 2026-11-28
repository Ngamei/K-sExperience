import { supabaseEnabled } from "@/lib/supabase/client";

/**
 * KEX-SEC-01 — who may open /admin/. Fail closed:
 *  - "supabase": the database is configured; editor tools render only for a signed-in user whose
 *    `user_roles.role` is admin/editor (and RLS enforces the same rule on every write).
 *  - "local": offline Admin over the repository JSON (download-only). Only in `next dev` or a build with
 *    NEXT_PUBLIC_LOCAL_ADMIN=1, which next.config.ts refuses on any Vercel deployment.
 *  - "unavailable": every other build — including public deployments without Supabase.
 */
export type AdminGate = "supabase" | "local" | "unavailable";
export const localAdminAllowed = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_LOCAL_ADMIN === "1";
export const adminGate = (): AdminGate => (supabaseEnabled ? "supabase" : localAdminAllowed ? "local" : "unavailable");
/** Editor tools may render. `editor` = the signed-in user's role check (Supabase mode only). */
export const adminAllowed = (gate: AdminGate, editor: boolean) => gate === "local" || (gate === "supabase" && editor);

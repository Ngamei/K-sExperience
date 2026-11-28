import { supabaseEnabled } from "@/lib/supabase/client";

/**
 * KEX-SEC-01 — who may open /admin/. Fail closed:
 *  - "supabase": the database is configured; the Admin Portal renders only for a signed-in user with a staff
 *    role in `user_roles` (and RLS enforces the same rules on every read of restricted rows and every write).
 *  - "local": offline Admin over the repository JSON (download-only). Only in `next dev` or a build with
 *    NEXT_PUBLIC_LOCAL_ADMIN=1, which next.config.ts refuses on any Vercel deployment.
 *  - "unavailable": every other build — including public deployments without Supabase.
 *
 * KEX-SEC-02 — staff roles are separate from customer membership tiers (src/lib/membership/plans.ts).
 * These functions take only a staff role; a Plus/Premium tier can never reach them.
 */
export type AdminGate = "supabase" | "local" | "unavailable";
export const localAdminAllowed = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_LOCAL_ADMIN === "1";
export const adminGate = (): AdminGate => (supabaseEnabled ? "supabase" : localAdminAllowed ? "local" : "unavailable");

/** Staff roles (user_roles.role). `editor` = Data Editor, `reviewer` = Data Reviewer. */
export const STAFF_ROLES = ["admin", "editor", "researcher", "reviewer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const isStaffRole = (x: unknown): x is StaffRole => typeof x === "string" && (STAFF_ROLES as readonly string[]).includes(x);
/** May write the catalogue (mirrors is_editor() in the database). */
export const canEdit = (role: StaffRole | null) => role === "admin" || role === "editor";
/** May manage customer memberships (mirrors is_admin()). */
export const canManageMembers = (role: StaffRole | null) => role === "admin";
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = { admin: "Admin", editor: "Data Editor", researcher: "Researcher", reviewer: "Data Reviewer" };

/** The Admin Portal may render. `role` = the signed-in user's staff role (Supabase mode only). */
export const adminAllowed = (gate: AdminGate, role: StaffRole | null) => gate === "local" || (gate === "supabase" && isStaffRole(role));

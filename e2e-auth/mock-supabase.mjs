// Minimal in-memory stand-in for Supabase Auth (GoTrue) + PostgREST, for end-to-end tests of the
// account flows only. Real security (RLS) is tested against PostgreSQL in `npm run test:db`.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.argv[2] ?? 54321);
const PK = {
  saved_experiences: ["user_id", "experience_id", "item_type", "item_id", "collection"],
  experience_history: ["user_id", "experience_id", "item_type", "item_id", "action"],
  tasting_notes: ["user_id", "experience_id", "item_type", "item_id"],
  user_profiles: ["user_id"],
};
let db;
const reset = () => { db = { users: [], roles: {}, memberships: {}, refresh: {}, fail: false, reports: [], objects: {}, tables: { saved_experiences: [], experience_history: [], tasting_notes: [], user_profiles: [] } }; };
reset();

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const publicUser = (u) => { const p = u.phone ? "phone" : "email"; return { id: u.id, aud: "authenticated", role: "authenticated", email: u.email ?? "", phone: u.phone ?? "", email_confirmed_at: u.email ? u.created_at : undefined, phone_confirmed_at: u.phone ? u.created_at : undefined, created_at: u.created_at, app_metadata: { provider: p, providers: [p] }, user_metadata: u.meta ?? {}, identities: [{ id: u.id, provider: p, identity_data: u.phone ? { phone: u.phone } : { email: u.email } }] }; };
const session = (u) => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access_token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", exp })}.mock`;
  const refresh_token = randomUUID();
  db.refresh[refresh_token] = u.id;
  return { access_token, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token, user: publicUser(u) };
};
const subOf = (req) => {
  const t = (req.headers.authorization ?? "").replace(/^Bearer /, "").split(".")[1];
  try { return JSON.parse(Buffer.from(t, "base64url").toString()).sub ?? null; } catch { return null; }
};
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "*", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const readBody = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => r(d ? JSON.parse(d) : {})); });
const filters = (url) => [...url.searchParams].filter(([k]) => !["select", "on_conflict", "limit", "order", "offset"].includes(k)).map(([k, v]) => [k, v.replace(/^eq\./, "")]);
const match = (row, fs) => fs.every(([k, v]) => String(row[k]) === v);
const keyOf = (t, row) => PK[t].map((k) => row[k]).join("|");

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  if (req.method === "OPTIONS") return send(res, 204);
  // ---- test control -------------------------------------------------------------------------
  if (p === "/__reset") { reset(); return send(res, 200, { ok: true }); }
  if (p === "/__fail") { db.fail = url.searchParams.get("on") === "1"; return send(res, 200, { fail: db.fail }); }
  if (p === "/__role") { // grant a role to a test identity (stands in for an admin inserting into user_roles)
    const u = db.users.find((x) => x.email === url.searchParams.get("email"));
    if (!u) return send(res, 404, { message: "no such user" });
    db.roles[u.id] = url.searchParams.get("role");
    return send(res, 200, { ok: true });
  }
  if (p === "/__membership") { // test entitlement (stands in for an admin writing user_memberships)
    const u = db.users.find((x) => x.email === url.searchParams.get("email"));
    if (!u) return send(res, 404, { message: "no such user" });
    db.memberships[u.id] = { user_id: u.id, tier: url.searchParams.get("tier"), source: "test", valid_until: null, updated_at: new Date().toISOString() };
    return send(res, 200, { ok: true });
  }
  if (p === "/__db") return send(res, 200, { users: db.users.map((u) => ({ id: u.id, email: u.email, phone: u.phone })), ...db.tables });
  // ---- auth ---------------------------------------------------------------------------------
  if (p === "/auth/v1/signup" && req.method === "POST") {
    const { email, password, data } = await readBody(req);
    if (db.users.some((u) => u.email === email)) return send(res, 422, { code: 422, error_code: "user_already_exists", msg: "User already registered" });
    const u = { id: randomUUID(), email, password, meta: data ?? {}, created_at: new Date().toISOString() };
    db.users.push(u);
    db.tables.user_profiles.push({ user_id: u.id, display_name: data?.display_name || email.split("@")[0], avatar_url: null, locale: "en", share_passport: false, created_at: u.created_at });
    return send(res, 200, session(u));
  }
  if (p === "/auth/v1/token" && req.method === "POST") {
    const body = await readBody(req);
    const gt = url.searchParams.get("grant_type");
    if (gt === "password") {
      const u = db.users.find((x) => x.email === body.email && x.password === body.password);
      return u ? send(res, 200, session(u)) : send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials", code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
    }
    if (gt === "refresh_token") {
      const u = db.users.find((x) => x.id === db.refresh[body.refresh_token]);
      return u ? send(res, 200, session(u)) : send(res, 400, { error: "invalid_grant", error_description: "Invalid refresh token" });
    }
  }
  if (p === "/auth/v1/user") {
    const u = db.users.find((x) => x.id === subOf(req));
    if (!u) return send(res, 401, { code: 401, msg: "invalid JWT" });
    if (req.method === "PUT") { const b = await readBody(req); if (b.password) u.password = b.password; }
    return send(res, 200, publicUser(u));
  }
  // Phone sign-in: any valid E.164 number gets code 123456 (stands in for the SMS provider).
  if (p === "/auth/v1/otp" && req.method === "POST") {
    const { phone } = await readBody(req);
    if (!/^\+?\d{8,15}$/.test(phone ?? "")) return send(res, 422, { code: 422, error_code: "validation_failed", msg: "Invalid phone number format" });
    db.otp = { ...(db.otp ?? {}), [phone.replace(/^\+/, "")]: "123456" };
    return send(res, 200, {});
  }
  if (p === "/auth/v1/verify" && req.method === "POST") {
    const { phone, token, type } = await readBody(req);
    const key = (phone ?? "").replace(/^\+/, "");
    if (type !== "sms" || db.otp?.[key] !== token) return send(res, 403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
    let u = db.users.find((x) => x.phone === key);
    if (!u) {
      u = { id: randomUUID(), phone: key, password: null, meta: {}, created_at: new Date().toISOString() };
      db.users.push(u);
      db.tables.user_profiles.push({ user_id: u.id, display_name: null, avatar_url: null, locale: "en", share_passport: false, created_at: u.created_at });
    }
    delete db.otp[key];
    return send(res, 200, session(u));
  }
  if (p === "/auth/v1/logout") return send(res, 204);
  if (p === "/auth/v1/recover") return send(res, 200, {});
  // ---- 0017 info reports: storage (private bucket report-evidence) + table ----------------------
  if (p === "/__reports") return send(res, 200, { reports: db.reports, objects: Object.keys(db.objects) });
  const isStaff = (sub) => Boolean(sub && ["admin", "editor", "researcher", "reviewer"].includes(db.roles[sub]));
  const SIGN = "/storage/v1/object/sign/report-evidence/";
  if (p.startsWith("/storage/v1/object/report-evidence/") && req.method === "POST") { // own-folder upload, signed-in only
    const sub = subOf(req), path = decodeURIComponent(p.slice("/storage/v1/object/report-evidence/".length));
    const chunks = []; for await (const c of req) chunks.push(c);
    if (!sub || path.split("/")[0] !== sub) return send(res, 403, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
    db.objects[path] = Buffer.concat(chunks);
    return send(res, 200, { Key: `report-evidence/${path}`, Id: randomUUID() });
  }
  if (p.startsWith(SIGN) && req.method === "POST") { // signed URL: staff only
    const path = decodeURIComponent(p.slice(SIGN.length));
    if (!isStaff(subOf(req)) || !db.objects[path]) return send(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
    return send(res, 200, { signedURL: `/object/sign/report-evidence/${path}?token=mock` });
  }
  if (p.startsWith(SIGN) && req.method === "GET") { // serves a tiny PNG for any stored evidence object
    res.writeHead(200, { "content-type": "image/png", "access-control-allow-origin": "*" });
    return res.end(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64"));
  }
  if (p === "/rest/v1/info_reports") { // emulates the 0017 RLS: anyone inserts a NEW report; reporter reads own; staff read + triage
    const sub = subOf(req), staff = isStaff(sub);
    if (req.method === "POST") {
      if (db.fail) return send(res, 503, { message: "mock outage" });
      const body = await readBody(req);
      for (const r of Array.isArray(body) ? body : [body]) {
        const forged = (r.status && r.status !== "new") || r.reviewed_by || r.reviewed_at || r.resolution_note || (r.reporter_id && r.reporter_id !== sub)
          || (r.evidence_photo_path && (!sub || r.evidence_photo_path.split("/")[0] !== sub));
        if (forged) return send(res, 403, { code: "42501", message: "new row violates row-level security policy for table \"info_reports\"" });
        db.reports.push({ ...r, reporter_id: sub ?? null, status: "new", resolution_note: null, reviewed_by: null, reviewed_at: null, created_at: new Date().toISOString() });
      }
      return send(res, 201);
    }
    const visible = db.reports.filter((r) => staff || (sub && r.reporter_id === sub));
    if (req.method === "GET") return send(res, 200, visible.filter((r) => match(r, filters(url))).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    if (req.method === "PATCH") {
      const body = await readBody(req);
      if (!staff) return send(res, 204); // RLS: zero rows updated
      for (const r of visible.filter((x) => match(x, filters(url)))) Object.assign(r, { status: body.status, resolution_note: body.resolution_note ?? null, reviewed_by: sub, reviewed_at: new Date().toISOString() });
      return send(res, 204);
    }
    return send(res, 403, { code: "42501", message: "permission denied" }); // no delete
  }
  // ---- rest ---------------------------------------------------------------------------------
  if (p === "/rest/v1/rpc/delete_my_account") {
    const sub = subOf(req);
    if (!sub) return send(res, 401, { message: "not signed in" });
    db.users = db.users.filter((u) => u.id !== sub);
    for (const t of Object.keys(db.tables)) db.tables[t] = db.tables[t].filter((r) => r.user_id !== sub);
    return send(res, 204);
  }
  const table = p.replace("/rest/v1/", "");
  const one = (rows) => (req.headers.accept ?? "").includes("vnd.pgrst.object")
    ? (rows.length === 1 ? send(res, 200, rows[0]) : send(res, 406, { code: "PGRST116", message: "0 rows", details: "", hint: null })) : send(res, 200, rows);
  if (table === "user_roles" && req.method !== "GET") return send(res, 403, { code: "42501", message: "new row violates row-level security policy for table \"user_roles\"" }); // no client write policy
  if (table === "user_memberships") { // 0013: read own (admins read all); writes by admins only
    const sub = subOf(req), admin = sub && db.roles[sub] === "admin";
    if (req.method === "GET") return one(Object.values(db.memberships).filter((m) => (admin || m.user_id === sub) && match(m, filters(url))));
    if (!admin) return send(res, 403, { code: "42501", message: "new row violates row-level security policy for table \"user_memberships\"" });
    const body = await readBody(req);
    for (const r of Array.isArray(body) ? body : [body]) db.memberships[r.user_id] = { valid_until: null, source: "test", ...r };
    return send(res, 201);
  }
  if (table === "user_roles") { // "read own role" policy: a user sees only their own row
    const sub = subOf(req), role = sub && db.roles[sub];
    const rows = role && match({ user_id: sub }, filters(url)) ? [{ role }] : [];
    if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return rows.length === 1 ? send(res, 200, rows[0]) : send(res, 406, { code: "PGRST116", message: "0 rows", details: "", hint: null });
    return send(res, 200, rows);
  }
  if (!db.tables[table]) return send(res, 500, { message: `mock: table ${table} not served (catalogue falls back to bundled data)` });
  const sub = subOf(req);
  const own = (r) => sub && r.user_id === sub; // emulates owner-only RLS
  if (req.method === "GET") {
    const rows = db.tables[table].filter((r) => own(r) && match(r, filters(url)));
    if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return rows.length === 1 ? send(res, 200, rows[0]) : send(res, 406, { code: "PGRST116", message: "0 rows", details: "", hint: null });
    return send(res, 200, rows);
  }
  if (req.method === "POST") {
    if (db.fail) return send(res, 503, { message: "mock outage" });
    const body = await readBody(req);
    const rows = Array.isArray(body) ? body : [body];
    if (rows.some((r) => r.user_id !== sub)) return send(res, 403, { code: "42501", message: "new row violates row-level security policy" });
    const ignore = (req.headers.prefer ?? "").includes("ignore-duplicates");
    for (const r of rows) {
      const i = db.tables[table].findIndex((x) => keyOf(table, x) === keyOf(table, r));
      if (i === -1) db.tables[table].push(r); else if (!ignore) db.tables[table][i] = { ...db.tables[table][i], ...r };
    }
    return send(res, 201);
  }
  if (req.method === "DELETE") {
    if (db.fail) return send(res, 503, { message: "mock outage" });
    db.tables[table] = db.tables[table].filter((r) => !(own(r) && match(r, filters(url))));
    return send(res, 204);
  }
  send(res, 404, { message: "not found" });
}).listen(PORT, () => console.log(`mock supabase on :${PORT}`));

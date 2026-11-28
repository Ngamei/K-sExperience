/**
 * Shared research queue (research-exchange/queue.json) between Claude Code, the ChatGPT Research Team and Codex.
 * One entry per batch; `claims` reserve dishes/items + districts so two agents never research the same thing at once.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { AGENTS, EXCHANGE_EXPERIENCES } from "./exchange";

export const QUEUE_STATUSES = ["planned", "in-progress", "submitted", "validated", "imported", "rejected", "rolled-back"] as const;
export const QueueEntrySchema = z.object({
  batchId: z.string(),
  experience: z.enum(EXCHANGE_EXPERIENCES),
  kind: z.enum(["venues", "catalogue"]),
  scope: z.string().min(5),
  claims: z.object({ items: z.array(z.string()).optional(), districts: z.array(z.string()).optional() }).optional(),
  assignedTo: z.enum(AGENTS),
  status: z.enum(QUEUE_STATUSES),
  sources: z.array(z.string()).default([]),
  importStatus: z.string().default("not imported"),
  validation: z.object({ at: z.string(), accepted: z.number(), rejected: z.number(), warnings: z.number(), report: z.string().optional() }).optional(),
  updatedAt: z.string(),
  notes: z.string().optional(),
});
export const QueueSchema = z.object({ note: z.string().optional(), batches: z.array(QueueEntrySchema) });
export type Queue = z.infer<typeof QueueSchema>;
export type QueueEntry = z.infer<typeof QueueEntrySchema>;

const file = (root: string) => path.join(root, "research-exchange/queue.json");
export const readQueue = (root: string): Queue => (existsSync(file(root)) ? QueueSchema.parse(JSON.parse(readFileSync(file(root), "utf8"))) : { batches: [] });
export const writeQueue = (root: string, q: Queue) => writeFileSync(file(root), JSON.stringify(QueueSchema.parse(q), null, 2) + "\n");
export function upsertEntry(q: Queue, e: Partial<QueueEntry> & { batchId: string }): Queue {
  const i = q.batches.findIndex((b) => b.batchId === e.batchId);
  const next = { ...(i >= 0 ? q.batches[i] : {}), ...e, updatedAt: new Date().toISOString().slice(0, 10) } as QueueEntry;
  return { ...q, batches: i >= 0 ? q.batches.map((b, j) => (j === i ? next : b)) : [...q.batches, next] };
}

const ACTIVE = new Set(["planned", "in-progress", "submitted", "validated"]);
/** Other agents' active claims overlapping this batch (same item AND same district, or same item with no district). */
export function overlaps(q: Queue, batchId: string, experience: string, pairs: { item: string; district?: string }[]): string[] {
  const me = q.batches.find((b) => b.batchId === batchId);
  const out: string[] = [];
  for (const b of q.batches) {
    if (b.batchId === batchId || !ACTIVE.has(b.status) || b.experience !== experience || (me && b.assignedTo === me.assignedTo) || !b.claims?.items?.length) continue;
    for (const p of pairs) {
      if (!b.claims.items.includes(p.item)) continue;
      if (b.claims.districts?.length && p.district && !b.claims.districts.includes(p.district)) continue;
      out.push(`${p.item}${p.district ? ` in ${p.district}` : ""} is claimed by ${b.batchId} (${b.assignedTo}, ${b.status})`);
    }
  }
  return [...new Set(out)];
}

export function queueMarkdown(q: Queue) {
  const cell = (s: unknown) => String(s ?? "").replace(/\|/g, "/").replace(/\n/g, " ");
  return [
    "# Research queue",
    "",
    "_Generated from `research-exchange/queue.json` by `npm run exchange:export` / `npm run intake`. Edit the JSON, not this file._",
    "",
    "| Batch | Experience | Kind | Scope | Assigned | Status | Import | Validation | Sources | Updated |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...q.batches.map((b) => `| ${b.batchId} | ${b.experience} | ${b.kind} | ${cell(b.scope)} | ${b.assignedTo} | ${b.status} | ${cell(b.importStatus)} | ${b.validation ? `${b.validation.accepted} accepted · ${b.validation.rejected} rejected · ${b.validation.warnings} warnings` : "—"} | ${b.sources.length} | ${b.updatedAt} |`),
    "",
  ].join("\n");
}

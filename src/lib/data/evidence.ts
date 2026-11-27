/**
 * Restaurant ↔ dish evidence levels (Sprint 3, Decision 2).
 * Single source of truth for statuses, the evidence each requires, ranking and public visibility.
 */
export const LINK_STATUSES = [
  "candidate",               // unconfirmed search result — admin only
  "source-listed",           // credible published source explicitly links venue + exact dish
  "menu-confirmed",          // official menu or current delivery listing shows the exact dish
  "directly-confirmed",      // venue confirmed by phone or message
  "visit-confirmed",         // credible first-hand visit evidence
  "temporarily-unavailable", // evidence the dish is not currently served
] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export const EVIDENCE_TYPES = [
  "search-result", "published-source", "official-menu", "delivery-listing", "menu-photo",
  "phone-call", "message", "site-visit", "user-visit", "sample",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

/** Which evidence types may justify each status ("sample" is allowed only on sample links). */
export const ALLOWED_EVIDENCE: Record<LinkStatus, readonly EvidenceType[]> = {
  candidate: ["search-result", "published-source"],
  "source-listed": ["published-source"],
  "menu-confirmed": ["official-menu", "delivery-listing", "menu-photo"],
  "directly-confirmed": ["phone-call", "message"],
  "visit-confirmed": ["site-visit", "user-visit"],
  "temporarily-unavailable": ["official-menu", "delivery-listing", "menu-photo", "phone-call", "message", "site-visit", "user-visit", "published-source"],
};

/** Best status wins when summarising a dish. Candidates are never public. */
export const STATUS_RANK: Record<LinkStatus | "none-found", number> = {
  "visit-confirmed": 6,
  "directly-confirmed": 5,
  "menu-confirmed": 4,
  "source-listed": 3,
  "temporarily-unavailable": 1,
  candidate: 0,
  "none-found": 0,
};

export const PUBLIC_STATUSES: readonly LinkStatus[] = LINK_STATUSES.filter((s) => s !== "candidate");
/** Confirmed = evidence beyond a published mention. */
export const CONFIRMED_STATUSES: readonly LinkStatus[] = ["menu-confirmed", "directly-confirmed", "visit-confirmed"];

export function evidenceProblem(status: LinkStatus, evidenceType: EvidenceType | undefined, isSample: boolean): string | null {
  if (!evidenceType) return status === "candidate" ? null : `status "${status}" requires evidence`;
  if (evidenceType === "sample") return isSample ? null : `"sample" evidence is only allowed on sample links`;
  if (!ALLOWED_EVIDENCE[status].includes(evidenceType)) return `evidence "${evidenceType}" cannot justify status "${status}" (allowed: ${ALLOWED_EVIDENCE[status].join(", ")})`;
  return null;
}

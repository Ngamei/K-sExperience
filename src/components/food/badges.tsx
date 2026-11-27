"use client";
import type { AvailabilityStatus, Category } from "@/lib/data/schema";
import { useT } from "@/lib/i18n/use-t";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_COLORS } from "./illustrations";

export function CategoryBadge({ category }: { category: Category }) {
  const { t } = useT();
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: CATEGORY_COLORS[category] + "18", color: CATEGORY_COLORS[category] }}>
      <span className="size-1.5 rounded-full" style={{ background: CATEGORY_COLORS[category] }} />
      {t(`cat.${category}`)}
    </span>
  );
}

const STATUS_STYLE: Record<AvailabilityStatus, { dot: string; tone: "forest" | "ochre" | "warn" | "outline" }> = {
  "visit-confirmed": { dot: "#294C3D", tone: "forest" },
  "directly-confirmed": { dot: "#294C3D", tone: "forest" },
  "menu-confirmed": { dot: "#294C3D", tone: "forest" },
  "source-listed": { dot: "#C4923A", tone: "ochre" },
  candidate: { dot: "#9a9d96", tone: "outline" },
  "temporarily-unavailable": { dot: "#B66B50", tone: "warn" },
  "none-found": { dot: "#9a9d96", tone: "outline" },
};

export function StatusDot({ status }: { status: AvailabilityStatus }) {
  const { t } = useT();
  const s = STATUS_STYLE[status];
  return (
    <Badge tone={s.tone} data-testid="availability-status" data-status={status}>
      <span className="size-1.5 rounded-full" style={{ background: s.dot }} />
      {t(`status.${status}`)}
    </Badge>
  );
}

export function SampleBadge() {
  return <Badge tone="sample" data-testid="sample-badge">Sample · not real</Badge>;
}

"use client";
/** Shared detail-page building blocks (Food dish pages and every module's item pages). */
import { ArrowUpRight, MapPin } from "lucide-react";
import type { AvailabilityStatus } from "@/lib/data/schema";
import { useT } from "@/lib/i18n/use-t";
import { StatusDot } from "@/components/food/badges";

export function DetailBlock({ title, children, testid }: { title: string; children: React.ReactNode; testid?: string }) {
  return (
    <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6" data-testid={testid}>
      <h2 className="mb-3 font-display text-xl text-forest">{title}</h2>
      {children}
    </section>
  );
}

/**
 * "Where to … in Ho Chi Minh City": establishment cards (OfferingRow) or an honest "none found",
 * plus a clearly labelled live Google Maps search. Extra actions/sections go in `children`.
 */
export function OfferingsSection({ title, rows, status, noneFoundBody, note, mapsQuery, children, testid = "hcmc-block" }: {
  title: string; rows: React.ReactNode[]; status: AvailabilityStatus; noneFoundBody: string; note?: string;
  /** Item name searched on Google Maps (in HCMC). */
  mapsQuery: string; children?: React.ReactNode; testid?: string;
}) {
  const { t } = useT();
  return (
    <DetailBlock title={title} testid={testid}>
      {rows.length > 0 ? (
        <div className="grid gap-2">
          {rows}
          {note && <p className="text-[11.5px] text-muted">{note}</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-ivory/60 p-4" data-testid="none-found">
          <StatusDot status={status} />
          <p className="mt-2 max-w-2xl text-sm text-charcoal/80">{noneFoundBody}</p>
        </div>
      )}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mapsQuery}, Hồ Chí Minh`)}`}
        target="_blank" rel="noreferrer"
        className="group mt-3 flex items-center gap-3 rounded-2xl border border-line/80 bg-paper p-3.5 transition-colors hover:border-forest/40 hover:bg-sage-soft/40"
        data-testid="google-maps-search"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest text-ivory"><MapPin className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-charcoal group-hover:text-forest">{t("dish.searchMaps")}</span>
          <span className="block truncate text-xs text-muted">{t("dish.searchMapsSub", { name: mapsQuery })}</span>
          <span className="mt-0.5 block text-[11px] text-muted/80">{t("dish.searchMapsNote")}</span>
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-forest" />
      </a>
      {children}
    </DetailBlock>
  );
}

"use client";
import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink, Navigation, Phone, TriangleAlert } from "lucide-react";
import { useT } from "@/lib/i18n/use-t";
import { lbl, VENUE_LABELS } from "@/lib/i18n/labels";
import { isOpenAt } from "@/lib/food/hours";
import { buildAvailabilityIndex } from "@/lib/food/availability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DishCard } from "@/components/food/dish-card";
import { SampleBadge, StatusDot } from "@/components/food/badges";
import { useFoodData } from "@/components/food/food-data";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function PlaceView({ id }: { id: string }) {
  const { t, locale } = useT();
  const { restaurants, links, dishById } = useFoodData();
  const r = restaurants.find((x) => x.id === id)!;
  const idx = buildAvailabilityIndex(restaurants, links, { includeSamples: r.isSample });
  const ls = idx.linksByRestaurant.get(id) ?? [];
  const open = isOpenAt(r.openingHours, new Date());
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${r.coordinates[1]},${r.coordinates[0]}`;

  return (
    <article className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-10" data-testid="place-detail">
      <Link href="/nearby/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest"><ArrowLeft className="size-4" /> {t("nav.nearby")}</Link>
      {r.isSample && (
        <div className="mb-4 flex gap-2 rounded-2xl bg-[#fff1c2] p-3 text-sm text-[#5f4a0f] ring-1 ring-[#e4c35a]" data-testid="sample-warning">
          <TriangleAlert className="size-5 shrink-0" /> {t("place.sampleNote")}
        </div>
      )}
      <div className="rounded-3xl border border-line/80 bg-paper p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="outline">{lbl(VENUE_LABELS, r.venueType, locale)}</Badge>
          {r.priceRange && <Badge tone="neutral">{r.priceRange}</Badge>}
          {r.isSample && <SampleBadge />}
        </div>
        <h1 className="mt-2 font-display text-4xl text-forest">{r.name}</h1>
        <p className="mt-1 text-muted">{r.address} · {r.neighbourhood}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {r.isSample ? (
            <Button variant="outline" disabled title="Sample venue — no real location"><Navigation /> {t("place.directions")}</Button>
          ) : (
            <Button asChild variant="primary"><a href={dirUrl} target="_blank" rel="noreferrer"><Navigation /> {t("place.directions")}</a></Button>
          )}
          {r.deliveryLinks.map((d) => <Button key={d.url} asChild variant="outline"><a href={d.url} target="_blank" rel="noreferrer"><ExternalLink /> {d.provider}</a></Button>)}
          {r.contact?.phone && <Button asChild variant="ghost"><a href={`tel:${r.contact.phone}`}><Phone /> {r.contact.phone}</a></Button>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
        <section>
          <h2 className="mb-3 font-display text-2xl text-forest">{t("place.dishes")}</h2>
          <div className="grid gap-3">
            {ls.map((l) => {
              const d = dishById.get(l.dishId);
              if (!d) return null;
              return (
                <div key={l.dishId} className="space-y-1.5">
                  <DishCard dish={d} compact />
                  <div className="flex flex-wrap items-center gap-2 pl-1 text-xs text-muted">
                    <StatusDot status={l.status} />
                    {l.menuEvidence && <span>Evidence: {l.menuEvidence.note}</span>}
                    {l.lastVerified && <span>· {t("place.lastVerified")}: {l.lastVerified}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-line/80 bg-paper p-5">
            <h3 className="mb-2 flex items-center gap-2 font-display text-lg"><Clock className="size-4" /> {t("place.hours")}</h3>
            <p className={`mb-2 text-sm font-medium ${open ? "text-forest" : "text-muted"}`}>{open === null ? t("place.hoursUnknown") : open ? t("place.openNow") : t("place.closed")}</p>
            {r.openingHours && (
              <dl className="grid grid-cols-[48px_1fr] gap-y-0.5 text-sm">
                {DAY_KEYS.map((k) => (
                  <div key={k} className="contents"><dt className="capitalize text-muted">{k}</dt><dd>{r.openingHours![k].length ? r.openingHours![k].map((x) => x.join("–")).join(", ") : "—"}</dd></div>
                ))}
              </dl>
            )}
            <p className="mt-2 text-[11px] text-muted">Asia/Ho_Chi_Minh</p>
          </div>
          <div className="rounded-3xl border border-line/80 bg-paper p-5 text-sm">
            <h3 className="mb-2 font-display text-lg">{t("place.lastVerified")}</h3>
            <p>{r.lastVerified ?? "—"}</p>
            <ul className="mt-2 space-y-1 text-xs text-muted">{r.sources.map((s, i) => <li key={i}>{s.title}{s.note ? ` — ${s.note}` : ""}</li>)}</ul>
          </div>
        </aside>
      </div>
    </article>
  );
}

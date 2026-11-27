"use client";
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { useState } from "react";
import type { EvidenceType, LinkStatus } from "@/lib/data/evidence";
import type { OfferingImage } from "@/engine/offering-image";
import { useT } from "@/lib/i18n/use-t";
import { SampleBadge, StatusDot } from "@/components/food/badges";
import { VenueThumb } from "@/components/food/dish-image";

export interface OfferingRowProps {
  establishment: {
    id: string; name: string; address: string; neighbourhood: string; isSample: boolean;
    priceRange?: string; highlights?: string[]; googleMapsUrl?: string; contact?: { phone?: string };
  };
  /** Localised venue type ("Eatery", "Café", "Studio"…). */
  typeLabel: string;
  /** Establishment page URL. */
  href: string;
  offering: { status: LinkStatus; lastVerified?: string; menuEvidence?: { type: EvidenceType; note: string; url?: string } };
  /** Offering price, already formatted with its unit ("55.000–70.000 ₫ / bowl"). */
  priceText?: string;
  image: OfferingImage | null;
  /** Item name for the image alt text. */
  itemName: string;
}

/**
 * Establishment card on an item page — shared by every experience module (Food dish pages included).
 * Shows the offering photo (with fallback to the icon), name, address, type, price, evidence,
 * evidence status, last-checked date, phone and directions.
 */
export function OfferingRow({ establishment: e, typeLabel, href, offering: o, priceText, image, itemName }: OfferingRowProps) {
  const { t } = useT();
  // Remember a failed image so the card falls back to the icon and drops the photo credit.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const img = image && image.url !== failedUrl ? image : null;
  return (
    <div className="rounded-2xl border border-line/80 bg-ivory/60 p-3.5" data-testid="venue-row" data-venue-id={e.id}>
      <div className="flex items-start gap-3">
        <VenueThumb image={img} alt={`${itemName} — ${e.name}`} onError={setFailedUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={href} className="font-medium hover:text-forest hover:underline">{e.name}</Link>
            {e.isSample && <SampleBadge />}
          </div>
          <p className="text-xs text-muted">{e.address}</p>
          <p className="text-xs text-muted">{e.neighbourhood} · {typeLabel}{e.priceRange ? ` · ${e.priceRange}` : ""}{priceText ? ` · ${priceText}` : ""}</p>
          {e.highlights?.length ? <p className="mt-1 text-xs text-forest">{e.highlights.join(" · ")}</p> : null}
          {img && (
            <p className="mt-1 text-[11px] leading-snug text-muted" data-testid="venue-photo-credit">
              {t(`venuePhoto.${img.kind}`)} · {img.attribution} ·{" "}
              {img.sourceUrl ? <a href={img.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-forest">{img.license}</a> : img.license}
            </p>
          )}
          {o.menuEvidence && !e.isSample && (
            <p className="mt-1.5 text-[11.5px] leading-snug text-charcoal/70">
              <span className="font-medium">{t("place.evidence")}:</span> {o.menuEvidence.note}{" "}
              {o.menuEvidence.url && <a href={o.menuEvidence.url} target="_blank" rel="noreferrer" className="underline hover:text-forest">↗</a>}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:pl-[76px]">
        <StatusDot status={o.status} />
        {o.lastVerified && !e.isSample && <span className="text-[11px] text-muted" data-testid="last-checked">{t("status.lastChecked", { date: o.lastVerified })}</span>}
        {e.contact?.phone && !e.isSample && (
          <a href={`tel:${e.contact.phone.replace(/\s/g, "")}`} className="inline-flex h-7 items-center gap-1 rounded-full border border-line px-3 text-[11.5px] hover:border-forest/40" data-testid="venue-phone">
            <Phone className="size-3.5" /> {e.contact.phone}
          </a>
        )}
        {e.googleMapsUrl && (
          <a href={e.googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-full bg-forest px-3 text-[11.5px] font-medium text-ivory hover:bg-forest-soft" data-testid="google-maps-link">
            <MapPin className="size-3.5" /> {t("place.googleMaps")}
          </a>
        )}
      </div>
    </div>
  );
}

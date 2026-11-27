"use client";
import { useState } from "react";
import type { Dish } from "@/lib/data/schema";
import { MapPin } from "lucide-react";
import type { VenueCardImage } from "@/lib/food/venue-photo";
import { cn } from "@/lib/utils";
import { DishArt } from "./dish-art";

/** Circular dish thumbnail: licensed photo when available, illustration otherwise (or if it fails to load). */
export function DishThumb({ dish, size = 64, className }: { dish: Dish; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const photo = dish.photos[0];
  if (!photo || failed) return <DishArt type={dish.dishType} category={dish.category} size={size} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote Commons images; static export has no image optimizer
    <img
      src={photo.url.replace("width=960", `width=${size <= 80 ? 160 : 330}`)}
      alt={dish.nameVi}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full bg-ivory-deep object-cover", className)}
      style={{ width: size, height: size }}
      data-testid="dish-thumb-photo"
    />
  );
}

/** Large hero photo with attribution caption. Returns null when there is no usable photo. */
export function DishHeroPhoto({ dish, creditLabel }: { dish: Dish; creditLabel: string }) {
  const [failed, setFailed] = useState(false);
  const photo = dish.photos[0];
  if (!photo || failed) return null;
  return (
    <figure className="overflow-hidden rounded-3xl border border-line/80 bg-paper" data-testid="dish-photo">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote Commons image */}
      <img src={photo.url} alt={`${dish.nameVi} — ${dish.nameEn}`} onError={() => setFailed(true)} className="aspect-[4/3] w-full object-cover" />
      <figcaption className="px-4 py-2 text-[11px] leading-snug text-muted">
        {creditLabel}: {photo.credit} ·{" "}
        {photo.sourceUrl ? (
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-forest">{photo.license}</a>
        ) : photo.license}
      </figcaption>
    </figure>
  );
}

/**
 * Square, rounded venue-card thumbnail on dish pages (fixed aspect ratio, object-cover).
 * Shows the generic location icon when there is no image; the parent passes null after onError.
 */
export function VenueThumb({ image, alt, onError }: { image: VenueCardImage | null; alt: string; onError: (url: string) => void }) {
  const box = "size-14 shrink-0 overflow-hidden rounded-xl sm:size-16";
  if (!image)
    return (
      <span className={cn(box, "flex items-center justify-center bg-sage-soft text-forest")} data-testid="venue-thumb" data-kind="icon">
        <MapPin className="size-5" />
      </span>
    );
  // Commons hot-links accept a width parameter; other sources are used as-is.
  const src = image.url.includes("Special:FilePath") ? image.url.replace(/width=\d+/, "width=160") : image.url;
  return (
    <span className={cn(box, "relative bg-ivory-deep")} data-testid="venue-thumb" data-kind={image.kind}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote images; static export has no image optimizer */}
      <img src={src} alt={alt} loading="lazy" onError={() => onError(image.url)} className="aspect-square size-full object-cover" data-testid="venue-thumb-img" />
    </span>
  );
}

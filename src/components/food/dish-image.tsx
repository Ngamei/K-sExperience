"use client";
/**
 * Shared media components for every experience (Food dishes and engine items):
 *  - PhotoThumb: circular catalogue thumbnail — licensed photo, else the item's illustration
 *  - HeroPhoto: detail-page hero with attribution, licence and source
 *  - VenueThumb: establishment-card thumbnail — offering photo / reference photo, else illustration, else icon
 * Food's DishThumb / DishHeroPhoto are thin wrappers, so both modules render identical structure.
 */
import { useState } from "react";
import { MapPin } from "lucide-react";
import type { Dish } from "@/lib/data/schema";
import type { VenueCardImage } from "@/lib/food/venue-photo";
import { cn } from "@/lib/utils";
import { DishArt } from "./dish-art";

export interface MediaPhoto { url: string; credit: string; license: string; sourceUrl?: string }

/** Commons hot-links accept a width parameter; other sources are used as-is. */
const sized = (url: string, w: number) => (url.includes("Special:FilePath") ? url.replace(/width=\d+/, `width=${w}`) : url);

export function PhotoThumb({ photo, alt, size = 64, className, fallback }: { photo?: MediaPhoto; alt: string; size?: number; className?: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!photo || failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote Commons images; static export has no image optimizer
    <img
      src={sized(photo.url, size <= 80 ? 160 : 330)}
      alt={alt}
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

/** Circular dish thumbnail: licensed photo when available, illustration otherwise (or if it fails to load). */
export function DishThumb({ dish, size = 64, className }: { dish: Dish; size?: number; className?: string }) {
  return <PhotoThumb photo={dish.photos[0]} alt={dish.nameVi} size={size} className={className} fallback={<DishArt type={dish.dishType} category={dish.category} size={size} className={className} />} />;
}

/** Large hero photo with attribution caption. Returns null when there is no usable photo. */
export function HeroPhoto({ photo, alt, creditLabel, testid = "dish-photo", fallback = null }: { photo?: MediaPhoto; alt: string; creditLabel: string; testid?: string; fallback?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!photo || failed) return <>{fallback}</>;
  return (
    <figure className="overflow-hidden rounded-3xl border border-line/80 bg-paper" data-testid={testid}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote Commons image */}
      <img src={photo.url} alt={alt} onError={() => setFailed(true)} className="aspect-[4/3] w-full object-cover" />
      <figcaption className="px-4 py-2 text-[11px] leading-snug text-muted">
        {creditLabel}: {photo.credit} ·{" "}
        {photo.sourceUrl ? (
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-forest">{photo.license}</a>
        ) : photo.license}
      </figcaption>
    </figure>
  );
}

export function DishHeroPhoto({ dish, creditLabel }: { dish: Dish; creditLabel: string }) {
  return <HeroPhoto photo={dish.photos[0]} alt={`${dish.nameVi} — ${dish.nameEn}`} creditLabel={creditLabel} />;
}

/**
 * Square, rounded venue-card thumbnail (fixed aspect ratio, object-cover).
 * No image → the item's illustration (data-kind="illustration"), else the location icon.
 * The parent passes null after onError.
 */
export function VenueThumb({ image, alt, onError, fallback }: { image: VenueCardImage | null; alt: string; onError: (url: string) => void; fallback?: React.ReactNode }) {
  const box = "size-14 shrink-0 overflow-hidden rounded-xl sm:size-16";
  if (!image && fallback)
    return <span className={cn(box, "flex items-center justify-center bg-ivory-deep")} data-testid="venue-thumb" data-kind="illustration">{fallback}</span>;
  if (!image)
    return (
      <span className={cn(box, "flex items-center justify-center bg-sage-soft text-forest")} data-testid="venue-thumb" data-kind="icon">
        <MapPin className="size-5" />
      </span>
    );
  return (
    <span className={cn(box, "relative bg-ivory-deep")} data-testid="venue-thumb" data-kind={image.kind}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote images; static export has no image optimizer */}
      <img src={sized(image.url, 160)} alt={alt} loading="lazy" onError={() => onError(image.url)} className="aspect-square size-full object-cover" data-testid="venue-thumb-img" />
    </span>
  );
}

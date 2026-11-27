"use client";
import { cn } from "@/lib/utils";
import { itemSvg } from "./item-illustrations";

/** Illustrated item medallion for engine modules — same shape, ring and sizing as Food's DishArt. */
export function ItemArt({ moduleId, category, size = 64, className, accent = "#294C3D" }: { moduleId: string; category: string; size?: number; className?: string; accent?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-paper", className)}
      style={{ width: size, height: size, boxShadow: `inset 0 0 0 2px ${accent}22` }}
      data-testid="item-art"
      data-art={`${moduleId}:${category}`}
      dangerouslySetInnerHTML={{ __html: itemSvg(`${moduleId}:${category}`, Math.round(size * 0.78)) }}
    />
  );
}

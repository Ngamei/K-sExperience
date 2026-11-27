import type { Category, DishType } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, dishSvg } from "./illustrations";

/** Illustrated dish medallion. */
export function DishArt({ type, category, size = 64, className, ring = true }: { type: DishType; category: Category; size?: number; className?: string; ring?: boolean }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-paper", className)}
      style={{ width: size, height: size, boxShadow: ring ? `inset 0 0 0 2px ${CATEGORY_COLORS[category]}22` : undefined }}
      dangerouslySetInnerHTML={{ __html: dishSvg(type, Math.round(size * 0.78)) }}
    />
  );
}

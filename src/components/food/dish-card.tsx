"use client";
import Link from "next/link";
import { Bookmark, Check } from "lucide-react";
import type { AvailabilityStatus, Dish } from "@/lib/data/schema";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DishThumb } from "./dish-image";
import { useFoodData } from "./food-data";
import { CategoryBadge, StatusDot } from "./badges";

export function DishCard({ dish, status, compact }: { dish: Dish; status?: AvailabilityStatus; compact?: boolean }) {
  const { t, locale } = useT();
  const { provinceById, regionById } = useFoodData();
  const saved = useUser((s) => s.saved.includes(dish.id));
  const tried = useUser((s) => Boolean(s.tried[dish.id]));
  const primary = dish.origins.find((o) => o.role === "primary") ?? dish.origins[0];
  const place = primary.provinceId ? provinceById.get(primary.provinceId)?.nameVi : regionById.get(primary.regionId)?.nameVi;

  return (
    <Link
      href={`/dishes/${dish.id}/`}
      className={cn(
        "group relative flex gap-3 rounded-2xl border border-line/80 bg-paper p-3 transition-all hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-[0_8px_24px_-12px_rgba(41,45,41,.25)]",
        compact && "p-2.5",
      )}
      data-testid="dish-card"
      data-dish-id={dish.id}
    >
      <DishThumb dish={dish} size={compact ? 52 : 64} className="bg-ivory" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[17px] leading-tight text-charcoal group-hover:text-forest">{dish.nameVi}</h3>
          <span className="flex shrink-0 gap-1 pt-0.5 text-muted">
            {tried && <Check className="size-4 text-forest" aria-label={t("dish.tried")} />}
            {saved && <Bookmark className="size-4 fill-terracotta text-terracotta" aria-label={t("dish.saved")} />}
          </span>
        </div>
        <p className="truncate text-xs text-muted">{dish.nameEn}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={dish.category} />
          <Badge tone="outline">{place}</Badge>
          {status && status !== "none-found" && <StatusDot status={status} />}
        </div>
        {!compact && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-charcoal/75">{dish.description[locale]}</p>}
      </div>
    </Link>
  );
}

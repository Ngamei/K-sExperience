import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDish, getFoodData } from "@/lib/data/catalogue";
import { OriginLocator } from "@/components/dish/origin-locator";
import { DishDetail } from "@/components/dish/dish-detail";

export const dynamicParams = false;

export function generateStaticParams() {
  return getFoodData().dishes.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/dishes/[id]">): Promise<Metadata> {
  const d = getDish((await params).id);
  return d ? { title: `${d.nameVi} — ${d.nameEn}`, description: d.description.en } : {};
}

export default async function DishPage({ params }: PageProps<"/dishes/[id]">) {
  const { id } = await params;
  const dish = getDish(id);
  if (!dish) notFound();
  const { provinces, regions } = getFoodData();
  return <DishDetail id={dish.id} locator={<OriginLocator dish={dish} provinces={provinces} regions={regions} />} />;
}

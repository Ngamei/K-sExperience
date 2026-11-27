import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFoodData, getRestaurant } from "@/lib/data/catalogue";
import { PlaceView } from "@/components/nearby/place-view";

export const dynamicParams = false;

export function generateStaticParams() {
  const ids = getFoodData().restaurants.map((r) => ({ id: r.id }));
  // Static export requires at least one param; a placeholder route renders "not found".
  return ids.length ? ids : [{ id: "none" }];
}

export async function generateMetadata({ params }: PageProps<"/places/[id]">): Promise<Metadata> {
  const r = getRestaurant((await params).id);
  return r ? { title: r.name } : {};
}

export default async function Page({ params }: PageProps<"/places/[id]">) {
  const r = getRestaurant((await params).id);
  if (!r) notFound();
  return <PlaceView id={r.id} />;
}

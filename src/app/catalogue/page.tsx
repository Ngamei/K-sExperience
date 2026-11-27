import type { Metadata } from "next";
import { CatalogueView } from "@/components/pages/catalogue-view";
export const metadata: Metadata = { title: "Food Catalogue" };
export default function Page() { return <CatalogueView />; }

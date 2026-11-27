import type { Metadata } from "next";
import { DiscoverView } from "@/components/pages/discover-view";
export const metadata: Metadata = { title: "Discover" };
export default function Page() { return <DiscoverView />; }

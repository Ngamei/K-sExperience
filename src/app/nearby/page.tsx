import type { Metadata } from "next";
import { NearbyView } from "@/components/nearby/nearby-view";
export const metadata: Metadata = { title: "Nearby" };
export default function Page() { return <NearbyView />; }

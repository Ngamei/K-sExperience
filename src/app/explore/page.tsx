import type { Metadata } from "next";
import { ExploreView } from "@/components/explore/explore-view";

// Kept as an alias of the home page so older links keep working (static export has no redirects).
export const metadata: Metadata = { title: "Explore Vietnam" };
export default function ExplorePage() {
  return <ExploreView />;
}

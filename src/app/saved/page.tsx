import type { Metadata } from "next";
import { SavedView } from "@/components/pages/saved-view";
export const metadata: Metadata = { title: "Saved" };
export default function Page() { return <SavedView />; }

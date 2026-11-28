import type { Metadata } from "next";
import { PreferencesView } from "@/components/settings/preferences-view";
export const metadata: Metadata = { title: "Personal Preferences" };
export default function Page() { return <PreferencesView />; }

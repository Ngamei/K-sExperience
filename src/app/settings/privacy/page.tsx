import type { Metadata } from "next";
import { PrivacyView } from "@/components/settings/privacy-view";
export const metadata: Metadata = { title: "Privacy & Data" };
export default function Page() { return <PrivacyView />; }

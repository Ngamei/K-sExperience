import type { Metadata } from "next";
import { PrivacyPolicy } from "@/components/legal/legal-pages";
export const metadata: Metadata = { title: "Privacy policy" };
export default function Page() { return <PrivacyPolicy />; }

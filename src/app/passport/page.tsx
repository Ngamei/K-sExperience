import type { Metadata } from "next";
import { PassportView } from "@/components/pages/passport-view";
import { PassportGate } from "@/components/auth/auth-gate";
export const metadata: Metadata = { title: "Food Passport" };
export default function Page() { return <PassportGate><PassportView /></PassportGate>; }

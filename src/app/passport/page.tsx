import type { Metadata } from "next";
import { PassportView } from "@/components/pages/passport-view";
export const metadata: Metadata = { title: "Food Passport" };
export default function Page() { return <PassportView />; }

import type { Metadata } from "next";
import { MembershipView } from "@/components/settings/membership-view";
export const metadata: Metadata = { title: "K's Membership" };
export default function Page() { return <MembershipView />; }

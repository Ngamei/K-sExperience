import type { Metadata } from "next";
import { AdminView } from "@/components/pages/admin-view";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export default function Page() { return <AdminView />; }

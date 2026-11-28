import type { Metadata } from "next";
import { DataDeletion } from "@/components/legal/legal-pages";
export const metadata: Metadata = { title: "Delete your data" };
export default function Page() { return <DataDeletion />; }

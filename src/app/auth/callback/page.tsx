import type { Metadata } from "next";
import { AuthCallback } from "@/components/auth/auth-forms";
export const metadata: Metadata = { title: "Signing in", robots: { index: false } };
export default function Page() { return <AuthCallback />; }

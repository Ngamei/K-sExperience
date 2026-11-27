import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/auth-forms";
export const metadata: Metadata = { title: "Create account", robots: { index: false } };
export default function Page() { return <SignupForm />; }

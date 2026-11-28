import type { Metadata } from "next";
import { WhatToEatView } from "@/components/food/what-to-eat-view";
export const metadata: Metadata = { title: "Hôm nay ăn gì?", description: "What to eat today — daily Vietnamese food suggestions with places in Ho Chi Minh City." };
export default function Page() { return <WhatToEatView />; }

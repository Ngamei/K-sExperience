import type { Metadata, Viewport } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource-variable/fraunces/index.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";
import { Providers } from "@/components/shell/providers";
import { getFoodData } from "@/lib/data/catalogue";
import { FoodDataProvider } from "@/components/food/food-data";

export const metadata: Metadata = {
  title: { default: "K's Experience — Vietnamese Food", template: "%s · K's Experience" },
  description: "Explore Vietnam. Experience it in Sài Gòn. A dish-first guide to Vietnamese regional cuisine and where to taste it in Ho Chi Minh City.",
  applicationName: "K's Experience",
  appleWebApp: { capable: true, title: "K's Experience", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#294C3D", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { catalogue } = getFoodData(); // metadata only — the dataset itself is fetched once from /data/food.json
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>
          <AppShell seedCount={catalogue.dataset === "seed" ? catalogue.recordCount : null}>
            <FoodDataProvider>{children}</FoodDataProvider>
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}

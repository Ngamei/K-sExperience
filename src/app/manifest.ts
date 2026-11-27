import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "K's Experience — Vietnamese Food",
    short_name: "K's Experience",
    description: "Explore Vietnam. Experience it in Sài Gòn.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F5EE",
    theme_color: "#294C3D",
    orientation: "portrait",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

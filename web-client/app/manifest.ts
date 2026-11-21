import type { MetadataRoute } from "next";
import { resolveText } from "@/lib/i18n/orchestrator";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: resolveText("en", "common.installName"),
    short_name: resolveText("en", "common.appName"),
    description: resolveText("en", "common.appDescription"),
    start_url: "/chat",
    scope: "/",
    display: "standalone",
    background_color: "#f8f9fa",
    theme_color: "#f8f9fa",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

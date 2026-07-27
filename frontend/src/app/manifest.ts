import type { MetadataRoute } from "next";

/** Installable-app manifest: launching from the home screen opens straight
 *  into the app shell, full-screen, in the warm-paper palette. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ada — the career agent that gets you hired",
    short_name: "Ada",
    description:
      "Your CV rewritten for the role you want, your best-fit jobs ranked, and a scored mock interview — one autonomous run.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f1f4f2",
    theme_color: "#f1f4f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

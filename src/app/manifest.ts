import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Care4ll", short_name: "Care4ll", description: "A friendly health questionnaire that adapts to you",
    start_url: "/", scope: "/", display: "standalone", background_color: "#faf6f9", theme_color: "#830051",
    icons: [
      { src: "/care-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/care-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/care-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

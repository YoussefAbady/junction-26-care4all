import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Care4All", short_name: "Care4All", description: "Fictional cancer-care navigation demo",
    start_url: "/", scope: "/", display: "standalone", background_color: "#f5f9f8", theme_color: "#eff7f5",
    icons: [
      { src: "/care-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/care-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/care-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

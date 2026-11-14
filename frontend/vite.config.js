import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderServiceWorker } from "./scripts/render-sw.js";

const publicDir = "public";

/** Every file in public/, as the URL the browser requests it by. */
function publicUrls(dir = "", found = []) {
  for (const entry of readdirSync(join(publicDir, dir), { withFileTypes: true })) {
    const path = dir ? dir + "/" + entry.name : entry.name;
    if (entry.isDirectory()) publicUrls(path, found);
    else found.push("/" + path);
  }
  return found;
}

/**
 * Emits sw.js from src/sw.js with the hashed build output as its precache list. The version is a hash of every
 * precached byte, so a new build always replaces the old cache and an unchanged build never does.
 */
function serviceWorker() {
  return {
    name: "care4all:service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const items = Object.values(bundle).filter(item => !item.fileName.endsWith(".map"));
      const statics = publicUrls();
      const urls = [...new Set(["/", ...items.filter(item => item.fileName !== "index.html").map(item => "/" + item.fileName), ...statics])].sort();
      const hash = createHash("sha256");
      for (const item of items) hash.update(item.fileName).update(item.type === "chunk" ? item.code : item.source);
      for (const url of statics) hash.update(url).update(readFileSync(join(publicDir, url)));
      const source = renderServiceWorker(readFileSync("src/sw.js", "utf8"), { urls, version: hash.digest("hex").slice(0, 12) });
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  plugins: [serviceWorker()],
  build: { target: "es2022", sourcemap: false, chunkSizeWarningLimit: 700 },
  server: {
    port: 5173,
    // Local development: the same-origin /api contract, forwarded to the backend. The backend accepts writes
    // only from APP_ORIGIN, so the proxy presents that origin the way nginx does in Docker.
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL || "http://localhost:3000",
        configure(proxy) {
          proxy.on("proxyReq", request => {
            if (!["GET", "HEAD"].includes(request.method)) request.setHeader("origin", process.env.APP_ORIGIN || "http://localhost:8080");
          });
        },
      },
    },
  },
  preview: { port: 4173 },
});

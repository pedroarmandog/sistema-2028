import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
const base = process.env.COMMUNITY_BASE_PATH || "/comunidade/";
export default defineConfig({
  base,
  plugins: [
    {
      name: "community-manifest-scope",
      writeBundle() {
        const file = resolve(import.meta.dirname, "dist/manifest.webmanifest"),
          manifest = JSON.parse(readFileSync(file, "utf8"));
        Object.assign(manifest, { id: base, start_url: base, scope: base });
        writeFileSync(file, JSON.stringify(manifest));
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        admin: resolve(import.meta.dirname, "admin.html"),
      },
    },
  },
  server: {
    port: 5180,
    proxy: {
      "/api": {
        target: process.env.COMMUNITY_DEV_API || "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Installable on Android as a PWA (SPEC.md D9). The service worker keeps the
 * app shell and the art. Convex calls are never cached. Offline notebook
 * downloads arrive in Phase 6.
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Takudzidza by Taku",
        short_name: "Takudzidza",
        description: "Study from your own notes with Taku.",
        start_url: "/",
        display: "standalone",
        background_color: "#fff8ec",
        theme_color: "#fff8ec",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/art/"),
            handler: "CacheFirst",
            options: { cacheName: "art", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 90 } },
          },
        ],
      },
    }),
  ],
  build: { target: "es2022", sourcemap: false },
  server: { port: 5173, strictPort: true },
});

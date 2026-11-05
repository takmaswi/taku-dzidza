import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Installable on Android as a PWA (SPEC.md D9). The service worker precaches
 * the app shell only. Maths (KaTeX and its fonts, mathjs in the equation
 * widget) and the art are cached the first time they are used, so a first
 * visit never downloads them. Convex calls are never cached. Offline notebook
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
        background_color: "#fff8f0",
        theme_color: "#fff8f0",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png}"],
        // Loaded on first use (src/components/MathText.tsx, src/widgets/WidgetHost.tsx) and cached then, below.
        globIgnores: ["**/katex*", "**/KaTeX_*", "**/mhchem*", "**/EquationSteps*", "**/art/**"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: { cacheName: "assets", expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 90 } },
          },
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

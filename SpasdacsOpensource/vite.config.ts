import { defineConfig, searchForWorkspaceRoot } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Spasdacs",
        short_name: "Spasdacs",
        display: "standalone",
        start_url: "/spasdacs/",
        scope: "/spasdacs/",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          { src: "/spasdacs/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/spasdacs/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: [], // no precaching — installability only
      },
    }),
  ],
  base: "/spasdacs/",
  optimizeDeps: {
    include: ["monaco-editor"],
  },
  build: {
    outDir: "../ui/dist/spasdacs",
    emptyOutDir: true,
    // Heavy vendor libraries are split into their own chunks so they cache
    // independently of app code and don't bloat the entry chunk. Monaco
    // alone is ~2 MB; isolating it keeps it out of the initial download.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("monaco-editor"))                return "monaco";
            if (id.includes("@antv/x6"))                     return "x6";
            if (id.includes("gsap"))                         return "gsap";
            if (id.includes("nats.ws") || id.includes("nkeys"))      return "nats";
            if (id.includes("vue-router") || id.includes("/vue/"))   return "vue";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5181,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), ".."],
    },
    proxy: {
      "/api/go/v1": {
        target: "http://localhost:21000",
        changeOrigin: true,
      },
    },
  },
});

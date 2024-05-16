import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import eslint from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    eslint({
      exclude: ["/virtual:/**", "node_modules/**"],
    }),
    TanStackRouterVite(),
    ViteImageOptimizer({
      /* pass your config */
    }),
    nodePolyfills({
      include: ["path"],
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));

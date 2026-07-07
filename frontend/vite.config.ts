import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During local dev the API runs on :8000; Vite proxies /api to it.
// In production the FastAPI process serves this build, so /api is same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1200,
  },
});

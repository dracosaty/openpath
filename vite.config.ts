import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `vite dev` we proxy the serverless functions that `netlify dev`
// serves on :8888, so the browser only ever talks to same-origin /api/*.
// In production Netlify rewrites /api/* -> /.netlify/functions/* (see netlify.toml).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8888",
        changeOrigin: true,
      },
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { webFrameCss } from "./web-frame-css";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/dodge-bullets/game/" : "/",
  plugins: [react()],
  // PC 웹 세로 기둥 (2026-10-20) — 폭 @media · vw 를 기둥 폭 기준으로 (web-frame-css.ts · src/ui/webFrame.ts)
  css: { postcss: { plugins: [webFrameCss()] } },
  resolve: {
    // @apps-in-toss/plugin-compat ships its own react@18, which would load a
    // second React copy and break hooks.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
    exclude: ["@apps-in-toss/web-framework"],
  },
});

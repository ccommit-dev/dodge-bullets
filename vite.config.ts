import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/dodge-bullets/game/" : "/",
  plugins: [react()],
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

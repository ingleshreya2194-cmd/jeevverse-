import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), svgr()],
  server: { host: "0.0.0.0" },
  preview: { host: "0.0.0.0" },
});

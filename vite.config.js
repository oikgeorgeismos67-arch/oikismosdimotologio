import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site: https://USERNAME.github.io/dimotologio-app/
export default defineConfig({
  base: "/dimotologio-app/",
  plugins: [react()],
});

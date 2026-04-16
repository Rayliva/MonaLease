import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // App is served from a subpath on production domain.
  base: "/monalease/",
  plugins: [react(), tailwindcss()],
});

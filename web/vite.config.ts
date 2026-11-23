import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base './' so the static build works on GitHub Pages under any repository path.
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: { environment: "node" },
} as never);

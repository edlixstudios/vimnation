import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: { include: ["src/**/*.test.ts"] },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@codemirror/")) return "codemirror";
          if (id.includes("/node_modules/@replit/")) return "vim";
        },
      },
    },
  },
});

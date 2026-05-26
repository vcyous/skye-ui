import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./__tests__/setup.js"],
    include: ["__tests__/**/*.{test,spec}.{js,jsx}"],
    exclude: ["__tests__/_archive/**", "node_modules/**"],
    css: false,
  },
});

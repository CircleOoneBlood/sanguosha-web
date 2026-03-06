import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@game": path.resolve(__dirname, "src/game"),
      "@ui": path.resolve(__dirname, "src/ui"),
      "@network": path.resolve(__dirname, "src/network"),
      "@data": path.resolve(__dirname, "src/data"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
      "/api": {
        target: "http://localhost:3001",
      },
    },
  },
});

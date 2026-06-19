import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
  },
  server: {
    proxy: {
      "/api/exchange-rate": {
        target: "https://oapi.koreaexim.go.kr",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/exchange-rate/, "/site/program/financial/exchangeJSON"),
      },
    },
  },
});

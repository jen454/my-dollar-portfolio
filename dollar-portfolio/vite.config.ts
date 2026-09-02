import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error - JS 모듈(서버리스 함수와 공유), 타입 선언 없음
import { fetchExchangeRates } from "./api/_koreaexim.js";

/**
 * 개발 서버에서 프로덕션 서버리스 함수(api/exchange-rate.js)와 동일한 경로로
 * 환율을 조회한다. 단순 프록시로는 수출입은행 API의 302/쿠키·인증서 체인
 * 문제를 처리할 수 없어 미들웨어로 대체했다.
 */
function exchangeRateDevApi(apiKey: string): Plugin {
  return {
    name: "exchange-rate-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/exchange-rate", async (req, res) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");

        if (!apiKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "VITE_EXCHANGE_RATE_API_KEY가 설정되지 않았습니다." }));
          return;
        }

        const params = new URL(req.url ?? "", "http://localhost").searchParams;
        try {
          const json = await fetchExchangeRates({
            authkey: apiKey,
            data: params.get("data") ?? "AP01",
            searchdate: params.get("searchdate") ?? undefined,
          });
          res.end(JSON.stringify(json));
        } catch (error) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: (error as Error)?.message ?? "환율 조회 실패" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), exchangeRateDevApi(env.VITE_EXCHANGE_RATE_API_KEY ?? "")],
    test: {
      environment: "node",
    },
  };
});

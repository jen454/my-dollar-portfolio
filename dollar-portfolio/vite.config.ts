import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error - JS 모듈(서버리스 함수와 공유), 타입 선언 없음
import { fetchExchangeRates, fetchWeeklyUsdRates } from "./api/_koreaexim.js";

const MIN_USABLE_SAMPLES = 20;

/**
 * 개발 서버에서 프로덕션 서버리스 함수와 동일한 경로로 환율을 조회한다.
 * 단순 프록시로는 수출입은행 API의 302/쿠키·인증서 체인 문제를 처리할 수 없어
 * 미들웨어로 대체했다. 52주 이력은 dev에서도 메모리에 캐싱해
 * HMR 재요청으로 일일 호출 한도를 소모하지 않게 한다.
 */
function exchangeRateDevApi(apiKey: string): Plugin {
  let historicalCache: { rates: number[]; collectedAt: string } | null = null;

  const json = (res: { statusCode: number; end: (body: string) => void }, status: number, body: unknown) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };

  return {
    name: "exchange-rate-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/exchange-rate", async (req, res) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        if (!apiKey) return json(res, 500, { error: "VITE_EXCHANGE_RATE_API_KEY가 설정되지 않았습니다." });

        const params = new URL(req.url ?? "", "http://localhost").searchParams;
        try {
          const items = await fetchExchangeRates({
            authkey: apiKey,
            data: params.get("data") ?? "AP01",
            searchdate: params.get("searchdate") ?? undefined,
          });
          json(res, 200, items);
        } catch (error) {
          json(res, 502, { error: (error as Error)?.message ?? "환율 조회 실패" });
        }
      });

      server.middlewares.use("/api/historical-rates", async (_req, res) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        if (!apiKey) return json(res, 500, { error: "VITE_EXCHANGE_RATE_API_KEY가 설정되지 않았습니다." });

        if (historicalCache) return json(res, 200, historicalCache);

        try {
          const rates: number[] = await fetchWeeklyUsdRates({ authkey: apiKey });
          if (rates.length < MIN_USABLE_SAMPLES) {
            return json(res, 502, { error: "환율 이력 표본이 충분하지 않습니다." });
          }
          historicalCache = { rates, collectedAt: new Date().toISOString() };
          json(res, 200, historicalCache);
        } catch (error) {
          json(res, 502, { error: (error as Error)?.message ?? "환율 이력 조회 실패" });
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

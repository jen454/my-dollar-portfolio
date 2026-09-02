import { fetchWeeklyUsdRates } from "./_koreaexim.js";

const WEEKS = 52;
const MIN_USABLE_SAMPLES = 20; // 표본이 너무 적으면 통계가 왜곡되므로 실패로 처리
const ONE_DAY_SECONDS = 60 * 60 * 24;

// 같은 람다 인스턴스가 재사용되는 동안의 2차 캐시 (CDN 캐시 미스 시 상대 서버 보호)
let memoryCache = null; // { collectedAt: number, payload: object }
const MEMORY_TTL_MS = ONE_DAY_SECONDS * 1000;

export default async function handler(_req, res) {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  res.setHeader("Access-Control-Allow-Origin", "*");
  // Vercel CDN이 하루 동안 응답을 재사용한다. 갱신 중에는 오래된 값을 그대로 내보낸다.
  res.setHeader(
    "Cache-Control",
    `public, max-age=0, s-maxage=${ONE_DAY_SECONDS}, stale-while-revalidate=${ONE_DAY_SECONDS * 7}`,
  );

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  if (memoryCache && Date.now() - memoryCache.collectedAt < MEMORY_TTL_MS) {
    return res.json(memoryCache.payload);
  }

  try {
    const rates = await fetchWeeklyUsdRates({ authkey: apiKey, weeks: WEEKS });

    if (rates.length < MIN_USABLE_SAMPLES) {
      return res.status(502).json({ error: "환율 이력 표본이 충분하지 않습니다." });
    }

    const payload = { rates, collectedAt: new Date().toISOString() };
    memoryCache = { collectedAt: Date.now(), payload };
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({ error: error?.message ?? "환율 이력 조회에 실패했습니다." });
  }
}

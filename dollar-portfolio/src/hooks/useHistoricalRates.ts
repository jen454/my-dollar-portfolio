import { useEffect, useState } from "react";

const HISTORICAL_RATES_API_URL = import.meta.env.DEV
  ? "/api/historical-rates"
  : import.meta.env.VITE_HISTORICAL_RATES_PROXY_URL;
const CACHE_KEY = "historical_rates_cache";

export interface HistoricalRateStats {
  weeklyLow: number; // 52주 최저
  weeklyHigh: number; // 52주 최고
  weeklyAverage: number; // 52주 평균
  currentPercentile: number; // 현재 환율의 백분위 (0~100). 100=52주 중 높은 편, 0=낮은 편
  dataPoints: number; // 실제 수집된 주간 표본 수
  isLoading: boolean;
  error: string | null;
}

type HistoricalRatesCache = {
  rates: number[];
  weekKey: string; // 'YYYY-WW'
};

type HistoricalRatesResponse = {
  rates?: number[];
  error?: string;
};

/** ISO 주차 기반 'YYYY-WW' 캐시 키. 같은 주면 동일 문자열을 반환한다. */
function getWeekKey(date: Date): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() === 0 ? 7 : target.getUTCDay();
  target.setUTCDate(target.getUTCDate() + 4 - dayNum); // 해당 주의 목요일
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function readCache(): HistoricalRatesCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HistoricalRatesCache;
    if (!Array.isArray(parsed.rates) || typeof parsed.weekKey !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cache: HistoricalRatesCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 캐시 저장 실패는 무시
  }
}

/**
 * 52주 주간 샘플 환율을 서버에서 한 번에 받아온다.
 *
 * 수집 자체는 서버(api/historical-rates)에서만 수행한다. 클라이언트가 52주를
 * 직접 조회하면 사용자 1명당 최대 156회를 호출해 수출입은행 일일 한도(1,000회)를
 * 몇 명만으로 소진하고, 현재 환율 조회까지 함께 막히기 때문이다.
 */
async function fetchWeeklyRates(): Promise<number[]> {
  const url = new URL(HISTORICAL_RATES_API_URL, window.location.origin);
  const response = await fetch(url.toString());
  const payload = (await response.json().catch(() => null)) as HistoricalRatesResponse | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `환율 이력 응답 오류 (${response.status})`);
  }
  if (!Array.isArray(payload?.rates) || payload.rates.length === 0) {
    throw new Error("환율 이력을 불러오지 못했어요.");
  }
  return payload.rates;
}

function computeStats(rates: number[], currentRate: number) {
  const weeklyLow = Math.min(...rates);
  const weeklyHigh = Math.max(...rates);
  const weeklyAverage = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  const belowCount = rates.filter((rate) => rate < currentRate).length;
  const currentPercentile = Math.round((belowCount / rates.length) * 100);
  return { weeklyLow, weeklyHigh, weeklyAverage, currentPercentile, dataPoints: rates.length };
}

/**
 * 현재 환율이 최근 52주 대비 어느 수준인지 통계를 제공한다.
 * - 주 1회만 조회 후 localStorage에 캐싱 (weekKey 기준).
 * - 판단/추천 없이 수치만 반환한다.
 */
export function useHistoricalRates(currentRate: number): HistoricalRateStats {
  const [rates, setRates] = useState<number[]>(() => readCache()?.rates ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentWeekKey = getWeekKey(new Date());
    const cached = readCache();
    if (cached && cached.weekKey === currentWeekKey && cached.rates.length > 0) {
      setRates(cached.rates);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchWeeklyRates()
      .then((fetched) => {
        if (cancelled) return;
        setRates(fetched);
        writeCache({ rates: fetched, weekKey: currentWeekKey });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "환율 이력을 불러오지 못했어요.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // 최초 마운트 시 1회만 수집 (주간 캐시로 재조회 방지)
  }, []);

  if (rates.length === 0 || currentRate <= 0) {
    return {
      weeklyLow: 0,
      weeklyHigh: 0,
      weeklyAverage: 0,
      currentPercentile: 0,
      dataPoints: rates.length,
      isLoading,
      error,
    };
  }

  return { ...computeStats(rates, currentRate), isLoading, error };
}

/**
 * 현재 환율의 52주 내 위치를 문구로 표현한다.
 * 범위를 벗어나면 백분위(0%/100%)가 어색해지므로 별도 문구를 쓴다.
 */
export function describeRateLevel(
  currentRate: number,
  weeklyLow: number,
  weeklyHigh: number,
  currentPercentile: number,
): string {
  if (currentRate <= weeklyLow) return "52주 최저 수준";
  if (currentRate >= weeklyHigh) return "52주 최고 수준";
  if (currentPercentile >= 50) return `52주 중 상위 ${100 - currentPercentile}% 수준`;
  return `52주 중 하위 ${currentPercentile}% 수준`;
}

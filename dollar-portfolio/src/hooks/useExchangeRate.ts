import { useCallback, useEffect, useState } from "react";
import { useRecordStore } from "../store/recordStore";

const EXCHANGE_RATE_API_URL = import.meta.env.DEV
  ? "/api/exchange-rate"
  : "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON";
const CACHE_KEY = "dollar_portfolio_exchange_rate_cache";
const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_BUSINESS_DAY_LOOKBACK = 5; // 비영업일 대비 최대 5일 전까지 재조회

type ExchangeRateCache = {
  rate: number;
  fetchedAt: number; // timestamp(ms)
  rateBaseDate: string; // 'YYYY.MM.DD'
};

type ExchangeRateApiItem = {
  result: number;
  cur_unit: string;
  deal_bas_r: string;
};

type UseExchangeRateResult = {
  rate: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
  rateBaseDate: string | null; // 실제 환율 기준일 'YYYY.MM.DD'
  refetch: () => void;
};

function readCache(): ExchangeRateCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExchangeRateCache;
    if (typeof parsed.rate !== "number" || typeof parsed.fetchedAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cache: ExchangeRateCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 캐시 저장 실패는 무시 (다음 조회 시 다시 시도)
  }
}

function parseDealBasR(value: string): number {
  const parsed = parseFloat(value.replaceAll(",", ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * 기준일로부터 daysAgo만큼 이전 날짜를 'YYYYMMDD' 형식으로 반환한다.
 */
function formatSearchDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function resolveResultError(resultCode: number): string {
  switch (resultCode) {
    case 2:
      return "DATA 코드 오류입니다.";
    case 3:
      return "인증코드 오류입니다.";
    case 4:
      return "일일 제한횟수를 초과했습니다.";
    default:
      return "환율 조회에 실패했습니다.";
  }
}

/**
 * searchdate 기준으로 환율을 조회한다. 비영업일/응답 없음이면 null을 반환한다.
 */
async function fetchExchangeRateByDate(
  searchDate: string,
  apiKey: string,
): Promise<number | null> {
  const url = new URL(EXCHANGE_RATE_API_URL, window.location.origin);
  url.searchParams.set("authkey", apiKey);
  url.searchParams.set("data", "AP01");
  url.searchParams.set("searchdate", searchDate);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`환율 API 응답 오류 (${response.status})`);
  }

  const data = (await response.json()) as ExchangeRateApiItem[] | null;
  // 비영업일/오전 11시 이전 조회 시 null 또는 빈 배열이 내려온다.
  if (!data || data.length === 0) {
    return null;
  }

  const usd = data.find((item) => item.cur_unit === "USD");
  if (!usd) {
    return null;
  }

  if (usd.result !== 1) {
    throw new Error(resolveResultError(usd.result));
  }

  const parsedRate = parseDealBasR(usd.deal_bas_r);
  return parsedRate > 0 ? parsedRate : null;
}

function formatRateBaseDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

/**
 * 오늘 날짜부터 최대 MAX_BUSINESS_DAY_LOOKBACK일 전까지 하루씩 앞당겨가며
 * 가장 최근 영업일의 환율을 조회한다.
 */
async function fetchLatestExchangeRate(apiKey: string): Promise<{ rate: number; rateBaseDate: string }> {
  for (let daysAgo = 0; daysAgo < MAX_BUSINESS_DAY_LOOKBACK; daysAgo += 1) {
    const searchDate = formatSearchDate(daysAgo);
    const rate = await fetchExchangeRateByDate(searchDate, apiKey);
    if (rate !== null) {
      return { rate, rateBaseDate: formatRateBaseDate(searchDate) };
    }
  }
  throw new Error("최근 영업일 환율 정보를 찾을 수 없습니다.");
}

/**
 * 한국수출입은행 OpenAPI로 실시간 USD 기준환율을 조회한다.
 * - 마지막 조회 후 1시간 이내면 캐시된 값을 사용한다.
 * - 비영업일/조회 시간 이전이면 최근 영업일까지 하루씩 앞당겨 재조회한다.
 * - 조회 실패 시 recordStore에 저장된 마지막 환율을 그대로 사용한다.
 */
export function useExchangeRate(): UseExchangeRateResult {
  const storeRate = useRecordStore((state) => state.currentExchangeRate);
  const cached = readCache();

  const [rate, setRate] = useState(cached?.rate ?? storeRate);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(
    cached ? new Date(cached.fetchedAt) : null,
  );
  const [rateBaseDate, setRateBaseDate] = useState<string | null>(cached?.rateBaseDate ?? null);

  const fetchRate = useCallback(
    async (force: boolean) => {
      if (!force) {
        const cachedNow = readCache();
        if (cachedNow && Date.now() - cachedNow.fetchedAt < ONE_HOUR_MS && cachedNow.rateBaseDate) {
          setRate(cachedNow.rate);
          setRateBaseDate(cachedNow.rateBaseDate ?? null);
          setLastFetched(new Date(cachedNow.fetchedAt));
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY ?? "";
        const { rate: parsedRate, rateBaseDate: baseDate } = await fetchLatestExchangeRate(apiKey);

        const fetchedAt = Date.now();
        writeCache({ rate: parsedRate, fetchedAt, rateBaseDate: baseDate });
        setRate(parsedRate);
        setRateBaseDate(baseDate);
        setLastFetched(new Date(fetchedAt));
      } catch (err) {
        setError(err instanceof Error ? err.message : "환율 조회에 실패했습니다.");
        setRate(storeRate);
      } finally {
        setIsLoading(false);
      }
    },
    [storeRate],
  );

  useEffect(() => {
    fetchRate(false);
    // 최초 마운트 시 1회만 캐시 확인 후 필요하면 조회한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = useCallback(() => {
    fetchRate(true);
  }, [fetchRate]);

  return { rate, isLoading, error, lastFetched, rateBaseDate, refetch };
}

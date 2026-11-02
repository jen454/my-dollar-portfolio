import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLatestExchangeRate } from "./useExchangeRate";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

const USD_OK = [{ result: 1, cur_unit: "USD", deal_bas_r: "1,400.5" }];

describe("fetchLatestExchangeRate", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { origin: "https://app.test" } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("쉼표가 있는 환율을 숫자로 읽는다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(USD_OK));
    await expect(fetchLatestExchangeRate()).resolves.toMatchObject({ rate: 1400.5 });
  });

  it("비영업일이면 이전 날짜로 거슬러 조회한다", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([])).mockResolvedValueOnce(jsonResponse(USD_OK));
    await expect(fetchLatestExchangeRate()).resolves.toMatchObject({ rate: 1400.5 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("USD 항목이 없는 한도 초과 응답을 비영업일로 오인하지 않는다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ result: 4, cur_unit: null, deal_bas_r: null }]));
    await expect(fetchLatestExchangeRate()).rejects.toThrow("일일 제한횟수");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("프록시 오류 메시지를 전달한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "환율 API 응답 시간 초과" }, 502));
    await expect(fetchLatestExchangeRate()).rejects.toThrow("시간 초과");
  });

  it("응답이 없으면 12초 후 요청을 중단한다", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );

    const result = fetchLatestExchangeRate().catch((error: Error) => error);
    await vi.advanceTimersByTimeAsync(12_000);

    expect(await result).toBeInstanceOf(Error);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

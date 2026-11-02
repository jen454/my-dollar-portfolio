import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const httpsGet = vi.hoisted(() => vi.fn());
vi.mock("node:https", () => ({ default: { get: httpsGet } }));

// @ts-expect-error - JS 모듈, 타입 선언 없음
import { fetchExchangeRates } from "./_koreaexim.js";

type FakeResponse = {
  status: number;
  body?: string;
  headers?: Record<string, string[]>;
};

class FakeRequest extends EventEmitter {
  destroy(error?: Error) {
    if (error) this.emit("error", error);
  }
}

/** 응답을 정상적으로 돌려주는 요청 */
function respond({ status, body = "", headers = {} }: FakeResponse) {
  return (_url: string, _options: unknown, callback: (res: unknown) => void) => {
    const req = new FakeRequest();
    const res = Object.assign(new EventEmitter(), {
      statusCode: status,
      headers,
      setEncoding() {},
    });
    queueMicrotask(() => {
      callback(res);
      res.emit("data", body);
      res.emit("end");
    });
    return req;
  };
}

/** 영원히 응답하지 않는 요청 */
function hang() {
  return () => new FakeRequest();
}

const OK = { status: 200, body: '[{"result":1,"cur_unit":"USD"}]' };

describe("fetchExchangeRates", () => {
  beforeEach(() => {
    httpsGet.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("302와 쿠키를 받으면 쿠키를 붙여 다시 요청한다", async () => {
    httpsGet
      .mockImplementationOnce(respond({ status: 302, headers: { "set-cookie": ["waf=abc; Path=/"] } }))
      .mockImplementationOnce(respond(OK));

    await expect(fetchExchangeRates({ authkey: "k" })).resolves.toEqual([
      { result: 1, cur_unit: "USD" },
    ]);
    expect(httpsGet.mock.calls[1][1].headers).toEqual({ Cookie: "waf=abc" });
  });

  it("비영업일의 빈 응답은 빈 배열", async () => {
    httpsGet.mockImplementationOnce(respond({ status: 200, body: "  " }));
    await expect(fetchExchangeRates({ authkey: "k" })).resolves.toEqual([]);
  });

  it("200이어도 JSON이 아니면 재시도한다", async () => {
    httpsGet
      .mockImplementationOnce(respond({ status: 200, body: "<html>WAF</html>" }))
      .mockImplementationOnce(respond(OK));

    await expect(fetchExchangeRates({ authkey: "k" })).resolves.toHaveLength(1);
  });

  it("계속 실패하면 3회 시도 후 마지막 오류를 던진다", async () => {
    httpsGet.mockImplementation(respond({ status: 500 }));
    await expect(fetchExchangeRates({ authkey: "k" })).rejects.toThrow("(500)");
    expect(httpsGet).toHaveBeenCalledTimes(3);
  });

  it("응답이 없어도 함수 제한 시간(10초) 전에 오류로 끝난다", async () => {
    vi.useFakeTimers();
    httpsGet.mockImplementation(hang());
    const startedAt = Date.now();

    const result = fetchExchangeRates({ authkey: "k" }).catch((error: Error) => error);
    await vi.advanceTimersByTimeAsync(10_000);
    const error = await result;

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("시간 초과");
    expect(Date.now() - startedAt).toBeLessThanOrEqual(10_000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("본문을 받는 중에 끊기면 멈추지 않고 재시도한다", async () => {
    httpsGet
      .mockImplementationOnce((_url: string, _options: unknown, callback: (res: unknown) => void) => {
        const req = new FakeRequest();
        const res = Object.assign(new EventEmitter(), {
          statusCode: 200,
          headers: {},
          setEncoding() {},
        });
        queueMicrotask(() => {
          callback(res);
          res.emit("data", "[{");
          res.emit("error", new Error("aborted"));
        });
        return req;
      })
      .mockImplementationOnce(respond(OK));

    await expect(fetchExchangeRates({ authkey: "k" })).resolves.toHaveLength(1);
  });
});

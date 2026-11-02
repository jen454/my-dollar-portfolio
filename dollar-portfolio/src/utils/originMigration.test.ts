import { beforeEach, describe, it, expect, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  getOriginStorage: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock("@apps-in-toss/web-framework", () => ({
  Migration: { getOriginStorage: sdk.getOriginStorage },
  Storage: { getItem: sdk.getItem, setItem: sdk.setItem, removeItem: vi.fn() },
}));

import { migrateOriginStorage } from "./originMigration";
import { STORAGE_KEY, parseStorage, pickLatest } from "./storage";
import type { DollarPortfolioStorageV1 } from "../types";

describe("migrateOriginStorage", () => {
  const FLAG = "dollar_portfolio_origin_migrated";
  const older = JSON.stringify({ version: 1, transactions: [], updatedAt: "2026-09-01T00:00:00.000Z" });
  let local: Map<string, string>;

  beforeEach(() => {
    vi.resetAllMocks();
    local = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => void local.set(key, value),
      removeItem: (key: string) => void local.delete(key),
    });
    sdk.getOriginStorage.mockResolvedValue({ previous: { localStorage: { [STORAGE_KEY]: older } } });
  });

  it("현재 저장소를 읽지 못하면 옛 기록으로 덮어쓰지 않고 다음 실행 때 재시도한다", async () => {
    sdk.getItem.mockRejectedValue(new Error("bridge failed"));
    // 개발 모드의 "브라우저에서는 기록 없음" 예외를 끄고 운영과 같은 조건으로 확인한다.
    vi.stubEnv("DEV", false);
    await migrateOriginStorage();
    vi.unstubAllEnvs();

    expect(sdk.setItem).not.toHaveBeenCalled();
    expect(local.get(FLAG)).toBeUndefined();
  });

  it("현재 기록이 없으면 이전 기록을 옮기고 완료 표시를 남긴다", async () => {
    sdk.getItem.mockResolvedValue(null);
    sdk.setItem.mockResolvedValue(undefined);
    await migrateOriginStorage();

    expect(sdk.setItem).toHaveBeenCalledOnce();
    expect(local.get(FLAG)).toBe("1");
  });
});

function storage(updatedAt: string): DollarPortfolioStorageV1 {
  return { version: 1, transactions: [], updatedAt };
}

describe("parseStorage", () => {
  it("정상 저장본", () =>
    expect(parseStorage(JSON.stringify(storage("2026-09-01T00:00:00.000Z")))).toEqual(
      storage("2026-09-01T00:00:00.000Z"),
    ));
  it("값 없음 → null", () => expect(parseStorage(null)).toBeNull());
  it("깨진 JSON → null", () => expect(parseStorage("{")).toBeNull());
  it("형식이 다르면 null", () => expect(parseStorage(JSON.stringify({ version: 2 }))).toBeNull());
});

describe("pickLatest", () => {
  const older = storage("2026-09-01T00:00:00.000Z");
  const newer = storage("2026-09-20T00:00:00.000Z");

  it("이전 저장본만 있으면 이전 것", () => expect(pickLatest(null, older)).toBe(older));
  it("현재 저장본만 있으면 현재 것", () => expect(pickLatest(older, null)).toBe(older));
  it("이전 것이 더 최신이면 이전 것", () => expect(pickLatest(older, newer)).toBe(newer));
  it("현재 것이 더 최신이면 현재 것", () => expect(pickLatest(newer, older)).toBe(newer));
  it("같으면 현재 것 유지", () => {
    const same = storage(older.updatedAt);
    expect(pickLatest(older, same)).toBe(older);
  });
});

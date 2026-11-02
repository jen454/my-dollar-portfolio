import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@apps-in-toss/web-framework", () => ({ Storage: sdk }));

import { STORAGE_KEY, StorageReadError, portfolioStorage } from "./storage";
import type { DollarPortfolioStorageV1 } from "../types";

function saved(updatedAt: string): DollarPortfolioStorageV1 {
  return { version: 1, transactions: [], updatedAt };
}

const OLD = saved("2026-09-01T00:00:00.000Z");
const NEW = saved("2026-09-20T00:00:00.000Z");

describe("portfolioStorage", () => {
  let local: Map<string, string>;
  let localWriteFails: boolean;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("DEV", false); // 운영 빌드 동작을 기준으로 검증한다
    local = new Map();
    localWriteFails = false;
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (localWriteFails) throw new Error("quota");
        local.set(key, value);
      },
      removeItem: (key: string) => void local.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("get", () => {
    it("기록이 정말 없으면 null", async () => {
      sdk.getItem.mockResolvedValue(null);
      await expect(portfolioStorage.get()).resolves.toBeNull();
    });

    it("SDK 읽기가 계속 실패하고 백업도 없으면 기록 없음으로 처리하지 않는다", async () => {
      sdk.getItem.mockRejectedValue(new Error("bridge failed"));
      await expect(portfolioStorage.get()).rejects.toBeInstanceOf(StorageReadError);
      expect(sdk.getItem).toHaveBeenCalledTimes(3);
    });

    it("일시적인 SDK 실패는 재시도로 복구한다", async () => {
      sdk.getItem.mockRejectedValueOnce(new Error("bridge failed"));
      sdk.getItem.mockResolvedValue(JSON.stringify(NEW));
      await expect(portfolioStorage.get()).resolves.toEqual(NEW);
    });

    it("SDK 데이터가 깨졌고 백업도 없으면 오류", async () => {
      sdk.getItem.mockResolvedValue("{broken");
      await expect(portfolioStorage.get()).rejects.toBeInstanceOf(StorageReadError);
    });

    it("형식이 다른 데이터도 기록 없음으로 처리하지 않는다", async () => {
      sdk.getItem.mockResolvedValue(JSON.stringify({ version: 2 }));
      await expect(portfolioStorage.get()).rejects.toBeInstanceOf(StorageReadError);
    });

    it("SDK를 읽지 못해도 백업이 있으면 백업을 쓴다", async () => {
      sdk.getItem.mockRejectedValue(new Error("bridge failed"));
      local.set(STORAGE_KEY, JSON.stringify(OLD));
      await expect(portfolioStorage.get()).resolves.toEqual(OLD);
    });

    it("쓰기 폴백으로 localStorage가 더 최신이면 그쪽을 쓴다", async () => {
      sdk.getItem.mockResolvedValue(JSON.stringify(OLD));
      local.set(STORAGE_KEY, JSON.stringify(NEW));
      await expect(portfolioStorage.get()).resolves.toEqual(NEW);
    });

    it("SDK가 더 최신이면 SDK를 쓴다", async () => {
      sdk.getItem.mockResolvedValue(JSON.stringify(NEW));
      local.set(STORAGE_KEY, JSON.stringify(OLD));
      await expect(portfolioStorage.get()).resolves.toEqual(NEW);
    });

    it("개발 브라우저(SDK 없음)에서는 기록 없음으로 처리한다", async () => {
      vi.stubEnv("DEV", true);
      sdk.getItem.mockRejectedValue(new Error("not webview"));
      await expect(portfolioStorage.get()).resolves.toBeNull();
    });
  });

  describe("set", () => {
    it("두 저장소에 모두 쓴다", async () => {
      sdk.setItem.mockResolvedValue(undefined);
      await portfolioStorage.set(NEW);
      expect(sdk.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(NEW));
      expect(local.get(STORAGE_KEY)).toBe(JSON.stringify(NEW));
    });

    it("SDK 쓰기 실패 후 재시작해도 새 기록이 유지된다", async () => {
      sdk.setItem.mockRejectedValue(new Error("bridge failed"));
      sdk.getItem.mockResolvedValue(JSON.stringify(OLD));
      await portfolioStorage.set(NEW);
      await expect(portfolioStorage.get()).resolves.toEqual(NEW);
    });

    it("둘 다 실패하면 오류", async () => {
      sdk.setItem.mockRejectedValue(new Error("bridge failed"));
      localWriteFails = true;
      await expect(portfolioStorage.set(NEW)).rejects.toThrow("저장하지 못했어요");
    });

    it("백업만 실패하면 성공", async () => {
      sdk.setItem.mockResolvedValue(undefined);
      localWriteFails = true;
      await expect(portfolioStorage.set(NEW)).resolves.toBeUndefined();
    });
  });
});

import { Storage as SDKStorage } from "@apps-in-toss/web-framework";
import type { DollarPortfolioStorageV1 } from "../types";

const STORAGE_KEY = "dollar_portfolio_v1";

export const portfolioStorage = {
  async get(): Promise<DollarPortfolioStorageV1 | null> {
    try {
      const data = await SDKStorage.getItem(STORAGE_KEY);
      if (!data) throw new Error("no data");
      return JSON.parse(data);
    } catch {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    }
  },

  async set(storage: DollarPortfolioStorageV1): Promise<void> {
    const json = JSON.stringify(storage);
    try {
      await SDKStorage.setItem(STORAGE_KEY, json);
    } catch {
      try {
        localStorage.setItem(STORAGE_KEY, json);
      } catch {
        throw new Error("저장 공간이 부족해 기록을 저장할 수 없어요.");
      }
    }
  },

  async clear(): Promise<void> {
    try {
      await SDKStorage.removeItem(STORAGE_KEY);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
};

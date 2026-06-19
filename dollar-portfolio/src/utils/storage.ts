import { Storage as SDKStorage } from "@apps-in-toss/web-framework";
import type { DollarPortfolioStorageV1 } from "../types";

const STORAGE_KEY = "dollar_portfolio_v1";

export const portfolioStorage = {
  async get(): Promise<DollarPortfolioStorageV1 | null> {
    try {
      const data = await SDKStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    }
  },

  async set(storage: DollarPortfolioStorageV1): Promise<void> {
    const json = JSON.stringify(storage);
    try {
      await SDKStorage.setItem(STORAGE_KEY, json);
    } catch {
      localStorage.setItem(STORAGE_KEY, json);
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

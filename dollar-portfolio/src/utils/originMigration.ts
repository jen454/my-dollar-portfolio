import { Migration } from "@apps-in-toss/web-framework";
import type { DollarPortfolioStorageV1 } from "../types";
import { STORAGE_KEY, portfolioStorage } from "./storage";

const MIGRATED_FLAG_KEY = "dollar_portfolio_origin_migrated";
// SDK 자체 타임아웃은 60초라 앱 시작이 너무 오래 막힌다. 실패하면 다음 실행 때 다시 시도한다.
const MIGRATION_TIMEOUT_MS = 5000;

export function parseStorage(raw: string | null | undefined): DollarPortfolioStorageV1 | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.version === 1 && Array.isArray(data.transactions)) return data;
    return null;
  } catch {
    return null;
  }
}

/**
 * 두 저장본 중 updatedAt이 더 최신인 쪽을 고른다. 같으면 현재 저장본을 유지한다.
 */
export function pickLatest(
  current: DollarPortfolioStorageV1 | null,
  previous: DollarPortfolioStorageV1 | null,
): DollarPortfolioStorageV1 | null {
  if (!previous) return current;
  if (!current) return previous;
  return Date.parse(previous.updatedAt) > Date.parse(current.updatedAt) ? previous : current;
}

function isMigrated() {
  try {
    return localStorage.getItem(MIGRATED_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function markMigrated() {
  try {
    localStorage.setItem(MIGRATED_FLAG_KEY, "1");
  } catch {
    // 표시를 못 남기면 다음 실행 때 한 번 더 확인할 뿐이라 무시한다.
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/**
 * SDK 2.x → 3.x 전환으로 이전 origin의 localStorage에 남은 기록을 한 번만 옮겨온다.
 * 현재 저장본과 비교해 updatedAt이 더 최신인 쪽을 남긴다.
 */
export async function migrateOriginStorage(): Promise<void> {
  if (isMigrated()) return;

  try {
    const { previous } = await withTimeout(Migration.getOriginStorage(), MIGRATION_TIMEOUT_MS);
    const previousStorage = parseStorage(previous.localStorage[STORAGE_KEY]);
    if (previousStorage) {
      const current = await portfolioStorage.get();
      const latest = pickLatest(current, previousStorage);
      if (latest && latest !== current) {
        await portfolioStorage.set(latest);
      }
    }
    markMigrated();
  } catch {
    // 지원하지 않는 환경이거나 일시적 실패. 기존 데이터는 그대로 두고 다음 실행 때 재시도한다.
  }
}

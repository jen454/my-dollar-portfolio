import { Storage as SDKStorage } from "@apps-in-toss/web-framework";
import type { DollarPortfolioStorageV1 } from "../types";

export const STORAGE_KEY = "dollar_portfolio_v1";

const SDK_READ_ATTEMPTS = 3;
const SDK_READ_RETRY_MS = 300;

/**
 * 저장된 기록을 읽지 못했을 때 던진다. "기록 없음"(null)과 구분해야
 * 빈 상태에서 새 기록을 저장하면서 기존 기록을 덮어쓰는 일을 막을 수 있다.
 */
export class StorageReadError extends Error {
  constructor() {
    super("기록을 불러오지 못했어요.");
    this.name = "StorageReadError";
  }
}

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
 * 두 저장본 중 updatedAt이 더 최신인 쪽을 고른다. 같으면 current를 유지한다.
 */
export function pickLatest(
  current: DollarPortfolioStorageV1 | null,
  other: DollarPortfolioStorageV1 | null,
): DollarPortfolioStorageV1 | null {
  if (!other) return current;
  if (!current) return other;
  return Date.parse(other.updatedAt) > Date.parse(current.updatedAt) ? other : current;
}

async function readSdk(): Promise<{ failed: boolean; raw: string | null }> {
  for (let attempt = 0; attempt < SDK_READ_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, SDK_READ_RETRY_MS));
    }
    try {
      return { failed: false, raw: await SDKStorage.getItem(STORAGE_KEY) };
    } catch {
      // 일시적 실패일 수 있어 다시 시도한다.
    }
  }
  return { failed: true, raw: null };
}

function readLocal(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const portfolioStorage = {
  /**
   * SDK Storage와 localStorage 중 더 최신 저장본을 돌려준다.
   * 진짜 기록이 없을 때만 null이고, 읽지 못한 데이터가 남아 있으면 StorageReadError를 던진다.
   */
  async get(): Promise<DollarPortfolioStorageV1 | null> {
    const sdk = await readSdk();
    const localRaw = readLocal();
    const latest = pickLatest(parseStorage(sdk.raw), parseStorage(localRaw));
    if (latest) return latest;

    const hasUnreadableData = sdk.failed || Boolean(sdk.raw) || Boolean(localRaw);
    // 토스 앱 밖의 개발 브라우저에서는 SDK 호출이 항상 실패하므로 기록 없음으로 본다.
    if (hasUnreadableData && !(import.meta.env.DEV && sdk.failed && !localRaw)) {
      throw new StorageReadError();
    }
    return null;
  },

  /**
   * 두 저장소에 모두 쓴다. localStorage는 SDK를 읽지 못할 때를 위한 백업이고,
   * 한쪽에만 저장돼도 다음 읽기에서 updatedAt이 최신인 쪽이 선택된다.
   */
  async set(storage: DollarPortfolioStorageV1): Promise<void> {
    const json = JSON.stringify(storage);
    let saved = false;
    try {
      await SDKStorage.setItem(STORAGE_KEY, json);
      saved = true;
    } catch {
      // 아래 localStorage 저장 결과로 판단한다.
    }
    try {
      localStorage.setItem(STORAGE_KEY, json);
      saved = true;
    } catch {
      // SDK 저장이 성공했다면 백업 실패는 무시한다.
    }
    if (!saved) {
      throw new Error("기록을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  },

  async clear(): Promise<void> {
    try {
      await SDKStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage는 아래에서 따로 지운다.
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 지울 수 없으면 다음 읽기에서 남은 값을 사용한다.
    }
  },
};

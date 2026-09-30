import { describe, it, expect, vi } from "vitest";

vi.mock("@apps-in-toss/web-framework", () => ({ Migration: {}, Storage: {} }));

import { parseStorage, pickLatest } from "./originMigration";
import type { DollarPortfolioStorageV1 } from "../types";

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

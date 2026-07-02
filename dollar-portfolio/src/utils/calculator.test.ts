import { describe, it, expect } from "vitest";
import {
  calculatePortfolioSummary,
  buildTransactionBalanceMap,
  getRecentTransactions,
  sortTransactionsByDateDesc,
} from "./calculator";
import type { DollarTransaction } from "../types";

// ─── 픽스처 헬퍼 ────────────────────────────────────────────────────
function buy(id: string, date: string, dollar: number, krw: number, rate: number): DollarTransaction {
  return { id, type: "buy", title: "달러로 환전", date, dollarAmount: dollar, krwAmount: krw, exchangeRate: rate };
}
function sell(id: string, date: string, dollar: number, krw: number, rate: number): DollarTransaction {
  return { id, type: "sell", title: "원화로 환전", date, dollarAmount: dollar, krwAmount: krw, exchangeRate: rate };
}

// ─── sortTransactionsByDateDesc ──────────────────────────────────────
describe("sortTransactionsByDateDesc", () => {
  it("날짜 내림차순 정렬", () => {
    const txs = [
      buy("a", "2026.01.01", 100, 140000, 1400),
      buy("b", "2026.03.01", 100, 145000, 1450),
      buy("c", "2026.02.01", 100, 142000, 1420),
    ];
    const sorted = sortTransactionsByDateDesc(txs);
    expect(sorted.map((t) => t.id)).toEqual(["b", "c", "a"]);
  });
  it("같은 날짜면 id 내림차순", () => {
    const txs = [
      buy("a", "2026.01.01", 100, 140000, 1400),
      buy("b", "2026.01.01", 100, 140000, 1400),
    ];
    const sorted = sortTransactionsByDateDesc(txs);
    expect(sorted[0].id).toBe("b");
  });
});

// ─── calculatePortfolioSummary ───────────────────────────────────────
describe("calculatePortfolioSummary", () => {
  it("거래 없음: 모든 값 0", () => {
    const s = calculatePortfolioSummary([], 1400);
    expect(s.averageExchangeRate).toBe(0);
    expect(s.currentDollarAmount).toBe(0);
    expect(s.totalInvestedKrw).toBe(0);
  });

  it("buy 1건: 평균단가 = krw / dollar", () => {
    const s = calculatePortfolioSummary([buy("1", "2026.01.01", 100, 140000, 1400)], 1400);
    expect(s.averageExchangeRate).toBeCloseTo(1400);
    expect(s.exchangedDollarAmount).toBeCloseTo(100);
    expect(s.totalInvestedKrw).toBeCloseTo(140000);
    expect(s.currentDollarAmount).toBeCloseTo(100);
  });

  it("buy 2건: 가중평균 단가 계산", () => {
    const txs = [
      buy("1", "2026.01.01", 1000, 1400000, 1400),
      buy("2", "2026.02.01", 1000, 1450000, 1450),
    ];
    const s = calculatePortfolioSummary(txs, 1425);
    // (1400000 + 1450000) / (1000 + 1000) = 1425
    expect(s.averageExchangeRate).toBeCloseTo(1425);
    expect(s.currentDollarAmount).toBeCloseTo(2000);
  });

  it("sell 후 평균단가 유지", () => {
    const txs = [
      buy("1", "2026.01.01", 2000, 2850000, 1425),
      sell("2", "2026.02.01", 500, 712500, 1425),
    ];
    const s = calculatePortfolioSummary(txs, 1425);
    expect(s.averageExchangeRate).toBeCloseTo(1425);
    expect(s.currentDollarAmount).toBeCloseTo(1500);
    expect(s.exchangedDollarAmount).toBeCloseTo(1500);
    expect(s.totalInvestedKrw).toBeCloseTo(2137500);
  });

  it("sell 후 보유 달러가 0 이하로 내려가지 않음", () => {
    const txs = [
      buy("1", "2026.01.01", 100, 140000, 1400),
      sell("2", "2026.02.01", 200, 280000, 1400), // 보유보다 많이 sell
    ];
    const s = calculatePortfolioSummary(txs, 1400);
    expect(s.currentDollarAmount).toBeGreaterThanOrEqual(0);
    expect(s.totalInvestedKrw).toBeGreaterThanOrEqual(0);
  });

  it("buy 없이 sell만 있을 때: 평균단가 0, 손익 0", () => {
    const txs = [sell("1", "2026.01.01", 100, 140000, 1400)];
    const s = calculatePortfolioSummary(txs, 1400);
    expect(s.averageExchangeRate).toBe(0);
  });

  it("rateDiffFromAverage: 현재환율 - 평균단가", () => {
    const txs = [buy("1", "2026.01.01", 1000, 1400000, 1400)];
    const s = calculatePortfolioSummary(txs, 1500);
    expect(s.rateDiffFromAverage).toBeCloseTo(100);
  });

  it("rateDiffFromAverage 음수: 현재환율 < 평균단가", () => {
    const txs = [buy("1", "2026.01.01", 1000, 1400000, 1400)];
    const s = calculatePortfolioSummary(txs, 1300);
    expect(s.rateDiffFromAverage).toBeCloseTo(-100);
  });
});

// ─── buildTransactionBalanceMap ──────────────────────────────────────
describe("buildTransactionBalanceMap", () => {
  it("buy 후 잔액 누적", () => {
    const txs = [
      buy("1", "2026.01.01", 100, 140000, 1400),
      buy("2", "2026.02.01", 200, 290000, 1450),
    ];
    const map = buildTransactionBalanceMap(txs);
    expect(map.get("1")).toBeCloseTo(100);
    expect(map.get("2")).toBeCloseTo(300);
  });

  it("sell 후 잔액 차감", () => {
    const txs = [
      buy("1", "2026.01.01", 300, 420000, 1400),
      sell("2", "2026.02.01", 100, 140000, 1400),
    ];
    const map = buildTransactionBalanceMap(txs);
    expect(map.get("1")).toBeCloseTo(300);
    expect(map.get("2")).toBeCloseTo(200);
  });
});

// ─── getRecentTransactions ───────────────────────────────────────────
describe("getRecentTransactions", () => {
  it("최신 순 4건 반환", () => {
    const txs = [
      buy("1", "2026.01.01", 100, 140000, 1400),
      buy("2", "2026.02.01", 100, 142000, 1420),
      buy("3", "2026.03.01", 100, 143000, 1430),
      buy("4", "2026.04.01", 100, 144000, 1440),
      buy("5", "2026.05.01", 100, 145000, 1450),
    ];
    const recent = getRecentTransactions(txs, 4);
    expect(recent).toHaveLength(4);
    expect(recent[0].id).toBe("5");
    expect(recent[3].id).toBe("2");
  });

  it("거래 없으면 빈 배열", () => {
    expect(getRecentTransactions([])).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import {
  calculatePortfolioSummary,
  buildTransactionBalanceMap,
  getRecentTransactions,
  sortTransactionsByDateDesc,
  getSignedChangeAmount,
} from "./calculator";
import type { DollarTransaction } from "../types";

// ─── 픽스처 헬퍼 ────────────────────────────────────────────────────
function buy(id: string, date: string, dollar: number, krw: number, rate: number): DollarTransaction {
  return { id, type: "buy", title: "달러로 환전", date, dollarAmount: dollar, krwAmount: krw, exchangeRate: rate };
}
function sell(id: string, date: string, dollar: number, krw: number, rate: number): DollarTransaction {
  return { id, type: "sell", title: "원화로 환전", date, dollarAmount: dollar, krwAmount: krw, exchangeRate: rate };
}
function changePlus(id: string, date: string, dollar: number): DollarTransaction {
  return { id, type: "change", title: "배당금", date, dollarAmount: dollar, direction: "plus", memo: "배당금" };
}
function changeMinus(id: string, date: string, dollar: number): DollarTransaction {
  return { id, type: "change", title: "매도손실", date, dollarAmount: dollar, direction: "minus", memo: "매도손실" };
}

// ─── getSignedChangeAmount ───────────────────────────────────────────
describe("getSignedChangeAmount", () => {
  it("plus: 양수 반환", () => {
    expect(getSignedChangeAmount(changePlus("1", "2026.01.01", 5))).toBe(5);
  });
  it("minus: 음수 반환", () => {
    expect(getSignedChangeAmount(changeMinus("1", "2026.01.01", 5))).toBe(-5);
  });
  it("dollarAmount가 음수로 저장되어도 방향은 direction 기준", () => {
    const tx: DollarTransaction = { id: "1", type: "change", title: "테스트", date: "2026.01.01", dollarAmount: -5, direction: "plus" };
    expect(getSignedChangeAmount(tx)).toBe(5);
  });
});

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
    expect(s.profitKrw).toBe(0);
    expect(s.profitRate).toBe(0);
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

  it("sell 이익: 현재 환율 > 평균단가", () => {
    const txs = [buy("1", "2026.01.01", 1000, 1400000, 1400)];
    const s = calculatePortfolioSummary(txs, 1500);
    expect(s.profitKrw).toBeCloseTo(100000); // (1500 - 1400) * 1000
    expect(s.profitRate).toBeCloseTo(7.142857, 2);
  });

  it("sell 손실: 현재 환율 < 평균단가", () => {
    const txs = [buy("1", "2026.01.01", 1000, 1400000, 1400)];
    const s = calculatePortfolioSummary(txs, 1300);
    expect(s.profitKrw).toBeCloseTo(-100000);
    expect(s.profitRate).toBeCloseTo(-7.142857, 2);
  });

  it("change plus: 보유 달러 증가, 평균단가 변동 없음", () => {
    const txs = [
      buy("1", "2026.01.01", 1000, 1400000, 1400),
      changePlus("2", "2026.02.01", 100),
    ];
    const s = calculatePortfolioSummary(txs, 1400);
    expect(s.currentDollarAmount).toBeCloseTo(1100);
    expect(s.averageExchangeRate).toBeCloseTo(1400);
    expect(s.totalInvestedKrw).toBeCloseTo(1400000); // 변동 없음
  });

  it("change minus: 보유 달러 감소, 평균단가 변동 없음", () => {
    const txs = [
      buy("1", "2026.01.01", 1000, 1400000, 1400),
      changeMinus("2", "2026.02.01", 100),
    ];
    const s = calculatePortfolioSummary(txs, 1400);
    expect(s.currentDollarAmount).toBeCloseTo(900);
    expect(s.averageExchangeRate).toBeCloseTo(1400);
    expect(s.totalInvestedKrw).toBeCloseTo(1400000);
  });

  it("배당금으로 늘어난 달러도 손익에 반영", () => {
    const txs = [
      buy("1", "2026.01.01", 1000, 1400000, 1400),
      changePlus("2", "2026.02.01", 100), // +$100 배당금
    ];
    const s = calculatePortfolioSummary(txs, 1500);
    // 현재 원화 환산액 = 1100 * 1500 = 1,650,000
    // 손익 = 1,650,000 - 1,400,000 = 250,000
    expect(s.currentValueKrw).toBeCloseTo(1650000);
    expect(s.profitKrw).toBeCloseTo(250000);
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

  it("change plus/minus 반영", () => {
    const txs = [
      buy("1", "2026.01.01", 100, 140000, 1400),
      changePlus("2", "2026.02.01", 50),
      changeMinus("3", "2026.03.01", 30),
    ];
    const map = buildTransactionBalanceMap(txs);
    expect(map.get("1")).toBeCloseTo(100);
    expect(map.get("2")).toBeCloseTo(150);
    expect(map.get("3")).toBeCloseTo(120);
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

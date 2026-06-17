// 개발/테스트용 더미 데이터
// 실제 Storage 연동 후 이 파일은 참조하지 않음

import type { DollarTransaction, DollarPortfolioStorageV1 } from "../types";

export const mockCurrentExchangeRate = 1503;

export const mockTransactions: DollarTransaction[] = [
  {
    id: "tx-4",
    type: "sell",
    title: "원화로 환전",
    date: "2026.06.16",
    exchangeRate: 1503,
    dollarAmount: 200,
    krwAmount: 300600,
    profitKrw: 8600,
  },
  {
    id: "tx-3",
    type: "change",
    title: "판매수익",
    date: "2026.06.12",
    dollarAmount: 1100,
    direction: "plus",
    memo: "매도차익",
  },
  {
    id: "tx-2",
    type: "change",
    title: "판매수익",
    date: "2026.06.05",
    dollarAmount: 600,
    direction: "minus",
    memo: "매도손실",
  },
  {
    id: "tx-1",
    type: "buy",
    title: "달러로 환전",
    date: "2026.06.03",
    exchangeRate: 1460,
    dollarAmount: 1800,
    krwAmount: 2628000,
  },
];

export const mockStorage: DollarPortfolioStorageV1 = {
  version: 1,
  transactions: mockTransactions,
  updatedAt: "2026-06-16T00:00:00.000Z",
};

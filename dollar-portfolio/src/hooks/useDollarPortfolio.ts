import { useMemo } from "react";

export type TransactionType = "buy" | "sell" | "dividend";

export type DollarTransaction = {
  id: string;
  type: TransactionType;
  title: string;
  date: string;
  exchangeRate?: number;
  dollarAmount: number;
  krwAmount?: number;
};

export type DollarPortfolioStorageV1 = {
  version: 1;
  currentExchangeRate: number;
  transactions: DollarTransaction[];
  updatedAt: string;
};

export type DollarPortfolioSummary = {
  averageExchangeRate: number;
  currentExchangeRate: number;
  rateDiffFromAverage: number;
  exchangedDollarAmount: number;
  currentDollarAmount: number;
  totalInvestedKrw: number;
  currentValueKrw: number;
  profitKrw: number;
  profitRate: number;
};

export type DollarPortfolioState = {
  storage: DollarPortfolioStorageV1;
  summary: DollarPortfolioSummary;
  recentTransactions: DollarTransaction[];
};

const defaultTransactions: DollarTransaction[] = [
  {
    id: "tx-4",
    type: "sell",
    title: "원화로 환전",
    date: "2026.06.16",
    exchangeRate: 1503,
    dollarAmount: 200,
    krwAmount: 300600,
  },
  {
    id: "tx-3",
    type: "dividend",
    title: "매매차익",
    date: "2026.06.12",
    dollarAmount: 1100,
    krwAmount: 2500,
  },
  {
    id: "tx-2",
    type: "dividend",
    title: "매매차익",
    date: "2026.06.05",
    dollarAmount: -600,
    krwAmount: 1900,
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

const defaultCurrentExchangeRate = 1503;

const defaultStorage: DollarPortfolioStorageV1 = {
  version: 1,
  currentExchangeRate: defaultCurrentExchangeRate,
  transactions: defaultTransactions,
  updatedAt: "2026-06-16T00:00:00.000Z",
};

function toComparableTimestamp(date: string) {
  const normalized = date.includes(".") ? date.replaceAll(".", "-") : date;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortTransactionsByDateDesc(transactions: DollarTransaction[]) {
  return [...transactions].sort((left, right) => {
    const delta = toComparableTimestamp(right.date) - toComparableTimestamp(left.date);
    if (delta !== 0) {
      return delta;
    }

    return right.id.localeCompare(left.id);
  });
}

function getTransactionDollarAmount(transaction: DollarTransaction) {
  if (transaction.type === "dividend") {
    return transaction.dollarAmount;
  }

  return Math.abs(transaction.dollarAmount);
}

function getTransactionKrwAmount(
  transaction: DollarTransaction,
  exchangeRate: number,
) {
  if (typeof transaction.krwAmount === "number") {
    return Math.abs(transaction.krwAmount);
  }

  const rate = transaction.exchangeRate ?? exchangeRate;
  return Math.abs(getTransactionDollarAmount(transaction) * rate);
}

export function calculatePortfolioSummary(
  transactions: DollarTransaction[],
  exchangeRate: number,
): DollarPortfolioSummary {
  let exchangedDollarAmount = 0;
  let totalInvestedKrw = 0;
  let currentDollarAmount = 0;

  for (const transaction of sortTransactionsByDateDesc(transactions).reverse()) {
    const dollarAmount = getTransactionDollarAmount(transaction);
    const krwAmount = getTransactionKrwAmount(transaction, exchangeRate);

    if (transaction.type === "buy") {
      exchangedDollarAmount += dollarAmount;
      totalInvestedKrw += krwAmount;
      currentDollarAmount += dollarAmount;
      continue;
    }

    if (transaction.type === "sell") {
      const averageExchangeRate =
        exchangedDollarAmount > 0 ? totalInvestedKrw / exchangedDollarAmount : 0;
      const investedKrwForSoldDollar = averageExchangeRate * dollarAmount;

      exchangedDollarAmount = Math.max(0, exchangedDollarAmount - dollarAmount);
      totalInvestedKrw = Math.max(0, totalInvestedKrw - investedKrwForSoldDollar);
      currentDollarAmount = Math.max(0, currentDollarAmount - dollarAmount);
      continue;
    }

    currentDollarAmount += dollarAmount;
  }

  const averageExchangeRate =
    exchangedDollarAmount > 0 ? totalInvestedKrw / exchangedDollarAmount : 0;
  const currentValueKrw = currentDollarAmount * exchangeRate;
  const profitKrw = currentValueKrw - totalInvestedKrw;
  const profitRate =
    totalInvestedKrw > 0 ? (profitKrw / totalInvestedKrw) * 100 : 0;

  return {
    averageExchangeRate,
    currentExchangeRate: exchangeRate,
    rateDiffFromAverage: exchangeRate - averageExchangeRate,
    exchangedDollarAmount,
    currentDollarAmount,
    totalInvestedKrw,
    currentValueKrw,
    profitKrw,
    profitRate,
  };
}

export function buildTransactionBalanceMap(
  transactions: DollarTransaction[],
): Map<string, number> {
  const sorted = sortTransactionsByDateDesc(transactions).reverse();
  const map = new Map<string, number>();
  let balance = 0;
  for (const tx of sorted) {
    if (tx.type === "buy") balance += Math.abs(tx.dollarAmount);
    else if (tx.type === "sell") balance -= Math.abs(tx.dollarAmount);
    else balance += tx.dollarAmount;
    map.set(tx.id, balance);
  }
  return map;
}

export function getRecentTransactions(
  transactions: DollarTransaction[],
  limit = 4,
) {
  return sortTransactionsByDateDesc(transactions).slice(0, limit);
}

export function useDollarPortfolio(
  storage: DollarPortfolioStorageV1 = defaultStorage,
): DollarPortfolioState {
  const summary = useMemo(
    () =>
      calculatePortfolioSummary(
        storage.transactions,
        storage.currentExchangeRate,
      ),
    [storage.currentExchangeRate, storage.transactions],
  );

  const recentTransactions = useMemo(
    () => getRecentTransactions(storage.transactions, 4),
    [storage.transactions],
  );

  return {
    storage,
    summary,
    recentTransactions,
  };
}

import type { DollarPortfolioSummary, DollarTransaction } from "../types";

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

    // sell
    const averageExchangeRate =
      exchangedDollarAmount > 0 ? totalInvestedKrw / exchangedDollarAmount : 0;
    const investedKrwForSoldDollar = averageExchangeRate * dollarAmount;

    exchangedDollarAmount = Math.max(0, exchangedDollarAmount - dollarAmount);
    totalInvestedKrw = Math.max(0, totalInvestedKrw - investedKrwForSoldDollar);
    currentDollarAmount = Math.max(0, currentDollarAmount - dollarAmount);
  }

  const averageExchangeRate =
    exchangedDollarAmount > 0 ? totalInvestedKrw / exchangedDollarAmount : 0;

  return {
    averageExchangeRate,
    currentExchangeRate: exchangeRate,
    rateDiffFromAverage: exchangeRate - averageExchangeRate,
    exchangedDollarAmount,
    currentDollarAmount,
    totalInvestedKrw,
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
    else balance -= Math.abs(tx.dollarAmount);
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

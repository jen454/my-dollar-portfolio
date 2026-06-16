import { useEffect, useMemo } from "react";
import { useRecordStore } from "../store/recordStore";
import { calculatePortfolioSummary, getRecentTransactions } from "../utils/calculator";
import type { DollarPortfolioState, DollarPortfolioStorageV1 } from "../types";

const emptyStorage: DollarPortfolioStorageV1 = {
  version: 1,
  transactions: [],
  updatedAt: new Date(0).toISOString(),
};

export function useDollarPortfolio(): DollarPortfolioState {
  const storage = useRecordStore((state) => state.storage);
  const isLoaded = useRecordStore((state) => state.isLoaded);
  const currentExchangeRate = useRecordStore((state) => state.currentExchangeRate);
  const loadFromStorage = useRecordStore((state) => state.loadFromStorage);

  useEffect(() => {
    if (!isLoaded) {
      loadFromStorage();
    }
  }, [isLoaded, loadFromStorage]);

  const resolvedStorage = storage ?? emptyStorage;

  const summary = useMemo(
    () => calculatePortfolioSummary(resolvedStorage.transactions, currentExchangeRate),
    [resolvedStorage.transactions, currentExchangeRate],
  );

  const recentTransactions = useMemo(
    () => getRecentTransactions(resolvedStorage.transactions, 4),
    [resolvedStorage.transactions],
  );

  return {
    storage: resolvedStorage,
    summary,
    recentTransactions,
  };
}

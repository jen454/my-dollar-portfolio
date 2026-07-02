import { create } from "zustand";
import { portfolioStorage } from "../utils/storage";
import { mockCurrentExchangeRate, mockStorage } from "../mocks/transactions";
import type { DollarTransaction, DollarPortfolioStorageV1 } from "../types";

function createId() {
  return crypto.randomUUID();
}

function createEmptyStorage(): DollarPortfolioStorageV1 {
  return {
    version: 1,
    transactions: [],
    updatedAt: new Date().toISOString(),
  };
}

interface RecordStore {
  storage: DollarPortfolioStorageV1 | null;
  isLoaded: boolean;
  currentExchangeRate: number;
  rateBaseDate: string | null;
  rateError: string | null;
  saveError: string | null;

  loadFromStorage: () => Promise<void>;
  setExchangeRate: (rate: number) => void;
  setRateBaseDate: (date: string) => void;
  setRateError: (error: string | null) => void;
  clearSaveError: () => void;
  addTransaction: (tx: Omit<DollarTransaction, "id" | "createdAt">) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<DollarTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

async function persist(storage: DollarPortfolioStorageV1) {
  const next: DollarPortfolioStorageV1 = {
    ...storage,
    updatedAt: new Date().toISOString(),
  };
  await portfolioStorage.set(next);
  return next;
}

export const useRecordStore = create<RecordStore>((set, get) => ({
  storage: null,
  isLoaded: false,
  currentExchangeRate: mockCurrentExchangeRate,
  rateBaseDate: null,
  rateError: null,
  saveError: null,

  loadFromStorage: async () => {
    const saved = await portfolioStorage.get();
    if (saved) {
      // 과거 change 유형으로 저장된 기록은 더 이상 지원하지 않으므로 제거한다.
      const transactions = saved.transactions.filter(
        (tx): tx is DollarTransaction => tx.type === "buy" || tx.type === "sell",
      );
      set({ storage: { ...saved, transactions }, isLoaded: true });
      return;
    }

    // Storage에 데이터가 없으면 개발 환경에서만 mock 데이터를 사용한다.
    const initial = import.meta.env.DEV ? mockStorage : createEmptyStorage();
    set({ storage: initial, isLoaded: true });
  },

  setExchangeRate: (rate) => {
    set({ currentExchangeRate: rate });
  },

  setRateBaseDate: (date) => {
    set({ rateBaseDate: date });
  },

  setRateError: (error) => {
    set({ rateError: error });
  },

  clearSaveError: () => {
    set({ saveError: null });
  },

  addTransaction: async (tx) => {
    const current = get().storage ?? createEmptyStorage();
    const newTransaction: DollarTransaction = {
      ...tx,
      id: createId(),
      createdAt: Date.now(),
    };
    try {
      const next = await persist({
        ...current,
        transactions: [...current.transactions, newTransaction],
      });
      set({ storage: next, saveError: null });
    } catch (err) {
      set({ saveError: err instanceof Error ? err.message : "저장에 실패했어요." });
    }
  },

  updateTransaction: async (id, tx) => {
    const current = get().storage;
    if (!current) return;
    try {
      const next = await persist({
        ...current,
        transactions: current.transactions.map((transaction) =>
          transaction.id === id ? { ...transaction, ...tx } : transaction,
        ),
      });
      set({ storage: next, saveError: null });
    } catch (err) {
      set({ saveError: err instanceof Error ? err.message : "저장에 실패했어요." });
    }
  },

  deleteTransaction: async (id) => {
    const current = get().storage;
    if (!current) return;
    try {
      const next = await persist({
        ...current,
        transactions: current.transactions.filter((transaction) => transaction.id !== id),
      });
      set({ storage: next, saveError: null });
    } catch (err) {
      set({ saveError: err instanceof Error ? err.message : "저장에 실패했어요." });
    }
  },
}));

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

  loadFromStorage: () => Promise<void>;
  setExchangeRate: (rate: number) => void;
  setRateBaseDate: (date: string) => void;
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

  loadFromStorage: async () => {
    const saved = await portfolioStorage.get();
    if (saved) {
      set({ storage: saved, isLoaded: true });
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

  addTransaction: async (tx) => {
    const current = get().storage ?? createEmptyStorage();
    const newTransaction: DollarTransaction = {
      ...tx,
      id: createId(),
      createdAt: Date.now(),
    };

    const next = await persist({
      ...current,
      transactions: [...current.transactions, newTransaction],
    });
    set({ storage: next });
  },

  updateTransaction: async (id, tx) => {
    const current = get().storage;
    if (!current) return;

    const next = await persist({
      ...current,
      transactions: current.transactions.map((transaction) =>
        transaction.id === id ? { ...transaction, ...tx } : transaction,
      ),
    });
    set({ storage: next });
  },

  deleteTransaction: async (id) => {
    const current = get().storage;
    if (!current) return;

    const next = await persist({
      ...current,
      transactions: current.transactions.filter((transaction) => transaction.id !== id),
    });
    set({ storage: next });
  },
}));

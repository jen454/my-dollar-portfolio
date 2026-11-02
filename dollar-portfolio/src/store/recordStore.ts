import { create } from "zustand";
import { portfolioStorage } from "../utils/storage";
import { migrateOriginStorage } from "../utils/originMigration";
import { mockStorage } from "../mocks/transactions";
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
  loadError: string | null;
  currentExchangeRate: number; // 0이면 아직 실제 환율을 받은 적이 없음
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
  loadError: null,
  currentExchangeRate: 0,
  rateBaseDate: null,
  rateError: null,
  saveError: null,

  loadFromStorage: async () => {
    set({ loadError: null });
    try {
      await migrateOriginStorage();
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
    } catch (err) {
      // storage를 비워 둔 채 두어야 저장이 막혀 기존 기록을 덮어쓰지 않는다.
      set({ loadError: err instanceof Error ? err.message : "기록을 불러오지 못했어요." });
    }
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
    const current = get().storage;
    if (!current) {
      // 로드 전에 저장하면 기존 기록을 덮어쓰게 되므로 막는다.
      set({ saveError: "기록을 아직 불러오지 못했어요. 잠시 후 다시 시도해주세요." });
      return;
    }
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

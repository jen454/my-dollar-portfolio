// 거래 유형
export type TransactionType = "buy" | "sell";

// 거래 내역
export type DollarTransaction = {
  id: string;
  type: TransactionType;
  title: string;
  date: string; // 'YYYY.MM.DD' 형식
  exchangeRate?: number; // 적용 환율
  dollarAmount: number; // 달러 금액
  krwAmount?: number; // 원화 금액
  profitKrw?: number; // sell 시 환전 손익 (저장 시점 평균단가 기준)
  createdAt?: number; // timestamp
};

// Storage 구조
export type DollarPortfolioStorageV1 = {
  version: 1;
  transactions: DollarTransaction[];
  updatedAt: string;
};

// 포트폴리오 계산 결과
export type DollarPortfolioSummary = {
  averageExchangeRate: number; // 평균 환전단가
  currentExchangeRate: number; // 현재 환율
  rateDiffFromAverage: number; // 현재환율 - 평균단가
  exchangedDollarAmount: number; // 환전 달러 (buy 기준)
  currentDollarAmount: number; // 현재 보유 달러 (sell 입력 시 잔액 검증용)
  totalInvestedKrw: number; // 총 투입 원화
};

// 포트폴리오 전체 상태
export type DollarPortfolioState = {
  storage: DollarPortfolioStorageV1;
  summary: DollarPortfolioSummary;
  recentTransactions: DollarTransaction[];
};

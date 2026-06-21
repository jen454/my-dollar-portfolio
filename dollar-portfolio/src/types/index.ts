// 거래 유형
export type TransactionType = "buy" | "sell" | "change";

// 달러 변동 방향 (change 유형에서만 사용)
export type ChangeDirection = "plus" | "minus";

// 달러 변동 구분 메모 (change 유형에서만 사용)
export type ChangeMemo = "매도차익" | "배당금" | "계좌이자" | "수수료" | "기타";

// 거래 내역
export type DollarTransaction = {
  id: string;
  type: TransactionType;
  title: string;
  date: string; // 'YYYY.MM.DD' 형식
  exchangeRate?: number; // 적용 환율 (buy/sell만)
  dollarAmount: number; // 달러 금액 (change는 부호 포함)
  krwAmount?: number; // 원화 금액 (buy/sell만)
  direction?: ChangeDirection; // change 유형만
  memo?: ChangeMemo; // change 유형만
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
  currentDollarAmount: number; // 현재 보유 달러
  totalInvestedKrw: number; // 총 투입 원화
  currentValueKrw: number; // 현재 원화 환산액
  profitKrw: number; // 손익 금액
  profitRate: number; // 손익률 %
};

// 포트폴리오 전체 상태
export type DollarPortfolioState = {
  storage: DollarPortfolioStorageV1;
  summary: DollarPortfolioSummary;
  recentTransactions: DollarTransaction[];
};

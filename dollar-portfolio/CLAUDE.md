# 나의 달러 포트폴리오 — 프로젝트 컨텍스트

## 앱 개요

토스 미니앱 (WebView 방식).
토스증권 달러 예수금의 평균 환전단가와 투입 원화 대비 손익을 계산해주는 계산기 도구.
투자 조언 없음, 순수 계산기.

## 기술 스택

- React + Vite + TypeScript
- Zustand (상태관리)
- @apps-in-toss/web-framework (토스 SDK)
- TDS (Toss Design System) — 토스 미니앱 필수
- SDK Storage (영구 저장) + localStorage 폴백

## 프로젝트 구조

src/
├── pages/
│ ├── Home/ # 홈 대시보드 (완료)
│ ├── Records/ # 캘린더 전체보기 (완료)
│ └── AddRecord/ # 거래 기록 입력 (미구현)
├── components/ # 공통 컴포넌트
├── store/
│ └── recordStore.ts # Zustand 전역 상태 (완료)
├── hooks/
│ └── useExchangeRate.ts # 환율 API (미구현)
├── utils/
│ ├── calculator.ts # 순수 계산 함수 (완료)
│ ├── storage.ts # Storage 어댑터 (완료)
│ └── formatter.ts # 숫자/날짜 포맷 (미구현)
├── mocks/
│ └── transactions.ts # 개발용 더미 데이터 (완료)
└── types/
└── index.ts # 타입 정의 (완료)

## 구현 현황

- [x] 타입 정의 (types/index.ts)
- [x] 더미 데이터 분리 (mocks/transactions.ts)
- [x] 계산 로직 (utils/calculator.ts)
- [x] Storage 어댑터 (utils/storage.ts)
- [x] Zustand store (store/recordStore.ts)
- [x] 홈 대시보드 (pages/Home)
- [x] 캘린더 전체보기 (pages/Records)
- [x] 숫자 포맷 유틸 (utils/formatter.ts)
- [ ] 환율 API 훅 (hooks/useExchangeRate.ts)
- [x] 거래 입력 화면 (pages/AddRecord)
- [x] 스와이프 수정/삭제
- [ ] 빈 상태 / 로딩 상태 처리

## 핵심 타입

```typescript
type TransactionType = "buy" | "sell" | "change";
type ChangeDirection = "plus" | "minus";
type ChangeMemo = "매도차익" | "매도손실" | "배당금" | "이자" | "기타";

interface DollarTransaction {
  id: string;
  type: TransactionType;
  title: string;
  date: string; // 'YYYY.MM.DD'
  exchangeRate?: number; // buy/sell만
  dollarAmount: number; // change는 항상 양수, direction으로 부호 결정
  krwAmount?: number; // buy/sell만
  direction?: ChangeDirection; // change만
  memo?: ChangeMemo; // change만
  createdAt?: number;
}

interface DollarPortfolioStorageV1 {
  version: 1;
  transactions: DollarTransaction[];
  updatedAt: string;
}
```

## 핵심 비즈니스 로직

### 평균 환전단가

- 가중평균: 총 투입 원화 ÷ 총 환전 달러
- buy 기록만 계산에 포함
- change는 평균단가/투입 원화 변동 없음
- sell 시 평균단가 유지, 투입 원화/환전 달러 비례 차감

### 거래 유형별 처리

- buy: 투입 원화 증가, 환전 달러 증가, 보유 달러 증가
- sell: 평균단가 기준 투입 원화 비례 차감, 보유 달러 감소
- change plus: 보유 달러 증가만 (투입 원화/평균단가 변동 없음)
- change minus: 보유 달러 감소만 (투입 원화/평균단가 변동 없음)

### 손익 계산

- 현재 원화 환산액 = 현재 보유 달러 × 현재 환율
- 손익 = 현재 원화 환산액 - 총 투입 원화

### sell 달러 차감 우선순위

- 환전 달러(exchangedDollarAmount)에서 먼저 차감
- 환전 달러 소진 후 change로 생긴 달러에서 차감

## Storage 전략

- SDK Storage(@apps-in-toss/web-framework) 우선 시도
- 실패 시 localStorage 폴백
- 앱 시작 시 한 번만 로드 → 메모리(Zustand)에서 관리
- 변경 시에만 Storage에 저장

## 환율 API

- 한국수출입은행 OpenAPI
- URL: https://www.koreaexim.go.kr/site/program/financial/exchangeJSON
- 파라미터: authkey(VITE_EXCHANGE_RATE_API_KEY), data=AP01, cur_code=USD
- 필드: deal_bas_r (매매기준율)
- 1시간 캐시, 실패 시 마지막 저장 환율 사용

## 디자인 원칙

- 토스 TDS 컴포넌트 우선 사용
- 하단 고정 면책 고지: "한국수출입은행 기준환율 기반 단순 계산입니다. 투자 조언을 제공하지 않습니다."
- 거래 유형 색상: buy=파란계열, sell=빨간계열, change=초록계열

## 숫자 포맷 규칙

- 원화: ₩1,425,000
- 달러: $2,500
- 환율: ₩1,425
- 손익률: +21.1% / -3.2%
- 손익 금액: +₩600,000 / -₩22,500

## 정책/제약

- 투자 조언 없음, 수치 계산만 표시
- 외부 링크 금지 (토스 미니앱 정책)
- 금융 상품 추천 금지
- change 타입 dollarAmount는 항상 양수로 저장

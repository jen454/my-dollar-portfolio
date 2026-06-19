# Home Dashboard

## Context

홈 대시보드는 사용자가 현재 보유 달러의 상태를 한 화면에서 확인하는 첫 진입점이다. 핵심 목적은 다음 네 가지다.

1. 평균 환전단가를 정확하게 보여준다.
2. 현재 환율과 평균 환전단가의 차이를 즉시 보여준다.
3. 총 보유 달러, 총 투입 원화, 현재 평가금액, 손익을 함께 보여준다.
4. 최근 거래를 빠르게 확인하고 전체 거래 화면으로 진입하게 한다.

이 화면은 투자 조언이나 상품 추천을 제공하지 않는다. 오직 사용자가 직접 입력한 거래와 기준 환율을 바탕으로 계산 결과만 보여준다.

## Requirements & Edge Cases

### 거래 유형 처리

- `buy`:
  - 원화로 달러를 매수한 기록이다.
  - `총 투입 원화`와 `총 환전 달러`에 반영된다.
  - 평균 환전단가 계산의 기준이 된다.
- `sell`:
  - 보유 달러를 원화로 환전한 기록이다.
  - 평균 환전단가는 유지하되, `투입 원화`와 `환전 달러`를 비례 차감한다.
  - 이번 환전에서의 손익은 `평균 환전단가 x 환전 달러`와 실제 환전 원화의 차이로 계산한다.
- `dividend`:
  - 달러 잔고의 증감이나 외부 유입을 나타내는 보정 거래다.
  - 평균 환전단가 계산에는 포함하지 않는다.
  - 총 보유 달러와 현재 평가금액에는 반영한다.

### 계산 규칙

- 평균 환전단가:
  - `총 투입 원화 ÷ 총 환전 달러`
  - `buy` 거래만 가중평균에 사용한다.
  - 달러 변동분(`dividend`)은 평균단가에 반영하지 않는다.
- 현재 손익:
  - `(총 보유 달러 x 현재 환율) - 총 투입 원화`
  - 추가 유입된 달러는 현재 손익에 반영된다.
- 환율 차이:
  - `현재 환율 - 평균 환전단가`
  - 양수면 평균 매입가보다 현재 환율이 높고, 음수면 그 반대다.

### Edge Cases

1. 거래가 하나도 없는 경우
   - 평균 환전단가, 손익률, 환율 차이는 `0` 또는 빈 상태로 안전하게 표시한다.
   - CTA는 유지한다.
2. `buy` 거래가 없고 `dividend`만 있는 경우
   - 평균 환전단가는 계산하지 않는다.
   - 보유 달러가 있어도 기준 매입가가 없으므로 손익 표시는 보수적으로 처리한다.
3. 보유 달러가 `0`보다 작아지는 잘못된 입력이 들어온 경우
   - UI에서는 입력을 막고, 훅에서는 0 미만 결과를 방어한다.
4. `sell` 이후 보유 달러가 소수점이 되는 경우
   - 계산은 정밀하게 유지하되, 화면 표시는 반올림 규칙을 고정한다.
5. 현재 환율이 평균 환전단가와 같은 경우
   - 차이값은 `0`으로 표시하고 상승/하락 화살표를 생략하거나 중립 처리한다.
6. 최근 거래가 4건을 초과하는 경우
   - 홈 대시보드는 최신순 4건까지만 보여준다.

## Data Schema

### Storage

```ts
type DollarPortfolioStorageV1 = {
  version: 1;
  currentExchangeRate: number;
  transactions: DollarTransaction[];
  updatedAt: string;
};
```

### Domain Types

```ts
type TransactionType = "buy" | "sell" | "dividend";

type DollarTransaction = {
  id: string;
  type: TransactionType;
  title: string;
  date: string;
  exchangeRate?: number;
  dollarAmount: number;
  krwAmount?: number;
};

type DollarPortfolioSummary = {
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

type DollarPortfolioState = {
  storage: DollarPortfolioStorageV1;
  summary: DollarPortfolioSummary;
  recentTransactions: DollarTransaction[];
};
```

### State Rules

- `transactions`는 불변 배열로 다룬다.
- 화면에서 필요한 요약값은 모두 파생 상태로 계산한다.
- 원본 거래와 파생 요약을 분리해 localStorage 동기화 시 타입 손상을 막는다.
- 저장 시점은 거래 추가/수정/삭제 또는 기준 환율 갱신 시점으로 제한한다.
- 기본 저장소는 Toss App Bridge SDK의 키-밸류 저장소를 사용한다.
- 로컬 개발이나 브리지 비활성 환경에서는 동일 스키마를 유지한 채 대체 저장소를 주입할 수 있게 설계한다.

## Implementation Plan

1. `src/hooks/useDollarPortfolio.ts`에서 샘플 거래와 기준 환율을 읽고, 요약 계산을 순수 함수로 분리한다.
2. 평균 환전단가, 총 보유 달러, 총 투입 원화, 현재 평가금액, 손익을 계산하는 로직을 고정한다.
3. `src/pages/HomeDashboardPage.tsx`에서 TDS 컴포넌트를 사용해 요약 카드, 최근 거래, 고정 CTA를 구성한다.
4. 페이지 레이아웃은 Tailwind 유틸리티로 직접 작성하고, 전역 CSS는 `body`와 `#root` 같은 shell 영역만 유지한다.
5. Toss SDK 저장소 연동을 붙일 때는 hydrate-safe 초기값, 버전 마이그레이션, 빈 상태 처리를 추가한다.

## Performance & Metrics

> 이 섹션은 구현 검증 후 채운다.

- 계산 정합성:
- Toss SDK 동기화:
- 예외 처리:
- 화면 렌더 안정성:

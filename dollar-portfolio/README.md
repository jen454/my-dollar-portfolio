# 나의 달러 포트폴리오

> 토스증권이 알려주지 않는 **평균 환전단가**와 **달러 자산 손익**을 계산해주는 토스 미니앱

---

## 개요

토스증권을 포함한 모든 증권사는 달러 평균 환전단가와 투입 원화 대비 손익을 제공하지 않습니다. 사용자는 거래내역을 직접 엑셀에 복사해 계산해야 합니다.

이 앱은 환전 기록만 입력하면 평균 환전단가와 손익을 자동으로 계산해줍니다. 순수 계산 도구이며 투자 조언은 제공하지 않습니다.

---

## 기술 스택

| 항목 | 사용 기술 |
|---|---|
| 프레임워크 | React 18 + Vite + TypeScript |
| 상태관리 | Zustand |
| UI | TDS Mobile (`@toss/tds-mobile`, `@toss/tds-colors`) |
| 미니앱 SDK | `@apps-in-toss/web-framework` |
| 저장소 | SDK Storage (영구) + localStorage (폴백) |
| 환율 API | 한국수출입은행 OpenAPI |

---

## 프로젝트 구조

```
src/
├── pages/
│   ├── HomeDashboardPage.tsx     # 홈 대시보드
│   ├── TransactionListPage.tsx   # 거래 기록 전체보기 (캘린더)
│   └── AddRecordPage.tsx         # 거래 기록 입력
├── components/
│   ├── TransactionRow.tsx        # 홈용 거래 행
│   ├── TransactionListRow.tsx    # 전체보기용 거래 행
│   ├── SwipeableItem/            # 스와이프 수정/삭제
│   ├── Calendar.tsx              # 월별 캘린더
│   └── PageSpinner.tsx           # 로딩 스피너
├── store/
│   └── recordStore.ts            # Zustand 전역 상태
├── hooks/
│   ├── useDollarPortfolio.ts     # 포트폴리오 계산 훅
│   └── useExchangeRate.ts        # 환율 API 훅
├── utils/
│   ├── calculator.ts             # 순수 계산 함수
│   ├── storage.ts                # Storage 어댑터
│   └── formatter.ts              # 숫자/날짜 포맷
├── mocks/
│   └── transactions.ts           # 개발용 더미 데이터
└── types/
    └── index.ts                  # 타입 정의
```

---

## 핵심 계산 로직

### 평균 환전단가

```
평균 환전단가 = 총 투입 원화 ÷ 총 환전 달러
```

- **원화→달러 환전(buy)만** 계산에 포함 (가중평균)
- 배당금·매도차익 등 달러 변동(change)은 포함하지 않음
- 별도 가중치 배열 없이 `totalInvestedKrw`와 `exchangedDollarAmount` 두 누적값으로 계산

```
예) $1,000 @ ₩1,400 + $1,000 @ ₩1,450
    평균 환전단가 = ₩2,850,000 ÷ $2,000 = ₩1,425
```

### 달러→원화 환전(sell) 시 평균단가 유지

sell 시 평균단가 자체는 바뀌지 않고, 투입 원화와 환전 달러를 비례 차감합니다.

```
차감 투입 원화 = 평균 환전단가 × 환전 달러
차감 환전 달러 = 환전한 달러

예) 환전 전: 투입 원화 ₩2,850,000 / 환전 달러 $2,000
    $500 환전 후: 투입 원화 ₩2,137,500 / 환전 달러 $1,500
    평균 환전단가 = ₩2,137,500 ÷ $1,500 = ₩1,425 (유지)
```

### 이번 환전 손익 (sell 시)

```
이번 환전 손익 = (적용 환율 - 평균 환전단가) × 환전 달러
```

거래 기록에 `profitKrw`로 저장 시점 평균단가를 기준으로 계산해 저장합니다.

### 투입 원화 대비 전체 손익

```
현재 원화 환산액 = 총 보유 달러 × 현재 환율
손익 = 현재 원화 환산액 - 총 투입 원화
손익률 = 손익 ÷ 총 투입 원화 × 100
```

배당금·이자·매도차익으로 늘어난 달러도 현재 보유 달러에 반영되어 손익 계산에 포함됩니다.

### 거래 유형별 처리 요약

| 유형 | 보유 달러 | 투입 원화 | 평균단가 |
|---|---|---|---|
| 원화→달러 (buy) | + | + | 재계산 |
| 달러→원화 (sell) | - | - 비례 차감 | 유지 |
| 달러 변동 (change) | ± | 변동 없음 | 변동 없음 |

---

## 데이터 타입

```typescript
type TransactionType = "buy" | "sell" | "change";
type ChangeDirection = "plus" | "minus";
type ChangeMemo = "매도차익" | "매도손실" | "배당금" | "계좌이자" | "기타";

interface DollarTransaction {
  id: string;
  type: TransactionType;
  title: string;
  date: string;                // 'YYYY.MM.DD'
  exchangeRate?: number;       // buy/sell만
  dollarAmount: number;        // change는 항상 양수, direction으로 부호 결정
  krwAmount?: number;          // buy/sell만
  direction?: ChangeDirection; // change만
  memo?: ChangeMemo;           // change만
  profitKrw?: number;          // sell 시 저장 시점 평균단가 기준 환전 손익
  createdAt?: number;
}
```

---

## 환율 API

한국수출입은행 OpenAPI의 매매기준율(`deal_bas_r`)을 사용합니다.

- 오늘 날짜부터 최대 5일 전까지 순차 조회 (주말·공휴일 대응)
- 1시간 캐시 (localStorage), 캐시에 기준일(`rateBaseDate`) 포함 → 화면에 "YYYY.MM.DD 기준" 표시
- 개발 환경: Vite 프록시로 CORS 우회 (`/api/exchange-rate`)
- 프로덕션: `https://oapi.koreaexim.go.kr` 직접 호출

```env
VITE_EXCHANGE_RATE_API_KEY=your_api_key
```

---

## 저장 전략

SDK Storage(`@apps-in-toss/web-framework`)를 우선 사용하고, 실패 시 localStorage로 폴백합니다.
유저 데이터는 토스 플랫폼 레벨에서 계정 단위로 격리됩니다.

```
앱 시작 → SDK Storage 조회
           ├─ 성공: 메모리(Zustand)에 로드
           └─ 실패: localStorage 조회
               └─ 없으면: 빈 상태로 시작

변경 발생 → Storage 즉시 저장 + Zustand 동기화
```

---

## 화면 구성

### 홈 대시보드
- 평균 환전단가, 현재 환율(기준일 표시), 평균 대비 차이
- 환전 달러 / 현재 보유달러
- 투입 원화 대비 손익 (금액 + %)
- 최근 거래 내역 미리보기

### 거래 기록 전체보기
- 월별 캘린더 (거래 유형별 도트 표시, 상단 고정)
- 거래 유형 필터 (전체 / 달러 환전 / 원화 환전 / 달러 변동)
- 날짜 선택 시 해당일 거래 목록
- 스와이프 → 수정(파란색) / 삭제(빨간색)

### 거래 기록 입력
- 거래 유형 탭 선택
- 날짜 텍스트 입력 (YYYY.MM.DD 자동 마스킹)
- 환전 금액 / 환율 입력 + 실시간 미리보기
- 달러 변동: 방향 토글 + 구분 칩 선택

---

## 주의사항

- 주식 매수 수수료 및 거래 금액 소수점 오차로 인해 실제 계좌 보유달러와 소폭 차이가 있을 수 있습니다.
- 투자 조언을 제공하지 않습니다. 수치 계산만 표시합니다.
- 외부 링크를 포함하지 않습니다 (토스 미니앱 정책).

---

## 로컬 개발

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# VITE_EXCHANGE_RATE_API_KEY 입력

# 개발 서버 실행
npm run dev

# 빌드 및 배포
npm run build
npm run deploy
```

## 유용한 링크

- [앱인토스 콘솔](https://apps-in-toss.toss.im/)
- [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/)

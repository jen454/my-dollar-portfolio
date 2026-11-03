# 달러 평단가 계산기

> 증권사가 알려주지 않는 **달러 평균 환전단가**를 계산해주는 토스 미니앱 (앱인토스 WebView)

---

## 개요

토스증권을 포함한 주요 증권사는 달러 평균 환전단가를 제공하지 않습니다. 여러 번 나눠 환전한 사용자는 거래내역을 엑셀로 옮겨 직접 계산해야 합니다.

이 앱은 환전할 때마다 **낸 원화와 받은 달러** 두 금액만 기록하면 평균 환전단가와, 원화로 되팔 때의 확정 손익을 계산해줍니다. 순수 계산 도구이며 투자 조언은 제공하지 않습니다.

- 보유 자산의 현재 가치는 다루지 않습니다. 토스증권이 이미 실시간으로 보여주기 때문입니다.
- 환율을 직접 입력받지 않고 두 금액으로 역산해, 우대율이 반영된 실제 환율을 그대로 보존합니다.

---

## 기술 스택

| 항목 | 사용 기술 |
|---|---|
| 프레임워크 | React 18 + Vite 6 + TypeScript |
| 상태관리 | Zustand |
| UI | TDS Mobile (`@toss/tds-mobile`) |
| 미니앱 SDK | `@apps-in-toss/web-framework` 3.x |
| 저장소 | SDK Storage + localStorage 이중 저장 |
| 환율 | 한국수출입은행 OpenAPI, Vercel Serverless 프록시 |
| 테스트 | Vitest |

---

## 아키텍처

```
┌──────────── 토스 앱 (WebView) ────────────┐
│ pages      홈 / 거래 내역 / 기록 입력        │
│   ↓                                        │
│ hooks      useDollarPortfolio              │
│            useExchangeRate ──────────────┐ │
│   ↓                                      │ │
│ store      recordStore (Zustand)         │ │
│   ↓                                      │ │
│ utils      calculator (순수 함수)         │ │
│            storage → SDK Storage         │ │
│                    → localStorage        │ │
└──────────────────────────────────────────┼─┘
                                           ↓
                      Vercel  /api/exchange-rate
                                           ↓
                      한국수출입은행 OpenAPI
```

| 층 | 파일 | 역할 |
|---|---|---|
| 화면 | `src/pages/*` | 표시와 입력만 담당 |
| 훅 | `useDollarPortfolio`, `useExchangeRate` | 스토어·계산·환율을 화면에 맞게 조합 |
| 스토어 | `src/store/recordStore.ts` | 거래 목록, 로드/저장 상태, 오류 상태 |
| 계산 | `src/utils/calculator.ts` | 평균단가·잔액 계산 (부수효과 없음) |
| 저장 | `src/utils/storage.ts` | 두 저장소 읽기/쓰기, 최신본 선택 |
| 이전 | `src/utils/originMigration.ts` | SDK 3.x 도메인 변경 시 기존 기록 이전 |
| 프록시 | `api/exchange-rate.js`, `api/_koreaexim.js` | API 키 보관, 수출입은행 API 결함 처리 |

---

## 데이터 구조

```typescript
type TransactionType = "buy" | "sell"; // buy: 원화→달러, sell: 달러→원화

interface DollarTransaction {
  id: string;
  type: TransactionType;
  title: string;
  date: string;          // 'YYYY.MM.DD'
  exchangeRate?: number; // 두 금액으로 역산한 적용 환율
  dollarAmount: number;
  krwAmount?: number;
  profitKrw?: number;    // sell 손익, 저장 시점 평균단가 기준으로 고정
  createdAt?: number;
}

interface DollarPortfolioStorageV1 {
  version: 1;
  transactions: DollarTransaction[];
  updatedAt: string;     // 두 저장소 중 최신본을 고르는 기준
}
```

기기에 저장되는 값

| 키 | 위치 | 내용 | 수명 |
|---|---|---|---|
| `dollar_portfolio_v1` | SDK Storage + localStorage | 거래 기록 | 영구 |
| `dollar_portfolio_exchange_rate_cache` | localStorage | 마지막 환율과 기준일 | 1시간 (실패 시 계속 표시) |
| `add-record-draft` | localStorage | 작성 중인 입력값 | 2시간, 저장 시 삭제 |
| `dollar_portfolio_origin_migrated` | localStorage | 이전 기록 이전 완료 표시 | 영구 |

---

## 데이터 흐름

### 앱 시작

1. 이전 도메인(SDK 2.x)의 기록을 한 번 옮겨옴 (`Migration.getOriginStorage`)
2. SDK Storage와 localStorage를 모두 읽고 `updatedAt`이 최신인 쪽을 사용
3. 둘 다 비어 있으면 빈 상태, **읽기에 실패하면 오류 화면** (빈 목록으로 기존 기록을 덮어쓰지 않도록)

### 환율 조회

1. 캐시가 있으면 먼저 표시
2. 프록시로 오늘 환율 조회, 비어 있으면(주말·공휴일·오전 11시 전) 최대 5일 전까지 거슬러 조회
3. 성공 시 캐시 갱신, 화면에 "MM.DD 기준" 표시

### 기록 저장

1. 원화·달러 두 금액으로 환율 역산, sell이면 손익 계산
2. 스토어 갱신 → 두 저장소에 모두 기록

---

## 핵심 계산 로직

```
평균 환전단가 = 투입 원화 ÷ 환전 달러
```

| 유형 | 보유 달러 | 투입 원화 | 평균단가 |
|---|---|---|---|
| buy | + | + | 재계산 |
| sell | - | 평균단가 × 판 달러만큼 차감 | 유지 |

```
예) buy  $100 / ₩140,000
    buy  $100 / ₩150,000  → 평균 ₩1,450, 투입 원화 ₩290,000
    sell $50  @ ₩1,480    → 손익 +₩1,500, 투입 원화 ₩217,500, 평균 ₩1,450 유지
```

- **sell 손익** = (적용 환율 − 평균단가) × min(판 달러, 기록 잔액)
- **기록 잔액을 넘는 매도분**(배당·매매차익 등 기록에 없는 달러)은 원가를 알 수 없어 손익 0으로 처리합니다. 원가 없는 달러를 평균에 섞으면 단가가 실제보다 낮아 보이기 때문입니다.
- **같은 날짜의 거래**는 buy를 먼저 계산해, 입력 순서와 상관없이 결과가 같습니다.
- `profitKrw`는 저장 시점의 값입니다. 이전 거래를 수정해도 이후 sell 손익은 다시 계산되지 않습니다.

---

## 에러 처리

### 환율

| 상황 | 처리 | 사용자에게 보이는 것 |
|---|---|---|
| 조회 실패, 캐시 있음 | 마지막 환율 유지 | 환율 + "조회 실패, 이전 환율" + 다시 시도 |
| 조회 실패, 캐시 없음 | 임시값을 쓰지 않음 | "-" + "조회 실패" + 다시 시도 |
| 응답 지연 | 12초 후 중단 | 위와 동일 |
| API 오류 코드 (인증·한도 등) | 실패로 처리 | 위와 동일 |

### 프록시 (`api/_koreaexim.js`)

| 상황 | 처리 |
|---|---|
| 중간 인증서 누락 | 중간 CA를 코드에 포함 (2027-11-02 만료) |
| 방화벽 302 + 쿠키 | 쿠키를 붙여 재시도 |
| 빈 응답 | 비영업일로 보고 빈 배열 반환 |
| 오류·지연 | 최대 3회, 전체 9초 안에서 재시도 (함수 제한 10초) |

### 저장소

| 상황 | 처리 |
|---|---|
| 기록 없음 | 빈 상태로 시작 |
| 읽기 실패 / 손상된 데이터 | 오류 화면 + 다시 시도, 저장 차단 (기존 기록 보존) |
| 한쪽 저장소 쓰기 실패 | 다른 쪽이 성공하면 저장 성공 |
| 양쪽 모두 실패 | "기록을 저장하지 못했어요" 안내 |
| 이전 기록 이전 실패 | 완료 표시를 남기지 않고 다음 실행에서 재시도 |

### 화면

- 렌더링 오류는 `AppErrorBoundary`가 받아 "다시 열기" 화면을 표시합니다.

---

## 로컬 개발

Node 24 필요 (`.nvmrc`).

```bash
npm install
cp .env.example .env   # 환경변수 입력
npm run dev            # 개발 서버 (vite 미들웨어가 프록시 역할)
npx vitest run         # 테스트
npm run build          # vite build + ait build → .ait 번들
npm run deploy         # 앱인토스 테스트 환경 업로드
```

| 환경변수 | 위치 | 용도 |
|---|---|---|
| `VITE_EXCHANGE_RATE_API_KEY` | 로컬 `.env` | 개발 서버 미들웨어용 API 키 |
| `VITE_EXCHANGE_RATE_PROXY_URL` | 로컬 `.env` | 앱 빌드 시 프록시 주소 |
| `EXCHANGE_RATE_API_KEY` | Vercel | 운영 프록시 API 키 (앱 번들에 포함되지 않음) |

---

## 배포

- **프록시**: `main`에 푸시하면 Vercel에 배포됩니다. 다른 브랜치는 미리보기 배포만 됩니다.
- **앱**: `npm run deploy`로 QR 테스트 환경에 올린 뒤, 검토 요청과 출시는 앱인토스 콘솔에서 진행합니다.
- SDK 3.x 번들은 출시 후 2.x로 되돌릴 수 없습니다.

---

## 주의사항

- 수수료와 소수점 절사 때문에 실제 계좌 잔액과 약간 다를 수 있습니다.
- 투자 조언을 제공하지 않으며 수치 계산만 표시합니다.
- 외부 링크를 포함하지 않습니다 (토스 미니앱 정책).
- 기록은 기기에만 저장되어 기기를 바꾸면 옮겨지지 않습니다.

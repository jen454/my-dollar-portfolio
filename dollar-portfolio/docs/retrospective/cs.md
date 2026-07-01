# CS 측면 회고

> 아키텍처 선택, 알고리즘, 데이터 설계 관점에서 이 서비스를 되돌아본다.

---

## SPA (Single Page Application)

최초 HTML/JS 번들을 한 번 로드하고, 이후 페이지 전환은 JS가 DOM을 교체하는 방식. 서버에 새 HTML을 매번 요청하지 않는다.

**이 서비스에서:** React + Vite로 번들된 단일 `index.html`이 토스 WebView 안에서 구동된다. `react-router-dom`의 `BrowserRouter`로 `/`, `/transactions`, `/add-record` 세 라우트를 클라이언트에서만 처리한다. 토스 미니앱은 네이티브 앱 내 WebView이므로 페이지 이동 시 네트워크 요청 없이 JS 레벨 라우팅이 일어난다.

---

## 미니앱 / WebView 아키텍처

네이티브 앱 내에 웹 브라우저를 임베드해 웹 콘텐츠를 표시하는 방식. 빠른 출시와 웹 기술 재활용이 장점.

**이 서비스에서:** 토스 앱의 WebView 컨테이너 안에서 실행된다. `@apps-in-toss/web-framework`가 네이티브 Bridge 역할을 해서 Storage, 네비게이션 등 앱 수준 기능을 웹 코드에서 사용할 수 있게 한다. 반면 웹 표준만으로는 불가능한 기능(파일 접근, 생체인증 등)은 SDK를 통해서만 구현 가능하다.

---

## 상태 관리 (State Management)

여러 컴포넌트가 공유하는 데이터를 중앙에서 관리하는 패턴. Props Drilling 없이 어느 컴포넌트에서도 접근 가능하다.

**이 서비스에서:** Zustand의 `useRecordStore`가 유일한 전역 스토어다. 컴포넌트는 필요한 slice만 selector로 구독해 불필요한 리렌더를 방지한다.

```
RecordStore
├── storage.transactions  → 모든 거래 기록
├── currentExchangeRate   → 실시간 환율 (API에서 주입)
├── rateBaseDate          → 환율 기준일 표시용
└── saveError             → 저장 실패 시 사용자 노출
```

---

## 영속성 (Persistence) & 폴백(Fallback) 패턴

앱이 종료되어도 데이터가 남아있게 저장하는 것. 폴백은 주 저장소 실패 시 대안 저장소로 자동 전환하는 패턴.

**이 서비스에서:** `storage.ts`가 두 계층을 순서대로 시도한다.

1. **SDK Storage** (`@apps-in-toss/web-framework`): 토스 앱이 관리하는 영구 저장소.
2. **localStorage**: SDK 실패 시 폴백. 브라우저 캐시 클리어 시 소실 가능.

스토어는 앱 최초 마운트 시 `loadFromStorage()`를 한 번만 호출하고 이후 메모리(Zustand)에서만 읽는다. 변경(추가/수정/삭제) 시에만 저장소에 기록해 I/O를 최소화한다.

---

## 캐싱 (Caching)

동일한 데이터를 반복 요청하지 않도록 일정 시간 로컬에 저장하는 기법. TTL(Time To Live)로 유효기간을 관리한다.

**이 서비스에서:** `useExchangeRate` 훅이 환율을 `localStorage`에 캐시한다.

- **TTL:** 1시간 (`ONE_HOUR_MS = 60 * 60 * 1000`)
- **캐시 구조:** `{ rate, fetchedAt, rateBaseDate }`
- **캐시 히트 조건:** 1시간 이내 + 오늘 날짜 기준 데이터일 때
- **이유:** 한국수출입은행 OpenAPI는 일일 호출 제한(result 코드 4)이 있어 남용 시 당일 환율 조회 불가.

---

## 비영업일 처리 (Business Day Lookback)

공공 금융 API는 주말·공휴일에 데이터를 제공하지 않는다. 이를 처리하는 재시도 로직이 필요하다.

**이 서비스에서:** `fetchLatestExchangeRate()`가 오늘부터 최대 5일 전까지 하루씩 앞당기며 API를 순차 호출한다. 빈 배열 또는 `null` 응답을 비영업일 신호로 판단하고 다음 날짜로 넘어간다. 5일 내 데이터가 없으면 에러 처리 후 스토어에 마지막으로 저장된 환율을 그대로 사용한다.

---

## 프록시 서버 (Proxy Server)

클라이언트와 외부 API 사이에서 요청을 중계하는 서버. CORS 우회, API 키 노출 방지에 활용한다.

**이 서비스에서:** 한국수출입은행 API는 CORS를 허용하지 않아 브라우저에서 직접 호출할 수 없다. `api/exchange-rate.js` (Vercel Serverless Function)가 프록시 역할을 한다. 프로덕션에서는 API 키를 서버 환경변수에 두어 클라이언트에 노출하지 않는다.

```
[토스 WebView] → VITE_EXCHANGE_RATE_PROXY_URL → [Vercel Function] → [수출입은행 API]
```

---

## 가중평균 알고리즘 (Weighted Average)

단순 평균이 아니라 각 값의 비중(가중치)을 반영한 평균. 금융에서 평균 매입 단가 계산의 표준 방식.

**이 서비스에서:** 핵심 계산 공식은 `총 투입 원화 ÷ 총 환전 달러`.

- `buy` 거래가 쌓일수록 가중평균이 갱신된다.
- `sell` 시에는 평균단가를 유지한 채 투입 원화와 환전 달러를 비례 차감한다.
- `change`(배당금, 이자 등)는 원화를 투입하지 않았으므로 평균단가에 영향을 주지 않는다.

```
// calculator.ts 핵심 로직
const averageExchangeRate = totalInvestedKrw / exchangedDollarAmount;
const investedKrwForSoldDollar = averageExchangeRate * soldDollarAmount;
totalInvestedKrw -= investedKrwForSoldDollar; // sell 시 비례 차감
```

---

## 순수 함수 (Pure Function) & 단위 테스트

동일한 입력에 항상 동일한 출력을 반환하고 외부 상태를 변경하지 않는 함수. 테스트하기 가장 쉬운 형태.

**이 서비스에서:** `calculator.ts`와 `formatter.ts`는 부수효과 없는 순수 함수로만 구성했다. 덕분에 `calculator.test.ts`, `formatter.test.ts`로 UI 없이 독립적으로 검증 가능하다. 환전 로직처럼 엣지케이스(전액 매도, 0달러 보유 등)가 많은 계산을 안전하게 리팩터링할 수 있는 기반이 된다.

---

## 스키마 버전 관리 (Schema Versioning)

저장 데이터 구조가 변경될 때 기존 데이터와의 호환성을 관리하는 방법. `version` 필드로 마이그레이션 분기를 만든다.

**이 서비스에서:** 저장 포맷이 `DollarPortfolioStorageV1 { version: 1, transactions, updatedAt }` 구조를 가진다. 향후 새 필드 추가나 타입 변경 시 `version: 2`로 분기해 기존 데이터를 마이그레이션할 수 있도록 설계했다. 모바일 앱처럼 업데이트 없이 구 버전이 남아있는 환경에서 중요한 패턴이다.

---

## 낙관적 업데이트 vs. 보수적 저장

낙관적 업데이트(Optimistic Update)는 서버 응답 전에 UI를 먼저 바꾸는 방식. 빠른 UX를 주지만 실패 시 롤백 로직이 필요하다.

**이 서비스에서:** Storage 저장이 성공하면 그때 Zustand 상태를 갱신하는 보수적 방식을 택했다. 저장 실패 시 `saveError` 상태를 노출해 사용자에게 알린다. 거래 기록 소실의 비용이 크기 때문에 UX 속도보다 데이터 무결성을 우선한 선택이다.

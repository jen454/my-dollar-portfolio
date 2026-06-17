// 숫자/날짜 포맷 유틸 (입력 폼, 대시보드 표시용)
// 거래 내역 delta(부호 포함) 표시는 utils/format.ts를 사용한다.

/**
 * 원화 포맷 (부호 없음). 예: ₩1,425,000
 */
export function formatKrw(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₩0";
  return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
}

/**
 * 달러 포맷 (부호 없음). 예: $2,500
 */
export function formatDollar(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "$0";
  return `$${amount.toLocaleString("en-US")}`;
}

/**
 * 달러 포맷 (부호 포함). 거래 내역의 증감(delta) 표시용. 예: +$50 / -$20
 */
export function formatSignedDollar(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "$0";
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}$${Math.abs(amount).toLocaleString("en-US")}`;
}

/**
 * 환율 포맷. formatKrw와 동일한 표기를 쓰되 의미를 명확히 하기 위한 별칭. 예: ₩1,425
 */
export function formatRate(rate: number): string {
  return formatKrw(rate);
}

/**
 * 손익률 포맷 (부호 포함, 소수점 1자리). 예: +21.1% / -3.2%
 */
export function formatProfitRate(rate: number): string {
  if (rate === undefined || rate === null || isNaN(rate)) return "0.0%";
  const sign = rate >= 0 ? "+" : "-";
  return `${sign}${Math.abs(rate).toFixed(1)}%`;
}

/**
 * 손익 금액 포맷 (부호 포함). 예: +₩600,000 / -₩22,500
 */
export function formatProfitKrw(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₩0";
  const sign = amount >= 0 ? "+" : "-";
  return `${sign}₩${Math.abs(Math.round(amount)).toLocaleString("ko-KR")}`;
}

/**
 * 'YYYY.MM.DD' → '6월 16일'
 */
export function formatDateLabel(date: string): string {
  const normalized = date.includes(".") ? date.replaceAll(".", "-") : date;
  const parsed = new Date(`${normalized}T00:00:00`);
  if (isNaN(parsed.getTime())) return date;
  return `${parsed.getMonth() + 1}월 ${parsed.getDate()}일`;
}

/**
 * 'YYYY.MM.DD' → 'YYYY-MM-DD' (input[type=date]용)
 */
export function formatDateForInput(date: string): string {
  return date.includes(".") ? date.replaceAll(".", "-") : date;
}

/**
 * 'YYYY-MM-DD' → 'YYYY.MM.DD' (저장용)
 */
export function formatDateForStorage(date: string): string {
  return date.includes("-") ? date.replaceAll("-", ".") : date;
}

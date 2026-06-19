// 숫자/날짜 포맷 유틸 (입력 폼, 대시보드 표시용)

/**
 * 원화 포맷 (부호 없음). 예: ₩1,425,000
 */
export function formatKrw(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₩0";
  return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
}

const DOLLAR_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * 달러 포맷 (부호 없음). 예: $2,500.00
 */
export function formatDollar(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "$0.00";
  return `$${amount.toLocaleString("en-US", DOLLAR_FORMAT_OPTIONS)}`;
}

/**
 * 달러 포맷 (부호 포함). 거래 내역의 증감(delta) 표시용. 예: +$50.00 / -$20.00
 */
export function formatSignedDollar(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "$0.00";
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}$${Math.abs(amount).toLocaleString("en-US", DOLLAR_FORMAT_OPTIONS)}`;
}

/**
 * 환율 포맷 (소수점 2자리 고정). 예: ₩1,425.00
 */
export function formatRate(rate: number): string {
  if (rate === undefined || rate === null || isNaN(rate)) return "₩0.00";
  return `₩${rate.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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


/**
 * 숫자를 한국 원화(KRW) 포맷으로 변환합니다. (예: ₩1,460)
 */
export function formatKrw(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return "₩0";
  return `₩${Math.abs(Math.round(value)).toLocaleString("ko-KR")}`;
}

/**
 * 숫자를 부호가 포함된 한국 원화(KRW) 포맷으로 변환합니다. (예: +₩660,000 / -₩1,200)
 */
export function formatSignedKrw(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return "₩0";
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatKrw(value)}`;
}

/**
 * 숫자를 부호가 포함된 미국 달러(USD) 포맷으로 변환합니다. (예: +$50 / -$20)
 * 소수점 투자가 있을 수 있으므로 부득이한 반올림은 제외하거나 
 * 필요에 따라 고정 소수점 설정을 추가할 수 있습니다.
 */
export function formatDollar(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return "$0";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US")}`;
}
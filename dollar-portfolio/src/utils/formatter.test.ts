import { describe, it, expect } from "vitest";
import {
  formatKrw,
  formatDollar,
  formatSignedDollar,
  formatRate,
  formatProfitRate,
  formatProfitKrw,
} from "./formatter";

describe("formatKrw", () => {
  it("정수 원화 포맷", () => expect(formatKrw(1425000)).toBe("₩1,425,000"));
  it("0", () => expect(formatKrw(0)).toBe("₩0"));
  it("소수점은 반올림", () => expect(formatKrw(1425.6)).toBe("₩1,426"));
  it("NaN → ₩0", () => expect(formatKrw(NaN)).toBe("₩0"));
});

describe("formatDollar", () => {
  it("소수점 2자리 고정", () => expect(formatDollar(2500)).toBe("$2,500.00"));
  it("소수 포함", () => expect(formatDollar(5.75)).toBe("$5.75"));
  it("0", () => expect(formatDollar(0)).toBe("$0.00"));
  it("NaN → $0.00", () => expect(formatDollar(NaN)).toBe("$0.00"));
});

describe("formatSignedDollar", () => {
  it("양수 + 부호", () => expect(formatSignedDollar(50)).toBe("+$50.00"));
  it("음수 - 부호", () => expect(formatSignedDollar(-20)).toBe("-$20.00"));
  it("0 부호 없음", () => expect(formatSignedDollar(0)).toBe("$0.00"));
});

describe("formatRate", () => {
  it("소수점 2자리 고정", () => expect(formatRate(1425)).toBe("₩1,425.00"));
  it("소수 포함", () => expect(formatRate(1432.57)).toBe("₩1,432.57"));
  it("0", () => expect(formatRate(0)).toBe("₩0.00"));
  it("NaN → ₩0.00", () => expect(formatRate(NaN)).toBe("₩0.00"));
});

describe("formatProfitRate", () => {
  it("양수 + 부호, 소수점 1자리", () => expect(formatProfitRate(21.1)).toBe("+21.1%"));
  it("음수 - 부호", () => expect(formatProfitRate(-3.2)).toBe("-3.2%"));
  it("0", () => expect(formatProfitRate(0)).toBe("+0.0%"));
  it("NaN → 0.0%", () => expect(formatProfitRate(NaN)).toBe("0.0%"));
});

describe("formatProfitKrw", () => {
  it("양수 + 부호", () => expect(formatProfitKrw(600000)).toBe("+₩600,000"));
  it("음수 - 부호", () => expect(formatProfitKrw(-22500)).toBe("-₩22,500"));
  it("소수점 반올림", () => expect(formatProfitKrw(100.6)).toBe("+₩101"));
  it("NaN → ₩0", () => expect(formatProfitKrw(NaN)).toBe("₩0"));
});

import { describe, expect, it } from "vitest";
import { describeRateLevel } from "./useHistoricalRates";

describe("describeRateLevel", () => {
  it("범위 안에서는 백분위로 상위/하위를 표현한다", () => {
    expect(describeRateLevel(1450, 1376, 1544, 40)).toBe("52주 중 하위 40% 수준");
    expect(describeRateLevel(1500, 1376, 1544, 80)).toBe("52주 중 상위 20% 수준");
  });

  it("백분위 50은 상위 50%로 표현한다", () => {
    expect(describeRateLevel(1460, 1376, 1544, 50)).toBe("52주 중 상위 50% 수준");
  });

  // 실제로 발생한 케이스: 현재 환율(1370.3)이 52주 최저(1376.5)보다 낮아
  // 백분위가 0이 되면서 "하위 0% 수준"이라는 어색한 문구가 나왔다.
  it("52주 최저 이하면 백분위 대신 최저 수준으로 표현한다", () => {
    expect(describeRateLevel(1370.3, 1376.5, 1544.2, 0)).toBe("52주 최저 수준");
    expect(describeRateLevel(1376.5, 1376.5, 1544.2, 0)).toBe("52주 최저 수준");
  });

  it("52주 최고 이상이면 최고 수준으로 표현한다", () => {
    expect(describeRateLevel(1600, 1376.5, 1544.2, 100)).toBe("52주 최고 수준");
    expect(describeRateLevel(1544.2, 1376.5, 1544.2, 100)).toBe("52주 최고 수준");
  });
});

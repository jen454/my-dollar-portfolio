import { Text } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { describeRateLevel, useHistoricalRates } from "../hooks/useHistoricalRates";
import { formatRate } from "../utils/formatter";

type Props = {
  currentRate: number;
};

const skeletonBlock = {
  background: colors.grey100,
  borderRadius: "6px",
};

/**
 * 현재 환율이 최근 52주 중 어느 구간에 위치하는지 수치로만 보여준다.
 * 판단/추천 없이 최저~최고 범위, 현재 위치, 백분위만 표시.
 * 에러 시 섹션 자체를 렌더링하지 않는다 (조용히 실패).
 */
export function HistoricalRateBar({ currentRate }: Props) {
  const { weeklyLow, weeklyHigh, weeklyAverage, currentPercentile, dataPoints, isLoading, error } =
    useHistoricalRates(currentRate);

  // 조용히 실패: 에러거나 데이터가 없으면 섹션 숨김
  if (error) return null;

  if (isLoading && dataPoints === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "4px 4px 0" }}>
        <div style={{ ...skeletonBlock, width: "40%", height: 12 }} />
        <div style={{ ...skeletonBlock, width: "100%", height: 8, borderRadius: "999px" }} />
        <div style={{ ...skeletonBlock, width: "55%", height: 10 }} />
      </div>
    );
  }

  if (dataPoints === 0 || weeklyHigh <= weeklyLow) return null;

  // 바 위 현재 위치 (0~100%). 백분위와 별개로 실제 값 위치로 마커를 놓는다.
  const range = weeklyHigh - weeklyLow;
  const markerRatio = Math.min(1, Math.max(0, (currentRate - weeklyLow) / range));
  const markerPercent = markerRatio * 100;

  const levelText = describeRateLevel(currentRate, weeklyLow, weeklyHigh, currentPercentile);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "4px 4px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text typography="t7" fontWeight="medium" color={colors.grey500}>
          최근 52주 환율 위치
        </Text>
        <Text typography="t7" fontWeight="semibold" color={colors.grey700}>
          {levelText}
        </Text>
      </div>

      {/* 최저~최고 구간 바 + 현재 위치 마커 */}
      <div style={{ position: "relative", padding: "8px 0" }}>
        <div style={{ position: "relative", width: "100%", height: 6, background: colors.grey200, borderRadius: "999px" }}>
          {/* 평균 위치 눈금 */}
          <div
            style={{
              position: "absolute",
              left: `${Math.min(100, Math.max(0, ((weeklyAverage - weeklyLow) / range) * 100))}%`,
              top: -2,
              width: 2,
              height: 10,
              background: colors.grey400,
              transform: "translateX(-50%)",
              borderRadius: "1px",
            }}
          />
          {/* 현재 위치 마커 */}
          <div
            style={{
              position: "absolute",
              left: `${markerPercent}%`,
              top: "50%",
              width: 12,
              height: 12,
              background: colors.grey900,
              border: `2px solid ${colors.white}`,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <Text typography="t8" color={colors.grey400}>최저</Text>
          <Text typography="t7" fontWeight="medium" color={colors.grey600}>{formatRate(weeklyLow)}</Text>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", alignItems: "center" }}>
          <Text typography="t8" color={colors.grey400}>평균</Text>
          <Text typography="t7" fontWeight="medium" color={colors.grey600}>{formatRate(weeklyAverage)}</Text>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", alignItems: "flex-end" }}>
          <Text typography="t8" color={colors.grey400}>최고</Text>
          <Text typography="t7" fontWeight="medium" color={colors.grey600}>{formatRate(weeklyHigh)}</Text>
        </div>
      </div>

      <Text typography="t8" color={colors.grey400} style={{ lineHeight: 1.4 }}>
        한국수출입은행 매매기준율 기준 최근 52주 주간 데이터({dataPoints}개)로 계산한 참고 수치예요. 판단은 직접 해주세요.
      </Text>
    </div>
  );
}

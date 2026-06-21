import {
  FixedBottomCTA,
  ListRow,
  TextButton,
  Text,
  BottomSheet,
} from "@toss/tds-mobile";
import { PageSpinner } from "../components/PageSpinner";
import { colors } from "@toss/tds-colors";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useDollarPortfolio } from "../hooks/useDollarPortfolio";
import { useRecordStore } from "../store/recordStore";
import { buildTransactionBalanceMap } from "../utils/calculator";
import { formatKrw, formatProfitKrw, formatProfitRate, formatDollar, formatRate } from "../utils/formatter";
import { TransactionRow } from "../components/TransactionRow";

const colFull = {
  display: "flex",
  flexDirection: "column" as const,
  width: "100%",
};

const cardBase = {
  boxSizing: "border-box" as const,
  width: "100%",
  borderRadius: "15px",
  overflow: "hidden" as const,
};

const baseCardStyle = {
  ...cardBase,
  background: colors.background,
};

const gridItemStyle = {
  ...cardBase,
  padding: '1px',
  background: colors.grey50,
};


export function HomeDashboardPage() {
  const navigate = useNavigate();
  const { storage, summary, recentTransactions, isLoaded } = useDollarPortfolio();
  const rateBaseDate = useRecordStore((s) => s.rateBaseDate);
  const rateError = useRecordStore((s) => s.rateError);
  const balanceMap = useMemo(
    () => buildTransactionBalanceMap(storage.transactions),
    [storage.transactions],
  );
  const profitTone = summary.profitKrw > 0 ? colors.red500 : summary.profitKrw < 0 ? colors.blue500 : colors.grey900;
  const rateDiffText =
    summary.rateDiffFromAverage >= 0
      ? `▲ ${formatRate(Math.abs(summary.rateDiffFromAverage))}`
      : `▼ ${formatRate(Math.abs(summary.rateDiffFromAverage))}`;
  const isEmpty = isLoaded && storage.transactions.length === 0;
  const [helpExchangeOpen, setHelpExchangeOpen] = useState(false);
  const [helpProfitOpen, setHelpProfitOpen] = useState(false);

  if (!isLoaded) return <PageSpinner />;

  return (
    <main style={{ display: "flex", flexDirection: "column", width: 'calc(100% - 36px)', minHeight: "100vh", margin: '0 auto', padding: "12px 0" }}>
      <section style={{ ...colFull, gap: "12px" }}>
        {/* CARD 1: 환율 및 달러 요약 */}
        <div style={baseCardStyle}>
          <div style={{ ...colFull, padding: "12px", gap: "10px" }}>
            {/* 메인 자산 (평균 환전 단가) */}
              <ListRow
                border="none"
                verticalPadding="small"
                horizontalPadding="small"
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <ListRow.Text typography="t6" fontWeight="medium" color={colors.grey600}>평균 환전단가</ListRow.Text>
                        <button onClick={() => setHelpExchangeOpen(true)} style={{ background: "none", border: "none", padding: 0, boxSizing: "border-box", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", backgroundColor: colors.grey200, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: colors.grey500, lineHeight: 1 }}>?</span>
                        </button>
                      </div>
                    }
                    bottom={<ListRow.Text typography="t4" fontWeight="bold" color={colors.grey800}>{formatRate(summary.averageExchangeRate)}</ListRow.Text>}
                  />
                }
              />
            {/* 현재 환율 / 평균 대비 그리드 */}
            <div style={{ ...gridItemStyle }}>
                <ListRow
                  border="none" verticalPadding="small" horizontalPadding="small"
                  contents={
                    <ListRow.Texts type="3RowTypeA"
                      top={<ListRow.Text typography="t7" fontWeight="medium" color={colors.grey500}>현재 환율</ListRow.Text>}
                      middle={<ListRow.Text typography="t6" fontWeight="semibold" color={colors.grey900}>{formatRate(summary.currentExchangeRate)}</ListRow.Text>}
                      bottom={
                        rateError
                          ? <ListRow.Text typography="t7" color={colors.yellow500}>환율 조회 실패 · 이전 환율 기준</ListRow.Text>
                          : rateBaseDate
                          ? <ListRow.Text typography="t7" color={colors.grey400}>{rateBaseDate} 기준</ListRow.Text>
                          : ""
                      }
                    />
                  }
                  right={
                    <ListRow.Texts type="2RowTypeA"
                      top={<ListRow.Text typography="t7" fontWeight="medium" color={colors.grey500}>평균 대비</ListRow.Text>}
                      bottom={<ListRow.Text typography="t6" fontWeight="semibold" color={summary.rateDiffFromAverage >= 0 ? colors.red500 : colors.blue500}>{rateDiffText}</ListRow.Text>}
                    />
                  }
                />
            </div>
            {/* 현재 보유 달러 */}
            <div style={gridItemStyle}>
              <ListRow
                border="none" verticalPadding="small" horizontalPadding="small"
                contents={
                  <ListRow.Texts type="2RowTypeA"
                    top={<ListRow.Text typography="t7" fontWeight="medium" color={colors.grey500}>현재 보유달러</ListRow.Text>}
                    bottom={<ListRow.Text typography="t6" fontWeight="semibold" color={colors.grey900}>{formatDollar(summary.currentDollarAmount)}</ListRow.Text>}
                  />
                }
              />
            </div>

          </div>
        </div>

        {/* CARD 2: 원화 환산 손익 */}
        <div style={baseCardStyle}>
          <div style={colFull}>
            {/* 원화 환산 손익 */}
            <div style={{ ...colFull, padding: '12px 20px 8px' }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Text typography="t6" fontWeight="medium" color={colors.grey600}>원화 환산 손익</Text>
                <button onClick={() => setHelpProfitOpen(true)} style={{ background: "none", border: "none", padding: 0, boxSizing: "border-box", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", backgroundColor: colors.grey200, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: colors.grey500, lineHeight: 1 }}>?</span>
                </button>
              </div>
              <Text typography="t5" fontWeight="bold" color={profitTone}>
                {formatProfitKrw(summary.profitKrw)} ({formatProfitRate(summary.profitRate)})
              </Text>
            </div>
            <div style={{ height: 1, background: colors.grey100, margin: "0 20px" }} />
            {/* 세부 정보 리스트 */}
            <div style={colFull}>
              <ListRow
                border="none"
                verticalPadding="small"
                horizontalPadding="small"
                contents={<ListRow.Text typography="t7" color={colors.grey700}>총 투입 원화</ListRow.Text>}
                right={<ListRow.Text typography="t7" fontWeight="semibold" color={colors.grey900}>{formatKrw(summary.totalInvestedKrw)}</ListRow.Text>}
                a11yRightReflow={false}
              />
              <ListRow
                border="none"
                verticalPadding="small"
                horizontalPadding="small"
                contents={<ListRow.Text typography="t7" color={colors.grey700}>현재 원화 환산액</ListRow.Text>}
                right={<ListRow.Text typography="t7" fontWeight="semibold" color={colors.grey900}>{formatKrw(summary.currentValueKrw)}</ListRow.Text>}
                a11yRightReflow={false}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: 거래 기록 */}
        <div style={colFull}>
          <ListRow
            border="none" verticalPadding="small" horizontalPadding="small"
            contents={<ListRow.Text typography="t6" fontWeight="semibold" color={colors.grey700}>거래 기록</ListRow.Text>}
            right={<TextButton size="small" color={colors.blue600} variant="arrow" onClick={() => navigate("/transactions")}>전체보기</TextButton>}
            a11yRightReflow={false}
          />
          <div style={{ ...baseCardStyle, padding: "6px 0" }}>
            {isEmpty ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px", gap: "8px" }}>
                <Text typography="t6" color={colors.grey400}>아직 거래 기록이 없어요</Text>
                <Text typography="t7" color={colors.grey300}>첫 환전 기록을 추가해보세요</Text>
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  dollarBalance={balanceMap.get(transaction.id) ?? 0}
                />
              ))
            )}
          </div>
        </div>

      </section>

      {/* Card 1 도움말: 평균 환전단가 + 보유달러 차이 */}
      <BottomSheet open={helpExchangeOpen} onClose={() => setHelpExchangeOpen(false)} header={<BottomSheet.Header>평균 환전단가 안내</BottomSheet.Header>}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "4px 20px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Text typography="t6" fontWeight="bold" color={colors.grey800}>평균 환전단가란?</Text>
            <Text typography="t7" color={colors.grey600}>원화→달러 환전 기록을 기반으로 계산한 가중평균 단가예요.</Text>
            <div style={{ background: colors.grey50, borderRadius: "10px", padding: "10px 14px", marginTop: "2px" }}>
              <Text typography="t7" color={colors.grey600}>총 투입 원화 ÷ 총 환전 달러 = 평균 환전단가</Text>
            </div>
            <Text typography="t7" color={colors.grey500}>배당금·매도차익 등 달러 변동은 평균단가에 영향을 주지 않아요.</Text>
          </div>
          <div style={{ height: 1, background: colors.grey100 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Text typography="t6" fontWeight="bold" color={colors.grey800}>실제 계좌와 보유달러가 다른 이유</Text>
            <Text typography="t7" color={colors.grey500}>달러 변동에서 수수료를 별도로 입력하지 않았거나, 거래 금액 소수점 오차로 인해 실제 계좌 보유달러와 소폭 차이가 있을 수 있어요.</Text>
          </div>
        </div>
      </BottomSheet>

      {/* Card 2 도움말: 손익 계산 */}
      <BottomSheet open={helpProfitOpen} onClose={() => setHelpProfitOpen(false)} header={<BottomSheet.Header>원화 환산 손익 안내</BottomSheet.Header>}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "4px 20px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Text typography="t6" fontWeight="bold" color={colors.grey800}>손익은 어떻게 계산하나요?</Text>
            <div style={{ background: colors.grey50, borderRadius: "10px", padding: "10px 14px" }}>
              <Text typography="t7" color={colors.grey600}>현재 보유달러 × 현재 환율 − 총 투입 원화</Text>
            </div>
            <Text typography="t7" color={colors.grey500}>배당금·이자 등 달러 변동 내역도 손익 계산에 반영돼요.</Text>
          </div>
          <div style={{ height: 1, background: colors.grey100 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Text typography="t6" fontWeight="bold" color={colors.grey800}>손익률은 어떻게 계산하나요?</Text>
            <div style={{ background: colors.grey50, borderRadius: "10px", padding: "10px 14px" }}>
              <Text typography="t7" color={colors.grey600}>손익 ÷ 총 투입 원화 × 100</Text>
            </div>
          </div>
        </div>
      </BottomSheet>

      <FixedBottomCTA
        size="large"
        onClick={() => navigate("/add-record")}
        bottomAccessory={
          <Text typography="t7" color={colors.greyOpacity600} style={{ margin: "-10px 0 0", lineHeight: "1.5", textAlign: "center" }}>
            한국수출입은행 기준환율 기반 단순 계산기입니다.
            <br />
            투자 조언을 제공하지 않습니다.
          </Text>
        }
      >
        + 거래 기록 추가
      </FixedBottomCTA>
    </main>
  );
}

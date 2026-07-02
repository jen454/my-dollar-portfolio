import { ListRow, TextButton, Text, BottomSheet } from "@toss/tds-mobile";
import { PageSpinner } from "../components/PageSpinner";
import { colors } from "@toss/tds-colors";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useDollarPortfolio } from "../hooks/useDollarPortfolio";
import { useRecordStore } from "../store/recordStore";
import { buildTransactionBalanceMap } from "../utils/calculator";
import { formatKrw, formatRate } from "../utils/formatter";
import { TransactionRow } from "../components/TransactionRow";
import { RecordCTA } from "../components/RecordCTA";

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
  const rateDiffText =
    summary.rateDiffFromAverage >= 0
      ? `▲ ${formatRate(Math.abs(summary.rateDiffFromAverage))}`
      : `▼ ${formatRate(Math.abs(summary.rateDiffFromAverage))}`;
  const isEmpty = isLoaded && storage.transactions.length === 0;
  const [helpExchangeOpen, setHelpExchangeOpen] = useState(false);

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
            {/* 총 투입 원화 */}
            <div style={gridItemStyle}>
              <ListRow
                border="none" verticalPadding="small" horizontalPadding="small"
                contents={
                  <ListRow.Texts type="2RowTypeA"
                    top={<ListRow.Text typography="t7" fontWeight="medium" color={colors.grey500}>총 투입 원화</ListRow.Text>}
                    bottom={<ListRow.Text typography="t6" fontWeight="semibold" color={colors.grey900}>{formatKrw(summary.totalInvestedKrw)}</ListRow.Text>}
                  />
                }
              />
            </div>

          </div>
        </div>

        {/* CARD 2: 환전 내역 */}
        <div style={colFull}>
          <ListRow
            border="none" verticalPadding="small" horizontalPadding="small"
            contents={<ListRow.Text typography="t6" fontWeight="semibold" color={colors.grey700}>환전 내역</ListRow.Text>}
            right={<TextButton size="small" color={colors.blue600} variant="arrow" onClick={() => navigate("/transactions")}>전체보기</TextButton>}
            a11yRightReflow={false}
          />
          <div style={{ ...baseCardStyle, padding: "6px 0" }}>
            {isEmpty ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px", gap: "8px" }}>
                <Text typography="t6" color={colors.grey400} style={{ textAlign: "center" }}>환전하실 때마다 1분만 기록해보세요</Text>
                <Text typography="t7" color={colors.grey300} style={{ textAlign: "center" }}>평균 환전단가를 쌓아갈 수 있어요</Text>
              </div>
            ) : (
              recentTransactions.map((transaction, index) => (
                <div key={transaction.id}>
                  {index > 0 && (
                    <div style={{ height: 1, background: colors.grey100, margin: "0 20px" }} />
                  )}
                  <TransactionRow
                    transaction={transaction}
                    dollarBalance={balanceMap.get(transaction.id) ?? 0}
                  />
                </div>
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
            <Text typography="t7" color={colors.grey500}>환전(sell) 손익은 평균단가에 영향을 주지 않아요.</Text>
          </div>
          <div style={{ height: 1, background: colors.grey100 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Text typography="t6" fontWeight="bold" color={colors.grey800}>실제 계좌와 잔액이 다른 이유</Text>
            <Text typography="t7" color={colors.grey500}>배당금·이자 등 환전 없이 늘어난 달러는 이 앱에 기록되지 않아, 실제 계좌 잔액과 차이가 있을 수 있어요.</Text>
          </div>
          <div style={{ height: 1, background: colors.grey100 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Text typography="t6" fontWeight="bold" color={colors.grey800}>환전 내역의 원화 금액 표기는?</Text>
            <Text typography="t7" color={colors.grey600}>원화로 환전(sell)한 내역엔 이번에 받은 원화와, 괄호 안에 평균단가 대비 손익을 함께 보여줘요.</Text>
            <div style={{ background: colors.grey50, borderRadius: "10px", padding: "10px 14px", marginTop: "2px" }}>
              <Text typography="t7" color={colors.grey600}>₩750,000 (+₩39,000) → 750,000원을 받았고, 그중 39,000원이 평균단가보다 유리했던 만큼의 이득</Text>
            </div>
          </div>
        </div>
      </BottomSheet>

      <RecordCTA onClick={() => navigate("/add-record")} label="환전 기록하기" />
    </main>
  );
}

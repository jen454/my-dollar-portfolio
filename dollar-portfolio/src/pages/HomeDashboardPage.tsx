import {
  FixedBottomCTA,
  ListRow,
  TextButton,
  Text,
} from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useDollarPortfolio } from "../hooks/useDollarPortfolio";
import { buildTransactionBalanceMap } from "../utils/calculator";
import { formatKrw, formatProfitKrw } from "../utils/formatter";
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
  const { storage, summary, recentTransactions } = useDollarPortfolio();
  const balanceMap = useMemo(
    () => buildTransactionBalanceMap(storage.transactions),
    [storage.transactions],
  );
  const profitTone = summary.profitKrw >= 0 ? colors.red500 : colors.blue500;
  const rateDiffText =
    summary.rateDiffFromAverage >= 0
      ? `▲ ${formatKrw(summary.rateDiffFromAverage)}`
      : `▼ ${formatKrw(summary.rateDiffFromAverage)}`;

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
                    top={<ListRow.Text typography="t6" fontWeight="medium" color={colors.grey600}>평균 환전단가</ListRow.Text>}
                    bottom={<ListRow.Text typography="t4" fontWeight="bold" color={colors.grey800}>{formatKrw(summary.averageExchangeRate)}</ListRow.Text>}
                  />
                }
              />
            {/* 현재 환율 / 평균 대비 그리드 */}
            <div style={{ ...gridItemStyle }}>
                <ListRow
                  border="none" verticalPadding="small" horizontalPadding="small"
                  contents={
                    <ListRow.Texts type="2RowTypeA"
                      top={<ListRow.Text typography="t7" fontWeight="medium" color={colors.grey500}>현재 환율</ListRow.Text>}
                      bottom={<ListRow.Text typography="t6" fontWeight="semibold" color={colors.grey900}>{formatKrw(summary.currentExchangeRate)}</ListRow.Text>}
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
            {/* 환전 달러 / 현재 보유 달러 그리드 */}
            <div style={{ display: "grid", width: "100%", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
              <div style={gridItemStyle}>
                <ListRow
                  border="none" verticalPadding="small" horizontalPadding="small"
                  contents={
                    <ListRow.Texts type="2RowTypeA"
                      top={<ListRow.Text typography="t7" fontWeight="medium" color={colors.grey500}>환전 달러</ListRow.Text>}
                      bottom={<ListRow.Text typography="t6" fontWeight="semibold" color={colors.grey900}>${summary.exchangedDollarAmount.toLocaleString("en-US")}</ListRow.Text>}
                    />
                  }
                />
              </div>
              <div style={gridItemStyle}>
                <ListRow
                  border="none" verticalPadding="small" horizontalPadding="small"
                  contents={
                    <ListRow.Texts type="2RowTypeA"
                      top={<ListRow.Text typography="t7" fontWeight="medium" color={colors.grey500}>현재 보유달러</ListRow.Text>}
                      bottom={<ListRow.Text typography="t6" fontWeight="semibold" color={colors.grey900}>${summary.currentDollarAmount.toLocaleString("en-US")}</ListRow.Text>}
                    />
                  }
                />
              </div>
            </div>

          </div>
        </div>

        {/* CARD 2: 원화 환산 손익 */}
        <div style={baseCardStyle}>
          <div style={colFull}>
            {/* 원화 환산 손익 */}
            <div style={{ ...colFull, padding: '12px 20px 8px' }}>
              <Text typography="t6" fontWeight="medium" color={colors.grey600}>
                원화 환산 손익
              </Text>
              <Text typography="t5" fontWeight="bold" color={profitTone}>
                {formatProfitKrw(summary.profitKrw)} ({summary.profitRate.toFixed(2)}%)
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
            {recentTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                dollarBalance={balanceMap.get(transaction.id) ?? 0}
              />
            ))}
          </div>
        </div>

      </section>

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

import { ListRow } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import type { DollarTransaction, TransactionType } from "../types";
import { getSignedChangeAmount } from "../utils/calculator";
import { formatSignedDollar } from "../utils/formatter";

function getSignedDelta(transaction: DollarTransaction): number {
  if (transaction.type === "buy") return Math.abs(transaction.dollarAmount);
  if (transaction.type === "sell") return -Math.abs(transaction.dollarAmount);
  return getSignedChangeAmount(transaction);
}

// eslint-disable-next-line react-refresh/only-export-components
export const typeMeta: Record<
  TransactionType,
  { label: string; marker: string; color: string; backgroundColor: string }
> = {
  buy: {
    label: "달러 환전",
    marker: "$",
    color: colors.blue500,
    backgroundColor: "#e8f3ff",
  },
  sell: {
    label: "원화 환전",
    marker: "W",
    color: colors.grey600,
    backgroundColor: colors.grey100,
  },
  change: {
    label: "달러 변동",
    marker: "$",
    color: colors.green500,
    backgroundColor: "#f0faf6",
  },
};

export function TransactionRow({
  transaction,
  dollarBalance,
}: {
  transaction: DollarTransaction;
  dollarBalance: number;
}) {
  const meta = typeMeta[transaction.type];
  const delta = getSignedDelta(transaction);
  const amountColor = delta >= 0 ? colors.red500 : colors.blue500;
  const isExchange = transaction.type === "buy" || transaction.type === "sell";

  return (
    <ListRow
      border="none"
      verticalPadding="small"
      horizontalPadding="small"
      left={
        <ListRow.AssetText
          shape="squircle"
          size="small"
          color={meta.color}
          backgroundColor={meta.backgroundColor}
        >
          {meta.marker}
        </ListRow.AssetText>
      }
      contents={
        isExchange ? (
          <ListRow.Texts
            type="3RowTypeA"
            top={
              <ListRow.Text typography="t7" fontWeight="medium" color={colors.grey600}>
                {transaction.title}
              </ListRow.Text>
            }
            middle={
              transaction.exchangeRate ? (
                <ListRow.Text typography="t7" color={colors.grey700}>
                  ₩{transaction.exchangeRate.toLocaleString("ko-KR")}
                </ListRow.Text>
              ) : (
                ""
              )
            }
            bottom={
              <ListRow.Text typography="t7" color={colors.grey700}>
                {transaction.date}
              </ListRow.Text>
            }
          />
        ) : (
          <ListRow.Texts
            type="2RowTypeA"
            top={
              <ListRow.Text typography="t7" fontWeight="medium" color={colors.grey600}>
                {transaction.title}
              </ListRow.Text>
            }
            bottom={
              <ListRow.Text typography="t7" color={colors.grey700}>
                {transaction.date}
              </ListRow.Text>
            }
          />
        )
      }
      right={
        <div style={{ minWidth: "74px", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <ListRow.Text typography="t6" fontWeight="bold" color={amountColor}>
            {formatSignedDollar(delta)}
          </ListRow.Text>
          <ListRow.Text typography="t7" color={colors.grey600}>
            ${dollarBalance.toLocaleString("en-US")}
          </ListRow.Text>
        </div>
      }
    />
  );
}

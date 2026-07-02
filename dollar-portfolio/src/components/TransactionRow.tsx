import { ListRow, Asset } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import type { DollarTransaction, TransactionType } from "../types";
import { formatSignedDollar, formatProfitKrw, formatDollar, formatRate, formatKrw } from "../utils/formatter";

function getSignedDelta(transaction: DollarTransaction): number {
  return transaction.type === "buy"
    ? Math.abs(transaction.dollarAmount)
    : -Math.abs(transaction.dollarAmount);
}

// eslint-disable-next-line react-refresh/only-export-components
export const typeMeta: Record<
  TransactionType,
  { label: string; iconName: string; backgroundColor: string; amountColor: string }
> = {
  buy: {
    label: "달러 환전",
    iconName: "icon-coin-dollar-sync",
    backgroundColor: colors.background,
    amountColor: colors.blue600,
  },
  sell: {
    label: "원화 환전",
    iconName: "icon-coin-won-sync",
    backgroundColor: colors.background,
    amountColor: colors.grey700,
  },
};

export function TransactionRow({
  transaction,
  dollarBalance,
  layout = "detail",
}: {
  transaction: DollarTransaction;
  dollarBalance: number;
  layout?: "detail" | "compact";
}) {
  const meta = typeMeta[transaction.type];
  const delta = getSignedDelta(transaction);
  const rateText = transaction.exchangeRate ? (
    <ListRow.Text typography="t7" color={colors.grey700}>
      {formatRate(transaction.exchangeRate)}
    </ListRow.Text>
  ) : (
    ""
  );

  return (
    <ListRow
      border="none"
      verticalPadding="small"
      horizontalPadding="small"
      left={
        <Asset.Icon
          name={meta.iconName}
          frameShape={{ width: 36, height: 36 }}
          backgroundColor={meta.backgroundColor}
        />
      }
      contents={
        layout === "detail" ? (
          <ListRow.Texts
            type="3RowTypeA"
            top={
              <ListRow.Text typography="t7" fontWeight="medium" color={colors.grey600}>
                {transaction.title}
              </ListRow.Text>
            }
            middle={rateText}
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
            bottom={rateText}
          />
        )
      }
      right={
        <div style={{ minWidth: "96px", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {transaction.type === "sell" && transaction.profitKrw !== undefined ? (
            <ListRow.Text typography="t7" fontWeight="bold" color={colors.grey700}>
              {formatKrw(transaction.krwAmount ?? 0)}{" "}
              <span style={{ color: transaction.profitKrw >= 0 ? colors.red500 : colors.blue500 }}>
                ({formatProfitKrw(transaction.profitKrw)})
              </span>
            </ListRow.Text>
          ) : (
            <ListRow.Text typography="t7" fontWeight="bold" color={meta.amountColor}>
              {formatSignedDollar(delta)}
            </ListRow.Text>
          )}
          <ListRow.Text typography="t7" color={colors.grey600}>
            잔액 {formatDollar(dollarBalance)}
          </ListRow.Text>
        </div>
      }
    />
  );
}

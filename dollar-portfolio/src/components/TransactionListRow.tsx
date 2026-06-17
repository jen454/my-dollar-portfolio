import { ListRow, Asset } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import type { DollarTransaction } from "../types";
import { getSignedChangeAmount } from "../utils/calculator";
import { formatSignedDollar, formatProfitKrw } from "../utils/formatter";
import { typeMeta } from "./TransactionRow";

function getSignedDelta(tx: DollarTransaction): number {
  if (tx.type === "buy") return Math.abs(tx.dollarAmount);
  if (tx.type === "sell") return -Math.abs(tx.dollarAmount);
  return getSignedChangeAmount(tx);
}

export function TransactionListRow({
  transaction,
  dollarBalance,
}: {
  transaction: DollarTransaction;
  dollarBalance: number;
}) {
  const meta = typeMeta[transaction.type];
  const delta = getSignedDelta(transaction);
  const isExchange = transaction.type === "buy" || transaction.type === "sell";
  const deltaColor = isExchange
    ? colors.grey700
    : delta >= 0 ? colors.red500 : colors.blue500;

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
        transaction.type === "buy" || transaction.type === "sell" ? (
          <ListRow.Texts
            type="2RowTypeA"
            top={
              <ListRow.Text typography="t7" fontWeight="medium" color={colors.grey600}>
                {transaction.title}
              </ListRow.Text>
            }
            bottom={
              transaction.exchangeRate ? (
                <ListRow.Text typography="t7" color={colors.grey600}>
                  ₩{transaction.exchangeRate.toLocaleString("ko-KR")}
                </ListRow.Text>
              ) : (
                ""
              )
            }
          />
        ) : (
          <ListRow.Text typography="t7" fontWeight="medium" color={colors.grey600}>
            {transaction.title}
          </ListRow.Text>
        )
      }
      right={
        <div style={{ minWidth: "74px", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <ListRow.Text typography="t6" fontWeight="bold" color={deltaColor}>
            {formatSignedDollar(delta)}
          </ListRow.Text>
          {transaction.type === "sell" && transaction.profitKrw !== undefined && (
            <ListRow.Text typography="t7" color={transaction.profitKrw >= 0 ? colors.red500 : colors.blue500}>
              {formatProfitKrw(transaction.profitKrw)}
            </ListRow.Text>
          )}
          <ListRow.Text typography="t7" color={colors.grey600}>
            ${dollarBalance.toLocaleString("en-US")}
          </ListRow.Text>
        </div>
      }
    />
  );
}

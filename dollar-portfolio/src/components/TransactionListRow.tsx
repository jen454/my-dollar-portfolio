import { ListRow } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { DollarTransaction } from "../hooks/useDollarPortfolio";
import { formatDollar } from "../utils/format";
import { typeMeta } from "./TransactionRow";

function getSignedDelta(tx: DollarTransaction): number {
  if (tx.type === "buy") return Math.abs(tx.dollarAmount);
  if (tx.type === "sell") return -Math.abs(tx.dollarAmount);
  return tx.dollarAmount;
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
  const deltaColor = delta >= 0 ? colors.red500 : colors.blue500;

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
            {formatDollar(delta)}
          </ListRow.Text>
          <ListRow.Text typography="t7" color={colors.grey600}>
            ${dollarBalance.toLocaleString("en-US")}
          </ListRow.Text>
        </div>
      }
    />
  );
}

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FixedBottomCTA, BottomSheet, Text } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import type { DollarTransaction, TransactionType } from "../types";
import { useDollarPortfolio } from "../hooks/useDollarPortfolio";
import {
  sortTransactionsByDateDesc,
  buildTransactionBalanceMap,
} from "../utils/calculator";
import { TransactionListRow } from "../components/TransactionListRow";
import { Calendar } from "../components/Calendar";

function parseTransactionDate(dateStr: string): Date {
  const normalized = dateStr.includes(".") ? dateStr.replaceAll(".", "-") : dateStr;
  return new Date(normalized + "T00:00:00");
}

const FILTER_OPTIONS: Array<{ name: string; value: string }> = [
  { name: "전체", value: "all" },
  { name: "달러 환전", value: "buy" },
  { name: "원화 환전", value: "sell" },
  { name: "달러 변동", value: "change" },
];

export function TransactionListPage() {
  const navigate = useNavigate();
  const today = new Date();
  const { storage } = useDollarPortfolio();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const balanceMap = useMemo(
    () => buildTransactionBalanceMap(storage.transactions),
    [storage.transactions],
  );

  const groupedTransactions = useMemo(() => {
    const filtered = storage.transactions.filter((tx) => {
      const d = parseTransactionDate(tx.date);
      const matchMonth = d.getFullYear() === year && d.getMonth() === month;
      const matchDay = selectedDay === null || d.getDate() === selectedDay;
      const matchFilter = filter === "all" || tx.type === (filter as TransactionType);
      return matchMonth && matchDay && matchFilter;
    });

    const sorted = sortTransactionsByDateDesc(filtered);

    const groups = new Map<string, { sortKey: number; transactions: DollarTransaction[] }>();
    sorted.forEach((tx) => {
      const d = parseTransactionDate(tx.date);
      const label = `${d.getMonth() + 1}월 ${d.getDate()}일`;
      if (!groups.has(label)) {
        groups.set(label, { sortKey: d.getTime(), transactions: [] });
      }
      groups.get(label)!.transactions.push(tx);
    });

    return Array.from(groups.entries())
      .sort((a, b) => b[1].sortKey - a[1].sortKey)
      .map(([label, { transactions }]) => ({ label, transactions }));
  }, [storage.transactions, year, month, selectedDay, filter]);

  const currentFilterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.name ?? "전체";

  return (
    <main style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: colors.grey50 }}>
      {/* Sticky calendar header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: colors.background, boxShadow: "0 1px 0 " + colors.grey100 }}>
        <Calendar
          transactions={storage.transactions}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
        />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, padding: "0 18px 120px" }}>
        {/* Filter dropdown trigger */}
        <div style={{ paddingTop: 14, paddingBottom: 8 }}>
          <button
            onClick={() => setFilterSheetOpen(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: 0,
            }}
          >
            <Text typography="t6" fontWeight="medium" color={colors.grey800}>
              {currentFilterLabel}
            </Text>
            <Text typography="t7" color={colors.grey400}>
              ▼
            </Text>
          </button>
        </div>

        {/* Transaction groups */}
        {selectedDay === null ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: colors.grey400, fontSize: 14 }}>
            날짜를 선택하면 거래 내역을 볼 수 있어요.
          </div>
        ) : groupedTransactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: colors.grey400, fontSize: 14 }}>
            거래 내역이 없습니다.
          </div>
        ) : (
          groupedTransactions.map(({ label, transactions }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <div style={{ paddingBottom: 6, fontSize: 13, fontWeight: 600, color: colors.grey600 }}>
                {label}
              </div>
              <div style={{ borderRadius: 15, overflow: "hidden", background: colors.background }}>
                {transactions.map((tx) => (
                  <TransactionListRow
                    key={tx.id}
                    transaction={tx}
                    dollarBalance={balanceMap.get(tx.id) ?? 0}
                  />
                ))}
              </div>
            </div>
          ))
        )}

      </div>

      {/* Filter bottom sheet */}
      <BottomSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        header={<BottomSheet.Header>거래 유형</BottomSheet.Header>}
      >
        <BottomSheet.Select
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setFilterSheetOpen(false);
          }}
        />
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

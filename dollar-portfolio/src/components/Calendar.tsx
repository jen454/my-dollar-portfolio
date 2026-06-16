import { useMemo } from "react";
import { Text } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { DollarTransaction } from "../hooks/useDollarPortfolio";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function parseTransactionDate(dateStr: string): Date {
  const normalized = dateStr.includes(".") ? dateStr.replaceAll(".", "-") : dateStr;
  return new Date(normalized + "T00:00:00");
}

export function Calendar({
  transactions,
  currentMonth,
  onMonthChange,
  selectedDay,
  onDaySelect,
}: {
  transactions: DollarTransaction[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDay: number | null;
  onDaySelect: (day: number | null) => void;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const txDays = useMemo(() => {
    const days = new Set<number>();
    transactions.forEach((tx) => {
      const d = parseTransactionDate(tx.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        days.add(d.getDate());
      }
    });
    return days;
  }, [transactions, year, month]);

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ padding: "10px 18px 8px", background: colors.background }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <button
          onClick={() => { onMonthChange(new Date(year, month - 1, 1)); onDaySelect(null); }}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: colors.grey500, padding: "4px 10px", lineHeight: 1 }}
        >
          ‹
        </button>
        <Text typography="t6" fontWeight="semibold" color={colors.grey800}>
          {year}년 {month + 1}월
        </Text>
        <button
          onClick={() => { onMonthChange(new Date(year, month + 1, 1)); onDaySelect(null); }}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: colors.grey500, padding: "4px 10px", lineHeight: 1 }}
        >
          ›
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "2px" }}>
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 500,
              color: i === 0 ? colors.red400 : i === 6 ? colors.blue400 : colors.grey400,
              padding: "3px 0",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const colIndex = i % 7;
          const isToday = isCurrentMonth && today.getDate() === day;
          const isSelected = selectedDay === day;
          const hasTx = txDays.has(day);
          const textColor = isSelected
            ? "#fff"
            : isToday
            ? colors.blue500
            : colIndex === 0
            ? colors.red500
            : colIndex === 6
            ? colors.blue500
            : colors.grey800;

          return (
            <div
              key={`day-${day}`}
              onClick={() => onDaySelect(selectedDay === day ? null : day)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3px 0", cursor: hasTx ? "pointer" : "default" }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isSelected
                    ? colors.blue500
                    : isToday
                    ? "#e8f3ff"
                    : "transparent",
                  fontSize: 12,
                  fontWeight: isSelected || isToday ? 700 : 400,
                  color: textColor,
                }}
              >
                {day}
              </div>
              <div style={{ height: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {hasTx && (
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: isSelected ? "#fff" : colors.blue400,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

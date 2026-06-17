import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Asset,
  FixedBottomCTA,
  GridList,
  ListRow,
  Text,
  TextField,
  SegmentedControl,
} from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useRecordStore } from "../store/recordStore";
import { useDollarPortfolio } from "../hooks/useDollarPortfolio";
import type {
  ChangeDirection,
  ChangeMemo,
  DollarTransaction,
  TransactionType,
} from "../types";
import {
  formatDollar,
  formatKrw,
  formatProfitKrw,
  formatRate,
} from "../utils/formatter";

const MEMO_OPTIONS: ChangeMemo[] = ["매도차익", "매도손실", "배당금", "계좌이자", "기타"];

const TYPE_OPTIONS: Array<{
  value: TransactionType;
  label: string;
  iconName: string;
}> = [
  { value: "buy", label: "달러로 환전", iconName: "icon-coin-dollar-sync" },
  { value: "sell", label: "원화로 환전", iconName: "icon-coin-won-sync" },
  { value: "change", label: "달러 변동", iconName: "icon-money-bag-dollar-green" },
];

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
  background: colors.background,
};

function todayForStorage(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function applyDateMask(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
}

// 숫자 입력 필드에서 쉼표 구분 표시를 위한 변환 함수
function commaizeNumber(value: string | number): string {
  const numStr = decommaizeNumberToString(value);
  if (numStr === "") return "";
  return Number(numStr).toLocaleString("en-US");
}

function decommaizeNumberToString(value: string | number): string {
  return String(value).replaceAll(",", "").replace(/[^0-9]/g, "");
}

function toNumber(value: string): number {
  const parsed = Number(decommaizeNumberToString(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function defaultTitle(type: TransactionType, memo: ChangeMemo | null): string {
  if (type === "buy") return "달러로 환전";
  if (type === "sell") return "원화로 환전";
  return memo ?? "달러 변동";
}

function PreviewRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <ListRow
      border="none"
      verticalPadding="small"
      horizontalPadding="small"
      contents={<ListRow.Text typography="t7" color={colors.grey700}>{label}</ListRow.Text>}
      right={
        <ListRow.Text typography="t7" fontWeight="semibold" color={tone ?? colors.grey900}>
          {value}
        </ListRow.Text>
      }
      a11yRightReflow={false}
    />
  );
}

export function AddRecordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingTransaction =
    (location.state as { transaction?: DollarTransaction } | null)?.transaction ?? null;
  const isEditMode = editingTransaction !== null;

  const addTransaction = useRecordStore((state) => state.addTransaction);
  const updateTransaction = useRecordStore((state) => state.updateTransaction);
  const { summary } = useDollarPortfolio();

  const [type, setType] = useState<TransactionType>(editingTransaction?.type ?? "buy");
  const [date, setDate] = useState(
    editingTransaction ? editingTransaction.date : todayForStorage(),
  );
  const [dollarInput, setDollarInput] = useState(
    editingTransaction && (editingTransaction.type === "change" || editingTransaction.type === "sell")
      ? String(Math.abs(editingTransaction.dollarAmount))
      : "",
  );
  const [rateInput, setRateInput] = useState(
    editingTransaction?.exchangeRate ? String(editingTransaction.exchangeRate) : "",
  );
  const [krwInput, setKrwInput] = useState(
    editingTransaction?.krwAmount ? String(editingTransaction.krwAmount) : "",
  );
  const [direction, setDirection] = useState<ChangeDirection>(
    editingTransaction?.direction ?? "plus",
  );
  const [memo, setMemo] = useState<ChangeMemo | null>(editingTransaction?.memo ?? null);

  const rateValue = toNumber(rateInput);
  const krwValue = toNumber(krwInput);
  const dollarInputValue = toNumber(dollarInput);

  // buy: 원화·환율 입력 → 달러 역산 / sell: 달러·환율 입력 → 원화 역산 / change: 달러만 입력
  const appliedRate = rateValue;
  const dollarAmount =
    type === "buy" ? (appliedRate > 0 ? krwValue / appliedRate : 0) : dollarInputValue;
  const appliedKrw =
    type === "buy" ? krwValue : type === "sell" ? dollarAmount * appliedRate : 0;

  // sell 시 비교할 현재 보유 달러. 수정 모드에서 기존 sell 기록은 이미 차감된 상태이므로 되돌려서 계산한다.
  const availableDollarForSell = useMemo(() => {
    if (isEditMode && editingTransaction?.type === "sell") {
      return summary.currentDollarAmount + Math.abs(editingTransaction.dollarAmount);
    }
    return summary.currentDollarAmount;
  }, [isEditMode, editingTransaction, summary.currentDollarAmount]);

  const exceedsHoldings = type === "sell" && dollarAmount > availableDollarForSell;

  const canSubmit =
    dollarAmount > 0 &&
    (type === "change" || (appliedRate > 0 && appliedKrw > 0)) &&
    !exceedsHoldings;

  const newAverageRateAfterBuy =
    dollarAmount > 0
      ? (summary.totalInvestedKrw + appliedKrw) / (summary.exchangedDollarAmount + dollarAmount)
      : summary.averageExchangeRate;

  const sellProfitThisTime = (appliedRate - summary.averageExchangeRate) * dollarAmount;

  const signedChangeAmount = direction === "minus" ? -dollarAmount : dollarAmount;
  const balanceAfterChange = summary.currentDollarAmount + signedChangeAmount;

  function handleSubmit() {
    if (!canSubmit) return;

    const base = {
      type,
      title: defaultTitle(type, memo),
      date,
    };

    let transaction: Omit<DollarTransaction, "id" | "createdAt">;
    if (type === "change") {
      transaction = {
        ...base,
        dollarAmount,
        direction,
        memo: memo ?? undefined,
      };
    } else {
      transaction = {
        ...base,
        dollarAmount,
        exchangeRate: appliedRate,
        krwAmount: appliedKrw,
      };
    }

    if (isEditMode && editingTransaction) {
      updateTransaction(editingTransaction.id, transaction);
    } else {
      addTransaction(transaction);
    }

    navigate("/");
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        width: "calc(100% - 36px)",
        minHeight: "100vh",
        margin: "0 auto",
        padding: "12px 0 0",
        gap: "16px",
      }}
    >
      {/* 거래 유형 선택 */}
      <div style={cardBase}>
        <div style={{ ...colFull, padding: "12px" }}>
          <Text typography="t6" fontWeight="semibold" color={colors.grey800} style={{ padding: "0 4px 8px" }}>
            거래 유형
          </Text>
          <GridList column={3}>
            {TYPE_OPTIONS.map((option) => {
              const isActive = type === option.value;
              return (
                <GridList.Item
                  key={option.value}
                  onClick={() => setType(option.value)}
                  style={{
                    cursor: "pointer",
                    borderRadius: "12px",
                    border: `1px solid ${colors.grey300}`,
                    background: isActive ? colors.grey100 : colors.background,
                  }}
                  image={
                    <Asset.Icon
                      name={option.iconName}
                      frameShape={{ width: 24, height: 24 }}
                      backgroundColor="transparent"
                    />
                  }
                >
                  <Text typography="t7" fontWeight={isActive ? "semibold" : "medium"} color={colors.grey900}>
                    {option.label}
                  </Text>
                </GridList.Item>
              );
            })}
          </GridList>
        </div>
      </div>

      {/* 거래 날짜 / 환전 금액 / 적용 환율 */}
      <div style={{ ...cardBase, padding: '0 0 16px' }}>
        {/* 거래 날짜 */}
        <div style={colFull}>
          <TextField
            variant="box"
            label="거래 날짜"
            labelOption="sustain"
            value={date}
            onChange={(e) => setDate(applyDateMask(e.target.value))}
            placeholder="YYYY.MM.DD"
            inputMode="numeric"
          />
        </div>

        {/* change: 변동 방향 토글 */}
        {type === "change" && (
          <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: "8px", width: "100%", boxSizing: "border-box" }}>
            <Text typography="t7" fontWeight="medium" color={colors.grey800}>변동 방향</Text>
            <SegmentedControl
              value={direction}
              onChange={(v) => setDirection(v as ChangeDirection)}
            >
              <SegmentedControl.Item value="plus">달러 증가</SegmentedControl.Item>
              <SegmentedControl.Item value="minus">달러 감소</SegmentedControl.Item>
            </SegmentedControl>
          </div>
        )}

        {/* 환전 금액: buy는 원화 입력, sell/change는 달러 입력 */}
        <div style={colFull}>
          {type === "buy" ? (
            <TextField
              variant="box"
              label="환전 금액"
              labelOption="sustain"
              value={krwInput}
              onChange={(e) => setKrwInput(e.target.value)}
              prefix="₩"
              placeholder="0"
              inputMode="numeric"
              format={{ transform: (v) => commaizeNumber(v), reset: (v) => decommaizeNumberToString(v) }}
            />
          ) : (
            <TextField
              variant="box"
              label={type === "sell" ? "환전 달러" : "변동 달러"}
              labelOption="sustain"
              value={dollarInput}
              onChange={(e) => setDollarInput(e.target.value)}
              prefix="$"
              placeholder="0"
              inputMode="numeric"
              format={{ transform: (v) => commaizeNumber(v), reset: (v) => decommaizeNumberToString(v) }}
            />
          )}
        </div>

        {/* buy/sell: 적용 환율 입력 */}
        {type !== "change" && (
          <div style={colFull}>
            <TextField
              variant="box"
              label="적용 환율"
              labelOption="sustain"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              prefix="₩"
              placeholder="0"
              inputMode="numeric"
              format={{ transform: (v) => commaizeNumber(v), reset: (v) => decommaizeNumberToString(v) }}
            />
          </div>
        )}

        {/* change: 구분 칩 */}
        {type === "change" && (
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "6px", width: "100%", boxSizing: "border-box" }}>
            <Text typography="t7" fontWeight="medium" color={colors.grey800} style={{ paddingLeft: "4px" }}>구분</Text>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {MEMO_OPTIONS.map((option) => {
              const isActive = memo === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMemo(isActive ? null : option)}
                  style={{
                    border: "none",
                    borderRadius: "999px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: isActive ? colors.green50 : colors.grey100,
                    color: isActive ? colors.green600 : colors.grey500,
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
          </div>
        )}

        {/* 미리보기 — 패딩 안쪽에 회색 둥근 박스 */}
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ background: colors.grey50, borderRadius: "12px" }}>
            {type === "buy" && (
              <>
                <PreviewRow label="원화 지출" value={formatKrw(appliedKrw)} />
                <PreviewRow label="적용 환율" value={formatRate(appliedRate)} />
                <PreviewRow label="받은 달러" value={formatDollar(dollarAmount)} />
                <PreviewRow label="입력 후 평균단가" value={formatRate(newAverageRateAfterBuy)} />
              </>
            )}
            {type === "sell" && (
              <>
                <PreviewRow label="수령 원화" value={formatKrw(appliedKrw)} />
                <PreviewRow label="적용 환율" value={formatRate(appliedRate)} />
                <PreviewRow label="판매 달러" value={formatDollar(dollarAmount)} />
                <PreviewRow
                  label="이번 환전 손익 (평균단가 기준)"
                  value={formatProfitKrw(sellProfitThisTime)}
                  tone={sellProfitThisTime >= 0 ? colors.red500 : colors.blue500}
                />
              </>
            )}
            {type === "change" && (
              <>
                <PreviewRow
                  label="변동 달러"
                  value={`${direction === "plus" ? "+" : "-"}${formatDollar(dollarAmount)}`}
                  tone={direction === "plus" ? colors.red500 : colors.blue500}
                />
                <PreviewRow label="투입 원화 변동" value="₩0 (변동 없음)" />
                <PreviewRow label="입력 후 보유 달러 잔액" value={formatDollar(balanceAfterChange)} />
              </>
            )}
          </div>
        </div>
      </div>

      {exceedsHoldings && (
        <Text typography="t7" color={colors.red500}>
          현재 보유 달러({formatDollar(summary.currentDollarAmount)})보다 많이 입력했어요.
        </Text>
      )}

      <FixedBottomCTA
        size="large"
        disabled={!canSubmit}
        onClick={handleSubmit}
        bottomAccessory={
          <Text
            typography="t7"
            color={colors.greyOpacity600}
            style={{ margin: "-10px 0 0", lineHeight: "1.5", textAlign: "center" }}
          >
            한국수출입은행 기준환율 기반 단순 계산입니다.
            <br />
            투자 조언을 제공하지 않습니다.
          </Text>
        }
      >
        {isEditMode ? "기록 수정하기" : "기록 추가하기"}
      </FixedBottomCTA>
    </main>
  );
}

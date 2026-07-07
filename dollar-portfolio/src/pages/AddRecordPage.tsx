import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Analytics } from "@apps-in-toss/web-framework";
import {
  Asset,
  BottomSheet,
  FixedBottomCTA,
  GridList,
  ListRow,
  Text,
  TextButton,
  TextField,
} from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useRecordStore } from "../store/recordStore";
import { useDollarPortfolio } from "../hooks/useDollarPortfolio";
import type { DollarTransaction, TransactionType } from "../types";
import {
  formatDollar,
  formatKrw,
  formatProfitKrw,
  formatRate,
} from "../utils/formatter";

const TYPE_OPTIONS: Array<{
  value: TransactionType;
  label: string;
  iconName: string;
}> = [
  { value: "buy", label: "달러로 환전", iconName: "icon-coin-dollar-sync" },
  { value: "sell", label: "원화로 환전", iconName: "icon-coin-won-sync" },
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

// 정수 필드(원화)용: 쉼표 추가, 소수점 제거
function commaizeNumber(value: string | number): string {
  const numStr = String(value).replaceAll(",", "").replace(/[^0-9]/g, "");
  if (numStr === "") return "";
  return Number(numStr).toLocaleString("en-US");
}

function decommaizeNumberToString(value: string | number): string {
  return String(value).replaceAll(",", "").replace(/[^0-9]/g, "");
}

// 소수점 필드(달러·환율)용: 정수부에 쉼표, 소수점 2자리까지 허용
function commaizeDecimal(value: string | number): string {
  const raw = String(value).replaceAll(",", "").replace(/[^0-9.]/g, "");
  if (raw === "" || raw === ".") return raw;
  const [intPart, decPart] = raw.split(".");
  const formattedInt = Number(intPart || "0").toLocaleString("en-US");
  if (decPart !== undefined) return `${formattedInt}.${decPart.slice(0, 2)}`;
  return formattedInt;
}

function decommaizeDecimal(value: string | number): string {
  return String(value).replaceAll(",", "").replace(/[^0-9.]/g, "");
}

function toNumber(value: string): number {
  const parsed = Number(decommaizeDecimal(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function defaultTitle(type: TransactionType): string {
  return type === "buy" ? "달러로 환전" : "원화로 환전";
}

// 입력 중 이탈(환전 내역 확인 등) 후 재진입 시 복원용 임시 저장
const DRAFT_KEY = "add-record-draft";
// 목적이 "환전 내역 확인하러 나갔다 오기"이므로 짧게 유지 — 길면 다음날 유령 값처럼 보임
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

interface RecordDraft {
  type: TransactionType;
  date: string;
  dollarInput: string;
  krwInput: string;
  savedAt: number;
}

function loadDraft(): RecordDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RecordDraft;
    if (Date.now() - draft.savedAt > DRAFT_TTL_MS) return null;
    return draft;
  } catch {
    return null;
  }
}

function saveDraft(draft: Omit<RecordDraft, "savedAt">) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // 저장 실패 시 무시 (draft는 편의 기능)
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 무시
  }
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
  const saveError = useRecordStore((state) => state.saveError);
  const clearSaveError = useRecordStore((state) => state.clearSaveError);
  const { summary } = useDollarPortfolio();

  const [draft] = useState(() => (editingTransaction ? null : loadDraft()));

  const [type, setType] = useState<TransactionType>(
    editingTransaction?.type ?? draft?.type ?? "buy",
  );
  const [date, setDate] = useState(
    editingTransaction ? editingTransaction.date : draft?.date ?? todayForStorage(),
  );
  const [dollarInput, setDollarInput] = useState(
    editingTransaction
      ? String(Math.abs(editingTransaction.dollarAmount))
      : draft?.dollarInput ?? "",
  );
  const [krwInput, setKrwInput] = useState(
    editingTransaction?.krwAmount
      ? String(editingTransaction.krwAmount)
      : draft?.krwInput ?? "",
  );

  // 입력 중 이탈 대비 draft 저장 (수정 모드 제외)
  useEffect(() => {
    if (isEditMode) return;
    if (dollarInput === "" && krwInput === "") return;
    saveDraft({ type, date, dollarInput, krwInput });
  }, [isEditMode, type, date, dollarInput, krwInput]);

  // draft 복원 사실을 사용자에게 알린다 — 안내 없이 복원하면 "웬 값이 있지?" 하는 버그로 오해함
  const [restoredFromDraft, setRestoredFromDraft] = useState(
    () => draft !== null && (draft.dollarInput !== "" || draft.krwInput !== ""),
  );
  const [amountHelpOpen, setAmountHelpOpen] = useState(false);

  function discardDraft() {
    clearDraft();
    setRestoredFromDraft(false);
    setType("buy");
    setDate(todayForStorage());
    setDollarInput("");
    setKrwInput("");
  }

  // 퍼널 계측: 폼에서 실제로 입력을 시작했는지 (진입 후 즉시 이탈과 구분)
  // draft 복원으로 값이 이미 있으면 이전 세션에서 집계됐으므로 다시 보내지 않는다
  const [hasStartedInput, setHasStartedInput] = useState(
    () => draft !== null && (draft.dollarInput !== "" || draft.krwInput !== ""),
  );
  useEffect(() => {
    if (hasStartedInput || isEditMode) return;
    if (dollarInput === "" && krwInput === "") return;
    setHasStartedInput(true);
    Analytics.click({ log_name: "transaction_input_start", type });
  }, [hasStartedInput, isEditMode, dollarInput, krwInput, type]);

  // 두 금액은 유형이 바뀌어도 의미가 유지되므로 초기화하지 않는다
  function handleTypeChange(newType: TransactionType) {
    setType(newType);
  }

  const krwValue = toNumber(krwInput);
  const dollarAmount = toNumber(dollarInput);

  // 원화·달러 두 금액 입력 → 실제 매매환율 역산 (우대율 반영된 정확한 값)
  const appliedRate = dollarAmount > 0 ? krwValue / dollarAmount : 0;
  const appliedKrw = krwValue;

  const isValidDate = (() => {
    if (date.length !== 10) return false;
    const normalized = date.replaceAll(".", "-");
    const parsed = new Date(`${normalized}T00:00:00`);
    if (isNaN(parsed.getTime())) return false;
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}` === normalized;
  })();

  const noAverageRate = type === "sell" && summary.averageExchangeRate === 0;

  const canSubmit = isValidDate && dollarAmount > 0 && krwValue > 0;

  const newAverageRateAfterBuy =
    dollarAmount > 0
      ? (summary.totalInvestedKrw + appliedKrw) / (summary.exchangedDollarAmount + dollarAmount)
      : summary.averageExchangeRate;

  // 평균단가가 없으면(직전에 buy 기록이 모두 사라진 경우) 손익을 계산할 근거가 없으므로 0으로 고정한다.
  // 기록 잔액을 초과해 파는 달러(주식 수익 등 기록에 없는 달러)는 원가를 알 수 없으므로
  // 이번 환전 환율을 원가로 간주 → 손익 0. 즉 기록된 잔액 몫까지만 손익을 계산한다.
  // 수정 모드에서는 summary에 이 거래의 증감이 이미 반영돼 있으므로 되돌려서 잔액을 구한다.
  const balanceBeforeThis = isEditMode && editingTransaction
    ? editingTransaction.type === "sell"
      ? summary.currentDollarAmount + Math.abs(editingTransaction.dollarAmount)
      : Math.max(0, summary.currentDollarAmount - Math.abs(editingTransaction.dollarAmount))
    : summary.currentDollarAmount;
  const profitEligibleDollar = Math.min(dollarAmount, balanceBeforeThis);
  const isOverBalanceSell = type === "sell" && dollarAmount > balanceBeforeThis;
  const sellProfitThisTime =
    summary.averageExchangeRate === 0
      ? 0
      : (appliedRate - summary.averageExchangeRate) * profitEligibleDollar;

  async function handleSubmit() {
    if (!canSubmit) return;

    const transaction: Omit<DollarTransaction, "id" | "createdAt"> = {
      type,
      title: defaultTitle(type),
      date,
      dollarAmount,
      exchangeRate: appliedRate,
      krwAmount: appliedKrw,
      ...(type === "sell" && { profitKrw: sellProfitThisTime }),
    };

    clearSaveError();
    if (isEditMode && editingTransaction) {
      await updateTransaction(editingTransaction.id, transaction);
    } else {
      await addTransaction(transaction);
    }

    if (!useRecordStore.getState().saveError) {
      Analytics.click({ log_name: "transaction_save_complete", type });
      clearDraft();
      navigate("/");
    }
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
          <GridList column={2}>
            {TYPE_OPTIONS.map((option) => {
              const isActive = type === option.value;
              return (
                <GridList.Item
                  key={option.value}
                  onClick={() => handleTypeChange(option.value)}
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

      {restoredFromDraft && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <Text typography="t7" color={colors.grey600}>작성하던 내용을 불러왔어요</Text>
          <TextButton size="small" color={colors.grey500} onClick={discardDraft}>지우기</TextButton>
        </div>
      )}

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
            hasError={!isValidDate && date.length === 10}
            help={!isValidDate && date.length === 10 ? "올바르지 않은 날짜예요. (예: 2026.06.19)" : undefined}
          />
        </div>

        {/* 원화·달러 두 금액 입력 → 적용 환율 자동 계산 */}
        {type === "buy" ? (
          <>
            <div style={colFull}>
              <TextField
                variant="box"
                label="낸 원화"
                labelOption="sustain"
                value={krwInput}
                onChange={(e) => setKrwInput(e.target.value)}
                prefix="₩"
                placeholder="0"
                inputMode="numeric"
                format={{ transform: (v) => commaizeNumber(v), reset: (v) => decommaizeNumberToString(v) }}
              />
            </div>
            <div style={colFull}>
              <TextField
                variant="box"
                label="받은 달러"
                labelOption="sustain"
                value={dollarInput}
                onChange={(e) => setDollarInput(e.target.value)}
                prefix="$"
                placeholder="0.00"
                inputMode="decimal"
                format={{ transform: (v) => commaizeDecimal(v), reset: (v) => decommaizeDecimal(v) }}
              />
            </div>
          </>
        ) : (
          <>
            <div style={colFull}>
              <TextField
                variant="box"
                label="판 달러"
                labelOption="sustain"
                value={dollarInput}
                onChange={(e) => setDollarInput(e.target.value)}
                prefix="$"
                placeholder="0.00"
                inputMode="decimal"
                format={{ transform: (v) => commaizeDecimal(v), reset: (v) => decommaizeDecimal(v) }}
              />
            </div>
            <div style={colFull}>
              <TextField
                variant="box"
                label="받은 원화"
                labelOption="sustain"
                value={krwInput}
                onChange={(e) => setKrwInput(e.target.value)}
                prefix="₩"
                placeholder="0"
                inputMode="numeric"
                format={{ transform: (v) => commaizeNumber(v), reset: (v) => decommaizeNumberToString(v) }}
                help={
                  noAverageRate
                    ? "환전 기록이 없어 평균단가를 계산할 수 없어요. 손익은 0으로 저장돼요."
                    : undefined
                }
              />
            </div>
          </>
        )}

        {/* 금액 확인 경로 도움말 (접힌 형태 — 필요한 사람만 연다) */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 20px 0" }}>
          <TextButton size="small" color={colors.grey500} onClick={() => setAmountHelpOpen(true)}>
            금액을 어디서 확인하나요?
          </TextButton>
        </div>

        {/* 미리보기 — 패딩 안쪽에 회색 둥근 박스 */}
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ background: colors.grey50, borderRadius: "12px" }}>
            {type === "buy" && (
              <>
                <PreviewRow label="낸 원화" value={formatKrw(appliedKrw)} />
                <PreviewRow
                  label="적용 환율"
                  value={appliedRate > 0 ? formatRate(appliedRate) : "자동 계산돼요"}
                  tone={appliedRate > 0 ? undefined : colors.grey400}
                />
                <PreviewRow label="받은 달러" value={formatDollar(dollarAmount)} />
                <PreviewRow label="입력 후 평균단가" value={formatRate(newAverageRateAfterBuy)} />
                <div style={{ height: 1, background: colors.grey100, margin: "4px 12px" }} />
                <PreviewRow
                  label="거래 후 원금"
                  value={formatKrw(summary.totalInvestedKrw + appliedKrw)}
                />
                <PreviewRow
                  label="거래 후 달러"
                  value={formatDollar(summary.currentDollarAmount + dollarAmount)}
                />
              </>
            )}
            {type === "sell" && (
              <>
                <PreviewRow label="받은 원화" value={formatKrw(appliedKrw)} />
                <PreviewRow
                  label="적용 환율"
                  value={appliedRate > 0 ? formatRate(appliedRate) : "자동 계산돼요"}
                  tone={appliedRate > 0 ? undefined : colors.grey400}
                />
                <PreviewRow label="판 달러" value={formatDollar(dollarAmount)} />
                <PreviewRow
                  label="환전 손익"
                  value={formatProfitKrw(sellProfitThisTime)}
                  tone={sellProfitThisTime > 0 ? colors.red500 : sellProfitThisTime < 0 ? colors.blue500 : colors.grey900}
                />
                <div style={{ height: 1, background: colors.grey100, margin: "4px 12px" }} />
                <PreviewRow
                  label="거래 후 원금"
                  value={formatKrw(Math.max(0, summary.totalInvestedKrw - summary.averageExchangeRate * dollarAmount))}
                />
              </>
            )}
          </div>
          {isOverBalanceSell && (
            <Text
              typography="t7"
              color={colors.grey600}
              style={{ display: "block", padding: "8px 4px 0", textAlign: "center" }}
            >
              기록된 달러({formatDollar(balanceBeforeThis)})보다 많이 팔았어요.
              <br />
              초과분은 원가를 알 수 없어 손익 없이 계산돼요
            </Text>
          )}
          {appliedRate > 0 && (
            <Text
              typography="t7"
              color={colors.grey500}
              style={{ display: "block", padding: "8px 4px 0", textAlign: "center" }}
            >
              두 금액으로 계산한 실효 환율이라 증권사 표시 환율과
              <br />
              소수점 끝자리가 다를 수 있어요
            </Text>
          )}
        </div>
      </div>

      {saveError && (
        <Text typography="t7" color={colors.red500} style={{ textAlign: "center" }}>
          {saveError}
        </Text>
      )}

      <BottomSheet
        open={amountHelpOpen}
        onClose={() => setAmountHelpOpen(false)}
        header={<BottomSheet.Header>금액 확인 방법</BottomSheet.Header>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "4px 20px 32px" }}>
          <Text typography="t6" fontWeight="bold" color={colors.grey800}>
            토스증권 &gt; 거래내역 &gt; 환전
          </Text>
          <Text typography="t7" color={colors.grey600}>
            환전 거래를 누르면 {type === "buy" ? "낸 원화와 받은 달러" : "판 달러와 받은 원화"}를 볼 수 있어요.
            두 금액을 그대로 입력하면 적용 환율은 자동으로 계산돼요.
          </Text>
          <div style={{ background: colors.grey50, borderRadius: "10px", padding: "10px 14px" }}>
            <Text typography="t7" color={colors.grey600}>
              환율을 직접 입력하지 않아도 돼요. 두 금액으로 계산한 환율이 우대율까지 반영된 실제 환율이에요.
              원 단위 반올림 때문에 증권사 표시 환율과 소수점 끝자리가 다를 수 있어요.
            </Text>
          </div>
        </div>
      </BottomSheet>

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

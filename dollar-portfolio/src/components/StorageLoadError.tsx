import { Button, Text } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useRecordStore } from "../store/recordStore";

/**
 * 저장된 기록을 읽지 못했을 때의 화면. 빈 화면을 보여주면 사용자가 새 기록을 추가해
 * 기존 기록을 덮어쓸 수 있으므로, 다시 읽기 전까지 다른 화면으로 넘어가지 않는다.
 */
export function StorageLoadError() {
  const loadFromStorage = useRecordStore((s) => s.loadFromStorage);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "0 24px",
        gap: "8px",
        textAlign: "center",
      }}
    >
      <Text typography="t5" fontWeight="bold" color={colors.grey800}>
        기록을 불러오지 못했어요
      </Text>
      <Text typography="t7" color={colors.grey600} style={{ marginBottom: "12px" }}>
        저장된 기록은 지워지지 않았어요. 다시 시도해주세요.
      </Text>
      <Button size="medium" onClick={() => loadFromStorage()}>
        다시 시도
      </Button>
    </main>
  );
}

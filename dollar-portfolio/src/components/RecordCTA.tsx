import { Analytics } from "@apps-in-toss/web-framework";
import { FixedBottomCTA, Text } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";

export function RecordCTA({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <FixedBottomCTA
      size="large"
      onClick={() => {
        Analytics.click({ log_name: "record_cta_click", label });
        onClick();
      }}
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
      {label}
    </FixedBottomCTA>
  );
}

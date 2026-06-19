import { colors } from "@toss/tds-colors";

const spinnerKeyframes = `
@keyframes dollar-spinner {
  to { transform: rotate(360deg); }
}
`;

export function PageSpinner() {
  return (
    <>
      <style>{spinnerKeyframes}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `3px solid ${colors.grey100}`,
            borderTopColor: colors.grey400,
            animation: "dollar-spinner 0.7s linear infinite",
          }}
        />
      </div>
    </>
  );
}

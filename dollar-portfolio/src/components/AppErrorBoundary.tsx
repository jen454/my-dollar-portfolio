import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * 렌더링 오류로 흰 화면이 되는 것을 막는다.
 * TDS 컴포넌트가 오류의 원인일 수 있어 대체 화면은 기본 HTML로만 그린다.
 */
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "0 24px",
          gap: "16px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#333d4b" }}>
          화면을 표시하지 못했어요
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: 10,
            background: "#3182F6",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          다시 열기
        </button>
      </main>
    );
  }
}

import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "dollar-portfolio",
  brand: {
    displayName: "달러 평단 계산기", // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: "#3182F6", // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: "https://static.toss.im/appsintoss/41453/4bd83738-69ea-4a77-9860-5bf6388da334.png", // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
  webViewProps: {
    type: 'partner',
  },
});

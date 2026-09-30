import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "dollar-portfolio",

  brand: {
    // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    primaryColor: "#3182F6"
  },

  permissions: [],
  webBundleDir: "dist",
  webView: {}
});

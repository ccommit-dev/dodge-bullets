import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "dodge-bullets",
  brand: {
    displayName: "총알 피하기", // 콘솔에 등록한 국문 앱 이름과 맞추세요.
    primaryColor: "#5EEAD4",
    icon: "", // 콘솔에 업로드한 아이콘 URL을 넣어주세요.
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
});

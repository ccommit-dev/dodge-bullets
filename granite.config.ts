import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  // 콘솔 appName과 동일해야 해요.
  appName: "dodgebullets",
  brand: {
    displayName: "총알피하기",
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

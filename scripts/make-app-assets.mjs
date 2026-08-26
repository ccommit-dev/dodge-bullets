/**
 * 앱 아이콘·스플래시 원본 생성 — assets/icon.svg 하나에서 전부 파생한다.
 *
 *   node scripts/make-app-assets.mjs
 *
 * 산출물 (@capacitor/assets 입력 규격):
 *   assets/icon.png        1024×1024  아이콘 원본
 *   assets/splash.png      2732×2732  스플래시 (라이트)
 *   assets/splash-dark.png 2732×2732  스플래시 (다크) — 게임이 다크 단일 톤이라 동일
 *
 * 이후 `npx capacitor-assets generate`가 android/ios 리소스를 만든다.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "assets/icon.svg"));

const BG = "#0b1220";

// 아이콘 1024²
await sharp(svg).resize(1024, 1024).png().toFile(join(root, "assets/icon.png"));

// 스플래시 2732² — 중앙에 아이콘 마크(배경 제거 버전 대신 그대로, 축소 배치)
const mark = await sharp(svg).resize(880, 880).png().toBuffer();
const splash = sharp({
  create: { width: 2732, height: 2732, channels: 4, background: BG },
}).composite([{ input: mark, gravity: "center" }]);
await splash.clone().png().toFile(join(root, "assets/splash.png"));
await splash.clone().png().toFile(join(root, "assets/splash-dark.png"));

console.log("generated: assets/icon.png (1024²), assets/splash.png + splash-dark.png (2732²)");

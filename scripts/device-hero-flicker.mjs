/**
 * 기기 녹화로 주인공 깜빡임 찾기 (2026-10-19) — node scripts/device-hero-flicker.mjs [초=25] [outDir]
 * 에뮬레이터/폰에서 사냥터를 adb screenrecord 로 찍고(ffmpeg 필요) 30fps 칸마다 주인공 자리의 어두운 윤곽 화소를 센다.
 * 1~4 칸만 몸이 비고 앞뒤 칸은 다 보이면 깜빡임이다(장면 전환 · 스킬 빛은 길거나 서서히라 걸러진다).
 * 찾은 까닭: 한 칸에서 background-image 를 대기 → 공격 시트로 갈아 끼우면 안드로이드 WebView 가 큰 시트를 다시 풀며 몸이 1~3 칸 사라졌다
 * (헤드리스 크롬에선 안 보인다). 고친 뒤(세 시트를 다 깔아 두기, EquippedCharacter) 10초 5번 → 25초 0번.
 * 준비: 앱이 사냥터에 떠 있어야 한다(device-play.mjs 뒤 또는 손으로). 기본 상자는 540×1200 녹화의 사냥터 주인공 자리
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const secs = Number(process.argv[2] ?? 25);
const OUT = process.argv[3] ?? "store/device/flicker";
const BOX = (process.env.HERO_BOX ?? "160,460,80,100").split(",").map(Number);   // 540×1200 녹화 좌표 x,y,w,h
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const env = { ...process.env, MSYS_NO_PATHCONV: "1" };
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (/^g\d+\.png$/.test(f)) rmSync(join(OUT, f));
execFileSync(ADB, ["shell", "screenrecord", "--time-limit", String(secs), "--size", "540x1200", "/sdcard/hero-flicker.mp4"], { env, stdio: "inherit" });
execFileSync(ADB, ["pull", "/sdcard/hero-flicker.mp4", join(OUT, "rec.mp4")], { env });
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", join(OUT, "rec.mp4"), "-vf", "fps=30", join(OUT, "g%04d.png")]);

const [x, y, w, h] = BOX;
const files = readdirSync(OUT).filter((f) => /^g\d+\.png$/.test(f)).sort();
const vals = [];
for (const f of files) {
  const { data, info } = await sharp(join(OUT, f)).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let i = 0; i < data.length; i += info.channels) if (data[i] + data[i + 1] + data[i + 2] < 200) dark += 1;
  vals.push(dark);
}
const med = [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)];
const runs = []; let s0 = -1;
vals.forEach((v, i) => { const low = v < med * 0.35; if (low && s0 < 0) s0 = i; if (!low && s0 >= 0) { runs.push([s0, i - 1]); s0 = -1; } });
const flick = runs.filter(([a, b]) => b - a + 1 <= 4 && a > 0 && b < vals.length - 1 && vals[a - 1] >= med * 0.6 && vals[b + 1] >= med * 0.6);
console.log(`칸 ${vals.length} · 윤곽 중앙값 ${med} · 깜빡임 ${flick.length}번${flick.length ? " — " + flick.map(([a, b]) => `g${String(a + 1).padStart(4, "0")}~${b + 1}`).join(" ") : ""}`);
console.log(flick.length ? "FAIL 주인공이 1~4 칸 사라진다" : "PASS 주인공 깜빡임 없음");
process.exit(flick.length ? 1 : 0);

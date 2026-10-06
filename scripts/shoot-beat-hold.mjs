// 비트 홀드 연출 캡처 (2026-10-06) — 유지 중(빛줄기·진행률 고리) · 끊김 · 완료 세 상태를 drawBeatFrame 으로 그려 PNG 로 (vite 5173)
//   node scripts/shoot-beat-hold.mjs <outDir>
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-beat-hold"; mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 760, deviceScaleFactor: 1 });
await page.goto("http://localhost:5173", { waitUntil: "networkidle0" });
const shots = await page.evaluate(async () => {
  const W = await import("/src/beat/world.ts");
  const D = await import("/src/beat/draw.ts");
  const T = await import("/src/beat/tracks.ts");
  const track = T.getCampaignStage(3);
  const out = {};
  for (const mode of ["holding", "break", "done", "spikes"]) {
    const cos = { ringSkin: mode === "spikes" ? "gold" : "neon", spikeSkin: mode === "spikes" ? "star" : "triangle", ownedRings: ["neon", "gold"], ownedSpikes: ["triangle", "star"] };
    const w = W.createBeatWorld(390, 760, 1, track, "boots", 0, cos);
    const chart = Array.from({ length: 40 }, (_, i) => ({ sound: ["boots", "rim", "cats", "throat"][i % 4], spike: i % 2 === 0 }));
    chart[4] = { sound: "rim", spike: true, hold: 6, holdSteps: 6 };
    w.chart = chart;
    w.beatPosition = mode === "holding" ? 6.8 : 7;
    w.elapsedMs = 1234;
    if (mode === "holding") { w.holdLane = W.laneOfSound("rim"); w.holdStartStep = 4; w.holdEndStep = 10; w.hitSteps.add(4); w.judgeText = "HOLD ▸ 유지"; w.judgeMs = 300; }
    if (mode === "break") { w.hitSteps.add(4); w.holdFx = [{ lane: W.laneOfSound("rim"), kind: "break", ms: 520, progress: 0.4 }]; w.judgeText = "HOLD 끊김"; w.judgeMs = 400; }
    if (mode === "done") { w.hitSteps.add(4); w.holdFx = [{ lane: W.laneOfSound("rim"), kind: "done", ms: 420, progress: 1 }]; w.judgeText = "HOLD 완료!"; w.judgeMs = 400; }
    const c = document.createElement("canvas"); c.width = 390; c.height = 760;
    const ctx = c.getContext("2d");
    D.drawBeatFrame(ctx, w);
    out[mode] = c.toDataURL("image/png").split(",")[1];
  }
  return out;
});
for (const [k, v] of Object.entries(shots)) writeFileSync(`${OUT}/hold-${k}.png`, Buffer.from(v, "base64"));
console.log("ok", Object.keys(shots).join(","));
await browser.close();

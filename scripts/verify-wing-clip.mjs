/**
 * 날개 · 큰 장식 동료가 전장 끝에서 잘리지 않는다 (2026-11-03) — verify-anim-clip 은 옛 동료 파티로만 돌고 그린 몸 45% 만 잰다.
 * 시트의 실제 그림 끝(알파)을 칸 비율로 재서, 교전 중 그 그림이 전장 왼쪽 밖으로 나가는 픽셀을 본다.
 *   node scripts/verify-wing-clip.mjs   (vite dev 서버 5173 필요)
 */
import sharp from "sharp";
// 저장 심기는 게임 없는 favicon 페이지에서 — 떠 있는 게임이 비동기로 옛 저장을 써 심은 값을 덮었다(전체 실행에서만 드물게: 골드 31 · 표본 0 · 창을 심었는데 검, 2026-11-04)
import { readFileSync } from "node:fs";
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const L = JSON.parse(readFileSync("art-gen/anim-layout.json", "utf8")).ally, [CW, CH] = L.cell;
const WIDE = ["celes", "phoenix", "inferno", "gaia", "aurora", "leviathan", "coral", "willow"];

/** 대기 · 걷기 · 피격 줄에서 칸 왼쪽 끝부터 그림까지의 최소 비율(공격 줄은 앞으로 나가 왼쪽 여유가 더 크다) */
const inkLeft = {};
for (const id of WIDE) {
  let min = 1;
  for (const row of [L.actions.idle, L.actions.walk, L.actions.hit, L.actions.attack]) {
    for (let f = 0; f < row.frames; f += 1) {
      const { data, info } = await sharp(`public/titans/anim/allies/${id}.webp`).extract({ left: f * CW, top: row.row * CH, width: CW, height: CH }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let x = 0; x < CW && x / CW < min; x += 1) { let hit = false; for (let y = 0; y < CH; y += 2) if (data[(y * CW + x) * info.channels + 3] > 40) { hit = true; break; } if (hit) { min = x / CW; break; } }
    }
  }
  inkLeft[id] = min;
}
console.log("칸 왼쪽 ~ 그림 끝", Object.entries(inkLeft).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(" · "));

const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
for (const [w, h] of [[390, 844], [360, 640]]) {
  for (const party of [["celes", "phoenix", "inferno", "gaia"], ["aurora", "leviathan", "coral", "willow"], ["phoenix", "inferno", "celes", "gaia"]]) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.goto(BASE, { waitUntil: "networkidle0" });
    const progress = { version: 5, onboardingStep: 4, level: 40, redGems: 500, idleClaimedAt: now, updatedAt: now, titanBestStage: 30, pioneeredArea: 5, partyIds: party, partyCap: 4, sessionCount: 9 };
    const titans = { stage: 12, bestStage: 30, gold: 500000, heroes: Object.fromEntries(party.map((id) => [id, 5])), party, lastActiveAt: now };
    await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" }); await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
      [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
      [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
    }).catch(() => {});
    await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
    await sleep(1800);
    await page.evaluate(() => document.querySelector(".idle-claim")?.click());
    let worst = { over: -999 }; let samples = 0; const seen = new Set();
    for (let t = 0; t < 110; t += 1) {
      const rows = await page.evaluate((ink) => {
        const field = document.querySelector(".titans-field");
        if (!field || !field.className.includes("phase-combat") || document.querySelector(".titans-field.party-entering")) return [];
        const c = field.getBoundingClientRect();
        return [...field.querySelectorAll(".titan-ally-art")].flatMap((a) => {
          const id = [...a.classList].find((k) => k.startsWith("ally-"))?.slice(5), s = a.querySelector(".ally-sprite"), body = a.querySelector(".ally-body");
          if (!id || ink[id] === undefined || !s || a.classList.contains("is-approaching")) return [];
          if ([...document.querySelectorAll(".titans-allies")].some((n) => /party-(walk-in|run)/.test(getComputedStyle(n).animationName))) return [];
          const r = s.getBoundingClientRect();
          return [{ id, cell: a.dataset.cell, over: Math.round((c.left - (r.left + r.width * ink[id])) * 10) / 10, sep: getComputedStyle(a).translate }];
        });
      }, inkLeft);
      for (const r of rows) { samples += 1; seen.add(r.id); if (r.over > worst.over) worst = r; }
      await sleep(100);
    }
    ok(`[${w}×${h}] ${party.join(",")}: 큰 장식이 전장 왼쪽에서 3px 넘게 잘리지 않는다`, samples > 20 && worst.over <= 3, `최악 ${JSON.stringify(worst)} · 표본 ${samples} · ${[...seen].join(",")}`);
  }
}
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);

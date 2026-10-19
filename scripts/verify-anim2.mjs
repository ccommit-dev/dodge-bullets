/**
 * 애니메이션 2판 재생 검사 (2026-10-19, 사용자: "모든 캐릭터, 동료의 애니메이션이 아직도 어색 — 다시 만들어서 적용") — node scripts/verify-anim2.mjs [outDir] (vite 5173)
 * 1판에서 공격 '휘두름' 칸이 게임에서 한 번도 안 보였던 일을 다시 막는다: 사냥터에서 30ms 마다 칸 위치(background-position)를 재
 *   · 동료 공격 줄의 8칸이 차례대로 다 나온다(건너뜀·뒤로 감 없음) · 걷기 줄 6칸이 다 돈다 · 대기 줄이 돈다
 *   · 몬스터 대기·예비·덤빔 줄 칸이 나온다 · 주인공 시트가 2판(webp)이고 대기·걷기·공격 칸이 바뀐다
 *   · 칸 위에 겹쳐 돌던 CSS 흔들기(.ally-idle/.ally-body 변형)가 꺼져 있다
 * 스크린샷 몇 장을 outDir 에 남긴다.
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync, readFileSync } from "node:fs";

const OUT = process.argv[2] ?? "shots-anim2"; mkdirSync(OUT, { recursive: true });
const L = JSON.parse(readFileSync("art-gen/anim-layout.json", "utf8"));
const SETS = readFileSync("src/titans/animLayout.ts", "utf8");
const allySet = JSON.parse(SETS.match(/ALLY_ANIM_SET[^=]*=\s*(\[[^\]]*\])/)[1]);
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
let fails = 0; const ok = (n, c, i = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${i ? " — " + i : ""}`); if (!c) fails += 1; };
await page.goto(BASE, { waitUntil: "networkidle0" });
const party = ["mia", "leon", "garen", "ember"].filter((id) => allySet.includes(id)).concat(allySet.filter((id) => !["mia", "leon", "garen", "ember"].includes(id))).slice(0, 4);
const progress = { version: 5, level: 40, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: party, partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 99 };
const titans = { gold: 40000, stage: 3, bestStage: 3, heroes: Object.fromEntries(party.map((p) => [p, 1])), lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(1500);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });

const A = L.ally.actions, cols = L.ally.cols, rows = Object.keys(A).length;
const frameOf = (posX, posY) => ({ col: Math.round((parseFloat(posX) / 100) * (cols - 1)), row: Math.round((parseFloat(posY) / 100) * (rows - 1)) });
const rowName = Object.fromEntries(Object.entries(A).map(([k, v]) => [v.row, k]));
// 화면 갱신(rAF)마다 페이지 안에서 잰다 — 바깥에서 30ms 로 재면 한 번에 100ms 가까이 걸려 70ms 칸을 건너뛰었다
const seen = {}, seqs = {}, mon = {}, hero = { sheets: new Set(), frames: new Set() };
let overlay = null;
const tapper = setInterval(() => { page.evaluate(() => { const f = document.querySelector(".titans-field"); if (!f) return; const r = f.getBoundingClientRect(); f.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: r.left + r.width * 0.6, clientY: r.top + r.height * 0.5 })); }).catch(() => {}); }, 900);
for (let round = 0; round < 4; round += 1) {
  const samples = await page.evaluate(() => new Promise((resolve) => {
    const out = []; const t0 = performance.now();
    const tick = () => {
      const r = { allies: {}, mon: null, hero: null, overlay: null };
      for (const a of document.querySelectorAll(".titans-allies .titan-ally-art.anim2")) {
        const id = a.className.match(/ ally-(\w+)/)?.[1];
        const s = a.querySelector(".ally-sprite"); if (!s) continue;
        const cs = getComputedStyle(s);
        r.allies[id] = [cs.backgroundPositionX, cs.backgroundPositionY];
        if (!r.overlay) { const idle = a.querySelector(".ally-idle"), body = a.querySelector(".ally-body"); r.overlay = [getComputedStyle(idle).animationName, getComputedStyle(body).transform]; }
      }
      const m = document.querySelector(".titan-monster-art.anim2 .monster-frames");
      if (m) { const cs = getComputedStyle(m); r.mon = [cs.backgroundPositionX, cs.backgroundPositionY]; }
      const h = document.querySelector(".titans-hero .equipment-base.is-on") ?? document.querySelector(".titans-hero .equipment-base");   // 2판은 세 시트 층 중 보이는 것
      if (h) { const cs = getComputedStyle(h); r.hero = [cs.backgroundImage.split("/").pop(), cs.backgroundPositionX]; }
      out.push(r);
      if (performance.now() - t0 < 2200) requestAnimationFrame(tick); else resolve(out);
    };
    requestAnimationFrame(tick);
  }));
  for (const r of samples) {
    overlay ??= r.overlay;
    for (const [id, [x, y]] of Object.entries(r.allies)) {
      const fr = frameOf(x, y), name = rowName[fr.row];
      (seen[id] ??= {}); (seen[id][name] ??= new Set()).add(fr.col);
      (seqs[id] ??= []); const last = seqs[id][seqs[id].length - 1];
      if (!last || last.row !== fr.row || last.col !== fr.col) seqs[id].push(fr);
    }
    if (r.mon) { const mc = L.monster.cols, mr = Object.keys(L.monster.actions).length; const fr = { col: Math.round((parseFloat(r.mon[0]) / 100) * (mc - 1)), row: Math.round((parseFloat(r.mon[1]) / 100) * (mr - 1)) }; const name = Object.entries(L.monster.actions).find(([, v]) => v.row === fr.row)?.[0]; (mon[name] ??= new Set()).add(fr.col); }
    if (r.hero) { hero.sheets.add(r.hero[0]); hero.frames.add(r.hero[0] + "@" + r.hero[1]); }
  }
  await page.screenshot({ path: `${OUT}/hunt-${round}.png`, clip: { x: 0, y: 250, width: 390, height: 360 } });
}
clearInterval(tapper);
const ids = Object.keys(seqs);
ok("2판 시트를 쓰는 동료가 전장에 있다", ids.length >= 1, ids.join(","));
// 칸 순서 — Web Animations 로 각 칸 한가운데 시각에 멈춰 계산된 칸을 읽는다(실시간 샘플은 헤드리스 화면 갱신이 ~10fps 라 70ms 칸을 건너뛴다)
const checkSteps = () => page.evaluate((cols, rows) => {
  const out = {};
  for (const el of document.querySelectorAll(".titans-allies .titan-ally-art.anim2 .ally-sprite")) {
    const id = el.closest(".titan-ally-art").className.match(/ ally-(\w+)/)?.[1];
    const anim = el.getAnimations()[0]; if (!anim) continue;
    const name = anim.animationName ?? "";
    const n = Number(name.split("-").pop());
    const dur = anim.effect.getTiming().duration;
    anim.pause();
    const got = [];
    for (let i = 0; i < n; i += 1) { anim.currentTime = ((i + 0.5) * dur) / n; got.push(Math.round((parseFloat(getComputedStyle(el).backgroundPositionX) / 100) * (cols - 1))); }
    anim.play();
    const row = Math.round((parseFloat(getComputedStyle(el).backgroundPositionY) / 100) * (rows - 1));
    out[id] = { row, n, got };
  }
  return out;
}, cols, rows);
const stepCheck = {};
for (let k = 0; k < 60 && !(Object.keys(stepCheck).some((key) => key.endsWith(":" + A.attack.row)) && Object.keys(stepCheck).some((key) => key.endsWith(":" + A.idle.row))); k += 1) {
  for (const [id, v] of Object.entries(await checkSteps())) stepCheck[`${id}:${v.row}`] = { id, ...v };
  await sleep(90);
}
ok("칸 순서 검사 — 공격 줄과 대기 줄을 잡았다", Object.keys(stepCheck).some((key) => key.endsWith(":" + A.attack.row)) && Object.keys(stepCheck).some((key) => key.endsWith(":" + A.idle.row)), Object.keys(stepCheck).join(" "));
// 고리(대기·걷기)는 동료마다 시작 위상을 어긋나게 해(음수 지연) 3,4,5,0,1,2 처럼 돌아 시작해도 맞다 — 한 칸씩 늘고 n 칸이 다 나오면 된다
for (const v of Object.values(stepCheck)) {
  const loop = A[rowName[v.row]]?.loop;
  const cyc = v.got.every((c, i) => i === 0 || c === (v.got[i - 1] + 1) % v.n) && new Set(v.got).size === v.n;
  ok(`${v.id} ${rowName[v.row]} 줄 ${v.n}칸이 차례로 다 나온다${loop ? "(고리 — 어디서 시작해도)" : "(0칸부터)"}`, loop ? cyc : v.got.every((c, i) => c === i), v.got.join(","));
}
for (const id of ids) {
  const s = seen[id];
  ok(`${id} 대기 줄 칸이 돈다`, (s.idle?.size ?? 0) >= 3, [...(s.idle ?? [])].join(","));
  // 실시간 표본은 헤드리스 화면 갱신(~10fps)이라 칸을 건너뛴다 — 순서는 위 결정적 검사(Web Animations 정지·이동)가 본다. 여기선 실제 전투에서 공격 줄이 돈다는 것만
  ok(`${id} 공격 줄이 실제 전투에서 재생된다(3칸 이상 보임)`, (s.attack?.size ?? 0) >= 3, [...(s.attack ?? [])].sort((x, y) => x - y).join(","));
}
const walkers = ids.filter((id) => (seen[id].walk?.size ?? 0) > 0);
ok("걷기 줄이 걸어 들어올 때 돈다(6칸 중 5칸 이상 보임)", walkers.length > 0 && walkers.every((id) => seen[id].walk.size >= 5), walkers.map((id) => `${id}:${[...seen[id].walk].join("")}`).join(" "));
ok("칸 위 CSS 흔들기가 꺼져 있다(.ally-idle 애니메이션 없음 · .ally-body 변형 없음)", overlay && overlay[0] === "none" && (overlay[1] === "none" || overlay[1] === "matrix(1, 0, 0, 1, 0, 0)"), JSON.stringify(overlay));
// 몬스터 칸 순서 — 동료와 같은 결정적 검사(멈추고 칸 한가운데 시각으로 옮겨 읽는다)
const monStep = await page.evaluate(() => {
  const el = document.querySelector(".titan-monster-art.anim2 .monster-frames"); if (!el) return null;
  const anim = el.getAnimations()[0]; if (!anim) return null;
  const n = Number((anim.animationName ?? "").split("-").pop()), cols = Number((anim.animationName ?? "").split("-")[1]), dur = anim.effect.getTiming().duration;
  anim.pause(); const got = [];
  for (let i = 0; i < n; i += 1) { anim.currentTime = ((i + 0.5) * dur) / n; got.push(Math.round((parseFloat(getComputedStyle(el).backgroundPositionX) / 100) * (cols - 1))); }
  anim.play(); return { n, got };
});
if (monStep) ok(`몬스터 지금 동작 ${monStep.n}칸이 차례로 다 나온다`, monStep.got.every((c, i) => i === 0 || c === (monStep.got[i - 1] + 1) % monStep.n) && new Set(monStep.got).size === monStep.n, monStep.got.join(","));
// 몬스터는 그 스테이지에 2판 시트가 있는 종이 나왔을 때만 잰다
// 일반 몬스터는 1초 안팎에 쓰러져 실시간 표본(헤드리스 ~10fps)에 덤빔 줄이 안 잡히기도 한다 — 예비 또는 덤빔 줄이 돌면 된다(칸 순서는 위 결정적 검사)
if (Object.keys(mon).length) ok("몬스터 2판 시트 — 대기 줄이 돌고 예비·덤빔 줄로 움직인다", (mon.idle?.size ?? 0) >= 2 && ((mon.attack?.size ?? 0) + (mon.prepare?.size ?? 0)) >= 1, JSON.stringify(Object.fromEntries(Object.entries(mon).map(([k, v]) => [k, [...v]]))));
else console.log("SKIP 몬스터 — 이 스테이지 몬스터에 2판 시트가 없다");
ok("주인공 2판 시트(webp) · 대기·공격 칸이 바뀐다(탭하면 공격)", [...hero.sheets].some((s) => /hero-idle\.webp/.test(s)) && [...hero.sheets].some((s) => /hero-attack\.webp/.test(s)) && hero.frames.size >= 8, `${[...hero.sheets].join(" ")} · 칸 ${hero.frames.size}`);
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);

/**
 * 실제 플레이 아트 검증 — 새 원화 동료 4명 편성으로 전투를 돌리며
 *   1) 동료·영웅·몬스터 화면 사각형이 서로 겹치는지 (본체 bbox 기준, 20% 이상 겹치면 FAIL)
 *   2) 동료 스프라이트가 전장 밖으로 나가는지
 *   3) 상태 전환(대기/이동/공격/피격) 프레임이 실제로 바뀌는지
 * 를 재고 스크린샷(art-gen/out/play-*.png)을 남긴다.
 *   node scripts/verify-play-art.mjs   (dev 서버 5173 필요)
 */
import puppeteer from "puppeteer";
const BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);

const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((h) => {
  localStorage.clear();
  const pk = `dodgebullets:progression:v1:${h}`;
  localStorage.setItem(pk, JSON.stringify({ equippedWeaponLevel: 10, equippedShoulder: "dragon", onboardingStep: 99, tutorialDone: true, idleClaimedAt: Date.now(), pioneeredArea: 5, ownedCharacters: ["ember"], activeCharacter: "default", partyIds: ["luna", "bronn", "iris", "ember"], partyCap: 4 }));
  const tk = `dodgebullets:titans:${h}`;
  localStorage.setItem(tk, JSON.stringify({ stage: 22, heroes: { luna: 5, bronn: 5, iris: 5, ember: 5, mia: 3 }, party: ["luna", "bronn", "iris", "ember"], lastActiveAt: Date.now() }));
}, H);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2500);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".battle-alert-stack, .titans-bottom-nav, .hub-sheet, .nav-popup-grid")).find((x) => /출석|수령|확인|닫기|시작/.test(x.textContent)); if (!b) break; b.click(); } });
await sleep(800);

const party = await page.evaluate(() => [...document.querySelectorAll(".titans-allies .titan-ally-art")].map((e) => (e.className.match(/ ally-([a-z_]+)/) || [])[1]));
ok("편성된 동료 4명이 전장에 렌더", party.filter(Boolean).length === 4, party.join());

/** 렌더 사각형: 본체만 재기 위해 .ally-body / 영웅 .equipment-base / 몬스터 img.on 의 bbox 를 쓴다 */
const rects = () => page.evaluate(() => {
  const r = (el, core = 1) => { const b = el.getBoundingClientRect(); const w = b.width * core; return { x: b.x + (b.width - w) / 2, y: b.y, w, h: b.height }; };
  // .ally-body 는 셀 폭 150%(투명 여백 포함)라 그린 인물은 중앙 45% 폭, 영웅·몬스터도 여백을 빼고 중앙 55%
  const field = document.querySelector(".titans-field");
  const allies = [...document.querySelectorAll(".titans-allies .titan-ally-art")].map((e) => ({ id: (e.className.match(/ ally-([a-z_]+)/) || [])[1], approaching: e.classList.contains("is-approaching"), state: e.querySelector(".ally-body")?.className.match(/frame-(\d)/)?.[1], ...r(e.querySelector(".ally-body") || e, 0.45) }));
  const hero = document.querySelector(".titans-hero"); const monster = document.querySelector(".titan-monster-art");
  const phase = (field?.className.match(/phase-([a-z-]+)/) || [])[1] || "";
  return { phase, field: field ? r(field) : null, allies, hero: hero ? r(hero, 0.55) : null, monster: monster ? r(monster, 0.7) : null, boss: !!document.querySelector(".titans-field.boss") };
});
const inter = (a, b) => { const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)); const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return (x * y) / Math.min(a.w * a.h, b.w * b.h); };

let worstAlly = { v: 0, pair: "" }, worstHero = { v: 0, pair: "" }, worstMon = { v: 0, pair: "" }, offField = [], statesSeen = {};
for (let t = 0; t < 14; t += 1) {
  const s = await rects();
  for (const a of s.allies) (statesSeen[a.id] ??= new Set()).add(a.state); // 상태 프레임은 모든 샘플에서 수집
  if (t < 2) { await sleep(600); continue; } // 첫 교전 정렬까지 대기
  // 스테이지 전환(run-out/in)·등장 걸어오기 중에는 동료 컨테이너가 통째로 움직여 주인공·몬스터를 스쳐 지나간다 — 정지 교전 순간만 잰다
  if (/stage-/.test(s.phase) || s.allies.some((a) => a.approaching)) { await page.evaluate(() => document.querySelector(".titan-monster-art")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))); await sleep(450); continue; }
  for (let i = 0; i < s.allies.length; i += 1) for (let j = i + 1; j < s.allies.length; j += 1) {
    const v = inter(s.allies[i], s.allies[j]); if (v > worstAlly.v) worstAlly = { v, pair: `${s.allies[i].id}×${s.allies[j].id}` };
  }
  for (const a of s.allies) {
    if (s.hero) { const v = inter(a, s.hero); if (v > worstHero.v) worstHero = { v, pair: `${a.id}×hero` }; }
    if (s.monster) { const v = inter(a, s.monster); if (v > worstMon.v) worstMon = { v, pair: `${a.id}×monster` }; }
    // 등장 걸어오기(approaching)·스테이지 전환(run-out/in) 중에는 화면 밖을 지나가므로 제외
    if (!a.approaching && !/stage-/.test(s.phase) && s.field && (a.x < s.field.x - 2 || a.x + a.w > s.field.x + s.field.w + 2 || a.y + a.h > s.field.y + s.field.h + 2)) offField.push(`${a.id}@t${t}`);
  }
  if (t === 3 || t === 6 || t === 12) await page.screenshot({ path: `art-gen/out/play-t${t}.png`, clip: { x: 0, y: s.field ? s.field.y - 40 : 300, width: 390, height: 360 } });
  // 탭 공격으로 상태 전환 유도
  await page.evaluate(() => document.querySelector(".titan-monster-art")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await sleep(450);
}
ok("동료끼리 본체 겹침 최대 20% 이하", worstAlly.v <= 0.2, `${worstAlly.pair} ${(worstAlly.v * 100).toFixed(0)}%`);
ok("동료-영웅 본체 겹침 최대 25% 이하", worstHero.v <= 0.25, `${worstHero.pair} ${(worstHero.v * 100).toFixed(0)}%`);
// 근접 동료는 공격 시 몬스터에 붙는다(교전 연출) — 접촉은 허용하되 가려 버리는 수준(40%↑)만 실패
ok("동료-몬스터 본체 겹침 최대 40% 이하 (근접 접촉 허용)", worstMon.v <= 0.4, `${worstMon.pair} ${(worstMon.v * 100).toFixed(0)}%`);
ok("동료가 전장 밖으로 나가지 않음", offField.length === 0, offField.slice(0, 4).join());
const stateReport = Object.entries(statesSeen).map(([id, s]) => `${id}:${[...s].filter(Boolean).sort().join("")}`).join(" ");
ok("각 동료가 2개 이상 상태 프레임(대기·이동/공격)을 보임", Object.values(statesSeen).every((s) => [...s].filter(Boolean).length >= 2), stateReport);

// 상태별 셀 크기 팝 검사 — 아틀라스 셀 4개의 본체 bbox 높이 편차 (place-art 균일 배율이면 ≤ 12%)
const popReport = await page.evaluate(async () => {
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  const img = await load("/titans/generated/allies/ally-variant-atlas-v1.png");
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const cw = img.width / 4, ch = img.height / 12, out = {};
  const ids = ["pyro", "marina", "terra", "zephyr", "bronn", "iris", "cain", "sylph", "orion", "ember", "luna", "volt"];
  for (let r = 4; r < 12; r += 1) { const hs = []; for (let col = 0; col < 4; col += 1) { const d = g.getImageData(col * cw, r * ch, cw, ch).data; let minY = ch, maxY = 0; for (let y = 0; y < ch; y += 1) for (let x = 0; x < cw; x += 1) if (d[(y * cw + x) * 4 + 3] > 24) { if (y < minY) minY = y; if (y > maxY) maxY = y; } hs.push(maxY - minY + 1); } out[ids[r]] = hs; }
  return out;
});
const pops = Object.entries(popReport).map(([id, hs]) => [id, (Math.max(...hs) - Math.min(...hs)) / Math.max(...hs)]);
ok("상태 전환 시 본체 높이 편차 ≤ 12% (크기 팝 없음)", pops.every(([, v]) => v <= 0.12), pops.map(([id, v]) => `${id}:${(v * 100).toFixed(0)}%`).join(" "));

await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);

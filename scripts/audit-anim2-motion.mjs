/**
 * 애니메이션 2판 움직임 감사 (2026-10-19) — node scripts/audit-anim2-motion.mjs
 * 칸마다 알파 상자(발끝 · 머리 · 좌우)와 무게중심을 재서, 이웃 칸 사이(반복 동작은 끝→처음 이음매 포함) 튐을 찾는다.
 * 어색함의 대표 원인: 발이 미끄러짐(대기·피격에서 발끝 y/x 가 출렁) · 키가 한 칸만 튐 · 반복 이음매에서 몸이 순간이동.
 * 값은 칸 높이 대비 %. 기준을 넘는 것만 출력하고, 0 이면 깨끗하다.
 */
import sharp from "sharp";
import { readFileSync, readdirSync } from "node:fs";

const L = JSON.parse(readFileSync("art-gen/anim-layout.json", "utf8"));
// 기준(칸 높이 %) — 대기는 거의 제자리, 걷기·공격은 몸이 움직이는 게 정상이라 느슨하게
const LIMIT = {
  idle: { feet: 1.2, step: 2.5, height: 4 },
  walk: { feet: 2.5, step: 6, height: 6 },
  // 덤빔은 일부러 늘였다(1.07) 찧는(0.92) 칸 — 몬스터 0→1 에서 키가 16% 안팎 준다(anim2.py monster_actions). 그보다 크면 튐
  attack: { feet: 4, step: 13, height: 19 },
  hit: { feet: 3, step: 8, height: 10 },
  prepare: { feet: 3, step: 10, height: 12 },
};

async function measure(src, left, top, w, h) {
  const { data, info } = await sharp(src).extract({ left, top, width: w, height: h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = w, x1 = -1, y0 = h, y1 = -1, sx = 0, sy = 0, n = 0;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    if (data[(y * w + x) * info.channels + 3] < 128) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; sx += x; sy += y; n += 1;
  }
  return n ? { x0, x1, y0, y1, cx: sx / n, cy: sy / n } : null;
}

const issues = [];
async function audit(kind, id, src, frames, cellW, cellH, rowTop, act, a) {
  const boxes = [];
  for (let f = 0; f < frames; f += 1) boxes.push(await measure(src, f * cellW, rowTop, cellW, cellH));
  const lim = LIMIT[act];
  const pct = (v) => Math.round((v / cellH) * 1000) / 10;
  const pairs = boxes.map((_, i) => [i, i + 1]).slice(0, frames - 1);
  if (a.loop) pairs.push([frames - 1, 0]);
  for (const [i, j] of pairs) {
    const p = boxes[i], q = boxes[j];
    if (!p || !q) { issues.push(`${kind} ${id} ${act} ${i}→${j} 빈 칸`); continue; }
    const feet = pct(Math.abs(q.y1 - p.y1)), step = pct(Math.hypot(q.cx - p.cx, q.cy - p.cy)), height = pct(Math.abs((q.y1 - q.y0) - (p.y1 - p.y0)));
    const bad = [];
    if (feet > lim.feet) bad.push(`발 ${feet}`);
    if (step > lim.step) bad.push(`중심 ${step}`);
    if (height > lim.height) bad.push(`키 ${height}`);
    if (bad.length) issues.push(`${kind} ${id} ${act} ${i}→${j}${a.loop && j === 0 ? "(이음매)" : ""}: ${bad.join(" · ")}`);
  }
}

/** 동작이 넘어가는 이음매 — 게임은 예비 끝 → 덤빔 처음, 덤빔·피격 끝 → 대기 처음으로 칸을 바로 바꾼다 */
const SEAMS = { ally: [["attack", "idle"], ["hit", "idle"], ["idle", "attack"]], monster: [["prepare", "attack"], ["attack", "idle"], ["hit", "idle"], ["idle", "prepare"]] };
async function auditSeams(kind, id, src, spec) {
  const [CW, CH] = spec.cell;
  for (const [from, to] of SEAMS[kind]) {
    const a = spec.actions[from], b = spec.actions[to];
    const p = await measure(src, (a.frames - 1) * CW, a.row * CH, CW, CH), q = await measure(src, 0, b.row * CH, CW, CH);
    if (!p || !q) continue;
    const pct = (v) => Math.round((v / CH) * 1000) / 10;
    const feet = pct(Math.abs(q.y1 - p.y1)), step = pct(Math.hypot(q.cx - p.cx, q.cy - p.cy)), height = pct(Math.abs((q.y1 - q.y0) - (p.y1 - p.y0)));
    const bad = [];
    if (feet > (from === "prepare" ? 4 : 3)) bad.push(`발 ${feet}`);
    // 예비 끝(움츠림 0.92) → 덤빔 처음(늘임 1.07, 뒤로 젖힌 꼭대기)은 중심이 10% 안팎 오른다 — 의도된 늘임. 그 이음매만 13 까지
    if (step > (from === "prepare" ? 13 : 8)) bad.push(`중심 ${step}`);
    if (height > (from === "prepare" ? 19 : 10)) bad.push(`키 ${height}`);
    if (bad.length) issues.push(`${kind} ${id} ${from}끝→${to}처음(동작 이음매): ${bad.join(" · ")}`);
  }
}

let count = 0;
for (const [kind, dir] of [["ally", "public/titans/anim/allies"], ["monster", "public/titans/anim/monsters"]]) {
  const spec = L[kind], [CW, CH] = spec.cell;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".webp")).sort()) {
    for (const [act, a] of Object.entries(spec.actions)) { await audit(kind, file.replace(".webp", ""), `${dir}/${file}`, a.frames, CW, CH, a.row * CH, act, a); count += 1; }
    await auditSeams(kind, file.replace(".webp", ""), `${dir}/${file}`, spec);
  }
}
for (const sk of ["", "-dawn", "-ember", "-frost", "-obsidian"]) {
  for (const [mode, s] of Object.entries(L.hero.sheets)) { await audit("hero", "hero" + sk, `public/titans/anim/hero/hero-${mode}${sk}.webp`, s.frames, s.width, L.hero.cellHeight, 0, mode, s); count += 1; }
}
console.log(`${count}개 동작 줄 감사 · 튐 ${issues.length}건`);
for (const s of issues) console.log(" ", s);
console.log(issues.length ? "FAIL" : "PASS 칸 사이 · 반복 이음매 · 동작 이음매에 튐 없음");
process.exit(issues.length ? 1 : 0);

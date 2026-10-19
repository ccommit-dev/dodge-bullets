/**
 * 애니메이션 2판 움직임 미리보기 (2026-10-19) — node scripts/preview-anim2-motion.mjs [outDir=art-gen/out/motion]
 * 조립된 시트를 게임과 같은 칸 수 · 같은 ms 로 움직이는 webp 로 만든다(동작마다 한 장, 캐릭터를 격자로). 검수 시트(review-anim2*)는
 * 멈춘 칸이라 "어색함"(박자 · 튐 · 미끄러짐)이 안 보여서, 사람이 실제 속도로 보고 고르게 한다. 한 번 재생 동작은 끝 칸에 잠깐 머문 뒤 다시 돈다.
 */
import sharp from "sharp";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "art-gen/out/motion";
mkdirSync(OUT, { recursive: true });
const L = JSON.parse(readFileSync("art-gen/anim-layout.json", "utf8"));
const BG = { r: 207, g: 198, b: 176, alpha: 1 };
const HOLD = 360;   // 한 번 재생 동작의 끝 칸 머묾(ms) — 다음 바퀴와 구분되게

const label = (text, w) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="18"><text x="4" y="14" font-family="sans-serif" font-size="13" fill="#3b2212">${text}</text></svg>`);

/** cells[c][f] = 캐릭터 c 의 f 번째 칸(PNG 버퍼, 같은 크기) → 격자 애니메이션 webp */
async function writeGrid(name, ids, cells, cw, ch, ms, loop) {
  const n = cells[0].length, cols = Math.min(6, ids.length), rows = Math.ceil(ids.length / cols);
  const W = cols * cw, H = rows * (ch + 18);
  const frames = [];
  for (let f = 0; f < n; f += 1) {
    const ops = [];
    ids.forEach((id, c) => {
      const x = (c % cols) * cw, y = Math.floor(c / cols) * (ch + 18);
      ops.push({ input: cells[c][f], left: x, top: y + 18 }, { input: label(id, cw), left: x, top: y });
    });
    frames.push(await sharp({ create: { width: W, height: H, channels: 4, background: BG } }).composite(ops).png().toBuffer());
  }
  const step = Math.round(ms / n);
  const delay = frames.map((_, i) => step + (!loop && i === n - 1 ? HOLD : 0));
  const file = `${OUT}/${name}.webp`;
  await sharp(frames, { join: { animated: true } }).webp({ loop: 0, delay, quality: 80 }).toFile(file);
  console.log(file, `${ids.length}종 · ${n}칸 · ${ms}ms`);
}

async function gridSheets(kind, dir, scale) {
  const spec = L[kind], [CW, CH] = spec.cell, cw = Math.round(CW * scale), ch = Math.round(CH * scale);
  const ids = readdirSync(dir).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, "")).sort();
  for (const [action, a] of Object.entries(spec.actions)) {
    const cells = [];
    for (const id of ids) {
      const src = `${dir}/${id}.webp`, row = [];
      for (let f = 0; f < a.frames; f += 1) row.push(await sharp(src).extract({ left: f * CW, top: a.row * CH, width: CW, height: CH }).resize(cw, ch).png().toBuffer());
      cells.push(row);
    }
    await writeGrid(`${kind}-${action}`, ids, cells, cw, ch, a.ms, a.loop);
  }
}

await gridSheets("ally", "public/titans/anim/allies", 0.5);
await gridSheets("monster", "public/titans/anim/monsters", 0.42);
// 주인공 — 동작마다 시트 폭이 달라 따로. 기본 + 스킨 넷
{
  const H = L.hero.cellHeight, scale = 0.32, ch = Math.round(H * scale);
  const skins = ["", "-dawn", "-ember", "-frost", "-obsidian"];
  for (const [mode, s] of Object.entries(L.hero.sheets)) {
    const cw = Math.round(s.width * scale), cells = [];
    for (const sk of skins) {
      const row = [];
      for (let f = 0; f < s.frames; f += 1) row.push(await sharp(`public/titans/anim/hero/hero-${mode}${sk}.webp`).extract({ left: f * s.width, top: 0, width: s.width, height: H }).resize(cw, ch).png().toBuffer());
      cells.push(row);
    }
    await writeGrid(`hero-${mode}`, skins.map((sk) => "hero" + sk), cells, cw, ch, s.ms, s.loop);
  }
}

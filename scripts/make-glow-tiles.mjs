/**
 * 스킬 · 퀘스트 빛 판 아이콘 (2026-11-23, 사용자: "스킬 ui 나 퀘스트 ui 아이콘은 이런 풍으로" — scripts/lib/glowtile.mjs)
 *   node scripts/make-glow-tiles.mjs [skills|quests] [--out=폴더]
 * 스킬: art-gen/out/b3d-icons/hunt-bare/<id>.png(ICON_BARE=1 blender -b -P art-gen/blender/icons.py -- hunt) → public/ui/skills/titans-tile/<id>.png
 *       색은 스킬 속성(src/titans/model.ts SKILLS element): 칼날 보라 · 불 주황 · 바람 청록 · 대지 호박 · 빛 금
 * 퀘스트: public/titans/quests/<id>.png(물건 그림) → public/titans/quests-tile/<id>.png, 금빛 하나
 * 성문 방어(dodge): b3d-icons/dodge-bare/<이름>.png(ICON_BARE=1 … -- dodge) → public/dodge/skills-tile/<이름>.png, 색은 이름(불 · 얼음 · 물 · 바람 …). 전투 캔버스(draw.ts) · 공유 카드는 메달 그대로
 * 필드(명중 팝 · 등급 컷인)는 예전 메달 그대로 — 어두운 네모 판이 몬스터 위로 날아가면 어색하다(SkillIcon field)
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { glowTile } from "./lib/glowtile.mjs";

const args = process.argv.slice(2);
const sets = args.filter((a) => !a.startsWith("--"));
const outArg = args.find((a) => a.startsWith("--out="))?.slice(6);
const want = (s) => sets.length === 0 || sets.includes(s);
const HUE = { blade: [272, 85], fire: [20, 95], wind: [172, 80], earth: [34, 75], light: [48, 100] };
const seedOf = (id) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

if (want("skills")) {
  const src = readFileSync("src/titans/model.ts", "utf8");
  const el = Object.fromEntries([...src.matchAll(/id: "([a-zA-Z]+)",[^\n]*?element: "([a-z]+)"/g)].map((m) => [m[1], m[2]]));
  const dir = outArg ?? "public/ui/skills/titans-tile";
  mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const f of readdirSync("art-gen/out/b3d-icons/hunt-bare").filter((x) => x.endsWith(".png"))) {
    const id = f.replace(/\.png$/, ""), [hue, sat] = HUE[el[id]] ?? [48, 100];
    writeFileSync(`${dir}/${id}.png`, await glowTile(readFileSync(`art-gen/out/b3d-icons/hunt-bare/${f}`), { hue, sat, size: 192, seed: seedOf(id), objScale: 0.72 }));
    n += 1;
  }
  console.log("skills", n, "→", dir);
}
if (want("dodge")) {
  const DH = { fire: [18, 95], ice: [195, 90], water: [208, 90], wind: [158, 80], earth: [34, 75], bolt: [52, 100], holy: [46, 100], poison: [100, 75], shadow: [282, 80], meteor: [10, 95], ultimate: [300, 85] };
  const dir = outArg ?? "public/dodge/skills-tile";
  mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const f of readdirSync("art-gen/out/b3d-icons/dodge-bare").filter((x) => x.endsWith(".png"))) {
    const id = f.replace(/\.png$/, ""), [hue, sat] = DH[id] ?? [272, 85];   // basic · basic-<무기> = 칼날 보라
    writeFileSync(`${dir}/${id}.png`, await glowTile(readFileSync(`art-gen/out/b3d-icons/dodge-bare/${f}`), { hue, sat, size: 160, seed: seedOf(id), objScale: 0.72 }));
    n += 1;
  }
  console.log("dodge", n, "→", dir);
}
if (want("quests")) {
  const dir = outArg ?? "public/titans/quests-tile";
  mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const f of readdirSync("public/titans/quests").filter((x) => x.endsWith(".png"))) {
    const id = f.replace(/\.png$/, "");
    writeFileSync(`${dir}/${id}.png`, await glowTile(readFileSync(`public/titans/quests/${f}`), { hue: 42, sat: 95, size: 160, seed: seedOf(id), objScale: 0.76 }));
    n += 1;
  }
  console.log("quests", n, "→", dir);
}

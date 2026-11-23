/**
 * 재화 · 보상 · 콘텐츠 아이콘 2판 조립 (2026-11-23, 사용자: "리소스 관점에서 그외에 아쉬운 부분 전부")
 *   blender -b -P art-gen/blender/relic_icons.py -- cur2-gold … (ART_STYLE=toon · 유물 3판과 같은 셀 설정, RELIC_OUT 으로 따로)
 *   CUR_SRC=<렌더 폴더> node scripts/assemble-currency.mjs [--out=폴더]
 * 같은 파일 이름(public/ui/attendance · rewards, 128²)에 스티커 외곽선(lib/sticker 4px)으로 덮는다 — 코드 경로는 그대로.
 * 견갑 그림 둘(dragon-pauldron · scout-pauldron)은 장비 아이콘 쪽(gear_icons) 몫이라 여기서 건드리지 않는다.
 */
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import { sticker } from "./lib/sticker.mjs";

const SRC = process.env.CUR_SRC ?? "art-gen/out/b3d-relics";
const outArg = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
const W = 128, PAD = 0.06;
const MAP = {
  "cur2-gold": ["attendance/gold"], "cur2-silver": ["attendance/silver"], "cur2-gem": ["attendance/gem", "rewards/gem"],
  "cur2-stone": ["attendance/enhance-stone"], "cur2-seal": ["attendance/expedition-seal"], "cur2-orb": ["attendance/skill-orb"],
  "cur2-chest": ["attendance/event-chest"], "cur2-shoulder-shards": ["attendance/shoulder-shards"],
  "cur2-ally-shard": ["rewards/ally-shard"], "cur2-hood": ["rewards/ally-skin"], "cur2-hourglass": ["rewards/boost"],
  "cur2-hammer": ["rewards/forge-ticket"], "cur2-star": ["rewards/season-xp"], "cur2-weapon-fx": ["rewards/weapon-fx"],
  // 콘텐츠 · 길잡이 아이콘(public/ui/idle, 2026-11-23) — 갈색 나무 메달 생성 그림 16장 → 물건 하나씩(relic_icons.py IDLE2_JOBS, -- idle2)
  ...Object.fromEntries(["anvil", "exp-orb", "expedition", "gate-fund", "gate-locked", "gate-supply", "idle-report", "journal", "lock", "pioneer-flag", "rift", "shadow-seal", "star", "tower", "unlock-crest", "weekend-rift"].map((n) => [`idle2-${n}`, [`idle/${n}`]])),
  // 성문 방어 칩 · 보급(public/dodge, CHIP_JOBS, -- chip2) — ../dodge 로 public/ui 밖에 쓴다
  ...Object.fromEntries(["focus", "barrage", "ember", "rime", "vitality", "edge"].map((n) => [`chip2-${n}`, [`../dodge/chips/${n}`]])),
  ...Object.fromEntries(["draft", "insurance", "primed"].map((n) => [`sup2-${n}`, [`../dodge/supplies/${n}`]])),
};
for (const [src, dsts] of Object.entries(MAP)) {
  const file = `${SRC}/${src}.png`;
  if (!existsSync(file)) { console.warn("없음", file); continue; }
  const trimmed = await sharp(file).trim({ threshold: 1 }).png().toBuffer();
  const fit = await sharp(trimmed).resize(Math.round(W * (1 - 2 * PAD)), Math.round(W * (1 - 2 * PAD)), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const img = await sharp({ create: { width: W, height: W, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: fit, gravity: "center" }]).png().toBuffer();
  const out = await sticker(img, { width: 4 });
  for (const d of dsts) {
    const path = `${outArg ?? "public/ui"}/${d}.png`;
    mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
    await sharp(out).png({ palette: true, quality: 92, compressionLevel: 9 }).toFile(path);
    console.log(src, "→", path);
  }
}

/**
 * 파츠·콘텐츠 카드 배치 (2026-10-12) — 카피 5차 아이콘(icon-capy5-<part>-<tier>-<seed>.png)을 캐릭터 오버레이용
 * public/titans/gear/<part>-<tier>.png (256, 여백 트림) 와 대장간 아이콘 public/ui/gear/<part>-<tier>.png (128) 로,
 * 콘텐츠 카드(backdrop-capy5-card-*) 를 public/ui/content-cards/<id>.webp 로 놓는다.
 *   node scripts/place-gear.mjs [--seed=<part>-<tier>=<seed> ...]
 */
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";

const OUT = "art-gen/out";
const seedOverride = Object.fromEntries(process.argv.filter((a) => a.startsWith("--seed")).flatMap((a) => a.replace(/^--seed=?/, "").split(",")).filter(Boolean).map((kv) => kv.split("=")));
const alpha = { r: 0, g: 0, b: 0, alpha: 0 };
mkdirSync("public/titans/gear", { recursive: true });
mkdirSync("public/ui/gear", { recursive: true });
mkdirSync("public/ui/content-cards", { recursive: true });
let placed = 0;
for (const part of ["helmet", "armor", "weapon", "shield", "gloves", "boots"]) {
  for (const tier of [1, 2, 3]) {
    const seed = seedOverride[`${part}-${tier}`] ?? ["20275101", "20275102"].find((s) => existsSync(`${OUT}/icon-capy5-${part}-${tier}-${s}.png`));
    const src = seed && `${OUT}/icon-capy5-${part}-${tier}-${seed}.png`;
    if (!src || !existsSync(src)) { console.log("skip", part, tier); continue; }
    const trimmed = await sharp(src).trim({ threshold: 8 }).png().toBuffer();
    await sharp(trimmed).resize(256, 256, { fit: "contain", background: alpha }).png().toFile(`public/titans/gear/${part}-${tier}.png`);
    await sharp(trimmed).resize(116, 116, { fit: "contain", background: alpha }).extend({ top: 6, bottom: 6, left: 6, right: 6, background: alpha }).png().toFile(`public/ui/gear/${part}-${tier}.png`);
    placed += 1;
  }
}
const CARDS = { dodge: "card-gate", beat: "card-beat", forge: "card-forge", tower: "card-tower" };
for (const [id, stem] of Object.entries(CARDS)) {
  const seed = seedOverride[stem] ?? ["20275201", "20275202"].find((s) => existsSync(`${OUT}/backdrop-capy5-${stem}-s${s}.png`));
  const src = seed && `${OUT}/backdrop-capy5-${stem}-s${seed}.png`;
  if (!src || !existsSync(src)) { console.log("skip card", id); continue; }
  await sharp(src).resize(320, 160, { fit: "cover", position: "bottom" }).webp({ quality: 82 }).toFile(`public/ui/content-cards/${id}.webp`);
  placed += 1;
}
console.log("placed", placed);

/**
 * 주간 도전(그림자 시험) 상대 8종 배치 (2026-10-13, 사용자: "이전 리소스가 남아있어 모두 비버로 재생성").
 * art-gen/out/char-capy10-<id>-idle-s<seed>.png → public/titans/generated/shadow/<id>.png (세로 512, 여백 트림). 상대는 화면 오른쪽에 서서
 * 왼쪽을 봐야 하므로 facing-scan 이 right 면 뒤집는다. 시드는 --seed=<id>=<seed>, 없으면 첫 시드.
 *   node scripts/place-shadow.mjs [--seed=swordsman=20262901,...]
 */
import sharp from "sharp";
import { existsSync, readdirSync } from "node:fs";
import { facingOf } from "./facing-scan.mjs";

const OUT = "art-gen/out", DIR = "public/titans/generated/shadow";
const IDS = ["swordsman", "tracker", "ascetic", "gatekeeper", "wanderer", "executor", "observer", "blacksmith"];
const seedOverride = Object.fromEntries(process.argv.filter((a) => a.startsWith("--seed")).flatMap((a) => a.replace(/^--seed=?/, "").split(",")).filter(Boolean).map((kv) => kv.split("=")));
const alpha = { r: 0, g: 0, b: 0, alpha: 0 };
let placed = 0;
for (const id of IDS) {
  const cands = readdirSync(OUT).filter((f) => new RegExp(`^char-capy10-${id}-idle-s\\d+\\.png$`).test(f)).sort();
  // 2026-10-14 보완: recolor 로 털을 보라로 바꾼 shadow-<id>.png(batch-capy10r)가 있으면 그것을 우선 쓴다 (NO_RECOLOR=1 로 끔)
  const recolored = `${OUT}/shadow-${id}.png`;
  const file = !process.env.NO_RECOLOR && existsSync(recolored) ? recolored : seedOverride[id] ? `${OUT}/char-capy10-${id}-idle-s${seedOverride[id]}.png` : cands[0] && `${OUT}/${cands[0]}`;
  if (!file || !existsSync(file)) { console.log("skip", id); continue; }
  const facing = await facingOf(file);
  let img = sharp(file).trim({ threshold: 8 });
  const buf = await img.png().toBuffer();
  const flipped = facing.facing === "right" ? await sharp(buf).flop().png().toBuffer() : buf;
  await sharp(flipped).resize({ height: 512, fit: "inside", background: alpha }).png().toFile(`${DIR}/${id}.png`);
  console.log("placed", id, file.split("/").pop(), facing.facing, facing.facing === "right" ? "(flipped)" : "");
  placed += 1;
}
console.log("placed", placed);

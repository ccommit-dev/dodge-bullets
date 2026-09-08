/**
 * 보상 아이콘 배치 — art-gen/out/icon-<id>.png (256px 투명) → public/ui/rewards/<id>.png (128px, 출석 아이콘과 같은 규격).
 *   node scripts/place-icons.mjs
 * 생성: bash art-gen/batch-icons.sh (SDXL + IP-Adapter, 참조 = public/ui/attendance). 없는 id 는 건너뛴다.
 */
import { existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";

export const REWARD_ICON_IDS = ["gem", "ally-shard", "boost", "ally-skin", "weapon-fx", "forge-ticket", "season-xp"];
const OUT = "public/ui/rewards";
mkdirSync(OUT, { recursive: true });
for (const id of REWARD_ICON_IDS) {
  const src = `art-gen/out/icon-${id}.png`;
  if (!existsSync(src)) { console.log("skip", id, "(art-gen/out 에 없음)"); continue; }
  // 여백 트림 → 정사각 패딩 → 128px. 오브젝트가 셀을 꽉 채워야 34px 로 줄여도 읽힌다
  const trimmed = await sharp(src).trim({ threshold: 12 }).png().toBuffer();
  const m = await sharp(trimmed).metadata();
  const side = Math.max(m.width, m.height);
  await sharp(trimmed)
    .extend({ top: Math.floor((side - m.height) / 2), bottom: Math.ceil((side - m.height) / 2), left: Math.floor((side - m.width) / 2), right: Math.ceil((side - m.width) / 2), background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toFile(`${OUT}/${id}.png`);
  console.log("placed", `${OUT}/${id}.png`);
}

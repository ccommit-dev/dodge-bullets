/**
 * 동료 이동·공격·피격 프레임을 대기 한 장에서 파생한다 (2026-10-07, 사용자: "캐릭터들이 분간이 안 가 · 애니메이션 어색 · 더 단순하게").
 *
 * 상태마다 따로 생성하면(1차) 체형·크기가 튀어 걷기 교대가 깜빡였고, 자기 대기를 IP 참조로 걸면(v2) 여러 마리 콜라주가 나왔다.
 * 그래서 몬스터 피격/처치(make-monster-states)처럼 **같은 그림을 기울이고 눌러서** 만든다 — 상태 전환이 같은 캐릭터로 읽히고 움직임은 CSS(호흡·바운스·반동)가 더한다.
 *   run    앞(오른쪽)으로 4° 기울임 + 가로 1.03 · 세로 .96 스쿼시
 *   attack 앞으로 9° 기울임 + 1.04 배
 *   hit    뒤로 10° 기울임 + .98 배 + 밝기 1.25
 *
 *   node scripts/make-ally-states.mjs [bv2] [id ...]     art-gen/out/char-<stem>-<id>-idle.png → -run/-attack/-hit.png
 */
import sharp from "sharp";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const stem = args[0] && /^bv\d*$/.test(args[0]) ? args.shift() : "bv2";   // bv · bv2 · bv3 …
const ids = args.length ? args : ["mia", "leon", "sera", "garen", "ari", "nox", "luna", "volt", "bronn", "orion", "ember"];
const OUT = "art-gen/out";
const clear = { r: 0, g: 0, b: 0, alpha: 0 };

async function derive(src, dst, { rot, sx, sy, bright }) {
  const m = await sharp(src).metadata();
  const w = Math.round(m.width * sx), h = Math.round(m.height * sy);
  let img = sharp(src).resize(w, h);
  if (bright && bright !== 1) img = img.modulate({ brightness: bright });
  const buf = await img.png().toBuffer();
  await sharp(buf).rotate(rot, { background: clear }).png().toFile(dst);
}

for (const id of ids) {
  const idle = `${OUT}/char-${stem}-${id}-idle.png`;
  if (!existsSync(idle)) { console.log("skip", id, "(대기 없음)"); continue; }
  await derive(idle, `${OUT}/char-${stem}-${id}-run.png`, { rot: 4, sx: 1.03, sy: 0.96, bright: 1 });
  await derive(idle, `${OUT}/char-${stem}-${id}-attack.png`, { rot: 9, sx: 1.04, sy: 1.04, bright: 1 });
  await derive(idle, `${OUT}/char-${stem}-${id}-hit.png`, { rot: -10, sx: 0.98, sy: 0.98, bright: 1.25 });
  console.log("derived", id);
}

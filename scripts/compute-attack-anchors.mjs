/**
 * 공격 프레임 앵커 계산 (2026-10-13) — node scripts/compute-attack-anchors.mjs → 출력 4줄을 src/equipment/anchors.ts ATTACK_EQUIPMENT_ANCHORS 에 붙인다.
 * 대기 앵커(IDLE_EQUIPMENT_ANCHORS[0])를 바꾸면 아래 idle 도 같이 바꾼다.
 */
// 공격 프레임 앵커를 deriveAttackFrames(배율 sc → 중심 회전 rot → contain·south)와 같은 변환으로 대기 앵커에서 계산한다
import sharp from "sharp";
import { readFileSync } from "node:fs";
const m = await sharp("art-gen/out/hero-idle-0.png").metadata();
const W = m.width, H = m.height;
const idle = { hand: { x: 78, y: 68, rotation: 20, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -6, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 10, scale: .58 }, head: { x: 48, y: 40, rotation: -4, scale: .62 }, chest: { x: 50, y: 73, rotation: 0, scale: .52 }, offHand: { x: 30, y: 72, rotation: 0, scale: .42 }, feet: { x: 50, y: 95, rotation: 0, scale: .5 } };
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
// 2026-10-13 보완: place-beaver deriveAttackFrames 가 적어 둔 변환(art-gen/out/hero-attack-transform.json: sx·sy·rot·k·ox·oy)을 그대로 쓴다 — bbox 기준 배치라 프레임마다 k·ox·oy 가 다르다
const transforms = JSON.parse(readFileSync("art-gen/out/hero-attack-transform.json", "utf8"));
const frames = transforms.map(({ rot, sx, sy, k, ox, oy }) => {
  const W1 = W * sx, H1 = H * sy, t = rot * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
  const W2 = Math.abs(W1 * c) + Math.abs(H1 * s), H2 = Math.abs(W1 * s) + Math.abs(H1 * c);
  const out = {};
  for (const [name, a] of Object.entries(idle)) {
    const dx = (a.x / 100) * W1 - W1 / 2, dy = (a.y / 100) * H1 - H1 / 2;
    const px = W2 / 2 + dx * c - dy * s, py = H2 / 2 + dx * s + dy * c;
    out[name] = { x: r1((ox + px * k) / W * 100), y: r1((oy + py * k) / H * 100), rotation: r1(a.rotation + rot), scale: r2(a.scale * Math.max(sx, sy) * k) };
  }
  return out;
});
console.log(`// frame ${W}x${H}`);
for (const f of frames) console.log("  { " + Object.entries(f).map(([k, a]) => `${k}: { x: ${a.x}, y: ${a.y}, rotation: ${a.rotation}, scale: ${a.scale} }`).join(", ") + " },");

/**
 * 공격 프레임 앵커 계산 (2026-10-13) — node scripts/compute-attack-anchors.mjs → 출력 4줄을 src/equipment/anchors.ts ATTACK_EQUIPMENT_ANCHORS 에 붙인다.
 * 대기 앵커(IDLE_EQUIPMENT_ANCHORS[0])를 바꾸면 아래 idle 도 같이 바꾼다.
 */
// 공격 프레임 앵커를 deriveAttackFrames(배율 sc → 중심 회전 rot → contain·south)와 같은 변환으로 대기 앵커에서 계산한다
import sharp from "sharp";
const m = await sharp("art-gen/out/hero-idle-0.png").metadata();
const W = m.width, H = m.height;
const steps = [{ rot: -4, sc: 1.0 }, { rot: -10, sc: 1.02 }, { rot: 12, sc: 1.06 }, { rot: 4, sc: 1.01 }];   // place-beaver deriveAttackFrames 와 같은 값 (2026-10-13)
const idle = { hand: { x: 78, y: 68, rotation: 20, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -6, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 10, scale: .58 }, head: { x: 48, y: 40, rotation: -4, scale: .62 }, chest: { x: 50, y: 73, rotation: 0, scale: .52 }, offHand: { x: 30, y: 72, rotation: 0, scale: .42 }, feet: { x: 50, y: 95, rotation: 0, scale: .5 } };
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
const frames = steps.map(({ rot, sc }) => {
  const W1 = W * sc, H1 = H * sc, t = rot * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
  const W2 = Math.abs(W1 * c) + Math.abs(H1 * s), H2 = Math.abs(W1 * s) + Math.abs(H1 * c);
  const k = Math.min(W / W2, H / H2), ox = (W - W2 * k) / 2, oy = H - H2 * k;
  const out = {};
  for (const [name, a] of Object.entries(idle)) {
    const dx = (a.x / 100) * W1 - W1 / 2, dy = (a.y / 100) * H1 - H1 / 2;
    const px = W2 / 2 + dx * c - dy * s, py = H2 / 2 + dx * s + dy * c;
    out[name] = { x: r1((ox + px * k) / W * 100), y: r1((oy + py * k) / H * 100), rotation: r1(a.rotation + rot), scale: r2(a.scale * sc * k) };
  }
  return out;
});
console.log(`// frame ${W}x${H}`);
for (const f of frames) console.log("  { " + Object.entries(f).map(([k, a]) => `${k}: { x: ${a.x}, y: ${a.y}, rotation: ${a.rotation}, scale: ${a.scale} }`).join(", ") + " },");

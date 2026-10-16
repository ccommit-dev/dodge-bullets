/**
 * 주인공 한 장 파생 (2026-10-16) — derive-anim.mjs hero 가 부른다.
 * 3D 대기 한 장(art-gen/out/hero-r3d-idle-0-s66.png)에서 대기 4칸·공격 4칸을 같은 변환으로 만들고, 그 변환을 파츠 앵커에도 그대로 적용해
 * src/equipment/heroAnchors.ts 를 쓴다 → 투구·갑옷·장갑·신발·방패·견갑·무기가 모든 칸에서 몸을 따라간다
 * (예전: 칸마다 따로 restyle 한 그림이라 몸 위치가 칸마다 달라 투구·무기 말고는 어긋나 보였다).
 * 칸: 대기 443×887(인물 y 31~100%) · 공격 553×887(좌우 12.5% 넓음 — CSS .mode-attack .equipment-base 가 125%·−12.5% 로 그린다).
 * 앵커는 상자(.equipped-character, 대기 칸과 같은 크기) 기준 % — 공격 칸의 넓은 여백은 CSS 가 상자 밖으로 내므로 같은 좌표계다.
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const FW = 443, FH = 887, AW = 553;
const PX = 0.4795 * FW, PY = 0.999 * FH;   // 발 기준점(대기 칸 px) — 예전 대기 칸 인물 상자의 가운데·바닥
// 파츠 기준 앵커(대기 0칸, 상자 %) — 2026-10-15 unify.css 의 여백 보정(투구 +9%·갑옷 +15% 아래 …)을 앵커에 접어 넣은 값.
// 견갑은 예전 y 56~57(얼굴 높이)이라 몸통 위(80)로 내렸다
const BASE = {
  hand: { x: 78, y: 91, rotation: 20, scale: 0.32 },
  shoulderLeft: { x: 37, y: 80, rotation: -6, scale: 0.55 },
  shoulderRight: { x: 63, y: 80, rotation: 10, scale: 0.58 },
  head: { x: 57, y: 39.5, rotation: -4, scale: 0.62 },
  chest: { x: 50, y: 88, rotation: 0, scale: 0.52 },
  offHand: { x: 36, y: 86, rotation: 0, scale: 0.42 },
  feet: { x: 50, y: 97, rotation: 0, scale: 0.5 },
};
const IDLE = [{}, { sx: 1.015, sy: 0.985 }, { dy: -0.006 }, { sx: 0.99, sy: 1.01 }];
const IDLE_SWING = [0, 2, 0, -2];
// 예비(뒤로) → 크게 젖힘 → 북 내리치기(앞으로 · 잔상 · 북 울림) → 따라가기
const ATTACK = [
  { rot: -6, sx: 0.97, sy: 1.03, dx: -0.02 },
  { rot: -10, sx: 0.95, sy: 1.05, dx: -0.04 },
  { rot: 8, sx: 1.05, sy: 0.96, dx: 0.02, smear: 2, fx: 1, fxAt: [0.34, 0.22] },   // 칸(553) 안에 들게 — 12°·5% 는 왕관 오른쪽이 잘렸다
  { rot: 4, sx: 1.02, sy: 0.99, dx: 0.02, fx: 1, fxA: 0.4, fxAt: [0.34, 0.22] },
];
const ATTACK_SWING = [-30, -48, 38, 12];   // 무기(손 앵커)만 더 돈다 — 북채를 들었다 내리친다

function anchorsFor(spec, swing, figW, figH) {
  const { rot = 0, sx = 1, sy = 1, dx = 0, dy = 0 } = spec;
  const t = (rot * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const out = {};
  for (const [name, a] of Object.entries(BASE)) {
    const x0 = ((a.x / 100) * FW - PX) * sx, y0 = ((a.y / 100) * FH - PY) * sy;
    const x1 = x0 * c - y0 * s + dx * figW, y1 = x0 * s + y0 * c + dy * figH;
    out[name] = { x: r1(((PX + x1) / FW) * 100), y: r1(((PY + y1) / FH) * 100), rotation: r1(a.rotation + rot + (name === "hand" ? swing : 0)), scale: r2(a.scale * (sx + sy) / 2) };
  }
  return out;
}

export async function doHero({ prep, drawCell, T, SS }) {
  const fig = await prep("art-gen/out/hero-r3d-idle-0-s66.png", { targetH: 612 * SS, maxW: FW * 0.9 * SS, peel: false });
  const sheet = async (specs, cw, dest) => {
    const ops = [];
    for (const [i, spec] of specs.entries()) ops.push(...(await drawCell(fig, spec, 1, i * cw * SS, cw * SS, FH * SS, (PX + (cw - FW) / 2) * SS, PY * SS, "boom", "#ffd34d")));
    const buf = await sharp(T(cw * SS * 4, FH * SS)).composite(ops).png().toBuffer();
    await sharp(buf).resize(cw * 4, FH).png().toFile(dest);
  };
  await sheet(IDLE, FW, "public/titans/character/base/hero-idle.png");
  await sheet(ATTACK, AW, "public/titans/character/base/hero-attack.png");
  const fw = fig.w / SS, fh = fig.h / SS;
  const fmt = (f) => "  { " + Object.entries(f).map(([k, a]) => `${k}: { x: ${a.x}, y: ${a.y}, rotation: ${a.rotation}, scale: ${a.scale} }`).join(", ") + " },";
  writeFileSync("src/equipment/heroAnchors.ts", `/** 주인공 파츠 앵커 — scripts/derive-anim-hero.mjs 가 쓴다 (손대지 말 것). 2026-10-16: 대기 한 장 파생 변환을 앵커에도 그대로 적용한 값 (상자 %) */
import type { EquipmentFrameAnchors } from "./anchors";

export const HERO_IDLE_ANCHORS: EquipmentFrameAnchors[] = [
${IDLE.map((s, i) => fmt(anchorsFor(s, IDLE_SWING[i], fw, fh))).join("\n")}
];
export const HERO_ATTACK_ANCHORS: EquipmentFrameAnchors[] = [
${ATTACK.map((s, i) => fmt(anchorsFor(s, ATTACK_SWING[i], fw, fh))).join("\n")}
];
`);
  console.log("hero sheets + anchors", Math.round(fw), Math.round(fh));
}

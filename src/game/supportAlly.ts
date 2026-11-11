/**
 * 동료 출격 (2026-11-11, 탕탕에이스 비교표 댐 방어전 3번) — 사냥터 편성 동료 한 명을 데려가면 주인공 뒤에서 속성 화살로 돕는다.
 * 원정은 주인공 혼자라 사냥터에서 뽑아 키운 동료가 이어지지 않았다.
 *
 * 사격은 기본 사격과 같은 방식(속성 바꾸기 카드가 쓰는 basic + 속성 화살) — 불 · 바람 스킬의 폭발 · 부메랑은 따라 하지 않는다.
 * 위력 0 이라 대장은 못 깎는다(웨이브만 돕는다). 세기는 등급 · 별: 기본 사격 한 발의 16%(N) … 38%(LR) × (1 + 별 × 6%), 1.5초마다 — 두 배였을 때 8스테이지 덜 자란 계정이 15스테이지를 0→4 판 깨 성장 벽이 무너졌다(verify-support-ally).
 * 그림은 사냥터와 같은 동료 시트(titans/anim/allies) — 주인공 뒤 34px, 주인공이 보는 쪽을 함께 본다(댐 방어전 주인공은 쏘는 쪽, 사용자 확정).
 */
import { assetUrl } from "../asset";
import { ANIM_LAYOUT } from "../titans/animLayout";
import type { GameWorld, SupportAlly } from "./types";

export const SUPPORT_COOLDOWN_SEC = 1.5;
export const SUPPORT_RARITY_MUL: Record<string, number> = { N: 0.16, R: 0.19, SR: 0.23, SSR: 0.27, UR: 0.32, LR: 0.38 };
export const SUPPORT_STAR_BONUS = 0.06;
/** 주인공 뒤 거리(px) */
export const SUPPORT_BEHIND = 34;

export function supportDamageMul(rarity: string, stars: number): number {
  return (SUPPORT_RARITY_MUL[rarity] ?? 0.3) * (1 + SUPPORT_STAR_BONUS * Math.max(0, Math.min(10, Math.floor(stars))));
}

export function makeSupportAlly(def: { id: string; name: string; sheetId: string; element: SupportAlly["element"]; rarity: string; stars: number }): SupportAlly {
  return { id: def.id, name: def.name, sheetId: def.sheetId, element: def.element, damageMul: supportDamageMul(def.rarity, def.stars), timer: 0.8, x: -1, attackMs: 0, shots: 0 };
}

/** 판이 새로 시작할 때 — 첫 발은 조금 늦게 */
export function resetSupportAlly(world: GameWorld): void {
  const sa = world.supportAlly;
  if (!sa) return;
  sa.timer = 0.8;
  sa.attackMs = 0;
  sa.shots = 0;
  sa.x = -1;   // 첫 틱에 주인공 뒤로 붙는다(resetPlayer 가 자리를 옮긴 뒤)
}

const sheets = new Map<string, HTMLImageElement>();
function sheetOf(id: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let img = sheets.get(id);
  if (!img) { img = new Image(); img.src = assetUrl(`titans/anim/allies/${id}.webp`); sheets.set(id, img); }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** 주인공 바로 앞에 그린다(주인공이 위에 겹친다) — 발은 주인공과 같은 바닥 */
export function drawSupportAlly(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  const sa = world.supportAlly;
  if (!sa || sa.x < 0) return;
  const img = sheetOf(sa.sheetId);
  if (!img) return;
  const L = ANIM_LAYOUT.ally;
  const rows = Object.keys(L.actions).length;
  const cw = img.naturalWidth / L.cols, ch = img.naturalHeight / rows;
  const atk = sa.attackMs > 0;
  const act = atk ? L.actions.attack : L.actions.idle;
  const frame = atk
    ? Math.min(act.frames - 1, Math.floor(((act.ms - sa.attackMs) / act.ms) * act.frames))
    : Math.floor((performance.now() / act.ms) * act.frames) % act.frames;
  const p = world.player;
  const footY = p.y + p.radius;
  const dh = 74, dw = dh * (cw / ch);
  ctx.save();
  // 발밑 그림자 — 주인공과 같은 결
  ctx.fillStyle = "rgba(0,0,0,.24)";
  ctx.beginPath(); ctx.ellipse(sa.x, footY - 2, 15, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(sa.x, footY);
  ctx.scale(p.facing < 0 ? -1 : 1, 1);   // 시트는 오른쪽을 본다 — 주인공이 보는 쪽을 함께
  ctx.drawImage(img, frame * cw, act.row * ch, cw, ch, -dw / 2, -dh * L.feet, dw, dh);
  ctx.restore();
}

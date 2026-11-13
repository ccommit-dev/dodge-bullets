/**
 * 댐 방어전 낙석 (2026-11-13, 사용자: 바위가 쏟아지고 쏘면 와르르 부서지는 "느낌"으로) — **그림만** 바꾼다.
 * 일반 적 다섯 종류(돌멩이 · 자갈 떼 · 뾰족 바위 · 큰 바위 · 불씨 바위)를 그 장 재질의 바위로 그린다. 종류(kind) · 체력 · 속도 ·
 * 판정 · 보상은 그대로라 밸런스와 시뮬(dodge-sim)이 같다. 정예(homing — 정예 사격을 쏜다)와 대장은 괴물 그대로(바위를 던지는 쪽).
 * 그림: art-gen/blender/rocks.py(몬스터와 같은 로우 폴리 · 잉크 외곽선) → scripts/assemble-rocks.mjs → public/dodge/rocks/<장>-<모양>.webp
 * 금 · 번쩍임 · 굴러 내려오는 회전 · 방어막에 붙어 갈리는 흔들림 · 부서질 때 조각과 먼지는 여기서 캔버스로 그린다(판정과 무관).
 */
import type { Arrow } from "./types";

export type RockShape = "pebble" | "chunk" | "shard" | "boulder" | "blast";
export const ROCK_SHAPE: Partial<Record<Arrow["kind"], RockShape>> = {
  normal: "pebble", fan: "chunk", aimed: "shard", ricochet: "boulder", explosive: "blast",
};
/** 부서질 때 날리는 먼지 색 — 장 재질과 같은 계열(0 초원 · 1 달빛 숲 · 2 폐허 · 3 용암 · 4 심연) */
const DUST = ["#d8cbb4", "#c9d6ec", "#ecd3a2", "#9a7a6a", "#b9a6e0"];
/** 금 안쪽 빛 — 불씨 바위는 금 사이로 불빛이 샌다 */
const EMBER = "#ffb347";

type Img = (path: string) => HTMLImageElement | null;

/** 장마다 먼지 한 덩이 그림(64², 가운데 진하고 가장자리 흐림) — 한 번 만들어 둔다 */
const puffs: Array<HTMLCanvasElement | null | undefined> = [];
function dustPuff(chapter: number): HTMLCanvasElement | null {
  const i = Math.max(0, Math.min(4, chapter));
  if (puffs[i] !== undefined) return puffs[i] ?? null;
  if (typeof document === "undefined") { puffs[i] = null; return null; }
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d");
  if (!x) { puffs[i] = null; return null; }
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, DUST[i]); g.addColorStop(0.55, DUST[i]); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  puffs[i] = c;
  return c;
}

/** 바위로 그리는 적인가 — 대장 · 대장 탄 · 대장 조각 · 정예(homing)는 아니다 */
/** 개발 서버 전용 A/B 스위치 — window.__dodgeNoRocks = true 면 예전 괴물 그림 · 쓰러짐 · 코인 연출 없음(프레임 비용 · 타이밍 검사 견주기, 2026-11-13) */
export function rocksOffForDev(): boolean {
  return import.meta.env.DEV && typeof window !== "undefined" && (window as { __dodgeNoRocks?: boolean }).__dodgeNoRocks === true;
}
export function isRock(a: Pick<Arrow, "kind" | "boss" | "fromBoss" | "splitLevel">): boolean {
  return !a.boss && !a.fromBoss && a.splitLevel === 0 && ROCK_SHAPE[a.kind] !== undefined && !rocksOffForDev();
}
export function rockPath(chapter: number, shape: RockShape | `bit${0 | 1 | 2 | 3}`): string {
  return `dodge/rocks/${Math.max(0, Math.min(4, chapter))}-${shape}.webp`;
}
export function preloadRocks(chapter: number, img: Img): void {
  for (const s of ["pebble", "chunk", "shard", "boulder", "blast", "bit0", "bit1", "bit2", "bit3"] as const) img(rockPath(chapter, s));
}

/** 개체마다 금 무늬 씨앗 — 풀(pool)에서 다시 쓰이면 새 무늬(체력이 가득 차 있을 때 다시 뽑는다) */
const seeds = new WeakMap<Arrow, number>();
let seedCounter = 1;
function seedOf(a: Arrow): number {
  let s = seeds.get(a);
  if (s === undefined || a.maxHp <= 0 || a.hp >= a.maxHp) { s = (seedCounter = (seedCounter * 48271) % 2147483647); seeds.set(a, s); }
  return s;
}
function rand(seed: number): () => number {
  let x = seed % 2147483647 || 1;
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
}

/** 바위 한 개 — 그림자 · 몸(회전) · 금 · 맞은 번쩍임 · 방어막에서 갈리는 먼지 */
export function drawRock(ctx: CanvasRenderingContext2D, a: Arrow, size: number, chapter: number, img: Img, t: number): boolean {
  const shape = ROCK_SHAPE[a.kind];
  if (!shape) return false;
  const pic = img(rockPath(chapter, shape));
  if (!pic) {
    // 그림을 받기 전 몇 프레임 — 괴물로 그리면 바위로 바뀌며 튄다. 같은 색 둥근 돌로 둔다
    ctx.save();
    ctx.fillStyle = DUST[Math.max(0, Math.min(4, chapter))]; ctx.strokeStyle = "#3b2415"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(a.x, a.y, size * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    return true;
  }
  const box = size * (256 / 240);   // 칸 256 안에 바위 240(여백 8씩) — 바위의 긴 변 = size
  // 회전 — 굴러 내려온다(위치로 정해 프레임과 무관). 뾰족 바위는 날아가는 쪽을 찌른다
  const dir = a.vx < -1 ? -1 : 1;
  let rot = shape === "shard" ? Math.atan2(a.vy, a.vx) - Math.PI / 2 : ((a.y + a.x * 0.35) / Math.max(20, size)) * 1.1 * dir;
  let press = 1, jitter = 0;
  if (a.atBarrier) {   // 방어막에 붙어 갈린다 — 좌우로 비비며 눌린다
    const g = Math.sin(t * 16 + a.x * 0.2);
    rot = (shape === "shard" ? 0 : rot) + g * 0.07;
    press = 0.95 + Math.abs(g) * 0.04;
    jitter = g * 1.5;
  }
  ctx.save();
  // 바닥 그림자 — 몬스터와 같은 자리
  ctx.fillStyle = "rgba(0,0,0,.26)";
  ctx.beginPath(); ctx.ellipse(a.x, a.y + size * 0.42, size * 0.36, size * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  if (a.kind === "explosive") { ctx.shadowColor = "#f59e0b"; ctx.shadowBlur = 12; }
  if (a.chilledMs > 0) ctx.filter = "saturate(.4) brightness(1.2)";
  ctx.translate(a.x + jitter, a.y);
  ctx.scale(1, press);
  ctx.rotate(rot);
  ctx.drawImage(pic, -box / 2, -box / 2, box, box);
  ctx.shadowBlur = 0;
  // 빙결 필터는 몸통 한 번에만 — 켠 채 금 · 번쩍임까지 그리면 그리기마다 필터 층이 새로 생겨 67~100ms 프레임이 몰렸다
  // (2026-11-13 verify-dodge-hud ×2 배속 게임 시간 0.4~0.6배 — 괴물 그림은 몸통 한 번이라 괜찮았다)
  ctx.filter = "none";
  // 금 — 깎인 만큼 늘어난다(세 갈래 × 두세 마디). 뾰족 바위는 폭이 좁아 가로를 줄인다
  const dmg = a.maxHp > 0 ? 1 - Math.max(0, a.hp) / a.maxHp : 0;
  if (dmg > 0.04) {
    const r = rand(seedOf(a));
    const sx = shape === "shard" ? 0.45 : 1, reach = size * 0.36;
    const segs = Math.min(9, Math.ceil(dmg * 9));
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    let drawn = 0;
    for (let b = 0; b < 3 && drawn < segs; b += 1) {
      let ang = r() * Math.PI * 2, x = (r() - 0.5) * size * 0.1, y = (r() - 0.5) * size * 0.1;
      const pts: Array<[number, number]> = [[x * sx, y]];
      for (let k = 0; k < 3 && drawn < segs; k += 1, drawn += 1) {
        ang += (r() - 0.5) * 1.1;
        const len = reach * (0.3 + r() * 0.22);
        x += Math.cos(ang) * len; y += Math.sin(ang) * len;
        const d = Math.hypot(x, y); if (d > reach) { x *= reach / d; y *= reach / d; }
        pts.push([x * sx, y]);
      }
      // 짙은 홈 + 위쪽 밝은 모서리 — 파인 금처럼
      for (const [col, w, off] of [[a.kind === "explosive" ? EMBER : "rgba(28,16,8,.88)", Math.max(1.6, size * 0.035), 0], ["rgba(255,244,220,.35)", Math.max(0.8, size * 0.014), -1]] as const) {
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath();
        pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py + off) : ctx.moveTo(px, py + off)));
        ctx.stroke();
      }
    }
  }
  // 맞은 순간 — 하얗게 번쩍(더하기 합성: 투명한 곳은 그대로)
  if (a.hitFlashMs > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, a.hitFlashMs / 140) * 0.38;
    ctx.drawImage(pic, -box / 2, -box / 2, box, box);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // 방어막에 갈리는 먼지 — 바위 아래 두 줌
  if (a.atBarrier) {
    ctx.save();
    for (let i = 0; i < 2; i += 1) {
      const ph = ((t * 2.2 + i * 0.5 + a.x * 0.01) % 1 + 1) % 1;
      ctx.globalAlpha = (1 - ph) * 0.45;
      ctx.fillStyle = DUST[Math.max(0, Math.min(4, chapter))];
      ctx.beginPath(); ctx.arc(a.x + (i ? 1 : -1) * size * (0.22 + ph * 0.25), a.y + size * 0.36 - ph * size * 0.2, size * (0.08 + ph * 0.12), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  return true;
}

/**
 * 부서짐 (쓰러짐 기록 fades 를 그림으로만 읽는다 — 수명 420ms) — 하얀 번쩍 · 먼지 구름 · 조각 대여섯이 튀어 떨어진다.
 * 같은 기록은 늘 같은 궤적(위치로 씨앗) — 프레임 속도와 무관.
 */
export function drawRockCrumble(ctx: CanvasRenderingContext2D, f: { kind: Arrow["kind"]; x: number; y: number; ms: number }, size: number, chapter: number, img: Img): boolean {
  if (!ROCK_SHAPE[f.kind] || rocksOffForDev()) return false;
  const k = Math.max(0, Math.min(1, 1 - f.ms / 420));
  const ts = k * 0.42;   // 초
  const r = rand(Math.floor(Math.abs(f.x * 73.1 + f.y * 19.7)) + 7);
  const dust = DUST[Math.max(0, Math.min(4, chapter))];
  ctx.save();
  // 먼지 구름 — 둘이 부풀며 옅어진다(가장자리가 흐린 둥근 결). 흐림 그라데이션을 매 프레임 만들면 소프트웨어 래스터에서
  // 부서짐 하나가 괴물 쓰러짐의 2.5배였다(2026-11-13 실측) — 장마다 한 번 그려 둔 먼지 그림을 늘려 찍는다
  const puff = dustPuff(chapter);
  for (let i = 0; i < 2; i += 1) {
    const ox = (r() - 0.5) * size * 0.5, oy = (r() - 0.5) * size * 0.3;
    const cx = f.x + ox * (1 + k), cy = f.y + oy - k * size * 0.15, rad = size * (0.26 + k * 0.36);
    ctx.globalAlpha = (1 - k) * 0.5;
    if (puff) ctx.drawImage(puff, cx - rad, cy - rad, rad * 2, rad * 2);
    else { ctx.fillStyle = dust; ctx.beginPath(); ctx.arc(cx, cy, rad * 0.7, 0, Math.PI * 2); ctx.fill(); }
  }
  // 처음 0.08초 — 하얀 터짐
  if (k < 0.2) {
    ctx.globalAlpha = (1 - k / 0.2) * 0.7;
    ctx.fillStyle = f.kind === "explosive" ? "#ffd27a" : "#fffaf0";
    ctx.beginPath(); ctx.arc(f.x, f.y, size * (0.3 + k * 1.2), 0, Math.PI * 2); ctx.fill();
  }
  // 조각 — 위 · 옆으로 튀었다 떨어진다(중력 1100px/s²) · 돌며 작아진다
  const n = f.kind === "ricochet" || f.kind === "explosive" ? 6 : 5;
  for (let i = 0; i < n; i += 1) {
    const bit = img(rockPath(chapter, `bit${(i % 4) as 0 | 1 | 2 | 3}`));
    const ang = -Math.PI / 2 + (r() - 0.5) * 2.6;
    const sp = (150 + r() * 170) * (size / 70);
    const x = f.x + Math.cos(ang) * sp * ts + (r() - 0.5) * size * 0.2;
    const y = f.y + Math.sin(ang) * sp * ts + 0.5 * 1100 * ts * ts;
    const s = size * (0.3 + r() * 0.18) * (1 - k * 0.3);
    const spin = (r() - 0.5) * 14 * ts;
    ctx.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4;
    if (bit) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
      ctx.drawImage(bit, -s / 2, -s / 2, s, s);
      ctx.restore();
    } else {
      ctx.fillStyle = dust; ctx.beginPath(); ctx.arc(x, y, s * 0.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  return true;
}

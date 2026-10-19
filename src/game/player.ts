import type { GameWorld, Player } from "./types";
import { assetUrl } from "../asset";
import { basicCooldown as basicCooldownOf, bowHand } from "./skillShots";
import { drawRecurveBow } from "./arrowArt";
import { HERO_FIG } from "../equipment/heroAnchors";
import { HERO_ANIM, heroFrameMs, heroFrames } from "../titans/spriteAnim";

const GRAVITY = 1650;
const BASE_RADIUS = 16;
/**
 * 시트별 인물 상자(프레임 %, 4칸 평균 — 2026-10-15 원화 감사에서 잼). 대기 시트(hero-idle, 443×887 칸)는 위 31% 가 비어 있고
 * 무기 시트(hero-bow/staff, 780×887 칸)는 꽉 차 있어, 같은 높이로 그리면 쏠 때마다(0.55초마다) 주인공이 1.4배 커졌다 줄었다.
 * 인물 키를 무기 시트 기준(약 75px — 활·지팡이 길이가 이 크기에 맞춰져 있다)으로 맞추고, 파츠는 인물 상자 기준으로 앉힌다.
 */
// 2026-10-16: 따로 그린 활·지팡이 시트(hero-bow/staff-sheet)는 걷었다 — 칸마다 다른 그림이라 쏠 때 생김새가 바뀌고 파츠가 어긋났다.
// 대기 시트(Blender 3D 리그 — art-gen/blender, scripts/assemble-b3d.mjs) 하나로 그리고, 쏘는 동작은 아래 캔버스 기울임으로 준다(파츠가 같은 변환을 탄다)
type FigBox = { x0: number; x1: number; y0: number; y1: number };
/** 대기 시트 인물 상자 — assemble-b3d 가 렌더에서 재서 heroAnchors.ts 에 쓴다 */
const FIG_IDLE: FigBox = HERO_FIG;
const HERO_FIG_RADII = 5.2;
/** 쏘는 동작 길이(ms) — 기본 사격 재사용(0.55s)보다 짧아 연사해도 프레임이 매번 처음부터 돈다 */
export const SHOOT_MS = 300;
/** Source sheet faces left; multiply logical facing by this when drawing. */
// 대기 시트가 오른쪽을 보는 원화로 교체됐다(2026-09-08) — 예전 정면/왼쪽 시트는 -1 이었다
const EXPEDITION_NATIVE_FACING = 1;
const expeditionHero: Partial<Record<"idle" | "walk", HTMLImageElement>> = {};

/** 성문 방어 주인공 시트 — 애니메이션 2판(2026-10-19)이면 대기 6칸 · 걷기 6칸 webp, 아니면 1판 대기 4칸 PNG. 둘 다 처음에 같이 받는다 */
function getExpeditionHero(mode: "idle" | "walk"): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  if (!expeditionHero.idle) {
    for (const m of HERO_ANIM ? (["idle", "walk"] as const) : (["idle"] as const)) {
      const img = new Image();
      img.src = assetUrl(HERO_ANIM ? `titans/anim/hero/hero-${m}.webp` : "titans/character/base/hero-idle.png");
      expeditionHero[m] = img;
    }
  }
  const want = HERO_ANIM ? expeditionHero[mode] : undefined;
  return want?.complete && want.naturalWidth > 0 ? want : expeditionHero.idle ?? null;
}

/**
 * 주인공의 활 — 장착 무기와 무관하게 **늘 활**을 든다(장착 무기는 곁의 정령, draw.ts drawWeaponSpirit).
 * 2026-10-02 (사용자: "기본 활 모델이 볼품없음 · 기본 화살 애니메이션이 없음"): 0.44배 원화가 몸 한가운데 겹쳐 흰 선만 보였다 →
 * 바라보는 쪽 어깨 앞(bowHand)에 캔버스 리커브 활을 쥐고 가장 가까운 몬스터 쪽(world.aimAngle)으로 겨눈다.
 * 기본 사격 재사용(basicCooldownOf(world))이 차는 동안 시위를 당기며 메긴 화살이 보이고, 다 당기면 촉이 빛나고,
 * 쏘는 순간(shotFlashMs) 시위가 튕겨 떨리고 활이 반동하며 앞에서 번쩍인다. 기본 화살은 이 활 앞에서 나간다
 */
function drawHeroBow(ctx: CanvasRenderingContext2D, world: GameWorld, p: Player): void {
  const hand = bowHand(world);
  const L = p.radius * 2.5;   // ≈ 40px — 주인공(75px)의 절반 남짓, 가슴 높이
  const release = world.shotFlashMs > 0 ? world.shotFlashMs / 160 : 0;
  const cd = Math.max(0.01, basicCooldownOf(world));
  const charge = Math.min(1, 1 - Math.max(0, world.basicTimer) / cd);
  const pull = release > 0 ? 0 : Math.max(0, Math.min(1, charge * 1.15));
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(world.aimAngle);
  ctx.translate(-5 * release, 0);   // 반동
  if (p.anim === "hit") ctx.globalAlpha = 0.75;
  drawRecurveBow(ctx, L, pull, release, release <= 0 && pull >= 1);
  ctx.restore();
}

/**
 * 지팡이 (2026-10-08, 사용자: "활이나 지팡이로 마법을 쏠 때 애니메이션이 동작을 안 해") — 장착 무기가 지팡이면 활 대신
 * 지팡이를 조준 방향으로 들고, 재사용이 차는 동안 끝의 구슬이 커지며, 쏘는 순간(shotFlashMs) 구슬이 터지고 고리가 퍼진다.
 */
function drawHeroStaff(ctx: CanvasRenderingContext2D, world: GameWorld, p: Player): void {
  const hand = bowHand(world);
  const L = p.radius * 2.6;
  const release = world.shotFlashMs > 0 ? world.shotFlashMs / 160 : 0;
  const cd = Math.max(0.01, basicCooldownOf(world));
  const charge = Math.min(1, 1 - Math.max(0, world.basicTimer) / cd);
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(world.aimAngle);
  ctx.translate(-4 * release, 0);   // 반동
  if (p.anim === "hit") ctx.globalAlpha = 0.75;
  // 막대 — 조준선 위로 L 만큼
  ctx.lineCap = "round";
  ctx.strokeStyle = "#5b3a1e"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-L * 0.35, 0); ctx.lineTo(L * 0.6, 0); ctx.stroke();
  ctx.strokeStyle = "#d9a441"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-L * 0.3, -1); ctx.lineTo(L * 0.55, -1); ctx.stroke();
  // 구슬 — 재사용이 찰수록 크고 밝다. 쏘는 순간 터지며 고리가 퍼진다
  const orb = 4 + charge * 3 + release * 5;
  const g = ctx.createRadialGradient(L * 0.62, 0, 1, L * 0.62, 0, orb * 2.2);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, "#93c5fd"); g.addColorStop(1, "rgba(59,130,246,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L * 0.62, 0, orb * 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = release > 0 ? "#ffffff" : "#bfdbfe";
  ctx.beginPath(); ctx.arc(L * 0.62, 0, orb * 0.7, 0, Math.PI * 2); ctx.fill();
  if (release > 0) {
    ctx.strokeStyle = `rgba(191,219,254,${0.9 * release})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(L * 0.62, 0, orb * 2.6 * (1.4 - release), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

export function createPlayer(width: number, floorY: number): Player {
  return {
    x: width / 2,
    y: floorY - BASE_RADIUS,
    vx: 0,
    vy: 0,
    radius: BASE_RADIUS,
    onGround: true,
    facing: 1,
    anim: "idle",
    animTime: 0,
    invulnMs: 0,
    hp: 3,
    maxHp: 3,
    damageBuffer: 0,
    dashCdMs: 0,
    dashActiveMs: 0,
    slowCdMs: 0,
    slowActiveMs: 0,
    landingFxMs: 0,
    shootMs: 0,
    shootAngle: -Math.PI / 2,
    gear: { helmet: 0, armor: 0, weapon: 0, shield: 0, gloves: 0, boots: 0 },
  };
}

export function resetPlayer(player: Player, width: number, floorY: number, extraLives: number): void {
  player.x = width / 2;
  player.y = floorY - player.radius;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.facing = 1;
  player.anim = "idle";
  player.animTime = 0;
  player.invulnMs = 0;
  player.maxHp = 3 + extraLives;
  player.hp = player.maxHp;
  player.damageBuffer = 0;
  player.dashCdMs = 0;
  player.dashActiveMs = 0;
  player.slowCdMs = 0;
  player.shootMs = 0;
  player.shootAngle = -Math.PI / 2;
  player.slowActiveMs = 0;
  player.landingFxMs = 0;
}

export function drawStickman(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
): void {
  const p = world.player;
  // 쓰러질 때는 깜빡이지 않는다 — 깜빡이면 넘어가는 동작이 안 보인다 (2026-10-01)
  const blink = p.anim !== "dead" && p.invulnMs > 0 && Math.floor(p.invulnMs / 60) % 2 === 0;
  if (blink) return;

  const floorY = world.floorY;
  const air = Math.max(0, floorY - (p.y + p.radius));
  const shadowScale = Math.max(0.35, 1 - air / 220);
  ctx.fillStyle = `rgba(0,0,0,${0.28 * shadowScale})`;
  ctx.beginPath();
  ctx.ellipse(p.x, floorY - 2, p.radius * 1.15 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  const sheetMode: "idle" | "walk" = HERO_ANIM && p.anim === "run" ? "walk" : "idle";
  const idleHero = getExpeditionHero(sheetMode);
  // 쏘는 동작 (2026-10-08, 사용자: "활이나 지팡이로 쏠 때 애니메이션이 동작을 안 해"): 기본 사격·스킬 무기 발사마다 무기 시트가 한 번 돈다
  const shooting = p.shootMs > 0 && p.anim !== "dead" && p.anim !== "hit" && p.anim !== "dash";
  const hero = idleHero;   // 2026-10-16: 쏠 때도 같은 대기 시트 — 동작은 아래 캔버스 기울임(당김 ↶ · 놓음 ↷)
  if (hero?.complete && hero.naturalWidth > 0) {
    // 검격 시트는 4프레임이다 (2400×887, 프레임 600). 프레임 수를 잘못 나누면 캐릭터가 경계에서 잘리고
    // 옆 프레임 캐릭터가 함께 그려진다 — naturalWidth / 4 로 자른다.
    // 2판: 걷기 시트가 실제로 받아졌을 때만 걷기 칸 수(받기 전엔 대기 시트로 그린다)
    const usedMode: "idle" | "walk" = HERO_ANIM && hero === expeditionHero.walk ? "walk" : "idle";
    const frameCount = heroFrames(usedMode);
    const frameWidth = hero.naturalWidth / frameCount;
    const frameRate = p.anim === "run" ? 1000 / heroFrameMs("walk") : p.anim === "dash" ? 14 : p.anim === "skill" ? 7 : 1000 / heroFrameMs("idle");
    const frame = Math.floor(p.animTime * frameRate) % frameCount;
    const fig = FIG_IDLE;
    // 인물 키를 시트와 상관없이 같게 — 반지름 5.2배(≈77px). 예전 4.57배(67px)는 폰에서 작다고 읽혔다(2026-10-15 원화 감사).
    // 활 길이(반지름 2.5배)가 맞춰 둔 "주인공 75px" 에 가깝다 — 활 손은 skillShots BOW_HAND(앞 20 · 턱 −28)로 함께 옮겼다. 판정 반지름은 그대로
    const drawHeight = (p.radius * HERO_FIG_RADII * 100) / (fig.y1 - fig.y0);
    const drawWidth = drawHeight * (frameWidth / hero.naturalHeight);
    ctx.save();
    ctx.imageSmoothingQuality = "high";   // 780px 칸을 ~150 실픽셀로 줄인다 — 기본(low)은 거칠고 흐릿했다
    ctx.translate(p.x, p.y + p.radius);
    // 시트마다 기준 방향이 다르다: idle 시트는 왼쪽(-1), 검격 시트는 4프레임 모두
    // 오른쪽(+1)을 본다. 일괄 -1을 곱하면 검격이 바라보는 방향과 반대로 베어진다.
    const nativeFacing = EXPEDITION_NATIVE_FACING;   // 무기 시트도 대기처럼 오른쪽을 본다 (prompt: facing right)
    ctx.scale(p.facing * nativeFacing, 1);
    if (p.anim === "run" && !HERO_ANIM) ctx.rotate(Math.sin(p.animTime * 18) * 0.025);   // 2판은 걷기 칸이 뒤뚱거림을 갖는다
    // 위를 바라본다 (2026-10-08, 사용자: "방어 원정에서는 위를 바라보고"): 몬스터는 위에서 내려오므로 조준 각도만큼
    // 몸이 뒤로 젖혀지고 머리가 들린다. 옆모습 원화라 완전한 뒷모습은 못 되지만 "위를 보며 쏜다"가 읽힌다
    if (p.anim !== "dead" && p.anim !== "hit") {
      const aimUp = Math.max(0, -Math.sin(world.aimAngle));
      const aimFwd = Math.cos(world.aimAngle) * p.facing;   // 바라보는 쪽이면 +, 등 뒤면 −
      ctx.rotate(-0.2 * aimUp * (aimFwd >= 0 ? 1 : -1) - 0.08 * aimUp);
      ctx.translate(0, -3 * aimUp);
    }
    if (shooting) {
      // 쏘는 순간 — 당겼다 놓는 반동: 300ms 안에서 뒤로 2px → 앞으로 5px, 살짝 늘어난다
      const k = 1 - p.shootMs / SHOOT_MS;
      const rel = k < 0.3 ? 0 : Math.sin(((k - 0.3) / 0.7) * Math.PI);
      ctx.translate(-2 * (1 - rel) + 5 * rel, -2 * rel);
      ctx.rotate(-0.05 * Math.min(1, k / 0.3) * (1 - rel) + 0.08 * rel);   // 당길 때 뒤로 젖혔다가 놓으며 앞으로 숙인다 — 파츠도 같이 기운다
      ctx.scale(1 + 0.04 * rel, 1 - 0.03 * rel);
    }
    if (p.anim === "jump" || p.anim === "fall") {
      // 고정 포즈(-0.08 / +0.06)는 정점과 착지에서 순간 전환되어 뚝 튄다.
      // 수직 속도를 그대로 포즈로 환산하면 상승→정점→낙하가 한 곡선으로 이어진다.
      // 분모 700은 기본 점프력(560)+α — 도약 직후 거의 최대 기울기가 나오는 값.
      const k = Math.max(-1, Math.min(1, p.vy / 700));
      ctx.rotate(k * 0.075);
      ctx.scale(1 + k * 0.05, 1 - k * 0.07);
    }
    if (p.anim === "dash") ctx.rotate(-0.16);
    if (p.landingFxMs > 0 && p.onGround) {
      // 착지 스쿼시 — 링 이펙트(landingFxMs)와 같은 타이밍으로 몸도 눌렸다 펴진다.
      const s = p.landingFxMs / 180;
      ctx.scale(1 + 0.07 * s, 1 - 0.09 * s);
    }
    // 일제 사격 — 당길 때 몸이 살짝 뒤로(drawPhase), 놓을 때 앞으로 쏠린다(releasePhase). 검을 휘두르던 회전은 뺐다
    let drawPhase = 0, releasePhase = 0;
    if (p.anim === "skill") {
      const phase = Math.min(1, p.animTime / 0.28);
      drawPhase = phase < 0.28 ? phase / 0.28 : 1;
      releasePhase = phase < 0.28 ? 0 : Math.sin(((phase - 0.28) / 0.72) * Math.PI);
      ctx.translate(-p.facing * 3 * drawPhase + p.facing * 6 * releasePhase, -1 * releasePhase);
      ctx.rotate(-0.07 * drawPhase * (1 - releasePhase) + 0.1 * releasePhase);
      ctx.scale(1 + releasePhase * 0.03, 1 - releasePhase * 0.02);
    }
    // 피격 — 반투명만으로는 "맞았다"가 안 읽혔다. 맞은 쪽 반대로 몸이 젖혀졌다가 돌아오고 붉게 번쩍인다 (2026-10-01)
    if (p.anim === "hit") {
      const k = Math.max(0, 1 - p.animTime / 0.35);
      ctx.globalAlpha = 0.62 + 0.3 * (1 - k);
      ctx.rotate(-p.facing * 0.22 * k);
      ctx.translate(-p.facing * 6 * k, 0);
      if (k > 0.4) ctx.filter = "brightness(1.6) saturate(1.4)";
    }
    // 쓰러짐 — 그대로 서 있던 것을 뒤로 넘어가며 가라앉게 (0.5초)
    if (p.anim === "dead") {
      const k = Math.min(1, p.animTime / 0.5);
      const e = 1 - (1 - k) * (1 - k);
      ctx.rotate(-p.facing * 1.35 * e);
      ctx.translate(-p.facing * 10 * e, -drawWidth * 0.22 * e);   // 눕힌 몸이 바닥선에 걸치지 않게 띄운다
      ctx.globalAlpha = 1 - 0.35 * e;
      ctx.filter = "saturate(" + (1 - 0.6 * e) + ")";
    }
    if (p.dashActiveMs > 0) {
      for (let trail = 3; trail >= 1; trail--) {
        ctx.globalAlpha = 0.1 * (4 - trail);
        ctx.drawImage(hero, frame * frameWidth, 0, frameWidth, hero.naturalHeight, -drawWidth / 2 - trail * 13, -drawHeight, drawWidth, drawHeight);
      }
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(
      hero,
      frame * frameWidth,
      0,
      frameWidth,
      hero.naturalHeight,
      -drawWidth / 2,
      -drawHeight,
      drawWidth,
      drawHeight,
    );
    // 파츠 오버레이는 걷었다 (2026-10-19, 사용자: "주인공 캐릭터는 무기 제외하고는 포함되지 않게") — 무기(활·지팡이)만 아래에서 그린다
        ctx.restore();
    if (p.anim !== "dead") { if (world.rangedWeapon === "staff") drawHeroStaff(ctx, world, p); else drawHeroBow(ctx, world, p); }

    if (p.landingFxMs > 0) {
      const progress = 1 - p.landingFxMs / 180;
      ctx.strokeStyle = `rgba(148, 163, 184, ${Math.max(0, .55 * (1 - progress))})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, floorY - 2, 12 + progress * 28, 3 + progress * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 일제 사격의 화살 부채꼴은 draw.ts 가 그린다 (검 호를 대신한다)
    return;
  }

  const t = p.animTime;
  const facing = p.facing;
  let swing = 0;
  if (p.anim === "run") swing = Math.sin(t * 12) * 0.55;
  else if (p.anim === "idle") swing = Math.sin(t * 3) * 0.08;
  else if (p.anim === "jump" || p.anim === "fall") swing = 0.35;
  else if (p.anim === "hit") swing = Math.sin(t * 20) * 0.8;
  else if (p.anim === "dead") swing = 1.2;

  const color = p.anim === "hit" || p.anim === "dead" ? "#fca5a5" : "#e2e8f0";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const hx = p.x;
  const hy = p.y - p.radius * 0.85;
  const bodyTop = hy + 10;
  const bodyBot = p.y + p.radius * 0.55;

  // head
  ctx.beginPath();
  ctx.arc(hx, hy, 7.5, 0, Math.PI * 2);
  ctx.stroke();

  // Shared Dodge Lab identity: teal core and a slim equipped blade.
  ctx.fillStyle = p.anim === "hit" ? "#fb7185" : "#5eead4";
  ctx.shadowColor = p.anim === "hit" ? "#fb7185" : "#2dd4bf";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(hx, bodyTop + 13, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // torso
  ctx.beginPath();
  ctx.moveTo(hx, bodyTop);
  ctx.lineTo(hx, bodyBot);
  ctx.stroke();

  // arms
  const ax = hx;
  const ay = bodyTop + 6;
  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(ax + 11 * facing, ay + 13);
  ctx.lineTo(ax + 22 * facing, ay - 10);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - 12 * facing - swing * 8, ay + 14 + swing * 6);
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + 12 * facing + swing * 4, ay + 14 - swing * 6);
  ctx.stroke();

  // legs
  const lx = hx;
  const ly = bodyBot;
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx - 10 * facing - swing * 10, ly + 16 - Math.abs(swing) * 4);
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx + 10 * facing + swing * 10, ly + 16 - Math.abs(swing) * 4);
  ctx.stroke();

  if (p.slowActiveMs > 0) {
    ctx.strokeStyle = "rgba(94, 234, 212, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, world.stats.slowRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (p.dashActiveMs > 0) {
    ctx.strokeStyle = "rgba(248, 250, 252, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - facing * 22, p.y);
    ctx.lineTo(p.x - facing * 40, p.y - 6);
    ctx.moveTo(p.x - facing * 22, p.y);
    ctx.lineTo(p.x - facing * 40, p.y + 6);
    ctx.stroke();
  }
}

export { GRAVITY };

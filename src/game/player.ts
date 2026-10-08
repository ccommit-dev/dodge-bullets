import type { GameWorld, Player } from "./types";
import { assetUrl } from "../asset";
import { basicCooldown as basicCooldownOf, bowHand } from "./skillShots";
import { drawRecurveBow } from "./arrowArt";

const GRAVITY = 1650;
const BASE_RADIUS = 16;
/** 쏘는 동작 길이(ms) — 기본 사격 재사용(0.55s)보다 짧아 연사해도 프레임이 매번 처음부터 돈다 */
export const SHOOT_MS = 300;
/** Source sheet faces left; multiply logical facing by this when drawing. */
// 대기 시트가 오른쪽을 보는 원화로 교체됐다(2026-09-08) — 예전 정면/왼쪽 시트는 -1 이었다
const EXPEDITION_NATIVE_FACING = 1;
let expeditionHero: HTMLImageElement | null = null;

function getExpeditionHero(): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  if (!expeditionHero) {
    expeditionHero = new Image();
    expeditionHero.src = assetUrl("titans/character/base/hero-idle.png");
  }
  return expeditionHero;
}

/**
 * 무기별 일제 사격 시트 — 대기 원화와 같은 인물이 활을 당기거나 지팡이를 드는 4프레임
 * (art-gen heroattack --weapon, scripts/make-hero-attack-sheet.mjs, 2026-10-01). 프레임 규격은 대기와 같다(높이 887 · 바닥 885).
 * 아직 안 실렸거나 파일이 없으면 null — 그때는 대기 시트 위에 무기를 당기는 포즈로 그린다.
 */
const weaponAttackSheets: Record<string, HTMLImageElement> = {};
function getWeaponAttackSheet(id: string): HTMLImageElement | null {
  if (typeof Image === "undefined" || id === "none") return null;
  if (!weaponAttackSheets[id]) {
    const img = new Image();
    img.src = assetUrl(`titans/generated/hero-${id}-sheet.png`);
    weaponAttackSheets[id] = img;
  }
  const img = weaponAttackSheets[id];
  return img.complete && img.naturalWidth > 0 ? img : null;
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

  const idleHero = getExpeditionHero();
  // 검 시트(hero-attack-sheet)는 지웠다 — 활만 쓰는 콘텐츠다 (2026-10-01). 일제 사격은 **장착 무기의** 시트
  // (활을 당기는 / 지팡이를 드는 같은 인물)로 그리고, 시트가 없으면 대기 시트 위에 무기를 당기는 포즈로 그린다.
  // 쏘는 동작 (2026-10-08, 사용자: "활이나 지팡이로 쏠 때 애니메이션이 동작을 안 해"): 기본 사격·스킬 무기 발사마다 무기 시트가 한 번 돈다
  const shooting = p.shootMs > 0 && p.anim !== "dead" && p.anim !== "hit" && p.anim !== "dash";
  const attackHero = p.anim === "skill" || shooting ? getWeaponAttackSheet(world.rangedWeapon) : null;
  const hero = attackHero ?? idleHero;
  if (hero?.complete && hero.naturalWidth > 0) {
    // 검격 시트는 4프레임이다 (2400×887, 프레임 600). 프레임 수를 잘못 나누면 캐릭터가 경계에서 잘리고
    // 옆 프레임 캐릭터가 함께 그려진다 — naturalWidth / 4 로 자른다.
    const frameCount = 4;
    const frameWidth = hero.naturalWidth / frameCount;
    const frameRate = p.anim === "run" ? 10 : p.anim === "dash" ? 14 : p.anim === "skill" ? 7 : 5;
    // 무기 시트는 메김 → 당김 → 놓음 → 복귀 순서라 돌리지 않고 한 번만 지나간다 (SWING_MS 320ms ÷ 4)
    const frame = attackHero ? (p.anim === "skill" ? Math.min(3, Math.floor(p.animTime / 0.085)) : Math.min(3, Math.floor((SHOOT_MS - p.shootMs) / (SHOOT_MS / 4)))) : Math.floor(p.animTime * frameRate) % 4;
    const drawHeight = p.radius * 4.7;
    const drawWidth = drawHeight * (frameWidth / hero.naturalHeight);
    ctx.save();
    ctx.translate(p.x, p.y + p.radius);
    // 시트마다 기준 방향이 다르다: idle 시트는 왼쪽(-1), 검격 시트는 4프레임 모두
    // 오른쪽(+1)을 본다. 일괄 -1을 곱하면 검격이 바라보는 방향과 반대로 베어진다.
    const nativeFacing = EXPEDITION_NATIVE_FACING;   // 무기 시트도 대기처럼 오른쪽을 본다 (prompt: facing right)
    ctx.scale(p.facing * nativeFacing, 1);
    if (p.anim === "run") ctx.rotate(Math.sin(p.animTime * 18) * 0.025);
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

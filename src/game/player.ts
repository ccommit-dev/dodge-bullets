import type { GameWorld, Player } from "./types";
import { assetUrl } from "../asset";

const GRAVITY = 1650;
const BASE_RADIUS = 16;
/** Source sheet faces left; multiply logical facing by this when drawing. */
const EXPEDITION_NATIVE_FACING = -1;
let expeditionHero: HTMLImageElement | null = null;
let expeditionHeroAttack: HTMLImageElement | null = null;

function getExpeditionHero(): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  if (!expeditionHero) {
    expeditionHero = new Image();
    expeditionHero.src = assetUrl("titans/character/base/hero-idle.png");
  }
  return expeditionHero;
}

function getExpeditionAttackHero(): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  if (!expeditionHeroAttack) {
    expeditionHeroAttack = new Image();
    expeditionHeroAttack.src = assetUrl("titans/generated/hero-attack-sheet.png");
  }
  return expeditionHeroAttack;
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
  player.slowActiveMs = 0;
  player.landingFxMs = 0;
}

export function drawStickman(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
): void {
  const p = world.player;
  const blink = p.invulnMs > 0 && Math.floor(p.invulnMs / 60) % 2 === 0;
  if (blink) return;

  const floorY = world.floorY;
  const air = Math.max(0, floorY - (p.y + p.radius));
  const shadowScale = Math.max(0.35, 1 - air / 220);
  ctx.fillStyle = `rgba(0,0,0,${0.28 * shadowScale})`;
  ctx.beginPath();
  ctx.ellipse(p.x, floorY - 2, p.radius * 1.15 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  const idleHero = getExpeditionHero();
  const attackHero = p.anim === "skill" ? getExpeditionAttackHero() : null;
  const hero = attackHero?.complete && attackHero.naturalWidth > 0 ? attackHero : idleHero;
  if (hero?.complete && hero.naturalWidth > 0) {
    const frameCount = hero === attackHero ? 3 : 4;
    const frameWidth = hero.naturalWidth / frameCount;
    const frameRate = p.anim === "run" ? 10 : p.anim === "dash" ? 14 : p.anim === "skill" ? 7 : 5;
    const frame = Math.floor(p.animTime * frameRate) % 4;
    const drawHeight = p.radius * 4.7;
    const drawWidth = drawHeight * (frameWidth / hero.naturalHeight);
    ctx.save();
    ctx.translate(p.x, p.y + p.radius);
    ctx.scale(p.facing * EXPEDITION_NATIVE_FACING, 1);
    if (p.anim === "run") ctx.rotate(Math.sin(p.animTime * 18) * 0.025);
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
    if (p.anim === "skill") {
      const phase = Math.min(1, p.animTime / 0.28);
      const windup = phase < 0.28 ? phase / 0.28 : 1;
      const release = phase < 0.28 ? 0 : Math.sin(((phase - 0.28) / 0.72) * Math.PI);
      ctx.translate(-p.facing * 5 * windup + p.facing * 13 * release, -2 * release);
      ctx.rotate((-0.08 * windup + 0.16 * release) * p.facing);
      ctx.scale(1 + release * 0.06, 1 - release * 0.035);
    }
    if (p.anim === "hit") ctx.globalAlpha = 0.62;
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

    if (p.landingFxMs > 0) {
      const progress = 1 - p.landingFxMs / 180;
      ctx.strokeStyle = `rgba(148, 163, 184, ${Math.max(0, .55 * (1 - progress))})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, floorY - 2, 12 + progress * 28, 3 + progress * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (p.slowActiveMs > 0) {
      const slashPhase = Math.min(1, p.animTime / 0.3);
      ctx.strokeStyle = "rgba(94, 234, 212, 0.35)";
      ctx.lineWidth = 3 + (1 - slashPhase) * 4;
      ctx.beginPath();
      const start = p.facing > 0 ? -1.15 : Math.PI - 1.15;
      ctx.arc(p.x, p.y, world.stats.slowRadius * (0.72 + slashPhase * 0.28), start, start + p.facing * Math.PI * 1.35, p.facing < 0);
      ctx.stroke();
    }
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

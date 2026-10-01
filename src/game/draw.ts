import { drawStickman } from "./player";
import { getStage } from "./stages";
import { REFLECT_DIST, SWING_ARC, SWING_MS } from "./arrows";
import { ELEMENT_COLOR, type Element } from "./skills";
import type { Arrow, GameWorld } from "./types";
import { assetUrl } from "../asset";

/**
 * 스테이지 배경 — 화살 원정 **전용** 배경 4종 (art-gen/batch-dodge-bg.sh).
 * 전에는 사냥터 지역 배경(초원·폐허·용암·심연)을 재사용해 스테이지 이름
 * (외곽 초소·붉은 협곡·왕실 사격장·검은 성문)과 장소가 맞지 않았고, 화살 가독성을 위해
 * 62% 어둡게 덮어 무엇이 있는지 보이지도 않았다 — 콘텐츠 고유의 장소로 읽히지 않았다 (2026-09-22).
 * 새 배경은 '어둡게 깔릴 판'으로 뽑았으므로(가운데 비움·강한 대비 없음) 덮는 막을 48% 로 줄인다.
 */
// 720px 축소본 — 원본(832×1216)을 매 프레임 그리면 저사양에서 첫 프레임이 끊긴다
const STAGE_BACKGROUNDS = [1, 2, 3, 4].map((n) => assetUrl(`dodge/bg/s${n}.webp`));
const bgCache: Array<HTMLImageElement | null> = [];
function stageBackground(stageIndex: number): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const i = Math.max(0, Math.min(STAGE_BACKGROUNDS.length - 1, stageIndex));
  if (bgCache[i] === undefined) {
    const img = new Image();
    img.decoding = "async";
    img.src = STAGE_BACKGROUNDS[i];
    bgCache[i] = img;
  }
  const img = bgCache[i];
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

const spriteCache = new Map<string, HTMLImageElement>();
/** 캔버스용 이미지 캐시 — 로드 전엔 null (그 프레임은 건너뛴다) */
function sprite(path: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let img = spriteCache.get(path);
  if (!img) { img = new Image(); img.decoding = "async"; img.src = assetUrl(path); spriteCache.set(path, img); }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** 시작 화면에서 4스테이지 배경을 미리 받아 둔다 (JSX 조건식에서 호출되므로 항상 true 를 돌려준다) */
export function preloadStageBackgrounds(): true {
  for (let i = 0; i < STAGE_BACKGROUNDS.length; i += 1) stageBackground(i);
  return true;
}

/** 화살 스프라이트 캐시 — dodge/arrows/<element>.png (수평, 촉이 오른쪽) */
const arrowImgs: Partial<Record<Element, HTMLImageElement>> = {};
function arrowImg(element: Element): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  if (!arrowImgs[element]) {
    const img = new Image();
    img.src = assetUrl(`dodge/arrows/${element}.png`);
    arrowImgs[element] = img;
  }
  return arrowImgs[element] ?? null;
}

/**
 * 활 사격 — 실제 화살 물체 · 궤적 · 명중 이펙트 (2026-09-29).
 * 적 화살(붉은 계열)과 섞이지 않게 아군 화살은 스프라이트 + 속성색 궤적으로 그린다.
 */
function drawSkillShots(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  // 번개 연쇄 선
  const b = world.boltFrom;
  if (b && b.ms > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.ms / 120);
    ctx.strokeStyle = ELEMENT_COLOR.bolt; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    ctx.shadowColor = ELEMENT_COLOR.bolt; ctx.shadowBlur = 8;
    for (const t of b.targets) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      const mx = (b.x + t.x) / 2 + ((b.ms * 7) % 30) - 15;
      ctx.lineTo(mx, (b.y + t.y) / 2);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const s of world.skillShots) {
    if (!s.active) continue;
    const color = ELEMENT_COLOR[s.element];
    const moving = s.vx !== 0 || s.vy !== 0;
    ctx.save();
    ctx.globalAlpha = s.fade;
    if (!moving) {
      // 화염 장판 — 머무는 불
      const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.radius);
      g.addColorStop(0, "rgba(255,247,237,.9)"); g.addColorStop(0.45, "rgba(251,146,60,.6)"); g.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      continue;
    }
    const ang = Math.atan2(s.vy, s.vx);
    // 궤적 — 속성색, 날아간 만큼 길어진다(최대 36px)
    const tail = Math.min(36, s.dist * 0.5);
    ctx.strokeStyle = color; ctx.lineWidth = s.element === "earth" ? 4 : 2.5; ctx.lineCap = "round";
    ctx.globalAlpha = s.fade * 0.55;
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(ang) * tail, s.y - Math.sin(ang) * tail);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    ctx.globalAlpha = s.fade;
    // 화살 물체
    ctx.translate(s.x, s.y); ctx.rotate(ang);
    if (s.basic && world.rangedWeapon === "staff") {
      // 지팡이의 기본 사격은 마력탄 — 나무 화살이 지팡이에서 나가면 어색하다 (2026-09-29)
      const r = s.radius > 10 ? 9 : 7;
      // [원소 전환]을 골랐으면 마력탄도 그 속성색으로
      const tint = s.element === "basic" ? "#7dd3fc" : color;
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
      g.addColorStop(0, "#f0f9ff"); g.addColorStop(0.5, tint); g.addColorStop(1, "rgba(56,189,248,0)");
      ctx.shadowColor = tint; ctx.shadowBlur = 10;
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      continue;
    }
    const img = arrowImg(s.element);
    const len = s.element === "earth" ? 34 : s.element === "basic" && s.radius > 10 ? 40 : 30;
    if (img?.complete && img.naturalWidth > 0) {
      const h = len * (img.naturalHeight / img.naturalWidth);
      ctx.shadowColor = color; ctx.shadowBlur = s.element === "basic" ? 0 : 8;
      ctx.drawImage(img, -len * 0.55, -h / 2, len, h);
    } else {
      // 스프라이트가 아직이면 선으로
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-len * 0.55, 0); ctx.lineTo(len * 0.35, 0); ctx.stroke();
      ctx.fillStyle = "#fff7ed";
      ctx.beginPath(); ctx.moveTo(len * 0.45, 0); ctx.lineTo(len * 0.2, -4); ctx.lineTo(len * 0.2, 4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // 상성 명중 — "상성!" 이 튀어 오른다. 표에만 있던 상성을 여기서 체감한다
  const ap = world.affinityPop;
  if (ap) {
    const t = 1 - ap.ms / 520;
    ctx.save();
    ctx.globalAlpha = Math.min(1, ap.ms / 200);
    ctx.fillStyle = ELEMENT_COLOR[ap.element];
    ctx.strokeStyle = "rgba(2,6,23,.85)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.font = "900 15px system-ui"; ctx.textAlign = "center";
    ctx.strokeText("상성!", ap.x, ap.y - 14 - t * 26);
    ctx.fillText("상성!", ap.x, ap.y - 14 - t * 26);
    ctx.restore();
  }

  // 명중 이펙트 — 속성별 링 + 파편
  for (const f of world.skillFx) {
    if (!f.active) continue;
    const t = 1 - f.ms / f.total;           // 0 → 1
    const color = ELEMENT_COLOR[f.element];
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.strokeStyle = color; ctx.lineWidth = f.element === "earth" ? 5 : 3;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * (0.3 + t * 0.7), 0, Math.PI * 2); ctx.stroke();
    if (f.element === "fire") {
      const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.radius * (0.4 + t * 0.6));
      g.addColorStop(0, "rgba(255,247,237,.8)"); g.addColorStop(0.5, "rgba(251,146,60,.5)"); g.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * (0.4 + t * 0.6), 0, Math.PI * 2); ctx.fill();
    }
    // 파편 6개 — 얼음은 날카롭게, 흙은 굵게
    ctx.fillStyle = color; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + t * 0.6;
      const d = f.radius * (0.2 + t * 0.9);
      const px = f.x + Math.cos(a) * d, py = f.y + Math.sin(a) * d;
      if (f.element === "ice") { ctx.beginPath(); ctx.moveTo(px, py - 5); ctx.lineTo(px + 3, py); ctx.lineTo(px, py + 5); ctx.lineTo(px - 3, py); ctx.closePath(); ctx.fill(); }
      else if (f.element === "bolt") { ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 6); ctx.lineTo(px + 2, py + 2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(px, py, f.element === "earth" ? 3.5 : 2.2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
}

function drawStageBackground(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  const { width, height, floorY } = world;
  const img = stageBackground(world.stageIndex);
  if (img) {
    // cover 맞춤 + 느린 가로 패럴랙스(플레이어 x 에 따라 ±3%)
    const scale = Math.max(width / img.naturalWidth, (floorY + 40) / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    const shift = ((world.player.x / Math.max(1, width)) - 0.5) * width * 0.06;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(img, (width - dw) / 2 - shift, floorY + 40 - dh, dw, dh);
    ctx.fillStyle = "rgba(8, 14, 28, 0.48)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  // 지면: 바닥선 아래 어두운 띠 + 잔디/돌 결
  const g = ctx.createLinearGradient(0, floorY, 0, height);
  g.addColorStop(0, "rgba(30, 41, 59, 0.95)");
  g.addColorStop(1, "rgba(2, 6, 23, 1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, floorY, width, height - floorY);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;
  for (let x = (world.animClock * 8) % 28; x < width; x += 28) {
    ctx.beginPath(); ctx.moveTo(x, floorY + 6); ctx.lineTo(x + 10, floorY + 6); ctx.stroke();
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, a: Arrow): void {
  if (a.reflected) {
    // 반사된 화살 — 금색, 궁수에게 되돌아가는 중
    const c = Math.cos(a.angle), sn = Math.sin(a.angle), h = a.length * 0.5;
    ctx.save();
    ctx.strokeStyle = "#fde68a"; ctx.fillStyle = "#fde68a"; ctx.lineWidth = 3; ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(a.x - c * h, a.y - sn * h); ctx.lineTo(a.x + c * h, a.y + sn * h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(a.x + c * h, a.y + sn * h); ctx.lineTo(a.x + c * (h - 8) - sn * 4, a.y + sn * (h - 8) + c * 4); ctx.lineTo(a.x + c * (h - 8) + sn * 4, a.y + sn * (h - 8) - c * 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    return;
  }
  const cos = Math.cos(a.angle);
  const sin = Math.sin(a.angle);
  const half = a.length * 0.5;
  const tx = a.x + cos * half;
  const ty = a.y + sin * half;
  const bx = a.x - cos * half;
  const by = a.y - sin * half;
  const px = -sin;
  const py = cos;
  const bossPalette = ["#fb7185", "#f97316", "#a78bfa", "#facc15", "#22d3ee"];
  const bossColor = bossPalette[Math.max(0, a.bossTier - 1) % bossPalette.length];

  if (a.splitLevel > 0) {
    ctx.save();
    const splitColor = a.splitLevel === 1 ? "#67e8f9" : a.splitLevel === 2 ? "#c084fc" : "#fbbf24";
    ctx.globalAlpha = a.orbitMs > 0 ? 0.82 : 0.42;
    ctx.strokeStyle = splitColor;
    ctx.lineWidth = 2 + a.splitLevel * 0.45;
    ctx.shadowColor = splitColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    if (a.orbitMs > 0) {
      ctx.ellipse(a.orbitX, a.orbitY, a.orbitRadius * a.orbitStretch, a.orbitRadius / a.orbitStretch, a.orbitAngle * 0.18, 0, Math.PI * 1.72);
    } else {
      ctx.arc(a.x, a.y, 7 + a.splitLevel * 2, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.fillStyle = splitColor;
    ctx.globalAlpha = 0.65;
    for (let i = 0; i < 4; i++) {
      const trail = a.angle + Math.PI + i * 0.18;
      ctx.beginPath();
      ctx.arc(a.x + Math.cos(trail) * (6 + i * 4), a.y + Math.sin(trail) * (6 + i * 4), Math.max(1, 3 - i * 0.55), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (a.warningMs > 0) {
    const pulse = 0.25 + 0.45 * (1 - a.warningMs / 560);
    ctx.save();
    ctx.globalAlpha = pulse;
    const warningColor = a.telegraph === "homing" ? "#c084fc" : a.telegraph === "dash" ? "#38bdf8" : a.telegraph === "perfect" ? "#facc15" : a.telegraph === "blast" ? "#f97316" : "#fb3f5c";
    ctx.strokeStyle = warningColor;
    ctx.lineWidth = a.telegraph === "blast" ? 9 : 3;
    ctx.setLineDash([8, 8]);
    if (a.telegraph === "blast") {
      ctx.beginPath();
      ctx.ellipse(a.x, Math.max(a.y, ty), 34, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x + cos * 900, a.y + sin * 900);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = warningColor;
    ctx.font = "800 11px system-ui";
    const warningText = a.telegraph === "homing" ? "유도탄" : a.telegraph === "sniper" ? "저격 0.8" : a.telegraph === "blast" ? "폭발" : a.telegraph === "charge" ? "측면 돌진" : a.telegraph === "aerial" ? "점프" : a.telegraph === "dash" ? "대시 관통" : "PERFECT";
    // 위는 상단 버튼·HUD 글자(왼쪽 열이 더 길다)·일섬 게이지, 아래는 스킬 슬롯·조작 버튼이 덮는다 — 그 사이에만 쓴다
    const lx = Math.max(8, Math.min(ctx.canvas.clientWidth - 76, a.x));
    const top = labelBounds.top + (lx < labelBounds.leftColumn ? labelBounds.leftExtra : 0);
    ctx.fillText(warningText, lx, Math.max(top, Math.min(labelBounds.bottom, a.y + 18)));
    ctx.restore();
  }

  ctx.strokeStyle = a.boss ? bossColor : a.kind === "homing" ? "#c084fc" : a.telegraph === "perfect" ? "#facc15" : a.kind === "explosive" ? "#f59e0b" : a.kind === "ricochet" ? "#38bdf8" : "#f87171";
  ctx.fillStyle = a.boss ? "#fff7ed" : a.kind === "homing" ? "#e9d5ff" : a.telegraph === "perfect" ? "#fef08a" : a.kind === "explosive" ? "#fde68a" : "#fca5a5";
  ctx.lineWidth = a.boss ? 6 + Math.min(5, a.bossTier) : 2.4;
  ctx.lineCap = "round";

  if (a.boss) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = bossColor;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 14 + Math.min(12, a.bossTier * 2);
    ctx.shadowColor = bossColor;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.restore();
  }

  // shaft
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  if (a.kind === "explosive") {
    ctx.beginPath();
    ctx.arc(a.x, a.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(251, 191, 36, 0.5)";
    ctx.fill();
  }
  if (a.kind === "homing") {
    ctx.save();
    ctx.strokeStyle = "rgba(192,132,252,.58)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 9 + Math.sin(performance.now() * 0.012) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // tip
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - cos * 9 + px * 4.5, ty - sin * 9 + py * 4.5);
  ctx.lineTo(tx - cos * 9 - px * 4.5, ty - sin * 9 - py * 4.5);
  ctx.closePath();
  ctx.fill();

  // fletching — 축 위 한 점에서 뒤·바깥으로 눕는 꼬리 깃 (촉보다 얇게)
  ctx.strokeStyle = "#fda4af";
  ctx.lineWidth = Math.max(1.4, ctx.lineWidth * 0.6);
  ctx.beginPath();
  ctx.moveTo(bx + cos * 8, by + sin * 8);
  ctx.lineTo(bx - cos * 1.5 + px * 3.8, by - sin * 1.5 + py * 3.8);
  ctx.moveTo(bx + cos * 8, by + sin * 8);
  ctx.lineTo(bx - cos * 1.5 - px * 3.8, by - sin * 1.5 - py * 3.8);
  ctx.stroke();
}

/**
 * 손맛 연출 — 얼어붙은 화살 · 파편 · 연속 요격 · 습득 빛 (2026-09-29).
 * 화살과 주인공 위에 그린다. 판정과 무관하다.
 */
function drawJuice(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  // 얼어붙은 화살 — 빙결은 핵심 피드백인데 화살 모양이 그대로였다. 서리가 끼고 푸르게 빛난다
  for (const a of world.arrows) {
    if (!a.active || a.chilledMs <= 0 || a.reflected) continue;
    const k = Math.min(1, a.chilledMs / 600);
    const c = Math.cos(a.angle), sn = Math.sin(a.angle), h = a.length * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.85 * k;
    ctx.strokeStyle = "#a5f3fc"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.shadowColor = "#67e8f9"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(a.x - c * h, a.y - sn * h); ctx.lineTo(a.x + c * h, a.y + sn * h); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 1.5; ctx.strokeStyle = "#f0f9ff";
    // 서리 가시 — 화살대에 직각으로 셋
    for (let i = -1; i <= 1; i += 1) {
      const mx = a.x + c * h * 0.55 * i, my = a.y + sn * h * 0.55 * i;
      ctx.beginPath(); ctx.moveTo(mx - sn * 5, my + c * 5); ctx.lineTo(mx + sn * 5, my - c * 5); ctx.stroke();
    }
    ctx.restore();
  }

  // 체력 눈금 — 맞고도 안 부서진 화살만. 몇 발 더 필요한지가 보여야 "피해"가 읽힌다 (2026-09-29)
  for (const a of world.arrows) {
    if (!a.active || a.boss || a.reflected || a.maxHp <= 0 || a.hp >= a.maxHp) continue;
    const w = 22, x = a.x - w / 2, y = a.y - 16;
    ctx.save();
    ctx.fillStyle = "rgba(2,6,23,.75)"; ctx.fillRect(x - 1, y - 1, w + 2, 5);
    ctx.fillStyle = a.hitFlashMs > 0 ? "#f8fafc" : "#fb7185";
    ctx.fillRect(x, y, w * Math.max(0, a.hp / a.maxHp), 3);
    if (a.hitFlashMs > 0) {
      // 맞은 순간 화살이 하얗게 번쩍인다
      const c = Math.cos(a.angle), sn = Math.sin(a.angle), h = a.length * 0.5;
      ctx.globalAlpha = a.hitFlashMs / 140;
      ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(a.x - c * h, a.y - sn * h); ctx.lineTo(a.x + c * h, a.y + sn * h); ctx.stroke();
    }
    ctx.restore();
  }

  // 습득한 순간 — 주인공을 감싸는 빛이 퍼져 나간다
  const aura = world.heroAura;
  if (aura) {
    const t = 1 - aura.ms / 900;
    const color = ELEMENT_COLOR[aura.element];
    ctx.save();
    for (let i = 0; i < 2; i += 1) {
      const tt = Math.min(1, t * 1.25 - i * 0.22);
      if (tt <= 0) continue;
      ctx.globalAlpha = (1 - tt) * 0.9;
      ctx.strokeStyle = color; ctx.lineWidth = 4 - i * 1.5;
      ctx.shadowColor = color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(world.player.x, world.player.y - 14, 18 + tt * 70, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  // 파편 — 수명에 따라 작아지며 사라진다
  for (const p of world.sparks) {
    if (!p.active) continue;
    const k = p.ms / p.total;
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.6, p.size * (0.4 + k * 0.6)), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 연속 요격 — 셋부터. 쌓일수록 커지고, 방금 오른 순간 튄다
  if (world.streak >= 3 && world.streakMs > 0) {
    const pop = Math.max(0, (world.streakMs - 1300) / 200);   // 갱신 직후 0.2초
    const size = Math.min(26, 13 + world.streak * 0.9) * (1 + pop * 0.35);
    ctx.save();
    ctx.globalAlpha = Math.min(1, world.streakMs / 400);
    ctx.font = `900 ${size.toFixed(1)}px system-ui`; ctx.textAlign = "center";
    ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(2,6,23,.85)";
    ctx.fillStyle = world.streak >= 10 ? "#fde047" : world.streak >= 6 ? "#fdba74" : "#e0f2fe";
    const y = world.player.y - 62;
    ctx.strokeText(`요격 ×${world.streak}`, world.player.x, y);
    ctx.fillText(`요격 ×${world.streak}`, world.player.x, y);
    ctx.restore();
  }
}

/** 화면 흔들림을 씌워 한 프레임을 그린다 — 폭발·강타가 묵직하게 읽히게 */
export function drawFrame(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  const shaking = world.shakeMs > 0 && world.shakeAmp > 0;
  if (shaking) {
    // 시간으로 방향을 정한다(난수 없음) — 남은 시간이 줄수록 잦아든다
    const k = world.shakeAmp * Math.min(1, world.shakeMs / 120);
    ctx.save();
    ctx.translate(Math.sin(world.shakeMs * 0.19) * k, Math.cos(world.shakeMs * 0.23) * k);
  }
  drawFrameInner(ctx, world);
  if (shaking) ctx.restore();
}

/** 보스 막대의 세로 위치(safeTop 기준) — verify-dodge-hud 가 DOM HUD 와 겹치지 않는지 잰다 */
export const BOSS_BAR_TOP = 270;

/** 캔버스 글자가 DOM HUD 에 가려지지 않는 세로 범위 — drawFrameInner 가 매 프레임 채운다 */
const labelBounds = { top: 120, bottom: 600, leftColumn: 205, leftExtra: 72 };

/** 일섬 게이지 — 화살·이펙트보다 **위**에 그린다. 아래에 그리면 날아가는 화살이 숫자를 가린다 (2026-09-29) */
function drawSlashGauge(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  if (world.elapsedMs <= 0) return;   // 준비 화면에서는 오버레이 뒤로 비친다
  const { width } = world;
  ctx.save();
  const trackerW = Math.min(190, width - world.safeLeft - world.safeRight - 24);
  const trackerX = width - world.safeRight - trackerW - 12;
  const trackerY = world.safeTop + 76;
  const full = world.slashGauge >= 100;
  ctx.fillStyle = "rgba(8,47,73,.82)";
  ctx.strokeStyle = full ? "#fde68a" : "rgba(103,232,249,.7)";
  ctx.lineWidth = 2;
  ctx.fillRect(trackerX, trackerY, trackerW, 26);
  ctx.strokeRect(trackerX, trackerY, trackerW, 26);
  const gw = trackerW - 20;
  ctx.fillStyle = "rgba(15,23,42,.8)";
  ctx.fillRect(trackerX + 10, trackerY + 14, gw, 7);
  ctx.fillStyle = full ? "#fde68a" : "#f59e0b";
  ctx.fillRect(trackerX + 10, trackerY + 14, gw * Math.min(1, world.slashGauge / 100), 7);
  ctx.fillStyle = full ? "#fde68a" : "#e0f2fe";
  ctx.font = "900 10px system-ui";
  ctx.fillText(full ? "화살비 준비" : `화살비 ${Math.round(world.slashGauge)}%`, trackerX + 10, trackerY + 11);
  ctx.restore();
}

function drawFrameInner(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  const { width, height, safeTop, safeBottom, arrows, platforms, floorY } = world;
  labelBounds.top = safeTop + (world.bossSpawned && !world.bossDefeated ? BOSS_BAR_TOP + 44 : 120);
  labelBounds.leftExtra = world.bossSpawned && !world.bossDefeated ? 0 : 72;
  labelBounds.bottom = floorY - 8;

  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, width, height);
  drawStageBackground(ctx, world);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(30, 58, 95, 0.45)");
  gradient.addColorStop(0.55, "rgba(11, 18, 32, 0)");
  gradient.addColorStop(1, "rgba(15, 23, 42, 0.55)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, safeTop);
  ctx.lineTo(width, safeTop);
  ctx.moveTo(0, height - safeBottom);
  ctx.lineTo(width, height - safeBottom);
  ctx.stroke();

  // Floor line
  ctx.strokeStyle = "rgba(94, 234, 212, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(width, floorY);
  ctx.stroke();

  // Platforms
  for (let i = 0; i < platforms.length; i++) {
    const pl = platforms[i];
    ctx.fillStyle = "rgba(51, 65, 85, 0.95)";
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.fillStyle = "rgba(94, 234, 212, 0.45)";
    ctx.fillRect(pl.x, pl.y, pl.w, 3);
  }

  if (world.stageIndex === 3) {
    // 추격대장 — 화면 오른쪽 끝에서 활을 당기는 궁수 대장 원화 (art-gen char captain). 로드 전엔 예전 붉은 기운만
    const captain = sprite("titans/generated/dodge/archer-captain.png");
    ctx.save();
    ctx.globalAlpha = 0.32 + Math.sin(world.animClock * 8) * 0.05;
    ctx.fillStyle = "#7f1d1d";
    ctx.beginPath();
    ctx.arc(width - 18, floorY - 42, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (captain) {
      const h = 118, w = h * (captain.naturalWidth / captain.naturalHeight);
      ctx.save();
      ctx.globalAlpha = world.bossDefeated ? 0.38 : 0.95;
      if (world.bossDefeated) ctx.filter = "grayscale(1)";
      ctx.translate(width - 6, floorY + 2);
      ctx.scale(-1, 1); // 원화는 오른쪽을 본다 — 플레이어(왼쪽)를 향하게 뒤집는다
      ctx.drawImage(captain, 0, -h + Math.sin(world.animClock * 2.2) * 2, w, h);
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = "#fecaca";
    ctx.font = "900 11px system-ui";
    ctx.shadowColor = "#000"; ctx.shadowBlur = 6;
    const captainLabel = world.bossDefeated ? "추격대장 격파" : world.bossSpawned ? `추격대장 · 격추 ${world.bossCutsLeft}` : "추격대장";
    ctx.fillText(captainLabel, width - 100, floorY - 124);
    ctx.restore();
  }

  const stageProgress = world.stageElapsedMs / Math.max(1, getStage(world.stageIndex).durationMs);
  if (world.chests === 0 && stageProgress >= 0.42 && stageProgress <= 0.78) {
    const chestX = width * 0.7;
    const chestY = floorY - 23;
    const chestImg = sprite("ui/attendance/event-chest.png");
    ctx.save();
    if (chestImg) {
      const bob = Math.sin(world.animClock * 3) * 2;
      ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 14;
      ctx.drawImage(chestImg, chestX - 22, chestY - 24 + bob, 44, 44);
    } else {
      ctx.fillStyle = "#92400e";
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 3;
      ctx.fillRect(chestX - 21, chestY - 17, 42, 27);
      ctx.strokeRect(chestX - 21, chestY - 17, 42, 27);
    }
    ctx.fillStyle = "#fbbf24";
    ctx.font = "800 11px system-ui";
    ctx.fillText("재료 상자", chestX - 27, chestY - 30);
    ctx.restore();
  }

  if (world.lastCutMs > 0 && world.lastCut) {
    ctx.save();
    const label = world.lastCut === "reflect" ? "되쏘기!" : world.lastCut === "ult" ? "화살비" : "격추";
    ctx.globalAlpha = Math.min(1, world.lastCutMs / 300);
    ctx.fillStyle = world.lastCut === "reflect" ? "#fde68a" : world.lastCut === "ult" ? "#f8fafc" : "#67e8f9";
    ctx.font = `900 ${world.lastCut === "ult" ? 34 : 16}px system-ui`;
    ctx.textAlign = "center";
    // 화살비는 화면 전체의 사건이라 가운데 위에 — 주인공 머리 위에 두면 "요격 ×N" 과 겹친다 (2026-10-01 캡처)
    if (world.lastCut === "ult") { ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 14; ctx.fillText(label, width * 0.5, height * 0.4); }
    else ctx.fillText(label, world.player.x, world.player.y - 46);
    ctx.restore();
  }
  if (world.ultFlashMs > 0) {
    // 화살비 — 섬광 위로 하늘에서 화살이 쏟아진다. 난수 없이 칸마다 위상을 다르게 (연출은 Math.random 을 안 쓴다)
    const t = 1 - world.ultFlashMs / 600;
    ctx.save();
    ctx.globalAlpha = Math.min(0.45, (1 - t) * 0.45);
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
    ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 6;
    const cols = 11;
    for (let i = 0; i < cols; i += 1) {
      const phase = ((i * 7919) % 97) / 97;
      const x = (i + 0.5) * (width / cols) + Math.sin(i * 1.7) * 9;
      const y = -40 + (height + 80) * Math.min(1, t * 1.4 + phase * 0.35);
      ctx.beginPath(); ctx.moveTo(x + 6, y - 42); ctx.lineTo(x, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 4, y - 7); ctx.lineTo(x, y); ctx.lineTo(x + 5, y - 6); ctx.stroke();
    }
    ctx.restore();
  }

  for (let i = 0; i < arrows.length; i++) {
    if (arrows[i].active) drawArrow(ctx, arrows[i]);
  }

  // 베기 파편 — 두 토막·불꽃·검광. 화살 뒤, 드롭 앞
  for (const d of world.slashDebris) {
    if (!d.active) continue;
    const life = Math.max(0, d.lifeMs / d.maxLifeMs);
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    if (d.kind === "streak") {
      ctx.globalAlpha = life;
      ctx.strokeStyle = d.color; ctx.lineWidth = 3 * life + 1; ctx.lineCap = "round";
      ctx.shadowColor = d.color; ctx.shadowBlur = 12;
      const l = d.len * (1 + (1 - life) * 0.9);
      ctx.beginPath(); ctx.moveTo(-l, 0); ctx.lineTo(l, 0); ctx.stroke();
    } else if (d.kind === "spark") {
      ctx.globalAlpha = life;
      ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, Math.max(0.6, d.len * 0.5 * life), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.globalAlpha = Math.min(1, life * 1.6);
      ctx.strokeStyle = d.color; ctx.fillStyle = d.color; ctx.lineWidth = 2.2; ctx.lineCap = "round";
      ctx.shadowColor = d.color; ctx.shadowBlur = 6;
      const h = d.len * 0.5;
      ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(h, 0); ctx.stroke();
      if (d.kind === "tip") {
        // 촉 토막: 끝에 화살촉
        ctx.beginPath(); ctx.moveTo(h, 0); ctx.lineTo(h - 8, 4); ctx.lineTo(h - 8, -4); ctx.closePath(); ctx.fill();
      } else {
        // 깃 토막: 끝에 깃
        ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(-h + 6, 5); ctx.moveTo(-h, 0); ctx.lineTo(-h + 6, -5); ctx.stroke();
      }
      // 잘린 단면 — 흰 점
      ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(d.kind === "tip" ? -h : h, 0, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  for (const drop of world.slashDrops) {
    if (!drop.active) continue;
    const color = drop.kind === "rune" ? "#f472b6" : drop.kind === "core" ? "#facc15" : "#67e8f9";
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(world.animClock * 2.4);
    ctx.fillStyle = color;
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    if (drop.kind === "edge") {
      ctx.moveTo(0, -13); ctx.lineTo(6, 5); ctx.lineTo(0, 12); ctx.lineTo(-6, 5);
    } else {
      ctx.moveTo(0, -11); ctx.lineTo(10, 0); ctx.lineTo(0, 11); ctx.lineTo(-10, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  for (const fx of world.slashHitFx) {
    if (!fx.active) continue;
    const alpha = Math.max(0, fx.lifeMs / fx.maxLifeMs);
    const pop = 1 + (1 - alpha) * 0.35;
    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.scale(pop, pop);
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 에너지 등급별 색: 낮음(시안) → 중간(보라) → 높음(주황). 치명은 금-적 + CRIT 라벨
    const tier = fx.energy >= 0.66 ? 2 : fx.energy >= 0.36 ? 1 : 0;
    const midColor = fx.boss ? "#fde047" : fx.crit ? "#fde68a" : tier === 2 ? "#fb923c" : tier === 1 ? "#a78bfa" : "#67e8f9";
    const lowColor = fx.boss ? "#fb7185" : fx.crit ? "#f97316" : tier === 2 ? "#ef4444" : tier === 1 ? "#7c3aed" : "#0ea5e9";
    const size = fx.boss ? 30 : fx.crit ? 28 : 20 + tier * 2;
    ctx.font = `italic 1000 ${size}px system-ui, sans-serif`;
    ctx.lineWidth = fx.boss || fx.crit ? 7 : 5;
    ctx.strokeStyle = fx.crit ? "#7c2d12" : "#3b0764";
    ctx.shadowColor = fx.crit ? "#fbbf24" : midColor;
    ctx.shadowBlur = fx.crit ? 22 : 16;
    ctx.strokeText(String(fx.value), 0, 0);
    const grad = ctx.createLinearGradient(0, -18, 0, 14);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.45, midColor);
    grad.addColorStop(1, lowColor);
    ctx.fillStyle = grad;
    ctx.fillText(String(fx.value), 0, 0);
    if (fx.crit) {
      ctx.font = "italic 900 11px system-ui, sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeText("CRITICAL", 0, -size * 0.78);
      ctx.fillStyle = "#fef3c7";
      ctx.fillText("CRITICAL", 0, -size * 0.78);
    } else if (tier === 2 && !fx.boss) {
      ctx.font = "900 9px system-ui, sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeText("HIGH ENERGY", 0, -size * 0.8);
      ctx.fillStyle = "#ffedd5";
      ctx.fillText("HIGH ENERGY", 0, -size * 0.8);
    }
    ctx.restore();
  }

  if (world.bossSpawned && !world.bossDefeated) {
    const barW = Math.min(280, width - world.safeLeft - world.safeRight - 36);
    const barX = (width - barW) * 0.5;
    // HUD 왼쪽 열(제목·점수·HP·위험도·레벨·진행바)과 가운데 안내 배너(BOSS · 패턴, ~262px) 아래 (2026-09-29 · 10-01 캡처)
    const barY = world.safeTop + BOSS_BAR_TOP;
    const ratio = world.bossMaxCuts > 0 ? world.bossCutsLeft / world.bossMaxCuts : 0;
    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,.9)";
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.fillRect(barX, barY, barW, 25);
    ctx.strokeRect(barX, barY, barW, 25);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(barX + 3, barY + 3, (barW - 6) * ratio, 19);
    ctx.fillStyle = "#fff";
    ctx.font = "900 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`보스 화살 · 남은 격추 ${world.bossCutsLeft}/${world.bossMaxCuts}`, width * 0.5, barY + 17);
    ctx.restore();
  }

  drawSkillShots(ctx, world);
  drawStickman(ctx, world);
  drawJuice(ctx, world);
  drawSlashGauge(ctx, world);

  if (world.player.slowActiveMs > 0) {
    // 베는 구간과 느려지는 구간을 **다르게** 그린다.
    // 전에는 둘 다 같은 칼 궤적이라, 실제로는 안 베는 시간(강화 시 최대 1.1초)에도
    // 칼이 번쩍여 "왜 안 베이지?" 가 됐다 (2026-09-21).
    const swingLeft = world.player.slowActiveMs - (world.stats.slowDurationMs - SWING_MS);
    const swinging = swingLeft > 0;
    ctx.save();
    if (swinging) {
      // 일제 사격 — 시위를 놓는 순간 화살 다섯 발이 앞쪽 부채꼴로 퍼져 나간다 (판정 호 SWING_ARC 와 같은 폭)
      const t = 1 - swingLeft / SWING_MS;
      const facing = world.player.facing;
      const px = world.player.x, py = world.player.y - 10;
      const reach = world.stats.slowRadius * (0.35 + t * 0.75);
      const half = SWING_ARC / 2;
      const sprite = arrowImg("basic");
      ctx.globalAlpha = 0.95 - t * 0.5;
      for (let i = 0; i < 5; i += 1) {
        const ang = (facing > 0 ? 0 : Math.PI) + facing * (-half + (SWING_ARC * (i + 0.5)) / 5) * 0.82;
        const r = reach * (0.86 + ((i * 37) % 7) * 0.02);
        const x = px + Math.cos(ang) * r, y = py + Math.sin(ang) * r;
        ctx.strokeStyle = "#e0f2fe"; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(px + Math.cos(ang) * r * 0.45, py + Math.sin(ang) * r * 0.45); ctx.lineTo(x, y); ctx.stroke();
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        if (sprite) ctx.drawImage(sprite, -16, -5, 32, 10);
        else { ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, 0); ctx.stroke(); }
        ctx.restore();
      }
      // 되쏘기 거리 링 — 이 안에서 쏘면 화살이 궁수에게 되돌아간다. 어디를 노려야 하는지 보여 준다
      ctx.globalAlpha = 0.75 - t * 0.3;
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(world.player.x, world.player.y, REFLECT_DIST, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // 느려진 장 — 칼이 아니라 '시간이 늘어진 공간'. 옅은 원 하나로만
      const rest = world.player.slowActiveMs / Math.max(1, world.stats.slowDurationMs - SWING_MS);
      ctx.globalAlpha = 0.16 * rest;
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(world.player.x, world.player.y, world.stats.slowRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

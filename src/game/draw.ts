import { drawStickman } from "./player";
import { getStage } from "./stages";
import type { Arrow, GameWorld } from "./types";
import { assetUrl } from "../asset";

/**
 * 스테이지 배경 — 사냥터 지역 배경을 재사용한다 (외곽 초소=초원, 붉은 협곡=폐허, 왕실 사격장=용암, 검은 성문=심연).
 * 텅 빈 남색 캔버스에 화살만 날아오던 것이 "전장"으로 읽히게. 화살 가독성을 위해 어두운 오버레이를 덮는다.
 */
// 캔버스용 축소본(720px, scripts/make-stage-backgrounds.mjs) — 원본(1536px)을 매 프레임 그리면 저사양에서 첫 프레임이 끊긴다
const STAGE_BACKGROUNDS = ["meadow", "ruins", "volcano", "abyss"].map((id) => assetUrl(`titans/backgrounds/${id}-sm.webp`));
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
    ctx.fillStyle = "rgba(8, 14, 28, 0.62)";
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
    ctx.fillText(warningText, Math.max(8, Math.min(ctx.canvas.clientWidth - 76, a.x)), Math.max(18, Math.min(ctx.canvas.clientHeight - 18, a.y + 18)));
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

  // fletching
  ctx.strokeStyle = "#fda4af";
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + cos * 6 + px * 5, by + sin * 6 + py * 5);
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + cos * 6 - px * 5, by + sin * 6 - py * 5);
  ctx.stroke();
}

export function drawFrame(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  const { width, height, safeTop, safeBottom, arrows, platforms, floorY } = world;

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
    const captainLabel = world.bossDefeated ? "추격대장 격파" : world.bossSpawned ? `추격대장 · 베기 ${world.bossCutsLeft}` : "추격대장";
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

  // 쳐낸 공격이 보급품으로 쌓이는 즉각적인 목표 피드백.
  ctx.save();
  const trackerW = Math.min(190, width - world.safeLeft - world.safeRight - 24);
  const trackerX = width - world.safeRight - trackerW - 12;
  const trackerY = world.safeTop + 76;
  ctx.fillStyle = "rgba(8,47,73,.88)";
  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 2;
  ctx.fillRect(trackerX, trackerY, trackerW, 54);
  ctx.strokeRect(trackerX, trackerY, trackerW, 54);
  ctx.fillStyle = "#e0f2fe";
  ctx.font = "700 11px system-ui";
  ctx.fillText(`처치 ${world.enemyKills} · 완벽 ${world.perfectDodges} · 상자 ${world.chests}`, trackerX + 10, trackerY + 16);
  ctx.font = "700 10px system-ui";
  ctx.fillStyle = "#fde68a";
  ctx.fillText(`보급 ${world.supplies} · 원정 인장 ${world.expeditionSeals}`, trackerX + 10, trackerY + 31);
  // 참격 게이지 — 가득 차면 일섬
  const gw = trackerW - 20;
  ctx.fillStyle = "rgba(15,23,42,.8)";
  ctx.fillRect(trackerX + 10, trackerY + 40, gw, 7);
  ctx.fillStyle = world.slashGauge >= 100 ? "#fde68a" : "#f59e0b";
  ctx.fillRect(trackerX + 10, trackerY + 40, gw * Math.min(1, world.slashGauge / 100), 7);
  ctx.fillStyle = "#fde68a";
  ctx.font = "700 9px system-ui";
  ctx.fillText(`참격 ${Math.round(world.slashGauge)}% · 반사 ${world.reflectKills}`, trackerX + 10, trackerY + 52 + 0);
  ctx.restore();
  if (world.lastCutMs > 0 && world.lastCut) {
    ctx.save();
    const label = world.lastCut === "reflect" ? "반사!" : world.lastCut === "ult" ? "일섬" : "파쇄";
    ctx.globalAlpha = Math.min(1, world.lastCutMs / 300);
    ctx.fillStyle = world.lastCut === "reflect" ? "#fde68a" : world.lastCut === "ult" ? "#f8fafc" : "#67e8f9";
    ctx.font = `900 ${world.lastCut === "ult" ? 30 : 16}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(label, world.player.x, world.player.y - 46);
    ctx.restore();
  }
  if (world.ultFlashMs > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, world.ultFlashMs / 600 * 0.55);
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(0, 0, width, height);
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
    const barY = world.safeTop + 126;
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
    ctx.fillText(`보스 화살 · 남은 검격 ${world.bossCutsLeft}/${world.bossMaxCuts}`, width * 0.5, barY + 17);
    ctx.restore();
  }

  drawStickman(ctx, world);

  if (world.player.slowActiveMs > 0) {
    const pulse = 1 - world.player.slowActiveMs / Math.max(1, world.stats.slowDurationMs);
    ctx.save();
    ctx.globalAlpha = 0.85 - pulse * 0.55;
    ctx.strokeStyle = "#67e8f9";
    ctx.lineWidth = 7;
    ctx.beginPath();
    const facing = world.player.facing;
    const start = facing > 0 ? -1.25 : Math.PI + 1.25;
    const end = facing > 0 ? 1.3 : Math.PI - 1.3;
    ctx.arc(world.player.x, world.player.y, world.stats.slowRadius * (0.55 + pulse * 0.55), start, end, facing < 0);
    ctx.stroke();
    ctx.restore();
  }
}

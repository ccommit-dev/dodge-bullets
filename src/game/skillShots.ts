import type { Arrow, GameWorld, RunMods } from "./types";
import {
  chainCooldown, chainTargets,
  flameCooldown, flameRadius,
  frostCooldown, frostRadius, frostSlow,
  pierceCooldown, pierceWidth,
  volleyCooldown, volleyShots,
  weaponCooldownMul,
  SKILL_BY_ID,
  type ExpeditionSkillId,
} from "./skills";

/**
 * 원거리 스킬 자동 발사 (2026-09-28).
 *
 * 참고 게임처럼 **조준은 자동**이고 플레이어는 위치와 성장에 집중한다.
 * 주인공은 장착한 원거리 무기(활·지팡이)로 쿨타임마다 스스로 쏴서 날아오는 화살을 요격한다.
 *
 * 난이도 원칙: 스킬은 **레벨 0 이면 아무것도 하지 않는다**. 기존 봇 시뮬 게이트
 * (1·2스테이지 클리어율·평균 피격, 4스테이지는 벽)는 레벨 0 에서 돌므로 기준선이 그대로다.
 * 레벨을 올리는 만큼만 쉬워진다 — 성장의 보상이 난이도 완화로 나타나는 구조다.
 */

export type SkillShotKind = "bolt" | "pierce" | "flame" | "frost" | "chain";

/** 카드가 하나도 안 쌓인 상태 — 이게 기존 난이도 기준선이다 */
export function emptyRunMods(): RunMods {
  return {
    volleyExtra: 0, boltPierce: 0, pierceWidthMul: 1, flameRadiusMul: 1, chainExtra: 0, frostSlowBonus: 0, cooldownMul: 1,
    chillHunt: false, chillBurst: false, evolutions: {},
    moveSpeedMul: 1, dashCooldownMul: 1, slashLevelBonus: 0, maxHpBonus: 0,
  };
}

export type SkillShot = {
  active: boolean;
  kind: SkillShotKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 효과 반경 (폭발·파동) 또는 관통 폭의 절반 */
  radius: number;
  lifeMs: number;
  /** 연출용 — 0..1 로 줄어든다 */
  fade: number;
  /** 남은 관통 횟수 — 볼트는 기본 0(한 발에 한 화살), 카드가 올린다 */
  hits: number;
  /** [유도 볼트] 진화 — 가장 가까운 화살을 쫓아간다 */
  seeker: boolean;
  /** [화염 장판] 진화 — 터지지 않고 머물며 들어오는 화살을 계속 태운다 */
  pyre: boolean;
};

const POOL = 40;

export function makeSkillShots(): SkillShot[] {
  return Array.from({ length: POOL }, () => ({
    active: false, kind: "bolt" as SkillShotKind, x: 0, y: 0, vx: 0, vy: 0,
    radius: 0, lifeMs: 0, fade: 1, hits: 0, seeker: false, pyre: false,
  }));
}

function spawn(world: GameWorld, s: Partial<SkillShot> & { kind: SkillShotKind }): void {
  const shot = world.skillShots.find((p) => !p.active);
  if (!shot) return;
  shot.active = true;
  shot.kind = s.kind;
  shot.x = s.x ?? world.player.x;
  shot.y = s.y ?? world.player.y;
  shot.vx = s.vx ?? 0;
  shot.vy = s.vy ?? 0;
  shot.radius = s.radius ?? 0;
  shot.lifeMs = s.lifeMs ?? 1200;
  shot.fade = 1;
  shot.hits = s.hits ?? 0;
  shot.seeker = s.seeker ?? false;
  shot.pyre = s.pyre ?? false;
}

/** 요격 대상 — 살아 있고 경고 중이 아니며 아직 반사되지 않은 화살 */
function targetable(a: Arrow): boolean {
  return a.active && a.warningMs <= 0 && !a.reflected;
}

/** 가장 가까운 화살 n개 */
function nearest(world: GameWorld, n: number, fromX: number, fromY: number): Arrow[] {
  return world.arrows
    .filter(targetable)
    .map((a) => ({ a, d: (a.x - fromX) ** 2 + (a.y - fromY) ** 2 }))
    .sort((p, q) => p.d - q.d)
    .slice(0, n)
    .map((p) => p.a);
}

/** 스킬 요격으로 화살을 떨군다 — 베기와 달리 반사는 없고 파쇄 보상만 */
function intercept(world: GameWorld, a: Arrow): void {
  if (!targetable(a)) return;
  if (a.boss) {
    // 보스는 지우지 않고 깎는다. **마지막 일격은 플레이어 몫**으로 1 을 남긴다 —
    // 스킬이 보스에 아무 영향이 없으면 강화할수록 벨 화살만 줄어 보스를 못 끝낸다
    // (3스테이지 5/5 → 3/5, 4스테이지 4/5 → 1/5. 2026-09-28 시뮬 실측)
    if (a.bossCutsLeft > 1) { a.bossCutsLeft -= 1; world.skillKills += 1; }
    return;
  }
  const chilled = a.chilledMs > 0;
  a.active = false;
  world.skillKills += 1;
  world.supplies += 1;
  // 콤보 [서리 사냥] — 얼어붙은 화살을 부수면 게이지를 더 받는다 (얼리고 → 부순다)
  if (chilled && world.runMods.chillHunt) world.slashGauge = Math.min(100, world.slashGauge + 4);
  // 스킬 요격도 일섬 게이지를 조금 준다.
  // 안 주면 스킬이 벨 화살을 먼저 지워 게이지가 굶고, 보스를 못 깨 **강화할수록 클리어가 떨어졌다**
  // (2스테이지 Lv10 에서 5/5 → 3/5, 2026-09-28 시뮬 실측).
  world.slashGauge = Math.min(100, world.slashGauge + 3);
}

/** 스킬 하나의 실제 쿨타임(초) — 무기 상성이 줄여 준다 */
export function effectiveCooldown(id: ExpeditionSkillId, level: number, weapon: GameWorld["rangedWeapon"]): number {
  const family = SKILL_BY_ID[id].family;
  const base =
    id === "volley" ? volleyCooldown(level)
      : id === "pierce" ? pierceCooldown(level)
        : id === "flame" ? flameCooldown(level)
          : id === "frost" ? frostCooldown(level)
            : id === "chain" ? chainCooldown(level)
              : 0;
  return base * weaponCooldownMul(weapon, family);
}

/** 매 프레임 — 쿨타임을 돌리고 다 찬 스킬을 쏜다 */
export function updateSkillShots(world: GameWorld, dtSec: number): void {
  const lv = world.skillLevels;
  const timers = world.skillTimers;

  const tick = (id: Exclude<ExpeditionSkillId, "ultimate">, fire: () => void) => {
    const level = lv[id] ?? 0;
    if (level <= 0) return;                       // 미습득 스킬은 아무것도 하지 않는다
    timers[id] = (timers[id] ?? 0) - dtSec;
    if (timers[id] > 0) return;
    timers[id] = effectiveCooldown(id, level, world.rangedWeapon) * world.runMods.cooldownMul
      * (id === "volley" && world.runMods.evolutions.volley === "beam" ? 1.35 : 1)
      * (id === "flame" && world.runMods.evolutions.flame === "pyre" ? 1.25 : 1);
    fire();
  };

  tick("volley", () => {
    const evo = world.runMods.evolutions.volley;
    const targets = nearest(world, volleyShots(lv.volley) + world.runMods.volleyExtra, world.player.x, world.player.y);
    for (const t of targets) {
      const ang = Math.atan2(t.y - world.player.y, t.x - world.player.x);
      // [관통 광선] 멈추지 않고 화면 끝까지 꿰지만 재사용이 길다 / [유도 볼트] 느리지만 쫓아간다
      const sp = evo === "beam" ? 1050 : evo === "seeker" ? 560 : 760;
      spawn(world, {
        kind: "bolt",
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        radius: evo === "beam" ? 12 : 9,
        lifeMs: 1400,
        hits: world.runMods.boltPierce + (evo === "beam" ? 99 : 0),
        seeker: evo === "seeker",
      });
    }
  });

  tick("pierce", () => {
    spawn(world, { kind: "pierce", vy: -980, radius: pierceWidth(lv.pierce) * world.runMods.pierceWidthMul / 2, lifeMs: 1600 });
  });

  tick("flame", () => {
    const evo = world.runMods.evolutions.flame;
    const r = flameRadius(lv.flame) * world.runMods.flameRadiusMul;
    // [화염 장판] 올라가지 않고 그 자리에 머물며 지나는 화살을 계속 태운다 (재사용은 길다)
    if (evo === "pyre") { spawn(world, { kind: "flame", vy: -20, radius: r * 0.8, lifeMs: 2600, pyre: true }); return; }
    spawn(world, { kind: "flame", vy: -230, radius: r, lifeMs: 1500 });
  });

  tick("frost", () => {
    // 파동은 즉발 — 주변 화살을 그 자리에서 느리게 만든다
    const evo = world.runMods.evolutions.frost;
    const r = frostRadius(lv.frost) * (evo === "lingering" ? 1.4 : 1);
    const slow = Math.max(0.2, frostSlow(lv.frost) - world.runMods.frostSlowBonus);
    for (const a of world.arrows) {
      if (!targetable(a)) continue;
      if ((a.x - world.player.x) ** 2 + (a.y - world.player.y) ** 2 > r * r) continue;
      // 하한 — 배수를 매 파동마다 곱하면 화살이 사실상 멈춰 화면에 쌓인다 (파동은 여러 번 온다)
      const sp = Math.hypot(a.vx, a.vy);
      if (sp < 150) continue;
      const k = Math.max(slow, 150 / sp);
      a.vx *= k; a.vy *= k;
      a.chilledMs = evo === "lingering" ? 4500 : 1500;   // 콤보 카드가 이 표식을 본다
    }
    // [서리 파쇄] 안쪽 절반은 얼리는 대신 그 자리에서 부순다 / [지속 서리] 넓고 오래 얼린다
    if (evo === "shatter") {
      for (const a of world.arrows) {
        if (!targetable(a)) continue;
        if ((a.x - world.player.x) ** 2 + (a.y - world.player.y) ** 2 <= (r * 0.5) ** 2) intercept(world, a);
      }
    }
    spawn(world, { kind: "frost", radius: r, lifeMs: 420, vx: 0, vy: 0 });
  });

  tick("chain", () => {
    const targets = nearest(world, chainTargets(lv.chain) + world.runMods.chainExtra, world.player.x, world.player.y);
    for (const t of targets) intercept(world, t);
    if (targets.length) spawn(world, { kind: "chain", radius: 0, lifeMs: 260, x: targets[0].x, y: targets[0].y });
  });

  // ── 날아가는 탄 갱신
  for (const s of world.skillShots) {
    if (!s.active) continue;
    s.lifeMs -= dtSec * 1000;
    if (s.seeker) {
      // [유도 볼트] — 가장 가까운 화살 쪽으로 천천히 방향을 튼다
      const t = nearest(world, 1, s.x, s.y)[0];
      if (t) {
        const want = Math.atan2(t.y - s.y, t.x - s.x);
        const cur = Math.atan2(s.vy, s.vx);
        let d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const next = cur + Math.max(-4 * dtSec, Math.min(4 * dtSec, d));
        const sp = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(next) * sp; s.vy = Math.sin(next) * sp;
      }
    }
    s.x += s.vx * dtSec;
    s.y += s.vy * dtSec;
    if (s.pyre) {
      // [화염 장판] — 머무는 동안 반경에 들어오는 화살을 계속 태운다
      for (const a of world.arrows) {
        if (!targetable(a)) continue;
        if ((a.x - s.x) ** 2 + (a.y - s.y) ** 2 <= s.radius * s.radius) intercept(world, a);
      }
    }
    s.fade = Math.max(0, Math.min(1, s.lifeMs / 400));
    if (s.lifeMs <= 0 || s.y < -80 || s.x < -80 || s.x > world.width + 80) {
      if (s.kind === "flame" && !s.pyre) {
        // 수명이 다하면 터진다. 콤보 [열충격] — 얼어붙은 화살이 반경 안에 있으면 폭발이 넓어진다
        let r = s.radius;
        if (world.runMods.chillBurst && world.arrows.some((a) => targetable(a) && a.chilledMs > 0
          && (a.x - s.x) ** 2 + (a.y - s.y) ** 2 <= s.radius * s.radius)) r *= 1.6;
        for (const a of world.arrows) {
          if (!targetable(a)) continue;
          if ((a.x - s.x) ** 2 + (a.y - s.y) ** 2 <= r * r) intercept(world, a);
        }
      }
      s.active = false;
      continue;
    }
    if (s.kind === "bolt") {
      for (const a of world.arrows) {
        if (!targetable(a)) continue;
        if ((a.x - s.x) ** 2 + (a.y - s.y) ** 2 <= (s.radius + a.hitRadius) ** 2) {
          intercept(world, a);
          if (s.hits > 0) { s.hits -= 1; continue; }   // [관통 볼트] 카드 — 한 발이 여러 개를 꿴다
          s.active = false; break;
        }
      }
    } else if (s.kind === "pierce") {
      for (const a of world.arrows) {
        if (!targetable(a)) continue;
        if (Math.abs(a.x - s.x) <= s.radius + a.hitRadius && Math.abs(a.y - s.y) <= 26) intercept(world, a);
      }
    }
  }
}

/** 스테이지 경계에서도 불린다 — **카드(runMods)는 여기서 지우지 않는다**. 런 전체에서 유지된다 */
export function resetSkillShots(world: GameWorld): void {
  for (const s of world.skillShots) s.active = false;
  world.skillTimers = { volley: 0, pierce: 0, flame: 0, frost: 0, chain: 0, ultimate: 0 };
  world.skillKills = 0;
}

/**
 * 스킬 효과 테이블 — castSkill·자동 시전·카드 UI·프리뷰가 같은 숫자를 본다.
 *
 * 정리 원칙 (스킬 점검 후):
 * - 20종 전부 실효과. 슬롯당 4종은 역할이 서로 다르다 (같은 버프 중복 없음).
 * - 레벨 = 효과 ×(1 + 0.05×(Lv-1)) — 강화 골드가 실제 DPS를 산다.
 * - 버프 지속은 배속에 맞춰 실시간이 줄어든다 (쿨타임과 대칭 → 업타임 불변).
 *
 * 풀 용어:
 *   탭 풀 = 탭·시동기·마무리 (computeTapHit 경유) · 동료 풀 = 동료 자동 공격 · 영웅 풀 = 영웅 자동 공격
 */
import { SKILLS, type TitanSkillDef, type TitanSkillId, type TitanSkillSlot } from "./model";

export type BuffKind = "crit" | "clone" | "war" | "haste" | "freeze" | "burn";

export type SkillEffect =
  /** 탭 배율 단발 (starter/finisher). buff가 있으면 덤으로 건다 */
  | { kind: "hit"; mult: number; buff?: BuffKind; buffValue?: number }
  /** 처형 — 보스 HP 30% 미만이면 lowMult */
  | { kind: "execute"; mult: number; lowMult: number }
  /** 지속 버프 (linkA/linkB). value: crit=치명 확률 가산, clone=탭 배율, war=동료 배율, haste=영웅 공속 배율, burn=초당 탭 배율 */
  | { kind: "buff"; buff: BuffKind; value: number; bossOnly?: boolean }
  /** 상시 패시브 */
  | { kind: "passive"; stat: "tapDmg" | "critChance" | "bossTime" | "allyDmg"; value: number; perLevel: number };

export const SKILL_EFFECTS: Record<TitanSkillId, SkillEffect> = {
  // ── 시동기: 탭 배율 단발. 서로 다른 부가 효과 ──
  strike: { kind: "hit", mult: 40 },
  pierce: { kind: "hit", mult: 52 },
  emberCut: { kind: "hit", mult: 36, buff: "burn", buffValue: 4 },
  frostEdge: { kind: "hit", mult: 40, buff: "freeze" },
  // ── 연계 A: 치명 · 치명(짧게 자주) · 동료 강화 · 영웅 가속 ──
  crit: { kind: "buff", buff: "crit", value: 0.45 },
  waterStep: { kind: "buff", buff: "crit", value: 0.35 },
  stoneGuard: { kind: "buff", buff: "war", value: 1.8 },
  galeChain: { kind: "buff", buff: "haste", value: 0.5 },
  // ── 연계 B: 분신 · 동료 번개 · 강한 분신(짧게) · 보스 화상 ──
  clone: { kind: "buff", buff: "clone", value: 2 },
  thunderLink: { kind: "buff", buff: "war", value: 1.5 },
  bloodMoon: { kind: "buff", buff: "clone", value: 2.4 },
  dragonBreath: { kind: "buff", buff: "burn", value: 10, bossOnly: true },
  // ── 마무리: 파티 고무 · 최대 단발 · 빙결 · 처형 ──
  warcry: { kind: "hit", mult: 60, buff: "war", buffValue: 1.6 },
  meteor: { kind: "hit", mult: 85 },
  tidalBurst: { kind: "hit", mult: 66, buff: "freeze" },
  voidFinish: { kind: "execute", mult: 72, lowMult: 110 },
  // ── 패시브: 탭 · 치명 · 보스 시간 · 동료 ──
  steel: { kind: "passive", stat: "tapDmg", value: 0.2, perLevel: 0.02 },
  focus: { kind: "passive", stat: "critChance", value: 0.08, perLevel: 0.005 },
  guardianSoul: { kind: "passive", stat: "bossTime", value: 4, perLevel: 0.3 },
  elementalMastery: { kind: "passive", stat: "allyDmg", value: 0.12, perLevel: 0.01 },
};

export const SLOT_LABEL: Record<TitanSkillSlot, string> = { starter: "시동기", linkA: "연계 A", linkB: "연계 B", finisher: "마무리", passive: "패시브" };
export const SLOT_ORDER: TitanSkillSlot[] = ["starter", "linkA", "linkB", "finisher", "passive"];
export const ELEMENT_LABEL_KR: Record<TitanSkillDef["element"], string> = { blade: "검", wind: "바람", fire: "불", earth: "땅", light: "빛" };
export const BUFF_LABEL: Record<BuffKind, string> = { crit: "치명", clone: "분신", war: "고무", haste: "가속", freeze: "빙결", burn: "화상" };

/** 레벨 배율 — 강화가 실효과를 산다 */
export function skillLevelMult(level: number): number {
  return 1 + Math.max(0, level - 1) * 0.05;
}

export function passiveValue(id: TitanSkillId, level: number): number {
  const e = SKILL_EFFECTS[id];
  if (e.kind !== "passive" || level <= 0) return 0;
  return e.value + Math.max(0, level - 1) * e.perLevel;
}

/** 장착·학습한 패시브 합 — 전투 계산용 */
export function passiveTotals(
  learned: TitanSkillId[],
  equipped: Partial<Record<TitanSkillSlot, TitanSkillId>>,
  levels: Record<TitanSkillId, number>,
): { tapDmg: number; critChance: number; bossTime: number; allyDmg: number } {
  const out = { tapDmg: 0, critChance: 0, bossTime: 0, allyDmg: 0 };
  const id = equipped.passive;
  if (!id || !learned.includes(id)) return out;
  const e = SKILL_EFFECTS[id];
  if (e.kind === "passive") out[e.stat] += passiveValue(id, levels[id] ?? 1);
  return out;
}

/** 버프 지속(ms, 실시간) — 배속만큼 줄여 쿨타임과 대칭 */
export function buffDurationMs(def: TitanSkillDef, level: number, battleSpeed: number): number {
  return (def.durationSec * 1000 * (1 + Math.max(0, level - 1) * 0.02)) / Math.max(1, battleSpeed);
}

/** 카드에 보여줄 효과 한 줄 — 숫자로 비교 가능하게 */
export function skillEffectLabel(id: TitanSkillId, level: number): string {
  const def = SKILLS.find((s) => s.id === id)!;
  const e = SKILL_EFFECTS[id];
  const m = skillLevelMult(Math.max(1, level));
  const dur = def.durationSec > 0 ? ` · ${def.durationSec}초` : "";
  const cd = def.cooldownSec > 0 ? ` · 쿨 ${def.cooldownSec}초` : "";
  switch (e.kind) {
    case "hit": {
      const extra = e.buff === "burn" ? ` + 화상 초당 탭×${(e.buffValue! * m).toFixed(1)}` : e.buff === "freeze" ? " + 보스 시간 정지" : e.buff === "war" ? ` + 동료 ×${(e.buffValue! * m).toFixed(2)}` : "";
      return `탭 ×${Math.round(e.mult * m)}${extra}${dur}${cd}`;
    }
    case "execute":
      return `탭 ×${Math.round(e.mult * m)} · HP 30%↓ ×${Math.round(e.lowMult * m)}${cd}`;
    case "buff": {
      const v = e.value * m;
      const text =
        e.buff === "crit" ? `치명 확률 +${Math.round(v * 100)}%`
        : e.buff === "clone" ? `탭 ×${v.toFixed(2)}`
        : e.buff === "war" ? `동료 ×${v.toFixed(2)}`
        : e.buff === "haste" ? `영웅 공속 +${Math.round((1 / v - 1) * 100)}%`
        : e.buff === "burn" ? `보스 화상 초당 탭×${v.toFixed(1)}`
        : "빙결";
      return `${text}${dur}${cd}`;
    }
    case "passive": {
      const v = passiveValue(id, Math.max(1, level));
      return e.stat === "tapDmg" ? `탭 피해 +${Math.round(v * 100)}%`
        : e.stat === "critChance" ? `치명 확률 +${(v * 100).toFixed(1)}%`
        : e.stat === "bossTime" ? `보스 제한시간 +${v.toFixed(1)}초`
        : `동료 피해 +${Math.round(v * 100)}%`;
    }
  }
}

/**
 * 스킬의 평균 기여도(%) — 프리셋 프리뷰용 근사. 탭 풀 기준.
 * hit: mult/cd(초당 탭 배수)를 초당 탭 2회 대비 %. buff: 업타임 × 효과.
 */
export function skillPreviewPct(id: TitanSkillId, level: number): number {
  const def = SKILLS.find((s) => s.id === id)!;
  const e = SKILL_EFFECTS[id];
  const m = skillLevelMult(Math.max(1, level));
  const uptime = def.cooldownSec > 0 ? Math.min(1, def.durationSec / def.cooldownSec) : 0;
  switch (e.kind) {
    case "hit": return Math.round(((e.mult * m) / def.cooldownSec / 2) * 100 + (e.buff === "burn" ? uptime * e.buffValue! * m * 50 : e.buff === "war" ? uptime * (e.buffValue! * m - 1) * 100 : 0));
    case "execute": return Math.round(((e.mult * m) / def.cooldownSec / 2) * 100);
    case "buff":
      return Math.round(
        e.buff === "crit" ? uptime * e.value * m * 2.2 * 100
        : e.buff === "clone" ? uptime * (e.value * m - 1) * 100
        : e.buff === "war" ? uptime * (e.value * m - 1) * 100
        : e.buff === "haste" ? uptime * (1 / e.value - 1) * 45
        : e.buff === "burn" ? uptime * e.value * m * 50
        : 0,
      );
    case "passive": {
      const v = passiveValue(id, Math.max(1, level));
      return Math.round(e.stat === "bossTime" ? v * 3 : v * 100);
    }
  }
}

/** 자동 시전 순서 — 버프(연계)를 먼저 걸고 단발을 넣는다 */
export function autoSkillOrder(): TitanSkillId[] {
  const rank = (s: TitanSkillDef) => (s.slot === "linkA" ? 0 : s.slot === "linkB" ? 1 : s.slot === "starter" ? 2 : s.slot === "finisher" ? 3 : 9);
  return [...SKILLS].filter((s) => s.slot !== "passive").sort((a, b) => rank(a) - rank(b)).map((s) => s.id);
}

/** 프리셋 — 슬롯별 후보 순서. 학습한 것 중 첫 번째가 장착된다 */
export type SkillPreset = { id: string; name: string; desc: string; picks: Record<TitanSkillSlot, TitanSkillId[]> };
export const SKILL_PRESETS: SkillPreset[] = [
  { id: "balance", name: "균형형", desc: "탭·동료 고루 강화", picks: { starter: ["pierce", "strike", "emberCut", "frostEdge"], linkA: ["crit", "waterStep", "stoneGuard", "galeChain"], linkB: ["clone", "thunderLink", "bloodMoon", "dragonBreath"], finisher: ["meteor", "warcry", "voidFinish", "tidalBurst"], passive: ["steel", "focus", "elementalMastery", "guardianSoul"] } },
  { id: "burst", name: "탭 폭발형", desc: "탭 연타 극대화", picks: { starter: ["pierce", "emberCut", "strike", "frostEdge"], linkA: ["waterStep", "crit", "galeChain", "stoneGuard"], linkB: ["bloodMoon", "clone", "dragonBreath", "thunderLink"], finisher: ["voidFinish", "meteor", "warcry", "tidalBurst"], passive: ["focus", "steel", "elementalMastery", "guardianSoul"] } },
  { id: "party", name: "원정대형", desc: "동료 DPS와 보스 시간", picks: { starter: ["frostEdge", "pierce", "emberCut", "strike"], linkA: ["stoneGuard", "galeChain", "crit", "waterStep"], linkB: ["thunderLink", "dragonBreath", "clone", "bloodMoon"], finisher: ["warcry", "tidalBurst", "meteor", "voidFinish"], passive: ["elementalMastery", "guardianSoul", "steel", "focus"] } },
];

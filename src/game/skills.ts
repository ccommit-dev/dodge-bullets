import type { PlayerStats } from "./types";

/**
 * 화살 원정 영구 스킬 — **원거리 요격** (2026-09-28).
 *
 * 배경: 원정에는 '보급소' 구매 화면이 있었는데 "용도 불명" 으로 삭제됐고(App.tsx 주석),
 * 그 뒤로 성장은 캐릭터 레벨·장착 검에서 자동 파생만 됐다 — 원정을 돌아 원정을 키우는 고리가 없었다.
 *
 * 참고 게임(Galactic Outlaw: Tower Defense)의 스킬 업그레이드 구조를 가져온다:
 *   · 스킬마다 레벨(1~10) · 재화 둘(골드 + 원정 인장)
 *   · **짝수 레벨이 마일스톤** — 해금(서브 효과) 또는 수치 강화
 *   · 잠긴 스킬은 원정 스테이지 클리어로 열린다
 *
 * 1차 설계는 검격·보법처럼 근접·이동 스탯이었는데, 참고 게임의 스킬은 전부
 * **원거리 요격**(레이저·미사일·얼음 연쇄·드론·플라즈마 빔)이다. 화살 원정도 "날아오는 화살"이
 * 주제라 요격이 맞다 — 스킬은 장착한 **원거리 무기(활·지팡이)** 로 자동 발사되어 화살을 떨어뜨린다.
 * 주인공 캐릭터는 그대로 두고 무기만 탈착한다.
 */

/* ────────────────── 원거리 무기 (탈착) ────────────────── */

export type RangedWeaponId = "none" | "bow" | "staff";

export type RangedWeaponDef = {
  id: Exclude<RangedWeaponId, "none">;
  name: string;
  desc: string;
  /** 이 계열 스킬의 쿨타임을 줄인다 */
  affinity: SkillFamily;
  /** 원정 최고 스테이지 조건 */
  unlockStage: number;
};

/** 스킬 계열 — 무기 상성에 쓴다 */
export type SkillFamily = "physical" | "magic" | "none";

export const RANGED_WEAPONS: RangedWeaponDef[] = [
  { id: "bow", name: "장궁", desc: "물리 계열 스킬 재사용 −12%", affinity: "physical", unlockStage: 1 },
  { id: "staff", name: "수정 지팡이", desc: "마법 계열 스킬 재사용 −12%", affinity: "magic", unlockStage: 2 },
];

export const WEAPON_BY_ID: Record<string, RangedWeaponDef> =
  Object.fromEntries(RANGED_WEAPONS.map((w) => [w.id, w]));

/** 무기 상성 배수 — 계열이 맞으면 쿨타임 0.88배 */
export function weaponCooldownMul(weapon: RangedWeaponId, family: SkillFamily): number {
  if (weapon === "none" || family === "none") return 1;
  return WEAPON_BY_ID[weapon]?.affinity === family ? 0.88 : 1;
}

/* ────────────────── 스킬 ────────────────── */

export type ExpeditionSkillId = "volley" | "pierce" | "flame" | "frost" | "chain" | "ultimate";

export const SKILL_MAX_LEVEL = 10;

export type SkillMilestone = { level: number; kind: "unlock" | "stat"; label: string };

export type ExpeditionSkillDef = {
  id: ExpeditionSkillId;
  name: string;
  /** 참고 게임의 '유형' 칸 */
  kind: string;
  family: SkillFamily;
  icon: string;
  desc: string;
  /** 이 스테이지를 클리어해야 열린다. 0 이면 처음부터 */
  unlockStage: number;
  goldBase: number;
  sealBase: number;
  milestones: SkillMilestone[];
  readout: (level: number) => Array<{ label: string; value: string; delta?: string }>;
};

export function skillCost(def: ExpeditionSkillDef, level: number): { gold: number; seals: number } {
  const n = Math.max(1, level);
  return {
    gold: Math.round(def.goldBase * Math.pow(1.55, n - 1)),
    seals: Math.round(def.sealBase * Math.pow(1.4, n - 1)),
  };
}

export type ExpeditionSkillLevels = Record<ExpeditionSkillId, number>;

export function emptySkillLevels(): ExpeditionSkillLevels {
  return { volley: 0, pierce: 0, flame: 0, frost: 0, chain: 0, ultimate: 0 };
}

/* ── 레벨 → 효과. 짝수 레벨(마일스톤)에서만 계단식으로 오른다 ──
 * 아래 함수가 유일한 진실이고 milestones 의 문구는 이것을 설명한 것이다.
 * verify-systems 가 "표와 수치가 같은 레벨에서 움직이는지" 를 단언한다.
 */
const step = (lv: number, at: number) => (lv >= at ? 1 : 0);

/** 연속 사격 — 쿨타임(초) · 한 번에 쏘는 발수 */
export function volleyCooldown(lv: number): number { return 2.4 - 0.3 * step(lv, 4) - 0.3 * step(lv, 8); }
export function volleyShots(lv: number): number { return 1 + step(lv, 2) + step(lv, 6) + step(lv, 10); }
/** 관통 화살 — 쿨타임 · 관통 폭(px) */
export function pierceCooldown(lv: number): number { return 5.5 - 0.6 * step(lv, 4) - 0.9 * step(lv, 10); }
export function pierceWidth(lv: number): number { return 26 + 8 * step(lv, 2) + 8 * step(lv, 6) + 10 * step(lv, 8); }
/** 화염탄 — 쿨타임 · 폭발 반경 */
export function flameCooldown(lv: number): number { return 6.5 - 0.7 * step(lv, 6); }
export function flameRadius(lv: number): number { return 54 + 12 * step(lv, 2) + 14 * step(lv, 4) + 16 * step(lv, 8) + 20 * step(lv, 10); }
/** 빙결 파동 — 쿨타임 · 반경 · 감속 배수 */
export function frostCooldown(lv: number): number { return 7.5 - 0.8 * step(lv, 4) - 0.9 * step(lv, 8); }
export function frostRadius(lv: number): number { return 92 + 16 * step(lv, 2) + 20 * step(lv, 6); }
export function frostSlow(lv: number): number { return 0.55 - 0.08 * step(lv, 10); }
/** 번개 사슬 — 쿨타임 · 연쇄 수 */
export function chainCooldown(lv: number): number { return 8 - 0.8 * step(lv, 6); }
export function chainTargets(lv: number): number { return 2 + step(lv, 2) + step(lv, 4) + step(lv, 8) + step(lv, 10); }
/** 일섬 — 베기 창 배수 · 게이지 획득 배수 */
export function ultSwingMul(lv: number): number { return 1 + 0.08 * step(lv, 2) + 0.08 * step(lv, 6) + 0.12 * step(lv, 10); }
export function ultGaugeMul(lv: number): number { return 1 + 0.12 * step(lv, 4) + 0.12 * step(lv, 8); }

const num = (v: number, unit = "") => `${Math.round(v * 10) / 10}${unit}`;
/** 다음 레벨 증가분 — 변화가 없으면 undefined (초록 숫자는 '다음 레벨에 오른다'는 뜻이어야 한다) */
function nextDelta(lv: number, f: (n: number) => number, unit = "", digits = 0): string | undefined {
  if (lv >= SKILL_MAX_LEVEL) return undefined;
  const d = f(lv + 1) - f(lv);
  if (Math.abs(d) < 1e-9) return undefined;
  const v = digits ? d.toFixed(digits) : String(Math.round(d));
  return `${d > 0 ? "+" : ""}${v}${unit}`;
}

export const EXPEDITION_SKILLS: ExpeditionSkillDef[] = [
  {
    id: "volley",
    name: "연속 사격",
    kind: "연사",
    family: "physical",
    icon: "volley",
    desc: "[연속 사격] 학습. 가장 가까운 화살을 자동으로 요격한다.",
    unlockStage: 0,
    goldBase: 240,
    sealBase: 3,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [쌍발] — 발수 +1" },
      { level: 4, kind: "stat", label: "재사용 −0.3초" },
      { level: 6, kind: "unlock", label: "해금 [연사 숙련] — 발수 +1" },
      { level: 8, kind: "stat", label: "재사용 −0.3초" },
      { level: 10, kind: "unlock", label: "해금 [탄막] — 발수 +1" },
    ],
    readout: (lv) => [
      { label: "유형", value: "연사" },
      { label: "발수", value: `${volleyShots(lv)}발`, delta: nextDelta(lv, volleyShots, "발") },
      { label: "재사용", value: num(volleyCooldown(lv), "초"), delta: nextDelta(lv, volleyCooldown, "초", 1) },
      { label: "사거리", value: "원거리" },
    ],
  },
  {
    id: "pierce",
    name: "관통 화살",
    kind: "관통",
    family: "physical",
    icon: "pierce",
    desc: "[관통 화살] 학습. 위로 곧게 날아가 경로의 화살을 모두 꿰뚫는다.",
    unlockStage: 1,
    goldBase: 300,
    sealBase: 4,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [넓은 촉] — 관통 폭 +8" },
      { level: 4, kind: "stat", label: "재사용 −0.6초" },
      { level: 6, kind: "unlock", label: "해금 [삼중 깃] — 관통 폭 +8" },
      { level: 8, kind: "stat", label: "관통 폭 +10" },
      { level: 10, kind: "unlock", label: "해금 [일점 돌파] — 재사용 −0.9초" },
    ],
    readout: (lv) => [
      { label: "유형", value: "관통" },
      { label: "관통 폭", value: `${pierceWidth(lv)}`, delta: nextDelta(lv, pierceWidth) },
      { label: "재사용", value: num(pierceCooldown(lv), "초"), delta: nextDelta(lv, pierceCooldown, "초", 1) },
      { label: "사거리", value: "직선" },
    ],
  },
  {
    id: "flame",
    name: "화염탄",
    kind: "폭발",
    family: "magic",
    icon: "flame",
    desc: "[화염탄] 학습. 느리게 떠올라 터지며 주변 화살을 태운다.",
    unlockStage: 2,
    goldBase: 340,
    sealBase: 4,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [확산] — 폭발 반경 +12" },
      { level: 4, kind: "stat", label: "폭발 반경 +14" },
      { level: 6, kind: "unlock", label: "해금 [연소] — 재사용 −0.7초" },
      { level: 8, kind: "stat", label: "폭발 반경 +16" },
      { level: 10, kind: "unlock", label: "해금 [대폭발] — 폭발 반경 +20" },
    ],
    readout: (lv) => [
      { label: "유형", value: "폭발" },
      { label: "폭발 반경", value: `${flameRadius(lv)}`, delta: nextDelta(lv, flameRadius) },
      { label: "재사용", value: num(flameCooldown(lv), "초"), delta: nextDelta(lv, flameCooldown, "초", 1) },
      { label: "사거리", value: "원거리" },
    ],
  },
  {
    id: "frost",
    name: "빙결 파동",
    kind: "범위",
    family: "magic",
    icon: "frost",
    desc: "[빙결 파동] 학습. 주변의 화살을 얼려 느리게 만든다.",
    unlockStage: 2,
    goldBase: 320,
    sealBase: 4,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [서리] — 반경 +16" },
      { level: 4, kind: "stat", label: "재사용 −0.8초" },
      { level: 6, kind: "unlock", label: "해금 [한파] — 반경 +20" },
      { level: 8, kind: "stat", label: "재사용 −0.9초" },
      { level: 10, kind: "unlock", label: "해금 [절대 영도] — 감속 강화" },
    ],
    readout: (lv) => [
      { label: "유형", value: "범위" },
      { label: "반경", value: `${frostRadius(lv)}`, delta: nextDelta(lv, frostRadius) },
      { label: "감속", value: `${Math.round((1 - frostSlow(lv)) * 100)}%` },
      { label: "재사용", value: num(frostCooldown(lv), "초"), delta: nextDelta(lv, frostCooldown, "초", 1) },
    ],
  },
  {
    id: "chain",
    name: "번개 사슬",
    kind: "연쇄",
    family: "magic",
    icon: "chain",
    desc: "[번개 사슬] 학습. 가까운 화살 여러 개를 번개로 잇는다.",
    unlockStage: 3,
    goldBase: 420,
    sealBase: 5,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [분기] — 연쇄 +1" },
      { level: 4, kind: "stat", label: "연쇄 +1" },
      { level: 6, kind: "unlock", label: "해금 [과부하] — 재사용 −0.8초" },
      { level: 8, kind: "stat", label: "연쇄 +1" },
      { level: 10, kind: "unlock", label: "해금 [뇌전 폭풍] — 연쇄 +1" },
    ],
    readout: (lv) => [
      { label: "유형", value: "연쇄" },
      { label: "연쇄 수", value: `${chainTargets(lv)}`, delta: nextDelta(lv, chainTargets) },
      { label: "재사용", value: num(chainCooldown(lv), "초"), delta: nextDelta(lv, chainCooldown, "초", 1) },
      { label: "사거리", value: "원거리" },
    ],
  },
  {
    id: "ultimate",
    name: "일섬",
    kind: "궁극",
    family: "none",
    icon: "ultimate",
    desc: "[일섬] 강화. 게이지가 빨리 차고 베기 창이 길어진다.",
    unlockStage: 0,
    goldBase: 360,
    sealBase: 5,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [잔광] — 베기 창 +8%" },
      { level: 4, kind: "stat", label: "게이지 획득 +12%" },
      { level: 6, kind: "unlock", label: "해금 [여운] — 베기 창 +8%" },
      { level: 8, kind: "stat", label: "게이지 획득 +12%" },
      { level: 10, kind: "unlock", label: "해금 [무한 일섬] — 베기 창 +12%" },
    ],
    readout: (lv) => [
      { label: "유형", value: "궁극" },
      { label: "베기 창", value: ultSwingMul(lv) === 1 ? "기본" : `+${Math.round(ultSwingMul(lv) * 100 - 100)}%` },
      { label: "게이지", value: ultGaugeMul(lv) === 1 ? "기본" : `+${Math.round(ultGaugeMul(lv) * 100 - 100)}%` },
      { label: "사거리", value: "자신 주변" },
    ],
  },
];

export const SKILL_BY_ID: Record<ExpeditionSkillId, ExpeditionSkillDef> =
  Object.fromEntries(EXPEDITION_SKILLS.map((s) => [s.id, s])) as Record<ExpeditionSkillId, ExpeditionSkillDef>;

/**
 * 일섬만 PlayerStats 에 닿는다 (베기 창 = slowDurationMs). 나머지 다섯은 자동 발사 스킬이라
 * `skillShots.ts` 가 world 를 보고 직접 쏜다 — 스탯에 얹을 것이 없다.
 */
export function applySkillLevels(stats: PlayerStats, levels: ExpeditionSkillLevels): PlayerStats {
  const out = { ...stats };
  out.slowDurationMs *= ultSwingMul(levels.ultimate);
  return out;
}

/** 게이지 획득 배수 — arrows.addGauge 가 곱한다 */
export function gaugeGainMul(levels: ExpeditionSkillLevels): number { return ultGaugeMul(levels.ultimate); }

/** 상단 배너용 합산 — 참고 게임의 "총 치명타 피해 증가 +N%" 자리 */
export function skillSummary(levels: ExpeditionSkillLevels): { totalLevels: number; power: number } {
  const totalLevels = EXPEDITION_SKILLS.reduce((s, d) => s + (levels[d.id] ?? 0), 0);
  // 초당 요격 기대치를 한 숫자로 — 화면 배너에만 쓴다
  const rate = (lv: number, cd: (n: number) => number, per = 1) => (lv > 0 ? per / cd(lv) : 0);
  const power = Math.round(
    (rate(levels.volley, volleyCooldown, volleyShots(levels.volley))
      + rate(levels.pierce, pierceCooldown, 3)
      + rate(levels.flame, flameCooldown, 3)
      + rate(levels.frost, frostCooldown, 2)
      + rate(levels.chain, chainCooldown, chainTargets(levels.chain))) * 100,
  );
  return { totalLevels, power };
}

export function skillUnlocked(def: ExpeditionSkillDef, dodgeBestStage: number): boolean {
  return dodgeBestStage >= def.unlockStage;
}

export function weaponUnlocked(def: RangedWeaponDef, dodgeBestStage: number): boolean {
  return dodgeBestStage >= def.unlockStage;
}

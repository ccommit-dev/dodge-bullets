import type { ArrowPattern, ArrowPatternKind, StageDef, StageSlotKind } from "./types";

/**
 * 성문 방어 50 스테이지 (2026-10-02, 사용자: "일반원정 스테이지가 5밖에 없던데 50까지 다양하게 레벨 디자인 및 콘텐츠 추가").
 *
 * 예전 4 스테이지는 한 판에 S1→S4 를 이어 달렸다. 이제 **한 판 = 한 스테이지**, 10 스테이지씩 5장(사냥터 5지역과 같은 장소):
 *   1장 새벽 초원 · 2장 달빛 숲 · 3장 왕실 폐허 · 4장 용암 협곡 · 5장 심연의 성
 * 장마다 칸(slot) 열 개가 같은 리듬으로 돈다 — 개막(새 몬스터 소개) → 떼 → 혼성 → 정예 → **중간 보스** → 돌진 → 협공 → 포위전 →
 * 정예 혼성 → **장 대장**. 같은 칸이라도 장이 바뀌면 나오는 몬스터와 순서가 달라지고(장의 몬스터 풀), 숫자는 스테이지가 깊을수록 오른다.
 *
 * 표는 모듈을 읽을 때 한 번 만들어지는 **결정적** 값이다(Math.random 없음) — 시뮬·테스트·저장이 같은 스테이지를 본다.
 * 난이도 손잡이(체력·속도·밀도·방어막 피해·보스 처치 수·유도 확률)가 전부 StageDef 에 있다: 예전엔 arrows·skills 곳곳에서
 * `Math.min(3, stageIndex)` 로 표를 따로 들고 있었다.
 */

/** 웨이브 배너용 패턴 이름 (HUD "WAVE n · 조준 사격") */
export const PATTERN_LABEL: Record<string, string> = { rain: "슬라임 떼", aimed: "늑대 돌진", cross: "교차 습격", fan: "고블린 떼", side: "측면 기습", ricochet: "오우거 돌진", sweep: "휩쓸기", explosive: "비룡 습격", burst: "연속 습격" };

/** 스테이지의 패턴 구간 = 웨이브. 경과 시간으로 현재 웨이브(1부터)와 총 수를 돌려준다 (HUD "WAVE n/N", 보스는 별도) */
export function waveAt(stage: Pick<StageDef, "patterns">, elapsedMs: number): { index: number; count: number } {
  const count = stage.patterns.length;
  let index = 0;
  for (let i = 0; i < count; i += 1) if (elapsedMs >= stage.patterns[i].atMs) index = i + 1;
  return { index: Math.max(1, index), count };
}

export const STAGES_PER_CHAPTER = 10;
export const CHAPTER_COUNT = 5;

export type ChapterDef = {
  name: string;
  /** 이 장에서 처음 나오는 몬스터 패턴 — 개막(1칸)이 소개한다 */
  debut: ArrowPatternKind[];
  /** 이 장의 몬스터 풀 (앞 장 것 + 데뷔) */
  pool: ArrowPatternKind[];
  /** 장 대장 이름 — 그림은 draw.ts BOSS_SPRITE[chapter] */
  boss: string;
  /** 칸별 스테이지 이름 (1~10) */
  names: string[];
  hint: string;
};

export const CHAPTERS: ChapterDef[] = [
  {
    name: "새벽 초원", debut: ["rain", "side", "fan"], pool: ["rain", "side", "fan", "cross", "aimed"], boss: "이끼 골렘",
    names: ["외곽 초소 돌파", "슬라임 늪지", "고블린 매복로", "늑대 사냥터", "이끼 망루", "초원 돌진로", "갈림길 협공", "초소 포위전", "정찰대 습격", "이끼 골렘의 언덕"],
    hint: "슬라임·고블린·그림자 늑대가 초원으로 몰려온다",
  },
  {
    name: "달빛 숲", debut: ["ricochet", "sweep"], pool: ["rain", "side", "fan", "cross", "aimed", "ricochet", "sweep"], boss: "달빛 늑대왕",
    names: ["달빛 숲 입구", "반딧불 늪", "오우거 벌목장", "은빛 늑대굴", "고목 수호자", "숲길 추격전", "덩굴 협공", "달빛 포위전", "그림자 사냥단", "달빛 늑대왕의 둥지"],
    hint: "단단한 오우거와 휘감아 오는 달빛 늑대 — 흙·얼음 무기가 빛난다",
  },
  {
    name: "왕실 폐허", debut: ["explosive", "burst"], pool: ["rain", "side", "fan", "cross", "aimed", "ricochet", "sweep", "explosive", "burst"], boss: "늑대 왕",
    names: ["무너진 성벽", "폐허의 떼", "왕실 사격장 탈환", "정예 근위대", "폐허의 감시자", "회랑 돌파", "탑 사이 협공", "왕궁 포위전", "근위 정예 습격", "늑대 왕의 왕좌"],
    hint: "돔에 닿으면 터지는 폭염 비룡 — 물살 작살로 먼저 꺼라",
  },
  {
    name: "용암 협곡", debut: ["burst", "explosive"], pool: ["side", "fan", "cross", "aimed", "ricochet", "sweep", "explosive", "burst"], boss: "화염 비룡",
    names: ["붉은 협곡 입구", "화염 떼", "비룡 둥지", "용암 정예", "화산 감시탑", "용암 돌진로", "협곡 협공", "분화구 포위전", "비룡 편대", "화염 비룡의 분화구"],
    hint: "모든 몬스터가 빨라진다 — 장착 무기 넷을 고르게 세워라",
  },
  {
    name: "심연의 성", debut: ["aimed", "ricochet"], pool: ["rain", "side", "fan", "cross", "aimed", "ricochet", "sweep", "explosive", "burst"], boss: "심연의 타이탄",
    names: ["심연의 문", "어둠의 떼", "검은 성문 탈출", "심연 정예", "공허의 파수꾼", "심연 돌진로", "성채 협공", "심연 포위전", "종말의 전위대", "심연의 타이탄"],
    hint: "가장 깊은 곳 — 대장간 강화와 스킬 무기 레벨이 모두 필요하다",
  },
];

type SlotDef = {
  kind: StageSlotKind;
  label: string;
  intro: string;
  /** 웨이브 구성 — 장 풀에서 고를 역할. "debut" 은 이 장의 새 몬스터, "pool" 은 풀에서 돌려 고르기, 그 외는 그 패턴 */
  waves: Array<"debut" | "pool" | ArrowPatternKind>;
  durationS: number;
  hp: number;
  speed: number;
  density: number;
  bossCuts: number;
};

/** 칸 10개 — 장마다 같은 리듬 */
const SLOTS: SlotDef[] = [
  { kind: "intro", label: "개막", intro: "새 몬스터가 처음 나온다 — 무엇에 약한지 보라", waves: ["debut", "pool", "debut", "pool"], durationS: 30, hp: 0.85, speed: 1, density: 0.85, bossCuts: 1 },
  { kind: "swarm", label: "떼", intro: "약한 몬스터가 끝없이 쏟아진다 — 광역 무기로 쓸어라", waves: ["rain", "fan", "rain", "burst"], durationS: 32, hp: 0.6, speed: 1, density: 1.2, bossCuts: 1 },
  { kind: "mixed", label: "혼성", intro: "여러 몬스터가 섞여 온다", waves: ["pool", "pool", "pool", "pool"], durationS: 34, hp: 1, speed: 1, density: 0.9, bossCuts: 1 },
  { kind: "elite", label: "정예", intro: "적은 수의 단단한 정예 — 한 방이 강한 무기가 필요하다", waves: ["ricochet", "pool", "ricochet", "pool"], durationS: 34, hp: 1.7, speed: 0.9, density: 0.6, bossCuts: 1.1 },
  { kind: "midboss", label: "중간 보스", intro: "장의 부대장이 성문 위에 선다", waves: ["pool", "debut", "pool"], durationS: 38, hp: 1.1, speed: 1, density: 0.75, bossCuts: 1.2 },
  { kind: "rush", label: "돌진", intro: "모든 몬스터가 빠르게 내려온다 — 방어막을 지켜라", waves: ["aimed", "side", "aimed", "cross"], durationS: 32, hp: 0.9, speed: 1.25, density: 0.85, bossCuts: 1 },
  { kind: "pincer", label: "협공", intro: "양쪽 가장자리에서 조여 온다", waves: ["side", "cross", "side", "cross"], durationS: 36, hp: 1, speed: 1.05, density: 0.85, bossCuts: 1 },
  { kind: "siege", label: "포위전", intro: "긴 공성 — 웨이브가 쉬지 않고 이어진다", waves: ["pool", "pool", "pool", "pool", "pool", "burst"], durationS: 46, hp: 1.05, speed: 1, density: 0.85, bossCuts: 1.1 },
  { kind: "elitemix", label: "정예 혼성", intro: "단단한 정예와 떼가 함께 온다", waves: ["ricochet", "pool", "explosive", "pool", "burst"], durationS: 40, hp: 1.35, speed: 1.05, density: 0.8, bossCuts: 1.2 },
  { kind: "boss", label: "장 대장", intro: "장의 대장이 맨 위에서 내려온다 — 끝까지 쓰러뜨려라", waves: ["pool", "debut", "pool", "pool", "burst"], durationS: 48, hp: 1.2, speed: 1.05, density: 0.7, bossCuts: 1.4 },
];

/** 패턴 종류별 기본 속도·생성 간격 — 예전 4 스테이지 표의 평균 */
const KIND_BASE: Record<Exclude<ArrowPatternKind, "rest">, { speed: number; spawnMs: number }> = {
  rain: { speed: 320, spawnMs: 560 },
  side: { speed: 380, spawnMs: 400 },
  cross: { speed: 430, spawnMs: 270 },
  sweep: { speed: 430, spawnMs: 330 },
  burst: { speed: 480, spawnMs: 240 },
  aimed: { speed: 400, spawnMs: 480 },
  fan: { speed: 430, spawnMs: 620 },
  ricochet: { speed: 420, spawnMs: 520 },
  explosive: { speed: 450, spawnMs: 600 },
};

/**
 * 스테이지가 깊을수록 — 체력 6%씩 × 장 배수(1 · 1 · 1.1 · 1.35 · 1.2: 운석·성광이 열리는 4장은 더 단단히, 5장은 성장 끝의 계정이 빠듯하게 — 1.3 이면 48·49 를 다 키운 계정도 못 깬다), 속도·밀도 0.6%씩, 방어막 피해 2.5%씩.
 * 7% 하나로 두면 중반(2장)은 성장보다 빨리, 후반은 느리게 올라 50 스테이지가 들쭉날쭉했다(시뮬, 2026-10-02)
 */
export const CHAPTER_HP = [1, 1, 1.1, 1.35, 1.2];
export const STAGE_CURVE = { hpBase: 1, hpGrowth: 1.06, speedBase: 0.86, speedGrowth: 1.006, densityGrowth: 1.006, barrierDmgPerStage: 0.025, bossCutsBase: 4, bossCutsPerStage: 0.55 };

const round2 = (v: number) => Math.round(v * 100) / 100;

/** 장 풀에서 n 번째 고르기 — 스테이지 번호로 돌려 같은 칸이라도 장·번호마다 순서가 달라진다 */
function pick(pool: ArrowPatternKind[], index: number, n: number): ArrowPatternKind {
  return pool[(index * 3 + n * 5 + Math.floor(index / 7)) % pool.length];
}

function buildPatterns(index: number, chapter: ChapterDef, slot: SlotDef, durationMs: number): ArrowPattern[] {
  // 템플릿이 정한 몬스터(예: 정예의 오우거)도 **그 장의 풀에 있을 때만** — 1장 정예에 2장 오우거가, 2장에 3장 비룡이 나오던 것을 막는다
  const waves = slot.waves.map((w, n) => (w === "debut" ? chapter.debut[n % chapter.debut.length] : w === "pool" || !chapter.pool.includes(w) ? pick(chapter.pool, index, n) : w));
  // 이웃 웨이브가 같은 패턴이면 풀에서 다음 것으로 — 같은 웨이브가 두 번 이어지면 웨이브 배너가 바뀌어도 화면이 그대로다
  for (let n = 1; n < waves.length; n += 1) if (waves[n] === waves[n - 1]) waves[n] = pick(chapter.pool, index + 1, n + 3);
  const span = durationMs * 0.96 / waves.length;
  return waves.map((kind, n) => {
    const base = KIND_BASE[kind as Exclude<ArrowPatternKind, "rest">];
    // 마지막 웨이브는 조금 더 몰아친다
    const crescendo = n === waves.length - 1 ? 0.85 : 1;
    return { kind, atMs: Math.round(n * span), durationMs: Math.round(span), spawnMs: Math.round(base.spawnMs / slot.density * crescendo), speed: base.speed };
  });
}

/** stageIndex(0~49) → 스테이지. 결정적 */
export function buildStage(index: number): StageDef {
  const i = Math.max(0, Math.min(CHAPTER_COUNT * STAGES_PER_CHAPTER - 1, index));
  const chapter = Math.floor(i / STAGES_PER_CHAPTER);
  const slotIndex = i % STAGES_PER_CHAPTER;
  const ch = CHAPTERS[chapter];
  const slot = SLOTS[slotIndex];
  const durationMs = (slot.durationS + chapter * 2) * 1000;
  const c = STAGE_CURVE;
  return {
    id: i + 1,
    name: ch.names[slotIndex],
    durationMs,
    baseReward: Math.round(370 * Math.pow(1.06, i) * (slot.kind === "boss" ? 1.6 : slot.kind === "midboss" ? 1.25 : 1)),
    speedMul: round2(c.speedBase * Math.pow(c.speedGrowth, i) * slot.speed),
    spawnMul: round2(Math.pow(c.densityGrowth, i)),
    spawnScale: 1,
    monsterHp: round2(c.hpBase * Math.pow(c.hpGrowth, i) * CHAPTER_HP[chapter] * slot.hp),
    barrierDmgMul: round2(1 + c.barrierDmgPerStage * i),
    bossCuts: Math.round((c.bossCutsBase + c.bossCutsPerStage * i) * slot.bossCuts),
    bossTier: chapter,
    bossName: slot.kind === "midboss" ? `${ch.boss} 부대장` : ch.boss,
    homingChance: chapter === 0 ? 0 : round2(0.02 + 0.012 * chapter),
    chapter,
    slot: slotIndex + 1,
    slotKind: slot.kind,
    intro: `${ch.name} ${slotIndex + 1}/10 · ${slot.label} — ${slot.intro}${slotIndex === 0 ? ` · ${ch.hint}` : ""}`,
    platforms: [],
    patterns: buildPatterns(i, ch, slot, durationMs),
  };
}

export const STAGES: StageDef[] = Array.from({ length: CHAPTER_COUNT * STAGES_PER_CHAPTER }, (_, i) => buildStage(i));

/** 장 대장 스테이지를 깨면 그 장소(사냥터 지역)가 열린다 — 1장 대장(10) → 지역 2 … 4장 대장(40) → 지역 5 */
export function areaOpenedByClear(stageIndex: number): number {
  const s = STAGES[stageIndex];
  return s && s.slotKind === "boss" ? Math.min(5, s.chapter + 2) : 0;
}

/* ────────────────── 끝없는 성벽 ──────────────────
 * 1장 대장(10 스테이지)을 깨면 열린다. `stageIndex >= STAGES.length` 를 층으로 해석해 `getStage` 가 층을 즉석에서 만든다.
 * 2026-10-02 (사용자: "조금 더 어렵게"): 1층이 10 스테이지(1장 대장) 수준에서 시작해 층마다 한 스테이지씩 깊어지고,
 * 50 스테이지를 넘어서는 층마다 체력·속도·밀도가 5%씩 더 오른다. 층마다 대장이 선다. 한 번 오르기에 등반권 1장.
 */
export const TOWER_START_INDEX = STAGES.length;
export const TOWER_UNLOCK_STAGE = 10;
/** 50 스테이지 다음 층부터의 층당 상승률 */
const TOWER_STEP = 1.05;

export function isTowerIndex(index: number): boolean {
  return index >= TOWER_START_INDEX;
}

/** stageIndex → 성벽 층(1-based). 일반 스테이지면 0. */
export function towerFloorOf(index: number): number {
  return isTowerIndex(index) ? index - TOWER_START_INDEX + 1 : 0;
}

export function towerIndexOf(floor: number): number {
  return TOWER_START_INDEX + Math.max(1, Math.floor(floor)) - 1;
}

function towerStage(index: number): StageDef {
  const floor = towerFloorOf(index);
  const depth = TOWER_UNLOCK_STAGE - 2 + floor;                 // 1층 = 10 스테이지(1장 대장, index 9) 수준
  const base = buildStage(Math.min(STAGES.length - 1, depth));
  const over = Math.max(0, depth - (STAGES.length - 1));
  const scale = Math.pow(TOWER_STEP, over);
  return {
    ...base,
    id: 100 + floor,
    name: `끝없는 성벽 ${floor}층`,
    // 층은 짧게 — "한 층만 더"가 되도록
    durationMs: 30_000,
    baseReward: Math.floor(base.baseReward * (0.55 + floor * 0.04)),
    speedMul: round2(base.speedMul * Math.pow(1.02, over)),
    spawnMul: round2(base.spawnMul * scale),
    monsterHp: round2(base.monsterHp * scale),
    barrierDmgMul: round2(base.barrierDmgMul * Math.pow(1.02, over)),
    bossCuts: Math.round(base.bossCuts * Math.min(1.5, 1 + over * 0.02)),
    bossName: `${base.bossName} (성벽)`,
    intro: `${floor}층 · 대장을 쓰러뜨리면 다음 층 — 층이 오를수록 단단하고 빠르다`,
    patterns: base.patterns.map((p) => ({ ...p, atMs: Math.round(p.atMs * 30_000 / base.durationMs), durationMs: Math.round(p.durationMs * 30_000 / base.durationMs) })),
  };
}

export function getStage(index: number): StageDef {
  if (isTowerIndex(index)) return towerStage(index);
  return STAGES[Math.max(0, index)];
}

/** 일반 원정의 마지막 스테이지인지. 성벽에는 마지막이 없다. */
export function isLastStage(index: number): boolean {
  return index === STAGES.length - 1;
}

/**
 * 스테이지가 열렸는가 — 한 판 = 한 스테이지라 순서대로 연다 (2026-10-02).
 * best = 깬 가장 높은 스테이지 번호(1-based, 새 계정 기본 1 은 '아직 아무것도 안 깸'과 '1 을 깸'이 같아 별로 가른다)
 */
export function stageUnlocked(index: number, best: number, stars: Record<string, number>): boolean {
  if (index <= 0) return true;
  if (index >= STAGES.length) return false;
  if ((stars[String(index - 1)] ?? 0) >= 1) return true;
  return best >= 2 ? index <= best : false;
}

/** 다음에 할 스테이지 — 열린 것 중 가장 깊은 것 */
export function nextStageIndex(best: number, stars: Record<string, number>): number {
  let i = 0;
  while (i + 1 < STAGES.length && stageUnlocked(i + 1, best, stars)) i += 1;
  return i;
}

/**
 * 퀘스트 — 시간마다 골드 (2026-10-26, 사용자: "오늘도 환생 2 처럼 시간 단위별로 돈을 계속 주는 게 맞지? 첨부 UI 처럼 … 넣어줘").
 *
 * 줄마다 주기(초)가 있고, 연 줄은 사냥터가 보이는 동안 저절로 돈다 — 막대가 차면 사냥 골드가 들어온다.
 * 레벨을 올리면 한 주기 보상이 레벨만큼 늘고, Lv 10 · 25 에 보상 ×2. 최대 Lv 25.
 * 2026-10-27 (사용자: "stage 제한을 두지 말고 돈으로만 열리되 10분당 돈을 현재 초당 금액의 100배 더 주는 버튼 · 25 레벨까지") —
 *   층 잠금 · 층별 레벨 상한을 없앴다. 대신 퀘스트 골드만으로 복리를 굴려도 폭주하지 않게 여는 값을 "그 줄이 어울리는 층의 사냥 골드 15분치"로,
 *   레벨 값 증가율을 1.2(첫 줄 1.25)로 올렸다 — 퀘스트만으로 굴리면 1일 ≈ 초당 90 · 3일 ≈ 370 · 7일 ≈ 9.6만(scripts/verify-quests.mjs 시뮬).
 *   10분마다 "초당 퀘스트 골드 × 100" 을 한 번 받는 단추(쌓이지 않는다).
 * 사냥터 저장(TitansSave.quests)에 있어 환생하면 첫 줄 Lv.1 로 돌아간다. 꺼져 있을 때는 돌지 않는다(방치 보상이 따로 있다).
 */

export type QuestDef = { id: string; name: string; sec: number; pay: number; unlock: number; growth: number };

// 2026-10-28 (사용자: "퀘스트탭에 8개가 아니라 30개로") — 30줄. 줄 i 는 ~층 s_i(1 → 46)에 어울리고, 여는 값 = 그 층 사냥 골드 15분치(앞 줄 ×1.3 이상),
// Lv.1 초당 보상 = 그 층 사냥 골드 × 0.025(앞 줄 ×1.15 이상), 주기는 3초 → 460초로 계속 길어진다. 옛 8줄은 여는 값이 가까운 자리로 옮겼다(OLD_QUEST_ORDER).
// 퀘스트만 굴리면 1시간 91% · 하루 4% · 3일 10% · 7일 40%(그 무렵 층 사냥 골드 대비, 옛 8줄 7일 42%) · 모두 Lv25 ≈ 830만/초(45 ~ 55층 사이)
export const QUESTS: readonly QuestDef[] = [
  { id: "twigs", name: "나뭇가지 줍기", sec: 3, pay: 1, unlock: 10, growth: 1.25 },   // ~1층
  { id: "acorns", name: "나무 열매 모으기", sec: 5, pay: 2, unlock: 7_900, growth: 1.2 },   // ~2.6층
  { id: "reed-weave", name: "갈대 엮기", sec: 8, pay: 4, unlock: 11_000, growth: 1.2 },   // ~4.1층
  { id: "dam-patch", name: "댐 틈 메우기", sec: 12, pay: 15, unlock: 46_000, growth: 1.2 },   // ~5.7층
  { id: "mud-haul", name: "진흙 나르기", sec: 16, pay: 23, unlock: 60_000, growth: 1.2 },   // ~7.2층
  { id: "fish-catch", name: "물고기 잡기", sec: 20, pay: 34, unlock: 78_000, growth: 1.2 },   // ~8.8층
  { id: "lily-garden", name: "연꽃 밭 가꾸기", sec: 25, pay: 94, unlock: 130_000, growth: 1.2 },   // ~10.3층
  { id: "river-patrol", name: "강가 순찰", sec: 30, pay: 130, unlock: 170_000, growth: 1.2 },   // ~11.9층
  { id: "bark-strip", name: "나무껍질 벗기기", sec: 36, pay: 180, unlock: 230_000, growth: 1.2 },   // ~13.4층
  { id: "lantern-light", name: "물길 등불 밝히기", sec: 42, pay: 250, unlock: 300_000, growth: 1.2 },   // ~15층
  { id: "stone-stack", name: "돌탑 쌓기", sec: 50, pay: 490, unlock: 390_000, growth: 1.2 },   // ~16.5층
  { id: "stepping-stones", name: "징검다리 놓기", sec: 60, pay: 840, unlock: 510_000, growth: 1.2 },   // ~18.1층
  { id: "log-haul", name: "통나무 나르기", sec: 70, pay: 1_400, unlock: 720_000, growth: 1.2 },   // ~19.6층
  { id: "mill-wheel", name: "물레방아 돌리기", sec: 80, pay: 2_300, unlock: 1_000_000, growth: 1.2 },   // ~21.2층
  { id: "honey-gather", name: "벌꿀 모으기", sec: 95, pay: 3_900, unlock: 1_500_000, growth: 1.2 },   // ~22.7층
  { id: "raft-build", name: "뗏목 만들기", sec: 110, pay: 11_000, unlock: 3_400_000, growth: 1.2 },   // ~24.3층
  { id: "village-guard", name: "비버 마을 경비", sec: 125, pay: 18_000, unlock: 5_200_000, growth: 1.2 },   // ~25.8층
  { id: "watchtower", name: "망루 세우기", sec: 140, pay: 30_000, unlock: 7_700_000, growth: 1.2 },   // ~27.4층
  { id: "tool-forge", name: "연장 벼리기", sec: 160, pay: 52_000, unlock: 12_000_000, growth: 1.2 },   // ~28.9층
  { id: "market-trade", name: "장터 교역", sec: 180, pay: 87_000, unlock: 17_000_000, growth: 1.2 },   // ~30.5층
  { id: "dam-road", name: "둑길 보수", sec: 200, pay: 140_000, unlock: 26_000_000, growth: 1.2 },   // ~32층
  { id: "canal-dig", name: "물길 파기", sec: 225, pay: 240_000, unlock: 39_000_000, growth: 1.2 },   // ~33.6층
  { id: "storehouse", name: "곳간 채우기", sec: 250, pay: 410_000, unlock: 58_000_000, growth: 1.2 },   // ~35.1층
  { id: "river-lighthouse", name: "강 등대 지키기", sec: 275, pay: 670_000, unlock: 88_000_000, growth: 1.2 },   // ~36.7층
  { id: "festival", name: "비버 축제 준비", sec: 300, pay: 1_100_000, unlock: 130_000_000, growth: 1.2 },   // ~38.2층
  { id: "great-dam", name: "큰 댐 증축", sec: 330, pay: 1_800_000, unlock: 200_000_000, growth: 1.2 },   // ~39.8층
  { id: "royal-banner", name: "왕의 깃발 올리기", sec: 360, pay: 2_900_000, unlock: 290_000_000, growth: 1.2 },   // ~41.3층
  { id: "crystal-mine", name: "수정 광산 캐기", sec: 390, pay: 4_800_000, unlock: 440_000_000, growth: 1.2 },   // ~42.9층
  { id: "star-reservoir", name: "별빛 저수지", sec: 420, pay: 7_700_000, unlock: 660_000_000, growth: 1.2 },   // ~44.4층
  { id: "beaver-kingdom", name: "비버 왕국 세우기", sec: 460, pay: 13_000_000, unlock: 990_000_000, growth: 1.2 },   // ~46층
];

export const QUEST_MAX_LEVEL = 25;
export const QUEST_MILESTONES = [10, 25] as const;
/** 10분 보너스 — 초당 퀘스트 골드 × QUEST_BONUS_MUL, 한 번 받으면 QUEST_BONUS_COOLDOWN_MS 뒤에 다시 */
export const QUEST_BONUS_MUL = 100;
export const QUEST_BONUS_COOLDOWN_MS = 10 * 60 * 1000;

/** levels[i] = 0 이면 잠김 · prog[i] = 이번 주기에 흐른 초 · bonusAt = 10분 보너스를 마지막으로 받은 때(ms) · v = 줄 배치 판(2 = 30줄) */
export type QuestState = { levels: number[]; prog: number[]; bonusAt: number; v?: number };

/** 옛 8줄 저장의 차례 — 30줄에서 같은 id 자리로 옮긴다 */
export const OLD_QUEST_ORDER = ["twigs", "acorns", "dam-patch", "river-patrol", "log-haul", "village-guard", "dam-road", "great-dam"] as const;
export const QUEST_LAYOUT = 2;

export function emptyQuests(): QuestState {
  return { levels: QUESTS.map((_, i) => (i === 0 ? 1 : 0)), prog: QUESTS.map(() => 0), bonusAt: 0, v: QUEST_LAYOUT };
}

export function normalizeQuests(raw: unknown): QuestState {
  const base = emptyQuests();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as { levels?: unknown; prog?: unknown; bonusAt?: unknown; v?: unknown };
  const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
  // 옛 8줄 저장(v 없음) — 칸 i 는 OLD_QUEST_ORDER[i] 의 것. 새 자리로 옮긴다
  const at = (arr: unknown, i: number): unknown => {
    if (!Array.isArray(arr)) return 0;
    if (r.v === QUEST_LAYOUT) return arr[i];
    const old = OLD_QUEST_ORDER.indexOf(QUESTS[i].id as (typeof OLD_QUEST_ORDER)[number]);
    return old >= 0 ? arr[old] : 0;
  };
  const levels = QUESTS.map((_, i) => Math.floor(num(at(r.levels, i), QUEST_MAX_LEVEL)));
  levels[0] = Math.max(1, levels[0]);
  const prog = QUESTS.map((q, i) => (levels[i] > 0 ? num(at(r.prog, i), q.sec) : 0));
  return { levels, prog, bonusAt: Math.floor(num(r.bonusAt, Number.MAX_SAFE_INTEGER)), v: QUEST_LAYOUT };
}

/** Lv 이 넘은 마일스톤 수 → 보상 ×2^n */
export function milestoneMul(level: number): number {
  return 2 ** QUEST_MILESTONES.filter((m) => level >= m).length;
}

export function nextMilestone(level: number): number | null {
  return QUEST_MILESTONES.find((m) => level < m) ?? null;
}

/** 한 주기 보상 */
export function questPay(i: number, level: number): number {
  if (!(level > 0)) return 0;   // 칸이 모자란 배열(undefined)도 0
  return Math.floor(QUESTS[i].pay * level * milestoneMul(level));
}

/** Lv → Lv+1 값. Lv 0 이면 여는 값 */
export function questCost(i: number, level: number): number {
  const q = QUESTS[i];
  return Math.ceil(q.unlock * Math.pow(q.growth, Math.max(0, level)));
}

/** 초당 골드 (화면 표시 · 시험) */
export function questGoldPerSec(state: Pick<QuestState, "levels">): number {
  return QUESTS.reduce((a, q, i) => a + questPay(i, state.levels[i]) / q.sec, 0);
}

/** dt 초 흘리기 — 다 찬 주기만큼 골드. 한 번에 여러 주기도(창을 잠깐 가렸다 와도) */
export function tickQuests(state: QuestState, dt: number): { state: QuestState; gold: number; done: number[] } {
  let gold = 0;
  const done: number[] = [];
  const prog = state.prog.map((p, i) => {
    const lv = state.levels[i];
    if (lv <= 0) return 0;
    const sec = QUESTS[i].sec;
    let t = p + Math.max(0, dt);
    if (t >= sec) {
      const n = Math.floor(t / sec);
      gold += questPay(i, lv) * n;
      t -= n * sec;
      done.push(i);
    }
    return t;
  });
  return { state: { ...state, prog }, gold, done };
}

export type QuestBlock = "max" | "prev" | "gold" | null;

/** 지금 못 올리는 까닭 — null 이면 올릴 수 있다 */
export function questBlock(state: QuestState, i: number, gold: number): QuestBlock {
  const lv = state.levels[i];
  if (lv >= QUEST_MAX_LEVEL) return "max";
  if (i > 0 && state.levels[i - 1] <= 0) return "prev";
  if (gold < questCost(i, lv)) return "gold";
  return null;
}

/** 한 단계 올리기(잠긴 줄은 열기) — 못 올리면 null (까닭은 questBlock) */
export function buyQuest(state: QuestState, i: number, gold: number): { state: QuestState; cost: number } | null {
  const lv = state.levels[i];
  if (questBlock(state, i, gold)) return null;
  const cost = questCost(i, lv);
  const levels = state.levels.slice();
  levels[i] = lv + 1;
  return { state: { ...state, levels, prog: state.prog.slice() }, cost };
}

/** 10분 보너스 — 남은 ms (0 이면 받을 수 있다) */
export function questBonusLeftMs(state: QuestState, now: number): number {
  return Math.max(0, state.bonusAt + QUEST_BONUS_COOLDOWN_MS - now);
}

export function questBonusAmount(state: Pick<QuestState, "levels">): number {
  return Math.floor(questGoldPerSec(state) * QUEST_BONUS_MUL);
}

export function claimQuestBonus(state: QuestState, now: number): { state: QuestState; gold: number } | null {
  if (questBonusLeftMs(state, now) > 0) return null;
  const gold = questBonusAmount(state);
  if (gold <= 0) return null;
  return { state: { ...state, bonusAt: now }, gold };
}

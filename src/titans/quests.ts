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

export const QUESTS: readonly QuestDef[] = [
  { id: "twigs", name: "나뭇가지 줍기", sec: 3, pay: 1, unlock: 10, growth: 1.25 },
  { id: "acorns", name: "나무 열매 모으기", sec: 6, pay: 3, unlock: 7_900, growth: 1.2 },
  { id: "dam-patch", name: "댐 틈 메우기", sec: 12, pay: 8, unlock: 37_000, growth: 1.2 },
  { id: "river-patrol", name: "강가 순찰", sec: 25, pay: 60, unlock: 164_000, growth: 1.2 },
  { id: "log-haul", name: "통나무 나르기", sec: 50, pay: 900, unlock: 790_000, growth: 1.2 },
  { id: "village-guard", name: "비버 마을 경비", sec: 100, pay: 17_000, unlock: 5_000_000, growth: 1.2 },
  { id: "dam-road", name: "둑길 보수", sec: 200, pay: 260_000, unlock: 25_500_000, growth: 1.2 },
  { id: "great-dam", name: "큰 댐 증축", sec: 400, pay: 6_200_000, unlock: 205_000_000, growth: 1.2 },
];

export const QUEST_MAX_LEVEL = 25;
export const QUEST_MILESTONES = [10, 25] as const;
/** 10분 보너스 — 초당 퀘스트 골드 × QUEST_BONUS_MUL, 한 번 받으면 QUEST_BONUS_COOLDOWN_MS 뒤에 다시 */
export const QUEST_BONUS_MUL = 100;
export const QUEST_BONUS_COOLDOWN_MS = 10 * 60 * 1000;

/** levels[i] = 0 이면 잠김 · prog[i] = 이번 주기에 흐른 초 · bonusAt = 10분 보너스를 마지막으로 받은 때(ms) */
export type QuestState = { levels: number[]; prog: number[]; bonusAt: number };

export function emptyQuests(): QuestState {
  return { levels: QUESTS.map((_, i) => (i === 0 ? 1 : 0)), prog: QUESTS.map(() => 0), bonusAt: 0 };
}

export function normalizeQuests(raw: unknown): QuestState {
  const base = emptyQuests();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as { levels?: unknown; prog?: unknown; bonusAt?: unknown };
  const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
  const levels = QUESTS.map((_, i) => Math.floor(num(Array.isArray(r.levels) ? r.levels[i] : 0, QUEST_MAX_LEVEL)));
  levels[0] = Math.max(1, levels[0]);
  const prog = QUESTS.map((q, i) => (levels[i] > 0 ? num(Array.isArray(r.prog) ? r.prog[i] : 0, q.sec) : 0));
  return { levels, prog, bonusAt: Math.floor(num(r.bonusAt, Number.MAX_SAFE_INTEGER)) };
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
  if (level <= 0) return 0;
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

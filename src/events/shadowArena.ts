/**
 * 그림자 대전 — 아레나(PvP) 대체.
 *
 * 이 프로젝트의 저장소는 `game/toss.ts`의 로컬 키-값 스토리지뿐이라 서버가 없다.
 * 실시간·비동기 PvP는 만들 수 없으므로, 상대를 **결정론적으로 생성**한다.
 * 같은 유저·같은 주차면 항상 같은 상대 셋이 나오고, 주차가 바뀌면 갈린다.
 *
 * 유저에게 "다른 사람과 겨룬다"고 말하지 않는다. 주간 랭크 시험으로 제시한다.
 */
import { combatPower, type CharacterProgress } from "../progression/model";

export type ShadowOpponent = {
  id: string;
  name: string;
  title: string;
  power: number;
  /** 승리 시 얻는 주간 배율 가산 */
  bonus: number;
};

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — 시드 하나에서 재현 가능한 난수열. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["잊힌", "무명의", "재의", "여명의", "심연의", "황혼의", "강철", "서리"];
const SECOND = ["검객", "추적자", "고행자", "수문장", "방랑자", "집행자", "관측자", "대장장이"];

const TITLES = ["1차 시험", "2차 시험", "최종 시험"];

/** 상대 전투력 배수 — 1차는 붙어볼 만하고 최종은 확실히 벽이다. */
const RATIOS = [0.82, 1.05, 1.34];
const BONUSES = [0.05, 0.1, 0.2];

export function weekKey(now = new Date()): string {
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((+now - +start) / 86_400_000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-${week}`;
}

export function shadowOpponents(
  userHash: string,
  progress: CharacterProgress,
  week = weekKey(),
): ShadowOpponent[] {
  const power = combatPower(progress);
  return TITLES.map((title, rank) => {
    const rng = seeded(hashString(`${userHash}:${week}:${rank}`));
    const first = FIRST[Math.floor(rng() * FIRST.length)];
    const second = SECOND[Math.floor(rng() * SECOND.length)];
    // ±8% 흔들림 — 같은 주차 안에서는 고정이지만 시험마다 미묘하게 다르다.
    const jitter = 0.92 + rng() * 0.16;
    return {
      id: `shadow-${rank}`,
      name: `${first} ${second}`,
      title: title,
      power: Math.max(1, Math.floor(power * RATIOS[rank] * jitter)),
      bonus: BONUSES[rank],
    };
  });
}

export type ShadowResult = {
  win: boolean;
  playerRoll: number;
  opponentRoll: number;
};

/**
 * 판정 — 전투력을 기대값으로 삼고 ±20% 굴린다.
 * 전투력이 확실히 앞서면 거의 이기고, 비슷하면 도박이 된다.
 */
export function resolveShadow(
  progress: CharacterProgress,
  opponent: ShadowOpponent,
  rng: () => number = Math.random,
): ShadowResult {
  const playerRoll = combatPower(progress) * (0.8 + rng() * 0.4);
  const opponentRoll = opponent.power * (0.8 + rng() * 0.4);
  return { win: playerRoll >= opponentRoll, playerRoll, opponentRoll };
}

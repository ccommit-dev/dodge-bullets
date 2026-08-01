import { storageGet, storageSet } from "./toss";

const LEGACY_HIGH_SCORE_KEY = "dodge-bullets:highScore";

function highScoreKey(userHash: string): string {
  return `dodgebullets:highScore:${userHash}`;
}

export async function loadHighScore(userHash: string): Promise<number> {
  const key = highScoreKey(userHash);
  const raw = await storageGet(key);
  if (raw) {
    const value = Number.parseInt(raw, 10);
    if (Number.isFinite(value) && value > 0) return value;
  }

  // 마이그레이션: 예전 전역 키 → 사용자 키로 이전
  try {
    const legacy = localStorage.getItem(LEGACY_HIGH_SCORE_KEY);
    if (legacy) {
      const value = Number.parseInt(legacy, 10);
      if (Number.isFinite(value) && value > 0) {
        await storageSet(key, String(value));
        return value;
      }
    }
  } catch {
    // ignore
  }

  return 0;
}

export async function saveHighScore(userHash: string, score: number): Promise<number> {
  const key = highScoreKey(userHash);
  const raw = await storageGet(key);
  let prev = 0;
  if (raw) {
    const value = Number.parseInt(raw, 10);
    if (Number.isFinite(value) && value > 0) prev = value;
  }
  const next = Math.max(prev, Math.max(0, Math.floor(score)));
  await storageSet(key, String(next));
  return next;
}

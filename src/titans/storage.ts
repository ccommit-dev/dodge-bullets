import { storageGet, storageSet } from "../game/toss";
import { defaultTitansSave, normalizeTitansSave, type TitansSave } from "./model";

function titansKey(userHash: string): string {
  return `dodgebullets:titans:${userHash}`;
}

export async function loadTitansSave(userHash: string): Promise<TitansSave> {
  const raw = await storageGet(titansKey(userHash));
  if (!raw) return defaultTitansSave();
  try {
    return normalizeTitansSave(JSON.parse(raw) as Partial<TitansSave>);
  } catch {
    return defaultTitansSave();
  }
}

export async function saveTitansSave(userHash: string, value: TitansSave): Promise<TitansSave> {
  const next = normalizeTitansSave(value);
  await storageSet(titansKey(userHash), JSON.stringify(next));
  return next;
}

/**
 * 환생 리셋 (LIVEOPS §1.4) — 사냥터를 처음부터 다시 오르게 한다.
 * 리셋: stage·골드·동료 레벨·장비 훈련. 보존: 스킬 인벤토리(SP·코어로 배운 것),
 * 그리고 CharacterProgress 쪽 영구 성장 전부(성급·재련·개척·최고기록).
 */
/** startGold — 환생 직후 바로 동료 · 무기를 올릴 출발 골드 (model.rebirthStartGold, 2026-10-22 아처 키우기 7번) */
export async function rebirthResetTitans(userHash: string, startGold = 0): Promise<TitansSave> {
  const current = await loadTitansSave(userHash);
  const fresh = defaultTitansSave();
  return saveTitansSave(userHash, {
    ...fresh,
    gold: fresh.gold + startGold,
    acorns: current.acorns,   // 도토리는 환생해도 남는다 — 다시 오를 때 동료에 바로 끼운다
    skillInventory: current.skillInventory,
    totalKills: current.totalKills,
    totalTaps: current.totalTaps,
  });
}

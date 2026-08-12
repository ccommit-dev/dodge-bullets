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

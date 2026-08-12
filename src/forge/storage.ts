import { storageGet, storageSet } from "../game/toss";
import { defaultForgeSave, normalizeForgeSave, type ForgeSave } from "./model";

function forgeKey(userHash: string): string {
  return `dodgebullets:forge:${userHash}`;
}

export async function loadForgeSave(userHash: string): Promise<ForgeSave> {
  const raw = await storageGet(forgeKey(userHash));
  if (!raw) return defaultForgeSave();
  try {
    return normalizeForgeSave(JSON.parse(raw) as Partial<ForgeSave>);
  } catch {
    return defaultForgeSave();
  }
}

export async function saveForgeSave(userHash: string, value: ForgeSave): Promise<ForgeSave> {
  const next = normalizeForgeSave(value);
  await storageSet(forgeKey(userHash), JSON.stringify(next));
  return next;
}

import { assetUrl } from "../asset";
import { SHOULDER_DEFINITIONS } from "../equipment/shoulders";
import { swordImageUrl } from "../forge/swords";
import { SKILL_BY_ID } from "../game/skills";
import { BRANCHES, STAGES } from "../game/stages";
import type { CharacterProgress, ShoulderId } from "../progression/model";
import { HEROES, type TitanHeroId } from "../titans/model";
import { allyIdleCell } from "../titans/SpriteArt";
import { loadTitansSave } from "../titans/storage";
import type { ShareCardInput } from "./shareCard";

const SHOULDER_COL: Record<ShoulderId, number> = { scout: 0, shadow: 1, ogre: 2, dragon: 3 };

/**
 * 공유 카드의 동료 · 장비 · 기록 칸 (2026-10-06) — 원정 결과 카드와 마이페이지 카드가 같은 것을 쓴다.
 * 동료는 편성(partyIds) 순서 그대로 넷, 레벨은 사냥터 저장에서 읽는다
 */
export async function shareCardExtras(userHash: string, progress: CharacterProgress): Promise<Pick<ShareCardInput, "allies" | "items" | "stats">> {
  const save = await loadTitansSave(userHash).catch(() => null);
  const allies = progress.partyIds.slice(0, 4).map((id) => {
    const def = HEROES.find((h) => h.id === id);
    const cell = allyIdleCell(id as TitanHeroId, progress.equippedAllySkins[id as TitanHeroId]);
    return { name: def?.name ?? id, level: save ? save.heroes[id as TitanHeroId] ?? undefined : undefined, ...cell };
  });
  const items: NonNullable<ShareCardInput["items"]> = [
    { name: "대검", sub: `+${progress.equippedWeaponLevel}`, src: swordImageUrl(Math.min(15, progress.equippedWeaponLevel)) },
  ];
  if (progress.equippedShoulder) {
    items.push({ name: SHOULDER_DEFINITIONS[progress.equippedShoulder].name, sub: "견갑", src: assetUrl("titans/equipment/shoulders/shoulder-tier-sheet.png"), crop: { cols: 4, col: SHOULDER_COL[progress.equippedShoulder] } });
  }
  for (const id of progress.expeditionLoadout.slice(0, 4)) {
    const def = SKILL_BY_ID[id];
    if (!def) continue;
    items.push({ name: def.weapon, sub: `Lv.${progress.expeditionSkills[id] ?? 0}`, src: assetUrl(`dodge/skills/${def.icon}.png`) });
  }
  const cleared = STAGES.filter((_, i) => (progress.dodgeStars[String(i)] ?? 0) >= 1).length;
  const stars = Object.values(progress.dodgeStars).reduce((a, b) => a + b, 0);
  const routes = BRANCHES.filter((b) => (progress.dodgeBranches[b.id] ?? 0) >= 1).length;
  const stats = [
    { label: "모험가", value: `Lv.${progress.level}` },
    { label: "원정 진척", value: `${cleared}/${STAGES.length} · 갈림길 ${routes}` },
    { label: "원정 별", value: `★ ${stars}/${STAGES.length * 3}` },
    progress.towerBestFloor > 0 ? { label: "끝없는 성벽", value: `${progress.towerBestFloor}층` } : { label: "사냥터 최고", value: `Stage ${progress.titanBestStage}` },
  ];
  return { allies, items, stats };
}

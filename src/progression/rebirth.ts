/**
 * 환생 (마이페이지 단추 · 사냥터 자동 환생이 같이 쓴다).
 *
 * 2026-10-22 아처 키우기 7번 — "언제까지 환생하냐, 귀찮다"를 피하려고 자동 환생(설정)을 더했다.
 * 켜 두면 사냥터에서 벽 기록이 환생 조건을 채우는 순간 바로 환생하고 1층부터 다시 오른다.
 */
import type { CharacterProgress } from "./model";
import { updateCharacterProgress } from "./storage";
import { earnedBadgeIds } from "./badges";
import { openMomentOffer } from "../economy/momentOffers";
import { rebirthResetTitans } from "../titans/storage";
import { rebirthCrystals, rebirthStartGold, type TitansSave } from "../titans/model";

// 3 → 2: 밸런스 시뮬에서 15~30일이 Stage 29 정체였고 환생이 30일에야 1회 — 2개 지역이면 개척 완료(9일) 직후 열린다
export const REBIRTH_WALL_AREAS = 2;

/** 첫 환생 뒤에는 한 지역이면 된다 — 환생이 벽 기록을 비우고 다시 오르면 마지막 지역에서만 막히므로 (2026-10-01) */
export function rebirthNeedAreas(progress: Pick<CharacterProgress, "rebirthCount">): number {
  return progress.rebirthCount >= 1 ? 1 : REBIRTH_WALL_AREAS;
}

export function canRebirthNow(progress: Pick<CharacterProgress, "rebirthCount" | "wallAreas">): boolean {
  return progress.wallAreas.length >= rebirthNeedAreas(progress);
}

/** 사냥터를 초기화하고 계승 보상을 준다. 결정 · 출발 골드는 환생 전 최고 스테이지로 정한다 */
export async function performRebirth(userHash: string, progress: CharacterProgress): Promise<{ next: CharacterProgress; titans: TitansSave; crystals: number; startGold: number }> {
  const crystals = rebirthCrystals(progress.titanBestStage);
  const startGold = rebirthStartGold(progress.titanBestStage);
  const titans = await rebirthResetTitans(userHash, startGold);
  // retention-4: 환생 직후 축하 제안(환생 세트) — 같은 갱신에서 열어 lost update 방지
  const next = await updateCharacterProgress(userHash, (current) => openMomentOffer({
    ...current,
    rebirthCount: current.rebirthCount + 1,
    inheritanceCrystals: current.inheritanceCrystals + crystals,
    evolutionPoints: current.evolutionPoints + 1,
    // 벽 기록은 소모 — 다음 환생도 다시 벽을 봐야 한다
    wallAreas: [],
    // 동료 레벨이 리셋되므로 편성·파견도 비운다 (partyCap 하한과 펫은 보존)
    partyIds: [],
    expeditions: [],
    // 복귀 버프: 24시간 방치 산출 2배 (P1 따라잡기와 함께 재등반을 가속)
    idleBoostUntil: Date.now() + 24 * 3600 * 1000,
    claimedBadges: [...new Set([...current.claimedBadges, ...earnedBadgeIds(current), "rebirth-one"])],
  }, "rebirth"));
  return { next, titans, crystals, startGold };
}

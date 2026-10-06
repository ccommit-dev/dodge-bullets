import { assetUrl } from "../asset";
import type { BeatCosmetics, RingSkinId, SpikeSkinId } from "./types";

/**
 * 비트 수련 커스텀 아이템 (2026-10-06, 사용자: "커스텀 아이템 리소스 및 상점 연동 진행").
 * 예전엔 표와 저장만 있고 사는 화면이 없었다(구호는 그리지도 않았다). 이제:
 *   지휘 북 = 판정 레일·패드·고리의 빛 색 · 구호 = 내 노트에 붙는 문장(紋章)과 테두리
 *   값은 붉은 보석(외형 전용, 능력치 없음) · 비트 메뉴 '커스텀'과 사냥터 상점 '외형' 탭 두 곳에서 사고 장착한다
 *   아이콘 public/beat/custom/<ring|spike>-<id>.png (art-gen batch-monsters-x3.sh 끝부분)
 * 소유·장착은 진행도 저장(CharacterProgress.beatCosmetics)에 둔다 — 보석 차감과 지급이 한 번의 저장이 된다.
 */

export type BeatShopItem =
  | { kind: "ring"; id: RingSkinId; name: string; desc: string; cost: number }
  | { kind: "spike"; id: SpikeSkinId; name: string; desc: string; cost: number };

export const BEAT_SHOP_ITEMS: BeatShopItem[] = [
  { kind: "ring", id: "neon", name: "훈련 지휘 북", desc: "판정 레일을 청록 네온으로 — 기본", cost: 0 },
  { kind: "ring", id: "gold", name: "황금 전진 북", desc: "레일·패드·판정 고리가 황금빛으로", cost: 80 },
  { kind: "ring", id: "magenta", name: "공명의 전투 북", desc: "선명한 자홍빛 공명 레일", cost: 100 },
  { kind: "ring", id: "ice", name: "빙결 수호 북", desc: "서리 낀 하늘색 레일과 차가운 고리", cost: 120 },
  { kind: "ring", id: "ember", name: "용화염 지휘 북", desc: "불꽃처럼 타오르는 주황 레일", cost: 140 },
  { kind: "spike", id: "triangle", name: "기본 구호", desc: "장식 없는 훈련용 노트 — 기본", cost: 0 },
  { kind: "spike", id: "arrow", name: "돌격 구호", desc: "노트 뒤로 붉은 돌격 꼬리가 달린다", cost: 90 },
  { kind: "spike", id: "diamond", name: "수호 구호", desc: "노트를 푸른 마름모 방패가 감싼다", cost: 110 },
  { kind: "spike", id: "star", name: "공명 구호", desc: "보랏빛 별 문장과 반짝임", cost: 130 },
  { kind: "spike", id: "bolt", name: "필살 구호", desc: "노란 번개 문장과 전기 테두리", cost: 150 },
];

export function emptyBeatCosmetics(): BeatCosmetics {
  return {
    ringSkin: "neon",
    spikeSkin: "triangle",
    ownedRings: ["neon"],
    ownedSpikes: ["triangle"],
  };
}

export function normalizeBeatCosmetics(raw: Partial<BeatCosmetics> | null): BeatCosmetics {
  const base = emptyBeatCosmetics();
  if (!raw) return base;
  const rings = Array.isArray(raw.ownedRings)
    ? raw.ownedRings.filter((id): id is RingSkinId =>
        BEAT_SHOP_ITEMS.some((i) => i.kind === "ring" && i.id === id),
      )
    : base.ownedRings;
  const spikes = Array.isArray(raw.ownedSpikes)
    ? raw.ownedSpikes.filter((id): id is SpikeSkinId =>
        BEAT_SHOP_ITEMS.some((i) => i.kind === "spike" && i.id === id),
      )
    : base.ownedSpikes;
  const ownedRings = rings.includes("neon") ? rings : (["neon", ...rings] as RingSkinId[]);
  const ownedSpikes = spikes.includes("triangle")
    ? spikes
    : (["triangle", ...spikes] as SpikeSkinId[]);
  const ringSkin =
    raw.ringSkin && ownedRings.includes(raw.ringSkin) ? raw.ringSkin : "neon";
  const spikeSkin =
    raw.spikeSkin && ownedSpikes.includes(raw.spikeSkin) ? raw.spikeSkin : "triangle";
  return { ringSkin, spikeSkin, ownedRings, ownedSpikes };
}

export function beatShopItemCost(item: BeatShopItem): number {
  return item.cost;
}

/** 아이템 아이콘 */
export function beatItemIcon(item: Pick<BeatShopItem, "kind" | "id">): string {
  return assetUrl(`beat/custom/${item.kind}-${item.id}.png`);
}

export function ownsBeatItem(c: BeatCosmetics, item: BeatShopItem): boolean {
  return item.kind === "ring" ? c.ownedRings.includes(item.id) : c.ownedSpikes.includes(item.id);
}

export function equippedBeatItem(c: BeatCosmetics, item: BeatShopItem): boolean {
  return item.kind === "ring" ? c.ringSkin === item.id : c.spikeSkin === item.id;
}

/** 산 아이템을 바로 장착한다 */
export function grantBeatItem(c: BeatCosmetics, item: BeatShopItem): BeatCosmetics {
  if (item.kind === "ring") return normalizeBeatCosmetics({ ...c, ownedRings: [...new Set([...c.ownedRings, item.id])], ringSkin: item.id });
  return normalizeBeatCosmetics({ ...c, ownedSpikes: [...new Set([...c.ownedSpikes, item.id])], spikeSkin: item.id });
}

export function equipBeatItem(c: BeatCosmetics, item: BeatShopItem): BeatCosmetics {
  if (!ownsBeatItem(c, item)) return c;
  return item.kind === "ring" ? { ...c, ringSkin: item.id } : { ...c, spikeSkin: item.id };
}

/** 옛 비트 전용 저장(dodgebullets:beatCosmetics)과 진행도 저장을 합친다 — 소유는 합집합, 장착은 진행도 쪽 우선 */
export function mergeBeatCosmetics(primary: BeatCosmetics, legacy: BeatCosmetics): BeatCosmetics {
  const ownedRings = [...new Set([...primary.ownedRings, ...legacy.ownedRings])];
  const ownedSpikes = [...new Set([...primary.ownedSpikes, ...legacy.ownedSpikes])];
  const ringSkin = primary.ringSkin !== "neon" ? primary.ringSkin : legacy.ringSkin;
  const spikeSkin = primary.spikeSkin !== "triangle" ? primary.spikeSkin : legacy.spikeSkin;
  return normalizeBeatCosmetics({ ringSkin, spikeSkin, ownedRings, ownedSpikes });
}

import type { BeatCosmetics, RingSkinId, SpikeSkinId } from "./types";

export type BeatShopItem =
  | { kind: "ring"; id: RingSkinId; name: string; desc: string; cost: number }
  | { kind: "spike"; id: SpikeSkinId; name: string; desc: string; cost: number };

export const BEAT_SHOP_ITEMS: BeatShopItem[] = [
  { kind: "ring", id: "neon", name: "훈련 지휘 북", desc: "기본 전진 명령 음색", cost: 0 },
  { kind: "ring", id: "gold", name: "황금 전진 북", desc: "행군 명령을 강조하는 묵직한 음색", cost: 80 },
  { kind: "ring", id: "magenta", name: "공명의 전투 북", desc: "공격 명령용 선명한 음색", cost: 100 },
  { kind: "ring", id: "ice", name: "빙결 수호 북", desc: "방어 명령용 차가운 음색", cost: 120 },
  { kind: "ring", id: "ember", name: "용화염 지휘 북", desc: "필살 구간용 불꽃 음색", cost: 140 },
  { kind: "spike", id: "triangle", name: "기본 구호", desc: "훈련용 화살표 명령", cost: 0 },
  { kind: "spike", id: "arrow", name: "돌격 구호", desc: "전진·공격 화살표 장식", cost: 90 },
  { kind: "spike", id: "diamond", name: "수호 구호", desc: "방어 화살표 장식", cost: 110 },
  { kind: "spike", id: "star", name: "공명 구호", desc: "콤보 성공 화살표 장식", cost: 130 },
  { kind: "spike", id: "bolt", name: "필살 구호", desc: "피버 명령 화살표 장식", cost: 150 },
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

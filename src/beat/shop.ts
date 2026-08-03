import type { BeatCosmetics, RingSkinId, SpikeSkinId } from "./types";

export type BeatShopItem =
  | { kind: "ring"; id: RingSkinId; name: string; desc: string; cost: number }
  | { kind: "spike"; id: SpikeSkinId; name: string; desc: string; cost: number };

export const BEAT_SHOP_ITEMS: BeatShopItem[] = [
  { kind: "ring", id: "neon", name: "네온 시안", desc: "기본 궤도 스킨", cost: 0 },
  { kind: "ring", id: "gold", name: "골드 링", desc: "따뜻한 금빛 궤도", cost: 80 },
  { kind: "ring", id: "magenta", name: "마젠타 링", desc: "클럽 핑크 궤도", cost: 100 },
  { kind: "ring", id: "ice", name: "아이스 링", desc: "차가운 파란 궤도", cost: 120 },
  { kind: "ring", id: "ember", name: "엠버 링", desc: "불꽃 주황 궤도", cost: 140 },
  { kind: "spike", id: "triangle", name: "기본 삼각", desc: "기본 장애물", cost: 0 },
  { kind: "spike", id: "arrow", name: "화살표 비트", desc: "화살형 장애물", cost: 90 },
  { kind: "spike", id: "diamond", name: "다이아 비트", desc: "마름모 장애물", cost: 110 },
  { kind: "spike", id: "star", name: "스타 비트", desc: "별 모양 장애물", cost: 130 },
  { kind: "spike", id: "bolt", name: "볼트 비트", desc: "번개형 장애물", cost: 150 },
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

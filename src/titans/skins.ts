/**
 * 동료 스킨(코스튬) 카탈로그 — 같은 동료의 외형만 바꾼다 (성급·레벨 공유).
 * 얼터너티브 동료(별도 캐릭터, §9)와 다른 축의 확정 구매 상품이다.
 * 아트는 scripts/make-variant-atlas.mjs가 tint 파생으로 생성한다 (전투 아틀라스 + 상점 썸네일).
 *
 * J: SSR 10명 스킨 각 300 보석. 해당 동료가 현재 픽업이면 20% 할인(240) — 픽업 기간의 구매 동기 연결.
 *    season-N 은 시즌 패스 유료 15단 보상 — gemCost null(비매품).
 */
import { assetUrl } from "../asset";
import type { TitanHeroId } from "./model";

export type AllySkinDef = {
  ally: TitanHeroId;
  name: string;
  desc: string;
  url: string;
  /** null = 판매하지 않음 (시즌 한정) */
  gemCost: number | null;
};

/** 픽업 동료의 스킨 할인율 (J) */
export const PICKUP_SKIN_DISCOUNT = 0.2;

export const ALLY_SKINS: Record<string, AllySkinDef> = {
  "garen-magma": {
    ally: "garen",
    name: "용암 기사 가렌",
    desc: "화산의 무구를 두른 가렌 — 외형 전용",
    url: assetUrl("titans/generated/allies/garen-magma.png"),
    gemCost: 300,
  },
  "leon-frost": {
    ally: "leon",
    name: "설원 궁수 레온",
    desc: "설원 위장을 입은 레온 — 외형 전용",
    url: assetUrl("titans/generated/allies/leon-frost.png"),
    gemCost: 300,
  },
  "ari-blaze": { ally: "ari", name: "불꽃의 용기사 아리", desc: "황금빛 화염을 두른 용기사 아리 — 외형 전용", url: assetUrl("titans/generated/allies/skins/ari-blaze.png"), gemCost: 300 },
  "nox-abyss": { ally: "nox", name: "심연의 암살자 녹스", desc: "심연의 보랏빛을 두른 암살자 녹스 — 외형 전용", url: assetUrl("titans/generated/allies/skins/nox-abyss.png"), gemCost: 300 },
  "luna-eclipse": { ally: "luna", name: "월식의 성기사 루나", desc: "월식의 그림자를 두른 성기사 루나 — 외형 전용", url: assetUrl("titans/generated/allies/skins/luna-eclipse.png"), gemCost: 300 },
  "sera_light-halo": { ally: "sera_light", name: "후광의 성광 세라", desc: "성스러운 후광을 두른 성광 세라 — 외형 전용", url: assetUrl("titans/generated/allies/skins/sera_light-halo.png"), gemCost: 300 },
  "bronn-iron": { ally: "bronn", name: "강철의 용암기사 브론", desc: "무쇠빛 갑주를 두른 용암기사 브론 — 외형 전용", url: assetUrl("titans/generated/allies/skins/bronn-iron.png"), gemCost: 300 },
  "iris-prism": { ally: "iris", name: "프리즘 빙결술사 아이리스", desc: "프리즘 빛을 두른 빙결술사 아이리스 — 외형 전용", url: assetUrl("titans/generated/allies/skins/iris-prism.png"), gemCost: 300 },
  "cain-ash": { ally: "cain", name: "잿빛 뇌광검 카인", desc: "재가 내려앉은 뇌광검 카인 — 외형 전용", url: assetUrl("titans/generated/allies/skins/cain-ash.png"), gemCost: 300 },
  "sylph-dawn": { ally: "sylph", name: "여명의 정령왕 실프", desc: "여명빛을 두른 정령왕 실프 — 외형 전용", url: assetUrl("titans/generated/allies/skins/sylph-dawn.png"), gemCost: 300 },
  "orion-nova": { ally: "orion", name: "신성의 성창 오리온", desc: "신성 폭발빛을 두른 성창 오리온 — 외형 전용", url: assetUrl("titans/generated/allies/skins/orion-nova.png"), gemCost: 300 },
  "ember-ruby": { ally: "ember", name: "홍옥의 불사조 엠버", desc: "홍옥빛 불꽃을 두른 불사조 엠버 — 외형 전용", url: assetUrl("titans/generated/allies/skins/ember-ruby.png"), gemCost: 300 },
  // 시즌 한정 — 시즌 패스 유료 15단 (economy/seasonPass.ts). 상점에는 보유 시에만 표시
  "season-1": { ally: "ari", name: "시즌 1 · 자수정 용기사 아리", desc: "시즌 1 패스 한정 — 자수정빛 용기사 아리", url: assetUrl("titans/generated/allies/skins/season-1.png"), gemCost: null },
  "season-2": { ally: "nox", name: "시즌 2 · 황금 암살자 녹스", desc: "시즌 2 패스 한정 — 황금빛 암살자 녹스", url: assetUrl("titans/generated/allies/skins/season-2.png"), gemCost: null },
};

/** 스킨 가격 — 픽업 중인 동료면 20% 할인. 비매품은 null */
export function skinPrice(skinId: string, pickups: readonly TitanHeroId[]): number | null {
  const def = ALLY_SKINS[skinId];
  if (!def || def.gemCost === null) return null;
  return pickups.includes(def.ally) ? Math.round(def.gemCost * (1 - PICKUP_SKIN_DISCOUNT)) : def.gemCost;
}

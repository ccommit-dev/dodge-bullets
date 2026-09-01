/**
 * 동료 스킨(코스튬) 카탈로그 — 같은 동료의 외형만 바꾼다 (성급·레벨 공유).
 * 얼터너티브 동료(별도 캐릭터, §9)와 다른 축의 확정 구매 상품이다.
 * 아트는 scripts/make-ally-skins.mjs가 tint 파생으로 생성한다.
 */
import { assetUrl } from "../asset";
import type { TitanHeroId } from "./model";

export type AllySkinDef = {
  ally: TitanHeroId;
  name: string;
  desc: string;
  url: string;
  gemCost: number;
};

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
};

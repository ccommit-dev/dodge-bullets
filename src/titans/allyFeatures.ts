/**
 * 동료 특성 실효과 (2026-10-08, Galactic Outlaw ⑤ 메타 성장 · 동료 간 관계).
 *
 * 도감의 feature 문구는 지금까지 장식이었다. 현역 다섯 동료의 문구를 실제 효과로 바꾼다 — 편성이 빌드가 되게.
 * 값은 TitansGame 의 피해·약점·화상·빙결 식이 읽는다. 같은 동료는 하나뿐이라 중복은 없다.
 * (카인·아이리스는 은퇴했으므로 치명 연계는 녹스, 빙결 결박은 루나가 맡는다)
 */
import type { TitanHeroId } from "./model";

export type AllyFeatureId = "leon" | "pyro" | "nox" | "orion" | "luna";

export type AllyFeatureDef = { id: AllyFeatureId; label: string; desc: string };

export const ALLY_FEATURES: Record<AllyFeatureId, AllyFeatureDef> = {
  leon: { id: "leon", label: "약점 표식", desc: "보스 약점 창 +2초" },
  pyro: { id: "pyro", label: "화상 중첩", desc: "화상 틱 피해 ×1.5" },
  nox: { id: "nox", label: "치명 연계", desc: "치명 스킬 명중 뒤 +30% 추가 타" },
  orion: { id: "orion", label: "성창", desc: "보스에게 피해 +15%" },
  luna: { id: "luna", label: "성광 결박", desc: "빙결 지속 +30%" },
};

export type AllyFeatureEffects = {
  weakWindowMs: number;
  burnMul: number;
  /** 치명 스킬 뒤 추가 타 비율 (0 이면 없음) */
  critChain: number;
  bossMul: number;
  freezeMul: number;
  /** 발동 중인 특성 — 편성 패널 칩 */
  active: AllyFeatureId[];
};

export function allyFeatureEffects(party: TitanHeroId[]): AllyFeatureEffects {
  const has = (id: AllyFeatureId) => party.includes(id as TitanHeroId);
  const active = (Object.keys(ALLY_FEATURES) as AllyFeatureId[]).filter(has);
  return {
    weakWindowMs: has("leon") ? 2000 : 0,
    burnMul: has("pyro") ? 1.5 : 1,
    critChain: has("nox") ? 0.3 : 0,
    bossMul: has("orion") ? 1.15 : 1,
    freezeMul: has("luna") ? 1.3 : 1,
    active,
  };
}

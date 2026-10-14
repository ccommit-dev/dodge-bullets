/**
 * 동료 시그니처 기술 (2026-10-14, 사용자: "캐릭터 및 동료별 특징을 잘 모르겠어 · 능력치나 이펙트·기술 애니메이션 다시").
 *
 * 모든 동료가 같은 "ally" 반짝임 하나로 때리던 것을, 동료마다 이름 있는 기술 + 역할별 이펙트 모양으로 나눈다.
 *   - N 타마다 시그니처 1회: 그 타는 ×sigMul, 나머지 타는 ×baseMul — 평균 피해는 정확히 1 (밸런스 불변, 리듬만 생긴다)
 *       baseMul = (N - sigMul) / (N - 1)
 *   - fx: 근접 = 베기 호 · 원거리 = 투사체 · 탱커 = 방패 충격파 · 힐러 = 빛 고리
 *   - 고유 특성(allyFeatures)이 있는 동료는 도감·뽑기에서 함께 보인다
 */
import type { TitanHeroId } from "./model";
import { ALLY_ROLE, type AllyRole } from "./allies";

export type SigFx = "slash" | "arrow" | "bolt" | "quake" | "halo";
export type AllySignature = { move: string; fx: SigFx; every: number; mul: number; desc: string };

const FX_OF: Record<AllyRole, SigFx> = { melee: "slash", ranged: "arrow", tank: "quake", healer: "halo" };

/** 동료별 기술 이름·설명 (역할 기본 fx 를 바꾸는 경우만 fx 지정) */
const RAW: Record<TitanHeroId, { move: string; desc: string; fx?: SigFx; every?: number; mul?: number }> = {
  // 빠른 연타형(0.7초 안쪽): 5타마다 ×2.4 — 드물지만 크게 · 느린 중량형(1.3초 이상): 3타마다 ×1.6 — 자주 · 나머지 4타 ×1.9
  mia: { move: "쌍단검 난무", desc: "2연격 끝에 X자 베기", every: 5, mul: 2.4 },
  leon: { move: "약점 표식 화살", desc: "꿰뚫는 한 발 — 보스 약점 창을 늘린다" },
  sera: { move: "마력탄 폭발", desc: "마력탄이 터지며 범위 피해", fx: "bolt", every: 3, mul: 1.6 },
  garen: { move: "대검 내려찍기", desc: "땅을 울리는 중량 일격", every: 3, mul: 1.6 },
  ari: { move: "화염 돌진창", desc: "창끝 불꽃으로 꿰뚫는 돌진" },
  nox: { move: "그림자 이중베기", desc: "치명 뒤 보이지 않는 두 번째 칼날", every: 5, mul: 2.4 },
  luna: { move: "성광 결박", desc: "빛 고리가 적을 묶는다", every: 3, mul: 1.6 },
  volt: { move: "포탑 일제 사격", desc: "설치한 포탑이 한꺼번에 쏜다", fx: "bolt" },
  mia_dark: { move: "그림자 잔상베기", desc: "연격이 그림자 잔상을 남긴다", every: 5, mul: 2.4 },
  sera_light: { move: "성광 폭발", desc: "빛 마력탄이 광역으로 터진다" },
  pyro: { move: "화염 회전베기", desc: "불꽃을 두른 쌍검 회전", fx: "slash" },
  marina: { move: "치유 파도", desc: "물결이 파티를 씻고 보호막을 친다", every: 3, mul: 1.6 },
  terra: { move: "지진 반격", desc: "방패로 막고 땅을 울려 되친다", every: 3, mul: 1.6 },
  zephyr: { move: "관통 질풍화살", desc: "바람을 타고 줄지어 꿰뚫는 화살", every: 5, mul: 2.4 },
  bronn: { move: "용암 반격", desc: "맞은 만큼 용암 대검으로 돌려준다", every: 3, mul: 1.6 },
  iris: { move: "빙결 창", desc: "얼음 창이 박히며 적을 느리게", fx: "bolt" },
  cain: { move: "뇌광 발도", desc: "번개처럼 뽑는 한 칼 — 치명 연쇄", every: 5, mul: 2.4 },
  sylph: { move: "정령 질풍", desc: "바람 정령이 파티를 감싸 빨라진다" },
  orion: { move: "성창 낙하", desc: "하늘에서 성창이 떨어진다 — 보스 특화", fx: "bolt" },
  ember: { move: "불사조 강하", desc: "불사조가 내려꽂혀 전장을 태운다", fx: "bolt", every: 3, mul: 1.6 },
};

export const SIGNATURE_EVERY = 4;
export const SIGNATURE_MUL = 1.9;

export function allySignature(id: TitanHeroId): AllySignature {
  const r = RAW[id] ?? { move: "필살기", desc: "" };
  return { move: r.move, desc: r.desc, fx: r.fx ?? FX_OF[ALLY_ROLE[id] ?? "melee"], every: r.every ?? SIGNATURE_EVERY, mul: r.mul ?? SIGNATURE_MUL };
}

/** 평범한 타의 배수 — 평균이 1 이 되게 */
export function signatureBaseMul(sig: AllySignature): number {
  return (sig.every - sig.mul) / (sig.every - 1);
}

/** n 번째 공격(1부터)이 시그니처인가 */
export function isSignatureHit(sig: AllySignature, attackNo: number): boolean {
  return attackNo > 0 && attackNo % sig.every === 0;
}

export const SIG_FX_LABEL: Record<SigFx, string> = { slash: "베기", arrow: "투사체", bolt: "마법탄", quake: "충격파", halo: "빛 고리" };

/** 도감·뽑기 능력치 막대 (1~5) — 공속은 공격 간격, 한방은 시그니처 1타가 몇 초치 DPS 인가(간격 × 배수) */
export function allyStatBars(attackInterval: number, sig: AllySignature): { speed: number; burst: number } {
  const clamp = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
  return {
    speed: clamp(1 + ((1.6 - attackInterval) / 1.02) * 4),
    burst: clamp(1 + ((attackInterval * sig.mul - 1.35) / 1.2) * 4),
  };
}

/** 한 줄 요약 — "5타마다 ×2.4 · 베기" */
export function signatureRhythm(sig: AllySignature): string {
  return `${sig.every}타마다 ×${sig.mul} · ${SIG_FX_LABEL[sig.fx]}`;
}

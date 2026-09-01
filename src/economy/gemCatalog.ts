/**
 * 보석 소비형 카탈로그 확장 — 커스터마이즈(무기 외형·칭호) + 재화·아이템.
 *
 * 원칙 (LIVEOPS §3.1): 전부 확정 구매, 확률 없음. 유료 재화(₩)가 아니라
 * 보석 소비형이므로 클라이언트 지급이 허용된다 (결제 원칙 준수).
 *
 * 재화 팩은 고정 수량이 아니라 **진행도 비례**다 — killGold(titanBestStage)로
 * 스케일해 초반엔 싸구려, 후반엔 유의미한 팩이 되는 것을 막는다 (데이터 기반).
 */
import { killGold } from "../titans/model";
import type { CharacterProgress } from "../progression/model";

/* ── 무기 외형 (커스텀) — 강화 티어 색을 덮어쓰는 칼날 외형. 성능 무관 ── */
export type WeaponSkinDef = {
  name: string;
  desc: string;
  /** SwordArt hue 오버라이드 */
  hue: number;
  /** 오라 발광 색 */
  aura: string;
  gemCost: number;
  spriteIndex: 0 | 1 | 2;
};

export const WEAPON_SKINS: Record<string, WeaponSkinDef> = {
  "blade-crimson": {
    name: "진홍 마검",
    desc: "핏빛 마력이 칼날을 타고 흐른다 — 외형 전용",
    hue: 350,
    aura: "#f87171",
    gemCost: 450,
    spriteIndex: 0,
  },
  "blade-glacier": {
    name: "빙하의 검",
    desc: "만년설의 냉기가 서린 칼날 — 외형 전용",
    hue: 195,
    aura: "#7dd3fc",
    gemCost: 450,
    spriteIndex: 1,
  },
  "blade-solar": {
    name: "황금 성검",
    desc: "태양의 축복이 깃든 칼날 — 외형 전용",
    hue: 46,
    aura: "#fcd34d",
    gemCost: 600,
    spriteIndex: 2,
  },
};

/* ── 칭호 — 마이페이지 프로필에 표시. 수집·과시 축 ── */
export type TitleDef = {
  name: string;
  desc: string;
  color: string;
  gemCost: number;
};

export const TITLES: Record<string, TitleDef> = {
  "title-pioneer": {
    name: "심연의 개척자",
    desc: "미지의 사냥터를 열어젖힌 자",
    color: "#7dd3fc",
    gemCost: 150,
  },
  "title-wall": {
    name: "성벽의 정복자",
    desc: "끝없는 성벽을 오르는 자",
    color: "#c4b5fd",
    gemCost: 150,
  },
  "title-titan": {
    name: "타이탄 슬레이어",
    desc: "타이탄의 그림자를 사냥하는 자",
    color: "#fcd34d",
    gemCost: 250,
  },
};

/* ── 재화·아이템 팩 ── */
export const GEM_PACK = {
  /** 황금 보급 상자 — 사냥터 골드. 수량은 아래 goldPackAmount */
  goldPackCost: 100,
  /** 강화석 상자 */
  materialPackCost: 60,
  materialPackAmount: 80,
  /** 스킬 코어 상자 */
  corePackCost: 90,
  corePackAmount: 5,
  /** 파견 즉시 완료권 — 진행 중 파견 1건을 바로 귀환시킨다 */
  expeditionFinishCost: 30,
} as const;

/**
 * 황금 보급 상자 수량 — 현재 최고 스테이지 보스 킬골드 × 900.
 * 능동 사냥 약 30~40분치로, 스테이지가 오르면 자동으로 같이 오른다.
 */
export function goldPackAmount(progress: CharacterProgress): number {
  const stage = Math.max(1, progress.titanBestStage);
  return Math.floor(killGold(stage, true, false) * 900);
}

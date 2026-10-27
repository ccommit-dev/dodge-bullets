/**
 * 동료 3배 · 6등급 (2026-10-27, 사용자: "동료를 스테이지별이 아니라 동뽑 레벨이 있어서 레벨별 SSR 확률을 높이게 · 3단계 말고 6단계로 동료 새로 만들어줘 ·
 * 동료도 지금보다 3배는 많게 · 레벨에 따라 리소스 · 스킬 애니메이션도 현질 유도하게 화려하게").
 *
 * 기존 20명(R · SR · SSR)은 그대로 두고 새 40명을 더한다 — 등급은 N 일반 · R 희귀 · SR 영웅 · SSR 전설 · UR 신화 · LR 초월.
 * 새 동료 한 명에 필요한 것(이름 · 역할 · 속성 · 시그니처 기술 · 그림 역할 · 열리는 층 · 힘)을 이 파일 한 곳에 모으고,
 * model(HEROES) · allies(등급 · 역할 · 속성) · allySignature 가 여기서 펼쳐 합친다.
 * 열리는 층은 등급을 섞어 둔다 — 지역마다 여러 등급이 있어야 뽑기 레벨(등급 확률)이 의미가 있다. 힘은 기존 동료의 층별 곡선 × 등급 배율.
 * 그림: art-gen/blender/roster_ext.py (같은 id) → render_anim2 → assemble-anim2.
 */

export const NEW_ALLY_IDS = [
  "toto", "bobo", "kiki", "dodo", "momo", "pipi", "gugu", "nana", "rara", "sisi", "lulu", "haha",
  "brook", "flint", "moss", "reed", "cinder", "pebble", "willow", "gale", "coral", "ash", "birch",
  "storm", "frost", "blaze", "sage", "hawk", "tide", "anvil",
  "aurora", "titan", "solar", "tempest", "abyss", "phoenix",
  "celes", "gaia", "inferno", "leviathan",
] as const;
export type NewAllyId = (typeof NEW_ALLY_IDS)[number];

export type Tier = "N" | "R" | "SR" | "SSR" | "UR" | "LR";
type Role = "melee" | "ranged" | "tank" | "healer";
type Element = "fire" | "water" | "earth" | "wind";
type Fx = "slash" | "arrow" | "bolt" | "quake" | "halo";

export type NewAllyDef = {
  id: NewAllyId; name: string; tier: Tier; role: Role; element: Element; stage: number; hue: number;
  attackType: string; attackInterval: number; feature: string;
  move: string; desc: string; fx?: Fx;
};

export const NEW_ALLIES: readonly NewAllyDef[] = [
  // ── N 일반 ──
  { id: "toto", name: "견습 토토", tier: "N", role: "melee", element: "wind", stage: 1, hue: 90, attackType: "단검 찌르기", attackInterval: 0.75, feature: "가벼운 단검 찌르기", move: "기습 찌르기", desc: "틈을 노린 한 번 찌르기" },
  { id: "kiki", name: "새총 키키", tier: "N", role: "ranged", element: "wind", stage: 2, hue: 205, attackType: "새총 사격", attackInterval: 1.0, feature: "멀리서 돌멩이 사격", move: "연발 새총", desc: "돌멩이 두 개를 한꺼번에" },
  { id: "momo", name: "약초꾼 모모", tier: "N", role: "healer", element: "earth", stage: 3, hue: 100, attackType: "약초 지팡이", attackInterval: 1.3, feature: "약초로 파티 기술을 조금 서두른다", move: "약초 바람", desc: "풀내음이 파티를 깨운다" },
  { id: "bobo", name: "나무꾼 보보", tier: "N", role: "melee", element: "earth", stage: 4, hue: 25, attackType: "도끼 찍기", attackInterval: 1.2, feature: "묵직한 도끼 찍기", move: "통나무 쪼개기", desc: "힘껏 내려찍는 도끼" },
  { id: "dodo", name: "견습 마법사 도도", tier: "N", role: "ranged", element: "water", stage: 6, hue: 225, attackType: "물방울 마법", attackInterval: 1.25, feature: "물방울 마법탄", move: "물방울 폭죽", desc: "물방울이 톡톡 터진다", fx: "bolt" },
  { id: "pipi", name: "북치기 피피", tier: "N", role: "ranged", element: "fire", stage: 7, hue: 30, attackType: "음파", attackInterval: 1.1, feature: "북소리 음파", move: "신나는 북장단", desc: "북소리가 적을 흔든다", fx: "bolt" },
  { id: "gugu", name: "삽질꾼 구구", tier: "N", role: "melee", element: "earth", stage: 8, hue: 40, attackType: "삽 휘두르기", attackInterval: 1.1, feature: "흙을 퍼 던지는 삽", move: "흙더미 던지기", desc: "삽 가득 흙을 퍼부어" },
  { id: "nana", name: "물길잡이 나나", tier: "N", role: "melee", element: "water", stage: 11, hue: 195, attackType: "작살 찌르기", attackInterval: 0.95, feature: "작살로 물길을 가른다", move: "물살 찌르기", desc: "물살을 타고 세 번 찌르기" },
  { id: "rara", name: "파수꾼 라라", tier: "N", role: "tank", element: "earth", stage: 12, hue: 210, attackType: "방패 밀치기", attackInterval: 1.45, feature: "방패로 버틴다", move: "방패 밀치기", desc: "방패로 대장을 밀어낸다" },
  { id: "sisi", name: "불씨 시시", tier: "N", role: "ranged", element: "fire", stage: 16, hue: 15, attackType: "불씨 마법", attackInterval: 1.2, feature: "작은 불씨 마법", move: "불씨 튀기기", desc: "불씨가 사방으로 튄다", fx: "bolt" },
  { id: "lulu", name: "숲궁수 루루", tier: "N", role: "ranged", element: "wind", stage: 17, hue: 120, attackType: "나무 화살", attackInterval: 1.05, feature: "숲속 화살", move: "덤불 저격", desc: "덤불 뒤에서 쏘는 한 발" },
  { id: "haha", name: "수습 기사 하하", tier: "N", role: "tank", element: "water", stage: 24, hue: 215, attackType: "검 · 방패", attackInterval: 1.4, feature: "열심히 막고 벤다", move: "용기의 일격", desc: "떨리는 손으로 힘껏 베기" },
  // ── R 희귀 ──
  { id: "reed", name: "갈대궁수 리드", tier: "R", role: "ranged", element: "wind", stage: 4, hue: 160, attackType: "갈대 화살", attackInterval: 1.0, feature: "갈대처럼 가벼운 연사", move: "갈대 연사", desc: "세 발을 잇달아" },
  { id: "brook", name: "시냇물 브룩", tier: "R", role: "healer", element: "water", stage: 5, hue: 200, attackType: "물결 지팡이", attackInterval: 1.3, feature: "시냇물로 기술을 서두른다", move: "시냇물 축복", desc: "맑은 물이 기술을 다시 채운다" },
  { id: "flint", name: "부싯돌 플린트", tier: "R", role: "melee", element: "fire", stage: 7, hue: 10, attackType: "불똥 도끼", attackInterval: 1.0, feature: "불똥 튀는 도끼", move: "불똥 회전베기", desc: "도끼가 불똥을 뿌리며 돈다" },
  { id: "moss", name: "이끼방패 모스", tier: "R", role: "tank", element: "earth", stage: 9, hue: 95, attackType: "방패 강타", attackInterval: 1.5, feature: "이끼 방패로 받아친다", move: "이끼 반격", desc: "막고 되받아치기" },
  { id: "cinder", name: "잿불 신더", tier: "R", role: "ranged", element: "fire", stage: 11, hue: 18, attackType: "잿불 마법", attackInterval: 1.25, feature: "잿불 폭발", move: "잿불 폭발", desc: "재 속 불씨가 한꺼번에 터진다", fx: "bolt" },
  { id: "pebble", name: "조약돌 페블", tier: "R", role: "melee", element: "earth", stage: 13, hue: 35, attackType: "돌창 찌르기", attackInterval: 0.95, feature: "돌창 찌르기", move: "바위창 돌진", desc: "창을 앞세운 돌진" },
  { id: "willow", name: "버들 윌로", tier: "R", role: "healer", element: "wind", stage: 17, hue: 110, attackType: "버들 지팡이", attackInterval: 1.3, feature: "버들잎이 파티를 감싼다", move: "버들 춤", desc: "버들잎이 휘날리며 파티 기술을 서두른다" },
  { id: "gale", name: "돌풍 게일", tier: "R", role: "ranged", element: "wind", stage: 19, hue: 170, attackType: "돌풍 화살", attackInterval: 0.9, feature: "돌풍을 탄 화살", move: "돌풍 화살비", desc: "바람에 실린 화살비" },
  { id: "coral", name: "산호 코랄", tier: "R", role: "melee", element: "water", stage: 25, hue: 0, attackType: "산호 작살", attackInterval: 0.95, feature: "산호 작살", move: "산호 소용돌이", desc: "작살을 돌려 소용돌이를" },
  { id: "ash", name: "재투성 애시", tier: "R", role: "ranged", element: "fire", stage: 27, hue: 20, attackType: "불꽃 연주", attackInterval: 1.1, feature: "불꽃 기타 연주", move: "불꽃 독주", desc: "기타 줄에서 불꽃이 튄다", fx: "bolt" },
  { id: "birch", name: "자작 버치", tier: "R", role: "tank", element: "earth", stage: 30, hue: 45, attackType: "도끼 · 방패", attackInterval: 1.45, feature: "흰 나무 방패", move: "자작 방벽", desc: "방패로 막고 도끼로 찍는다" },
  // ── SR 영웅 ──
  { id: "storm", name: "폭풍창 스톰", tier: "SR", role: "melee", element: "wind", stage: 10, hue: 225, attackType: "폭풍 창", attackInterval: 1.0, feature: "창끝에 번개", move: "폭풍 돌진창", desc: "번개를 두른 창 돌진" },
  { id: "frost", name: "서리검 프로스트", tier: "SR", role: "melee", element: "water", stage: 14, hue: 195, attackType: "서리 검", attackInterval: 0.85, feature: "서리 검기", move: "서리 일섬", desc: "얼어붙는 한 줄기 베기" },
  { id: "blaze", name: "화염도끼 블레이즈", tier: "SR", role: "melee", element: "fire", stage: 18, hue: 8, attackType: "화염 도끼", attackInterval: 1.2, feature: "화염 도끼 내려찍기", move: "화염 대폭발", desc: "도끼가 땅을 치면 불기둥" },
  { id: "sage", name: "숲현자 세이지", tier: "SR", role: "healer", element: "earth", stage: 21, hue: 100, attackType: "숲의 지팡이", attackInterval: 1.3, feature: "숲의 기운으로 기술을 서두른다", move: "숲의 가호", desc: "나뭇잎 고리가 파티를 감싼다" },
  { id: "hawk", name: "매눈 호크", tier: "SR", role: "ranged", element: "wind", stage: 26, hue: 30, attackType: "매 화살", attackInterval: 0.95, feature: "매처럼 노리는 저격", move: "매의 눈 저격", desc: "약점을 꿰뚫는 한 발" },
  { id: "tide", name: "해일 타이드", tier: "SR", role: "ranged", element: "water", stage: 29, hue: 210, attackType: "해일 마법", attackInterval: 1.3, feature: "해일 마법", move: "해일 소환", desc: "큰 물결이 전장을 덮친다", fx: "bolt" },
  { id: "anvil", name: "모루 앤빌", tier: "SR", role: "tank", element: "fire", stage: 35, hue: 20, attackType: "망치 · 방패", attackInterval: 1.5, feature: "모루처럼 단단한 방어", move: "모루 내려치기", desc: "땅이 울리는 내려치기" },
  // ── UR 신화 ──
  { id: "aurora", name: "오로라 여사제", tier: "UR", role: "healer", element: "water", stage: 15, hue: 165, attackType: "오로라 지팡이", attackInterval: 1.25, feature: "오로라 빛이 기술을 크게 서두른다", move: "오로라 장막", desc: "하늘빛 장막이 파티를 감싼다" },
  { id: "titan", name: "대지거인 타이탄", tier: "UR", role: "tank", element: "earth", stage: 22, hue: 45, attackType: "거인 도끼", attackInterval: 1.55, feature: "땅을 가르는 거인", move: "대지 분쇄", desc: "땅을 갈라 대장을 멈춘다" },
  { id: "solar", name: "태양검 솔라", tier: "UR", role: "melee", element: "fire", stage: 28, hue: 45, attackType: "태양 검", attackInterval: 0.9, feature: "태양빛 검기", move: "태양 일섬", desc: "눈부신 빛의 한 칼" },
  { id: "tempest", name: "폭풍왕 템페스트", tier: "UR", role: "ranged", element: "wind", stage: 33, hue: 195, attackType: "폭풍 활", attackInterval: 0.9, feature: "폭풍을 부르는 활", move: "폭풍 화살비", desc: "하늘을 덮는 번개 화살" },
  { id: "abyss", name: "심연술사 어비스", tier: "UR", role: "ranged", element: "water", stage: 40, hue: 270, attackType: "심연 마법", attackInterval: 1.3, feature: "심연의 소용돌이", move: "심연 소용돌이", desc: "보랏빛 소용돌이가 삼킨다", fx: "bolt" },
  { id: "phoenix", name: "불새기사 피닉스", tier: "UR", role: "melee", element: "fire", stage: 45, hue: 12, attackType: "불새 창", attackInterval: 1.0, feature: "불새의 날개 창", move: "불새 강림", desc: "불새가 창끝에 내려앉는다" },
  // ── LR 초월 ──
  { id: "celes", name: "천공여왕 셀레스", tier: "LR", role: "ranged", element: "wind", stage: 23, hue: 260, attackType: "천공 마법", attackInterval: 1.2, feature: "별빛 낙하", move: "별무리 낙하", desc: "하늘에서 별이 쏟아진다", fx: "bolt" },
  { id: "gaia", name: "대지모 가이아", tier: "LR", role: "healer", element: "earth", stage: 32, hue: 110, attackType: "생명의 지팡이", attackInterval: 1.2, feature: "생명의 숲이 기술을 다시 채운다", move: "생명의 숲", desc: "숲이 피어나 파티를 감싼다" },
  { id: "inferno", name: "지옥불 인페르노", tier: "LR", role: "melee", element: "fire", stage: 44, hue: 0, attackType: "지옥불 도끼", attackInterval: 1.05, feature: "모든 것을 태우는 도끼", move: "지옥불 폭풍", desc: "불길이 소용돌이친다" },
  { id: "leviathan", name: "해룡왕 리바이어선", tier: "LR", role: "melee", element: "water", stage: 52, hue: 190, attackType: "해룡 삼지창", attackInterval: 1.0, feature: "바다를 가르는 삼지창", move: "해룡 강림", desc: "거대한 해룡이 덮친다" },
];

/** 등급 배율 — 같은 층 기준 힘 · 값 (기존 동료 곡선이 SR 쯤) */
export const TIER_POWER: Record<Tier, number> = { N: 0.7, R: 0.85, SR: 1, SSR: 1.15, UR: 1.35, LR: 1.6 };

/** 기존 동료의 (층, DPS) · (층, 값) 대표점 — 층 사이는 로그 보간, 48층 넘으면 층당 ×1.3 / ×1.25 */
const DPS_PTS: [number, number][] = [[1, 1.2], [3, 6], [6, 28], [10, 120], [16, 620], [24, 3200], [30, 11500], [34, 28000], [48, 210000]];
const COST_PTS: [number, number][] = [[1, 50], [3, 230], [6, 950], [10, 3600], [16, 15500], [24, 65000], [30, 210000], [34, 470000], [48, 2800000]];
function curve(pts: [number, number][], s: number, beyond: number): number {
  if (s >= pts[pts.length - 1][0]) return pts[pts.length - 1][1] * beyond ** (s - pts[pts.length - 1][0]);
  for (let i = 1; i < pts.length; i += 1) {
    const [s0, v0] = pts[i - 1], [s1, v1] = pts[i];
    if (s <= s1) return Math.exp(Math.log(v0) + ((s - s0) / (s1 - s0)) * (Math.log(v1) - Math.log(v0)));
  }
  return pts[0][1];
}
export function newAllyBaseDps(d: Pick<NewAllyDef, "stage" | "tier">): number {
  // 값(정수)을 먼저 정하고 힘 = 값 × 효율 — 골드 효율이 열리는 층의 효율과 정확히 같다(낮은 층 동료는 값이 100대라 반올림이 효율을 1% 넘게 흔들었다)
  return newAllyBaseCost(d) * effAt(d.stage);
}
/** 기존 동료의 골드 효율(baseDps ÷ baseCost) — 층이 오를수록 늘어난다(verify-systems "골드 효율 단조"). 새 동료 값은 이 효율을 층으로 보간해 정한다 */
const EFF_PTS: [number, number][] = [[1, 0.024], [3, 6 / 230], [6, 28 / 950], [8, 55 / 1750], [10, 120 / 3600], [12, 95 / 2650], [16, 620 / 15500], [22, 1650 / 35000], [24, 3200 / 65000], [30, 75000 / 1150000], [48, 210000 / 2800000]];
function effAt(s: number): number {
  const last = EFF_PTS[EFF_PTS.length - 1];
  if (s >= last[0]) return last[1] + (s - last[0]) * 0.0007;
  for (let i = 1; i < EFF_PTS.length; i += 1) {
    const [s0, v0] = EFF_PTS[i - 1], [s1, v1] = EFF_PTS[i];
    if (s <= s1) return v0 + ((s - s0) / (s1 - s0)) * (v1 - v0);
  }
  return EFF_PTS[0][1];
}
export function newAllyBaseCost(d: Pick<NewAllyDef, "stage" | "tier">): number {
  // 힘은 두 층 아래 곡선 (2026-10-27 난이도 감사: 새 40명이 층마다 두세 명씩 끼어 1~29층 원정대가 예전보다 1.6~2.0배 셌다)
  const dps = curve(DPS_PTS, Math.max(1, d.stage - 2), 1.3) * TIER_POWER[d.tier];
  return Math.max(1, Math.round(dps / effAt(d.stage)));
}
/** 2026-10-27 조정 전 값 — 열리는 층 곡선 그대로의 힘 ÷ 효율(내림). 이미 올린 레벨을 새 값으로 다시 계산할 때만 쓴다(model.relevelAlly) */
export function preRebalanceBaseCost(d: Pick<NewAllyDef, "stage" | "tier">): number {
  const v = curve(DPS_PTS, d.stage, 1.3) * TIER_POWER[d.tier];
  const dps = v < 10 ? Math.round(v * 10) / 10 : Math.round(v);
  return Math.max(1, Math.floor(dps / effAt(d.stage)));
}
/** 참고용 — 예전 값 곡선(층별) × 등급 */
export function newAllyCostCurve(d: Pick<NewAllyDef, "stage" | "tier">): number {
  return Math.round(curve(COST_PTS, d.stage, 1.25) * TIER_POWER[d.tier]);
}

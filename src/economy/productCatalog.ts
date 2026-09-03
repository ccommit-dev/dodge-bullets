export type ProductKind = "consumable" | "bundle" | "entitlement";

/** 진행도 트리거 패키지 (H) — 조건을 만족한 뒤에만 1회 노출·구매 */
export type PackageTrigger = "pioneer" | "wall" | "rebirth";

export type StoreProduct = {
  id: string;
  kind: ProductKind;
  name: string;
  description: string;
  displayPrice: string;
  badge?: string;
  contents: string[];
  visible: boolean;
  /** 있으면 트리거 조건을 만족할 때만 패키지 탭에 노출된다 */
  trigger?: PackageTrigger;
};

/** 트리거 조건 — 개척 2지역 이상 · 벽을 한 번이라도 만남 · 환생 1회 이상 */
export function packageTriggered(trigger: PackageTrigger, progress: { pioneeredArea: number; wallAreas: string[]; rebirthCount: number }): boolean {
  if (trigger === "pioneer") return progress.pioneeredArea >= 2;
  if (trigger === "wall") return progress.wallAreas.length > 0;
  return progress.rebirthCount >= 1;
}

/** 첫 구매 2배 대상 (H) — 보석팩 3종, 팩마다 1회 */
export const FIRST_DOUBLE_IDS = ["gems-80", "gems-450", "gems-1200"] as const;

export const STORE_PRODUCTS: StoreProduct[] = [
  { id: "gems-80", kind: "consumable", name: "붉은 보석 80", description: "성장 선택권과 외형 구매에 사용", displayPrice: "₩1,500", contents: ["붉은 보석 ×80"], visible: true },
  { id: "gems-450", kind: "consumable", name: "붉은 보석 450", description: "보너스 50개 포함", displayPrice: "₩7,500", badge: "POPULAR", contents: ["붉은 보석 ×450"], visible: true },
  { id: "gems-1200", kind: "consumable", name: "붉은 보석 1,200", description: "보너스 200개 포함", displayPrice: "₩15,000", contents: ["붉은 보석 ×1,200"], visible: true },
  { id: "adventurer-starter", kind: "bundle", name: "초급 모험가 세트", description: "초반 성장 시간을 줄이는 입문 패키지", displayPrice: "₩3,900", badge: "1회", contents: ["보석 ×80", "강화석 ×10", "정찰 견갑", "골드 ×5,000"], visible: true },
  { id: "adventurer-mid", kind: "bundle", name: "중급 모험가 세트", description: "스킬과 견갑 성장을 위한 패키지", displayPrice: "₩12,000", contents: ["보석 ×250", "스킬 코어 ×5", "그림자 견갑 선택권", "골드 ×50,000"], visible: true },
  { id: "adventurer-advanced", kind: "bundle", name: "고급 모험가 세트", description: "후반 장비와 스킬 성장을 위한 체험 패키지", displayPrice: "₩29,000", contents: ["보석 ×700", "스킬 코어 ×15", "용린 견갑", "강화석 ×30"], visible: true },
  // L 광고 제거 — 보상형 자리 3곳(정산 2배·가속 4h·보스 +10초)을 광고 없이 자동 적용하는 상품
  { id: "remove-ads", kind: "entitlement", name: "광고 제거", description: "보상형 광고 3곳을 광고 없이 자동 적용 (정산 2배 · 가속 4h · 보스 +10초)", displayPrice: "₩3,900", badge: "영구", contents: ["방치 정산 2배 1일 3회", "방치 가속 4h 1일 1회", "보스 실패 후 +10초 1회"], visible: true },
  // ── LIVEOPS §3.3 — 실결제(₩) 상품. Play Billing 연동 전까지 not-configured 경로 ──
  { id: "char-obsidian", kind: "entitlement", name: "캐릭터: 흑요석 검사", description: "전용 외형 + 방치 효율 +1%p", displayPrice: "₩5,900", contents: ["플레이어블 캐릭터", "패시브: 방치 효율 +1%p"], visible: true },
  { id: "char-dawn", kind: "entitlement", name: "캐릭터: 새벽의 무희", description: "전용 외형 + 방치 시간 +30분", displayPrice: "₩5,900", contents: ["플레이어블 캐릭터", "패시브: 방치 캡 +30분"], visible: true },
  // I 코스튬 2종 — 외형 전용 (패시브 없음)
  { id: "char-ember", kind: "entitlement", name: "코스튬: 붉은 잔영", description: "잔불빛으로 물든 모험가 — 외형 전용", displayPrice: "₩5,900", contents: ["코스튬"], visible: true },
  { id: "char-frost", kind: "entitlement", name: "코스튬: 서리 무희", description: "서릿발이 서린 푸른 모험가 — 외형 전용", displayPrice: "₩5,900", contents: ["코스튬"], visible: true },
  // 과금 점검: 20/일(600)은 ₩9.17/보석으로 1,200팩(₩12.50)을 무의미하게 만들었다 → 15/일(450, ₩12.2/보석) + 편의 효과
  { id: "patron-30d", kind: "bundle", name: "원정 후원 계약 30일", description: "매일 보석 15 · 방치 캡 +2h · 균열 +1회", displayPrice: "₩5,500", badge: "월정액", contents: ["일일 보석 15", "방치 캡 +2h", "차원 균열 +1회/일"], visible: true },
  // ── H 진행도 트리거 패키지 — 감정 고점(개척·벽·환생)에서 1회 ──
  { id: "pack-pioneer", kind: "bundle", name: "개척 축하 세트", description: "새 지역을 열었을 때 1회", displayPrice: "₩3,900", badge: "1회", contents: ["보석 ×120", "강화석 ×40", "출전 동료 조각 ×20"], visible: true, trigger: "pioneer" },
  { id: "pack-wall", kind: "bundle", name: "벽 돌파 세트", description: "DPS 벽을 만났을 때 1회 — 조각과 가속으로 넘는다", displayPrice: "₩5,900", badge: "1회", contents: ["출전 동료 조각 ×30", "방치 가속 24h", "보석 ×100"], visible: true, trigger: "wall" },
  { id: "pack-rebirth", kind: "bundle", name: "환생 세트", description: "첫 환생 후 1회 — 재시작을 빠르게", displayPrice: "₩12,000", badge: "1회", contents: ["보석 ×400", "스킬 코어 ×10", "출전 동료 조각 ×40"], visible: true, trigger: "rebirth" },
  // G 시즌 패스 유료 트랙 — 이벤트 센터 시즌 탭에서 판매 (패키지 탭에는 숨김)
  { id: "season-pass", kind: "entitlement", name: "시즌 패스", description: "4주 시즌 유료 트랙 — 보석 600 · 조각 선택권 3 · 시즌 스킨 · 무기 이펙트", displayPrice: "₩7,900", badge: "시즌", contents: ["유료 트랙 30단"], visible: false },
];

/** 원정 후원 계약(월정액) 효과 — 실결제 연동 시 patronUntil을 30일 뒤로 세팅한다 */
export const PATRON = {
  days: 30,
  dailyGems: 15,
  capHours: 2,
  riftBonus: 1,
} as const;

/** 플레이어블 캐릭터 패시브 — 카탈로그 설명과 정확히 일치해야 한다 (허위 표시 방지) */
export const CHARACTER_PASSIVE = {
  /** 흑요석 검사: 방치 효율 +1%p (캡 밖 가산) */
  obsidianIdleRate: 0.01,
  /** 새벽의 무희: 방치 캡 +30분 (캡 밖 가산) */
  dawnCapHours: 0.5,
} as const;

/**
 * 보석 소비형 상품 (LIVEOPS §3.3) — 이미 결제로 얻은 하드 화폐를 쓰는 것이므로
 * 클라이언트 지급이 허용된다 (₩ 상품과 달리 어댑터 검증 불필요).
 */
export type GemProduct = {
  id: string;
  name: string;
  gemCost: number;
  description: string;
};

export const GEM_PRODUCTS: GemProduct[] = [
  { id: "shard-pack", name: "성급 조각 선택팩", gemCost: 120, description: "원하는 동료의 조각 ×10 · 주당 동료별 3회" },
  { id: "idle-booster", name: "방치 가속권 24h", gemCost: 80, description: "24시간 동안 방치 산출 2배 (중첩 불가)" },
];

/** 조각팩 주간 구매 제한 — 과금 상한 설계 (동료당/주) */
export const SHARD_PACK_WEEKLY_LIMIT = 3;
export const SHARD_PACK_AMOUNT = 10;

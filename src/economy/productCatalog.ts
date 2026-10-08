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

/**
 * ₩ 카탈로그 (2026-10-08 간결화, 브런치 "모바일 게임 BM/과금 기획 가이드" 송사리 모델: 하루 1천원 · 주말 5천원 · 월 패스 + 광고)
 *   매일·주말   오늘의 보급 ₩1,000(1일 1회) · 주말 보급 ₩5,000(토·일, 주 1회)
 *   보석        80 / 450 / 1,200 — 팩마다 첫 구매 2배
 *   패스·영구   후원 계약 30일 · 광고 제거 · 성문 원정 기금
 *   1회 한정    입문 세트 · 벽 돌파 · 환생 (순간 제안)
 *   외형        캐릭터 2 · 코스튬 2 — 성능 차이는 거의 없다 (한정 아이템은 외형만, 가이드 5.4)
 * 뺀 것: 중급·고급 모험가 세트(보석팩과 겹침) · 개척 축하 세트(오늘의 보급과 겹침) · 성문 수비 보급(보석+인장 조합이라 가치가 안 보였다)
 */
export const STORE_PRODUCTS: StoreProduct[] = [
  { id: "gems-80", kind: "consumable", name: "붉은 보석 80", description: "성장 선택권과 외형 구매에 사용", displayPrice: "₩1,500", contents: ["붉은 보석 ×80"], visible: true },
  { id: "gems-450", kind: "consumable", name: "붉은 보석 450", description: "보너스 50개 포함", displayPrice: "₩7,500", badge: "POPULAR", contents: ["붉은 보석 ×450"], visible: true },
  { id: "gems-1200", kind: "consumable", name: "붉은 보석 1,200", description: "보너스 200개 포함", displayPrice: "₩15,000", contents: ["붉은 보석 ×1,200"], visible: true },
  // ── 송사리 모델 (2026-10-08): 하루 ₩1,000 · 주말 ₩5,000 — 커피 한 잔 값의 습관 결제. 한도는 dealState 가 센다 ──
  { id: "daily-deal", kind: "bundle", name: "오늘의 보급", description: "하루 1회 · 커피 한 잔 값", displayPrice: "₩1,000", badge: "매일", contents: ["붉은 보석 ×40", "강화석 ×15", "골드 ×3,000"], visible: true },
  { id: "weekend-pack", kind: "bundle", name: "주말 보급 상자", description: "토·일 한정 · 주 1회", displayPrice: "₩5,000", badge: "주말", contents: ["붉은 보석 ×300", "강화석 ×60", "방치 가속 24h"], visible: true },
  { id: "adventurer-starter", kind: "bundle", name: "초급 모험가 세트", description: "초반 성장 시간을 줄이는 입문 패키지", displayPrice: "₩3,900", badge: "1회", contents: ["보석 ×80", "강화석 ×10", "정찰 견갑", "골드 ×5,000"], visible: true },
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
  // ── 순간 제안 패키지 (벽·환생) — 감정 고점에서 1회. 개척 축하는 뺐다 (오늘의 보급과 겹침, 2026-10-08) ──
  { id: "pack-wall", kind: "bundle", name: "벽 돌파 세트", description: "DPS 벽을 만났을 때 1회 — 조각과 가속으로 넘는다", displayPrice: "₩5,900", badge: "1회", contents: ["출전 동료 조각 ×30", "방치 가속 24h", "보석 ×100"], visible: true, trigger: "wall" },
  { id: "pack-rebirth", kind: "bundle", name: "환생 세트", description: "첫 환생 후 1회 — 재시작을 빠르게", displayPrice: "₩12,000", badge: "1회", contents: ["보석 ×400", "스킬 코어 ×10", "출전 동료 조각 ×40"], visible: true, trigger: "rebirth" },
  // 성문 원정 기금 (2026-10-02) — 한 번 사면 성문을 깰 때마다 보석. 수비 보급(소모성)은 BM 간결화로 뺐다 (2026-10-08)
  { id: "gate-fund", kind: "entitlement", name: "성문 원정 기금", description: "한 번 사면 성문 방어를 깰 때마다 보석 — 이미 깬 단계는 바로 받는다", displayPrice: "₩9,900", badge: "영구", contents: ["스테이지 1~4 돌파 보석 100 · 150 · 250 · 400", "원정 별 6개 · 12개 보석 300 · 500", "모두 달성 시 보석 ×1,700 (달성한 단계만큼 받는다)"], visible: true },
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

/** 패키지 탭 묶음 — 화면 순서. 카탈로그에 없는 id 는 무시된다 (시즌 패스는 이벤트 센터에서 판다) */
export const PAID_GROUPS: ReadonlyArray<{ id: string; label: string; note: string; ids: readonly string[] }> = [
  { id: "daily", label: "매일·주말", note: "커피 한 잔 값 · 하루 1회 · 주말 1회", ids: ["daily-deal", "weekend-pack"] },
  { id: "gems", label: "붉은 보석", note: "팩마다 첫 구매 2배", ids: ["gems-80", "gems-450", "gems-1200"] },
  { id: "pass", label: "패스·영구", note: "한 번 사면 계속", ids: ["patron-30d", "remove-ads", "gate-fund"] },
  { id: "once", label: "1회 한정", note: "지금 이 순간에만", ids: ["adventurer-starter", "pack-wall", "pack-rebirth"] },
  { id: "look", label: "캐릭터·코스튬", note: "외형 — 성능 차이 거의 없음", ids: ["char-obsidian", "char-dawn", "char-ember", "char-frost"] },
];

/** 한도 상품 — 오늘의 보급은 하루 1회, 주말 보급은 토·일에 주 1회. 기록 키는 deal:<id>:<날짜|주> (claimedRewards) */
export const DEAL_IDS = ["daily-deal", "weekend-pack"] as const;
export type DealState = "available" | "bought" | "weekday";

function localDayKey(now: number): string { return new Date(now).toLocaleDateString("sv-SE"); }
/** 월요일 시작 주 키 — 그 주 월요일의 날짜 */
function localWeekKey(now: number): string {
  const d = new Date(now);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return "w" + d.toLocaleDateString("sv-SE");
}
export function dealKey(productId: string, now: number): string | null {
  if (productId === "daily-deal") return `deal:daily-deal:${localDayKey(now)}`;
  if (productId === "weekend-pack") return `deal:weekend-pack:${localWeekKey(now)}`;
  return null;
}
/** null = 한도 상품이 아니다. 주말 보급은 토(6)·일(0)만 판다 */
export function dealState(progress: { claimedRewards: string[] }, productId: string, now: number = Date.now()): DealState | null {
  const key = dealKey(productId, now);
  if (!key) return null;
  if (progress.claimedRewards.includes(key)) return "bought";
  if (productId === "weekend-pack") { const day = new Date(now).getDay(); if (day !== 0 && day !== 6) return "weekday"; }
  return "available";
}

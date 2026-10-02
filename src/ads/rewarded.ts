/**
 * 보상형 광고 (계획안 L) — 자리 3곳: 방치 정산 2배(1일 3회) · 방치 가속 4h(1일 1회) · 보스 실패 후 +10초(보스당 1회).
 *
 * - 플러그인은 런타임에 window.Capacitor.Plugins.AdMob(@capacitor-community/admob)을 찾는다. 패키지가 없어도 컴파일된다.
 * - 앱인토스 웹뷰·웹에는 SDK가 없으므로 adsConfigured()가 false → 자리 자체를 숨긴다 (빈 버튼 금지).
 * - 광고 제거(remove-ads) 구매 = adFree: 같은 보상을 광고 없이 자동 적용한다.
 * - 개발 빌드에서는 localStorage `dodgebullets:qa-ads`=1 로 스텁을 켠다 (e2e).
 * - 광고 SDK 도입 시 광고 ID 수집이 추가되므로 개인정보 처리방침을 먼저 개정한다 (docs/ADS.md).
 */
import type { CharacterProgress } from "../progression/model";
import { isNativePlatform } from "../game/native";

export type AdPlacement = "idleDouble" | "booster4h" | "bossRetry" | "dodgeDouble" | "beatDouble";
/** 계획안 §35 — 성문 방어·비트 클리어 보상 ×2 자리 추가 (하루 3회). 강제 광고는 없다 */
export const AD_LIMITS: Record<AdPlacement, number> = { idleDouble: 3, booster4h: 1, bossRetry: 3, dodgeDouble: 3, beatDouble: 3 };
export const AD_UNIT_IDS: Record<AdPlacement, string> = {
  idleDouble: "ca-app-pub-XXXX/idle-double",
  booster4h: "ca-app-pub-XXXX/booster",
  bossRetry: "ca-app-pub-XXXX/boss-retry",
  dodgeDouble: "ca-app-pub-XXXX/dodge-double",
  beatDouble: "ca-app-pub-XXXX/beat-double",
};
export const BOSS_RETRY_BONUS_SEC = 10;
export const BOOSTER_AD_HOURS = 4;

type AdMobPlugin = {
  prepareRewardVideoAd(options: { adId: string }): Promise<unknown>;
  showRewardVideoAd(): Promise<{ type?: string; amount?: number } | void>;
};

/**
 * 토스 미니앱 보상형 광고 (2026-10-02) — @apps-in-toss/web-framework 의 GoogleAdMob (load → show, userEarnedReward 로 보상).
 * 광고 그룹 ID 는 앱인토스 콘솔에서 발급받아 VITE_TOSS_AD_GROUP_ID 로 넣는다. 비어 있으면 웹·안드로이드와 똑같이 자리를 숨긴다.
 * 부팅 때 primeRewardedAds() 가 모듈을 미리 불러 isSupported 를 확인해 둔다 — adsConfigured() 는 동기 함수라 거기서 SDK 를 기다릴 수 없다.
 */
const TOSS_AD_GROUP_ID = import.meta.env.VITE_TOSS_AD_GROUP_ID?.trim() ?? "";
type TossAdEvent = { type: string };
type TossAdCall = ((a: { options?: { adGroupId: string }; onEvent: (e: TossAdEvent) => void; onError: (e: unknown) => void }) => () => void) & { isSupported: () => boolean };
type TossAdMob = { loadAppsInTossAdMob: TossAdCall; showAppsInTossAdMob: TossAdCall };
let tossAds: { admob: TossAdMob } | null = null;
export async function primeRewardedAds(env: "toss" | "android" | "web"): Promise<void> {
  if (env !== "toss" || !TOSS_AD_GROUP_ID) return;
  try {
    const mod = (await import("@apps-in-toss/web-framework")) as unknown as { GoogleAdMob?: TossAdMob };
    const g = mod.GoogleAdMob;
    if (g?.loadAppsInTossAdMob?.isSupported?.() === true && g.showAppsInTossAdMob?.isSupported?.() === true) tossAds = { admob: g };
  } catch {
    tossAds = null;
  }
}
function showTossRewarded(admob: TossAdMob): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let earned = false;
    let stopLoad: (() => void) | undefined;
    let stopShow: (() => void) | undefined;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try { stopLoad?.(); stopShow?.(); } catch { /* ignore */ }
      resolve(ok);
    };
    // 광고가 안 불러와지면 버튼이 영원히 눌린 채가 되지 않게
    const timer = window.setTimeout(() => done(false), 15_000);
    try {
      stopLoad = admob.loadAppsInTossAdMob({
        options: { adGroupId: TOSS_AD_GROUP_ID },
        onEvent: (e) => {
          if (e.type !== "loaded" || stopShow) return;
          window.clearTimeout(timer);
          stopShow = admob.showAppsInTossAdMob({
            options: { adGroupId: TOSS_AD_GROUP_ID },
            onEvent: (s) => {
              if (s.type === "userEarnedReward") earned = true;
              else if (s.type === "dismissed") done(earned);
              else if (s.type === "failedToShow") done(false);
            },
            onError: () => done(false),
          });
        },
        onError: () => done(false),
      });
    } catch {
      done(false);
    }
  });
}

function adMob(): AdMobPlugin | null {
  try {
    const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
    const plugin = cap?.Plugins?.AdMob as AdMobPlugin | undefined;
    return plugin && typeof plugin.showRewardVideoAd === "function" ? plugin : null;
  } catch {
    return null;
  }
}

function qaStub(): boolean {
  try {
    return import.meta.env.DEV && localStorage.getItem("dodgebullets:qa-ads") === "1";
  } catch {
    return false;
  }
}

/** 광고를 실제로 재생할 수 있는가 */
export function adsConfigured(): boolean {
  return qaStub() || tossAds !== null || (isNativePlatform() && adMob() !== null);
}

/** 오늘 기준 카운터 — 날짜가 바뀌면 0 */
export function adRewardsToday(progress: Pick<CharacterProgress, "adRewards">, today: string): CharacterProgress["adRewards"] {
  return progress.adRewards.date === today ? progress.adRewards : { date: today, idleDouble: 0, booster4h: 0, bossRetry: 0, dodgeDouble: 0, beatDouble: 0 };
}

/**
 * 자리 상태: "free" 광고 제거 보유 → 광고 없이 적용 · "ad" 광고 시청 가능 · "none" 숨김(미연동·한도 소진).
 */
export function rewardedAvailability(progress: Pick<CharacterProgress, "adRewards" | "adFree">, placement: AdPlacement, today: string, configured: boolean = adsConfigured()): "free" | "ad" | "none" {
  const used = adRewardsToday(progress, today)[placement];
  if (used >= AD_LIMITS[placement]) return "none";
  if (progress.adFree) return "free";
  return configured ? "ad" : "none";
}

/** 광고 재생 — 완주(보상 이벤트)면 true. 미연동이면 false */
export async function showRewarded(placement: AdPlacement): Promise<boolean> {
  if (qaStub()) {
    await new Promise((r) => setTimeout(r, 300));
    return true;
  }
  if (tossAds) return showTossRewarded(tossAds.admob);
  const plugin = adMob();
  if (!plugin) return false;
  try {
    await plugin.prepareRewardVideoAd({ adId: AD_UNIT_IDS[placement] });
    const result = await plugin.showRewardVideoAd();
    return !!result;
  } catch {
    return false;
  }
}

/** 카운터 1 증가 (순수) */
export function consumeAdReward(current: CharacterProgress, placement: AdPlacement, today: string): CharacterProgress {
  const t = adRewardsToday(current, today);
  return { ...current, adRewards: { ...t, [placement]: t[placement] + 1 } };
}

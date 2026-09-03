# 보상형 광고 (계획안 L)

자리 3곳. 미연동 환경(웹·앱인토스 웹뷰)에서는 자리 자체가 숨겨진다.

| 자리 | 보상 | 한도 | 코드 |
|---|---|---|---|
| 방치 정산 2배 | 이번 정산 골드 ×2 | 1일 3회 | `IdleReturnModal` `idle-claim-ad` → `claimIdle(_, 2)` |
| 방치 가속 4h | `idleBoostUntil` +4h | 1일 1회 | 상점 › 재화 `ad-product` |
| 보스 실패 후 +10초 | 다음 보스 도전 제한시간 +10초 | 1일 3회 | 전장 `ad-boss-retry` (실패 직후만) |

## 광고 제거 (₩3,900, remove-ads)

같은 3자리를 **광고 없이 자동 적용**한다 (`adFree`). 한도는 동일하다. 결제 지급은 `payments/store.ts applyPurchase`.

## 연동

1. `npm install @capacitor-community/admob && npx cap sync`
2. AdMob 콘솔에서 보상형 광고 단위 3개를 만들고 `src/ads/rewarded.ts AD_UNIT_IDS`를 교체한다.
3. `AndroidManifest.xml`에 `com.google.android.gms.ads.APPLICATION_ID` 메타데이터를 넣는다.
4. 플러그인이 주입되면 `adsConfigured()`가 true가 되어 자리가 나타난다.

## 개인정보 처리방침 (착수 전 필수)

광고 SDK는 광고 ID(GAID)를 수집한다. 현재 방침의 "수집 없음" 문구를 **광고 식별자 수집·광고 사업자 제공**으로 개정하고 스토어 데이터 안전 섹션도 갱신한다. 개정 전에는 플러그인을 설치하지 않는다.

## QA

개발 빌드에서 `localStorage["dodgebullets:qa-ads"] = "1"` 을 두면 300ms 스텁이 광고를 대신한다. `node scripts/verify-shop.mjs`의 L 항목이 이 경로로 검증한다.

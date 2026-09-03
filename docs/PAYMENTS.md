# 결제 연동 (Google Play Billing)

코드 쪽은 준비돼 있다. 아래 3단계만 하면 `₩` 상품이 실제로 팔린다.

## 코드 구조 (이미 구현)

| 파일 | 역할 |
|---|---|
| `src/payments/adapter.ts` | `PaymentAdapter` 인터페이스, not-configured 어댑터 |
| `src/payments/store.ts` | Google Play 어댑터(런타임에 `Capacitor.Plugins.NativePurchases` 탐지), `grantPurchase()` 지급, 영수증 검증 자리 |
| `src/economy/productCatalog.ts` | 상품 카탈로그(₩ 표시가·설명) + `PATRON`·`CHARACTER_PASSIVE` 효과 상수 |
| `src/TitansGame.tsx` `buyPaidProduct` | 버튼 → 어댑터 → 검증 → 지급 → 토스트. 미연동이면 안내 토스트만 |

지급 규칙은 `purchaseGrant()`에 있고 카탈로그의 `contents` 문구와 1:1이다. 같은 transactionId는 `claimedRewards`에 기록돼 두 번 지급되지 않는다. 후원 계약은 남은 기간 위에 30일이 이어 붙는다.

## 1. 플러그인 설치

```bash
npm install @capgo/native-purchases
npx cap sync
```

플러그인이 주입되면 `paymentsConfigured()`가 true가 되고 버튼이 결제로 동작한다. 패키지가 없어도 빌드는 깨지지 않는다(런타임 탐지).

## 2. Play Console 상품 등록

`src/payments/store.ts`의 `PLAY_PRODUCT_IDS`와 **같은 id**로 인앱 상품(일회성)을 만든다.

| 상품 id | 표시가 | 유형 |
|---|---|---|
| gems-80 / gems-450 / gems-1200 | ₩1,500 / ₩7,500 / ₩15,000 | 소모성 |
| adventurer-starter / mid / advanced | ₩3,900 / ₩12,000 / ₩29,000 | 소모성(1회 배지는 앱이 관리) |
| char-obsidian / char-dawn | ₩5,900 | 비소모성 |
| patron-30d | ₩5,500 | 소모성(30일 연장) — 정기결제로 바꾸려면 `productType: "subs"`로 변경 |

라이선스 테스트 계정을 등록하면 실제 과금 없이 구매 흐름을 검증할 수 있다.

## 3. 영수증 검증

현재 `verifyReceipt()`는 플러그인이 돌려준 transactionId를 신뢰한다(로컬). 서버 검증(Google Play Developer API `purchases.products.get`)을 붙일 때는 이 함수만 교체한다. 서버 검증을 도입하면 개인정보 처리방침의 "수집 없음" 문구를 재작성해야 한다(LIVEOPS §3.5).

## 확률형 고지

동료 소환은 확률형이므로 스토어 등록 시 확률형 아이템 고지 항목을 체크한다. 앱 내 "확률 정보" 화면(동료별 %·천장·보장)이 근거다.

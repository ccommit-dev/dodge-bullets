# 출시 체크리스트 (2026-10-02)

계정이 있어야 하는 일은 **[사람]**, 저장소가 이미 해 둔 일은 **[완료]**로 표시한다. 결제·광고 세부는 [PAYMENTS.md](PAYMENTS.md) · [ADS.md](ADS.md).

## 1. 빌드 종류

| 빌드 | 명령 | 테스트 우회 | 쓰는 곳 |
|---|---|---|---|
| 개발 서버 | `npm run dev` | 열림 (DEV) | 로컬 |
| QA 웹 | `GITHUB_PAGES=true VITE_QA_BUILD=true npx vite build --outDir docs/game --emptyOutDir` | 열림 | GitHub Pages 데모 |
| QA 앱 | CI 디버그 APK (`npm run native:sync:qa`) | 열림 | 기기 설치 테스트 |
| **출시 앱** | CI `release-aab` 잡 (`npm run native:sync`) | **없음** | 플레이 스토어 |
| **출시 토스** | `npm run build` (`ait build`) | **없음** | 앱인토스 |

- **[완료]** 출시 빌드에는 무료 지급·보석 무제한·7탭 테스트 모드·무료 상점이 번들에 남지 않는다. `node scripts/check-release-build.mjs` 가 매 푸시와 출시 잡에서 확인한다.
- QA 앱에서는 결제가 늘 **무료 테스트 구매**로 간다 — 실결제는 출시 앱을 내부 테스트 트랙으로 올려서만 시험된다.

## 2. 서명 · 버전

1. **[사람]** `bash scripts/make-upload-keystore.sh` — 홈 폴더에 업로드 키스토어를 만들고, GitHub Secrets 네 개(`KEYSTORE_BASE64` · `KEYSTORE_PASSWORD` · `KEY_ALIAS` · `KEY_PASSWORD`)에 넣을 값을 알려 준다. 키스토어와 비밀번호는 별도로 백업한다.
2. **[사람]** 플레이 콘솔 → 앱 무결성 → **플레이 앱 서명** 사용(업로드 키는 위 키스토어).
3. 출시마다 `npm version patch` (또는 minor) — versionCode 는 package.json 버전에서 계산된다(`major*10000 + minor*100 + patch`). 같은 versionCode 는 다시 올릴 수 없다.
4. Secrets 를 넣은 뒤 main 에 푸시하면 Actions → Android Build → `release-aab` 아티팩트에 서명된 AAB 가 생긴다.

## 3. 플레이 콘솔 — 앱 콘텐츠

**[사람]** 아래 답은 2026-10-02 코드 기준이다. 광고·크래시 리포팅을 붙이면 다시 고친다.

| 항목 | 답 |
|---|---|
| 개인정보처리방침 URL | `https://ccommit-dev.github.io/dodge-bullets/privacy.html` (docs/privacy.html) |
| 광고 포함 | **아니요** (안드로이드 AdMob 미설치. 붙이면 예로 바꾸고 방침 개정) |
| 앱 접근 권한 | 로그인 없음 — 모든 기능 접근 가능 |
| 타깃 연령 | 13세 이상 권장(확률형 아이템·인앱 결제 포함) |
| 데이터 보안 — 수집 | **구매 내역**(앱 기능: 상품 지급·복원) — 기기 안에만 저장, 서버 전송 없음, 제3자 공유 없음. 그 밖의 개인정보·기기 ID·위치·광고 ID 수집 없음 |
| 데이터 보안 — 암호화·삭제 | 전송 데이터 없음. 앱 삭제 시 기기 데이터 삭제(설정의 세이브 백업은 사용자가 직접 복사) |
| 콘텐츠 등급(IARC) | 판타지 폭력(경미) · 인앱 구매 · **확률형 아이템(동료 소환)** 체크 |
| 인앱 상품 | PAYMENTS.md 의 상품 표와 **같은 ID** 로 등록. 비소모성은 광고 제거 · 캐릭터 4종 · 성문 원정 기금 |
| 라이선스 테스터 | 테스트 계정 등록 → 실제 과금 없이 구매 흐름 확인 |

**확률형 아이템 표시** — 게임산업법(2024-03-22 시행)에 따라 확률 정보를 게임 안과 광고·홈페이지에 표시해야 한다. 게임 안에는 동료 소환 화면의 "확률 정보"(동료별 % · 천장 · 보장)와 성문 방어 레벨업 카드의 등급 확률이 있다. 스토어 설명에도 "확률형 아이템 포함 — 확률은 게임 내 확률 정보에서 확인"을 넣는다(store/listing.md 반영).

## 4. 앱인토스 (토스 미니앱)

1. **[사람]** 앱인토스 콘솔에 인앱결제 상품을 **같은 ID** 로 등록(소모성·비소모성 구분은 PAYMENTS.md).
2. **[사람]** 광고를 켤 때만: 광고 그룹 ID 발급 → `VITE_TOSS_AD_GROUP_ID=<ID> npm run build`.
3. **[사람]** 토스 샌드박스 앱에서 결제 → 앱 종료 → 재실행(대기 주문 복구) → 설정의 "구매 복원" 순으로 확인. 토스 앱 5.233.0 이상 필요.

## 5. 올리기 직전 (저장소에서)

```bash
node scripts/verify-all.mjs
```

```bash
node scripts/check-release-build.mjs
```

- 로그 마지막 줄이 `ALL SUITES PASS` 인지 확인한다.
- 결제 로직은 `node scripts/verify-payments.mjs` (가짜 토스·플레이) 가 지급 순서 · 복구 · 복원 · 회수를 확인한다 — verify-all 에 포함.

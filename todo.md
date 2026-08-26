# Android / iOS 포팅 TODO

Capacitor 포팅(`feat/capacitor-port` 브랜치)에서 **코드로 끝낼 수 있는 부분은 완료**했고,
아래는 계정·장비·서명 키 등 **사람이 직접 해야 하는 작업**의 전체 목록이다.

## 완료된 것 (참고)

- [x] `package.json` 스크립트 분리 — `build:web` / `native:sync` / `native:android` / `native:ios`
- [x] Capacitor 8 설치·초기화 (`com.ccommit.dodgelab` / "DODGE LAB" / webDir `dist`)
- [x] `android/`, `ios/` 네이티브 프로젝트 생성 + 웹 번들 sync 완료
- [x] 세로 고정 — AndroidManifest `screenOrientation="portrait"`, iOS Info.plist portrait만 허용
- [x] 부팅 흰 플래시 방지 — `backgroundColor: '#0b1220'`
- [x] Android 하드웨어 뒤로가기 — 콘텐츠 안이면 허브 복귀, 허브면 앱 최소화 ([native.ts](src/game/native.ts))
- [x] "게임 종료" 버튼 — Android는 `exitApp()`, iOS는 minimize(심사 가이드 대응), 웹은 기존 앱인토스 `closeView`
- [x] 앱인토스 SDK 가드 확인 — 전부 동적 import + try/catch라 네이티브에서 자동 무력화
- [x] Safe Area — `viewport-fit=cover` + CSS `env()` 폴백이 이미 있어 그대로 동작

---

## 1. Android 빌드 환경 (이 머신에 없음)

- [ ] **JDK 17** 설치 (Temurin 등) — `java -version` 확인
- [ ] **Android Studio** 설치 (SDK Platform 34+, Build-Tools 포함)
- [ ] 환경변수 `ANDROID_HOME` 설정 (`%LOCALAPPDATA%\Android\Sdk`)
- [ ] 첫 빌드 확인:
  ```bash
  npm run native:sync
  npx cap open android   # Android Studio에서 Run
  ```

## 2. Android 서명 · 배포

- [ ] 업로드 keystore 생성 (분실 시 복구 불가 — 안전한 곳에 백업):
  ```bash
  keytool -genkey -v -keystore dodgelab-upload.keystore -alias dodgelab -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] `android/app/build.gradle`에 signingConfig 연결 (또는 Android Studio → Generate Signed Bundle)
- [ ] **Play App Signing** 활성화 (신규 앱 필수)
- [ ] 릴리스 번들 생성: `cd android && gradlew bundleRelease` → `.aab`
- [ ] `versionCode` / `versionName` 관리 규칙 정하기 (`android/app/build.gradle`, 업로드마다 versionCode 증가 필수)

## 3. Google Play Console

- [ ] 개발자 계정 등록 ($25 일회성)
- [ ] 앱 생성 (패키지명 `com.ccommit.dodgelab` — **첫 업로드 후 변경 불가**)
- [ ] 스토어 등록정보: 이름·설명·스크린샷(휴대전화 최소 2장)·그래픽 이미지(1024×500)
- [ ] 콘텐츠 등급 설문 (게임 카테고리)
- [ ] **개인정보처리방침 URL** (필수 — 페이지 없으면 만들어야 함)
- [ ] 데이터 보안 섹션 작성 (현재 수집 데이터 없음 → "수집 안 함"으로 신고 가능. 단 광고 SDK 붙이면 재작성)
- [ ] 내부 테스트 트랙 → 프로덕션 순서로 출시

## 4. iOS 빌드 환경 (macOS 필수)

- [ ] **macOS + Xcode 15+** 확보 — Windows에서는 프로젝트 생성까지만 가능 (완료됨)
- [ ] Capacitor 8은 SPM 기반이라 CocoaPods 불필요 — macOS에서 `npx cap open ios`로 바로 열림
- [ ] **Apple Developer Program** 가입 ($99/년)
- [ ] Xcode Signing & Capabilities에서 Team 지정, Bundle ID `com.ccommit.dodgelab` 등록
- [ ] 실기기 테스트 → Archive → App Store Connect 업로드
- [ ] TestFlight 배포 → 심사 제출

## 5. 앱 아이콘 · 스플래시 (현재 Capacitor 기본 아이콘)

- [ ] 1024×1024 원본 아이콘 1장 준비 (`public/appsintoss-logo.png`는 해상도 확인 필요)
- [ ] `@capacitor/assets`로 일괄 생성:
  ```bash
  npm i -D @capacitor/assets
  # assets/icon.png(1024²), assets/splash.png(2732²) 배치 후
  npx capacitor-assets generate
  ```
- [ ] 스플래시 배경색 `#0b1220`으로 통일

## 6. 실기기 QA 체크리스트

- [ ] Safe Area — 노치/펀치홀 기기에서 HUD·하단 독 겹침 확인
- [ ] 상태바 — 다크 배경 위 아이콘 가독성 (필요시 `@capacitor/status-bar`로 스타일 지정)
- [ ] Android 뒤로가기 — 콘텐츠→허브→최소화 동작 검증 (코드는 구현됨)
- [ ] 세로 고정 — 회전 시 레이아웃 유지 (설정은 되어 있음)
- [ ] 백그라운드 진입 시 오디오 정지 — `visibilitychange` 처리가 이미 있으나 실기기 검증 필요
- [ ] 저사양 기기 프레임 — 캔버스 게임(화살 원정) 60fps 여부
- [ ] 터치 입력 지연 — 비트 수련 판정에 영향 없는지

## 7. 저장 데이터 내구성 (권장)

- [ ] 현재 저장은 WebView `localStorage` — **iOS는 저장공간 부족 시 OS가 WebView 스토리지를
      삭제할 수 있다.** `@capacitor/preferences`로 이관 검토:
  - `game/toss.ts`의 `storageGet`/`storageSet`이 유일한 저장 경로라 그 두 함수에
    Capacitor Preferences 분기만 추가하면 전체 이관 완료
- [ ] 이관 시 기존 localStorage → Preferences 1회 마이그레이션 코드 필요

## 8. 심사 리젝 대비

- [ ] Apple 4.2(최소 기능): 게임 4종 + 방치 시스템으로 콘텐츠는 충분하나,
      심사 노트에 게임 구성(사냥터·화살 원정·대장간·비트 수련) 명시 권장
- [ ] "그림자 대전"이 실제 PvP가 아님을 스토어 설명에서 오해 없게 표현
- [ ] 인앱결제: 현재 `productCatalog` 전부 `visible: false` + 결제 어댑터 미연동 상태 —
      **노출 전에는 스토어 IAP(StoreKit / Play Billing) 연동 필수** (외부 결제 링크 금지)

## 9. 운영 결정 필요

- [ ] 앱인토스(웹)와 네이티브 앱의 **저장 데이터가 분리**됨 — 계정 연동/이관을 제공할지 결정
- [ ] 광고 SDK(AdMob 등) 도입 여부 — 방치 2배 보상 지점 (IDLE_REDESIGN.md §9 참조)
- [ ] 네이티브 전용 빌드에서 앱인토스 SDK를 번들에서 제외할지 (현재는 가드만 하고 포함됨,
      gzip 기준 영향 미미하나 약관 검토 권장)

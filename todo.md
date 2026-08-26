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

## 1. Android 빌드 환경

- [x] **JDK 17** 설치 완료 — Temurin 17.0.20.1 (`C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot`)
- [x] **Android SDK** — Android Studio 대신 cmdline-tools로 설치 (SDK Platform 36 + Build-Tools)
  - 위치: `%LOCALAPPDATA%\Android\Sdk` · 이 경로가 `android/local.properties`(gitignored)에 기록됨
- [ ] **Android Studio (선택)** — 에뮬레이터·프로파일링이 필요할 때만. gradle 빌드는 이미 CLI로 가능
- [ ] 실기기 연결 후: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb install app-debug.apk`

## 2. Android 서명 · 배포

- [x] gradle 서명 배선 — `android/key.properties`가 있으면 release 서명이 자동 연결됨
  (`key.properties`·keystore는 gitignore로 커밋 차단)
- [ ] 업로드 keystore 생성 — **비밀번호는 직접 정해야 함** (분실 시 복구 불가, 안전한 곳에 백업):
  ```bash
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin\keytool" -genkey -v -keystore android\dodgelab-upload.keystore -alias dodgelab -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] `android/key.properties` 작성 (4줄):
  ```properties
  storeFile=../dodgelab-upload.keystore
  storePassword=<위에서 정한 비밀번호>
  keyAlias=dodgelab
  keyPassword=<위에서 정한 비밀번호>
  ```
- [ ] **Play App Signing** 활성화 (신규 앱 필수)
- [ ] 릴리스 번들 생성: `cd android && gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`
- [ ] `versionCode` / `versionName` 관리 규칙 정하기 (`android/app/build.gradle`, 업로드마다 versionCode 증가 필수)

## 3. Google Play Console

- [ ] 개발자 계정 등록 ($25 일회성)
- [ ] 앱 생성 (패키지명 `com.ccommit.dodgelab` — **첫 업로드 후 변경 불가**)
- [x] 등록 텍스트 초안 — [store/listing.md](store/listing.md) (앱 이름·짧은/전체 설명·태그)
- [x] 그래픽 이미지 1024×500 — [store/feature-graphic.png](store/feature-graphic.png)
- [ ] 스크린샷 (휴대전화 세로 최소 2장 — listing.md의 촬영 가이드 6장 참조)
- [ ] 콘텐츠 등급 설문 (게임 카테고리)
- [x] **개인정보처리방침 페이지** — [docs/privacy.html](docs/privacy.html) 작성 완료.
      main 머지 시 https://ccommit-dev.github.io/dodge-bullets/privacy.html 로 배포됨 → 이 URL을 콘솔에 입력
- [x] 데이터 보안 섹션 답변 초안 — listing.md에 표로 정리 (수집 없음)
- [ ] 내부 테스트 트랙 → 프로덕션 순서로 출시

## 4. iOS 빌드 환경 (macOS 필수)

- [ ] **macOS + Xcode 15+** 확보 — Windows에서는 프로젝트 생성까지만 가능 (완료됨)
- [ ] Capacitor 8은 SPM 기반이라 CocoaPods 불필요 — macOS에서 `npx cap open ios`로 바로 열림
- [ ] **Apple Developer Program** 가입 ($99/년)
- [ ] Xcode Signing & Capabilities에서 Team 지정, Bundle ID `com.ccommit.dodgelab` 등록
- [ ] 실기기 테스트 → Archive → App Store Connect 업로드
- [ ] TestFlight 배포 → 심사 제출

## 5. 앱 아이콘 · 스플래시 — ✅ 완료

- [x] 아이콘 디자인 — [assets/icon.svg](assets/icon.svg) (검 + 스쳐 가는 화살, 게임 팔레트)
- [x] 원본 파생 — `node scripts/make-app-assets.mjs` → icon.png(1024²)·splash(2732²)·splash-dark
- [x] 네이티브 리소스 생성 — `npx capacitor-assets generate` (android 100개 / ios 13개 / pwa 7개)
- [ ] (선택) 아이콘 시안이 마음에 안 들면 `assets/icon.svg`만 수정 후 위 두 명령 재실행

## 6. 실기기 QA 체크리스트

- [ ] Safe Area — 노치/펀치홀 기기에서 HUD·하단 독 겹침 확인
- [ ] 상태바 — 다크 배경 위 아이콘 가독성 (필요시 `@capacitor/status-bar`로 스타일 지정)
- [ ] Android 뒤로가기 — 콘텐츠→허브→최소화 동작 검증 (코드는 구현됨)
- [ ] 세로 고정 — 회전 시 레이아웃 유지 (설정은 되어 있음)
- [ ] 백그라운드 진입 시 오디오 정지 — `visibilitychange` 처리가 이미 있으나 실기기 검증 필요
- [ ] 저사양 기기 프레임 — 캔버스 게임(화살 원정) 60fps 여부
- [ ] 터치 입력 지연 — 비트 수련 판정에 영향 없는지

## 7. 저장 데이터 내구성 — ✅ 완료

- [x] `@capacitor/preferences` 이관 — `toss.ts`의 `storageGet`/`storageSet`에 네이티브 분기 추가
      (우선순위: 앱인토스 Storage → Preferences → localStorage)
- [x] 구버전 네이티브 빌드의 localStorage 데이터는 읽기 시점에 1회 자동 이관
- [x] 웹 회귀 검증 — 기존 저장 로드 정상 (브라우저 실측)

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

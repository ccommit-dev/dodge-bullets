# Android 실기기 테스트 · Google Play 배포 가이드

Mac 노트북 + USB 데이터 케이블 + Android 휴대폰만으로 개발·테스트·배포까지 진행하는 절차다.
아래 "현재 상태"는 저장소를 직접 확인해 적었다 (2026-09).

## 현재 상태 (저장소 확인)

| 항목 | 값 | 근거 |
|---|---|---|
| Android 프로젝트 | `android/` 존재 | `android/app`, `android/build.gradle` |
| 앱 ID | `com.ccommit.dodgelab` | `capacitor.config.ts` |
| 앱 이름 | `DODGE LAB` | `capacitor.config.ts` |
| 최소 버전 | Android 7.0 (API 24) | `android/variables.gradle` `minSdkVersion = 24` |
| 컴파일·목표 SDK | API 36 | `android/variables.gradle` |
| 웹 빌드 → 동기화 | `npm run native:sync` = `vite build` + `cap sync` | `package.json` |
| Android Studio 열기 | `npm run native:android` = `cap open android` | `package.json` |

## 1. Android Studio 설치 (Mac)

1. Android Studio 공식 다운로드에서 Mac CPU에 맞는 빌드를 받는다 (Apple Silicon / Intel).
2. 첫 실행 시 SDK 구성 요소를 설치한다: Android SDK, SDK Platform 36, Build-Tools, Platform-Tools(`adb` 포함).
3. JDK는 Android Studio 내장 JDK를 쓴다. 시스템 Java 19를 따로 잡을 필요가 없다.
4. `adb`를 터미널에서 쓰려면 PATH에 추가한다.

```bash
echo 'export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

## 2. 휴대폰 개발자 모드

1. 설정 → 휴대전화 정보 → 소프트웨어 정보 → 빌드 번호 7회 터치
2. 설정 → 개발자 옵션 → USB 디버깅 켜기
3. USB 케이블로 Mac에 연결 (충전 전용 케이블은 안 된다)
4. 휴대폰의 "이 컴퓨터의 USB 디버깅을 허용할까요?"에서 허용

macOS에는 별도 USB 드라이버가 필요 없다.

## 3. 최신 게임 코드를 Android로 복사

```bash
cd /Users/junshock5/Desktop/github/dodge-bullets
npm install
npm run native:sync
npm run native:android
```

`native:sync`는 웹 게임을 빌드해 `android/app/src/main/assets/public`에 복사하고 플러그인을 동기화한다.
`native:android`는 Android Studio에서 `android/` 프로젝트를 연다.

주의: Windows에서 `cap sync`를 돌리면 `ios/App/Package.swift` 경로의 슬래시가 깨진 적이 있다. Mac에서는 문제가 없지만, 커밋 전 `git diff ios/` 로 iOS 쪽 변경이 섞이지 않았는지 확인한다.

## 4. 휴대폰에서 실행

Android Studio 상단에서:

1. 실행 구성 `app` 선택
2. 기기 목록에서 연결한 휴대폰 선택
3. Run ▶

터미널로 연결 상태를 확인할 수 있다.

```bash
adb devices
```

정상이면 `XXXXXXXX    device`, 허용 전이면 `unauthorized`가 뜬다. 휴대폰 화면을 켜고 허용을 누른다.

터미널만으로 설치·실행하려면:

```bash
cd android && ./gradlew installDebug && adb shell am start -n com.ccommit.dodgelab/.MainActivity
```

## 5. 실기기에서 확인할 것

- 세이프 에어리어: 상단 노치·하단 제스처 바에 UI(하단 바·시트)가 가려지지 않는지
- 오디오: 비트 수련 첫 진입의 싱크 보정 오버레이가 뜨고, 보정 후 노트 타이밍이 맞는지
- 터치: 사냥터 탭 연타, 스킬 독, 하단 바·시트 스와이프
- 저사양: 설정에서 저사양 모드가 애니메이션을 줄이는지
- 백그라운드 복귀: 앱을 내렸다 올렸을 때 방치 정산 모달이 뜨는지

## 6. Google Play 배포 파일

실기기 테스트가 끝나면 Android Studio에서
`Build → Generate Signed App Bundle or APK → Android App Bundle` 로 `.aab`를 만든다.

- 처음 만드는 서명 키(`.jks`)와 비밀번호는 이후 모든 업데이트에 필요하다. 반드시 별도 백업한다.
- Google Play에는 APK가 아니라 `.aab`를 올린다.
- 신규 개인 개발자 계정은 프로덕션 출시 전에 비공개 테스트(현재 기준 12명·14일 연속)가 요구될 수 있다. 먼저 내부 테스트 트랙에 AAB를 올린다.
- 확률형 아이템(동료 소환)이 있으므로 스토어 등록 시 확률형 고지 항목을 체크하고, 앱 내 "확률 보기" 화면이 있다고 심사 노트에 적는다 (LIVEOPS_DESIGN §3.1).

## 결론

Android 포팅은 저장소 기준으로 준비가 끝나 있다. 순서는 Android Studio 설치 → 휴대폰 USB 디버깅 → `npm run native:sync` → Android Studio Run 이다.

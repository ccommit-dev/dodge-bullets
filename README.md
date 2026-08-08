# 총알 피하기 (dodge-bullets)

앱인토스 미니앱용 총알 피하기 웹게임 MVP입니다.  
인앱 광고/결제는 포함하지 않습니다.

## 게임 모드

1. **졸라맨 총알피하기** — 스테이지 · 상점 · 화살 회피  
2. **비트박스 Stage / 연습실 RPG** — 솔로 육성 + 자유 연습
   - 연습실 허브: STAGE 1~8을 자유 선택, 레슨/스파링 모드 토글, 명성·스킬(킥/햇/스네어/파이어/스로트)
   - 배경은 BGM 그리드에만 반응하는 3D 터널·와이어프레임 무대 — 탭은 패드/판정만 흔들고 노트 흐름은 고정
   - 게임 자체가 음악이라 비트박스 모드에는 사운드 on/off가 없음
   - **가이드 BGM = 강좌 음절**, 노트의 그리드 시각에 리드를 겹쳐 믹스
   - 클리어 시 숙련·SP·명성 + 코인 → 비트 상점(레일/노트 스킨)
   - Guide MC가 던지는 음절이 3D 레일 3레인으로 접근 → MIX LINE에서 해당 패드 입력
   - 레인 = 소리 계열: `A/←` B 저음(킥·파이어빗·스로트) · `S/↓/Space` T 하이햇(하이햇·클릭·숨소리) · `D/→` K 스네어(스네어·트럼펫), 화면은 좌·중·우 3분할 탭
   - 성공 음절이 YOUR LOOP에 쌓이고 EARLY/LATE 오차를 실시간 표시

## 스택

- React + TypeScript + Canvas
- `@apps-in-toss/web-framework`

## 실행

```bash
npm install
npm run dev
```

로컬: `http://localhost:5173`

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 로컬 개발 서버 |
| `npm run build` | `.ait` 빌드 |
| `npm run deploy` | 배포 |
| `npm run lint` | ESLint |

## 포트 충돌 (EADDRINUSE)

`granite dev`는 8081, Vite는 5173을 씁니다.  
이전 dev 서버가 남아 있으면 `EADDRINUSE 0.0.0.0:8081`이 납니다.

```bash
lsof -nP -tiTCP:8081 -sTCP:LISTEN | xargs kill -9
lsof -nP -tiTCP:5173 -sTCP:LISTEN | xargs kill -9
```

## 설정

`granite.config.ts`의 `appName`, `brand.displayName`, `brand.icon`을  
앱인토스 콘솔에 등록한 값과 동일하게 맞추세요.

## 스테이지 · 상점 밸런스

| Stage | 이름 | 생존 | 기본 보상 | 패턴 포인트 |
|------|------|------|-----------|-------------|
| 1 | 워밍업 | 14s | 55c | 즉시 rain |
| 2 | 횡풍 | 15s | 75c | side → rain |
| 3 | 교차 | 16s | 95c | cross → burst |
| 4 | 바닥쓸기 | 16s | 120c | sweep → burst |
| 5 | 폭풍전야 | 17s | 150c | 0.5s rest 후 burst |
| 6 | 결전 | 18s | 200c | 전 패턴 연속 |

속도감: 긴 rest 제거 · 니어미스 콤보 · 인트로 0.75s 자동시작 · 기본 이동 상향  
상점 (코인만, 광고/결제 없음): 이동속도 / 점프력 / 대시 / 슬로우 / 여분생명  
수치: `src/game/shop.ts` · 스테이지: `src/game/stages.ts`

## Day 1-6 (SDK)

- `granite.config.ts` `appName: dodgebullets` (콘솔과 동일)
- 식별키: `getAnonymousKey` / `getUserKeyForGame` + 로컬 mock
- 최고점: `Storage` 우선, 실패 시 `localStorage` (`dodgebullets:highScore:{hash}`)
- Safe Area: `SafeAreaInsets` + CSS 폴백
- 종료: 좌측 **종료** → 확인 모달 → `closeView()`
- 광고/결제 코드 없음

## Day 1에서 건드릴 파일

- `src/App.tsx` — 게임 상태 / 오버레이 / rAF 루프
- `src/App.css` — Safe Area / HUD / 오버레이
- `src/game/types.ts` — 상태·월드 타입
- `src/game/world.ts` — 리사이즈·플레이어·업데이트
- `src/game/draw.ts` — Canvas 렌더
- `granite.config.ts` — 앱인토스 앱 메타
- `index.html` — viewport / 풀스크린 메타

### Day 1-1 완료

- 전체 화면 Canvas + `requestAnimationFrame` + deltaTime
- DPR/리사이즈 대응
- `ready | playing | gameover` 상태 전환 UI
- playing 중 플레이어 미세 상하 움직임(루프 동작 확인용)
